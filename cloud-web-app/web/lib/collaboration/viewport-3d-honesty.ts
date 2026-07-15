/**
 * Letter cg — Viewport 3D presence honesty (Block 2A deepen).
 */

import {
  VIEWPORT_3D_PRESENCE_LETTER,
  VIEWPORT_3D_PRESENCE_WIRED,
  proveViewport3dPresence,
} from '@/lib/collaboration/viewport-3d-presence'

export interface Viewport3dPresenceHonestyReport {
  letter: typeof VIEWPORT_3D_PRESENCE_LETTER
  wired: typeof VIEWPORT_3D_PRESENCE_WIRED
  viewport3dCursorsReady: boolean
  /** Always false — Agones / dedicated fleet HELD. */
  agonesCollabAllowed: false
  /** Physics co-sim multi-user HELD. */
  multiUserPhysicsCosimAllowed: false
  notes: string[]
}

export function probeViewport3dPresenceHonesty(input?: {
  provePassed?: boolean
}): Viewport3dPresenceHonestyReport {
  const ready = input?.provePassed ?? proveViewport3dPresence().passed
  return {
    letter: VIEWPORT_3D_PRESENCE_LETTER,
    wired: VIEWPORT_3D_PRESENCE_WIRED,
    viewport3dCursorsReady: ready,
    agonesCollabAllowed: false,
    multiUserPhysicsCosimAllowed: false,
    notes: [
      'Yjs viewport 3D cursor presence deepen CLOSED (letter cg)',
      'Conflict-free via awareness client partition (Block 2A)',
      'Agones / multi-user physics co-sim HELD',
    ],
  }
}
