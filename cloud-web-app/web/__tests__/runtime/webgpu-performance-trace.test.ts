import { describe, expect, it } from 'vitest'

import { buildWebGPUPerformanceTraceSummary } from '@aethel/runtime/webgpu-performance-trace'

function buildStableSamples(count = 90) {
  return Array.from({ length: count }, (_, frameIndex) => ({
    frameIndex,
    frameTimeMs: frameIndex % 20 === 0 ? 17.4 : 15.8,
    gpuTimeMs: frameIndex % 15 === 0 ? 9.8 : 8.6,
    drawCalls: 420,
    triangles: 740_000,
    visibleMeshlets: 380,
    culledMeshlets: 620,
    memoryMb: 910,
  }))
}

describe('WebGPU performance trace summary', () => {
  it('holds compute evidence when trace reference or samples are missing', () => {
    const summary = buildWebGPUPerformanceTraceSummary({
      samples: [],
    })

    expect(summary.status).toBe('held')
    expect(summary.traceRef).toBeNull()
    expect(summary.blockers.join(' ')).toContain('trace reference is missing')
    expect(summary.blockers.join(' ')).toContain('at least 60 frame samples')
  })

  it('blocks traces that exceed frame budgets instead of pretending browser compute is ready', () => {
    const summary = buildWebGPUPerformanceTraceSummary({
      traceRef: 'evidence://webgpu/over-budget',
      targetFps: 60,
      samples: Array.from({ length: 90 }, (_, frameIndex) => ({
        frameIndex,
        frameTimeMs: frameIndex % 3 === 0 ? 38 : 24,
        gpuTimeMs: 18,
        drawCalls: 2200,
        triangles: 2_500_000,
      })),
    })

    expect(summary.status).toBe('blocked')
    expect(summary.metrics.p95FrameMs).toBeGreaterThan(20)
    expect(summary.blockers.join(' ')).toContain('p95 frame time')
    expect(summary.blockers.join(' ')).toContain('draw-call peak')
    expect(summary.blockers.join(' ')).toContain('triangle peak')
  })

  it('marks passing traces as needs-review until a human review is attached', () => {
    const summary = buildWebGPUPerformanceTraceSummary({
      traceRef: 'evidence://webgpu/stable-preview',
      targetFps: 60,
      samples: buildStableSamples(),
    })

    expect(summary.status).toBe('needs-review')
    expect(summary.blockers).toEqual([])
    expect(summary.metrics.estimatedFps).toBeGreaterThan(60)
    expect(summary.nextAction).toContain('Attach human review')
  })

  it('allows available trace evidence only with passing budgets and human review', () => {
    const summary = buildWebGPUPerformanceTraceSummary({
      traceRef: 'evidence://webgpu/stable-reviewed',
      targetFps: 60,
      humanReviewAttached: true,
      samples: buildStableSamples(),
    })

    expect(summary.status).toBe('available')
    expect(summary.requiredEvidence).toEqual(expect.arrayContaining([
      'structured trace reference',
      'p95 frame time budget',
      'human review before release-quality render claims',
    ]))
    expect(summary.warnings.join(' ')).toContain('preview evidence only')
  })
})
