/**
 * L.13 — client-safe Universal LSP endpoint resolver.
 * No Node/child_process imports — safe for Monaco bridge config.
 */

export type UniversalLspEndpoint = {
  httpRelayPath: '/api/lsp'
  requestPath: '/api/lsp/request'
  notificationPath: '/api/lsp/notification'
  wsUrl: string
  wsFarmLive: boolean
  tauriSidecar: 'held'
}

export function resolveUniversalLspEndpoint(
  env: Record<string, string | undefined> = typeof process !== 'undefined' ? process.env : {},
): UniversalLspEndpoint {
  const envWs = typeof env.AETHEL_LSP_WS_URL === 'string' ? env.AETHEL_LSP_WS_URL.trim() : ''
  const wsFarmLive = envWs.length > 0 && env.AETHEL_LSP_WS_FARM_LIVE === '1'
  const wsUrl = envWs || 'ws://localhost:3001/lsp'

  return {
    httpRelayPath: '/api/lsp',
    requestPath: '/api/lsp/request',
    notificationPath: '/api/lsp/notification',
    wsUrl,
    wsFarmLive,
    tauriSidecar: 'held',
  }
}
