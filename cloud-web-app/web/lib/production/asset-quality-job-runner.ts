import type {
  QualityOrchestrationDomain,
  RuntimeCapabilitySnapshot,
} from '@/lib/production/ai-quality-orchestrator'
import { buildQualityOrchestrationPlan } from '@/lib/production/ai-quality-orchestrator'
import type { GameAssetQualityTier } from '@/lib/production/game-asset-quality-pipeline'
import { buildQualityUpgradeJob, type QualityUpgradeJob } from '@/lib/production/governed-runtime-jobs'

export interface AssetQualityJobRequest {
  assetId: string
  assetName: string
  goal: string
  domain: QualityOrchestrationDomain
  currentTier: GameAssetQualityTier
  targetTier: GameAssetQualityTier
  budgetUsd: number
  runtimeCapabilities: Partial<RuntimeCapabilitySnapshot>
  evidenceRefs: string[]
  requestedByAgent: string
  assetMetadata?: {
    fileName?: string
    licenseStatus?: 'needs-review' | 'approved' | 'blocked'
    triangleBudgetEstimate?: number
  }
}

export interface AssetQualityJobRun {
  version: 1
  runner: 'asset-quality-job-runner'
  executionAllowed: false
  queueState: 'captured-planning-only'
  queueNote: 'Asset quality job captured only. Heavy execution requires a separate approved Studio Local or Cloud queue action.'
  request: AssetQualityJobRequest
  job: QualityUpgradeJob
  nextAction: string
}

const QUALITY_TIERS: GameAssetQualityTier[] = [
  'ai-draft',
  'curated-marketplace',
  'studio-local-optimized',
  'cloud-render-grade',
]

const DOMAINS: QualityOrchestrationDomain[] = ['asset', 'character', 'scene', 'world', 'gameplay', 'cinematic']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function pickString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function pickStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)))
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, value) : fallback
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function coerceRuntimeCapabilities(value: unknown): Partial<RuntimeCapabilitySnapshot> {
  if (!isRecord(value)) return {}
  return Object.entries(value).reduce<Partial<RuntimeCapabilitySnapshot>>((caps, [key, enabled]) => {
    if (typeof enabled === 'boolean') {
      caps[key as keyof RuntimeCapabilitySnapshot] = enabled
    }
    return caps
  }, {})
}

function coerceAssetMetadata(value: unknown, targetTier: GameAssetQualityTier): AssetQualityJobRequest['assetMetadata'] {
  if (!isRecord(value)) return undefined
  return {
    fileName: typeof value.fileName === 'string' ? value.fileName : undefined,
    licenseStatus: pickEnum(value.licenseStatus, ['needs-review', 'approved', 'blocked'] as const, 'needs-review'),
    triangleBudgetEstimate: typeof value.triangleBudgetEstimate === 'number' && Number.isFinite(value.triangleBudgetEstimate)
      ? Math.max(0, value.triangleBudgetEstimate)
      : undefined,
  }
}

export function coerceAssetQualityJobRequest(input: unknown): AssetQualityJobRequest | null {
  if (!isRecord(input)) return null
  const assetId = pickString(input.assetId)
  const assetName = pickString(input.assetName)
  const goal = pickString(input.goal)
  if (!assetId || !assetName || !goal) return null

  const targetTier = pickEnum(input.targetTier, QUALITY_TIERS, 'curated-marketplace')
  const currentTier = pickEnum(input.currentTier, QUALITY_TIERS, 'ai-draft')

  return {
    assetId,
    assetName,
    goal,
    domain: pickEnum(input.domain, DOMAINS, 'asset'),
    currentTier,
    targetTier,
    budgetUsd: pickNumber(input.budgetUsd, 0),
    runtimeCapabilities: coerceRuntimeCapabilities(input.runtimeCapabilities),
    evidenceRefs: pickStringArray(input.evidenceRefs),
    requestedByAgent: pickString(input.requestedByAgent, 'Asset Pipeline Agent'),
    assetMetadata: coerceAssetMetadata(input.assetMetadata, targetTier),
  }
}

export function buildAssetQualityJobRun(input: {
  request: AssetQualityJobRequest
  projectId?: string
  now?: string
}): AssetQualityJobRun {
  const plan = buildQualityOrchestrationPlan({
    goal: input.request.goal,
    domain: input.request.domain,
    targetQuality: input.request.targetTier,
    budgetUsd: input.request.budgetUsd,
    runtimeCapabilities: input.request.runtimeCapabilities,
    evidenceRefs: input.request.evidenceRefs,
    assetMetadata: {
      ...input.request.assetMetadata,
      qualityTier: input.request.currentTier,
    },
  })
  const job = buildQualityUpgradeJob({
    projectId: input.projectId,
    assetId: input.request.assetId,
    assetName: input.request.assetName,
    currentTier: input.request.currentTier,
    plan,
    requestedByAgent: input.request.requestedByAgent,
    evidenceRefs: input.request.evidenceRefs,
    now: input.now,
  })

  return {
    version: 1,
    runner: 'asset-quality-job-runner',
    executionAllowed: false,
    queueState: 'captured-planning-only',
    queueNote: 'Asset quality job captured only. Heavy execution requires a separate approved Studio Local or Cloud queue action.',
    request: input.request,
    job: {
      ...job,
      executionAllowed: false,
      humanReviewRequired: true,
    },
    nextAction: job.nextAction,
  }
}
