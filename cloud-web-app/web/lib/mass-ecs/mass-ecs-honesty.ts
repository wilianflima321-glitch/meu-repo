/**
 * Letter cw — Mass ECS honesty aggregator.
 * `gpuMassEcsReady` soak-gated; 100k claim + Unreal Mass parity always HELD.
 */

import {
  GPU_MASS_ECS_LETTER,
  GPU_MASS_ECS_WIRED,
  MASS_100K_CLAIM_HELD,
  MASS_100K_CLAIM_READY,
  UNREAL_MASS_PARITY_HELD,
  UNREAL_MASS_PARITY_READY,
  getLastGpuMassEcsSoak,
  planGpuMassEcs,
  proveGpuMassEcsReady,
  type GpuMassEcsComputeSoakResult,
} from '@/lib/mass-ecs/gpu-mass-step'

export interface MassEcsHonestyReport {
  letter: typeof GPU_MASS_ECS_LETTER
  wired: typeof GPU_MASS_ECS_WIRED
  gpuMassEcsReady: boolean
  mass100kClaimReady: false
  mass100kClaimHeld: true
  unrealMassParityReady: false
  unrealMassParityHeld: true
  coinsReady: false
  agonesReady: false
  naniteReady: false
  dlssReady: false
  notes: string[]
}

export function probeMassEcsHonesty(input?: {
  soak?: GpuMassEcsComputeSoakResult
  webgpuAvailable?: boolean
  webgpuComputeAvailable?: boolean
  capabilityScore?: number
}): MassEcsHonestyReport {
  const soak = input?.soak ?? getLastGpuMassEcsSoak() ?? undefined
  const plan = planGpuMassEcs({
    webgpuAvailable: input?.webgpuAvailable === true,
    webgpuComputeAvailable: input?.webgpuComputeAvailable === true,
    capabilityScore: input?.capabilityScore,
    soakPassed: soak?.passed === true,
    soakFramesProven: soak?.frames,
  })
  const gpuMassEcsReady = plan.gpuMassEcsReady || proveGpuMassEcsReady()

  return {
    letter: GPU_MASS_ECS_LETTER,
    wired: GPU_MASS_ECS_WIRED,
    gpuMassEcsReady,
    mass100kClaimReady: MASS_100K_CLAIM_READY,
    mass100kClaimHeld: MASS_100K_CLAIM_HELD,
    unrealMassParityReady: UNREAL_MASS_PARITY_READY,
    unrealMassParityHeld: UNREAL_MASS_PARITY_HELD,
    coinsReady: false,
    agonesReady: false,
    naniteReady: false,
    dlssReady: false,
    notes: [
      ...plan.notes,
      ...(soak?.notes ?? []),
      gpuMassEcsReady
        ? 'gpuMassEcsReady CLOSED (letter cw) — WebGPU Mass SoA soak 1k–10k; 100k claim HELD'
        : 'gpuMassEcsReady pending soak — CPU SoA Zero-UI active',
    ],
  }
}
