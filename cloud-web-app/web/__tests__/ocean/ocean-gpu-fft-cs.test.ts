/**
 * Letter cs — WebGPU GPU Ocean FFT soak (Zero-MVP honesty).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  validateWebGPUComputeShaderLibrary,
} from '@aethel/runtime/webgpu-compute-shader-library'
import { buildWebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import { buildWebGPUPerformanceTraceSummary } from '@aethel/runtime/webgpu-performance-trace'
import {
  GPU_OCEAN_FFT_LETTER,
  GPU_OCEAN_FFT_WIRED,
  GPU_OCEAN_FFT_MIN_CAPABILITY_SCORE,
  GPU_FFT_MARKETING_ALLOWED,
  OCEAN_UE_WATER_PARITY_READY,
  OCEAN_UE_WATER_PARITY_HELD,
  planGpuOceanFft,
  buildGpuOceanFftComputePipelineDescriptor,
  runGpuOceanFftComputeSoak,
  generateOceanHeightFieldGpuOrCpu,
  createMockGpuOceanFftDevice,
  probeGpuOceanFftHonesty,
  getOceanFftDisplacementShaderSpec,
  configureGpuOceanFftContext,
  ensureGpuOceanFftSoak,
  tickOceanViewportDisplacement,
  createOceanViewportMockMesh,
  probeOceanHonesty,
  bindOceanViewportMesh,
} from '@/lib/ocean'

const BASE_LIMITS = {
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupStorageSize: 32 * 1024,
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
  maxBufferSize: 256 * 1024 * 1024,
}

function buildReviewedTrace() {
  return buildWebGPUPerformanceTraceSummary({
    traceRef: 'evidence://webgpu/ocean-gpu-fft-cs',
    targetFps: 60,
    humanReviewAttached: true,
    samples: Array.from({ length: 60 }, (_, frameIndex) => ({
      frameIndex,
      frameTimeMs: 16,
      gpuTimeMs: 7,
      drawCalls: 200,
      triangles: 100_000,
      visibleMeshlets: 100,
      culledMeshlets: 50,
      memoryMb: 400,
    })),
  })
}

beforeEach(() => {
  configureGpuOceanFftContext(null)
  bindOceanViewportMesh(null)
})

describe('GPU Ocean FFT flags (cs)', () => {
  it('wires letter cs modules and keeps UE Water / marketing GPU FFT HELD', () => {
    expect(GPU_OCEAN_FFT_LETTER).toBe('cs')
    expect(GPU_OCEAN_FFT_WIRED).toBe(true)
    expect(OCEAN_UE_WATER_PARITY_READY).toBe(false)
    expect(OCEAN_UE_WATER_PARITY_HELD).toBe(true)
    expect(GPU_FFT_MARKETING_ALLOWED).toBe(false)
  })
})

describe('GPU Ocean FFT compute pipeline (cs)', () => {
  it('exposes bind group layout + shader from library', () => {
    const spec = getOceanFftDisplacementShaderSpec()
    expect(spec?.id).toBe('ocean-fft-displacement-v1')
    expect(spec?.wgsl).toContain('@compute')
    expect(spec?.lane).toBe('ocean-fft-displacement-preview')
    const desc = buildGpuOceanFftComputePipelineDescriptor(16)
    expect(desc.layout.bindings.spectrum).toBe(0)
    expect(desc.layout.bindings.heights).toBe(2)
    expect(desc.wgsl).toContain('spectrum')
  })

  it('validates shader library includes ocean FFT lane', () => {
    const validation = validateWebGPUComputeShaderLibrary()
    expect(validation.valid).toBe(true)
    // WebGPUComputeShaderId union has exactly 8 members; 6 was a stale count.
    expect(validation.shaderCount).toBe(8)
    expect(validation.lanes).toContain('ocean-fft-displacement-preview')
    expect(
      AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.some((s) => s.id === 'ocean-fft-displacement-v1'),
    ).toBe(true)
  })

  it('readiness snapshot exposes ocean FFT lane when compute available', () => {
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
      performanceTrace: buildReviewedTrace(),
    })
    expect(snapshot.computeAvailable).toBe(true)
    expect(snapshot.availableLanes).toContain('ocean-fft-displacement-preview')
  })
})

describe('GPU Ocean FFT readiness gate (cs)', () => {
  it('HELD without soak even when WebGPU compute flags true', () => {
    const plan = planGpuOceanFft({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(plan.gpuFftOceanReady).toBe(false)
    expect(plan.backend).toBe('cpu-fft-fallback')
    expect(plan.heldReason).toContain('HELD')
    expect(plan.gpuFftAllowed).toBe(false)
    expect(plan.unrealWaterParityReady).toBe(false)
  })

  it('Law XV GT730 score 12 forces CPU fallback', () => {
    const plan = planGpuOceanFft({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 12,
      soakPassed: true,
      soakFramesProven: 32,
    })
    expect(plan.capabilityScore).toBe(12)
    expect(plan.capabilityScore).toBeLessThan(GPU_OCEAN_FFT_MIN_CAPABILITY_SCORE)
    expect(plan.gpuFftOceanReady).toBe(false)
    expect(plan.backend).toBe('cpu-fft-fallback')
    expect(plan.notes.join(' ')).toContain('GT730')
  })

  it('flips gpuFftOceanReady only after mock GPU soak', () => {
    const device = createMockGpuOceanFftDevice({ supportDispatch: true })
    const soak = runGpuOceanFftComputeSoak({
      frames: 8,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      device,
      resolution: 16,
    })
    expect(soak.passed).toBe(true)
    expect(soak.dispatches).toBe(8)
    expect(soak.gpuFftOceanReady).toBe(true)
    expect(soak.gpuFftAllowed).toBe(false)
    expect(soak.unrealWaterParityReady).toBe(false)
    expect(soak.peakAbs ?? 0).toBeGreaterThan(0)

    const plan = planGpuOceanFft({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      soakPassed: soak.passed,
      soakFramesProven: soak.frames,
    })
    expect(plan.gpuFftOceanReady).toBe(true)
    expect(plan.backend).toBe('webgpu-compute')
    expect(plan.gpuFftAllowed).toBe(false)

    const honesty = probeGpuOceanFftHonesty({
      soak,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(honesty.gpuFftOceanReady).toBe(true)
    expect(honesty.gpuFftAllowed).toBe(false)
    expect(honesty.unrealWaterParityReady).toBe(false)
    expect(honesty.unrealWaterParityHeld).toBe(true)
  })
})

describe('GPU Ocean FFT generate + viewport + AAA path (cs)', () => {
  it('generateOceanHeightFieldGpuOrCpu uses GPU path after soak + device', () => {
    const device = createMockGpuOceanFftDevice({ supportDispatch: true })
    const soak = runGpuOceanFftComputeSoak({
      frames: 4,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      device,
    })
    expect(soak.passed).toBe(true)
    const generated = generateOceanHeightFieldGpuOrCpu({
      params: {
        resolution: 16,
        windSpeed: 12,
        windAngle: 0.4,
        amplitude: 0.5,
        seed: 42,
      },
      capabilityScore: 40,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      soakPassed: true,
      soakFramesProven: soak.frames,
      device,
    })
    expect(generated.backend).toBe('webgpu-compute')
    expect(generated.gpuFftOceanReady).toBe(true)
    expect(generated.gpuFftAllowed).toBe(false)
    expect(generated.heights.length).toBe(16 * 16)
  })

  it('GT730 generate stays on CPU even with soak flag', () => {
    const device = createMockGpuOceanFftDevice()
    const generated = generateOceanHeightFieldGpuOrCpu({
      params: {
        resolution: 16,
        windSpeed: 12,
        windAngle: 0.4,
        amplitude: 0.5,
        seed: 7,
      },
      capabilityScore: 12,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      soakPassed: true,
      soakFramesProven: 32,
      device,
    })
    expect(generated.backend).toBe('cpu-fft-fallback')
    expect(generated.gpuFftOceanReady).toBe(false)
  })

  it('tickOceanViewportDisplacement uses GPU backend after ensureGpuOceanFftSoak', () => {
    const device = createMockGpuOceanFftDevice({ supportDispatch: true })
    const soak = ensureGpuOceanFftSoak({
      capabilityScore: 40,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      device,
      frames: 4,
    })
    expect(soak.gpuFftOceanReady).toBe(true)
    const mock = createOceanViewportMockMesh(8)
    const r = tickOceanViewportDisplacement({
      capabilityScore: 40,
      userEnabled: true,
      seed: 3,
      target: mock.target,
    })
    expect(r.applied).toBe(true)
    expect(r.fftBackend).toBe('webgpu-compute')
    expect(r.peakAbs).toBeGreaterThan(0)
  })

  it('probeOceanHonesty flips gpuFftOceanReady only with soak; gpuFftAllowed stays false', () => {
    const without = probeOceanHonesty({
      gpuFftOceanSoakPassed: false,
      viewportSoakPassed: true,
      meshBindSoakPassed: true,
    })
    expect(without.gpuFftOceanReady).toBe(false)
    expect(without.gpuFftAllowed).toBe(false)
    expect(without.unrealWaterParityAllowed).toBe(false)

    const device = createMockGpuOceanFftDevice({ supportDispatch: true })
    const soak = ensureGpuOceanFftSoak({
      capabilityScore: 40,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      device,
      frames: 4,
    })
    expect(soak.passed).toBe(true)
    const withSoak = probeOceanHonesty({
      gpuFftOceanSoakPassed: true,
      viewportSoakPassed: true,
      meshBindSoakPassed: true,
    })
    expect(withSoak.gpuFftOceanReady).toBe(true)
    expect(withSoak.letter).toBe('cs')
    expect(withSoak.gpuFftAllowed).toBe(false)
    expect(withSoak.coinsMarketingAllowed).toBe(false)
    expect(withSoak.agonesMarketingAllowed).toBe(false)
    expect(withSoak.naniteMarketingAllowed).toBe(false)
    expect(withSoak.dlssMarketingAllowed).toBe(false)
  })
})
