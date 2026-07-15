import { describe, expect, it } from 'vitest'

import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
  coerceViewportRenderRuntimeRoute,
  shouldHoldViewportRenderRuntimeRoute,
} from '@/lib/viewport/viewport-render-queue'

function buildContract() {
  return buildViewportRenderJobContract({
    id: 'render-cinematic-review',
    projectId: 'project-1',
    mode: 'film',
    renderMode: 'cinematic',
    quality: 'review',
    requestedAt: '2026-05-11T12:00:00.000Z',
    selectedObjectId: 'camera',
    selectedObjectName: 'Camera',
    timeline: { currentTime: 0, duration: 20, isPlaying: false },
    scene: {
      objectCount: 22,
      assetCount: 3,
      selectedObjectId: 'camera',
      selectedObjectName: 'Camera',
      assetFormats: ['glb', 'wav'],
      visualScriptNodes: 2,
      visualScriptEdges: 1,
      vfxNodes: 3,
      vfxConnections: 2,
    },
  })
}

describe('viewport render queue contract', () => {
  it('builds a default runtime route that keeps render work isolated', () => {
    const route = buildDefaultViewportRenderRuntimeRoute(buildContract())

    expect(route).toMatchObject({
      lane: 'viewport-render',
      target: 'cloud-sandbox',
      safety: 'needs-confirmation',
      requiresConfirmation: true,
    })
    expect(route.detail).toContain('IDE stays responsive')
  })

  it('coerces held runtime routes instead of enqueueing unsafe work', () => {
    const route = coerceViewportRenderRuntimeRoute(
      { target: 'held', canStart: false, safety: 'held', reason: 'GPU is overheated.' },
      buildContract(),
    )

    expect(shouldHoldViewportRenderRuntimeRoute(route)).toBe(true)
    expect(route.reason).toBe('GPU is overheated.')
  })

  it('builds queue payloads with evidence, cost, and no-main-thread execution plan', () => {
    const contract = buildContract()
    const route = buildDefaultViewportRenderRuntimeRoute(contract)
    const payload = buildViewportRenderQueuePayload({
      contract,
      projectId: 'project-1',
      projectName: 'Cinematic demo',
      runtimeRoute: route,
      requestedBy: 'user-1',
      requestedAt: '2026-05-11T12:01:00.000Z',
    })

    expect(payload).toMatchObject({
      projectId: 'project-1',
      runtimeTarget: 'cloud-sandbox',
      requestedBy: 'user-1',
      metadata: {
        source: 'viewport-render-contract',
        estimatedCostUsd: contract.estimatedCostUsd,
        executionPlan: {
          lane: 'viewport-render',
          isolation: 'outside-browser-main-thread',
          quality: 'review',
        },
      },
    })
    expect(payload.metadata.expectedOutputs).toEqual(expect.arrayContaining(['review-mp4', 'validation-report']))
    expect(payload.metadata.evidenceRequired).toEqual(expect.arrayContaining([
      'Final release remains blocked until validation and license checks pass',
    ]))
  })
})
