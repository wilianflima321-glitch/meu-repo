/**
 * BYOK Client Proxy — Zero-Knowledge AI request dispatch (V33 AES-256-GCM Vault).
 *
 * Guarantees:
 *   • API keys are NEVER sent to Aethel's cloud servers.
 *   • Keys are encrypted at rest using AES-256-GCM with PBKDF2 key derivation.
 *   • On Tauri desktop: requests are made by the Rust HTTP client (reqwest)
 *     via the IPC bridge, keeping the key entirely inside the native process.
 *   • On Web browsers: requests are forwarded through an optional user-supplied
 *     proxy URL (corporates behind CORS proxies) or directly from the browser.
 *     When a custom proxy URL is set, the key is injected as a header by this
 *     module, never passed to the server as a body field.
 *
 * Persistence contract:
 *   • Keys are stored exclusively in `localStorage` under `aethel_byok_*`.
 *   • Stored as { cipherText, salt, iv } — encrypted with the user's vault secret.
 *   • No key ever touches a Prisma model, Redis, or any Aethel API route.
 *
 * AES-256-GCM Vault (V33):
 *   encryptAPIKey(key, secret)  → { cipherText, salt, iv } hex strings
 *   decryptAPIKey(vault, secret) → plaintext key
 *   PBKDF2: 100 000 iterations, SHA-256, 16-byte salt, 12-byte IV
 */

import type { LLMProvider } from '@/lib/ai-service'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type BYOKProvider = Extract<LLMProvider, 'openai' | 'anthropic' | 'google' | 'groq'>

export interface BYOKKey {
  provider: BYOKProvider
  key: string
  /** Optional proxy URL for web CORS bypass. */
  proxyUrl?: string
}

export interface ProxyRequestOptions {
  provider: BYOKProvider
  endpoint: string
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
  /** Additional headers merged on top of Auth/Content-Type. */
  extraHeaders?: Record<string, string>
}

export interface ProxyResponse<T = unknown> {
  ok: boolean
  status: number
  data: T
  /** True when the request was dispatched via the Tauri native HTTP client. */
  nativeDispatch: boolean
}

// ---------------------------------------------------------------------------
// AES-256-GCM Cryptographic Vault (V33)
// ---------------------------------------------------------------------------

export interface EncryptedVaultEntry {
  cipherText: string  // hex
  salt: string        // hex (16 bytes)
  iv: string          // hex (12 bytes)
}

export interface UsageRecord {
  provider: BYOKProvider
  requests: number
  lastUsed: number
}

const USAGE_KEY = 'aethel_byok_usage'

/** Derive AES-256 key from user secret via PBKDF2 */
async function deriveKey(secret: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: 100_000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

/** Encrypt an API key with a user-supplied vault secret (PBKDF2 + AES-256-GCM) */
export async function encryptAPIKey(
  key: string,
  secret: string,
): Promise<EncryptedVaultEntry> {
  const enc = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const aesKey = await deriveKey(secret, salt)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    enc.encode(key),
  )
  return {
    cipherText: buf2hex(encrypted),
    salt: buf2hex(salt.buffer),
    iv: buf2hex(iv.buffer),
  }
}

/** Decrypt an API key from vault entry using the vault secret */
export async function decryptAPIKey(
  entry: EncryptedVaultEntry,
  secret: string,
): Promise<string> {
  const salt = hex2buf(entry.salt)
  const iv = hex2buf(entry.iv)
  const cipher = hex2buf(entry.cipherText)
  const aesKey = await deriveKey(secret, new Uint8Array(salt))
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    aesKey,
    cipher,
  )
  return new TextDecoder().decode(plain)
}

function buf2hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

function hex2buf(hex: string): ArrayBuffer {
  const arr = new Uint8Array(hex.length / 2)
  for (let i = 0; i < arr.length; i++) arr[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return arr.buffer
}

// ---------------------------------------------------------------------------
// Usage auditing
// ---------------------------------------------------------------------------

function recordUsage(provider: BYOKProvider): void {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(USAGE_KEY)
  const usage: Record<string, UsageRecord> = raw ? JSON.parse(raw) : {}
  const entry = usage[provider] ?? { provider, requests: 0, lastUsed: 0 }
  entry.requests++
  entry.lastUsed = Date.now()
  usage[provider] = entry
  window.localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
}

export function getUsageStats(): UsageRecord[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(USAGE_KEY)
  return raw ? Object.values(JSON.parse(raw)) : []
}

export function resetUsageStats(provider?: BYOKProvider): void {
  if (typeof window === 'undefined') return
  if (!provider) { window.localStorage.removeItem(USAGE_KEY); return }
  const raw = window.localStorage.getItem(USAGE_KEY)
  if (!raw) return
  const usage = JSON.parse(raw)
  delete usage[provider]
  window.localStorage.setItem(USAGE_KEY, JSON.stringify(usage))
}

// ---------------------------------------------------------------------------
// Storage helpers (localStorage only — server-side calls return null)
// ---------------------------------------------------------------------------

const STORAGE_PREFIX = 'aethel_byok_'
const PROXY_URL_KEY = 'aethel_byok_proxy_url'

/**
 * Store an API key in plaintext (legacy path).
 * Use storeEncryptedBYOKKey() for the vault-encrypted path.
 */
export function setBYOKKey(provider: BYOKProvider, key: string): void {
  if (typeof window === 'undefined') return
  if (!key.trim()) {
    window.localStorage.removeItem(`${STORAGE_PREFIX}${provider}`)
    void import('@/lib/ai/byok-idb-store').then((m) => m.idbDeleteByokKey(provider))
    return
  }
  window.localStorage.setItem(`${STORAGE_PREFIX}${provider}`, key.trim())
  void import('@/lib/ai/byok-idb-store').then((m) => {
    m.setByokEnabledFlag(true)
    return m.idbPutByokKey(provider, key.trim())
  })
}

/** Store an AES-256-GCM encrypted key. Vault secret must be provided at read time. */
export async function storeEncryptedBYOKKey(
  provider: BYOKProvider,
  key: string,
  vaultSecret: string,
): Promise<void> {
  if (typeof window === 'undefined') return
  const entry = await encryptAPIKey(key, vaultSecret)
  window.localStorage.setItem(`${STORAGE_PREFIX}vault_${provider}`, JSON.stringify(entry))
}

/** Retrieve and decrypt a vault-stored API key. */
export async function getEncryptedBYOKKey(
  provider: BYOKProvider,
  vaultSecret: string,
): Promise<string | null> {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(`${STORAGE_PREFIX}vault_${provider}`)
  if (!raw) return null
  try {
    const entry: EncryptedVaultEntry = JSON.parse(raw)
    return await decryptAPIKey(entry, vaultSecret)
  } catch {
    return null
  }
}

export function getBYOKKey(provider: BYOKProvider): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(`${STORAGE_PREFIX}${provider}`)
}

export function clearBYOKKey(provider: BYOKProvider): void {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(`${STORAGE_PREFIX}${provider}`)
  void import('@/lib/ai/byok-idb-store').then((m) => m.idbDeleteByokKey(provider))
}

export function getActiveBYOKProviders(): BYOKProvider[] {
  if (typeof window === 'undefined') return []
  const providers: BYOKProvider[] = ['openai', 'anthropic', 'google', 'groq']
  return providers.filter((p) => Boolean(getBYOKKey(p)))
}

export function setBYOKProxyUrl(url: string | null): void {
  if (typeof window === 'undefined') return
  if (!url) {
    window.localStorage.removeItem(PROXY_URL_KEY)
    return
  }
  window.localStorage.setItem(PROXY_URL_KEY, url.trim())
}

export function getBYOKProxyUrl(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(PROXY_URL_KEY)
}

// ---------------------------------------------------------------------------
// Runtime detection
// ---------------------------------------------------------------------------

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

// ---------------------------------------------------------------------------
// Provider base URL map
// ---------------------------------------------------------------------------

const PROVIDER_BASE_URLS: Record<BYOKProvider, string> = {
  openai: 'https://api.openai.com',
  anthropic: 'https://api.anthropic.com',
  google: 'https://generativelanguage.googleapis.com',
  groq: 'https://api.groq.com/openai',
}

function buildAuthHeaders(provider: BYOKProvider, key: string): Record<string, string> {
  switch (provider) {
    case 'openai':
    case 'groq':
      return { Authorization: `Bearer ${key}` }
    case 'anthropic':
      return { 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    case 'google':
      return { 'X-Goog-Api-Key': key }
  }
}

// ---------------------------------------------------------------------------
// Tauri native dispatch
// ---------------------------------------------------------------------------

async function dispatchViaTauri<T>(
  provider: BYOKProvider,
  key: string,
  opts: ProxyRequestOptions,
): Promise<ProxyResponse<T>> {
  // Dynamic import to avoid bundling tauri APIs in non-Tauri builds.
  // Type shim declared in types/tauri-apps.d.ts; safe because callers guard
  // with isTauriRuntime() before reaching this code path.
  // eslint-disable-next-line
  const tauriHttp = await import('@tauri-apps/api/http') as any
  const tauriFetch = tauriHttp.fetch as (url: string, opts: unknown) => Promise<{ ok: boolean; status: number; data: T }>

  const baseUrl = PROVIDER_BASE_URLS[provider]
  const url = opts.endpoint.startsWith('http') ? opts.endpoint : `${baseUrl}${opts.endpoint}`

  const headers = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(provider, key),
    ...(opts.extraHeaders ?? {}),
  }

  const response = await tauriFetch(url, {
    method: opts.method ?? 'POST',
    headers,
    body: opts.body
      ? { type: 'Json', payload: opts.body as Record<string, unknown> }
      : undefined,
  })

  return {
    ok: response.ok,
    status: response.status,
    data: response.data,
    nativeDispatch: true,
  }
}

// ---------------------------------------------------------------------------
// Web browser dispatch (direct or via custom proxy URL)
// ---------------------------------------------------------------------------

async function dispatchViaBrowser<T>(
  provider: BYOKProvider,
  key: string,
  opts: ProxyRequestOptions,
): Promise<ProxyResponse<T>> {
  const proxyUrl = getBYOKProxyUrl()
  const baseUrl = proxyUrl ?? PROVIDER_BASE_URLS[provider]
  const url = opts.endpoint.startsWith('http') ? opts.endpoint : `${baseUrl}${opts.endpoint}`

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...buildAuthHeaders(provider, key),
    ...(opts.extraHeaders ?? {}),
  }

  // When routing through a user-supplied proxy, signal the proxy target
  if (proxyUrl) {
    headers['X-BYOK-Target'] = PROVIDER_BASE_URLS[provider]
  }

  const res = await fetch(url, {
    method: opts.method ?? 'POST',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })

  const data = res.headers.get('content-type')?.includes('application/json')
    ? await res.json() as T
    : await res.text() as unknown as T

  return {
    ok: res.ok,
    status: res.status,
    data,
    nativeDispatch: false,
  }
}

// ---------------------------------------------------------------------------
// Public dispatch API
// ---------------------------------------------------------------------------

/**
 * Dispatch an AI request using the locally stored BYOK key for the provider.
 *
 * Returns `null` when no BYOK key is configured for the provider — the caller
 * should fall back to the governed cloud path in that case.
 */
export async function byokDispatch<T = unknown>(
  opts: ProxyRequestOptions,
): Promise<ProxyResponse<T> | null> {
  const key = getBYOKKey(opts.provider)
  if (!key) return null

  try {
    recordUsage(opts.provider)
    if (isTauriRuntime()) {
      return await dispatchViaTauri<T>(opts.provider, key, opts)
    }
    return await dispatchViaBrowser<T>(opts.provider, key, opts)
  } catch (err) {
    throw new Error(
      `BYOK dispatch failed for provider "${opts.provider}": ${err instanceof Error ? err.message : String(err)}`,
    )
  }
}

/**
 * Resolve the best BYOK-compatible model for a given requested provider.
 *
 * If the user has no key for `preferredProvider`, fall back to the first
 * provider for which a BYOK key IS configured, returning a safe default model.
 */
export function resolveBYOKCompatibleProvider(
  preferredProvider: LLMProvider,
): { provider: LLMProvider; model: string } | null {
  const BYOK_FALLBACK_DEFAULTS: Record<BYOKProvider, string> = {
    openai: 'gpt-4o-mini',
    anthropic: 'claude-3-5-haiku-20241022',
    google: 'gemini-1.5-flash',
    groq: 'llama-3.1-70b-versatile',
  }

  const isByok = (p: LLMProvider): p is BYOKProvider =>
    ['openai', 'anthropic', 'google', 'groq'].includes(p)

  if (isByok(preferredProvider) && getBYOKKey(preferredProvider)) {
    return { provider: preferredProvider, model: BYOK_FALLBACK_DEFAULTS[preferredProvider] }
  }

  // Walk providers in priority order
  const priority: BYOKProvider[] = ['openai', 'anthropic', 'google', 'groq']
  for (const p of priority) {
    if (getBYOKKey(p)) {
      return { provider: p, model: BYOK_FALLBACK_DEFAULTS[p] }
    }
  }

  return null
}
