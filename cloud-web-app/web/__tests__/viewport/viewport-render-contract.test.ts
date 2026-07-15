import { describe, expect, it } from 'vitest'

import {
  buildViewportRenderJobContract,
  coerceViewportRenderJobContract,
  estimateViewportRenderCostUsd,
} from '@/lib/viewport/viewport-render-contract'

describe('viewport render contract', () => {
  it('builds evidence-first render contracts with cost, target, and quality profile', () => {
    const contract = buildViewportRenderJobContract({
      id: 'render-review-1',
      projectId: 'project-1',
      mode: 'film',
      renderMode: 'cinematic',
      quality: 'review',
      requestedAt: '2026-05-11T12:00:00.000Z',
      selectedObjectId: 'camera-rig',
      selectedObjectName: 'Camera Rig',
      timeline: { currentTime: 2, duration: 12, isPlaying: false },
      scene: {
        objectCount: 12,
        assetCount: 3,
        selectedObjectId: 'camera-rig',
        selectedObjectName: 'Camera Rig',
        assetFormats: ['glb', 'GLB', 'fbx'],
        visualScriptNodes: 4,
        visualScriptEdges: 3,
        vfxNodes: 2,
        vfxConnections: 1,
      },
    })

    expect(contract.profile).toMatchObject({
      resolution: '1920x1080',
      fps: 30,
      target: 'cloud-sandbox',
      requiresHumanApproval: true,
    })
    expect(contract.scene.assetFormats).toEqual(['glb', 'fbx'])
    expect(contract.acceptance).toContain('Render runs outside the browser main thread')
    expect(contract.estimatedCostUsd).toBeGreaterThan(0)
  })

  it('coerces external payloads and clamps final duration to the quality profile', () => {
    const contract = coerceViewportRenderJobContract({
      contract: {
        id: 'render-final-1',
        mode: 'film',
        renderMode: 'cinematic',
        quality: 'final',
        timeline: { currentTime: -10, duration: 9999, isPlaying: true },
        scene: { objectCount: 10.8, assetCount: 4.2, assetFormats: ['usd'] },
      },
    })

    expect(contract?.timeline.currentTime).toBe(0)
    expect(contract?.timeline.duration).toBe(600)
    expect(contract?.scene.objectCount).toBe(11)
    expect(contract?.profile.expectedOutputs).toContain('performance-report')
  })

  it('keeps draft renders cheap while final renders account for duration and scene complexity', () => {
    const draft = estimateViewportRenderCostUsd({ quality: 'draft', durationSeconds: 10, assetCount: 1, objectCount: 4 })
    const final = estimateViewportRenderCostUsd({ quality: 'final', durationSeconds: 120, assetCount: 8, objectCount: 80 })

    expect(final).toBeGreaterThan(draft)
  })
})
