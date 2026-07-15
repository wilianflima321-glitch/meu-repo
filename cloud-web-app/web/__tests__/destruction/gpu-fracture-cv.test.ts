/**
 * Letter cv — GPU hierarchical fracture + debris soak (Zero-MVP honesty).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import * as THREE from 'three'
import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  validateWebGPUComputeShaderLibrary,
} from '@aethel/runtime/webgpu-compute-shader-library'
import { buildWebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import { buildWebGPUPerformanceTraceSummary } from '@aethel/runtime/webgpu-performance-trace'
import {
  GPU_FRACTURE_LETTER,
  GPU_FRACTURE_WIRED,
  GPU_FRACTURE_MIN_CAPABILITY_SCORE,
  CHAOS_PARITY_READY,
  CHAOS_PARITY_HELD,
  CHAOS_PARITY_MARKETING_ALLOWED,
  planGpuFracture,
  buildGpuFractureComputePipelineDescriptor,
  runGpuFractureComputeSoak,
  fractureAndIntegrate,
  createMockGpuFractureDevice,
  probeGpuFractureHonesty,
  probeDestructionHonesty,
  getEntropyFractureDebrisShaderSpec,
  configureGpuFractureContext,
  ensureGpuFractureSoak,
  buildHierarchicalVoronoiPlan,
  resolveHeroRapierBudget,
  selectHeroFragmentsForRapier,
} from '@/lib/destruction'

const BASE_LIMITS = {
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupStorageSize: 32 * 1024,
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
  maxBufferSize: 256 * 1024 * 1024,
}

function buildReviewedTrace() {
  return buildWebGPUPerformanceTraceSummary({
    traceRef: 'evidence://webgpu/gpu-fracture-cv',
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
  configureGpuFractureContext(null)
})

describe('GPU Fracture flags (cv)', () => {
  it('wires letter cv modules and keeps Chaos parity HELD', () => {
    expect(GPU_FRACTURE_LETTER).toBe('cv')
    expect(GPU_FRACTURE_WIRED).toBe(true)
    expect(CHAOS_PARITY_READY).toBe(false)
    expect(CHAOS_PARITY_HELD).toBe(true)
    expect(CHAOS_PARITY_MARKETING_ALLOWED).toBe(false)
  })
})

describe('Hierarchical Voronoi plan (cv)', () => {
  it('builds multi-level plan with hero/debris/dust tiers', () => {
    const bounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1))
    const plan = buildHierarchicalVoronoiPlan({
      bounds,
      impactPoint: new THREE.Vector3(0, 0.5, 0),
      impactForce: 40,
      levels: 2,
      fragmentsPerLevel: 8,
      seed: 7,
      maxHeroFragments: 4,
    })
    expect(plan.letter).toBe('cv')
    expect(plan.fortune3d).toBe('HELD')
    expect(plan.entries.length).toBeGreaterThan(0)
    expect(plan.heroCount).toBeGreaterThan(0)
    expect(plan.debrisCount + plan.dustCount).toBeGreaterThan(0)
  })

  it('Law XV GT730 hero budget is zero', () => {
    const budget = resolveHeroRapierBudget(12)
    expect(budget.maxHeroFragments).toBe(0)
    expect(budget.rapierHeroesAllowed).toBe(false)
    expect(budget.notes.join(' ')).toContain('GT730')
    expect(selectHeroFragmentsForRapier([{ tier: 'hero' }, { tier: 'debris' }], budget)).toEqual([])
  })
})

describe('GPU Fracture compute pipeline (cv)', () => {
  it('exposes bind group layout + shader from library', () => {
    const spec = getEntropyFractureDebrisShaderSpec()
    expect(spec?.id).toBe('entropy-fracture-debris-v1')
    expect(spec?.wgsl).toContain('@compute')
    expect(spec?.lane).toBe('entropy-fracture-debris-preview')
    const desc = buildGpuFractureComputePipelineDescriptor(64)
    expect(desc.layout.bindings.positions).toBe(0)
    expect(desc.layout.bindings.velocities).toBe(1)
    expect(desc.wgsl).toContain('positions')
  })

  it('validates shader library includes fracture debris lane', () => {
    const validation = validateWebGPUComputeShaderLibrary()
    expect(validation.valid).toBe(true)
    expect(validation.shaderCount).toBe(8)
    expect(validation.lanes).toContain('entropy-fracture-debris-preview')
    expect(
      AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.some((s) => s.id === 'entropy-fracture-debris-v1'),
    ).toBe(true)
  })

  it('readiness snapshot exposes fracture debris lane when compute available', () => {
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
    expect(snapshot.availableLanes).toContain('entropy-fracture-debris-preview')
  })
})

describe('GPU Fracture readiness gate (cv)', () => {
  it('HELD without soak even when WebGPU compute flags true', () => {
    const plan = planGpuFracture({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(plan.gpuFractureReady).toBe(false)
    expect(plan.backend).toBe('cpu-debris-fallback')
    expect(plan.heldReason).toContain('HELD')
    expect(plan.chaosParityReady).toBe(false)
  })

  it('Law XV GT730 score 12 forces CPU fallback', () => {
    const plan = planGpuFracture({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 12,
      soakPassed: true,
      soakFramesProven: 32,
    })
    expect(plan.capabilityScore).toBe(12)
    expect(plan.capabilityScore).toBeLessThan(GPU_FRACTURE_MIN_CAPABILITY_SCORE)
    expect(plan.gpuFractureReady).toBe(false)
    expect(plan.backend).toBe('cpu-debris-fallback')
    expect(plan.notes.join(' ')).toContain('GT730')
    expect(plan.heroBudget.maxHeroFragments).toBe(0)
  })

  it('flips gpuFractureReady only after mock GPU soak', () => {
    const device = createMockGpuFractureDevice({ supportDispatch: true })
    const soak = runGpuFractureComputeSoak({
      frames: 8,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      device,
      debrisCount: 32,
    })
    expect(soak.passed).toBe(true)
    expect(soak.dispatches).toBe(8)
    expect(soak.gpuFractureReady).toBe(true)
    expect(soak.chaosParityReady).toBe(false)
    expect(soak.peakSpeed ?? 0).toBeGreaterThan(0)

    const plan = planGpuFracture({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      soakPassed: soak.passed,
      soakFramesProven: soak.frames,
    })
    expect(plan.gpuFractureReady).toBe(true)
    expect(plan.backend).toBe('webgpu-compute')
    expect(plan.chaosParityReady).toBe(false)

    const honesty = probeGpuFractureHonesty({
      soak,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(honesty.gpuFractureReady).toBe(true)
    expect(honesty.chaosParityReady).toBe(false)
    expect(honesty.chaosParityHeld).toBe(true)
  })

  it('fractureAndIntegrate + destruction honesty aggregator', () => {
    const device = createMockGpuFractureDevice()
    const soak = ensureGpuFractureSoak({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 55,
      device,
      frames: 4,
      debrisCount: 24,
    })
    expect(soak.gpuFractureReady).toBe(true)

    const bounds = new THREE.Box3(new THREE.Vector3(-2, 0, -2), new THREE.Vector3(2, 2, 2))
    const result = fractureAndIntegrate({
      bounds,
      impactPoint: new THREE.Vector3(0, 1, 0),
      impactForce: 25,
      levels: 2,
      capabilityScore: 55,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      soakPassed: true,
      device,
    })
    expect(result.plan.entries.length).toBeGreaterThan(0)
    expect(result.heroBudget.maxHeroFragments).toBeGreaterThan(0)
    expect(result.integrate.chaosParityReady).toBe(false)

    const report = probeDestructionHonesty({
      soak,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 55,
    })
    expect(report.gpuFractureReady).toBe(true)
    expect(report.chaosParityReady).toBe(false)
    expect(report.coinsReady).toBe(false)
    expect(report.naniteReady).toBe(false)
  })
})
