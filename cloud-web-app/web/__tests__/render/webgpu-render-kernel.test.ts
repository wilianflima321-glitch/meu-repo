import { describe, expect, it } from 'vitest'

import { buildWebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import { buildWebGPUPerformanceTraceSummary } from '@aethel/runtime/webgpu-performance-trace'
import {
  buildWebGPUDeferredPassContract,
  buildWebGPUForwardPlusPassContract,
  buildWebGPURenderKernelReceipt,
  validateWebGPURenderKernelReceipt,
} from '@/lib/render/webgpu'

function passingTrace() {
  return buildWebGPUPerformanceTraceSummary({
    traceRef: 'evidence://webgpu/render-kernel-trace',
    humanReviewAttached: true,
    samples: Array.from({ length: 80 }, (_, frameIndex) => ({
      frameIndex,
      frameTimeMs: 12,
      gpuTimeMs: 7,
      drawCalls: 640,
      triangles: 450_000,
      memoryMb: 512,
      visibleMeshlets: 120,
      culledMeshlets: 360,
    })),
  })
}

function computeReady() {
  return buildWebGPUComputeReadinessSnapshot({
    secureContext: true,
    navigatorGpuAvailable: true,
    adapterRequested: true,
    adapterAvailable: true,
    deviceRequested: true,
    deviceAvailable: true,
    rendererModuleAvailable: true,
    shaderValidation: 'passed',
    features: ['core-features-and-limits'],
    limits: {
      maxComputeInvocationsPerWorkgroup: 256,
      maxComputeWorkgroupStorageSize: 32 * 1024,
      maxStorageBufferBindingSize: 128 * 1024 * 1024,
      maxBufferSize: 256 * 1024 * 1024,
    },
    performanceTrace: passingTrace(),
  })
}

describe('V29 WebGPU render kernel', () => {
  it('holds deferred pass when G-buffer or trace evidence is missing', () => {
    const deferred = buildWebGPUDeferredPassContract({
      gBufferAttachments: ['albedo', 'normal'],
      depthPrepassReady: true,
      materialPreflightReady: true,
      lightingResolveReady: false,
    })

    expect(deferred.state).toBe('held')
    expect(deferred.blockers.join(' ')).toContain('material')
    expect(deferred.blockers.join(' ')).toContain('performance trace')
    expect(deferred.finalRenderReady).toBe(false)
  })

  it('holds Forward+ when compute/culling evidence is incomplete', () => {
    const forwardPlus = buildWebGPUForwardPlusPassContract({
      computeReadiness: buildWebGPUComputeReadinessSnapshot({
        navigatorGpuAvailable: false,
        shaderValidation: 'not-run',
      }),
      lightCount: 128,
      meshletCullingReady: false,
      lightCullingReady: false,
    })

    expect(forwardPlus.state).toBe('held')
    expect(forwardPlus.blockers).toEqual(expect.arrayContaining([
      'WebGPU compute readiness is fallback.',
      'Forward+ pass requires meshlet culling lane evidence.',
      'Forward+ pass requires light culling lane evidence.',
    ]))
  })

  it('builds preview evidence while keeping final render claims blocked behind native/cloud receipts', () => {
    const trace = passingTrace()
    const deferred = buildWebGPUDeferredPassContract({
      gBufferAttachments: ['albedo', 'normal', 'material', 'depth'],
      depthPrepassReady: true,
      materialPreflightReady: true,
      lightingResolveReady: true,
      traceRef: trace.traceRef ?? undefined,
      humanReviewAttached: true,
    })
    const forwardPlus = buildWebGPUForwardPlusPassContract({
      computeReadiness: computeReady(),
      lightCount: 256,
      meshletCullingReady: true,
      lightCullingReady: true,
      traceRef: trace.traceRef ?? undefined,
      humanReviewAttached: true,
    })
    const receipt = buildWebGPURenderKernelReceipt({
      deferred,
      forwardPlus,
      performanceTrace: trace,
      fallbackRenderer: 'cloud-render',
      humanReviewAttached: true,
    })

    expect(receipt.state).toBe('available')
    expect(receipt.activePipelines).toEqual(['deferred', 'forward-plus'])
    expect(receipt.finalRenderReady).toBe(false)
    expect(receipt.releasePolicy).toBe('native-or-cloud-plus-human-review')
    expect(validateWebGPURenderKernelReceipt(receipt)).toEqual([])
  })
})
