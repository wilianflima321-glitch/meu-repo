import { DOMAIN_COLLAB_TEST } from '@/lib/design-system/domain-color-presets'
/**
 * Letter cg — Yjs viewport 3D presence (deepen Block 2A).
 * Conflict-free awareness cursors for co-edit in 3D viewport.
 */

import type { Awareness } from 'y-protocols/awareness'
import type { CursorPosition } from '@/lib/yjs-collaboration-contracts'

export const VIEWPORT_3D_PRESENCE_LETTER = 'cg' as const
export const VIEWPORT_3D_PRESENCE_WIRED = true as const

export const VIEWPORT_PANE = 'viewport' as const

export interface Viewport3dCursor extends CursorPosition {
  pane: typeof VIEWPORT_PANE
  x: number
  y: number
  z: number
  /** Optional selected entity id for co-edit highlight. */
  entityId?: string
}

export interface Viewport3dPeerCursor {
  clientId: number
  userId: string
  name: string
  color: string
  cursor: Viewport3dCursor
}

export function isViewport3dCursor(c: CursorPosition | undefined | null): c is Viewport3dCursor {
  return (
    !!c &&
    c.pane === VIEWPORT_PANE &&
    typeof c.x === 'number' &&
    typeof c.y === 'number' &&
    typeof c.z === 'number' &&
    Number.isFinite(c.x) &&
    Number.isFinite(c.y) &&
    Number.isFinite(c.z)
  )
}

export function buildViewport3dCursor(input: {
  x: number
  y: number
  z: number
  entityId?: string
}): Viewport3dCursor {
  return {
    pane: VIEWPORT_PANE,
    x: input.x,
    y: input.y,
    z: input.z,
    entityId: input.entityId,
  }
}

/**
 * Broadcast local 3D cursor via Yjs awareness (CRDT — conflict-free merge).
 */
export function publishViewport3dCursor(
  awareness: Awareness,
  cursor: Viewport3dCursor,
): void {
  const prev = awareness.getLocalState() ?? {}
  awareness.setLocalState({
    ...prev,
    cursor,
  })
}

/**
 * Collect remote viewport 3D cursors (exclude self by default).
 */
export function collectViewport3dPeers(
  awareness: Awareness,
  options?: { excludeSelf?: boolean },
): Viewport3dPeerCursor[] {
  const excludeSelf = options?.excludeSelf !== false
  const localId = awareness.clientID
  const peers: Viewport3dPeerCursor[] = []
  awareness.getStates().forEach((state, clientId) => {
    if (excludeSelf && clientId === localId) return
    const cursor = (state as { cursor?: CursorPosition }).cursor
    if (!isViewport3dCursor(cursor)) return
    const user = (state as { user?: { id?: string; name?: string; color?: string } }).user ?? {}
    peers.push({
      clientId,
      userId: String(user.id ?? clientId),
      name: String(user.name ?? 'Guest'),
      color: String(user.color ?? DOMAIN_COLLAB_TEST.presenceFallback),
      cursor,
    })
  })
  return peers
}

/**
 * Merge helper for tests without full y-protocols — last-write per clientId.
 * Mirrors awareness map semantics (conflict-free by client partition).
 */
export function mergeViewportPresenceMaps(
  maps: Array<Map<number, Viewport3dPeerCursor>>,
): Map<number, Viewport3dPeerCursor> {
  const out = new Map<number, Viewport3dPeerCursor>()
  for (const m of maps) {
    for (const [id, peer] of m) {
      out.set(id, peer)
    }
  }
  return out
}

export function proveViewport3dPresence(): {
  passed: boolean
  letter: typeof VIEWPORT_3D_PRESENCE_LETTER
  peers: number
} {
  const a = buildViewport3dCursor({ x: 1, y: 2, z: 3, entityId: 'mesh-1' })
  const b = buildViewport3dCursor({ x: 4, y: 5, z: 6 })
  const mapA = new Map<number, Viewport3dPeerCursor>([
    [1, { clientId: 1, userId: 'u1', name: 'A', color: DOMAIN_COLLAB_TEST.red, cursor: a }],
  ])
  const mapB = new Map<number, Viewport3dPeerCursor>([
    [2, { clientId: 2, userId: 'u2', name: 'B', color: DOMAIN_COLLAB_TEST.green, cursor: b }],
  ])
  const merged = mergeViewportPresenceMaps([mapA, mapB])
  return {
    passed:
      VIEWPORT_3D_PRESENCE_WIRED &&
      isViewport3dCursor(a) &&
      merged.size === 2 &&
      merged.get(1)!.cursor.z === 3 &&
      merged.get(2)!.cursor.x === 4,
    letter: VIEWPORT_3D_PRESENCE_LETTER,
    peers: merged.size,
  }
}
