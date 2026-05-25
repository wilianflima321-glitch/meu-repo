import { describe, expect, it } from 'vitest'

import {
  buildAssetQualityJobRun,
  coerceAssetQualityJobRequest,
} from '@/lib/production/asset-quality-job-runner'

describe('asset quality job runner', () => {
  it('turns an asset upgrade request into a planning-only governed quality job', () => {
    const request = coerceAssetQualityJobRequest({
      assetId: 'hero-boss-01',
      assetName: 'Hero Boss',
      goal: 'Upgrade a raw AI boss mesh into a vertical-slice character asset.',
      domain: 'character',
      currentTier: 'ai-draft',
      targetTier: 'studio-local-optimized',
      budgetUsd: 25,
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
      evidenceRefs: ['art direction board', 'style tokens', 'silhouette sheet'],
      requestedByAgent: 'Asset Pipeline Agent',
      assetMetadata: {
        fileName: 'hero-boss.glb',
        licenseStatus: 'needs-review',
        triangleBudgetEstimate: 10000,
      },
    })

    expect(request).not.toBeNull()
    const run = buildAssetQualityJobRun({
      request: request!,
      projectId: 'project-1',
      now: '2026-05-25T15:00:00.000Z',
    })

    expect(run).toMatchObject({
      version: 1,
      runner: 'asset-quality-job-runner',
      executionAllowed: false,
      queueState: 'captured-planning-only',
    })
    expect(run.queueNote).toContain('separate approved Studio Local or Cloud queue action')
    expect(run.job).toMatchObject({
      kind: 'quality-upgrade',
      assetId: 'hero-boss-01',
      currentTier: 'ai-draft',
      targetTier: 'studio-local-optimized',
      executionAllowed: false,
      humanReviewRequired: true,
    })
    expect(run.job.blockers).toContain('Draft assets are not final; upgrade requires evidence and review.')
    expect(run.job.requiredEvidence).toContain('human art-direction approval')
  })

  it('rejects underspecified external requests before a job can be persisted', () => {
    expect(coerceAssetQualityJobRequest(null)).toBeNull()
    expect(coerceAssetQualityJobRequest({ assetId: 'asset-only' })).toBeNull()
    expect(coerceAssetQualityJobRequest({ assetId: 'asset-1', assetName: 'Asset', goal: 'Upgrade it' })).toMatchObject({
      assetId: 'asset-1',
      assetName: 'Asset',
      currentTier: 'ai-draft',
      targetTier: 'curated-marketplace',
      domain: 'asset',
    })
  })
})
