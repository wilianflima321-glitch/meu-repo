/**
 * Camera + CSI topology focus lock — types + capability only.
 * Live fusion implementation [HELD] until camera pipeline exists.
 * Path: lib/ambient/camera-csi-lock.ts
 */

import { createComponentLogger } from '@/lib/observability/logger'
import { probeAmbientCapability } from './capability'
import type {
  AmbientCapabilityProbeInput,
  AmbientFocusLockState,
  AmbientFocusLockTarget,
} from './types'

const log = createComponentLogger('ambient-camera-csi-lock')

export interface AmbientFocusLockRequest {
  entityId: string
  topologyHint?: AmbientFocusLockTarget['topologyHint']
  preferSource?: 'camera' | 'csi' | 'fused'
}

/**
 * Evaluate focus lock. Without camera + CSI readiness → held unlocked state.
 * Never claims fused lock-on as production truth from scaffold alone.
 */
export function evaluateAmbientFocusLock(
  request: AmbientFocusLockRequest,
  probeInput: AmbientCapabilityProbeInput = {},
): AmbientFocusLockState {
  const cap = probeAmbientCapability(probeInput)

  if (!cap.cameraFusionReady) {
    log.info('focus_lock_held', { entityId: request.entityId })
    return {
      locked: false,
      fusionClaimAllowed: false,
      note:
        'Camera+CSI topology lock-on [HELD] — no camera pipeline / CSI fusion in production path',
      target: {
        entityId: request.entityId,
        topologyHint: request.topologyHint,
        lockStrength: 0,
        source: 'none',
        held: true,
      },
    }
  }

  // Future live path — still refuse marketing fusionClaim until soak
  return {
    locked: true,
    fusionClaimAllowed: false,
    note: 'Provisional lock path — fusionClaimAllowed stays false until K ambient acceptance',
    target: {
      entityId: request.entityId,
      topologyHint: request.topologyHint,
      lockStrength: 0.5,
      source: request.preferSource === 'camera' ? 'camera' : 'fused',
      held: true,
    },
  }
}
