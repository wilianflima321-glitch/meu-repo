import { buildRuntimeJobReceiptState } from '@/lib/production/runtime-job-receipts'
import { buildRenderFarmJobSpec, validateRenderFarmJobSpec, type RenderFarmJobSpecInput } from '@/lib/render-farm/queue/job-spec'
import { buildRenderFarmReceiptInputs, evaluateRenderFarmReceiptCoverage } from '@/lib/render-farm/queue/receipts'

export type RenderFarmDispatchDecision = {
  version: 1
  jobId: string
  canDispatch: boolean
  state: 'queued' | 'held' | 'blocked' | 'needs-review' | 'provider_unavailable' | 'human_review_required'
  providerId: string
  receiptCount: number
  blockers: string[]
  nextAction: string
}

export function buildRenderFarmDispatchDecision(input: RenderFarmJobSpecInput): RenderFarmDispatchDecision {
  const spec = buildRenderFarmJobSpec(input)
  const validationFailures = validateRenderFarmJobSpec(spec)
  const receiptState = buildRuntimeJobReceiptState({
    projectId: spec.projectId,
    now: spec.createdAt,
    receipts: buildRenderFarmReceiptInputs(spec, { capturedAt: spec.createdAt }),
  })
  const coverage = evaluateRenderFarmReceiptCoverage(spec, receiptState)
  const blockers = Array.from(new Set([...validationFailures, ...coverage.blockers]))
  const canDispatch = spec.state === 'available' && validationFailures.length === 0

  return {
    version: 1,
    jobId: spec.id,
    canDispatch,
    state: canDispatch ? 'queued' : spec.state === 'available' ? 'held' : spec.state,
    providerId: spec.providerId,
    receiptCount: receiptState.summary.totalReceipts,
    blockers,
    nextAction: canDispatch
      ? 'Queue cloud render, then require artifact, validation, teardown, rollback, and human release review receipts.'
      : spec.nextAction,
  }
}
