import { describe, expect, it } from 'vitest'

import { buildWebGPUComputeReadinessSnapshot } from '@/lib/runtime/webgpu-compute-readiness'

const BASE_LIMITS = {
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupStorageSize: 32 * 1024,
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
  maxBufferSize: 256 * 1024 * 1024,
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
      benchmarkTraceRef: 'evidence://webgpu/trace-001',
    })

    expect(snapshot.status).toBe('available')
    expect(snapshot.featureLevel).toBe('core')
    expect(snapshot.availableLanes).toEqual(expect.arrayContaining([
      'viewport-preview',
      'meshlet-culling-preview',
      'light-culling-preview',
      'material-preflight',
    ]))
    expect(snapshot.warnings.join(' ')).toContain('preview/review only')
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
})
