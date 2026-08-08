/**
 * L.13 — client-safe Universal LSP endpoint resolver.
 * No Node/child_process imports — safe for Monaco bridge config.
 *
 * `tauriSidecar`:
 * - `held` — no desktop farm module (historical)
 * - `partial` — Studio Local `lsp_farm.rs` spawn + Monaco hover/definition IPC wired;
 *   full L.C multi-language soak (Python) still OPEN
 * - `live` — reserved for proven L.C acceptance soak (not claimable via env)
 *
 * `monacoDesktopHoverDefinition`:
 * - `open` — historical / not wired
 * - `partial` — hover/definition IPC wired (fail-closed without live binary)
 * - `live` — reserved for L.C soak certificate (not claimable via env)
 */

export type TauriLspSidecarStatus = 'held' | 'partial' | 'live'
export type MonacoDesktopHoverDefinitionStatus = 'open' | 'partial' | 'live'

export type UniversalLspEndpoint = {
  httpRelayPath: '/api/lsp'
  requestPath: '/api/lsp/request'
  notificationPath: '/api/lsp/notification'
  wsUrl: string
  wsFarmLive: boolean
  tauriSidecar: TauriLspSidecarStatus
  monacoDesktopHoverDefinition: MonacoDesktopHoverDefinitionStatus
}

export function resolveUniversalLspEndpoint(
  env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {},
): UniversalLspEndpoint {
  const envWs = typeof env.AETHEL_LSP_WS_URL === 'string' ? env.AETHEL_LSP_WS_URL.trim() : ''
  const wsFarmLive = envWs.length > 0 && env.AETHEL_LSP_WS_FARM_LIVE === '1'
  const wsUrl = envWs || 'ws://localhost:3001/lsp'
  // Product map: desktop farm + Monaco hover wire exists; never claim `live` without L.C soak.
  const tauriSidecar: TauriLspSidecarStatus =
    env.AETHEL_LSP_TAURI_SIDECAR === 'live'
      ? 'partial' // refuse marketing uplift via env — live only after acceptance soak
      : env.AETHEL_LSP_TAURI_SIDECAR === 'held'
        ? 'held'
        : 'partial'

  const monacoDesktopHoverDefinition: MonacoDesktopHoverDefinitionStatus =
    env.AETHEL_LSP_MONACO_DESKTOP === 'live'
      ? 'partial' // refuse marketing uplift via env
      : env.AETHEL_LSP_MONACO_DESKTOP === 'open'
        ? 'open'
        : 'partial'

  return {
    httpRelayPath: '/api/lsp',
    requestPath: '/api/lsp/request',
    notificationPath: '/api/lsp/notification',
    wsUrl,
    wsFarmLive,
    tauriSidecar,
    monacoDesktopHoverDefinition,
  }
}
