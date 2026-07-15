/**
 * Physics authority mode — Rapier float default; fixed-point competitive explicit.
 * Zero-UI: when competitive is unavailable or marketing HELD, no panel/toast.
 */

import { probeFixedPointPhysicsWired } from './fixed-point-physics-adapter'
import { evaluateFixedPointNetcodeHonesty } from './fixed-point'

export type PhysicsAuthorityMode = 'rapier-float' | 'fixed-point-competitive'

export interface CompetitiveSimModeResolution {
  mode: PhysicsAuthorityMode
  /** Competitive path module present and selectable. */
  competitivePathAvailable: boolean
  /** Path probe: fixed-point adapter + rollback ready (not GGPO-live). */
  fixedPointNetcodeReady: boolean
  /** Always false until Founder GGPO soak unlock. */
  ggpoLive: false
  /** Marketing flip for competitive / desync-free — fail-closed. */
  competitiveMarketingAllowed: false
  /**
   * Zero-UI: never show competitive chrome until marketing unlock.
   * Unavailable path → silent (no toast / no panel).
   */
  uiVisible: false
  reason: string
}

/**
 * Resolve physics authority. Rapier float is default unless competitive is
 * explicitly requested AND the fixed-point path is wired.
 */
export function resolvePhysicsAuthorityMode(opts?: {
  competitiveRequested?: boolean
}): CompetitiveSimModeResolution {
  const pathAvailable = probeFixedPointPhysicsWired()
  const honesty = evaluateFixedPointNetcodeHonesty({
    fixedPointPhysicsWired: pathAvailable,
    ggpoSessionProven: false,
  })

  const base: Omit<CompetitiveSimModeResolution, 'mode' | 'reason'> = {
    competitivePathAvailable: pathAvailable,
    fixedPointNetcodeReady: honesty.fixedPointNetcodeReady,
    ggpoLive: false,
    competitiveMarketingAllowed: false,
    uiVisible: false,
  }

  if (opts?.competitiveRequested !== true) {
    return {
      ...base,
      mode: 'rapier-float',
      reason: 'Rapier float default — competitive not requested',
    }
  }

  if (!pathAvailable) {
    // Zero-UI: competitive unavailable — fall back silently.
    return {
      ...base,
      mode: 'rapier-float',
      reason: 'Competitive fixed-point path unavailable — silent Rapier fallback',
    }
  }

  return {
    ...base,
    mode: 'fixed-point-competitive',
    reason:
      'Fixed-point competitive authority selected — GGPO-live / desync-free marketing [HELD]',
  }
}

/**
 * Zero-UI gate for any competitive chrome. Always returns null until marketing unlock.
 */
export function competitiveModeUiOrNull(
  _resolution?: CompetitiveSimModeResolution,
): null {
  return null
}
