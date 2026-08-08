/**
 * L.13 — thin Studio Local Monaco ↔ Tauri `lsp_farm` bridge.
 * Fail-closed when binary/session HELD (never fabricate hover/definition).
 */

import type { editor, languages, IDisposable, Position, CancellationToken } from 'monaco-editor'
import type { Monaco } from '@monaco-editor/react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export type FarmLanguage = 'typescript' | 'rust' | 'python'

type LspFarmSessionInfo = {
  sessionId: string
  language: string
  binaryPath: string
  alive: boolean
  initialized: boolean
}

type LspFarmRpcResult = {
  sessionId: string
  ok: boolean
  processAlive: boolean
  result?: unknown
  error?: unknown
  message: string
}

type LspRange = {
  start: { line: number; character: number }
  end: { line: number; character: number }
}

type LspHover = {
  contents:
    | string
    | { kind: string; value: string }
    | Array<string | { language: string; value: string }>
  range?: LspRange
}

type LspLocation = { uri: string; range: LspRange }

type LspDiagnostic = {
  range: LspRange
  severity?: number
  code?: string | number
  source?: string
  message: string
}

type LspFarmDiagnosticsEvent = {
  sessionId: string
  uri: string
  diagnostics: LspDiagnostic[]
  version?: number | null
  clear: boolean
}

const MARKER_OWNER = 'aethel-lsp-farm'
const sessionByLanguage = new Map<string, { sessionId: string; lastUri: string | null; lastVersion: number | null }>()

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

function asDiagnosticsEvent(raw: unknown): LspFarmDiagnosticsEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.sessionId !== 'string') return null
  const diagnosticsRaw = Array.isArray(o.diagnostics) ? o.diagnostics : []
  const diagnostics: LspDiagnostic[] = []
  for (const item of diagnosticsRaw) {
    if (!item || typeof item !== 'object') continue
    const d = item as Record<string, unknown>
    if (typeof d.message !== 'string') continue
    const range = d.range as LspRange | undefined
    if (
      !range ||
      typeof range.start?.line !== 'number' ||
      typeof range.start?.character !== 'number' ||
      typeof range.end?.line !== 'number' ||
      typeof range.end?.character !== 'number'
    ) {
      continue
    }
    diagnostics.push({
      message: d.message,
      range,
      severity: typeof d.severity === 'number' ? d.severity : undefined,
      code: typeof d.code === 'string' || typeof d.code === 'number' ? d.code : undefined,
      source: typeof d.source === 'string' ? d.source : undefined,
    })
  }
  return {
    sessionId: o.sessionId,
    uri: typeof o.uri === 'string' ? o.uri : '',
    diagnostics,
    version: typeof o.version === 'number' ? o.version : null,
    clear: o.clear === true,
  }
}

function markdownFromHover(hover: LspHover): string {
  const c = hover.contents
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    return c
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'value' in part) return String(part.value)
        return ''
      })
      .filter(Boolean)
      .join('\n\n')
  }
  if (c && typeof c === 'object' && 'value' in c) return String(c.value)
  return ''
}

export async function ensureFarmSession(language: FarmLanguage): Promise<LspFarmSessionInfo | null> {
  const cached = sessionByLanguage.get(language)
  if (cached) {
    return {
      sessionId: cached.sessionId,
      language,
      binaryPath: '',
      alive: true,
      initialized: true,
    }
  }
  try {
    const raw = await invoke('lsp_farm_ensure_session', {
      args: { language, rootUri: null },
    })
    const info = asSessionInfo(raw)
    if (!info || !info.alive || !info.initialized) return null
    sessionByLanguage.set(language, {
      sessionId: info.sessionId,
      lastUri: null,
      lastVersion: null,
    })
    return info
  } catch {
    sessionByLanguage.delete(language)
    return null
  }
}

async function syncModel(
  language: FarmLanguage,
  model: editor.ITextModel,
): Promise<boolean> {
  const session = await ensureFarmSession(language)
  if (!session) return false
  const uri = model.uri.toString()
  const text = model.getValue()
  const version = model.getVersionId()
  const cached = sessionByLanguage.get(language)
  const languageId =
    language === 'typescript' ? 'typescript' : language === 'rust' ? 'rust' : 'python'

  try {
    if (cached && cached.lastUri === uri && cached.lastVersion !== null) {
      const raw = await invoke('lsp_farm_did_change', {
        args: {
          sessionId: session.sessionId,
          uri,
          text,
          version,
          languageId,
        },
      })
      const rpc = asRpcResult(raw)
      if (!rpc?.ok) {
        if (rpc && !rpc.processAlive) sessionByLanguage.delete(language)
        return false
      }
    } else {
      const raw = await invoke('lsp_farm_did_open', {
        args: {
          sessionId: session.sessionId,
          uri,
          text,
          version,
          languageId,
        },
      })
      const rpc = asRpcResult(raw)
      if (!rpc?.ok) {
        if (rpc && !rpc.processAlive) sessionByLanguage.delete(language)
        return false
      }
    }
    sessionByLanguage.set(language, {
      sessionId: session.sessionId,
      lastUri: uri,
      lastVersion: version,
    })
    return true
  } catch {
    sessionByLanguage.delete(language)
    return false
  }
}

async function farmRequest<T>(
  language: FarmLanguage,
  method: string,
  model: editor.ITextModel,
  position: Position,
): Promise<T | null> {
  const session = await ensureFarmSession(language)
  if (!session) return null
  const synced = await syncModel(language, model)
  if (!synced) return null
  try {
    const raw = await invoke('lsp_farm_request', {
      args: {
        sessionId: session.sessionId,
        method,
        params: {
          textDocument: { uri: model.uri.toString() },
          position: {
            line: position.lineNumber - 1,
            character: position.column - 1,
          },
        },
      },
    })
    const rpc = asRpcResult(raw)
    if (!rpc?.ok || rpc.result == null) {
      if (rpc && !rpc.processAlive) sessionByLanguage.delete(language)
      return null
    }
    return rpc.result as T
  } catch {
    sessionByLanguage.delete(language)
    return null
  }
}

function applyDiagnostics(
  monacoApi: Monaco,
  model: editor.ITextModel,
  event: LspFarmDiagnosticsEvent,
): void {
  if (event.clear) {
    monacoApi.editor.setModelMarkers(model, MARKER_OWNER, [])
    return
  }
  if (event.uri && event.uri !== model.uri.toString()) return
  const markers: editor.IMarkerData[] = event.diagnostics.map((d) => ({
    severity:
      d.severity === 1
        ? monacoApi.MarkerSeverity.Error
        : d.severity === 2
          ? monacoApi.MarkerSeverity.Warning
          : monacoApi.MarkerSeverity.Info,
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

export type LspFarmWireHandle = {
  dispose: () => void
  farmLive: boolean
}

/**
 * Register hover/definition + didChange sync for one Monaco model.
 * Returns farmLive=false when ensure_session HELD (providers still registered; fail-closed null).
 */
export async function wireMonacoToLspFarm(
  monacoApi: Monaco,
  model: editor.ITextModel,
  language: FarmLanguage,
): Promise<LspFarmWireHandle> {
  const session = await ensureFarmSession(language)
  const farmLive = session !== null
  const disposables: IDisposable[] = []
  let disposed = false
  let debounce: ReturnType<typeof setTimeout> | null = null
  let unlistenDiag: (() => void) | null = null
  let unlistenDead: (() => void) | null = null

  const hoverProvider: languages.HoverProvider = {
    provideHover: async (m, position, _token: CancellationToken) => {
      const hover = await farmRequest<LspHover>(language, 'textDocument/hover', m, position)
      if (!hover) return null
      const value = markdownFromHover(hover)
      if (!value.trim()) return null
      return {
        contents: [{ value }],
      }
    },
  }

  const definitionProvider: languages.DefinitionProvider = {
    provideDefinition: async (m, position, _token: CancellationToken) => {
      const loc = await farmRequest<LspLocation | LspLocation[]>(
        language,
        'textDocument/definition',
        m,
        position,
      )
      if (!loc) return null
      const list = Array.isArray(loc) ? loc : [loc]
      return list
        .filter((l) => l?.uri && l.range)
        .map((l) => ({
          uri: monacoApi.Uri.parse(l.uri),
          range: {
            startLineNumber: l.range.start.line + 1,
            startColumn: l.range.start.character + 1,
            endLineNumber: l.range.end.line + 1,
            endColumn: l.range.end.character + 1,
          },
        }))
    },
  }

  disposables.push(monacoApi.languages.registerHoverProvider(language, hoverProvider))
  disposables.push(monacoApi.languages.registerDefinitionProvider(language, definitionProvider))

  const push = () => {
    if (disposed) return
    void syncModel(language, model).then((ok) => {
      if (!ok && !disposed) {
        monacoApi.editor.setModelMarkers(model, MARKER_OWNER, [])
      }
    })
  }
  push()
  disposables.push(
    model.onDidChangeContent(() => {
      if (debounce) clearTimeout(debounce)
      debounce = setTimeout(push, 120)
    }),
  )

  void (async () => {
    try {
      unlistenDiag = await listen('lsp-farm-diagnostics', (event) => {
        if (disposed) return
        const payload = asDiagnosticsEvent(event.payload)
        if (!payload) return
        applyDiagnostics(monacoApi, model, payload)
      })
      unlistenDead = await listen('lsp-farm-session-dead', () => {
        if (disposed) return
        sessionByLanguage.delete(language)
        monacoApi.editor.setModelMarkers(model, MARKER_OWNER, [])
      })
    } catch {
      // Poll-less fail-closed: sync still clears markers when session dies.
    }
  })()

  return {
    farmLive,
    dispose: () => {
      disposed = true
      if (debounce) clearTimeout(debounce)
      for (const d of disposables) d.dispose()
      unlistenDiag?.()
      unlistenDead?.()
      monacoApi.editor.setModelMarkers(model, MARKER_OWNER, [])
      sessionByLanguage.delete(language)
    },
  }
}

export function resetLspFarmBridgeCache(): void {
  sessionByLanguage.clear()
}
