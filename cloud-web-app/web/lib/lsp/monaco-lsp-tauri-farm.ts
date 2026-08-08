/**
 * L.13 — Monaco ↔ Tauri `lsp_farm` client (desktop LSP wire).
 *
 * When running inside Studio Local (Tauri):
 * - Continuous full-text `textDocument/didChange` on model edits
 * - `publishDiagnostics` → Monaco markers (clear on session death)
 * - Hover / definition / completion via real sidecar stdio JSON-RPC
 *
 * Fail-closed: missing binary or dead session → null / clear markers
 * (never fabricate tooltips, completions, or diagnostics).
 *
 * Browser path must continue using HTTP `/api/lsp/request` (see monaco-lsp-http).
 * Desktop languages: typescript/javascript + rust (Python L.C soak still OPEN).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type {
  CompletionItem,
  CompletionList,
  Diagnostic,
  Hover,
  Location,
  MonacoApi,
} from '@/lib/monaco-lsp-http.converters'
import { getMarkerSeverity } from '@/lib/monaco-lsp-http.converters'
import type * as monaco from 'monaco-editor'

const log = createComponentLogger('monaco-lsp-tauri-farm')

export type TauriInvokeFn = (
  // eslint-disable-next-line no-unused-vars -- invoke signature for desktop/tests
  command: string,
  // eslint-disable-next-line no-unused-vars -- invoke signature for desktop/tests
  args?: Record<string, unknown>,
) => Promise<unknown>

export type TauriListenFn = (
  // eslint-disable-next-line no-unused-vars -- event listen signature
  event: string,
  // eslint-disable-next-line no-unused-vars -- event listen signature
  handler: (event: { payload: unknown }) => void,
) => Promise<() => void>

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

export type LspFarmDiagnosticsEvent = {
  sessionId: string
  uri: string
  diagnostics: Diagnostic[]
  version?: number | null
  clear: boolean
}

type SessionCacheEntry = {
  sessionId: string
  language: string
  lastUri: string | null
  lastVersion: number | null
}

const sessionByLanguage = new Map<string, SessionCacheEntry>()
const MARKER_OWNER = 'aethel-lsp-farm'

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

async function importDesktopEvent(): Promise<{ listen: TauriListenFn }> {
  const specifier = ['@tauri-apps', 'api', 'event'].join('/')
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func, no-unused-vars
  const dynamicImport = new Function('s', 'return import(s)') as (
    // eslint-disable-next-line no-unused-vars -- dynamic import loader signature
    s: string,
  ) => Promise<{ listen: TauriListenFn }>
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

function asDiagnostics(raw: unknown): Diagnostic[] {
  if (!Array.isArray(raw)) return []
  const out: Diagnostic[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const d = item as Record<string, unknown>
    if (typeof d.message !== 'string') continue
    const range = d.range as Diagnostic['range'] | undefined
    if (
      !range ||
      typeof range.start?.line !== 'number' ||
      typeof range.start?.character !== 'number' ||
      typeof range.end?.line !== 'number' ||
      typeof range.end?.character !== 'number'
    ) {
      continue
    }
    out.push({
      message: d.message,
      range,
      severity: typeof d.severity === 'number' ? d.severity : undefined,
      code:
        typeof d.code === 'string' || typeof d.code === 'number' ? d.code : undefined,
      source: typeof d.source === 'string' ? d.source : undefined,
    })
  }
  return out
}

function asDiagnosticsEvent(raw: unknown): LspFarmDiagnosticsEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.sessionId !== 'string') return null
  return {
    sessionId: o.sessionId,
    uri: typeof o.uri === 'string' ? o.uri : '',
    diagnostics: asDiagnostics(o.diagnostics),
    version: typeof o.version === 'number' ? o.version : null,
    clear: o.clear === true,
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

  // Prefer continuous didChange when document already opened at a prior version.
  if (cached && cached.lastUri === uri && cached.lastVersion !== null) {
    try {
      const raw = await invoke('lsp_farm_did_change', {
        args: {
          sessionId: session.sessionId,
          uri,
          text,
          version,
          languageId: toLanguageId(language),
        },
      })
      const rpc = asRpcResult(raw)
      if (!rpc?.ok) {
        if (rpc && !rpc.processAlive) {
          sessionByLanguage.delete(farmLang)
        }
        log.warn('tauri_lsp_did_change_fail_closed', {
          sessionId: session.sessionId,
          message: rpc?.message ?? 'did_change failed',
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
      log.warn('tauri_lsp_did_change_error', { message })
      return false
    }
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
      if (rpc && !rpc.processAlive) {
        sessionByLanguage.delete(farmLang)
      }
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

/** Push full-text didChange for a live farm session (continuous sync). */
export async function tauriLspDidChange(
  language: string,
  uri: string,
  text: string,
  version: number,
  options: {
    rootUri?: string | null
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
  } = {},
): Promise<boolean> {
  const farmLang = normalizeFarmLanguage(language)
  if (!farmLang) return false
  if (!options.forceInvoke && !isTauriRuntime()) return false

  const invoke = options.invoke ?? defaultInvoke
  const session = await ensureTauriLspFarmSession(language, options)
  if (!session) return false

  return ensureDidOpen(session, farmLang, language, uri, text, version, invoke)
}

async function requestFarmMethod<T>(
  language: string,
  method: 'textDocument/hover' | 'textDocument/definition' | 'textDocument/completion',
  uri: string,
  text: string,
  version: number,
  position: { line: number; character: number },
  options: {
    rootUri?: string | null
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
    completionContext?: { triggerKind: number; triggerCharacter?: string }
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
    const params: Record<string, unknown> = {
      textDocument: { uri },
      position,
    }
    if (method === 'textDocument/completion') {
      params.context = options.completionContext ?? { triggerKind: 1 }
    }
    const raw = await invoke('lsp_farm_request', {
      args: {
        sessionId: session.sessionId,
        method,
        params,
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

export async function tauriLspCompletion(
  language: string,
  uri: string,
  text: string,
  version: number,
  position: { line: number; character: number },
  options?: {
    rootUri?: string | null
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
    completionContext?: { triggerKind: number; triggerCharacter?: string }
  },
): Promise<CompletionList | CompletionItem[] | null> {
  return requestFarmMethod<CompletionList | CompletionItem[]>(
    language,
    'textDocument/completion',
    uri,
    text,
    version,
    position,
    options,
  )
}

export async function tauriLspPollDiagnostics(
  language: string,
  options: {
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
  } = {},
): Promise<LspFarmDiagnosticsEvent[]> {
  const farmLang = normalizeFarmLanguage(language)
  if (!farmLang) return []
  if (!options.forceInvoke && !isTauriRuntime()) return []

  const cached = sessionByLanguage.get(farmLang)
  if (!cached) return []

  const invoke = options.invoke ?? defaultInvoke
  try {
    const raw = await invoke('lsp_farm_poll_diagnostics', {
      args: { sessionId: cached.sessionId },
    })
    if (!raw || typeof raw !== 'object') return []
    const o = raw as Record<string, unknown>
    if (o.processAlive === false) {
      sessionByLanguage.delete(farmLang)
    }
    const eventsRaw = Array.isArray(o.events) ? o.events : []
    return eventsRaw
      .map(asDiagnosticsEvent)
      .filter((e): e is LspFarmDiagnosticsEvent => e !== null)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.warn('tauri_lsp_poll_diagnostics_error', { message })
    return []
  }
}

function clearAllFarmMarkers(monacoApi: MonacoApi): void {
  for (const model of monacoApi.editor.getModels()) {
    monacoApi.editor.setModelMarkers(model, MARKER_OWNER, [])
  }
}

function applyFarmDiagnosticsEvent(
  monacoApi: MonacoApi,
  event: LspFarmDiagnosticsEvent,
): void {
  if (event.clear) {
    clearAllFarmMarkers(monacoApi)
    return
  }
  if (!event.uri) return
  const model = monacoApi.editor.getModels().find((m) => m.uri.toString() === event.uri)
  if (!model) return
  // Real server payload only (asDiagnostics already dropped invalid entries).
  const markers: monaco.editor.IMarkerData[] = event.diagnostics.map((d) => ({
    severity: getMarkerSeverity(monacoApi, d.severity),
    message: d.message,
    startLineNumber: d.range.start.line + 1,
    startColumn: d.range.start.character + 1,
    endLineNumber: d.range.end.line + 1,
    endColumn: d.range.end.character + 1,
    source: d.source,
    code: d.code?.toString(),
  }))
  monacoApi.editor.setModelMarkers(model, MARKER_OWNER, markers)
}

export type TauriLspModelSyncHandle = {
  dispose: () => void
}

/**
 * Attach continuous didChange sync + diagnostics subscription for a Monaco model.
 * No-op outside Tauri. Fail-closed: clears markers when session dies.
 */
export function attachTauriLspModelSync(
  monacoApi: MonacoApi,
  model: monaco.editor.ITextModel,
  language: string,
  options: {
    rootUri?: string | null
    invoke?: TauriInvokeFn
    listen?: TauriListenFn
    forceInvoke?: boolean
    /** Debounce ms for didChange (default 120). */
    debounceMs?: number
  } = {},
): TauriLspModelSyncHandle {
  const farmLang = normalizeFarmLanguage(language)
  if (!farmLang) {
    return { dispose: () => {} }
  }
  if (!options.forceInvoke && !isTauriRuntime()) {
    return { dispose: () => {} }
  }

  const debounceMs = options.debounceMs ?? 120
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | null = null
  let unlistenDiag: (() => void) | null = null
  let unlistenDead: (() => void) | null = null
  const invoke = options.invoke ?? defaultInvoke

  const pushChange = () => {
    if (disposed) return
    void tauriLspDidChange(
      language,
      model.uri.toString(),
      model.getValue(),
      model.getVersionId(),
      { rootUri: options.rootUri, invoke, forceInvoke: options.forceInvoke },
    ).then(async (ok) => {
      if (!ok || disposed) {
        if (!ok) clearAllFarmMarkers(monacoApi)
        return
      }
      // Drain any diagnostics that arrived before the event listener attached.
      const events = await tauriLspPollDiagnostics(language, {
        invoke,
        forceInvoke: options.forceInvoke,
      })
      for (const event of events) {
        applyFarmDiagnosticsEvent(monacoApi, event)
      }
    })
  }

  // Initial open + sync.
  pushChange()

  const contentSub = model.onDidChangeContent(() => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(pushChange, debounceMs)
  })

  void (async () => {
    try {
      const listen = options.listen ?? (await importDesktopEvent()).listen
      unlistenDiag = await listen('lsp-farm-diagnostics', (event) => {
        if (disposed) return
        const payload = asDiagnosticsEvent(event.payload)
        if (!payload) return
        applyFarmDiagnosticsEvent(monacoApi, payload)
      })
      unlistenDead = await listen('lsp-farm-session-dead', () => {
        if (disposed) return
        sessionByLanguage.delete(farmLang)
        clearAllFarmMarkers(monacoApi)
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      log.warn('tauri_lsp_diagnostics_listen_held', { message })
      // Poll-only fallback still runs after each didChange.
    }
  })()

  return {
    dispose: () => {
      disposed = true
      if (timer) clearTimeout(timer)
      contentSub.dispose()
      unlistenDiag?.()
      unlistenDead?.()
      clearAllFarmMarkers(monacoApi)
    },
  }
}

/** Test helper — clear in-memory session cache. */
export function resetTauriLspFarmClientCache(): void {
  sessionByLanguage.clear()
}

/** Test helper — parse diagnostics event payload (no fabrications). */
export function parseTauriLspDiagnosticsEvent(
  raw: unknown,
): LspFarmDiagnosticsEvent | null {
  return asDiagnosticsEvent(raw)
}
