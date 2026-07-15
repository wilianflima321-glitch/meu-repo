/**
 * Letter cw — GPU Mass ECS soak (Zero-MVP honesty).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  validateWebGPUComputeShaderLibrary,
} from '@aethel/runtime/webgpu-compute-shader-library'
import { buildWebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import { buildWebGPUPerformanceTraceSummary } from '@aethel/runtime/webgpu-performance-trace'
import {
  GPU_MASS_ECS_LETTER,
  GPU_MASS_ECS_WIRED,
  GPU_MASS_ECS_MIN_CAPABILITY_SCORE,
  MASS_100K_CLAIM_READY,
  MASS_100K_CLAIM_HELD,
  UNREAL_MASS_PARITY_READY,
  planGpuMassEcs,
  buildGpuMassEcsComputePipelineDescriptor,
  runGpuMassEcsComputeSoak,
  createMockGpuMassEcsDevice,
  probeGpuMassEcsHonesty,
  probeMassEcsHonesty,
  getMassEcsAgentStepShaderSpec,
  configureGpuMassEcsContext,
  ensureGpuMassEcsSoak,
  createMassAgentSoaBuffers,
  fillSyntheticMassCrowd,
  stepMassAgentsCpu,
  stepMassEcsGpuOrCpu,
  uploadNearbyLodAgents,
} from '@/lib/mass-ecs'

const BASE_LIMITS = {
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupStorageSize: 32 * 1024,
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
  maxBufferSize: 256 * 1024 * 1024,
}

function buildReviewedTrace() {
  return buildWebGPUPerformanceTraceSummary({
    traceRef: 'evidence://webgpu/gpu-mass-ecs-cw',
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
  configureGpuMassEcsContext(null)
})

describe('GPU Mass ECS flags (cw)', () => {
  it('wires letter cw modules and keeps 100k / Unreal Mass HELD', () => {
    expect(GPU_MASS_ECS_LETTER).toBe('cw')
    expect(GPU_MASS_ECS_WIRED).toBe(true)
    expect(MASS_100K_CLAIM_READY).toBe(false)
    expect(MASS_100K_CLAIM_HELD).toBe(true)
    expect(UNREAL_MASS_PARITY_READY).toBe(false)
  })
})

describe('Mass SoA + LOD (cw)', () => {
  it('steps crowd without per-entity JS AI callbacks', () => {
    const buffers = createMassAgentSoaBuffers(256)
    fillSyntheticMassCrowd(buffers, 128)
    const before = buffers.positions[0]!
    const { active, peakSpeed } = stepMassAgentsCpu(buffers, 1 / 60)
    expect(active).toBe(128)
    expect(peakSpeed).toBeGreaterThanOrEqual(0)
    // Positions may move toward origin
    expect(Number.isFinite(buffers.positions[0]!)).toBe(true)
    expect(buffers.positions[0]).not.toBe(Number.NaN)
    void before
  })

  it('LOD uploads only nearby agents', () => {
    const buffers = createMassAgentSoaBuffers(100)
    fillSyntheticMassCrowd(buffers, 100, { spacing: 4 })
    const lod = uploadNearbyLodAgents(buffers, {
      camera: { x: 0, y: 0, z: 0 },
      radius: 10,
      maxUpload: 50,
    })
    expect(lod.uploadedCount).toBeGreaterThan(0)
    expect(lod.uploadedCount).toBeLessThanOrEqual(50)
    expect(lod.skippedFar).toBeGreaterThanOrEqual(0)
    expect(lod.nearbyPositions.length).toBe(lod.uploadedCount * 3)
  })
})

describe('GPU Mass ECS compute pipeline (cw)', () => {
  it('exposes bind group layout + shader from library', () => {
    const spec = getMassEcsAgentStepShaderSpec()
    expect(spec?.id).toBe('mass-ecs-agent-step-v1')
    expect(spec?.wgsl).toContain('@compute')
    expect(spec?.lane).toBe('mass-ecs-agent-step-preview')
    const desc = buildGpuMassEcsComputePipelineDescriptor(1024)
    expect(desc.layout.bindings.positions).toBe(0)
    expect(desc.layout.bindings.states).toBe(2)
    expect(desc.wgsl).toContain('states')
  })

  it('validates shader library includes mass ecs lane', () => {
    const validation = validateWebGPUComputeShaderLibrary()
    expect(validation.valid).toBe(true)
    expect(validation.shaderCount).toBe(8)
    expect(validation.lanes).toContain('mass-ecs-agent-step-preview')
    expect(
      AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.some((s) => s.id === 'mass-ecs-agent-step-v1'),
    ).toBe(true)
  })

  it('readiness snapshot exposes mass ecs lane when compute available', () => {
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
    expect(snapshot.availableLanes).toContain('mass-ecs-agent-step-preview')
  })
})

describe('GPU Mass ECS readiness gate (cw)', () => {
  it('HELD without soak even when WebGPU compute flags true', () => {
    const plan = planGpuMassEcs({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(plan.gpuMassEcsReady).toBe(false)
    expect(plan.backend).toBe('cpu-soa-fallback')
    expect(plan.heldReason).toContain('HELD')
    expect(plan.mass100kClaimReady).toBe(false)
  })

  it('Law XV GT730 score 12 forces CPU fallback', () => {
    const plan = planGpuMassEcs({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 12,
      soakPassed: true,
      soakFramesProven: 32,
    })
    expect(plan.capabilityScore).toBe(12)
    expect(plan.capabilityScore).toBeLessThan(GPU_MASS_ECS_MIN_CAPABILITY_SCORE)
    expect(plan.gpuMassEcsReady).toBe(false)
    expect(plan.backend).toBe('cpu-soa-fallback')
    expect(plan.notes.join(' ')).toContain('GT730')
  })

  it('flips gpuMassEcsReady after synthetic 1k soak within budget', () => {
    const device = createMockGpuMassEcsDevice({ supportDispatch: true })
    const soak = runGpuMassEcsComputeSoak({
      frames: 4,
      agentCount: 1_000,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      device,
      stepBudgetMs: 200,
    })
    expect(soak.passed).toBe(true)
    expect(soak.dispatches).toBe(4)
    expect(soak.gpuMassEcsReady).toBe(true)
    expect(soak.mass100kClaimReady).toBe(false)
    expect(soak.unrealMassParityReady).toBe(false)
    expect(soak.agentCount).toBe(1_000)

    const honesty = probeGpuMassEcsHonesty({
      soak,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(honesty.gpuMassEcsReady).toBe(true)
    expect(honesty.mass100kClaimReady).toBe(false)
    expect(honesty.mass100kClaimHeld).toBe(true)
  })

  it('10k synthetic step budget soak + LOD interest path', () => {
    const device = createMockGpuMassEcsDevice()
    const soak = ensureGpuMassEcsSoak({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 60,
      device,
      frames: 2,
      agentCount: 10_000,
      stepBudgetMs: 500,
    })
    expect(soak.passed).toBe(true)
    expect(soak.gpuMassEcsReady).toBe(true)
    expect(soak.mass100kClaimReady).toBe(false)
    expect(soak.agentCount).toBe(10_000)

    const buffers = createMassAgentSoaBuffers(512)
    fillSyntheticMassCrowd(buffers, 256)
    const stepped = stepMassEcsGpuOrCpu({
      buffers,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 60,
      soakPassed: true,
      device,
      camera: { x: 0, y: 0, z: 0 },
      lodRadius: 20,
    })
    expect(stepped.mass100kClaimReady).toBe(false)
    expect(stepped.lod.uploadedCount).toBeGreaterThan(0)

    const report = probeMassEcsHonesty({
      soak,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 60,
    })
    expect(report.gpuMassEcsReady).toBe(true)
    expect(report.mass100kClaimReady).toBe(false)
    expect(report.coinsReady).toBe(false)
    expect(report.agonesReady).toBe(false)
  })
})
