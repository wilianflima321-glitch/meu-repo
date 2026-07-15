import type { RuntimeJobReceiptInput, RuntimeJobReceiptKind, RuntimeJobReceiptState } from '@/lib/production/runtime-job-receipts'
import type { RenderFarmJobSpec } from '@/lib/render-farm/queue/job-spec'

export type RenderFarmCompletionEvidence = {
  artifactRefs?: string[]
  validationRefs?: string[]
  teardownRefs?: string[]
  rollbackRefs?: string[]
  capturedAt?: string
  capturedBy?: string
}

export type RenderFarmReceiptCoverage = {
  jobId: string
  requiredKinds: RuntimeJobReceiptKind[]
  presentKinds: RuntimeJobReceiptKind[]
  missingKinds: RuntimeJobReceiptKind[]
  releaseReady: false
  blockers: string[]
  nextAction: string
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values))
}

function refs(values: string[] | undefined, fallback: string): string[] {
  const cleaned = unique((values ?? []).map((value) => value.trim()).filter(Boolean))
  return cleaned.length > 0 ? cleaned : [fallback]
}

export function buildRenderFarmReceiptInputs(
  spec: RenderFarmJobSpec,
  evidence: RenderFarmCompletionEvidence = {},
): RuntimeJobReceiptInput[] {
  const capturedAt = evidence.capturedAt ?? spec.createdAt
  const capturedBy = evidence.capturedBy ?? 'Render Farm Orchestrator'
  const runtimeTarget = spec.runtimeTarget
  const receipts: RuntimeJobReceiptInput[] = [
    {
      id: `${spec.id}:dispatch`,
      jobId: spec.id,
      kind: 'dispatch',
      runtimeTarget,
      capturedBy,
      capturedAt,
      status: spec.state === 'available' ? 'captured' : 'needs-review',
      refs: [`render-farm-job:${spec.id}`, ...spec.evidenceRefs],
      provider: spec.providerId,
      note: spec.nextAction,
    },
    {
      id: `${spec.id}:capability-probe`,
      jobId: spec.id,
      kind: 'capability-probe',
      runtimeTarget,
      capturedBy,
      capturedAt,
      status: spec.state === 'available' ? 'captured' : 'needs-review',
      refs: [`provider:${spec.providerId}`, `format:${spec.format}`, `quality:${spec.quality}`],
      provider: spec.providerId,
    },
    {
      id: `${spec.id}:cost-meter`,
      jobId: spec.id,
      kind: 'cost-meter',
      runtimeTarget,
      capturedBy: 'Cost Governor Agent',
      capturedAt,
      status: spec.estimatedCostUsd <= spec.costCapUsd && spec.estimatedCostUsd > 0 ? 'captured' : 'failed',
      refs: [`cost:${spec.estimatedCostUsd.toFixed(6)}`, `cap:${spec.costCapUsd.toFixed(6)}`],
      provider: spec.providerId,
      costUsd: spec.estimatedCostUsd,
      durationSeconds: Math.round(spec.estimatedMinutes * 60),
    },
  ]

  receipts.push({
    id: `${spec.id}:artifact`,
    jobId: spec.id,
    kind: 'artifact',
    runtimeTarget,
    capturedBy,
    capturedAt,
    status: evidence.artifactRefs?.length ? 'captured' : 'needs-review',
    refs: refs(evidence.artifactRefs, `artifact-prefix:${spec.artifactPrefix ?? 'missing'}`),
    provider: spec.providerId,
  })
  receipts.push({
    id: `${spec.id}:validation`,
    jobId: spec.id,
    kind: 'validation',
    runtimeTarget,
    capturedBy: 'Render QA Agent',
    capturedAt,
    status: evidence.validationRefs?.length ? 'captured' : 'needs-review',
    refs: refs(evidence.validationRefs, 'validation:pending'),
    provider: spec.providerId,
  })
  receipts.push({
    id: `${spec.id}:teardown`,
    jobId: spec.id,
    kind: 'teardown',
    runtimeTarget,
    capturedBy,
    capturedAt,
    status: evidence.teardownRefs?.length ? 'captured' : 'needs-review',
    refs: refs(evidence.teardownRefs, 'teardown:pending'),
    provider: spec.providerId,
  })
  receipts.push({
    id: `${spec.id}:rollback`,
    jobId: spec.id,
    kind: 'rollback',
    runtimeTarget,
    capturedBy: 'Release Manager Agent',
    capturedAt,
    status: spec.rollbackPlan ? 'captured' : 'needs-review',
    refs: refs(evidence.rollbackRefs, spec.rollbackPlan ? 'rollback-plan:attached' : 'rollback-plan:missing'),
    provider: spec.providerId,
    note: spec.rollbackPlan ?? undefined,
  })

  return receipts
}

export function evaluateRenderFarmReceiptCoverage(
  spec: RenderFarmJobSpec,
  receiptState?: RuntimeJobReceiptState | null,
): RenderFarmReceiptCoverage {
  const receipts = receiptState?.receipts.filter((receipt) => receipt.jobId === spec.id) ?? []
  const presentKinds = unique(receipts.map((receipt) => receipt.kind))
  const missingKinds = spec.requiredReceipts.filter((kind) => !presentKinds.includes(kind))
  const failed = receipts.filter((receipt) => receipt.status === 'failed')
  const needsReview = receipts.filter((receipt) => receipt.status === 'needs-review')
  const blockers = [
    ...spec.blockers,
    ...missingKinds.map((kind) => `Missing render farm receipt: ${kind}`),
    ...failed.map((receipt) => `Render farm receipt failed: ${receipt.kind}`),
    ...needsReview.map((receipt) => `Render farm receipt needs review: ${receipt.kind}`),
    'Human review is required before final/public render claims.',
  ]

  return {
    jobId: spec.id,
    requiredKinds: spec.requiredReceipts,
    presentKinds,
    missingKinds,
    releaseReady: false,
    blockers: unique(blockers),
    nextAction:
      missingKinds.length || failed.length || needsReview.length || spec.blockers.length
        ? 'Capture dispatch, capability, cost, artifact, validation, teardown, rollback, and review evidence.'
        : 'Receipts are complete; keep output held until explicit human release approval.',
  }
}
