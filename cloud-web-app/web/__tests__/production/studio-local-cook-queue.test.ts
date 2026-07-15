import { describe, expect, it } from 'vitest'

import {
  buildStudioLocalCookQueuePlan,
  coerceStudioLocalCookJobRequest,
} from '@/lib/production/studio-local-cook-queue'

describe('studio local cook queue', () => {
  it('captures a complete cook request as planning-only dispatch with release hold', () => {
    const request = coerceStudioLocalCookJobRequest({
      assetId: 'hero-boss-01',
      assetName: 'Hero Boss',
      goal: 'Cook a cinematic-ready character bundle with LODs, KTX2, collision, navmesh, thumbnail, and review packet.',
      sourceAssetUri: 's3://assets/hero-boss/source.glb',
      sourceSha256: 'sha256:hero-boss-source',
      sourceFormat: 'glb',
      currentTier: 'curated-marketplace',
      targetTier: 'studio-local-optimized',
      availableTools: [
        'gltf-transform',
        'blender-headless',
        'meshoptimizer',
        'ktx-software-basisu',
        'recast-detour',
        'rapier-physics',
        'ffmpeg',
      ],
      evidenceRefs: [
        'source asset manifest',
        'download hash',
        'source sha256',
        'license/provenance receipt',
        'creator/source URL',
        'usage rights',
        'normalized glb manifest',
        'unit scale report',
        'axis/origin report',
        'retopology or curated mesh receipt',
        'LOD0/LOD1/LOD2/LOD3 manifest',
        'mesh density report',
        'UV/material validation',
        'PBR texture compression report',
        'KTX2/Basis output',
        'collision/navmesh proxy report',
        'walkable surface report',
        'physics collider validation',
        'final preview frame capture',
        'thumbnail render',
        'viewport performance trace',
        'human art-direction approval',
        'runtime execution evidence',
        'rollback plan',
      ],
      estimatedCostUsd: 4,
      estimatedMinutes: 18,
      requestedByAgent: 'Studio Local Cook Agent',
    })

    expect(request).not.toBeNull()
    const plan = buildStudioLocalCookQueuePlan({
      request: request!,
      projectId: 'project-1',
      now: '2026-05-25T16:00:00.000Z',
    })

    expect(plan).toMatchObject({
      version: 1,
      queue: 'studio-local-cook-queue',
      state: 'captured-planning-only',
      executionAllowed: false,
      dispatchAllowed: false,
    })
    expect(plan.requiredTools).toEqual(expect.arrayContaining(['gltf-transform', 'meshoptimizer', 'ktx-software-basisu', 'recast-detour', 'ffmpeg']))
    expect(plan.missingTools).toEqual([])
    expect(plan.missingEvidence).toEqual([])
    expect(plan.queueNote).toContain('signed daemon dispatch')
    expect(plan.governedJob).toMatchObject({
      kind: 'asset-import',
      runtimeTarget: 'local-native',
      executionAllowed: false,
      humanReviewRequired: true,
    })
    expect(plan.governedJob.requiredCapabilities).toEqual(expect.arrayContaining(['studio-local', 'meshoptimizer', 'ktx2-basis', 'ffmpeg']))
    expect(plan.governedJob.blockers).toContain('Native execution requires signed Studio Local daemon dispatch.')
  })

  it('holds cook dispatch when tools and evidence are missing', () => {
    const request = coerceStudioLocalCookJobRequest({
      assetId: 'draft-prop-01',
      assetName: 'Draft Prop',
      goal: 'Cook a draft prop without enough evidence.',
      sourceAssetUri: 's3://assets/draft-prop/source.glb',
      sourceSha256: 'sha256:draft-prop-source',
      sourceFormat: 'glb',
      currentTier: 'ai-draft',
      targetTier: 'studio-local-optimized',
      availableTools: ['gltf-transform'],
      evidenceRefs: ['source asset manifest', 'download hash', 'source sha256'],
    })

    const plan = buildStudioLocalCookQueuePlan({ request: request! })

    expect(plan.state).toBe('blocked')
    expect(plan.executionAllowed).toBe(false)
    expect(plan.missingTools).toEqual(expect.arrayContaining(['meshoptimizer', 'ktx-software-basisu', 'recast-detour']))
    expect(plan.missingEvidence).toEqual(expect.arrayContaining(['license/provenance receipt', 'human art-direction approval']))
    expect(plan.blockers).toContain('AI draft source needs license/provenance receipt before cook dispatch.')
    expect(plan.governedJob.executionAllowed).toBe(false)
  })

  it('rejects underspecified cook requests', () => {
    expect(coerceStudioLocalCookJobRequest(null)).toBeNull()
    expect(coerceStudioLocalCookJobRequest({ assetId: 'asset-only' })).toBeNull()
  })
})
