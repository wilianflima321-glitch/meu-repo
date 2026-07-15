/**
 * Block 7A.2 — Dock persistence keys + remount honesty.
 * Existing WorkspaceProvider storage covers layout; WebGL canvas singleton
 * across Next.js route changes remains [HELD] (no parallel remount invent).
 */

export const IDE_DOCK_STORAGE_KEY = 'aethel.ide.dock.v1'

export type ViewportDockMode = 'viewport' | 'canvas' | 'runtime'

export function viewportDockStorageKey(mode: ViewportDockMode): string {
  return `aethel.viewport.dock.${mode}.v1`
}

export type WebglRouteRemountHonesty = {
  dockPersistence: 'IMPLEMENTED'
  /** Cross-route canvas keep-alive without inventing a parallel R3F root */
  webglRouteKeepAlive: 'HELD'
  note: string
}

export function evaluateWebglRouteRemountHonesty(): WebglRouteRemountHonesty {
  return {
    dockPersistence: 'IMPLEMENTED',
    webglRouteKeepAlive: 'HELD',
    note:
      'Dock layout persists via WorkspaceProvider localStorage. Full WebGL canvas keep-alive across Next.js route remounts is [HELD] — frameloop pause (7A.4 / ENG-023) covers GPU burn without inventing a singleton canvas store.',
  }
}
