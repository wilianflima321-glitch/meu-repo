/**
 * Letter cg — Viewport 3D Yjs presence Vitest.
 */

import { describe, expect, it } from 'vitest'
import {
  buildViewport3dCursor,
  isViewport3dCursor,
  mergeViewportPresenceMaps,
  proveViewport3dPresence,
  VIEWPORT_PANE,
  type Viewport3dPeerCursor,
} from '@/lib/collaboration/viewport-3d-presence'
import { probeViewport3dPresenceHonesty } from '@/lib/collaboration/viewport-3d-honesty'

describe('viewport 3d presence (cg)', () => {
  it('builds and validates viewport pane cursors with z', () => {
    const c = buildViewport3dCursor({ x: 1, y: 2, z: 3, entityId: 'e1' })
    expect(c.pane).toBe(VIEWPORT_PANE)
    expect(isViewport3dCursor(c)).toBe(true)
    expect(isViewport3dCursor({ x: 1, y: 2, pane: 'monaco' })).toBe(false)
  })

  it('conflict-free merge by clientId partition', () => {
    const proved = proveViewport3dPresence()
    expect(proved.passed).toBe(true)
    expect(proved.peers).toBe(2)

    const a: Viewport3dPeerCursor = {
      clientId: 9,
      userId: 'u9',
      name: 'Ren',
      color: '#abc',
      cursor: buildViewport3dCursor({ x: 0, y: 1, z: 2 }),
    }
    const m1 = new Map([[9, a]])
    const m2 = new Map([
      [
        9,
        {
          ...a,
          cursor: buildViewport3dCursor({ x: 9, y: 9, z: 9 }),
        },
      ],
    ])
    const merged = mergeViewportPresenceMaps([m1, m2])
    expect(merged.get(9)!.cursor.x).toBe(9)
  })

  it('honesty: cursors ready; Agones / physics co-sim HELD', () => {
    const honesty = probeViewport3dPresenceHonesty()
    expect(honesty.letter).toBe('cg')
    expect(honesty.viewport3dCursorsReady).toBe(true)
    expect(honesty.agonesCollabAllowed).toBe(false)
    expect(honesty.multiUserPhysicsCosimAllowed).toBe(false)
  })
})
