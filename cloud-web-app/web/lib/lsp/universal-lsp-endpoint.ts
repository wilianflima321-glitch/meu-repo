/**
 * L.13 — client-safe Universal LSP endpoint resolver.
 * No Node/child_process imports — safe for Monaco bridge config.
 *
 * `tauriSidecar`:
 * - `held` — no desktop farm module (historical)
 * - `partial` — Studio Local `lsp_farm.rs` first-light (spawn + IPC probe) shipped;
 *   Monaco desktop hover/definition acceptance still OPEN
 * - `live` — reserved for proven Monaco hover/definition acceptance (not claimed)
 */

export type TauriLspSidecarStatus = 'held' | 'partial' | 'live'

export type UniversalLspEndpoint = {
  httpRelayPath: '/api/lsp'
  requestPath: '/api/lsp/request'
  notificationPath: '/api/lsp/notification'
  wsUrl: string
  wsFarmLive: boolean
  tauriSidecar: TauriLspSidecarStatus
}

export function resolveUniversalLspEndpoint(
  env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {},
): UniversalLspEndpoint {
  const envWs = typeof env.AETHEL_LSP_WS_URL === 'string' ? env.AETHEL_LSP_WS_URL.trim() : ''
  const wsFarmLive = envWs.length > 0 && env.AETHEL_LSP_WS_FARM_LIVE === '1'
  const wsUrl = envWs || 'ws://localhost:3001/lsp'
  // Product map: desktop first-light farm exists; never claim `live` without Monaco acceptance.
  const tauriSidecar: TauriLspSidecarStatus =
    env.AETHEL_LSP_TAURI_SIDECAR === 'live'
      ? 'partial' // refuse marketing uplift via env — live only after acceptance soak
      : env.AETHEL_LSP_TAURI_SIDECAR === 'held'
        ? 'held'
        : 'partial'

  return {
    httpRelayPath: '/api/lsp',
    requestPath: '/api/lsp/request',
    notificationPath: '/api/lsp/notification',
    wsUrl,
    wsFarmLive,
    tauriSidecar,
  }
}
