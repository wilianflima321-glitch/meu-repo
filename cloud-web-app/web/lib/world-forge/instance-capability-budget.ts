/**
 * Letter cc — Law XV Capability Score → PCG / foliage instance budget.
 * Honesty: no “5M instances + Nanite cinema” without evidence.
 */

import {
  evaluateWorldForgeCapability,
  WORLD_FORGE_FOLIAGE_HARD_CAP,
  WORLD_FORGE_WEB_INSTANCE_SOFT_CAP,
  WORLD_FORGE_DESKTOP_INSTANCE_SOFT_CAP,
} from '@/lib/world-forge/types'

export const INSTANCE_CAPABILITY_BUDGET_WIRED = true as const

export interface InstanceBudgetPlan {
  capabilityScore: number
  maxInstances: number
  webSoftCap: typeof WORLD_FORGE_WEB_INSTANCE_SOFT_CAP
  desktopSoftCap: typeof WORLD_FORGE_DESKTOP_INSTANCE_SOFT_CAP
  foliageHardCap: typeof WORLD_FORGE_FOLIAGE_HARD_CAP
  zeroUi: boolean
  streamingCarveHeld: true
  marketing5mNaniteAllowed: false
  notes: string[]
}

export function resolvePcgInstanceBudget(input: {
  capabilityScore: number
  preferWebBudget?: boolean
  requestedCount?: number
}): InstanceBudgetPlan & { allowedCount: number; truncated: boolean } {
  const gate = evaluateWorldForgeCapability({
    capabilityScore: input.capabilityScore,
    preferWebBudget: input.preferWebBudget,
  })
  const requested = Math.max(0, Math.floor(input.requestedCount ?? gate.instanceBudget))
  const allowedCount = Math.min(requested, gate.instanceBudget, WORLD_FORGE_FOLIAGE_HARD_CAP)
  return {
    capabilityScore: gate.capabilityScore,
    maxInstances: gate.instanceBudget,
    webSoftCap: WORLD_FORGE_WEB_INSTANCE_SOFT_CAP,
    desktopSoftCap: WORLD_FORGE_DESKTOP_INSTANCE_SOFT_CAP,
    foliageHardCap: WORLD_FORGE_FOLIAGE_HARD_CAP,
    zeroUi: gate.zeroUiFallback,
    streamingCarveHeld: true,
    marketing5mNaniteAllowed: false,
    allowedCount,
    truncated: allowedCount < requested,
    notes: gate.notes,
  }
}
