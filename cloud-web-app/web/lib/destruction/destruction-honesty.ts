/**
 * Letter cv — Destruction / GPU fracture honesty aggregator.
 * `gpuFractureReady` soak-gated; Chaos parity always HELD.
 * FractureGraph strain evidence is PARTIAL and never flips AAA.
 */

import {
  CHAOS_PARITY_HELD,
  CHAOS_PARITY_MARKETING_ALLOWED,
  CHAOS_PARITY_READY,
  GPU_FRACTURE_LETTER,
  GPU_FRACTURE_WIRED,
  getLastGpuFractureSoak,
  planGpuFracture,
  proveGpuFractureReady,
  type GpuFractureComputeSoakResult,
} from '@/lib/destruction/gpu-fracture'
import {
  CHAOS_DESTRUCTION_AAA_READY,
  CHAOS_DESTRUCTION_MARKETING_ALLOWED,
  UNREAL_CHAOS_PARITY_READY,
  probeChaosDestructionEvidenceReadiness,
  runChaosDestructionEvidenceSoak,
} from '@/lib/destruction/chaos-destruction-evidence'
import { FRACTURE_GEOMETRY_SHIP_STATUS } from '@/lib/destruction-fracture-generator'
import { FRAGMENT_PHYSICS_SHIP_STATUS } from '@/lib/destruction-fragment-physics'

export interface DestructionHonestyReport {
  letter: typeof GPU_FRACTURE_LETTER
  wired: typeof GPU_FRACTURE_WIRED
  gpuFractureReady: boolean
  chaosParityReady: false
  chaosParityHeld: true
  chaosParityMarketingAllowed: false
  chaosDestructionEvidenceReady: boolean
  chaosDestructionAaaReady: false
  unrealChaosParityReady: false
  fortune3d: 'HELD'
  dest001ConvexHull: 'SHIPPED'
  fragmentRapier: 'SHIPPED' | 'HELD'
  coinsReady: false
  agonesReady: false
  naniteReady: false
  dlssReady: false
  notes: string[]
}

export function probeDestructionHonesty(input?: {
  soak?: GpuFractureComputeSoakResult
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  capabilityScore?: number
}): DestructionHonestyReport {
  const soak = input?.soak ?? getLastGpuFractureSoak() ?? undefined
  const plan = planGpuFracture({
    webgpuAvailable: input?.webgpuAvailable === true,
    webgpuComputeAvailable: input?.webgpuComputeAvailable === true,
    capabilityScore: input?.capabilityScore,
    soakPassed: soak?.passed === true,
    soakFramesProven: soak?.frames,
  })
  const gpuFractureReady = plan.gpuFractureReady || proveGpuFractureReady()
  const letter = GPU_FRACTURE_LETTER
  const chaosEvidence = probeChaosDestructionEvidenceReadiness()
  const soakEvidence = runChaosDestructionEvidenceSoak()

  return {
    letter,
    wired: GPU_FRACTURE_WIRED,
    gpuFractureReady,
    chaosParityReady: CHAOS_PARITY_READY,
    chaosParityHeld: CHAOS_PARITY_HELD,
    chaosParityMarketingAllowed: CHAOS_PARITY_MARKETING_ALLOWED,
    chaosDestructionEvidenceReady: chaosEvidence.ready && soakEvidence.ok,
    chaosDestructionAaaReady: CHAOS_DESTRUCTION_AAA_READY,
    unrealChaosParityReady: UNREAL_CHAOS_PARITY_READY,
    fortune3d: FRACTURE_GEOMETRY_SHIP_STATUS.fortune3d,
    dest001ConvexHull: FRACTURE_GEOMETRY_SHIP_STATUS.cellGeometry,
    fragmentRapier: FRAGMENT_PHYSICS_SHIP_STATUS.rapier,
    coinsReady: false,
    agonesReady: false,
    naniteReady: false,
    dlssReady: false,
    notes: [
      ...plan.notes,
      ...(soak?.notes ?? []),
      gpuFractureReady
        ? 'gpuFractureReady CLOSED (letter cv) — WebGPU debris soak; GT730 Zero-UI; Chaos parity HELD'
        : 'gpuFractureReady pending soak — CPU debris Zero-UI active',
      FRACTURE_GEOMETRY_SHIP_STATUS.note,
      chaosEvidence.note,
      CHAOS_DESTRUCTION_MARKETING_ALLOWED
        ? 'Chaos marketing unexpectedly allowed'
        : 'Chaos AAA / Unreal Chaos parity marketing HELD',
    ],
  }
}
