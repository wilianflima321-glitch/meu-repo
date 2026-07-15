// @aethel-heavy-async-boundary Studio/engine character physics; never import from public/dashboard/admin route shells.
/**
 * Law III Active Ragdoll — muscle + balance apply CORE (letter bb).
 *
 * Real PD muscle actuators + inverted-pendulum balance forces through the existing
 * Rapier/web PhysicsBody force/torque substrate. Ambient posture hints are optional
 * consumers (enhancement-only); ambient bus never auto-writes impulses
 * (`autoApplyForces: false`). CSI remains independent (`physiologyHeld`).
 *
 * Honesty: `activeRagdollHeld` flips false only when apply path + Rapier substrate
 * are real. Euphoria AAA parity / desktop Rust authority stay [HELD] — GT730 /
 * Law XV Capability Score scales muscle budget; never markets full Euphoria on web.
 */

import type { AmbientPhysicsPort, AmbientPostureHint } from '@/lib/ambient/ports'

/** Plain vec — keep apply helpers free of Three.js for vitest purity. */
export type ActiveRagdollVec3 = { x: number; y: number; z: number }

/**
 * Minimal force/torque surface matching `PhysicsBody` in physics-engine-real.ts.
 * Tests may stub this without loading Rapier WASM.
 */
export interface ActiveRagdollForceBody {
  addForce(force: ActiveRagdollVec3, mode?: 'force' | 'impulse'): void
  addTorque(torque: ActiveRagdollVec3, mode?: 'force' | 'impulse'): void
}

export const ACTIVE_RAGDOLL_SHIP_STATUS = {
  muscleBalanceApply: 'SHIPPED' as const,
  heldWithoutSubstrate: 'HELD' as const,
  euphoriaParity: 'HELD' as const,
  desktopRustAuthority: 'HELD' as const,
  labelReady: 'Law III Active Ragdoll muscle/balance apply via Rapier force substrate',
  labelHeld: 'Law III Active Ragdoll apply [HELD] — no Rapier substrate or apply path disabled',
  labelEuphoriaHeld:
    'Euphoria AAA parity [HELD] — web CORE apply is real forces, not NaturalMotion-class claim',
} as const

export interface MusclePdInput {
  /** Angular error toward animation/joint target (axis × angle, rad). */
  angleError: ActiveRagdollVec3
  angularVelocity: ActiveRagdollVec3
  stiffness: number
  damping: number
}

export interface MuscleBiasFromPosture {
  /** Multiplier on PD stiffness (co-contraction). */
  tensionScale: number
  /** Widens/narrows balance capture margin. */
  balanceMarginScale: number
  /** Anticipatory flinch torque mix 0..1. */
  flinchBias: number
  /** False when ambient noop / classic — identity bias. */
  applied: boolean
}

export interface BalanceCorrectionInput {
  com: ActiveRagdollVec3
  supportPoint: ActiveRagdollVec3
  comVelocity: ActiveRagdollVec3
  /** World up; default (0,1,0). */
  upright?: ActiveRagdollVec3
  stiffness: number
  damping: number
  /** From posture bias — >1 = more tolerant, <1 = tighter recover. */
  marginScale: number
}

export interface ActiveRagdollSegment {
  id: string
  body: ActiveRagdollForceBody
  angleError: ActiveRagdollVec3
  angularVelocity: ActiveRagdollVec3
  /** Optional linear restore toward animation root (hit recovery assist). */
  linearError?: ActiveRagdollVec3
}

export interface ActiveRagdollTickInput {
  segments: ActiveRagdollSegment[]
  balance?: BalanceCorrectionInput
  /** Ambient / motion posture hint — ignored when ambientNoop. */
  postureHint?: AmbientPostureHint
  /** Classic ambient path — identity bias, still may apply base muscle if enabled. */
  ambientNoop?: boolean
  /** Base PD gains before posture + capability scaling. */
  muscleStiffness?: number
  muscleDamping?: number
  /** Law XV Capability Score 0–100 when known (GT730-honest budget). */
  capabilityScore?: number
  /** When false, tick is a pure no-op (apply path disabled). */
  applyEnabled?: boolean
  /** Rapier/web substrate present — required for honesty ready flip. */
  rapierSubstrateReady?: boolean
}

export interface ActiveRagdollTickResult {
  applied: boolean
  ambientBiasApplied: boolean
  segmentTorques: Array<{ id: string; torque: ActiveRagdollVec3 }>
  balanceForce: ActiveRagdollVec3 | null
  muscleBudgetScale: number
  activeRagdollHeld: boolean
  canClaimEuphoriaParity: false
}

export interface ActiveRagdollHonestyInput {
  rapierSubstrateReady: boolean
  applyPathEnabled: boolean
  /** Law XV score when known — GT730 / integrated never unlock Euphoria claims. */
  capabilityScore?: number
}

export interface ActiveRagdollHonestyReport {
  activeRagdollHeld: boolean
  shipStatus: 'SHIPPED' | 'HELD'
  badge: string
  canClaimEuphoriaParity: false
  muscleBudgetScale: number
  capabilityScoreRespected: boolean
  euphoriaParityStatus: typeof ACTIVE_RAGDOLL_SHIP_STATUS.euphoriaParity
  desktopRustAuthorityStatus: typeof ACTIVE_RAGDOLL_SHIP_STATUS.desktopRustAuthority
  notes: string[]
}

const DEFAULT_STIFFNESS = 40
const DEFAULT_DAMPING = 8
const DEFAULT_UPRIGHT: ActiveRagdollVec3 = { x: 0, y: 1, z: 0 }

function vec(x: number, y: number, z: number): ActiveRagdollVec3 {
  return { x, y, z }
}

function scaleVec(v: ActiveRagdollVec3, s: number): ActiveRagdollVec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s }
}

function addVec(a: ActiveRagdollVec3, b: ActiveRagdollVec3): ActiveRagdollVec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function subVec(a: ActiveRagdollVec3, b: ActiveRagdollVec3): ActiveRagdollVec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(1, n))
}

/**
 * Law XV muscle budget — weak GPUs get real but cheaper actuators; never Euphoria claim.
 * GT730 / webgl2 tier (~score &lt; 20) stays heavily scaled.
 */
export function muscleBudgetScaleFromCapabilityScore(capabilityScore?: number): number {
  if (capabilityScore === undefined || !Number.isFinite(capabilityScore)) return 1
  const s = Math.max(0, Math.min(100, Math.round(capabilityScore)))
  if (s < 20) return 0.35
  if (s < 45) return 0.55
  if (s < 75) return 0.75
  return 1
}

/** PD actuator: τ = k·e − d·ω */
export function computeMusclePdTorque(input: MusclePdInput): ActiveRagdollVec3 {
  const k = Number.isFinite(input.stiffness) ? input.stiffness : 0
  const d = Number.isFinite(input.damping) ? input.damping : 0
  return {
    x: k * input.angleError.x - d * input.angularVelocity.x,
    y: k * input.angleError.y - d * input.angularVelocity.y,
    z: k * input.angleError.z - d * input.angularVelocity.z,
  }
}

/**
 * Map AmbientPostureHint → muscle/balance bias.
 * Classic / noop → identity (applied: false) — Zero-UI ambient no-op path.
 */
export function mapPostureHintToMuscleBias(
  postureHint: AmbientPostureHint | undefined,
  ambientNoop = false,
): MuscleBiasFromPosture {
  if (ambientNoop || !postureHint || postureHint === 'classic') {
    return {
      tensionScale: 1,
      balanceMarginScale: 1,
      flinchBias: 0,
      applied: false,
    }
  }
  switch (postureHint) {
    case 'relaxed':
      return { tensionScale: 0.7, balanceMarginScale: 1.25, flinchBias: 0, applied: true }
    case 'tense':
      return { tensionScale: 1.35, balanceMarginScale: 0.85, flinchBias: 0.15, applied: true }
    case 'flinch_ready':
      return { tensionScale: 1.6, balanceMarginScale: 0.65, flinchBias: 0.55, applied: true }
    case 'idle_absent':
      return { tensionScale: 0.35, balanceMarginScale: 1.4, flinchBias: 0, applied: true }
    default:
      return { tensionScale: 1, balanceMarginScale: 1, flinchBias: 0, applied: false }
  }
}

/**
 * Inverted-pendulum / capture-point style horizontal restore toward support.
 * Returns world-space force (not impulse) for COM body or root segment.
 */
export function computeBalanceCorrectionForce(input: BalanceCorrectionInput): ActiveRagdollVec3 {
  const upright = input.upright ?? DEFAULT_UPRIGHT
  const margin = Number.isFinite(input.marginScale) && input.marginScale > 0 ? input.marginScale : 1
  const k = (Number.isFinite(input.stiffness) ? input.stiffness : 0) / margin
  const d = Number.isFinite(input.damping) ? input.damping : 0

  const offset = subVec(input.com, input.supportPoint)
  // Project offset onto plane perpendicular to upright (horizontal lean).
  const alongUp =
    offset.x * upright.x + offset.y * upright.y + offset.z * upright.z
  const horizontal = {
    x: offset.x - upright.x * alongUp,
    y: offset.y - upright.y * alongUp,
    z: offset.z - upright.z * alongUp,
  }
  const velAlongUp =
    input.comVelocity.x * upright.x +
    input.comVelocity.y * upright.y +
    input.comVelocity.z * upright.z
  const horizVel = {
    x: input.comVelocity.x - upright.x * velAlongUp,
    y: input.comVelocity.y - upright.y * velAlongUp,
    z: input.comVelocity.z - upright.z * velAlongUp,
  }

  return {
    x: -k * horizontal.x - d * horizVel.x,
    y: -k * horizontal.y - d * horizVel.y,
    z: -k * horizontal.z - d * horizVel.z,
  }
}

export function evaluateActiveRagdollHonesty(
  input: ActiveRagdollHonestyInput,
): ActiveRagdollHonestyReport {
  const score = input.capabilityScore
  const scoreOk = score === undefined || (Number.isFinite(score) && score >= 0 && score <= 100)
  const muscleBudgetScale = muscleBudgetScaleFromCapabilityScore(score)
  const ready = input.rapierSubstrateReady === true && input.applyPathEnabled === true
  const notes: string[] = [
    ACTIVE_RAGDOLL_SHIP_STATUS.labelEuphoriaHeld,
    'desktop Rust muscle authority remains HELD (physics_kernel extension)',
  ]
  if (!input.rapierSubstrateReady) {
    notes.push('Rapier/web force substrate not ready')
  }
  if (!input.applyPathEnabled) {
    notes.push('apply path disabled by consumer')
  }
  if (score !== undefined && score < 20) {
    notes.push('GT730 / low Capability Score — muscle budget scaled; no Euphoria marketing')
  }

  return {
    activeRagdollHeld: !ready,
    shipStatus: ready ? 'SHIPPED' : 'HELD',
    badge: ready
      ? ACTIVE_RAGDOLL_SHIP_STATUS.labelReady
      : ACTIVE_RAGDOLL_SHIP_STATUS.labelHeld,
    canClaimEuphoriaParity: false,
    muscleBudgetScale,
    capabilityScoreRespected: scoreOk,
    euphoriaParityStatus: ACTIVE_RAGDOLL_SHIP_STATUS.euphoriaParity,
    desktopRustAuthorityStatus: ACTIVE_RAGDOLL_SHIP_STATUS.desktopRustAuthority,
    notes,
  }
}

/** Honesty flip helper for AmbientPhysicsPort stamping. */
export function resolveActiveRagdollHeld(input: ActiveRagdollHonestyInput): boolean {
  return evaluateActiveRagdollHonesty(input).activeRagdollHeld
}

/**
 * Stamp ambient physics port with Law III apply honesty.
 * Keeps `autoApplyForces: false` and CSI/`physiologyHeld` untouched.
 */
export function stampAmbientPhysicsPortWithApplyHonesty(
  port: AmbientPhysicsPort,
  honesty: ActiveRagdollHonestyReport,
): AmbientPhysicsPort {
  return {
    ...port,
    autoApplyForces: false,
    physiologyHeld: true,
    activeRagdollHeld: honesty.activeRagdollHeld,
  }
}

/**
 * One simulation tick: PD muscle torques + optional balance force on segments.
 * Ambient classic/noop → no posture bias (identity); muscle still runs if apply enabled.
 */
export function applyActiveRagdollTick(input: ActiveRagdollTickInput): ActiveRagdollTickResult {
  const honesty = evaluateActiveRagdollHonesty({
    rapierSubstrateReady: input.rapierSubstrateReady === true,
    applyPathEnabled: input.applyEnabled !== false,
    capabilityScore: input.capabilityScore,
  })

  const empty: ActiveRagdollTickResult = {
    applied: false,
    ambientBiasApplied: false,
    segmentTorques: [],
    balanceForce: null,
    muscleBudgetScale: honesty.muscleBudgetScale,
    activeRagdollHeld: honesty.activeRagdollHeld,
    canClaimEuphoriaParity: false,
  }

  if (honesty.activeRagdollHeld || input.applyEnabled === false) {
    return empty
  }

  const bias = mapPostureHintToMuscleBias(input.postureHint, input.ambientNoop === true)
  const budget = honesty.muscleBudgetScale
  const stiffness =
    (input.muscleStiffness ?? DEFAULT_STIFFNESS) * bias.tensionScale * budget
  const damping = (input.muscleDamping ?? DEFAULT_DAMPING) * budget

  const segmentTorques: ActiveRagdollTickResult['segmentTorques'] = []
  for (const segment of input.segments) {
    let torque = computeMusclePdTorque({
      angleError: segment.angleError,
      angularVelocity: segment.angularVelocity,
      stiffness,
      damping,
    })
    if (bias.flinchBias > 0) {
      // Anticipatory flexion — bias toward +X local flinch without inventing random noise.
      const flinch = vec(bias.flinchBias * stiffness * 0.05, 0, 0)
      torque = addVec(torque, flinch)
    }
    segment.body.addTorque(torque, 'force')
    if (segment.linearError) {
      const restore = scaleVec(segment.linearError, stiffness * 0.25)
      segment.body.addForce(restore, 'force')
    }
    segmentTorques.push({ id: segment.id, torque })
  }

  let balanceForce: ActiveRagdollVec3 | null = null
  if (input.balance && input.segments.length > 0) {
    balanceForce = computeBalanceCorrectionForce({
      ...input.balance,
      marginScale: (input.balance.marginScale ?? 1) * bias.balanceMarginScale,
      stiffness: (input.balance.stiffness ?? DEFAULT_STIFFNESS) * budget,
      damping: (input.balance.damping ?? DEFAULT_DAMPING) * budget,
    })
    // Apply balance to first (root) segment — consumer may designate pelvis/COM body.
    input.segments[0].body.addForce(balanceForce, 'force')
  }

  return {
    applied: true,
    ambientBiasApplied: bias.applied,
    segmentTorques,
    balanceForce,
    muscleBudgetScale: budget,
    activeRagdollHeld: false,
    canClaimEuphoriaParity: false,
  }
}

export interface ActiveRagdollControllerOptions {
  rapierSubstrateReady?: boolean
  applyEnabled?: boolean
  capabilityScore?: number
  muscleStiffness?: number
  muscleDamping?: number
}

/**
 * Stateful consumer: optional AmbientPhysicsPort → posture bias → apply tick.
 * Ambient subscribe remains opt-in; this never writes from the ambient bus itself.
 */
export class ActiveRagdollController {
  private postureHint: AmbientPostureHint = 'classic'
  private ambientNoop = true
  private options: Required<
    Pick<
      ActiveRagdollControllerOptions,
      'rapierSubstrateReady' | 'applyEnabled' | 'capabilityScore' | 'muscleStiffness' | 'muscleDamping'
    >
  >

  constructor(options: ActiveRagdollControllerOptions = {}) {
    this.options = {
      rapierSubstrateReady: options.rapierSubstrateReady === true,
      applyEnabled: options.applyEnabled !== false,
      capabilityScore: options.capabilityScore ?? Number.NaN,
      muscleStiffness: options.muscleStiffness ?? DEFAULT_STIFFNESS,
      muscleDamping: options.muscleDamping ?? DEFAULT_DAMPING,
    }
  }

  setRapierSubstrateReady(ready: boolean): void {
    this.options.rapierSubstrateReady = ready
  }

  setCapabilityScore(score: number | undefined): void {
    this.options.capabilityScore = score ?? Number.NaN
  }

  /** Optional ambient consumer — classic/noop → identity bias. */
  setPostureFromAmbient(port: Pick<AmbientPhysicsPort, 'postureHint' | 'noop'>): void {
    this.ambientNoop = port.noop === true
    this.postureHint = port.postureHint
  }

  clearAmbientPosture(): void {
    this.ambientNoop = true
    this.postureHint = 'classic'
  }

  honesty(): ActiveRagdollHonestyReport {
    return evaluateActiveRagdollHonesty({
      rapierSubstrateReady: this.options.rapierSubstrateReady,
      applyPathEnabled: this.options.applyEnabled,
      capabilityScore: Number.isFinite(this.options.capabilityScore)
        ? this.options.capabilityScore
        : undefined,
    })
  }

  tick(
    segments: ActiveRagdollSegment[],
    balance?: BalanceCorrectionInput,
  ): ActiveRagdollTickResult {
    return applyActiveRagdollTick({
      segments,
      balance,
      postureHint: this.postureHint,
      ambientNoop: this.ambientNoop,
      muscleStiffness: this.options.muscleStiffness,
      muscleDamping: this.options.muscleDamping,
      capabilityScore: Number.isFinite(this.options.capabilityScore)
        ? this.options.capabilityScore
        : undefined,
      applyEnabled: this.options.applyEnabled,
      rapierSubstrateReady: this.options.rapierSubstrateReady,
    })
  }
}

/** Clamp helper exported for tests / callers composing flinch mixes. */
export function clampUnit(n: number): number {
  return clamp01(n)
}
