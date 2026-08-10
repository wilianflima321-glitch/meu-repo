/**
 * Law XV + Law XVI — CapScore / hardware → creative artifact generation & cook fidelity band.
 *
 * Honest binding: selects draft|standard|high|cloud_max cook budgets.
 * Never claims Unreal/Nanite mesh quality, Meshy/Tripo clay parity, or Instant Meshes remesh.
 * Aethel differentiator = game-ready refine conveyor depth under CostGuard — not clay gen marketing.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  clampScore,
  fidelityLevelFromCapabilityScore,
  tierFromCapabilityScore,
  type RenderTier,
} from '@aethel/engine/render/hardware-profile'
import type { CreativeArtifactDomain } from '@/lib/production/creative-artifact-bridge'

const log = createComponentLogger('creative-quality-tier-binding')

export const CREATIVE_QUALITY_TIER_LETTER = 'cq-capscore' as const

/** Always false — no UE / Nanite / Instant Meshes / Tripo clay ship claim from this binder. */
export const UE_MESH_QUALITY_CLAIM = false as const
export const MESHY_TRIPO_CLAY_PARITY_CLAIM = false as const
export const NANITE_MESH_QUALITY_CLAIM = false as const
export const INSTANT_MESHES_PARITY_CLAIM = false as const

export type CreativeFidelityBand = 'draft' | 'standard' | 'high' | 'cloud_max'

export type CreativeQualityRejectCode =
  | 'missing_capability_score'
  | 'non_finite_capability_score'
  | 'out_of_range_capability_score'
  | 'capability_score_ignored'

export interface CreativeCookBudget {
  /** Target triangle / voxel budget hint for mesh/world domains (honest upper bound, not UE claim). */
  maxTrisHint: number
  /** Texture edge length hint (px). */
  textureEdgePx: number
  /** Provider / cook iteration depth (1–4). */
  cookPasses: 1 | 2 | 3 | 4
  /** Token weight multiplier for CostGuard estimate scaling. */
  tokenWeightMultiplier: number
  /** LOD cascade depth for game-ready refine (not commercial remesh). */
  lodCascadeDepth: 1 | 2 | 3 | 4
}

export type CreativeQualityTierBinding =
  | {
      ok: true
      capabilityScore: number
      renderTier: RenderTier
      fidelityLevel: 'performance' | 'balanced' | 'quality' | 'ultra'
      fidelityBand: CreativeFidelityBand
      cook: CreativeCookBudget
      executionLane: 'local' | 'cloud'
      domain: CreativeArtifactDomain | 'generic'
      ueMeshQualityClaim: false
      meshyTripoClayParityClaim: false
      naniteMeshQualityClaim: false
      instantMeshesParityClaim: false
      gameReadyRefinePath: true
      letter: typeof CREATIVE_QUALITY_TIER_LETTER
      reason: string
    }
  | {
      ok: false
      capabilityScore: number | null
      fidelityBand: null
      cook: null
      rejectCode: CreativeQualityRejectCode
      ueMeshQualityClaim: false
      meshyTripoClayParityClaim: false
      naniteMeshQualityClaim: false
      instantMeshesParityClaim: false
      letter: typeof CREATIVE_QUALITY_TIER_LETTER
      reason: string
    }

const HELD_CLAIMS = {
  ueMeshQualityClaim: false as const,
  meshyTripoClayParityClaim: false as const,
  naniteMeshQualityClaim: false as const,
  instantMeshesParityClaim: false as const,
  letter: CREATIVE_QUALITY_TIER_LETTER,
}

function bandFromScore(score: number, preferCloudCook: boolean): {
  band: CreativeFidelityBand
  lane: 'local' | 'cloud'
} {
  if (preferCloudCook) {
    return { band: 'cloud_max', lane: 'cloud' }
  }
  const s = clampScore(score)
  if (s >= 75) return { band: 'cloud_max', lane: 'local' }
  if (s >= 45) return { band: 'high', lane: 'local' }
  if (s >= 20) return { band: 'standard', lane: 'local' }
  return { band: 'draft', lane: 'local' }
}

function cookBudgetForBand(band: CreativeFidelityBand): CreativeCookBudget {
  switch (band) {
    case 'draft':
      return {
        maxTrisHint: 8_000,
        textureEdgePx: 512,
        cookPasses: 1,
        tokenWeightMultiplier: 0.6,
        lodCascadeDepth: 1,
      }
    case 'standard':
      return {
        maxTrisHint: 40_000,
        textureEdgePx: 1024,
        cookPasses: 2,
        tokenWeightMultiplier: 1,
        lodCascadeDepth: 2,
      }
    case 'high':
      return {
        maxTrisHint: 120_000,
        textureEdgePx: 2048,
        cookPasses: 3,
        tokenWeightMultiplier: 1.4,
        lodCascadeDepth: 3,
      }
    case 'cloud_max':
      return {
        maxTrisHint: 250_000,
        textureEdgePx: 4096,
        cookPasses: 4,
        tokenWeightMultiplier: 2,
        lodCascadeDepth: 4,
      }
  }
}

/**
 * Bind CapScore (or cloud prefer) → creative generation/cook fidelity band.
 * Fail-closed when CapScore missing/ignored (unless preferCloudCook — cloud lane may proceed).
 */
export function bindCreativeQualityTier(input: {
  capabilityScore: number | null | undefined
  preferCloudCook?: boolean
  ignoreCapabilityScore?: boolean
  domain?: CreativeArtifactDomain
}): CreativeQualityTierBinding {
  const domain = input.domain ?? 'generic'

  if (input.ignoreCapabilityScore === true && input.preferCloudCook !== true) {
    return {
      ok: false,
      capabilityScore: null,
      fidelityBand: null,
      cook: null,
      rejectCode: 'capability_score_ignored',
      reason:
        'Law XV fail-closed — CapScore ignored without preferCloudCook; creative fidelity band refused',
      ...HELD_CLAIMS,
    }
  }

  // Cloud cook may proceed without local CapScore (honest: cloud lane, not local enthusiast claim)
  if (input.preferCloudCook === true) {
    const score =
      typeof input.capabilityScore === 'number' && Number.isFinite(input.capabilityScore)
        ? clampScore(input.capabilityScore)
        : 0
    const cook = cookBudgetForBand('cloud_max')
    const binding: CreativeQualityTierBinding = {
      ok: true,
      capabilityScore: score,
      renderTier: tierFromCapabilityScore(score || 20),
      fidelityLevel: fidelityLevelFromCapabilityScore(score || 62),
      fidelityBand: 'cloud_max',
      cook,
      executionLane: 'cloud',
      domain,
      gameReadyRefinePath: true,
      reason:
        'Cloud cook lane selected — CapScore optional; no UE/Nanite/Meshy-Tripo clay parity claim; game-ready refine path only',
      ...HELD_CLAIMS,
    }
    log.info('creative_quality_tier_cloud', { domain, band: 'cloud_max', score })
    return binding
  }

  if (input.capabilityScore === null || input.capabilityScore === undefined) {
    return {
      ok: false,
      capabilityScore: null,
      fidelityBand: null,
      cook: null,
      rejectCode: 'missing_capability_score',
      reason: 'Law XV fail-closed — Capability Score required for local creative fidelity band',
      ...HELD_CLAIMS,
    }
  }

  if (!Number.isFinite(input.capabilityScore)) {
    return {
      ok: false,
      capabilityScore: null,
      fidelityBand: null,
      cook: null,
      rejectCode: 'non_finite_capability_score',
      reason: 'Law XV fail-closed — Capability Score must be a finite number 0–100',
      ...HELD_CLAIMS,
    }
  }

  if (input.capabilityScore < 0 || input.capabilityScore > 100) {
    return {
      ok: false,
      capabilityScore: null,
      fidelityBand: null,
      cook: null,
      rejectCode: 'out_of_range_capability_score',
      reason: 'Law XV fail-closed — Capability Score out of range 0–100',
      ...HELD_CLAIMS,
    }
  }

  const score = clampScore(input.capabilityScore)
  const { band, lane } = bandFromScore(score, false)
  const cook = cookBudgetForBand(band)
  const renderTier = tierFromCapabilityScore(score)
  const fidelityLevel = fidelityLevelFromCapabilityScore(score)

  const binding: CreativeQualityTierBinding = {
    ok: true,
    capabilityScore: score,
    renderTier,
    fidelityLevel,
    fidelityBand: band,
    cook,
    executionLane: lane,
    domain,
    gameReadyRefinePath: true,
    reason: `CapScore ${score} → fidelity band ${band} (renderTier=${renderTier}); UE/Nanite/Meshy-Tripo clay claims HELD; game-ready refine path`,
    ...HELD_CLAIMS,
  }

  log.info('creative_quality_tier_bound', {
    domain,
    score,
    band,
    renderTier,
    lane,
  })

  return binding
}

/**
 * Scale CostGuard estimatedTokenWeight by fidelity band multiplier (honest budget, not provider invent).
 */
export function scaleCreativeTokenWeightForFidelity(
  baseEstimatedTokenWeight: number,
  binding: CreativeQualityTierBinding,
): number {
  if (!binding.ok) return baseEstimatedTokenWeight
  if (!Number.isFinite(baseEstimatedTokenWeight) || baseEstimatedTokenWeight <= 0) {
    return baseEstimatedTokenWeight
  }
  return Math.max(1, Math.ceil(baseEstimatedTokenWeight * binding.cook.tokenWeightMultiplier))
}

export function probeCreativeQualityTierReadiness(): {
  id: 'creative-quality-tier-binding'
  status: 'PARTIAL'
  ready: boolean
  path: string
  ueMeshQualityClaim: false
  meshyTripoClayParityClaim: false
  note: string
} {
  const low = bindCreativeQualityTier({ capabilityScore: 15, domain: 'mesh' })
  const mid = bindCreativeQualityTier({ capabilityScore: 50, domain: 'mesh' })
  const cloud = bindCreativeQualityTier({
    capabilityScore: null,
    preferCloudCook: true,
    domain: 'mesh',
  })
  const refuse = bindCreativeQualityTier({ capabilityScore: null, domain: 'mesh' })
  const ready =
    low.ok &&
    low.fidelityBand === 'draft' &&
    mid.ok &&
    mid.fidelityBand === 'high' &&
    cloud.ok &&
    cloud.fidelityBand === 'cloud_max' &&
    !refuse.ok &&
    UE_MESH_QUALITY_CLAIM === false &&
    MESHY_TRIPO_CLAY_PARITY_CLAIM === false

  return {
    id: 'creative-quality-tier-binding',
    status: 'PARTIAL',
    ready,
    path: 'lib/production/creative-quality-tier-binding.ts',
    ueMeshQualityClaim: false,
    meshyTripoClayParityClaim: false,
    note:
      'CapScore/hardware selects draft|standard|high|cloud_max cook budgets; no UE mesh / Meshy-Tripo clay parity claim',
  }
}
