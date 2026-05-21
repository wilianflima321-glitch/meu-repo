import {
  buildGameAssetQualityPipeline,
  type GameAssetDomain,
  type GameAssetQualityTier,
} from '@/lib/production/game-asset-quality-pipeline'

export type AssetAcquisitionLane =
  | 'ai-draft'
  | 'curated-library'
  | 'premium-marketplace'
  | 'first-party-production'
  | 'studio-local-kitbash'
  | 'cloud-render-source'

export type AssetSourcingStatus = 'available' | 'held' | 'blocked' | 'needs-review'

export interface CuratedAssetSourcingPlan {
  id: string
  targetQuality: GameAssetQualityTier
  recommendedLane: AssetAcquisitionLane
  status: AssetSourcingStatus
  curatedFirst: boolean
  blocked: boolean
  blockers: string[]
  searchQueries: string[]
  requiredEvidence: string[]
  missingEvidence: string[]
  rejectionRules: string[]
  estimatedCostUsd: number
  estimatedMinutes: number
  nextAction: string
  humanReviewRequired: true
}

const LANE_COSTS: Record<AssetAcquisitionLane, { cost: number; minutes: number }> = {
  'ai-draft': { cost: 0.35, minutes: 4 },
  'curated-library': { cost: 2, minutes: 10 },
  'premium-marketplace': { cost: 8, minutes: 18 },
  'first-party-production': { cost: 25, minutes: 90 },
  'studio-local-kitbash': { cost: 6, minutes: 35 },
  'cloud-render-source': { cost: 15, minutes: 45 },
}

const TARGET_LANE: Record<GameAssetQualityTier, AssetAcquisitionLane> = {
  'ai-draft': 'ai-draft',
  'curated-marketplace': 'curated-library',
  'studio-local-optimized': 'studio-local-kitbash',
  'cloud-render-grade': 'cloud-render-source',
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function laneEvidence(targetQuality: GameAssetQualityTier): string[] {
  const pipeline = buildGameAssetQualityPipeline()
  const lane = pipeline.lanes.find((candidate) => candidate.tier === targetQuality)
  if (!lane) return []
  return unique(
    pipeline.stages
      .filter((stage) => lane.requiredStages.includes(stage.id))
      .flatMap((stage) => stage.evidence),
  )
}

function queryForDomain(domain: GameAssetDomain | 'scene' | 'world', goal: string): string[] {
  const normalizedGoal = goal.trim() || 'game asset'
  return [
    `${normalizedGoal} ${domain} CC0 PBR LOD`,
    `${normalizedGoal} ${domain} commercial license GLB FBX`,
    `${normalizedGoal} ${domain} modular kitbash source files`,
  ]
}

function nextAction(input: {
  status: AssetSourcingStatus
  lane: AssetAcquisitionLane
  missingEvidence: string[]
  budgetShortfall: boolean
}) {
  if (input.budgetShortfall) return 'Choose AI draft/blockout or increase budget before searching paid curated sources.'
  if (input.status === 'blocked') return 'Resolve license, budget, or source trust blockers before agents can acquire this asset.'
  if (input.missingEvidence.length > 0) return 'Collect provenance, source manifest, and style-lock evidence before upgrade work.'
  if (input.lane === 'ai-draft') return 'Use this only as a blockout; plan curated replacement before demo or final claims.'
  return 'Request human art-direction review before importing this asset into a client-facing build.'
}

export function buildCuratedAssetSourcingPlan(input: {
  goal: string
  domain: GameAssetDomain | 'scene' | 'world'
  targetQuality: GameAssetQualityTier
  budgetUsd: number
  evidenceRefs: string[]
  licenseStatus?: 'needs-review' | 'approved' | 'blocked'
}): CuratedAssetSourcingPlan {
  const recommendedLane = TARGET_LANE[input.targetQuality]
  const estimate = LANE_COSTS[recommendedLane]
  const requiredEvidence = laneEvidence(input.targetQuality)
  const evidence = new Set(input.evidenceRefs)
  const missingEvidence = requiredEvidence.filter((item) => !evidence.has(item))
  const budgetShortfall = Number.isFinite(input.budgetUsd) && input.budgetUsd < estimate.cost
  const blockers = [
    ...(input.licenseStatus === 'blocked' ? ['License is blocked; asset cannot be sourced or upgraded.'] : []),
    ...(budgetShortfall ? [`Budget ${input.budgetUsd.toFixed(2)} USD is below sourcing estimate ${estimate.cost.toFixed(2)} USD.`] : []),
  ]
  const status: AssetSourcingStatus =
    blockers.length > 0
      ? 'blocked'
      : missingEvidence.length > 0
        ? 'held'
        : recommendedLane === 'ai-draft'
          ? 'available'
          : 'needs-review'

  return {
    id: `asset-sourcing:${input.targetQuality}:v1`,
    targetQuality: input.targetQuality,
    recommendedLane,
    status,
    curatedFirst: input.targetQuality !== 'ai-draft',
    blocked: status === 'blocked',
    blockers,
    searchQueries: queryForDomain(input.domain, input.goal),
    requiredEvidence,
    missingEvidence,
    rejectionRules: [
      'Reject assets without license/provenance receipt.',
      'Reject sources without source asset manifest.',
      'Reject raw text-to-3D meshes as final hero assets.',
      'Reject sources without PBR/LOD/collision path for playable builds.',
      'Reject paid marketplace imports without rollback and human approval.',
    ],
    estimatedCostUsd: estimate.cost,
    estimatedMinutes: estimate.minutes,
    nextAction: nextAction({ status, lane: recommendedLane, missingEvidence, budgetShortfall }),
    humanReviewRequired: true,
  }
}
