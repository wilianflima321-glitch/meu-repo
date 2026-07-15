/**
 * Block 6E.1 — IndexedDB `aethel-byok-v1` (contracts_planning §4.1).
 * Sync mirror in memory + localStorage for getByokHeaders() (fetch is sync-header).
 * Never POSTs keys to Aethel APIs.
 */

const IDB_NAME = 'aethel-byok-v1'
const IDB_STORE = 'keys'
const LS_PREFIX = 'aethel_byok_'
const LS_ENABLED = 'aethel_byok_enabled'
const LS_OPENROUTER = 'aethel_byok_openrouter'

export type ByokStoredProvider = 'openai' | 'anthropic' | 'google' | 'groq' | 'openrouter'

type StoreRecord = { provider: ByokStoredProvider; key: string; updatedAt: number }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('INDEXEDDB_UNAVAILABLE'))
      return
    }
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'provider' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error || new Error('IDB_OPEN_FAILED'))
  })
}

function mirrorLocal(provider: ByokStoredProvider, key: string | null): void {
  if (typeof window === 'undefined') return
  const lsKey = provider === 'openrouter' ? LS_OPENROUTER : `${LS_PREFIX}${provider}`
  if (!key) {
    window.localStorage.removeItem(lsKey)
    return
  }
  window.localStorage.setItem(lsKey, key)
}

export function setByokEnabledFlag(enabled: boolean): void {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(LS_ENABLED, enabled ? '1' : '0')
  // Keep settings JSON in sync for legacy readers
  try {
    const raw = window.localStorage.getItem('settings')
    const settings = raw ? JSON.parse(raw) : {}
    settings['ai.byok.enabled'] = enabled
    window.localStorage.setItem('settings', JSON.stringify(settings))
  } catch {
    // ignore
  }
}

export function isByokEnabledFlag(): boolean {
  if (typeof window === 'undefined') return false
  if (window.localStorage.getItem(LS_ENABLED) === '1') return true
  try {
    const raw = window.localStorage.getItem('settings')
    if (!raw) return false
    return Boolean(JSON.parse(raw)['ai.byok.enabled'])
  } catch {
    return false
  }
}

export async function idbPutByokKey(provider: ByokStoredProvider, key: string): Promise<void> {
  const trimmed = key.trim()
  mirrorLocal(provider, trimmed || null)
  if (!trimmed) {
    await idbDeleteByokKey(provider)
    return
  }
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put({
        provider,
        key: trimmed,
        updatedAt: Date.now(),
      } satisfies StoreRecord)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // IndexedDB unavailable — localStorage mirror still holds the key
  }
  setByokEnabledFlag(true)
}

export async function idbDeleteByokKey(provider: ByokStoredProvider): Promise<void> {
  mirrorLocal(provider, null)
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(provider)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // ignore
  }
}

export async function idbGetByokKey(provider: ByokStoredProvider): Promise<string | null> {
  try {
    const db = await openDb()
    const value = await new Promise<StoreRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(provider)
      req.onsuccess = () => resolve(req.result as StoreRecord | undefined)
      req.onerror = () => reject(req.error)
    })
    db.close()
    if (value?.key) {
      mirrorLocal(provider, value.key)
      return value.key
    }
  } catch {
    // fall through
  }
  if (typeof window === 'undefined') return null
  const lsKey = provider === 'openrouter' ? LS_OPENROUTER : `${LS_PREFIX}${provider}`
  return window.localStorage.getItem(lsKey)
}

/** Hydrate localStorage mirrors from IndexedDB (call on settings mount). */
export async function hydrateByokFromIdb(): Promise<void> {
  const providers: ByokStoredProvider[] = ['openai', 'anthropic', 'google', 'groq', 'openrouter']
  for (const p of providers) {
    await idbGetByokKey(p)
  }
}

/**
 * Sync header builder for fetch() — reads localStorage mirrors (+ settings legacy).
 */
export function buildByokRequestHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  if (!isByokEnabledFlag()) {
    // Auto-enable if any key present (local or settings)
    const hasAny =
      Boolean(window.localStorage.getItem(`${LS_PREFIX}openai`)) ||
      Boolean(window.localStorage.getItem(`${LS_PREFIX}anthropic`)) ||
      Boolean(window.localStorage.getItem(`${LS_PREFIX}google`)) ||
      Boolean(window.localStorage.getItem(`${LS_PREFIX}groq`)) ||
      Boolean(window.localStorage.getItem(LS_OPENROUTER))
    if (!hasAny) {
      try {
        const settings = JSON.parse(window.localStorage.getItem('settings') || '{}')
        if (!settings['ai.byok.enabled']) return {}
      } catch {
        return {}
      }
    }
  }

  const headers: Record<string, string> = {
    'x-aethel-byok-active': '1',
    'x-aethel-billing-mode': 'byok',
  }

  const openai =
    window.localStorage.getItem(`${LS_PREFIX}openai`) ||
    (() => {
      try {
        return String(JSON.parse(window.localStorage.getItem('settings') || '{}')['ai.byok.openaiKey'] || '')
      } catch {
        return ''
      }
    })()
  const anthropic =
    window.localStorage.getItem(`${LS_PREFIX}anthropic`) ||
    (() => {
      try {
        return String(JSON.parse(window.localStorage.getItem('settings') || '{}')['ai.byok.anthropicKey'] || '')
      } catch {
        return ''
      }
    })()
  const google =
    window.localStorage.getItem(`${LS_PREFIX}google`) ||
    (() => {
      try {
        return String(JSON.parse(window.localStorage.getItem('settings') || '{}')['ai.byok.googleKey'] || '')
      } catch {
        return ''
      }
    })()
  const openrouter =
    window.localStorage.getItem(LS_OPENROUTER) ||
    (() => {
      try {
        return String(JSON.parse(window.localStorage.getItem('settings') || '{}')['ai.byok.openrouterKey'] || '')
      } catch {
        return ''
      }
    })()
  const groq = window.localStorage.getItem(`${LS_PREFIX}groq`) || ''

  if (openai.trim()) {
    headers['x-aethel-byok-openai'] = openai.trim()
    headers['x-aethel-byok-provider'] = 'openai'
  }
  if (anthropic.trim()) {
    headers['x-aethel-byok-anthropic'] = anthropic.trim()
    if (!headers['x-aethel-byok-provider']) headers['x-aethel-byok-provider'] = 'anthropic'
  }
  if (google.trim()) {
    headers['x-aethel-byok-google'] = google.trim()
    if (!headers['x-aethel-byok-provider']) headers['x-aethel-byok-provider'] = 'google'
  }
  if (openrouter.trim()) {
    headers['x-aethel-byok-openrouter'] = openrouter.trim()
    if (!headers['x-aethel-byok-provider']) headers['x-aethel-byok-provider'] = 'openrouter'
  }
  if (groq.trim()) {
    headers['x-aethel-byok-groq'] = groq.trim()
    if (!headers['x-aethel-byok-provider']) headers['x-aethel-byok-provider'] = 'groq'
  }

  // No credentials → do not claim active
  if (
    !headers['x-aethel-byok-openai'] &&
    !headers['x-aethel-byok-anthropic'] &&
    !headers['x-aethel-byok-google'] &&
    !headers['x-aethel-byok-openrouter'] &&
    !headers['x-aethel-byok-groq']
  ) {
    return {}
  }

  return headers
}
