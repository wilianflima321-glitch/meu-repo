/**
 * Letter cc — Aethel World Forge deepen shared contracts.
 * Worlds wedge (not “one better chair”). Law XV · Law XVI FusionTx · Zero-MVP.
 *
 * Honest: We have NOT surpassed Unreal/Unity AAA runtime
 * (Nanite / Lumen / World Partition / full editor maturity).
 */

export const WORLD_FORGE_LETTER = 'cc' as const
export const WORLD_FORGE_PIPELINE_ID = 'aethel-world-forge:v1' as const

/** Law XV — GT730 fail-closed luxury scatter; math world still works. */
export const WORLD_FORGE_GT730_FAIL_CLOSED_SCORE = 20
/** Hybrid PCG GPU-ish scatter needs discrete-class score for high instance budgets. */
export const WORLD_FORGE_PCG_MIN_CAPABILITY_SCORE = 35
/** Soft desktop instance claim — never market 5M without evidence. */
export const WORLD_FORGE_DESKTOP_INSTANCE_SOFT_CAP = 2048
/** Web / integrated honest baked scatter cap (S2 web ≥50 baked). */
export const WORLD_FORGE_WEB_INSTANCE_SOFT_CAP = 256
/** Hard align with durable foliage authority soft cap. */
export const WORLD_FORGE_FOLIAGE_HARD_CAP = 4096

export type WorldForgeStageId =
  | 'lora-inject'
  | 'sdf-sculpt'
  | 'seamless-pbr'
  | 'biome-mask'
  | 'pcg-scatter'
  | 'collider-lod'
  | 'navmesh-rebuild'
  | 'detour-nav-rebuild'
  | 'fusion-viewport'

export type WorldForgeStageStatus = 'closed' | 'held' | 'skipped' | 'rejected' | 'zero-ui'

export interface WorldForgeStageReceipt {
  stage: WorldForgeStageId
  status: WorldForgeStageStatus
  evidence: string[]
  heldReason?: string
  metrics?: Record<string, number | string | boolean>
}

export interface WorldForgeCapabilityGate {
  capabilityScore: number
  instanceBudget: number
  pcgScatterAllowed: boolean
  /** True when score < GT730 fail-closed — Zero-UI: math world + BYOK pieces only. */
  zeroUiFallback: boolean
  streamingCarveHeld: true
  notes: string[]
}

export function evaluateWorldForgeCapability(input: {
  capabilityScore: number
  preferWebBudget?: boolean
}): WorldForgeCapabilityGate {
  const score = Math.max(0, Math.min(100, Math.round(input.capabilityScore)))
  const zeroUiFallback = score < WORLD_FORGE_GT730_FAIL_CLOSED_SCORE
  const pcgScatterAllowed = score >= WORLD_FORGE_PCG_MIN_CAPABILITY_SCORE && !zeroUiFallback

  let instanceBudget: number
  if (zeroUiFallback) {
    instanceBudget = Math.min(64, WORLD_FORGE_WEB_INSTANCE_SOFT_CAP)
  } else if (input.preferWebBudget || score < WORLD_FORGE_PCG_MIN_CAPABILITY_SCORE) {
    instanceBudget = WORLD_FORGE_WEB_INSTANCE_SOFT_CAP
  } else if (score >= 70) {
    instanceBudget = WORLD_FORGE_DESKTOP_INSTANCE_SOFT_CAP
  } else {
    instanceBudget = Math.min(1024, WORLD_FORGE_DESKTOP_INSTANCE_SOFT_CAP)
  }
  instanceBudget = Math.min(instanceBudget, WORLD_FORGE_FOLIAGE_HARD_CAP)

  return {
    capabilityScore: score,
    instanceBudget,
    pcgScatterAllowed,
    zeroUiFallback,
    streamingCarveHeld: true,
    notes: [
      zeroUiFallback
        ? 'Law XV GT730 — Zero-UI: SDF/math heightfield + biome still work; native LoRA/ONNX silent'
        : pcgScatterAllowed
          ? `PCG scatter budget ${instanceBudget} (not 5M Nanite cinema)`
          : 'PCG luxury scatter fail-closed — reduce density / bake-only',
      'World Partition streaming carve HELD — no open-world marketing',
      'Never claim Nanite / Lumen / Substance / Recast GPU soak without evidence',
    ],
  }
}
