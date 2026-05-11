import { describe, expect, it } from 'vitest'

import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
  type ViewportRenderRuntimeRoute,
} from '@/lib/viewport/viewport-render-queue'
import {
  buildViewportRenderReadinessReport,
  estimateViewportRenderResources,
} from '@/lib/viewport/viewport-render-readiness'

function buildPayload(input: {
  quality?: 'draft' | 'review' | 'final'
  duration?: number
  objectCount?: number
  assetCount?: number
  route?: Partial<ViewportRenderRuntimeRoute>
} = {}) {
  const quality = input.quality ?? 'draft'
  const contract = buildViewportRenderJobContract({
    id: `readiness-${quality}`,
    projectId: 'project-readiness',
    mode: 'film',
    renderMode: quality === 'draft' ? 'draft' : 'cinematic',
    quality,
    requestedAt: '2026-05-11T18:00:00.000Z',
    selectedObjectId: 'hero-camera',
    selectedObjectName: 'Hero Camera',
    timeline: { currentTime: 0, duration: input.duration ?? 12, isPlaying: false },
    scene: {
      objectCount: input.objectCount ?? 24,
      assetCount: input.assetCount ?? 8,
      selectedObjectId: 'hero-camera',
      selectedObjectName: 'Hero Camera',
      assetFormats: ['glb', 'exr', 'wav'],
      visualScriptNodes: 4,
      visualScriptEdges: 3,
      vfxNodes: quality === 'draft' ? 2 : 18,
      vfxConnections: quality === 'draft' ? 1 : 17,
    },
  })
  const defaultRoute = buildDefaultViewportRenderRuntimeRoute(contract)
  const route = { ...defaultRoute, ...input.route }

  return buildViewportRenderQueuePayload({
    contract,
    projectId: 'project-readiness',
    projectName: 'Readiness Scene',
    runtimeRoute: route,
    requestedBy: 'user-readiness',
    requestedAt: '2026-05-11T18:01:00.000Z',
  })
}

describe('viewport render readiness', () => {
  it('keeps draft renders ready when the isolated worker budget is safe', () => {
    const report = buildViewportRenderReadinessReport(buildPayload())

    expect(report.severity).toBe('ready')
    expect(report.shouldHold).toBe(false)
    expect(report.requiredEvidence).toEqual(expect.arrayContaining([
      'Runtime route report attached',
      'Memory and VRAM estimate attached',
    ]))
    expect(report.reasons.join(' ')).toContain('within the current isolated runtime budget')
  })

  it('holds render work when the runtime route is held by device safety', () => {
    const report = buildViewportRenderReadinessReport(buildPayload({
      route: {
        target: 'held',
        canStart: false,
        safety: 'held',
        reason: 'Thermal pressure is critical.',
      },
    }))

    expect(report.severity).toBe('held')
    expect(report.recommendedLane).toBe('held')
    expect(report.shouldHold).toBe(true)
    expect(report.reasons).toContain('Thermal pressure is critical.')
  })

  it('routes final browser-worker pressure to cloud/native instead of pretending it is safe', () => {
    const report = buildViewportRenderReadinessReport(buildPayload({
      quality: 'final',
      duration: 480,
      objectCount: 900,
      assetCount: 120,
      route: {
        target: 'local-worker',
        preferredPlacement: 'local-worker',
        safety: 'ready',
      },
    }))

    expect(report.severity).toBe('fallback')
    expect(report.recommendedLane).toBe('cloud-sandbox')
    expect(report.shouldUseCloud).toBe(true)
    expect(report.estimatedMemoryMb).toBeGreaterThan(4096)
    expect(report.estimatedVramMb).toBeGreaterThan(3072)
    expect(report.mitigationSteps.join(' ')).toContain('local-native GPU/NPU helpers or cloud-sandbox')
  })

  it('estimates frames, memory, vram, and risk deterministically from the contract', () => {
    const payload = buildPayload({ quality: 'review', duration: 25, objectCount: 60, assetCount: 20 })
    const estimate = estimateViewportRenderResources(payload.metadata.renderContract)

    expect(estimate.estimatedFrames).toBe(750)
    expect(estimate.estimatedMemoryMb).toBeGreaterThan(0)
    expect(estimate.estimatedVramMb).toBeGreaterThan(0)
    expect(estimate.riskScore).toBeGreaterThan(0)
  })
})
