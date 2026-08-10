/**
 * Law III — Euphoria / active ragdoll evidence (fail-closed AAA).
 *
 * Seals PD muscle + balance apply soak fingerprints through the real
 * `applyActiveRagdollTick` path (stub force bodies — no Rapier WASM required).
 * Never flips Euphoria / NaturalMotion parity marketing.
 */

import { createHash } from 'node:crypto'

import { createComponentLogger } from '@/lib/observability/logger'
import {
  applyActiveRagdollTick,
  evaluateActiveRagdollHonesty,
  type ActiveRagdollForceBody,
  type ActiveRagdollVec3,
} from '@/lib/physics/active-ragdoll-apply'

const log = createComponentLogger('euphoria-ragdoll-evidence')

/** Product marketing — always false until G.2 Euphoria soak + Founder AAA gate. */
export const EUPHORIA_AAA_READY = false as const
export const EUPHORIA_PARITY_MARKETING_ALLOWED = false as const
export const NATURALMOTION_PARITY_READY = false as const

export type EuphoriaEvidenceRejectCode =
  | 'no_torque'
  | 'apply_disabled'
  | 'empty_evidence'
  | 'aaa_claim_held'
  | 'parity_claim_held'

export type EuphoriaEvidenceResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: EuphoriaEvidenceRejectCode; message: string }

export type EuphoriaRagdollEvidence = {
  version: 1
  segmentCount: number
  torqueMagnitudeSum: number
  balanceForceMagnitude: number
  muscleBudgetScale: number
  capabilityScore: number
  applied: true
  fingerprint: string
  euphoriaAaaReady: false
  naturalMotionParityReady: false
  marketingAllowed: false
  canClaimEuphoriaParity: false
}

function fingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 16)
}

function mag(v: ActiveRagdollVec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
}

class RecordingForceBody implements ActiveRagdollForceBody {
  forces: ActiveRagdollVec3[] = []
  torques: ActiveRagdollVec3[] = []

  addForce(force: ActiveRagdollVec3): void {
    this.forces.push({ ...force })
  }

  addTorque(torque: ActiveRagdollVec3): void {
    this.torques.push({ ...torque })
  }
}

/**
 * Run Law III muscle/balance soak and seal measurable evidence.
 * Uses stub force bodies — proves apply math, not Rapier WASM load.
 */
export function runEuphoriaRagdollEvidenceSoak(input?: {
  capabilityScore?: number
  applyEnabled?: boolean
  rapierSubstrateReady?: boolean
}): EuphoriaEvidenceResult<EuphoriaRagdollEvidence> {
  if (input?.applyEnabled === false) {
    return {
      ok: false,
      code: 'apply_disabled',
      message: 'Active ragdoll apply disabled — refuse empty Euphoria evidence',
    }
  }

  const torso = new RecordingForceBody()
  const pelvis = new RecordingForceBody()
  const capabilityScore = input?.capabilityScore ?? 55

  const tick = applyActiveRagdollTick({
    segments: [
      {
        id: 'torso',
        body: torso,
        angleError: { x: 0.2, y: 0, z: -0.1 },
        angularVelocity: { x: 0.05, y: 0, z: 0 },
      },
      {
        id: 'pelvis',
        body: pelvis,
        angleError: { x: -0.15, y: 0.05, z: 0 },
        angularVelocity: { x: 0, y: 0.02, z: -0.03 },
        linearError: { x: 0.01, y: 0, z: 0 },
      },
    ],
    balance: {
      com: { x: 0.12, y: 1.0, z: 0.02 },
      supportPoint: { x: 0, y: 0, z: 0 },
      comVelocity: { x: 0.2, y: 0, z: 0 },
      stiffness: 80,
      damping: 12,
      marginScale: 1,
    },
    muscleStiffness: 40,
    muscleDamping: 8,
    capabilityScore,
    applyEnabled: true,
    // Evidence soak proves PD/balance math; honesty ready still requires substrate flag.
    rapierSubstrateReady: input?.rapierSubstrateReady !== false,
  })

  if (!tick.applied || tick.segmentTorques.length === 0) {
    return {
      ok: false,
      code: 'no_torque',
      message: 'Euphoria evidence soak produced no muscle torques — refuse empty evidence',
    }
  }

  const torqueMagnitudeSum = tick.segmentTorques.reduce((sum, s) => sum + mag(s.torque), 0)
  if (!(torqueMagnitudeSum > 0)) {
    return {
      ok: false,
      code: 'empty_evidence',
      message: 'Euphoria evidence torque magnitude sum is zero',
    }
  }

  const balanceForceMagnitude = tick.balanceForce ? mag(tick.balanceForce) : 0
  const fp = fingerprint([
    'law-iii',
    String(tick.segmentTorques.length),
    torqueMagnitudeSum.toFixed(6),
    balanceForceMagnitude.toFixed(6),
    tick.muscleBudgetScale.toFixed(4),
    String(capabilityScore),
    ...tick.segmentTorques.map((s) => `${s.id}:${s.torque.x.toFixed(4)}`),
  ])

  const evidence: EuphoriaRagdollEvidence = {
    version: 1,
    segmentCount: tick.segmentTorques.length,
    torqueMagnitudeSum,
    balanceForceMagnitude,
    muscleBudgetScale: tick.muscleBudgetScale,
    capabilityScore,
    applied: true,
    fingerprint: fp,
    euphoriaAaaReady: false,
    naturalMotionParityReady: false,
    marketingAllowed: false,
    canClaimEuphoriaParity: false,
  }

  log.info('euphoria_ragdoll_evidence_sealed', {
    fingerprint: fp,
    segments: evidence.segmentCount,
    torqueSum: torqueMagnitudeSum,
    balance: balanceForceMagnitude,
    aaa: false,
  })

  return { ok: true, value: evidence }
}

export function claimEuphoriaAaa(): EuphoriaEvidenceResult<never> {
  return {
    ok: false,
    code: 'aaa_claim_held',
    message:
      'EUPHORIA_AAA_READY=false — Law III PD/balance soak ≠ NaturalMotion Euphoria AAA',
  }
}

export function claimNaturalMotionParity(): EuphoriaEvidenceResult<never> {
  return {
    ok: false,
    code: 'parity_claim_held',
    message: 'NATURALMOTION_PARITY_READY=false — no Euphoria parity marketing from evidence soak',
  }
}

export function probeEuphoriaRagdollEvidenceReadiness(): {
  id: 'euphoria-ragdoll-evidence'
  status: 'PARTIAL' | 'NOT_IMPLEMENTED'
  ready: boolean
  euphoriaAaaReady: false
  marketingAllowed: false
  path: string
  note: string
} {
  const soak = runEuphoriaRagdollEvidenceSoak({ capabilityScore: 55 })
  const gt730 = runEuphoriaRagdollEvidenceSoak({ capabilityScore: 15 })
  const disabled = runEuphoriaRagdollEvidenceSoak({ applyEnabled: false })
  const aaa = claimEuphoriaAaa()
  const parity = claimNaturalMotionParity()
  const honesty = evaluateActiveRagdollHonesty({
    rapierSubstrateReady: true,
    applyPathEnabled: true,
    capabilityScore: 55,
  })

  const ready =
    soak.ok &&
    soak.value.fingerprint.length >= 8 &&
    soak.value.torqueMagnitudeSum > 0 &&
    soak.value.canClaimEuphoriaParity === false &&
    gt730.ok &&
    gt730.value.muscleBudgetScale < soak.value.muscleBudgetScale &&
    !disabled.ok &&
    !aaa.ok &&
    !parity.ok &&
    honesty.canClaimEuphoriaParity === false &&
    EUPHORIA_AAA_READY === false &&
    EUPHORIA_PARITY_MARKETING_ALLOWED === false &&
    NATURALMOTION_PARITY_READY === false

  return {
    id: 'euphoria-ragdoll-evidence',
    status: ready ? 'PARTIAL' : 'NOT_IMPLEMENTED',
    ready,
    euphoriaAaaReady: false,
    marketingAllowed: false,
    path: 'lib/physics/euphoria-ragdoll-evidence.ts',
    note: ready
      ? 'Law III muscle/balance evidence PARTIAL; Euphoria AAA / NaturalMotion parity marketing HELD.'
      : 'Euphoria ragdoll evidence probe failed.',
  }
}
