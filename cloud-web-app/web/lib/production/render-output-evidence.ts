import type {
  AgenticProductionState,
  MissionLedgerEntry,
  ProductionGraphNode,
  ProductionRuntimeTarget,
} from '@/lib/production/agentic-production-state'
import type {
  ViewportRenderJobContract,
  ViewportRenderQuality,
} from '@/lib/viewport/viewport-render-contract'

export type ViewportRenderEvidenceKind =
  | 'manifest'
  | 'thumbnail'
  | 'proxy-preview'
  | 'review-mp4'
  | 'final-video'
  | 'audio-mix'
  | 'license-report'
  | 'performance-report'
  | 'validation-report'

export interface ViewportRenderOutputArtifact {
  kind: ViewportRenderEvidenceKind
  url: string
  sizeBytes?: number
  durationSeconds?: number
  checksum?: string
}

export interface ViewportRenderOutputValidation {
  playbackOk: boolean
  performanceOk: boolean
  licenseOk: boolean
  continuityOk: boolean
}

export interface ViewportRenderOutputEvidence {
  contractId: string
  projectId?: string | null
  jobId?: string | null
  quality: ViewportRenderQuality
  runtimeTarget: ProductionRuntimeTarget
  capturedAt: string
  artifacts: ViewportRenderOutputArtifact[]
  validation: ViewportRenderOutputValidation
  notes: string[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)))
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
}

function normalizeQuality(value: unknown): ViewportRenderQuality {
  return value === 'final' || value === 'review' || value === 'draft' ? value : 'draft'
}

function normalizeRuntimeTarget(value: unknown): ProductionRuntimeTarget {
  if (
    value === 'local-native' ||
    value === 'local-worker' ||
    value === 'local-main-safe' ||
    value === 'cloud-sandbox' ||
    value === 'held'
  ) {
    return value
  }
  return 'cloud-sandbox'
}

function normalizeArtifact(value: unknown): ViewportRenderOutputArtifact | null {
  if (!isRecord(value)) return null
  const kind = value.kind
  const url = stringOrNull(value.url)
  if (
    !url ||
    (
      kind !== 'manifest' &&
      kind !== 'thumbnail' &&
      kind !== 'proxy-preview' &&
      kind !== 'review-mp4' &&
      kind !== 'final-video' &&
      kind !== 'audio-mix' &&
      kind !== 'license-report' &&
      kind !== 'performance-report' &&
      kind !== 'validation-report'
    )
  ) {
    return null
  }
  return {
    kind,
    url,
    sizeBytes: numberOrUndefined(value.sizeBytes),
    durationSeconds: numberOrUndefined(value.durationSeconds),
    checksum: stringOrNull(value.checksum) ?? undefined,
  }
}

function validationPasses(validation: ViewportRenderOutputValidation): boolean {
  return validation.playbackOk && validation.performanceOk && validation.licenseOk && validation.continuityOk
}

function evidenceRef(evidence: ViewportRenderOutputEvidence): string {
  return `render-output:${evidence.contractId}:${evidence.capturedAt}`
}

function artifactRefs(evidence: ViewportRenderOutputEvidence): string[] {
  return evidence.artifacts.map((artifact) => `${artifact.kind}:${artifact.url}`)
}

function mergeNode(
  nodes: ProductionGraphNode[],
  nextNode: ProductionGraphNode
): ProductionGraphNode[] {
  return [
    nextNode,
    ...nodes.filter((node) => node.id !== nextNode.id),
  ]
}

function updateLedger(
  ledger: MissionLedgerEntry[],
  evidence: ViewportRenderOutputEvidence,
  now: string,
): MissionLedgerEntry[] {
  const id = `render-job-${evidence.contractId}`
  const refs = unique([evidenceRef(evidence), ...artifactRefs(evidence)])
  const passed = validationPasses(evidence.validation)
  const nextState = !passed ? 'blocked' : evidence.quality === 'draft' ? 'complete' : 'needs-approval'
  const nextAction = !passed
    ? 'Fix render validation failures before release review'
    : evidence.quality === 'draft'
      ? 'Review draft proxy and decide whether to request review/final quality'
      : 'Human review must approve media evidence before release'

  return ledger.map((entry) => {
    if (entry.id !== id) return entry
    return {
      ...entry,
      state: nextState,
      evidenceRefs: unique([...refs, ...entry.evidenceRefs]),
      nextAction,
      updatedAt: now,
    }
  })
}

export function buildViewportRenderEvidenceFromContract(
  contract: ViewportRenderJobContract,
  input: {
    jobId?: string | null
    artifacts: ViewportRenderOutputArtifact[]
    validation: ViewportRenderOutputValidation
    capturedAt?: string
    notes?: string[]
  }
): ViewportRenderOutputEvidence {
  return {
    contractId: contract.id,
    projectId: contract.projectId,
    jobId: input.jobId ?? null,
    quality: contract.quality,
    runtimeTarget: contract.profile.target,
    capturedAt: input.capturedAt ?? new Date().toISOString(),
    artifacts: input.artifacts,
    validation: input.validation,
    notes: input.notes ?? [],
  }
}

export function coerceViewportRenderOutputEvidence(input: unknown): ViewportRenderOutputEvidence | null {
  const source = isRecord(input) && isRecord(input.evidence) ? input.evidence : input
  if (!isRecord(source)) return null

  const contractId = stringOrNull(source.contractId)
  if (!contractId) return null

  const artifacts = Array.isArray(source.artifacts)
    ? source.artifacts.map(normalizeArtifact).filter((artifact): artifact is ViewportRenderOutputArtifact => Boolean(artifact))
    : []
  if (artifacts.length === 0) return null

  const validationInput = isRecord(source.validation) ? source.validation : {}
  return {
    contractId,
    projectId: stringOrNull(source.projectId),
    jobId: stringOrNull(source.jobId),
    quality: normalizeQuality(source.quality),
    runtimeTarget: normalizeRuntimeTarget(source.runtimeTarget),
    capturedAt: typeof source.capturedAt === 'string' && !Number.isNaN(Date.parse(source.capturedAt))
      ? source.capturedAt
      : new Date().toISOString(),
    artifacts,
    validation: {
      playbackOk: validationInput.playbackOk === true,
      performanceOk: validationInput.performanceOk === true,
      licenseOk: validationInput.licenseOk === true,
      continuityOk: validationInput.continuityOk === true,
    },
    notes: stringArray(source.notes),
  }
}

export function mergeViewportRenderOutputEvidenceIntoProductionState(
  current: AgenticProductionState,
  evidence: ViewportRenderOutputEvidence
): AgenticProductionState {
  const now = evidence.capturedAt
  const passed = validationPasses(evidence.validation)
  const refs = unique([evidenceRef(evidence), ...artifactRefs(evidence)])
  const blockers = [
    ...(!evidence.validation.playbackOk ? ['Playback evidence failed'] : []),
    ...(!evidence.validation.performanceOk ? ['Performance budget failed'] : []),
    ...(!evidence.validation.licenseOk ? ['License check failed'] : []),
    ...(!evidence.validation.continuityOk ? ['Continuity review failed'] : []),
  ]

  const evidenceNode: ProductionGraphNode = {
    id: `render-output-${evidence.contractId}`,
    label: `Render output evidence (${evidence.quality})`,
    status: 'ready',
    ownerAgent: 'Render Queue Agent',
    evidenceRefs: refs,
    blockers: [],
    updatedAt: now,
  }
  const validationNode: ProductionGraphNode = {
    id: `render-validation-${evidence.contractId}`,
    label: `Render validation (${evidence.quality})`,
    status: passed ? 'ready' : 'blocked',
    ownerAgent: 'Performance QA Agent',
    evidenceRefs: refs,
    blockers,
    updatedAt: now,
  }
  const releaseNode: ProductionGraphNode = {
    id: `render-release-${evidence.contractId}`,
    label: `Render release review (${evidence.quality})`,
    status: passed ? 'needs-review' : 'blocked',
    ownerAgent: 'Release Agent',
    evidenceRefs: refs,
    blockers: passed ? ['Human approval required before release'] : blockers,
    updatedAt: now,
  }

  return {
    ...current,
    updatedAt: now,
    ledger: updateLedger(current.ledger, evidence, now),
    graphs: {
      ...current.graphs,
      evidenceGraph: mergeNode(current.graphs.evidenceGraph, evidenceNode),
      validationGraph: mergeNode(current.graphs.validationGraph, validationNode),
      releaseGraph: mergeNode(current.graphs.releaseGraph, releaseNode),
    },
  }
}
