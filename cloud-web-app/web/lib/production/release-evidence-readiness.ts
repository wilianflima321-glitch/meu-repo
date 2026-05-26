import {
  buildProductionReadinessSummary,
  enforceProductionReleaseGuard,
  type AgenticProductionState,
} from '@/lib/production/agentic-production-state'
import {
  buildEvidenceRefCoverageReport,
  type EvidenceRefCoverageReport,
} from '@/lib/production/evidence-ref-coverage'
import type { RuntimeJobReceiptKind, RuntimeJobReceiptState } from '@/lib/production/runtime-job-receipts'

export const RELEASE_EVIDENCE_READINESS_CAPABILITY = 'AETHEL_RELEASE_EVIDENCE_READINESS'

export type ReleaseEvidenceReadinessStatus = 'blocked' | 'needs-review' | 'evidence-backed'
export type ReleaseEvidenceLaneStatus = 'covered' | 'missing' | 'needs-review' | 'blocked'

export type ReleaseEvidenceReadinessLaneId =
  | 'production-state'
  | 'evidence-coverage'
  | 'runtime-receipts'
  | 'asset-final'
  | 'playtest'
  | 'human-approval'

export interface ReleaseEvidenceReadinessLane {
  id: ReleaseEvidenceReadinessLaneId
  label: string
  required: boolean
  status: ReleaseEvidenceLaneStatus
  evidenceRefs: string[]
  missingEvidence: string[]
  blockers: string[]
  nextAction: string
}

export interface ReleaseEvidenceReadinessSnapshot {
  version: 1
  capability: typeof RELEASE_EVIDENCE_READINESS_CAPABILITY
  capabilityStatus: ReleaseEvidenceReadinessStatus
  status: ReleaseEvidenceReadinessStatus
  releaseReady: false
  humanApprovalRequired: true
  canRequestHumanReview: boolean
  scorePercent: number
  coveredRequiredLanes: number
  totalRequiredLanes: number
  lanes: ReleaseEvidenceReadinessLane[]
  evidenceRefs: string[]
  missingEvidence: string[]
  blockers: string[]
  nextAction: string
  updatedAt: string
}

export interface ReleaseEvidenceReadinessInput {
  state: AgenticProductionState
  evidenceCoverage?: EvidenceRefCoverageReport | null
  runtimeReceiptState?: RuntimeJobReceiptState | null
  now?: string
}

const RELEASE_APPROVAL_PATTERNS = [
  /human[-_ ]?approval/i,
  /release[-_ ]?approval/i,
  /approval[-_: ]?record/i,
  /approved[-_: ]?release/i,
]

const ASSET_FINAL_EVIDENCE_GROUPS = [
  {
    label: 'provenance/license receipt',
    patterns: [/provenance/i, /license/i, /rights[-_ ]?clearance/i],
  },
  {
    label: 'LOD/PBR material evidence',
    patterns: [/LOD[0-3]/i, /\blod\b/i, /PBR/i, /material[-_ ]?audit/i],
  },
  {
    label: 'collision/navmesh/rig proxy evidence',
    patterns: [/collision/i, /navmesh/i, /rig/i, /skeleton/i, /retopo/i],
  },
  {
    label: 'viewport performance trace',
    patterns: [/performance[-_ ]?trace/i, /frame[-_ ]?time/i, /perf[-_ ]?budget/i, /render[-_ ]?trace/i],
  },
  {
    label: 'human art-direction approval',
    patterns: [/human[-_ ]?(review|approval)/i, /art[-_ ]?direction[-_ ]?approval/i, /asset[-_ ]?approval/i],
  },
]

const PLAYTEST_EVIDENCE_GROUPS = [
  {
    label: 'bot/human playtest run',
    patterns: [/playtest/i, /bot[-_ ]?run/i, /human[-_ ]?feel[-_ ]?review/i],
  },
  {
    label: 'input replay evidence',
    patterns: [/input[-_ ]?replay/i, /replay:/i, /session[-_ ]?capture/i],
  },
  {
    label: 'performance trace',
    patterns: [/performance[-_ ]?trace/i, /frame[-_ ]?time/i, /latency[-_ ]?trace/i],
  },
  {
    label: 'bug/blocker ledger',
    patterns: [/bug[-_ ]?ledger/i, /blocker[-_ ]?ledger/i, /softlock/i, /crash[-_ ]?report/i],
  },
]

const BASE_RUNTIME_RECEIPT_KINDS: RuntimeJobReceiptKind[] = [
  'dispatch',
  'capability-probe',
  'artifact',
  'validation',
]

function isCreativeDomain(state: AgenticProductionState): boolean {
  return state.brain.domain === 'game' || state.brain.domain === 'film' || state.brain.domain === 'game-film'
}

function isPlayableDomain(state: AgenticProductionState): boolean {
  return state.brain.domain === 'game' || state.brain.domain === 'game-film'
}

function runtimeReceiptsRequired(state: AgenticProductionState): boolean {
  return state.runtimePolicy.preferredTarget !== 'held' || state.runtimePolicy.maxConcurrentHeavyJobs > 0
}

function collectStateEvidenceRefs(state: AgenticProductionState): string[] {
  return unique([
    ...state.ledger.flatMap((entry) => entry.evidenceRefs),
    ...Object.values(state.graphs).flatMap((nodes) => nodes.flatMap((node) => node.evidenceRefs)),
  ], 400)
}

function collectSnapshotEvidenceRefs(input: ReleaseEvidenceReadinessInput, coverage: EvidenceRefCoverageReport): string[] {
  return unique([
    ...collectStateEvidenceRefs(input.state),
    ...coverage.evidenceRefs,
    ...(input.runtimeReceiptState?.receipts.flatMap((receipt) => [
      `runtime-job:${receipt.jobId}`,
      `runtime-job-receipt:${receipt.id}`,
      ...receipt.refs,
    ]) ?? []),
  ], 400)
}

function hasEvidenceGroup(evidenceRefs: string[], patterns: RegExp[]): boolean {
  return evidenceRefs.some((ref) => patterns.some((pattern) => pattern.test(ref)))
}

function hasReleaseApprovalEvidence(evidenceRefs: string[]): boolean {
  return hasEvidenceGroup(evidenceRefs, RELEASE_APPROVAL_PATTERNS)
}

function requiredRuntimeReceiptKinds(state: AgenticProductionState): RuntimeJobReceiptKind[] {
  const kinds: RuntimeJobReceiptKind[] = [...BASE_RUNTIME_RECEIPT_KINDS]
  if (state.runtimePolicy.preferredTarget === 'cloud-sandbox' || state.runtimePolicy.preferredTarget === 'local-native') {
    kinds.push('cost-meter', 'teardown')
  }
  return unique(kinds) as RuntimeJobReceiptKind[]
}

function laneStatusFromMissing(required: boolean, missingEvidence: string[], blockers: string[]): ReleaseEvidenceLaneStatus {
  if (!required) return missingEvidence.length === 0 && blockers.length === 0 ? 'covered' : 'needs-review'
  if (blockers.length > 0) return 'blocked'
  if (missingEvidence.length > 0) return 'missing'
  return 'covered'
}

function buildProductionStateLane(state: AgenticProductionState): ReleaseEvidenceReadinessLane {
  const guardedState = enforceProductionReleaseGuard(state)
  const readiness = buildProductionReadinessSummary(guardedState)
  const blockers = Object.values(guardedState.graphs)
    .flat()
    .flatMap((node) => (node.status === 'blocked' ? node.blockers : []))
  const missingEvidence = [
    ...(readiness.graphCoverage < 100 ? [`Production graph coverage is ${readiness.graphCoverage}%; all graphs must be reviewed before release evidence.`] : []),
    ...(readiness.evidenceCount === 0 ? ['Production graph evidence refs are missing.'] : []),
  ]

  return {
    id: 'production-state',
    label: 'Production state and graph coverage',
    required: true,
    status: laneStatusFromMissing(true, missingEvidence, blockers),
    evidenceRefs: collectStateEvidenceRefs(guardedState),
    missingEvidence,
    blockers,
    nextAction:
      blockers.length > 0
        ? 'Resolve blocked production graph nodes before release review.'
        : missingEvidence.length > 0
          ? readiness.nextAction
          : 'Production graphs have evidence; keep release behind human review.',
  }
}

function buildEvidenceCoverageLane(coverage: EvidenceRefCoverageReport): ReleaseEvidenceReadinessLane {
  const nonApprovalDomains = coverage.domains.filter((domain) => domain.required && domain.id !== 'release-approval')
  const missingDomains = nonApprovalDomains.filter((domain) => domain.status !== 'covered')
  const blockers = missingDomains
    .filter((domain) => domain.status === 'blocked')
    .flatMap((domain) => domain.missingEvidence)
  const missingEvidence = missingDomains.flatMap((domain) => domain.missingEvidence)
  const covered = missingDomains.length === 0

  return {
    id: 'evidence-coverage',
    label: 'Evidence coverage across required domains',
    required: true,
    status: covered ? 'covered' : blockers.length > 0 ? 'blocked' : 'missing',
    evidenceRefs: coverage.evidenceRefs,
    missingEvidence,
    blockers,
    nextAction: covered ? 'Evidence domains are covered; request human release review.' : missingDomains[0]?.nextAction ?? coverage.nextAction,
  }
}

function buildRuntimeReceiptsLane(
  state: AgenticProductionState,
  receiptState: RuntimeJobReceiptState | null | undefined,
): ReleaseEvidenceReadinessLane {
  const required = runtimeReceiptsRequired(state)
  if (!required) {
    return {
      id: 'runtime-receipts',
      label: 'Runtime job receipts',
      required: false,
      status: 'covered',
      evidenceRefs: [],
      missingEvidence: [],
      blockers: [],
      nextAction: 'Runtime is held; no heavy runtime receipt is required until a job is approved.',
    }
  }

  const presentKinds = unique(receiptState?.receipts.map((receipt) => receipt.kind) ?? []) as RuntimeJobReceiptKind[]
  const requiredKinds = requiredRuntimeReceiptKinds(state)
  const missingKinds = requiredKinds.filter((kind) => !presentKinds.includes(kind))
  const failedReceipts = receiptState?.receipts.filter((receipt) => receipt.status === 'failed') ?? []
  const missingEvidence = [
    ...(receiptState ? [] : ['Runtime job receipt state is missing.']),
    ...missingKinds.map((kind) => `Missing runtime receipt: ${kind}`),
  ]
  const blockers = failedReceipts.map((receipt) => `Runtime receipt failed: ${receipt.kind} (${receipt.id})`)

  return {
    id: 'runtime-receipts',
    label: 'Runtime job receipts and teardown',
    required,
    status: laneStatusFromMissing(required, missingEvidence, blockers),
    evidenceRefs: receiptState?.receipts.flatMap((receipt) => [`runtime-job:${receipt.jobId}`, `runtime-job-receipt:${receipt.id}`, ...receipt.refs]) ?? [],
    missingEvidence,
    blockers,
    nextAction:
      missingEvidence.length > 0 || blockers.length > 0
        ? 'Attach dispatch, capability, cost, artifact, validation, teardown, and rollback receipts before review.'
        : 'Runtime receipts are attached; human approval remains required before public/final claims.',
  }
}

function buildGroupedEvidenceLane(input: {
  id: 'asset-final' | 'playtest'
  label: string
  required: boolean
  evidenceRefs: string[]
  groups: typeof ASSET_FINAL_EVIDENCE_GROUPS
  missingPrefix: string
  coveredAction: string
  missingAction: string
}): ReleaseEvidenceReadinessLane {
  const missingEvidence = input.required
    ? input.groups
        .filter((group) => !hasEvidenceGroup(input.evidenceRefs, group.patterns))
        .map((group) => `${input.missingPrefix}: ${group.label}`)
    : []

  return {
    id: input.id,
    label: input.label,
    required: input.required,
    status: laneStatusFromMissing(input.required, missingEvidence, []),
    evidenceRefs: input.evidenceRefs,
    missingEvidence,
    blockers: [],
    nextAction: missingEvidence.length > 0 ? input.missingAction : input.coveredAction,
  }
}

function buildHumanApprovalLane(evidenceRefs: string[]): ReleaseEvidenceReadinessLane {
  const approved = hasReleaseApprovalEvidence(evidenceRefs)
  return {
    id: 'human-approval',
    label: 'Human release approval',
    required: true,
    status: approved ? 'covered' : 'missing',
    evidenceRefs: evidenceRefs.filter((ref) => RELEASE_APPROVAL_PATTERNS.some((pattern) => pattern.test(ref))),
    missingEvidence: approved ? [] : ['Human release approval evidence is required before release/public claims.'],
    blockers: [],
    nextAction: approved
      ? 'Approval evidence is attached; release still requires an explicit manual publish action.'
      : 'Request human owner review and attach approval evidence.',
  }
}

function statusForSnapshot(requiredLanes: ReleaseEvidenceReadinessLane[]): ReleaseEvidenceReadinessStatus {
  const humanLane = requiredLanes.find((lane) => lane.id === 'human-approval')
  const nonHumanLanes = requiredLanes.filter((lane) => lane.id !== 'human-approval')
  if (requiredLanes.some((lane) => lane.status === 'blocked')) return 'blocked'
  if (nonHumanLanes.some((lane) => lane.status !== 'covered')) return 'blocked'
  if (humanLane?.status !== 'covered') return 'needs-review'
  return 'evidence-backed'
}

function nextActionForSnapshot(status: ReleaseEvidenceReadinessStatus, lanes: ReleaseEvidenceReadinessLane[]): string {
  const humanLane = lanes.find((lane) => lane.id === 'human-approval')
  const firstUncovered = lanes.find((lane) => lane.required && lane.id !== 'human-approval' && lane.status !== 'covered')
  if (firstUncovered) return firstUncovered.nextAction
  if (status === 'needs-review') return humanLane?.nextAction ?? 'Request human owner review.'
  if (status === 'evidence-backed') return 'Evidence package is complete; keep final release as a manual owner action.'
  return 'Resolve blocked evidence lanes before release review.'
}

export function buildReleaseEvidenceReadinessSnapshot(
  input: ReleaseEvidenceReadinessInput,
): ReleaseEvidenceReadinessSnapshot {
  const coverage = input.evidenceCoverage ?? buildEvidenceRefCoverageReport({ state: input.state })
  const evidenceRefs = collectSnapshotEvidenceRefs(input, coverage)
  const lanes: ReleaseEvidenceReadinessLane[] = [
    buildProductionStateLane(input.state),
    buildEvidenceCoverageLane(coverage),
    buildRuntimeReceiptsLane(input.state, input.runtimeReceiptState),
    buildGroupedEvidenceLane({
      id: 'asset-final',
      label: 'Final asset quality evidence',
      required: isCreativeDomain(input.state),
      evidenceRefs,
      groups: ASSET_FINAL_EVIDENCE_GROUPS,
      missingPrefix: 'Missing final asset evidence',
      coveredAction: 'Asset evidence is attached; request human art-direction/release review.',
      missingAction: 'Attach provenance, license, LOD/PBR, collision/navmesh, performance trace, and human review evidence.',
    }),
    buildGroupedEvidenceLane({
      id: 'playtest',
      label: 'Playable build playtest evidence',
      required: isPlayableDomain(input.state),
      evidenceRefs,
      groups: PLAYTEST_EVIDENCE_GROUPS,
      missingPrefix: 'Missing playtest evidence',
      coveredAction: 'Playtest evidence is attached; request human release review.',
      missingAction: 'Run a governed bot/human playtest and attach replay, perf, bugs, and feel review.',
    }),
    buildHumanApprovalLane(evidenceRefs),
  ]
  const requiredLanes = lanes.filter((lane) => lane.required)
  const coveredRequiredLanes = requiredLanes.filter((lane) => lane.status === 'covered').length
  const totalRequiredLanes = requiredLanes.length
  const scorePercent = totalRequiredLanes === 0 ? 100 : Math.round((coveredRequiredLanes / totalRequiredLanes) * 100)
  const status = statusForSnapshot(requiredLanes)
  const nonHumanLanesCovered = requiredLanes
    .filter((lane) => lane.id !== 'human-approval')
    .every((lane) => lane.status === 'covered')

  return {
    version: 1,
    capability: RELEASE_EVIDENCE_READINESS_CAPABILITY,
    capabilityStatus: status,
    status,
    releaseReady: false,
    humanApprovalRequired: true,
    canRequestHumanReview: nonHumanLanesCovered,
    scorePercent,
    coveredRequiredLanes,
    totalRequiredLanes,
    lanes,
    evidenceRefs,
    missingEvidence: unique(requiredLanes.flatMap((lane) => lane.missingEvidence), 120),
    blockers: unique(requiredLanes.flatMap((lane) => lane.blockers), 120),
    nextAction: nextActionForSnapshot(status, lanes),
    updatedAt: input.now ?? new Date().toISOString(),
  }
}

function unique(values: string[], limit = 120): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean))).slice(0, limit)
}