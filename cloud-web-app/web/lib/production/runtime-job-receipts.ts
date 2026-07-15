import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphNode,
  ProductionRuntimeTarget,
} from '@/lib/production/agentic-production-state'
import { mergeAgenticProductionState } from '@/lib/production/agentic-production-state'
import type { GovernedRuntimeJob, RuntimeJobRequest } from '@/lib/production/governed-runtime-jobs'
import type { ViewportRenderOutputEvidence } from '@/lib/production/render-output-evidence'

export const RUNTIME_JOB_RECEIPTS_SETTINGS_KEY = 'aethelRuntimeJobReceipts'

export type RuntimeJobReceiptKind =
  | 'dispatch'
  | 'capability-probe'
  | 'cost-meter'
  | 'artifact'
  | 'validation'
  | 'teardown'
  | 'rollback'

export type RuntimeJobReceiptStatus = 'captured' | 'needs-review' | 'failed'

export interface RuntimeJobReceiptInput {
  id?: string
  jobId: string
  kind: RuntimeJobReceiptKind
  runtimeTarget: ProductionRuntimeTarget
  capturedBy: string
  capturedAt?: string
  status?: RuntimeJobReceiptStatus
  refs?: string[]
  provider?: string
  costUsd?: number
  durationSeconds?: number
  note?: string
}

export interface RuntimeJobReceipt {
  id: string
  jobId: string
  kind: RuntimeJobReceiptKind
  runtimeTarget: ProductionRuntimeTarget
  capturedBy: string
  capturedAt: string
  status: RuntimeJobReceiptStatus
  refs: string[]
  provider: string | null
  costUsd: number
  durationSeconds: number
  note: string | null
}

export interface RuntimeJobReceiptSummary {
  totalReceipts: number
  jobCount: number
  receiptsWithCost: number
  receiptsWithTeardown: number
  failedReceipts: number
  totalCostUsd: number
  lastUpdatedAt: string | null
}

export interface RuntimeJobReceiptState {
  version: 1
  projectId: string
  updatedAt: string
  receipts: RuntimeJobReceipt[]
  summary: RuntimeJobReceiptSummary
  releasePolicy: 'human-review-required'
}

export interface RuntimeJobReceiptCoverage {
  jobId: string
  runtimeTarget: ProductionRuntimeTarget
  requiredKinds: RuntimeJobReceiptKind[]
  presentKinds: RuntimeJobReceiptKind[]
  missingKinds: RuntimeJobReceiptKind[]
  blockers: string[]
  releaseReady: false
  nextAction: string
}

const RECEIPT_KINDS: RuntimeJobReceiptKind[] = [
  'dispatch',
  'capability-probe',
  'cost-meter',
  'artifact',
  'validation',
  'teardown',
  'rollback',
]
const RECEIPT_STATUSES: RuntimeJobReceiptStatus[] = ['captured', 'needs-review', 'failed']
const RUNTIME_TARGETS: ProductionRuntimeTarget[] = [
  'local-native',
  'local-worker',
  'local-main-safe',
  'cloud-sandbox',
  'held',
]

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function compact(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function pickNumber(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function pickStringArray(value: unknown): string[] {
  return Array.isArray(value) ? unique(value.filter((item): item is string => typeof item === 'string')) : []
}

function isoNow(now?: string): string {
  return now ?? new Date().toISOString()
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 96) || 'receipt'
}

function unique(values: string[], limit = 120): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}

function normalizeReceipt(input: RuntimeJobReceiptInput, now: string): RuntimeJobReceipt {
  const jobId = compact(input.jobId) ?? 'unknown-runtime-job'
  const kind = pickEnum(input.kind, RECEIPT_KINDS, 'artifact')
  const capturedBy = compact(input.capturedBy) ?? 'Runtime Orchestrator Agent'
  const capturedAt = compact(input.capturedAt) ?? now
  const id = compact(input.id) ?? `runtime-job-receipt-${slugify(`${jobId}-${kind}-${capturedAt}`)}`

  return {
    id,
    jobId,
    kind,
    runtimeTarget: pickEnum(input.runtimeTarget, RUNTIME_TARGETS, 'held'),
    capturedBy,
    capturedAt,
    status: pickEnum(input.status, RECEIPT_STATUSES, 'captured'),
    refs: unique(input.refs ?? [], 80),
    provider: compact(input.provider),
    costUsd: pickNumber(input.costUsd),
    durationSeconds: pickNumber(input.durationSeconds),
    note: compact(input.note),
  }
}

export function buildRuntimeJobReceiptState(input: {
  projectId: string
  previous?: RuntimeJobReceiptState | null
  receipts?: RuntimeJobReceiptInput[]
  now?: string
}): RuntimeJobReceiptState {
  const now = isoNow(input.now)
  const previous = input.previous?.projectId === input.projectId ? input.previous.receipts : []
  const incoming = (input.receipts ?? []).map((receipt) => normalizeReceipt(receipt, now))
  const byId = new Map<string, RuntimeJobReceipt>()

  for (const receipt of [...previous, ...incoming]) byId.set(receipt.id, receipt)

  const receipts = Array.from(byId.values())
    .sort((left, right) => Date.parse(right.capturedAt) - Date.parse(left.capturedAt))
    .slice(0, 250)

  return {
    version: 1,
    projectId: input.projectId,
    updatedAt: now,
    receipts,
    summary: summarizeRuntimeJobReceipts(receipts),
    releasePolicy: 'human-review-required',
  }
}

export function summarizeRuntimeJobReceipts(receipts: RuntimeJobReceipt[]): RuntimeJobReceiptSummary {
  return {
    totalReceipts: receipts.length,
    jobCount: new Set(receipts.map((receipt) => receipt.jobId)).size,
    receiptsWithCost: receipts.filter((receipt) => receipt.kind === 'cost-meter' || receipt.costUsd > 0).length,
    receiptsWithTeardown: receipts.filter((receipt) => receipt.kind === 'teardown').length,
    failedReceipts: receipts.filter((receipt) => receipt.status === 'failed').length,
    totalCostUsd: Number(receipts.reduce((total, receipt) => total + receipt.costUsd, 0).toFixed(6)),
    lastUpdatedAt: receipts[0]?.capturedAt ?? null,
  }
}

export function evaluateRuntimeJobReceiptCoverage(input: {
  job: Pick<GovernedRuntimeJob, 'id' | 'runtimeTarget' | 'estimatedCostUsd' | 'requiredEvidence'>
  receiptState?: RuntimeJobReceiptState | null
}): RuntimeJobReceiptCoverage {
  const receipts = input.receiptState?.receipts.filter((receipt) => receipt.jobId === input.job.id) ?? []
  const presentKinds = unique(receipts.map((receipt) => receipt.kind)) as RuntimeJobReceiptKind[]
  const requiredKinds = requiredReceiptKindsForJob(input.job)
  const missingKinds = requiredKinds.filter((kind) => !presentKinds.includes(kind))
  const failed = receipts.filter((receipt) => receipt.status === 'failed')
  const blockers = [
    ...missingKinds.map((kind) => `Missing runtime job receipt: ${kind}`),
    ...failed.map((receipt) => `Runtime job receipt failed: ${receipt.kind}`),
  ]

  return {
    jobId: input.job.id,
    runtimeTarget: input.job.runtimeTarget,
    requiredKinds,
    presentKinds,
    missingKinds,
    blockers,
    releaseReady: false,
    nextAction:
      blockers.length > 0
        ? 'Capture missing dispatch, capability, cost, artifact, validation, teardown, or rollback receipts before review.'
        : 'Receipts are attached; request human release review before final/public claims.',
  }
}

export function buildRuntimeJobReceiptInputsFromGovernedJob(
  job: RuntimeJobRequest,
  input: { capturedAt?: string; capturedBy?: string } = {},
): RuntimeJobReceiptInput[] {
  const capturedAt = input.capturedAt ?? job.updatedAt
  const capturedBy = input.capturedBy ?? job.requestedByAgent
  const receipts: RuntimeJobReceiptInput[] = [
    {
      id: `${job.id}:dispatch`,
      jobId: job.id,
      kind: 'dispatch',
      runtimeTarget: job.runtimeTarget,
      capturedBy,
      capturedAt,
      refs: unique([`runtime-job:${job.id}`, ...job.evidenceRefs], 80),
      provider: job.provider,
      note: job.reason,
    },
    {
      id: `${job.id}:capability-probe`,
      jobId: job.id,
      kind: 'capability-probe',
      runtimeTarget: job.runtimeTarget,
      capturedBy,
      capturedAt,
      refs: unique(job.requiredCapabilities.map((capability) => `capability:${capability}`), 80),
      provider: job.provider,
      note: `Runtime capability status: ${job.runtimeCapabilityStatus}`,
    },
  ]

  if (job.estimatedCostUsd > 0) {
    receipts.push({
      id: `${job.id}:cost-meter`,
      jobId: job.id,
      kind: 'cost-meter',
      runtimeTarget: job.runtimeTarget,
      capturedBy: 'Cost Governor Agent',
      capturedAt,
      costUsd: job.estimatedCostUsd,
      durationSeconds: Math.round(job.estimatedMinutes * 60),
      refs: [`cost:${job.estimatedCostUsd.toFixed(6)}`],
      provider: job.provider,
    })
  }

  if (job.rollbackPlan.trim().length > 0) {
    receipts.push({
      id: `${job.id}:rollback`,
      jobId: job.id,
      kind: 'rollback',
      runtimeTarget: job.runtimeTarget,
      capturedBy: 'Release Manager Agent',
      capturedAt,
      refs: ['rollback-plan:attached'],
      note: job.rollbackPlan,
    })
  }

  return receipts
}

export function buildRuntimeJobReceiptInputsFromRenderEvidence(
  evidence: ViewportRenderOutputEvidence,
  input: { capturedBy?: string } = {},
): RuntimeJobReceiptInput[] {
  const jobId = evidence.jobId ?? evidence.contractId
  const playbackPassed =
    evidence.validation.playbackOk &&
    evidence.validation.performanceOk &&
    evidence.validation.licenseOk &&
    evidence.validation.continuityOk
  const artifactRefs = evidence.artifacts.map((artifact) => `${artifact.kind}:${artifact.url}`)
  const receipts: RuntimeJobReceiptInput[] = [
    {
      id: `${jobId}:artifact:${evidence.capturedAt}`,
      jobId,
      kind: 'artifact',
      runtimeTarget: evidence.runtimeTarget,
      capturedBy: input.capturedBy ?? 'Render Queue Agent',
      capturedAt: evidence.capturedAt,
      status: evidence.artifacts.length > 0 ? 'captured' : 'failed',
      refs: artifactRefs,
      durationSeconds: Math.round(evidence.artifacts.reduce((total, artifact) => total + (artifact.durationSeconds ?? 0), 0)),
      note: `Render output evidence captured for ${evidence.quality} quality.`,
    },
    {
      id: `${jobId}:validation:${evidence.capturedAt}`,
      jobId,
      kind: 'validation',
      runtimeTarget: evidence.runtimeTarget,
      capturedBy: 'Performance QA Agent',
      capturedAt: evidence.capturedAt,
      status: playbackPassed ? 'captured' : 'failed',
      refs: [
        `playback:${evidence.validation.playbackOk}`,
        `performance:${evidence.validation.performanceOk}`,
        `license:${evidence.validation.licenseOk}`,
        `continuity:${evidence.validation.continuityOk}`,
      ],
      note: evidence.notes.join(' ') || 'Render output validation attached.',
    },
  ]

  if (evidence.notes.some((note) => /teardown/i.test(note))) {
    receipts.push({
      id: `${jobId}:teardown:${evidence.capturedAt}`,
      jobId,
      kind: 'teardown',
      runtimeTarget: evidence.runtimeTarget,
      capturedBy: 'Runtime Orchestrator Agent',
      capturedAt: evidence.capturedAt,
      refs: unique(evidence.notes.filter((note) => /teardown/i.test(note)), 20),
      note: 'Teardown evidence was included in render notes.',
    })
  }

  return receipts
}

function requiredReceiptKindsForJob(
  job: Pick<GovernedRuntimeJob, 'runtimeTarget' | 'estimatedCostUsd' | 'requiredEvidence'>
): RuntimeJobReceiptKind[] {
  const kinds: RuntimeJobReceiptKind[] = ['dispatch', 'capability-probe', 'artifact', 'validation']
  if (job.estimatedCostUsd > 0 || job.runtimeTarget === 'cloud-sandbox') kinds.push('cost-meter')
  if (job.runtimeTarget === 'cloud-sandbox' || job.runtimeTarget === 'local-native') kinds.push('teardown')
  if (job.requiredEvidence.some((item) => /rollback/i.test(item))) kinds.push('rollback')
  return unique(kinds) as RuntimeJobReceiptKind[]
}

export function mergeRuntimeJobReceiptsIntoProductionState(
  state: AgenticProductionState,
  receiptState: RuntimeJobReceiptState,
  job?: RuntimeJobRequest | null,
): AgenticProductionState {
  const latest = receiptState.receipts[0]
  const refs = collectReceiptEvidenceRefs(receiptState)
  const coverage = job ? evaluateRuntimeJobReceiptCoverage({ job, receiptState }) : null
  const blockers = unique([
    ...(coverage?.blockers ?? []),
    ...(receiptState.summary.totalReceipts === 0 ? ['No runtime job receipt exists for this project yet.'] : []),
    ...(receiptState.summary.failedReceipts > 0 ? ['Runtime job receipts include failed entries.'] : []),
    'Human release approval is required after runtime receipts are reviewed.',
  ])

  const ledgerEntry: MissionLedgerEntry = {
    id: 'runtime-job-receipts',
    phase: 'Runtime job receipts',
    ownerAgent: 'Runtime Orchestrator Agent',
    state: blockers.length > 1 ? 'blocked' : 'needs-approval',
    summary: `${receiptState.summary.totalReceipts} runtime receipts captured across ${receiptState.summary.jobCount} job(s).`,
    acceptance: [
      'Dispatch receipt captured before execution claims',
      'Capability probe and cost receipts attached when applicable',
      'Artifacts, validation, and teardown receipts attached before release review',
      'Human approval remains required before final/public claims',
    ],
    evidenceRefs: refs,
    rollbackPlan: 'Pause runtime outputs, revoke queue approvals, preserve receipts, and restore the last approved checkpoint.',
    nextAction: coverage?.nextAction ?? 'Attach runtime job receipts to the active governed job and request human review.',
    estimatedCostUsd: receiptState.summary.totalCostUsd,
    updatedAt: receiptState.updatedAt,
  }

  return mergeAgenticProductionState(
    state,
    {
      brain: {
        technicalBible: {
          ...state.brain.technicalBible,
          constraints: unique([
            ...state.brain.technicalBible.constraints,
            'Runtime execution claims require dispatch, capability, cost, artifact, validation, teardown, and rollback receipts.',
          ], 80),
        },
        risks: unique([
          ...state.brain.risks,
          ...blockers.map((blocker) => `RUNTIME_JOB_RECEIPT_BLOCKER: ${blocker}`),
        ], 80),
      },
      ledger: [ledgerEntry, ...state.ledger.filter((entry) => entry.id !== ledgerEntry.id)].slice(0, 50),
      graphs: {
        evidenceGraph: upsertGraphNode(state.graphs.evidenceGraph, buildReceiptGraphNode(receiptState, refs, blockers, 'evidence')),
        validationGraph: upsertGraphNode(state.graphs.validationGraph, buildReceiptGraphNode(receiptState, refs, blockers, 'validation')),
        releaseGraph: upsertGraphNode(state.graphs.releaseGraph, buildReceiptGraphNode(receiptState, refs, blockers, 'release')),
      },
      runtimePolicy: {
        requiresHumanApproval: true,
      },
    },
    receiptState.updatedAt,
  )
}

function collectReceiptEvidenceRefs(receiptState: RuntimeJobReceiptState): string[] {
  return unique([
    `runtime-job-receipts:${receiptState.summary.totalReceipts}`,
    ...receiptState.receipts.flatMap((receipt) => [
      `runtime-job:${receipt.jobId}`,
      `runtime-job-receipt:${receipt.id}`,
      ...receipt.refs,
    ]),
  ], 140)
}

function buildReceiptGraphNode(
  receiptState: RuntimeJobReceiptState,
  evidenceRefs: string[],
  blockers: string[],
  lane: 'evidence' | 'validation' | 'release',
): ProductionGraphNode {
  return {
    id: `runtime-job-receipts-${lane}`,
    label:
      lane === 'evidence'
        ? 'Runtime receipt evidence'
        : lane === 'validation'
          ? 'Runtime receipt validation'
          : 'Runtime receipt release hold',
    status: blockers.length > 1 ? 'blocked' : 'needs-review',
    ownerAgent: lane === 'release' ? 'Release Manager Agent' : 'Runtime Orchestrator Agent',
    evidenceRefs,
    blockers: lane === 'release' ? unique([...blockers, 'Do not release runtime output without human approval.']) : blockers,
    updatedAt: receiptState.updatedAt,
  }
}

function upsertGraphNode(nodes: ProductionGraphNode[], node: ProductionGraphNode): ProductionGraphNode[] {
  return [node, ...nodes.filter((candidate) => candidate.id !== node.id)].slice(0, 40)
}

export function readRuntimeJobReceiptStateFromSettings(settings: unknown): RuntimeJobReceiptState | null {
  if (!isRecord(settings)) return null
  const candidate = settings[RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]
  if (!isRecord(candidate)) return null
  if (candidate.version !== 1 || typeof candidate.projectId !== 'string' || !Array.isArray(candidate.receipts)) return null
  return candidate as unknown as RuntimeJobReceiptState
}

export function writeRuntimeJobReceiptStateToSettings(
  settings: unknown,
  receiptState: RuntimeJobReceiptState
): Record<string, unknown> {
  return {
    ...(isRecord(settings) ? settings : {}),
    [RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]: receiptState,
  }
}
