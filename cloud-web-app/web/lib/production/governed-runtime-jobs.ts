import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphKey,
  ProductionGraphNode,
  ProductionRuntimeTarget,
} from '@/lib/production/agentic-production-state'
import { mergeAgenticProductionState } from '@/lib/production/agentic-production-state'
import type {
  QualityOrchestrationPlan,
  QualityOrchestrationStatus,
  RuntimeCapabilityKey,
} from '@/lib/production/ai-quality-orchestrator'
import type { GameAssetQualityTier } from '@/lib/production/game-asset-quality-pipeline'

export type GovernedRuntimeJobKind = 'quality-upgrade' | 'runtime-render' | 'playtest' | 'asset-import'
export type GovernedRuntimeJobState =
  | 'planned'
  | 'queued'
  | 'running'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'complete'
  | 'cancelled'
export type RuntimeSurfaceCapability = 'available' | 'held' | 'blocked' | 'provider_unavailable' | 'needs-review'
export type RuntimeApprovalGate = 'human_review_required' | 'cost_approval_required' | 'runtime_capability_required'

export interface GovernedRuntimeJobBase {
  id: string
  kind: GovernedRuntimeJobKind
  projectId?: string
  createdAt: string
  updatedAt: string
  requestedByAgent: string
  state: GovernedRuntimeJobState
  runtimeTarget: ProductionRuntimeTarget
  runtimeCapabilityStatus: RuntimeSurfaceCapability
  requiredCapabilities: RuntimeCapabilityKey[]
  requiredEvidence: string[]
  evidenceRefs: string[]
  blockers: string[]
  approvalGates: RuntimeApprovalGate[]
  rollbackPlan: string
  nextAction: string
  estimatedCostUsd: number
  estimatedMinutes: number
  executionAllowed: boolean
  humanReviewRequired: true
}

export interface QualityUpgradeJob extends GovernedRuntimeJobBase {
  kind: 'quality-upgrade'
  assetId: string
  assetName: string
  currentTier: GameAssetQualityTier
  targetTier: GameAssetQualityTier
  plan: QualityOrchestrationPlan
}

export interface RuntimeJobRequest extends GovernedRuntimeJobBase {
  kind: Exclude<GovernedRuntimeJobKind, 'quality-upgrade'>
  requestedRuntimeTarget: ProductionRuntimeTarget
  provider?: string
  reason: string
}

export type GovernedRuntimeJob = QualityUpgradeJob | RuntimeJobRequest

const DEFAULT_RUNTIME_TARGET: ProductionRuntimeTarget = 'held'
const VALID_RUNTIME_TARGETS: ProductionRuntimeTarget[] = [
  'local-native',
  'local-worker',
  'local-main-safe',
  'cloud-sandbox',
  'held',
]
const VALID_JOB_KINDS: GovernedRuntimeJobKind[] = ['quality-upgrade', 'runtime-render', 'playtest', 'asset-import']
const VALID_JOB_STATES: GovernedRuntimeJobState[] = [
  'planned',
  'queued',
  'running',
  'held',
  'blocked',
  'needs-review',
  'complete',
  'cancelled',
]
const VALID_SURFACE_CAPABILITIES: RuntimeSurfaceCapability[] = [
  'available',
  'held',
  'blocked',
  'provider_unavailable',
  'needs-review',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)))
}

function pickString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback
}

function pickStringArray(value: unknown, fallback: string[] = []): string[] {
  if (!Array.isArray(value)) return fallback
  return unique(value.filter((item): item is string => typeof item === 'string'))
}

function pickNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function pickBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function isoNow(now?: string): string {
  return now ?? new Date().toISOString()
}

function jobStateFromPlanStatus(status: QualityOrchestrationStatus): GovernedRuntimeJobState {
  if (status === 'blocked') return 'blocked'
  if (status === 'held') return 'held'
  if (status === 'needs-review') return 'needs-review'
  return 'planned'
}

function surfaceCapabilityFromPlanStatus(status: QualityOrchestrationStatus): RuntimeSurfaceCapability {
  if (status === 'available') return 'available'
  if (status === 'needs-review') return 'needs-review'
  return status
}

function graphStatusFromJob(job: GovernedRuntimeJob): ProductionGraphNode['status'] {
  if (job.state === 'blocked' || job.state === 'held' || job.state === 'cancelled') return 'blocked'
  if (job.state === 'complete' || job.state === 'needs-review') return 'needs-review'
  return 'draft'
}

function ledgerStateFromJob(job: GovernedRuntimeJob): MissionLedgerEntry['state'] {
  if (job.state === 'queued' || job.state === 'running') return 'running'
  if (job.state === 'complete' || job.state === 'needs-review') return 'needs-approval'
  if (job.state === 'blocked' || job.state === 'held' || job.state === 'cancelled') return 'blocked'
  return 'planned'
}

function upsertProductionGraphNode(
  state: AgenticProductionState,
  key: ProductionGraphKey,
  node: ProductionGraphNode,
): ProductionGraphNode[] {
  const existing = state.graphs[key]
  const withoutNode = existing.filter((candidate) => candidate.id !== node.id)
  return [node, ...withoutNode].slice(0, 40)
}

export function buildQualityUpgradeJob(input: {
  id?: string
  projectId?: string
  assetId: string
  assetName: string
  currentTier: GameAssetQualityTier
  plan: QualityOrchestrationPlan
  requestedByAgent?: string
  evidenceRefs?: string[]
  now?: string
}): QualityUpgradeJob {
  const now = isoNow(input.now)
  const state = jobStateFromPlanStatus(input.plan.status)
  const evidenceRefs = unique(input.evidenceRefs ?? [])
  const blockers = unique([...input.plan.blockers, ...input.plan.missingEvidence.map((item) => `Missing evidence: ${item}`)])
  const approvalGates: RuntimeApprovalGate[] = unique([
    'human_review_required',
    ...(input.plan.estimatedCostUsd > 0 ? ['cost_approval_required'] : []),
    ...(input.plan.requiredCapabilities.length > 0 ? ['runtime_capability_required'] : []),
  ]) as RuntimeApprovalGate[]

  return {
    id: input.id ?? `quality-upgrade-${input.assetId}-${now}`,
    kind: 'quality-upgrade',
    projectId: input.projectId,
    createdAt: now,
    updatedAt: now,
    requestedByAgent: input.requestedByAgent ?? 'Asset Pipeline Agent',
    state,
    runtimeTarget: input.plan.runtimeTarget,
    runtimeCapabilityStatus: surfaceCapabilityFromPlanStatus(input.plan.status),
    requiredCapabilities: input.plan.requiredCapabilities,
    requiredEvidence: unique([...input.plan.requiredEvidence, 'human art-direction approval']),
    evidenceRefs,
    blockers,
    approvalGates,
    rollbackPlan: `Keep ${input.assetName} on its current ${input.currentTier} lane and restore the last approved asset manifest.`,
    nextAction: input.plan.nextAction,
    estimatedCostUsd: input.plan.estimatedCostUsd,
    estimatedMinutes: input.plan.estimatedMinutes,
    executionAllowed: false,
    humanReviewRequired: true,
    assetId: input.assetId,
    assetName: input.assetName,
    currentTier: input.currentTier,
    targetTier: input.plan.recommendedLane,
    plan: input.plan,
  }
}

export function buildRuntimeJobRequest(input: {
  id?: string
  kind: Exclude<GovernedRuntimeJobKind, 'quality-upgrade'>
  projectId?: string
  requestedRuntimeTarget: ProductionRuntimeTarget
  runtimeCapabilityStatus: RuntimeSurfaceCapability
  requestedByAgent?: string
  reason: string
  provider?: string
  requiredCapabilities?: RuntimeCapabilityKey[]
  requiredEvidence?: string[]
  evidenceRefs?: string[]
  blockers?: string[]
  estimatedCostUsd?: number
  estimatedMinutes?: number
  rollbackPlan?: string
  approvedForQueue?: boolean
  now?: string
}): RuntimeJobRequest {
  const now = isoNow(input.now)
  const blockers = unique([
    ...(input.blockers ?? []),
    ...(input.runtimeCapabilityStatus === 'available' ? [] : [`Runtime capability is ${input.runtimeCapabilityStatus}`]),
  ])
  const state: GovernedRuntimeJobState = blockers.length > 0 ? 'held' : input.approvedForQueue ? 'queued' : 'planned'
  const approvalGates: RuntimeApprovalGate[] = unique([
    'human_review_required',
    ...(input.estimatedCostUsd && input.estimatedCostUsd > 0 ? ['cost_approval_required'] : []),
    ...(input.requiredCapabilities && input.requiredCapabilities.length > 0 ? ['runtime_capability_required'] : []),
  ]) as RuntimeApprovalGate[]

  return {
    id: input.id ?? `${input.kind}-${now}`,
    kind: input.kind,
    projectId: input.projectId,
    createdAt: now,
    updatedAt: now,
    requestedByAgent: input.requestedByAgent ?? 'Runtime Orchestrator Agent',
    state,
    runtimeTarget: input.requestedRuntimeTarget,
    runtimeCapabilityStatus: input.runtimeCapabilityStatus,
    requiredCapabilities: input.requiredCapabilities ?? [],
    requiredEvidence: unique([...(input.requiredEvidence ?? []), 'runtime execution evidence', 'human release approval']),
    evidenceRefs: unique(input.evidenceRefs ?? []),
    blockers,
    approvalGates,
    rollbackPlan: input.rollbackPlan ?? 'Cancel the governed job, keep the last approved production state, and preserve evidence for audit.',
    nextAction:
      blockers.length > 0
        ? 'Resolve runtime capability, provider, cost, or evidence blockers before queueing this job.'
        : input.approvedForQueue
          ? 'Queue accepted; capture output evidence and hold release for human review.'
          : 'Request explicit approval before queueing this governed runtime job.',
    estimatedCostUsd: Math.max(0, input.estimatedCostUsd ?? 0),
    estimatedMinutes: Math.max(0, input.estimatedMinutes ?? 0),
    executionAllowed: input.approvedForQueue === true && blockers.length === 0,
    humanReviewRequired: true,
    requestedRuntimeTarget: input.requestedRuntimeTarget,
    provider: input.provider,
    reason: input.reason,
  }
}

export function coerceGovernedRuntimeJob(input: unknown): GovernedRuntimeJob | null {
  if (!isRecord(input)) return null
  const now = isoNow()
  const kind = pickEnum(input.kind, VALID_JOB_KINDS, 'runtime-render')
  const runtimeKind: Exclude<GovernedRuntimeJobKind, 'quality-upgrade'> =
    kind === 'quality-upgrade' ? 'runtime-render' : kind
  const base: RuntimeJobRequest = {
    id: pickString(input.id, `${kind}-${now}`),
    kind: runtimeKind,
    projectId: typeof input.projectId === 'string' ? input.projectId : undefined,
    createdAt: pickString(input.createdAt, now),
    updatedAt: pickString(input.updatedAt, now),
    requestedByAgent: pickString(input.requestedByAgent, 'Runtime Orchestrator Agent'),
    state: pickEnum(input.state, VALID_JOB_STATES, 'planned'),
    runtimeTarget: pickEnum(input.runtimeTarget, VALID_RUNTIME_TARGETS, DEFAULT_RUNTIME_TARGET),
    runtimeCapabilityStatus: pickEnum(input.runtimeCapabilityStatus, VALID_SURFACE_CAPABILITIES, 'held'),
    requiredCapabilities: pickStringArray(input.requiredCapabilities).filter((item): item is RuntimeCapabilityKey => item.length > 0),
    requiredEvidence: pickStringArray(input.requiredEvidence, ['runtime execution evidence', 'human release approval']),
    evidenceRefs: pickStringArray(input.evidenceRefs),
    blockers: pickStringArray(input.blockers),
    approvalGates: pickStringArray(input.approvalGates, ['human_review_required']).filter(
      (item): item is RuntimeApprovalGate =>
        item === 'human_review_required' || item === 'cost_approval_required' || item === 'runtime_capability_required',
    ),
    rollbackPlan: pickString(
      input.rollbackPlan,
      'Cancel the governed job, keep the last approved production state, and preserve evidence for audit.',
    ),
    nextAction: pickString(input.nextAction, 'Request explicit approval before queueing this governed runtime job.'),
    estimatedCostUsd: Math.max(0, pickNumber(input.estimatedCostUsd, 0)),
    estimatedMinutes: Math.max(0, pickNumber(input.estimatedMinutes, 0)),
    executionAllowed: pickBoolean(input.executionAllowed, false),
    humanReviewRequired: true,
    requestedRuntimeTarget: pickEnum(input.requestedRuntimeTarget, VALID_RUNTIME_TARGETS, DEFAULT_RUNTIME_TARGET),
    provider: typeof input.provider === 'string' ? input.provider : undefined,
    reason: pickString(input.reason, 'Governed runtime job request'),
  }

  if (kind !== 'quality-upgrade') return base

  return {
    ...base,
    kind: 'quality-upgrade',
    assetId: pickString(input.assetId, 'unknown-asset'),
    assetName: pickString(input.assetName, 'Unresolved asset'),
    currentTier: pickEnum(input.currentTier, ['ai-draft', 'curated-marketplace', 'studio-local-optimized', 'cloud-render-grade'], 'ai-draft'),
    targetTier: pickEnum(input.targetTier, ['ai-draft', 'curated-marketplace', 'studio-local-optimized', 'cloud-render-grade'], 'curated-marketplace'),
    plan: isRecord(input.plan) ? (input.plan as unknown as QualityOrchestrationPlan) : ({} as QualityOrchestrationPlan),
  }
}

export function buildMissionLedgerEntryFromGovernedRuntimeJob(
  job: GovernedRuntimeJob,
  now = new Date().toISOString(),
): MissionLedgerEntry {
  return {
    id: `runtime-job-${job.id}`,
    phase: job.kind === 'quality-upgrade' ? 'Asset quality upgrade' : 'Governed runtime job',
    ownerAgent: job.requestedByAgent,
    state: ledgerStateFromJob(job),
    summary:
      job.kind === 'quality-upgrade'
        ? `Plan ${job.assetName} from ${job.currentTier} to ${job.targetTier}; execution stays gated.`
        : `${job.kind} requested for ${job.runtimeTarget}; execution stays governed by capability and approval gates.`,
    acceptance: [
      'Runtime capability verified before execution',
      'Cost and provider risk visible before queueing',
      'Required evidence captured before release',
      'Human review required before final/public claims',
    ],
    evidenceRefs: unique([`runtime-job:${job.id}`, ...job.evidenceRefs]),
    rollbackPlan: job.rollbackPlan,
    nextAction: job.nextAction,
    estimatedCostUsd: job.estimatedCostUsd,
    updatedAt: now,
  }
}

export function mergeGovernedRuntimeJobIntoProductionState(
  current: AgenticProductionState,
  job: GovernedRuntimeJob,
  now = new Date().toISOString(),
): AgenticProductionState {
  const status = graphStatusFromJob(job)
  const evidenceRefs = unique([`runtime-job:${job.id}`, ...job.evidenceRefs])
  const blockers = unique([
    ...job.blockers,
    ...(job.executionAllowed ? [] : ['Execution is not allowed until capability, evidence, cost, and approval gates pass.']),
    ...(job.humanReviewRequired ? ['Human review required before final/public claims.'] : []),
  ])

  const evidenceNode: ProductionGraphNode = {
    id: `runtime-job-evidence-${job.id}`,
    label: `Evidence for ${job.kind}`,
    status: evidenceRefs.length > 1 ? 'needs-review' : 'missing',
    ownerAgent: 'QA Agent',
    evidenceRefs,
    blockers: unique([...blockers, ...job.requiredEvidence.map((item) => `Required evidence: ${item}`)]),
    updatedAt: now,
  }

  const validationNode: ProductionGraphNode = {
    id: `runtime-job-validation-${job.id}`,
    label: `Validation for ${job.kind} on ${job.runtimeTarget}`,
    status,
    ownerAgent: 'Runtime Orchestrator Agent',
    evidenceRefs,
    blockers,
    updatedAt: now,
  }

  const releaseNode: ProductionGraphNode = {
    id: `runtime-job-release-${job.id}`,
    label: `Release hold for ${job.kind}`,
    status: blockers.length > 0 ? 'blocked' : 'needs-review',
    ownerAgent: 'Release Manager Agent',
    evidenceRefs,
    blockers: unique([...blockers, 'Do not auto-publish governed runtime output.']),
    updatedAt: now,
  }

  const graphPatch: Partial<Record<ProductionGraphKey, ProductionGraphNode[]>> = {
    evidenceGraph: upsertProductionGraphNode(current, 'evidenceGraph', evidenceNode),
    validationGraph: upsertProductionGraphNode(current, 'validationGraph', validationNode),
    releaseGraph: upsertProductionGraphNode(current, 'releaseGraph', releaseNode),
  }

  if (job.kind === 'quality-upgrade') {
    graphPatch.assetGraph = upsertProductionGraphNode(current, 'assetGraph', {
      id: `quality-upgrade-${job.assetId}`,
      label: `${job.assetName}: ${job.currentTier} -> ${job.targetTier}`,
      status,
      ownerAgent: job.requestedByAgent,
      evidenceRefs,
      blockers,
      updatedAt: now,
    })
  }

  return mergeAgenticProductionState(
    current,
    {
      brain: {
        risks: unique([
          ...current.brain.risks,
          ...(job.executionAllowed ? [] : [`Governed job held: ${job.kind} (${job.id})`]),
        ]),
      },
      ledger: [buildMissionLedgerEntryFromGovernedRuntimeJob(job, now), ...current.ledger].slice(0, 50),
      graphs: graphPatch,
      runtimePolicy: {
        preferredTarget: job.runtimeTarget === 'held' ? current.runtimePolicy.preferredTarget : job.runtimeTarget,
        requiresHumanApproval: true,
        maxConcurrentHeavyJobs: Math.min(current.runtimePolicy.maxConcurrentHeavyJobs, 1),
      },
    },
    now,
  )
}
