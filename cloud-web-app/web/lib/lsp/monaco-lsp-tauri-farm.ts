/**
 * L.13 — Monaco ↔ Tauri `lsp_farm` client (desktop hover/definition).
 *
 * When running inside Studio Local (Tauri), hover + definition go through
 * real sidecar stdio JSON-RPC (`lsp_farm_ensure_session` / `did_open` / `request`).
 * Fail-closed: missing binary or dead session → null (never fabricate tooltips).
 *
 * Limitations (documented):
 * - Minimal `textDocument/didOpen` only (re-open on edit; no continuous didChange).
 * - Desktop farm languages: typescript/javascript + rust (Python still HELD).
 * - Completions / diagnostics push / full sync remain out of this wire.
 *
 * Browser path must continue using HTTP `/api/lsp/request` (see monaco-lsp-http).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { Hover, Location } from '@/lib/monaco-lsp-http.converters'

const log = createComponentLogger('monaco-lsp-tauri-farm')

export type TauriInvokeFn = (
  // eslint-disable-next-line no-unused-vars -- invoke signature for desktop/tests
  command: string,
  // eslint-disable-next-line no-unused-vars -- invoke signature for desktop/tests
  args?: Record<string, unknown>,
) => Promise<unknown>

export type LspFarmSessionInfo = {
  sessionId: string
  language: string
  binaryPath: string
  alive: boolean
  initialized: boolean
}

export type LspFarmRpcResult = {
  sessionId: string
  ok: boolean
  processAlive: boolean
  result?: unknown
  error?: unknown
  message: string
}

type SessionCacheEntry = {
  sessionId: string
  language: string
  lastUri: string | null
  lastVersion: number | null
}

const sessionByLanguage = new Map<string, SessionCacheEntry>()

function isTauriRuntime(): boolean {
  // eslint-disable-next-line no-undef -- browser/Tauri runtime detection
  if (typeof window === 'undefined') return false
  // eslint-disable-next-line no-undef -- browser/Tauri runtime detection
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window
}

export function detectMonacoLspTauriFarmAvailable(): boolean {
  return isTauriRuntime()
}

/** Dynamic import that Vite/vitest cannot statically resolve (desktop-only deps). */
async function importDesktopCore(): Promise<{ invoke: TauriInvokeFn }> {
  const specifier = ['@tauri-apps', 'api', 'core'].join('/')
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func, no-unused-vars
  const dynamicImport = new Function('s', 'return import(s)') as (
    // eslint-disable-next-line no-unused-vars -- dynamic import loader signature
    s: string,
  ) => Promise<{ invoke: TauriInvokeFn }>
  return dynamicImport(specifier)
}

async function defaultInvoke(
  command: string,
  args?: Record<string, unknown>,
): Promise<unknown> {
  const core = await importDesktopCore()
  return core.invoke(command, args)
}

function normalizeFarmLanguage(language: string): string | null {
  const l = String(language || '').toLowerCase()
  if (
    l === 'typescript' ||
    l === 'typescriptreact' ||
    l === 'javascript' ||
    l === 'javascriptreact' ||
    l === 'ts' ||
    l === 'tsx' ||
    l === 'js' ||
    l === 'jsx'
  ) {
    return 'typescript'
  }
  if (l === 'rust' || l === 'rs') return 'rust'
  return null
}

function toLanguageId(language: string): string {
  const l = String(language || '').toLowerCase()
  if (l === 'typescriptreact' || l === 'tsx') return 'typescriptreact'
  if (l === 'javascriptreact' || l === 'jsx') return 'javascriptreact'
  if (l === 'javascript' || l === 'js') return 'javascript'
  if (l === 'rust' || l === 'rs') return 'rust'
  return 'typescript'
}

function asSessionInfo(raw: unknown): LspFarmSessionInfo | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.sessionId !== 'string') return null
  return {
    sessionId: o.sessionId,
    language: typeof o.language === 'string' ? o.language : '',
    binaryPath: typeof o.binaryPath === 'string' ? o.binaryPath : '',
    alive: o.alive === true,
    initialized: o.initialized === true,
  }
}

function asRpcResult(raw: unknown): LspFarmRpcResult | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.sessionId !== 'string' || typeof o.message !== 'string') return null
  return {
    sessionId: o.sessionId,
    ok: o.ok === true,
    processAlive: o.processAlive === true,
    result: o.result,
    error: o.error,
    message: o.message,
  }
}

/**
 * Ensure a live initialized farm session for Monaco language.
 * Returns null when binary missing / unsupported — caller must fail-closed.
 */
export async function ensureTauriLspFarmSession(
  language: string,
  options: {
    rootUri?: string | null
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
  } = {},
): Promise<LspFarmSessionInfo | null> {
  const farmLang = normalizeFarmLanguage(language)
  if (!farmLang) {
    log.info('tauri_lsp_unsupported_language', { language })
    return null
  }

  if (!options.forceInvoke && !isTauriRuntime()) {
    return null
  }

  const invoke = options.invoke ?? defaultInvoke
  const cached = sessionByLanguage.get(farmLang)
  if (cached) {
    return {
      sessionId: cached.sessionId,
      language: cached.language,
      binaryPath: '',
      alive: true,
      initialized: true,
    }
  }

  try {
    const raw = await invoke('lsp_farm_ensure_session', {
      args: {
        language: farmLang,
        rootUri: options.rootUri ?? null,
      },
    })
    const info = asSessionInfo(raw)
    if (!info || !info.alive || !info.initialized) {
      log.warn('tauri_lsp_ensure_fail_closed', {
        language: farmLang,
        message: 'ensure_session returned non-live session',
      })
      return null
    }
    sessionByLanguage.set(farmLang, {
      sessionId: info.sessionId,
      language: farmLang,
      lastUri: null,
      lastVersion: null,
    })
    return info
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    // Binary missing / spawn fail — fail-closed empty hover (no fabrications).
    log.warn('tauri_lsp_ensure_held', { language: farmLang, message })
    sessionByLanguage.delete(farmLang)
    return null
  }
}

async function ensureDidOpen(
  session: LspFarmSessionInfo,
  farmLang: string,
  language: string,
  uri: string,
  text: string,
  version: number,
  invoke: TauriInvokeFn,
): Promise<boolean> {
  const cached = sessionByLanguage.get(farmLang)
  if (cached && cached.lastUri === uri && cached.lastVersion === version) {
    return true
  }

  try {
    const raw = await invoke('lsp_farm_did_open', {
      args: {
        sessionId: session.sessionId,
        uri,
        languageId: toLanguageId(language),
        text,
        version,
      },
    })
    const rpc = asRpcResult(raw)
    if (!rpc?.ok) {
      log.warn('tauri_lsp_did_open_fail_closed', {
        sessionId: session.sessionId,
        message: rpc?.message ?? 'did_open failed',
      })
      return false
    }
    sessionByLanguage.set(farmLang, {
      sessionId: session.sessionId,
      language: farmLang,
      lastUri: uri,
      lastVersion: version,
    })
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.warn('tauri_lsp_did_open_error', { message })
    return false
  }
}

async function requestFarmMethod<T>(
  language: string,
  method: 'textDocument/hover' | 'textDocument/definition',
  uri: string,
  text: string,
  version: number,
  position: { line: number; character: number },
  options: {
    rootUri?: string | null
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
  } = {},
): Promise<T | null> {
  const farmLang = normalizeFarmLanguage(language)
  if (!farmLang) return null
  if (!options.forceInvoke && !isTauriRuntime()) return null

  const invoke = options.invoke ?? defaultInvoke
  const session = await ensureTauriLspFarmSession(language, options)
  if (!session) return null

  const opened = await ensureDidOpen(
    session,
    farmLang,
    language,
    uri,
    text,
    version,
    invoke,
  )
  if (!opened) return null

  try {
    const raw = await invoke('lsp_farm_request', {
      args: {
        sessionId: session.sessionId,
        method,
        params: {
          textDocument: { uri },
          position,
        },
      },
    })
    const rpc = asRpcResult(raw)
    if (!rpc?.ok) {
      if (rpc && !rpc.processAlive) {
        sessionByLanguage.delete(farmLang)
      }
      log.info('tauri_lsp_request_fail_closed', {
        method,
        message: rpc?.message ?? 'request failed',
      })
      return null
    }
    // Real server may return null/undefined for "no hover" — never invent content.
    if (rpc.result === undefined || rpc.result === null) {
      return null
    }
    return rpc.result as T
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.warn('tauri_lsp_request_error', { method, message })
    sessionByLanguage.delete(farmLang)
    return null
  }
}

export async function tauriLspHover(
  language: string,
  uri: string,
  text: string,
  version: number,
  position: { line: number; character: number },
  options?: {
    rootUri?: string | null
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
  },
): Promise<Hover | null> {
  return requestFarmMethod<Hover>(
    language,
    'textDocument/hover',
    uri,
    text,
    version,
    position,
    options,
  )
}

export async function tauriLspDefinition(
  language: string,
  uri: string,
  text: string,
  version: number,
  position: { line: number; character: number },
  options?: {
    rootUri?: string | null
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
  },
): Promise<Location | Location[] | null> {
  return requestFarmMethod<Location | Location[]>(
    language,
    'textDocument/definition',
    uri,
    text,
    version,
    position,
    options,
  )
}

/** Test helper — clear in-memory session cache. */
export function resetTauriLspFarmClientCache(): void {
  sessionByLanguage.clear()
}
