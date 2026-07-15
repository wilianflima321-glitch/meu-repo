import { describe, expect, it } from 'vitest'

import { buildWebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  validateWebGPUComputeShaderLibrary,
} from '@aethel/runtime/webgpu-compute-shader-library'
import { buildWebGPUPerformanceTraceSummary } from '@aethel/runtime/webgpu-performance-trace'

const BASE_LIMITS = {
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupStorageSize: 32 * 1024,
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
  maxBufferSize: 256 * 1024 * 1024,
}

function buildReviewedTrace() {
  return buildWebGPUPerformanceTraceSummary({
    traceRef: 'evidence://webgpu/trace-001',
    targetFps: 60,
    humanReviewAttached: true,
    samples: Array.from({ length: 90 }, (_, frameIndex) => ({
      frameIndex,
      frameTimeMs: frameIndex % 20 === 0 ? 17.2 : 15.7,
      gpuTimeMs: 8.4,
      drawCalls: 420,
      triangles: 720_000,
      visibleMeshlets: 360,
      culledMeshlets: 640,
      memoryMb: 900,
    })),
  })
}

describe('WebGPU compute readiness', () => {
  it('falls back honestly when navigator.gpu is unavailable', () => {
    const snapshot = buildWebGPUComputeReadinessSnapshot({
      secureContext: true,
      navigatorGpuAvailable: false,
    })

    expect(snapshot.status).toBe('fallback')
    expect(snapshot.computeAvailable).toBe(false)
    expect(snapshot.browserPreviewOnly).toBe(true)
    expect(snapshot.finalRenderRequiresNativeOrCloud).toBe(true)
    expect(snapshot.blockers.join(' ')).toContain('navigator.gpu')
    expect(snapshot.nextAction).toContain('WebGL2')
  })

  it('enables only preview compute lanes when adapter, device, limits and WGSL evidence are present', () => {
    const snapshot = buildWebGPUComputeReadinessSnapshot({
      secureContext: true,
      navigatorGpuAvailable: true,
      adapterRequested: true,
      adapterAvailable: true,
      deviceRequested: true,
      deviceAvailable: true,
      features: ['core-features-and-limits', 'timestamp-query'],
      limits: BASE_LIMITS,
      rendererModuleAvailable: true,
      shaderValidation: 'passed',
      performanceTrace: buildReviewedTrace(),
    })

    expect(snapshot.status).toBe('available')
    expect(snapshot.featureLevel).toBe('core')
    expect(snapshot.availableLanes).toEqual(expect.arrayContaining([
      'viewport-preview',
      'meshlet-culling-preview',
      'light-culling-preview',
      'material-preflight',
      'dual-quaternion-skinning-preview',
    ]))
    expect(snapshot.warnings.join(' ')).toContain('preview/review only')
  })

  it('holds compute lanes when structured performance trace is missing', () => {
    const snapshot = buildWebGPUComputeReadinessSnapshot({
      secureContext: true,
      navigatorGpuAvailable: true,
      adapterRequested: true,
      adapterAvailable: true,
      deviceRequested: true,
      deviceAvailable: true,
      features: ['core-features-and-limits'],
      limits: BASE_LIMITS,
      rendererModuleAvailable: true,
      shaderValidation: 'passed',
    })

    expect(snapshot.status).toBe('held')
    expect(snapshot.computeAvailable).toBe(false)
    expect(snapshot.blockers.join(' ')).toContain('No structured WebGPU performance trace')
  })

  it('holds compute lanes when shader validation or supported limits are missing', () => {
    const snapshot = buildWebGPUComputeReadinessSnapshot({
      secureContext: true,
      navigatorGpuAvailable: true,
      adapterRequested: true,
      adapterAvailable: true,
      deviceRequested: true,
      deviceAvailable: true,
      features: ['core-features-and-limits'],
      limits: {
        ...BASE_LIMITS,
        maxStorageBufferBindingSize: 8 * 1024 * 1024,
      },
      rendererModuleAvailable: true,
      shaderValidation: 'not-run',
    })

    expect(snapshot.status).toBe('held')
    expect(snapshot.computeAvailable).toBe(false)
    expect(snapshot.availableLanes).toEqual([])
    expect(snapshot.blockers.join(' ')).toContain('WGSL shader validation has not run')
    expect(snapshot.blockers.join(' ')).toContain('maxStorageBufferBindingSize')
  })

  it('validates the canonical shader library for preview compute lanes', () => {
    const validation = validateWebGPUComputeShaderLibrary()

    expect(validation.valid).toBe(true)
    expect(validation.shaderCount).toBe(8)
    expect(validation.lanes).toEqual(expect.arrayContaining([
      'meshlet-culling-preview',
      'light-culling-preview',
      'material-preflight',
      'dual-quaternion-skinning-preview',
      'navmesh-heightfield-walkable-preview',
      'ocean-fft-displacement-preview',
      'entropy-fracture-debris-preview',
      'mass-ecs-agent-step-preview',
    ]))
    expect(AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.every((shader) => shader.requiredEvidence.length >= 3)).toBe(true)
  })
})
