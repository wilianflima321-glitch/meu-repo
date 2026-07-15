import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { buildQualityOrchestrationPlan } from '@/lib/production/ai-quality-orchestrator'
import {
  buildQualityUpgradeJob,
  buildRuntimeJobRequest,
  coerceGovernedRuntimeJob,
  mergeGovernedRuntimeJobIntoProductionState,
} from '@/lib/production/governed-runtime-jobs'

describe('governed runtime jobs', () => {
  it('turns raw AI asset upgrade plans into held jobs, never executable jobs', () => {
    const plan = buildQualityOrchestrationPlan({
      goal: 'Upgrade a draft desert boss mesh for a vertical slice review.',
      domain: 'character',
      targetQuality: 'curated-marketplace',
      budgetUsd: 10,
      runtimeCapabilities: {},
      evidenceRefs: [],
      assetMetadata: {
        fileName: 'desert-boss.glb',
        licenseStatus: 'needs-review',
        qualityTier: 'ai-draft',
      },
    })

    const job = buildQualityUpgradeJob({
      id: 'quality-job-desert-boss',
      assetId: 'asset-desert-boss',
      assetName: 'Desert Boss',
      currentTier: 'ai-draft',
      plan,
      now: '2026-05-25T12:00:00.000Z',
    })

    expect(job).toMatchObject({
      kind: 'quality-upgrade',
      state: 'blocked',
      executionAllowed: false,
      humanReviewRequired: true,
      currentTier: 'ai-draft',
      targetTier: 'curated-marketplace',
    })
    expect(job.blockers).toEqual(expect.arrayContaining([
      'Draft assets are not final; upgrade requires evidence and review.',
    ]))
    expect(job.requiredEvidence).toContain('human art-direction approval')
    expect(job.approvalGates).toEqual(expect.arrayContaining([
      'human_review_required',
      'cost_approval_required',
      'runtime_capability_required',
    ]))
  })

  it('persists governed jobs into evidence, validation, release, and asset graphs with release hold', () => {
    const base = buildDefaultAgenticProductionState({
      projectName: 'Desert vertical slice',
      projectType: 'unreal',
      now: '2026-05-25T12:00:00.000Z',
    })
    const plan = buildQualityOrchestrationPlan({
      goal: 'Upgrade a hero prop with Studio Local evidence.',
      domain: 'asset',
      targetQuality: 'studio-local-optimized',
      budgetUsd: 20,
      runtimeCapabilities: {
        'studio-local': true,
        meshoptimizer: true,
        gltfpack: true,
        'ktx2-basis': true,
        rapier: true,
        ffmpeg: true,
        'blender-assimp': true,
        'license-provenance-scanner': true,
      },
      evidenceRefs: [
        'art direction board',
        'style tokens',
        'silhouette sheet',
        'license/provenance receipt',
        'creator/source URL',
        'usage rights',
        'source asset manifest',
        'generation seed or marketplace asset ID',
        'download hash',
      ],
      assetMetadata: {
        fileName: 'obelisk.glb',
        licenseStatus: 'approved',
        qualityTier: 'curated-marketplace',
      },
    })
    const job = buildQualityUpgradeJob({
      id: 'quality-job-obelisk',
      assetId: 'asset-obelisk',
      assetName: 'Obelisk',
      currentTier: 'curated-marketplace',
      plan,
      evidenceRefs: ['license/provenance receipt'],
      now: '2026-05-25T12:02:00.000Z',
    })

    const merged = mergeGovernedRuntimeJobIntoProductionState(base, job, '2026-05-25T12:03:00.000Z')

    expect(merged.ledger[0]).toMatchObject({
      id: 'runtime-job-quality-job-obelisk',
      state: 'blocked',
      estimatedCostUsd: job.estimatedCostUsd,
    })
    expect(merged.graphs.assetGraph[0]).toMatchObject({
      id: 'quality-upgrade-asset-obelisk',
      status: 'blocked',
    })
    expect(merged.graphs.evidenceGraph[0].evidenceRefs).toContain('runtime-job:quality-job-obelisk')
    expect(merged.graphs.validationGraph[0].blockers).toContain(
      'Execution is not allowed until capability, evidence, cost, and approval gates pass.',
    )
    expect(merged.graphs.releaseGraph[0]).toMatchObject({
      id: 'runtime-job-release-quality-job-obelisk',
      status: 'blocked',
      ownerAgent: 'Release Manager Agent',
    })
    expect(merged.graphs.releaseGraph[0].blockers).toContain('Do not auto-publish governed runtime output.')
    expect(merged.runtimePolicy.requiresHumanApproval).toBe(true)
  })

  it('captures runtime queue approvals separately while coerced external input remains planning-only', () => {
    const approvedJob = buildRuntimeJobRequest({
      id: 'render-preview-01',
      kind: 'runtime-render',
      requestedRuntimeTarget: 'local-worker',
      runtimeCapabilityStatus: 'available',
      reason: 'Render a review preview after explicit approval.',
      requiredEvidence: ['runtime execution evidence'],
      estimatedCostUsd: 0.25,
      estimatedMinutes: 3,
      approvedForQueue: true,
      now: '2026-05-25T12:05:00.000Z',
    })

    expect(approvedJob).toMatchObject({
      state: 'queued',
      executionAllowed: true,
      humanReviewRequired: true,
    })
    expect(approvedJob.nextAction).toContain('hold release for human review')

    const coerced = coerceGovernedRuntimeJob({
      id: 'external-render-tries-to-force-run',
      kind: 'runtime-render',
      state: 'queued',
      runtimeTarget: 'cloud-sandbox',
      requestedRuntimeTarget: 'cloud-sandbox',
      runtimeCapabilityStatus: 'available',
      executionAllowed: true,
      humanReviewRequired: false,
      reason: 'Untrusted API payload tries to force execution.',
    })

    expect(coerced).toMatchObject({
      id: 'external-render-tries-to-force-run',
      executionAllowed: false,
      humanReviewRequired: true,
    })
  })
})
