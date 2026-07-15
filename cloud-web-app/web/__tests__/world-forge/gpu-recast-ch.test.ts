/**
 * Letter ch — WebGPU GPU Recast heightfield→walkable soak (Zero-MVP honesty).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  validateWebGPUComputeShaderLibrary,
} from '@aethel/runtime/webgpu-compute-shader-library'
import { buildWebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import { buildWebGPUPerformanceTraceSummary } from '@aethel/runtime/webgpu-performance-trace'
import { bakeSdfParamsToHeightfield } from '@/lib/world-forge/sdf-fractal-sculpt'
import {
  GPU_RECAST_LETTER,
  GPU_RECAST_NAVMESH_WIRED,
  GPU_RECAST_MIN_CAPABILITY_SCORE,
  NAVMESH_UNREAL_RECAST_PARITY_READY,
  NAVMESH_UNREAL_RECAST_PARITY_HELD,
  planGpuRecastNavMesh,
  computeWalkableCellsCpu,
  buildGpuRecastComputePipelineDescriptor,
  runGpuRecastComputeSoak,
  rebuildNavMeshGpuOrCpu,
  createMockGpuRecastDevice,
  probeGpuRecastHonesty,
  getNavMeshHeightfieldWalkableShaderSpec,
} from '@/lib/world-forge/gpu-recast-navmesh'
import { navMeshHasWalkablePath, NAVMESH_GPU_RECAST_READY } from '@/lib/world-forge/navmesh-rebuild'
import { runWorldForgeConveyor } from '@/lib/world-forge/world-forge-conveyor'
import { probeWorldForgeHonesty } from '@/lib/world-forge/world-forge-honesty'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'

const BASE_LIMITS = {
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupStorageSize: 32 * 1024,
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
  maxBufferSize: 256 * 1024 * 1024,
}

function buildReviewedTrace() {
  return buildWebGPUPerformanceTraceSummary({
    traceRef: 'evidence://webgpu/gpu-recast-ch',
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
  __resetCreativeFusionTransactionsForTests()
})

describe('GPU Recast flags (ch)', () => {
  it('wires letter ch modules and keeps Unreal Recast parity HELD', () => {
    expect(GPU_RECAST_LETTER).toBe('ch')
    expect(GPU_RECAST_NAVMESH_WIRED).toBe(true)
    expect(NAVMESH_UNREAL_RECAST_PARITY_READY).toBe(false)
    expect(NAVMESH_UNREAL_RECAST_PARITY_HELD).toBe(true)
    expect(NAVMESH_GPU_RECAST_READY).toBe(false)
  })
})

describe('GPU Recast walkable math (ch)', () => {
  it('CPU reference produces walkable cells from SDF heightfield', () => {
    const baked = bakeSdfParamsToHeightfield({
      prompt: 'rolling hills meadow',
      seed: 11,
      resolution: 33,
    })
    const { cells, walkableCount, resolution } = computeWalkableCellsCpu({
      heightfield: baked.heightfield,
      resolution: 24,
    })
    expect(resolution).toBe(24)
    expect(walkableCount).toBeGreaterThan(0)
    expect(cells.length).toBe(24 * 24)
  })
})

describe('GPU Recast compute pipeline (ch)', () => {
  it('exposes bind group layout + shader from library', () => {
    const spec = getNavMeshHeightfieldWalkableShaderSpec()
    expect(spec?.id).toBe('navmesh-heightfield-walkable-v1')
    expect(spec?.wgsl).toContain('@compute')
    expect(spec?.lane).toBe('navmesh-heightfield-walkable-preview')
    const desc = buildGpuRecastComputePipelineDescriptor(65 * 65, 32 * 32)
    expect(desc.layout.bindings.heights).toBe(0)
    expect(desc.layout.bindings.walkable).toBe(2)
    expect(desc.wgsl).toContain('sample_height')
  })

  it('validates shader library includes navmesh lane', () => {
    const validation = validateWebGPUComputeShaderLibrary()
    expect(validation.valid).toBe(true)
    expect(validation.shaderCount).toBe(8)
    expect(validation.lanes).toContain('navmesh-heightfield-walkable-preview')
    expect(
      AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.some((s) => s.id === 'navmesh-heightfield-walkable-v1'),
    ).toBe(true)
  })

  it('readiness snapshot exposes navmesh lane when compute available', () => {
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
    expect(snapshot.availableLanes).toContain('navmesh-heightfield-walkable-preview')
  })
})

describe('GPU Recast readiness gate (ch)', () => {
  it('HELD without soak even when WebGPU compute flags true', () => {
    const plan = planGpuRecastNavMesh({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(plan.gpuRecastReady).toBe(false)
    expect(plan.backend).toBe('cpu-grid-fallback')
    expect(plan.heldReason).toContain('HELD')
    expect(plan.unrealRecastParityReady).toBe(false)
  })

  it('Law XV GT730 score 12 forces CPU fallback', () => {
    const plan = planGpuRecastNavMesh({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 12,
      soakPassed: true,
      soakFramesProven: 32,
    })
    expect(plan.capabilityScore).toBe(12)
    expect(plan.capabilityScore).toBeLessThan(GPU_RECAST_MIN_CAPABILITY_SCORE)
    expect(plan.gpuRecastReady).toBe(false)
    expect(plan.backend).toBe('cpu-grid-fallback')
    expect(plan.notes.join(' ')).toContain('GT730')
  })

  it('flips gpuRecastReady only after mock GPU soak', () => {
    const device = createMockGpuRecastDevice({ supportDispatch: true })
    const soak = runGpuRecastComputeSoak({
      frames: 8,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      device,
      resolution: 16,
    })
    expect(soak.passed).toBe(true)
    expect(soak.dispatches).toBe(8)
    expect(soak.gpuRecastReady).toBe(true)
    expect(soak.unrealRecastParityReady).toBe(false)
    expect(soak.walkableCount).toBeGreaterThan(0)

    const plan = planGpuRecastNavMesh({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      soakPassed: soak.passed,
      soakFramesProven: soak.frames,
    })
    expect(plan.gpuRecastReady).toBe(true)
    expect(plan.backend).toBe('webgpu-compute')

    const honesty = probeGpuRecastHonesty({
      soak,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(honesty.gpuRecastReady).toBe(true)
    expect(honesty.unrealRecastParityReady).toBe(false)
    expect(honesty.unrealRecastParityHeld).toBe(true)
  })
})

describe('GPU Recast rebuild + conveyor (ch)', () => {
  it('rebuilds via GPU path after soak + device', () => {
    const baked = bakeSdfParamsToHeightfield({
      prompt: 'temperate forest plateau',
      seed: 19,
      resolution: 33,
    })
    const device = createMockGpuRecastDevice({ supportDispatch: true })
    const soak = runGpuRecastComputeSoak({
      frames: 4,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 55,
      device,
      heightfield: baked.heightfield,
      resolution: 24,
    })
    expect(soak.passed).toBe(true)

    const result = rebuildNavMeshGpuOrCpu({
      heightfield: baked.heightfield,
      resolution: 24,
      capabilityScore: 55,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      soakPassed: true,
      soakFramesProven: soak.frames,
      device,
    })
    expect(result.gpuRecastReady).toBe(true)
    expect(result.backend).toBe('webgpu-compute')
    expect(result.navmesh.backend).toBe('webgpu-compute')
    expect(result.navmesh.walkableCount).toBeGreaterThan(0)
    expect(result.receipt.status).toBe('closed')
    expect(result.receipt.evidence).toContain('webgpu-compute')
    expect(result.receipt.evidence).toContain('unreal-recast-parity-held')

    const walkables = result.navmesh.cells.filter((c) => c.walkable)
    const a = walkables[0]!
    const b = walkables[Math.min(walkables.length - 1, 4)]!
    expect(navMeshHasWalkablePath(result.navmesh, { x: a.x, z: a.z }, { x: b.x, z: b.z })).toBe(
      true,
    )
  })

  it('GT730 conveyor stays CPU Zero-UI with gpuRecastReady false', async () => {
    const store = createMemoryFusionScopeStore()
    const device = createMockGpuRecastDevice({ supportDispatch: true })
    const result = await runWorldForgeConveyor({
      projectId: 'proj-ch-gt730',
      userId: 'user-ch',
      prompt: 'abyss peaks temperate forest',
      seed: 7,
      capabilityScore: 12,
      fusionStore: store,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      gpuRecastSoakPassed: true,
      gpuRecastSoakFrames: 8,
      gpuDevice: device,
    })
    expect(result.success).toBe(true)
    expect(result.zeroUi).toBe(true)
    expect(result.gpuRecastReady).toBe(false)
    expect(result.unrealRecastParityReady).toBe(false)
    expect(result.navmesh?.walkableCount).toBeGreaterThan(0)
    expect(result.navmesh?.backend).toBe('cpu-grid')
  })

  it('conveyor wires GPU rebuild after gen when soak+adapter present', async () => {
    const store = createMemoryFusionScopeStore()
    const device = createMockGpuRecastDevice({ supportDispatch: true })
    const result = await runWorldForgeConveyor({
      projectId: 'proj-ch-gpu',
      userId: 'user-ch',
      prompt: 'rolling hills meadow ruins',
      seed: 42,
      capabilityScore: 75,
      fusionStore: store,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      gpuRecastSoakPassed: true,
      gpuRecastSoakFrames: 8,
      gpuDevice: device,
    })
    expect(result.success).toBe(true)
    expect(result.gpuRecastReady).toBe(true)
    expect(result.unrealRecastParityReady).toBe(false)
    expect(result.navmesh?.backend).toBe('webgpu-compute')
    expect(result.navmesh?.walkableCount).toBeGreaterThan(0)
    expect(result.stages.some((s) => s.stage === 'navmesh-rebuild' && s.status === 'closed')).toBe(
      true,
    )
    expect(
      result.stages.some(
        (s) =>
          s.stage === 'navmesh-rebuild' && s.evidence.includes('webgpu-compute'),
      ),
    ).toBe(true)
  })

  it('honesty flips gpuRecastReady only with soak; Unreal parity stays false', () => {
    const without = probeWorldForgeHonesty({
      sdfProven: true,
      navmeshProven: true,
      conveyorProven: true,
    })
    expect(without.gpuRecastReady).toBe(false)
    expect(without.unrealRecastParityReady).toBe(false)
    expect(without.modules.gpuRecast).toBe(true)

    const device = createMockGpuRecastDevice({ supportDispatch: true })
    const soak = runGpuRecastComputeSoak({
      frames: 4,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 50,
      device,
    })
    const withSoak = probeWorldForgeHonesty({
      sdfProven: true,
      navmeshProven: true,
      conveyorProven: true,
      gpuRecastSoak: soak,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 50,
    })
    expect(withSoak.gpuRecastReady).toBe(true)
    expect(withSoak.unrealRecastParityReady).toBe(false)
    expect(withSoak.notes.join(' ')).toContain('Unreal Recast')
  })
})
