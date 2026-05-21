import type { ProductionRuntimeTarget } from '@/lib/production/agentic-production-state'
import {
  buildGameAssetQualityPipeline,
  type GameAssetQualityTier,
} from '@/lib/production/game-asset-quality-pipeline'

export type QualityUpgradeLane = GameAssetQualityTier
export type QualityOrchestrationStatus = 'available' | 'held' | 'blocked' | 'needs-review'
export type QualityOrchestrationDomain = 'asset' | 'character' | 'scene' | 'world' | 'gameplay' | 'cinematic'
export type RuntimeCapabilityKey =
  | 'meshoptimizer'
  | 'gltfpack'
  | 'ktx2-basis'
  | 'rapier'
  | 'ffmpeg'
  | 'blender-assimp'
  | 'license-provenance-scanner'
  | 'pixel-stream-url'
  | 'studio-local'

export type RuntimeCapabilitySnapshot = Record<RuntimeCapabilityKey, boolean>

export interface QualityOrchestrationInput {
  goal: string
  domain: QualityOrchestrationDomain
  targetQuality: GameAssetQualityTier
  budgetUsd: number
  runtimeCapabilities: Partial<RuntimeCapabilitySnapshot>
  evidenceRefs: string[]
  assetMetadata?: {
    fileName?: string
    licenseStatus?: 'needs-review' | 'approved' | 'blocked'
    qualityTier?: GameAssetQualityTier
    triangleBudgetEstimate?: number
  }
}

export interface QualityOrchestrationPlan {
  recommendedLane: QualityUpgradeLane
  status: QualityOrchestrationStatus
  blocked: boolean
  blockers: string[]
  requiredCapabilities: RuntimeCapabilityKey[]
  requiredEvidence: string[]
  missingEvidence: string[]
  estimatedCostUsd: number
  estimatedMinutes: number
  runtimeTarget: ProductionRuntimeTarget
  nextAction: string
  humanReviewRequired: true
  copy: {
    draftWarning: 'Draft assets are not final'
    studioLocal: 'Studio Local required'
    cloudCost: 'Cloud Stream cost applies'
    humanReview: 'Human review required'
  }
}

const CAPABILITY_DEFAULTS: RuntimeCapabilitySnapshot = {
  meshoptimizer: false,
  gltfpack: false,
  'ktx2-basis': false,
  rapier: false,
  ffmpeg: false,
  'blender-assimp': false,
  'license-provenance-scanner': false,
  'pixel-stream-url': false,
  'studio-local': false,
}

const LANE_CAPABILITIES: Record<GameAssetQualityTier, RuntimeCapabilityKey[]> = {
  'ai-draft': [],
  'curated-marketplace': ['license-provenance-scanner'],
  'studio-local-optimized': [
    'studio-local',
    'meshoptimizer',
    'gltfpack',
    'ktx2-basis',
    'rapier',
    'ffmpeg',
    'blender-assimp',
    'license-provenance-scanner',
  ],
  'cloud-render-grade': ['pixel-stream-url', 'ffmpeg', 'license-provenance-scanner'],
}

const LANE_RUNTIME_TARGET: Record<GameAssetQualityTier, ProductionRuntimeTarget> = {
  'ai-draft': 'local-main-safe',
  'curated-marketplace': 'local-main-safe',
  'studio-local-optimized': 'local-native',
  'cloud-render-grade': 'cloud-sandbox',
}

const LANE_COST_MINUTES: Record<GameAssetQualityTier, { cost: number; minutes: number }> = {
  'ai-draft': { cost: 0.35, minutes: 4 },
  'curated-marketplace': { cost: 3, minutes: 12 },
  'studio-local-optimized': { cost: 6, minutes: 25 },
  'cloud-render-grade': { cost: 12, minutes: 45 },
}

export function buildRuntimeCapabilitySnapshot(input: Partial<RuntimeCapabilitySnapshot> = {}): RuntimeCapabilitySnapshot {
  return { ...CAPABILITY_DEFAULTS, ...input }
}

function laneEvidence(targetQuality: GameAssetQualityTier): string[] {
  const pipeline = buildGameAssetQualityPipeline()
  const lane = pipeline.lanes.find((candidate) => candidate.tier === targetQuality)
  if (!lane) return []
  return Array.from(
    new Set(
      pipeline.stages
        .filter((stage) => lane.requiredStages.includes(stage.id))
        .flatMap((stage) => stage.evidence),
    ),
  )
}

function laneNextAction(input: {
  status: QualityOrchestrationStatus
  targetQuality: GameAssetQualityTier
  missingCapabilities: RuntimeCapabilityKey[]
  missingEvidence: string[]
  budgetShortfall: boolean
}) {
  if (input.budgetShortfall) return 'Increase budget or choose a lower quality lane before planning this upgrade.'
  if (input.missingCapabilities.length > 0) {
    return input.targetQuality === 'cloud-render-grade'
      ? 'Configure Cloud Stream and cost controls before final render-grade review.'
      : 'Open Studio Local and install required sidecars before heavy asset upgrade work.'
  }
  if (input.missingEvidence.length > 0) return 'Attach missing evidence before agents can upgrade this asset quality lane.'
  if (input.status === 'needs-review') return 'Request human art-direction approval before public, client-facing, or premium claims.'
  return 'Plan is available for a governed upgrade preview; execution remains a separate approved action.'
}

export function buildQualityOrchestrationPlan(input: QualityOrchestrationInput): QualityOrchestrationPlan {
  const capabilities = buildRuntimeCapabilitySnapshot(input.runtimeCapabilities)
  const requiredCapabilities = LANE_CAPABILITIES[input.targetQuality]
  const missingCapabilities = requiredCapabilities.filter((capability) => !capabilities[capability])
  const requiredEvidence = laneEvidence(input.targetQuality)
  const evidence = new Set(input.evidenceRefs)
  const missingEvidence = requiredEvidence.filter((item) => !evidence.has(item))
  const estimate = LANE_COST_MINUTES[input.targetQuality]
  const budgetShortfall = Number.isFinite(input.budgetUsd) && input.budgetUsd < estimate.cost
  const rawDraftFinalClaim = input.assetMetadata?.qualityTier === 'ai-draft' && input.targetQuality !== 'ai-draft'

  const blockers = [
    ...(input.assetMetadata?.licenseStatus === 'blocked' ? ['Asset license is blocked.'] : []),
    ...(budgetShortfall ? [`Budget ${input.budgetUsd.toFixed(2)} USD is below estimated ${estimate.cost.toFixed(2)} USD.`] : []),
    ...missingCapabilities.map((capability) => `Missing runtime capability: ${capability}`),
    ...(rawDraftFinalClaim ? ['Draft assets are not final; upgrade requires evidence and review.'] : []),
  ]

  const status: QualityOrchestrationStatus =
    blockers.length > 0
      ? 'blocked'
      : missingEvidence.length > 0
        ? 'held'
        : input.targetQuality === 'ai-draft'
          ? 'available'
          : 'needs-review'

  return {
    recommendedLane: input.targetQuality,
    status,
    blocked: status === 'blocked',
    blockers,
    requiredCapabilities,
    requiredEvidence,
    missingEvidence,
    estimatedCostUsd: estimate.cost,
    estimatedMinutes: estimate.minutes,
    runtimeTarget: LANE_RUNTIME_TARGET[input.targetQuality],
    nextAction: laneNextAction({
      status,
      targetQuality: input.targetQuality,
      missingCapabilities,
      missingEvidence,
      budgetShortfall,
    }),
    humanReviewRequired: true,
    copy: {
      draftWarning: 'Draft assets are not final',
      studioLocal: 'Studio Local required',
      cloudCost: 'Cloud Stream cost applies',
      humanReview: 'Human review required',
    },
  }
}

export function nextQualityUpgradeLane(current: GameAssetQualityTier): GameAssetQualityTier {
  if (current === 'ai-draft') return 'curated-marketplace'
  if (current === 'curated-marketplace') return 'studio-local-optimized'
  return 'cloud-render-grade'
}