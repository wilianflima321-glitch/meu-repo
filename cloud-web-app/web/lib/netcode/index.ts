/**
 * Competitive netcode — fixed-point math, physics adapter, rollback session.
 * Rapier float remains default; competitive path is explicit + marketing HELD.
 */

export {
  FIXED_POINT_SHIFT,
  FIXED_ONE,
  FIXED_HALF,
  toFixed,
  fromFixed,
  fixedAdd,
  fixedSub,
  fixedMul,
  fixedDiv,
  fixedNeg,
  fixedAbs,
  fixedClamp,
  fixedSqrt,
  fixedDeterminismHash,
  evaluateFixedPointNetcodeHonesty,
  type Fixed,
  type FixedPointNetcodeHonesty,
} from './fixed-point'

export {
  RollbackFrameBuffer,
  rollbackFrameStoreClaim,
  type RollbackFrameSlot,
  type RollbackPlayerInput,
} from './rollback-frame-buffer'

export {
  FIXED_POINT_PHYSICS_PATH_WIRED,
  FixedPointPhysicsAdapter,
  createFixedPointPhysicsAdapter,
  probeFixedPointPhysicsWired,
  fixedPointPhysicsPathClaim,
  type FixedPointBodyState,
  type FixedPointPhysicsAdapterOptions,
} from './fixed-point-physics-adapter'

export {
  FixedPointRollbackSession,
  createFixedPointRollbackSession,
  fixedInputFromAxes,
  type FixedPointRollbackSessionOptions,
} from './fixed-point-rollback-session'

export {
  resolvePhysicsAuthorityMode,
  competitiveModeUiOrNull,
  type PhysicsAuthorityMode,
  type CompetitiveSimModeResolution,
} from './competitive-sim-mode'

export {
  COMPETITIVE_ROLLBACK_SOAK_LETTER,
  COMPETITIVE_ROLLBACK_SOAK_WIRED,
  GGPO_LIVE_HELD,
  buildCompetitiveSoakTape,
  runCompetitiveRollbackSoak,
  tickCompetitiveAuthority,
  type CompetitiveRollbackSoakOptions,
  type CompetitiveRollbackSoakResult,
} from './competitive-rollback-soak'

export {
  proveCompetitiveRollbackSoak,
  probeCompetitiveRollbackHonesty,
  type CompetitiveRollbackHonesty,
} from './competitive-rollback-honesty'

export {
  GGPO_LIVE_FROM_TICK_EVIDENCE,
  DESYNC_FREE_MARKETING_ALLOWED,
  runAuthoritativeTickEvidence,
  probeAuthoritativeTickEvidenceReadiness,
  captureAuthoritativeTickTape,
  type AuthoritativeTickEvidenceResult,
} from './authoritative-tick-evidence'
