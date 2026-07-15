import { describe, expect, it } from 'vitest'

import { buildRuntimeJobReceiptState } from '@/lib/production/runtime-job-receipts'
import {
  buildRenderFarmDispatchDecision,
  buildRenderFarmJobSpec,
  buildRenderFarmReceiptInputs,
  evaluateRenderFarmReceiptCoverage,
  validateRenderFarmJobSpec,
  type RenderFarmProviderCapability,
} from '@/lib/render-farm'

const unavailableProvider: RenderFarmProviderCapability = {
  id: 'cloud-render-held',
  label: 'Cloud render held provider',
  state: 'provider_unavailable',
  supportedFormats: ['mp4', 'glb', 'zip'],
  maxCostUsd: 25,
  cancelSupported: true,
  teardownConfigured: true,
  evidenceRefs: ['provider:held'],
}

const availableProvider: RenderFarmProviderCapability = {
  ...unavailableProvider,
  id: 'cloud-render-approved',
  state: 'available',
  evidenceRefs: ['provider:approved', 'teardown:configured', 'cancel:supported'],
}

describe('render farm queue spine', () => {
  it('keeps cloud render provider_unavailable without a real provider receipt', () => {
    const decision = buildRenderFarmDispatchDecision({
      projectId: 'project-render',
      kind: 'cinematic-render',
      format: 'mp4',
      quality: 'review',
      requestedBy: 'Render Orchestrator',
      provider: unavailableProvider,
      estimatedMinutes: 12,
      estimatedCostUsd: 6,
      costCapUsd: 8,
      artifactPrefix: 'aethel-artifact://render-farm/project-render/review-01',
      rollbackPlan: 'Delete render artifacts and restore previous review checkpoint.',
    })

    expect(decision.canDispatch).toBe(false)
    expect(decision.state).toBe('provider_unavailable')
    expect(decision.blockers).toContain('Render provider is provider_unavailable.')
  })

  it('blocks dispatch when cost exceeds cap even if provider exists', () => {
    const spec = buildRenderFarmJobSpec({
      projectId: 'project-render',
      kind: 'cinematic-render',
      format: 'mp4',
      quality: 'review',
      requestedBy: 'Render Orchestrator',
      provider: availableProvider,
      estimatedMinutes: 45,
      estimatedCostUsd: 30,
      costCapUsd: 12,
      artifactPrefix: 'aethel-artifact://render-farm/project-render/review-02',
      rollbackPlan: 'Cancel job and delete cloud artifacts.',
    })

    expect(spec.state).toBe('blocked')
    expect(spec.blockers).toContain('Estimated cost exceeds render cost cap.')
    expect(validateRenderFarmJobSpec(spec)).toEqual([])
  })

  it('captures all receipts while keeping public release held for human review', () => {
    const spec = buildRenderFarmJobSpec({
      projectId: 'project-render',
      jobId: 'render-review-1',
      kind: 'cinematic-render',
      format: 'mp4',
      quality: 'review',
      requestedBy: 'Render Orchestrator',
      provider: availableProvider,
      estimatedMinutes: 10,
      estimatedCostUsd: 4,
      costCapUsd: 6,
      artifactPrefix: 'aethel-artifact://render-farm/project-render/review-03',
      rollbackPlan: 'Delete render artifact and restore previous timeline checkpoint.',
      now: '2026-06-06T12:00:00.000Z',
    })
    const receipts = buildRenderFarmReceiptInputs(spec, {
      artifactRefs: ['artifact:aethel-artifact://render-farm/project-render/review-03/review.mp4'],
      validationRefs: ['validation:playback-ok', 'validation:perf-ok'],
      teardownRefs: ['teardown:gpu-session-ended'],
      rollbackRefs: ['rollback:checkpoint-restorable'],
      capturedAt: '2026-06-06T12:05:00.000Z',
    })
    const receiptState = buildRuntimeJobReceiptState({
      projectId: spec.projectId,
      receipts,
      now: '2026-06-06T12:06:00.000Z',
    })
    const coverage = evaluateRenderFarmReceiptCoverage(spec, receiptState)

    expect(spec.state).toBe('available')
    expect(coverage.missingKinds).toEqual([])
    expect(coverage.releaseReady).toBe(false)
    expect(coverage.blockers).toContain('Human review is required before final/public render claims.')
  })
})
