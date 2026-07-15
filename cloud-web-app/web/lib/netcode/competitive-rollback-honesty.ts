/**
 * Letter ce — Competitive rollback soak honesty.
 * `competitiveRollbackSoakReady` flips only after dual-peer soak evidence.
 * `ggpoLive` / competitive marketing always false.
 */

import { probeFixedPointPhysicsWired } from './fixed-point-physics-adapter'
import {
  COMPETITIVE_ROLLBACK_SOAK_LETTER,
  COMPETITIVE_ROLLBACK_SOAK_WIRED,
  GGPO_LIVE_HELD,
  runCompetitiveRollbackSoak,
  type CompetitiveRollbackSoakResult,
} from './competitive-rollback-soak'
import { evaluateFixedPointNetcodeHonesty } from './fixed-point'

export interface CompetitiveRollbackHonesty {
  letter: typeof COMPETITIVE_ROLLBACK_SOAK_LETTER
  soakWired: typeof COMPETITIVE_ROLLBACK_SOAK_WIRED
  fixedPointPhysicsWired: boolean
  /**
   * True when dual-peer soak proves identical hashes + late resim + rollbackTo.
   * Does NOT imply GGPO-live transport or desync-free marketing.
   */
  competitiveRollbackSoakReady: boolean
  /** Always false — Founder GGPO unlock required. */
  ggpoLive: false
  /** Always false — marketing fail-closed. */
  competitiveMarketingAllowed: false
  soakFrames: number
  notes: string[]
}

/**
 * Run soak and return result (aaa-production auto-proof).
 */
export function proveCompetitiveRollbackSoak(
  frames = 48,
): CompetitiveRollbackSoakResult {
  return runCompetitiveRollbackSoak({ frames })
}

/**
 * Honesty probe: soak-ready when path wired and soak passes.
 */
export function probeCompetitiveRollbackHonesty(input?: {
  soakPassed?: boolean
  soakFrames?: number
  forceSoak?: boolean
}): CompetitiveRollbackHonesty {
  const fixedPointPhysicsWired = probeFixedPointPhysicsWired()
  const notes: string[] = [
    `letter ${COMPETITIVE_ROLLBACK_SOAK_LETTER}: GameLoop competitive authority + dual-peer soak`,
    'Rapier float remains default playtest; competitive opt-in skips Rapier step',
    'ggpoLive=false — no GGPO transport / desync-free claim',
  ]

  let soakPassed = input?.soakPassed === true
  let soakFrames = input?.soakFrames ?? 0

  if (input?.soakPassed === false) {
    soakPassed = false
  } else if (input?.soakPassed === true) {
    soakPassed = true
    soakFrames = input.soakFrames ?? soakFrames
  } else if (input?.forceSoak !== false && COMPETITIVE_ROLLBACK_SOAK_WIRED) {
    const soak = proveCompetitiveRollbackSoak(input?.soakFrames ?? 48)
    soakPassed = soak.passed
    soakFrames = soak.frames
    notes.push(...soak.notes)
  } else {
    notes.push('Soak not run in this probe')
  }

  if (!fixedPointPhysicsWired) {
    notes.push('Fixed-point physics path not wired — soak HELD')
  }
  if (!soakPassed) {
    notes.push('competitiveRollbackSoakReady HELD — soak did not pass')
  }

  const competitiveRollbackSoakReady =
    COMPETITIVE_ROLLBACK_SOAK_WIRED && fixedPointPhysicsWired && soakPassed

  // Sanity: fixed-point honesty never flips ggpoLive from soak alone.
  const fp = evaluateFixedPointNetcodeHonesty({
    fixedPointPhysicsWired,
    competitiveSoakProven: competitiveRollbackSoakReady,
    ggpoSessionProven: false,
  })
  if (fp.ggpoLive !== false) {
    notes.push('INVARIANT FAIL: ggpoLive must stay false')
  }
  void GGPO_LIVE_HELD

  return {
    letter: COMPETITIVE_ROLLBACK_SOAK_LETTER,
    soakWired: COMPETITIVE_ROLLBACK_SOAK_WIRED,
    fixedPointPhysicsWired,
    competitiveRollbackSoakReady,
    ggpoLive: false,
    competitiveMarketingAllowed: false,
    soakFrames,
    notes,
  }
}
