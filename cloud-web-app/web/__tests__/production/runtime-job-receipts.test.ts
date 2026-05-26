import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { buildRuntimeJobRequest } from '@/lib/production/governed-runtime-jobs'
import {
  buildRuntimeJobReceiptState,
  evaluateRuntimeJobReceiptCoverage,
  mergeRuntimeJobReceiptsIntoProductionState,
  readRuntimeJobReceiptStateFromSettings,
  RUNTIME_JOB_RECEIPTS_SETTINGS_KEY,
  writeRuntimeJobReceiptStateToSettings,
} from '@/lib/production/runtime-job-receipts'

describe('runtime job receipts', () => {
  it('requires dispatch, capability, cost, artifact, validation, and teardown receipts for cloud jobs', () => {
    const job = buildRuntimeJobRequest({
      id: 'cloud-render-1',
      kind: 'runtime-render',
      requestedRuntimeTarget: 'cloud-sandbox',
      runtimeCapabilityStatus: 'available',
      reason: 'Cloud Stream review render',
      estimatedCostUsd: 1.25,
      approvedForQueue: true,
      now: '2026-05-25T15:00:00.000Z',
    })
    const receiptState = buildRuntimeJobReceiptState({
      projectId: 'project-runtime',
      now: '2026-05-25T15:01:00.000Z',
      receipts: [
        {
          jobId: 'cloud-render-1',
          kind: 'dispatch',
          runtimeTarget: 'cloud-sandbox',
          capturedBy: 'Runtime Orchestrator Agent',
          refs: ['signed-dispatch:cloud-render-1'],
        },
      ],
    })
    const coverage = evaluateRuntimeJobReceiptCoverage({ job, receiptState })

    expect(coverage.releaseReady).toBe(false)
    expect(coverage.missingKinds).toEqual(expect.arrayContaining([
      'capability-probe',
      'cost-meter',
      'artifact',
      'validation',
      'teardown',
    ]))
    expect(coverage.blockers).toContain('Missing runtime job receipt: teardown')
  })

  it('merges complete receipt sets into production state while keeping release held for human review', () => {
    const state = buildDefaultAgenticProductionState({
      projectName: 'Runtime receipt project',
      projectType: 'game',
      now: '2026-05-25T15:00:00.000Z',
    })
    const job = buildRuntimeJobRequest({
      id: 'studio-cook-1',
      kind: 'asset-import',
      requestedRuntimeTarget: 'local-native',
      runtimeCapabilityStatus: 'available',
      reason: 'Cook hero asset through Studio Local',
      requiredEvidence: ['rollback receipt'],
      estimatedCostUsd: 0.5,
      approvedForQueue: true,
      now: '2026-05-25T15:02:00.000Z',
    })
    const receiptState = buildRuntimeJobReceiptState({
      projectId: 'project-runtime',
      now: '2026-05-25T15:03:00.000Z',
      receipts: [
        { jobId: job.id, kind: 'dispatch', runtimeTarget: 'local-native', capturedBy: 'Runtime Orchestrator Agent', refs: ['studio-local-dispatch:nonce'] },
        { jobId: job.id, kind: 'capability-probe', runtimeTarget: 'local-native', capturedBy: 'Studio Local Daemon', refs: ['probe:gpu-ok'] },
        { jobId: job.id, kind: 'cost-meter', runtimeTarget: 'local-native', capturedBy: 'Cost Governor Agent', costUsd: 0.5, refs: ['cost:0.5'] },
        { jobId: job.id, kind: 'artifact', runtimeTarget: 'local-native', capturedBy: 'Asset Pipeline Agent', refs: ['artifact:s3://asset.glb'] },
        { jobId: job.id, kind: 'validation', runtimeTarget: 'local-native', capturedBy: 'QA Agent', refs: ['validation:lod-pbr-pass'] },
        { jobId: job.id, kind: 'teardown', runtimeTarget: 'local-native', capturedBy: 'Studio Local Daemon', refs: ['teardown:clean'] },
        { jobId: job.id, kind: 'rollback', runtimeTarget: 'local-native', capturedBy: 'Release Manager Agent', refs: ['rollback:checkpoint'] },
      ],
    })

    const merged = mergeRuntimeJobReceiptsIntoProductionState(state, receiptState, job)

    expect(merged.ledger[0]).toMatchObject({
      id: 'runtime-job-receipts',
      state: 'needs-approval',
      estimatedCostUsd: 0.5,
    })
    expect(merged.graphs.evidenceGraph[0].evidenceRefs).toEqual(expect.arrayContaining([
      'runtime-job:studio-cook-1',
      expect.stringContaining('runtime-job-receipt:'),
    ]))
    expect(merged.graphs.releaseGraph[0].blockers).toContain('Do not release runtime output without human approval.')
    expect(merged.runtimePolicy.requiresHumanApproval).toBe(true)
  })

  it('persists receipt state in project settings', () => {
    const receiptState = buildRuntimeJobReceiptState({
      projectId: 'project-runtime',
      receipts: [{ jobId: 'job-1', kind: 'artifact', runtimeTarget: 'local-worker', capturedBy: 'QA Agent' }],
      now: '2026-05-25T15:04:00.000Z',
    })
    const settings = writeRuntimeJobReceiptStateToSettings({}, receiptState)

    expect(settings[RUNTIME_JOB_RECEIPTS_SETTINGS_KEY]).toBeDefined()
    expect(readRuntimeJobReceiptStateFromSettings(settings)).toMatchObject({
      projectId: 'project-runtime',
      summary: { totalReceipts: 1 },
    })
  })
})
