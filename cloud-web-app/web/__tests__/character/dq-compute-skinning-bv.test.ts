/**
 * Letter bv — WebGPU Dual Quaternion Skinning soak (Zero-MVP honesty).
 */

import { describe, expect, it } from 'vitest'
import {
  AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY,
  validateWebGPUComputeShaderLibrary,
} from '@aethel/runtime/webgpu-compute-shader-library'
import { buildWebGPUComputeReadinessSnapshot } from '@aethel/runtime/webgpu-compute-readiness'
import { buildWebGPUPerformanceTraceSummary } from '@aethel/runtime/webgpu-performance-trace'
import {
  DQ_COMPUTE_SKINNING_LETTER,
  DQ_COMPUTE_SKINNING_WIRED,
  DQ_COMPUTE_MIN_CAPABILITY_SCORE,
  bonePoseToDualQuaternion,
  packMotionMatchingBonesToDualQuaternions,
  packDualQuaternionsToFloat32,
  motionMatchingBonesToPoseSamples,
  planDualQuaternionSkinning,
  skinVertexCpu,
  buildDualQuaternionComputePipelineDescriptor,
  runDualQuaternionComputeSoak,
  createMockDualQuaternionGpuDevice,
  probeDualQuaternionComputeHonesty,
  getDualQuaternionSkinShaderSpec,
} from '@/lib/character/dual-quaternion-skinning'
import {
  createDualQuaternionViewportWire,
  DQ_VIEWPORT_WIRE_WIRED,
} from '@/lib/character/dq-viewport-wire'
import { createCharacterTopologyBus } from '@/lib/character/character-topology-bus'
import { probeCharacterTopologyHonesty } from '@/lib/character/character-topology-honesty'

const BASE_LIMITS = {
  maxComputeInvocationsPerWorkgroup: 256,
  maxComputeWorkgroupStorageSize: 32 * 1024,
  maxStorageBufferBindingSize: 128 * 1024 * 1024,
  maxBufferSize: 256 * 1024 * 1024,
}

function buildReviewedTrace() {
  return buildWebGPUPerformanceTraceSummary({
    traceRef: 'evidence://webgpu/dq-skin-bv',
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

describe('DQ compute flags (bv)', () => {
  it('wires letter bv modules', () => {
    expect(DQ_COMPUTE_SKINNING_LETTER).toBe('bv')
    expect(DQ_COMPUTE_SKINNING_WIRED).toBe(true)
    expect(DQ_VIEWPORT_WIRE_WIRED).toBe(true)
  })
})

describe('DQ math (bv)', () => {
  it('converts bone pose and packs float32 buffer', () => {
    const dq = bonePoseToDualQuaternion({
      boneIndex: 0,
      rotation: [0, 0, 0, 1],
      position: [2, 0, 0],
    })
    expect(dq.real[3]).toBeCloseTo(1)
    expect(Math.abs(dq.dual[0])).toBeGreaterThan(0)
    const packed = packDualQuaternionsToFloat32([dq])
    expect(packed).toHaveLength(8)
    expect(packed[3]).toBeCloseTo(1)
  })

  it('adapts Motion Matching bone map to SOA order samples', () => {
    const names = ['Hips', 'Spine']
    const map = new Map([
      ['Hips', { position: { x: 0, y: 1, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 } }],
      ['Spine', { position: { x: 0, y: 1.2, z: 0 }, rotation: { x: 0, y: 0.707, z: 0, w: 0.707 } }],
    ])
    const samples = motionMatchingBonesToPoseSamples(names, map)
    expect(samples).toHaveLength(2)
    expect(samples[0]!.boneIndex).toBe(0)
    expect(samples[1]!.position[1]).toBeCloseTo(1.2)
    const dqs = packMotionMatchingBonesToDualQuaternions(samples)
    expect(dqs).toHaveLength(2)
  })

  it('CPU skins vertex with blended DQs', () => {
    const bones = packMotionMatchingBonesToDualQuaternions([
      { boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 0, 0] },
      { boneIndex: 1, rotation: [0, 0, 0, 1], position: [1, 0, 0] },
    ])
    const out = skinVertexCpu(
      {
        position: [0, 0, 0],
        normal: [0, 1, 0],
        boneIndices: [0, 1, 0, 0],
        boneWeights: [0.5, 0.5, 0, 0],
      },
      bones,
    )
    expect(out.position[0]).toBeCloseTo(0.5, 5)
    expect(out.normal[1]).toBeCloseTo(1, 5)
  })
})

describe('DQ compute pipeline descriptor (bv)', () => {
  it('exposes bind group layout + shader from library', () => {
    const spec = getDualQuaternionSkinShaderSpec()
    expect(spec?.id).toBe('dual-quaternion-skin-v1')
    expect(spec?.wgsl).toContain('@compute')
    expect(spec?.lane).toBe('dual-quaternion-skinning-preview')
    const desc = buildDualQuaternionComputePipelineDescriptor(4, 128)
    expect(desc.layout.bindings.boneDqs).toBe(0)
    expect(desc.layout.bindings.skinnedOutput).toBe(2)
    expect(desc.boneDqFloatCount).toBe(32)
    expect(desc.wgsl).toContain('bone_dqs')
  })

  it('validates shader library includes DQ lane', () => {
    const validation = validateWebGPUComputeShaderLibrary()
    expect(validation.valid).toBe(true)
    expect(validation.shaderCount).toBe(8)
    expect(validation.lanes).toContain('dual-quaternion-skinning-preview')
    expect(validation.lanes).toContain('navmesh-heightfield-walkable-preview')
    expect(
      AETHEL_WEBGPU_COMPUTE_SHADER_LIBRARY.some((s) => s.id === 'dual-quaternion-skin-v1'),
    ).toBe(true)
  })

  it('readiness snapshot exposes DQ skinning lane when compute available', () => {
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
    expect(snapshot.availableLanes).toContain('dual-quaternion-skinning-preview')
  })
})

describe('DQ readiness gate (bv)', () => {
  it('HELD without soak even when WebGPU compute flags true', () => {
    const plan = planDualQuaternionSkinning({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      bonePoses: [{ boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 0, 0] }],
      capabilityScore: 40,
    })
    expect(plan.dqComputeSkinningReady).toBe(false)
    expect(plan.gpuComputeSkinning).toBe(false)
    expect(plan.heldReason).toContain('HELD')
  })

  it('Law XV GT730 score 12 forces CPU fallback', () => {
    const plan = planDualQuaternionSkinning({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      bonePoses: [{ boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 0, 0] }],
      capabilityScore: 12,
      soakPassed: true,
      soakFramesProven: 32,
    })
    expect(plan.capabilityScore).toBe(12)
    expect(plan.capabilityScore).toBeLessThan(DQ_COMPUTE_MIN_CAPABILITY_SCORE)
    expect(plan.dqComputeSkinningReady).toBe(false)
    expect(plan.backend).toBe('cpu-fallback')
    expect(plan.notes.join(' ')).toContain('GT730')
  })

  it('flips dqComputeSkinningReady only after mock GPU soak', () => {
    const device = createMockDualQuaternionGpuDevice({ supportDispatch: true })
    const soak = runDualQuaternionComputeSoak({
      frames: 8,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      device,
    })
    expect(soak.passed).toBe(true)
    expect(soak.dispatches).toBe(8)
    expect(soak.dqComputeSkinningReady).toBe(true)
    expect(soak.aaaSkinningMarketingAllowed).toBe(false)

    const plan = planDualQuaternionSkinning({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      bonePoses: [{ boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 1, 0] }],
      capabilityScore: 40,
      soakPassed: soak.passed,
      soakFramesProven: soak.frames,
    })
    expect(plan.backend).toBe('webgpu-compute')
    expect(plan.dqComputeSkinningReady).toBe(true)
    expect(plan.gpuComputeSkinning).toBe(true)
  })

  it('honest fallback when no device — soak fails closed', () => {
    const soak = runDualQuaternionComputeSoak({
      frames: 8,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      device: null,
    })
    expect(soak.passed).toBe(false)
    expect(soak.dqComputeSkinningReady).toBe(false)
    expect(soak.aaaSkinningMarketingAllowed).toBe(false)
  })
})

describe('DQ viewport + topology bus (bv)', () => {
  it('viewport wire soaks then ticks with ready plan', () => {
    const device = createMockDualQuaternionGpuDevice()
    const wire = createDualQuaternionViewportWire({
      capabilityScore: 45,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      device,
    })
    const soak = wire.ensureSoak(4)
    expect(soak.passed).toBe(true)
    const tick = wire.tick([{ boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 0, 0] }])
    expect(tick.plan.dqComputeSkinningReady).toBe(true)
    expect(tick.framesWithCompute).toBe(1)
    expect(tick.aaaSkinningMarketingAllowed).toBe(false)
  })

  it('topology bus plans HELD without soak; ready after soak', () => {
    const device = createMockDualQuaternionGpuDevice()
    const bus = createCharacterTopologyBus({
      capabilityScore: 40,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      dqGpuDevice: device,
    })
    const before = bus.planDqSkinning([
      { boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 0, 0] },
    ])
    expect(before.dqComputeSkinningReady).toBe(false)
    const soak = bus.runDqComputeSoak(4)
    expect(soak.passed).toBe(true)
    const after = bus.planDqSkinning([
      { boneIndex: 0, rotation: [0, 0, 0, 1], position: [0, 0, 0] },
    ])
    expect(after.dqComputeSkinningReady).toBe(true)
    expect(bus.isDqComputeSkinningReady()).toBe(true)
  })
})

describe('DQ honesty aggregate (bv)', () => {
  it('probe reports held without soak; ready with soak; no AAA marketing', () => {
    const held = probeDualQuaternionComputeHonesty({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
    })
    expect(held.dqComputeSkinningReady).toBe(false)
    expect(held.held).toBe(true)
    expect(held.aaaSkinningMarketingAllowed).toBe(false)

    const device = createMockDualQuaternionGpuDevice()
    const soak = runDualQuaternionComputeSoak({
      frames: 4,
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      device,
    })
    const ready = probeDualQuaternionComputeHonesty({
      webgpuAvailable: true,
      webgpuComputeAvailable: true,
      capabilityScore: 40,
      soak,
    })
    expect(ready.dqComputeSkinningReady).toBe(true)
    expect(ready.held).toBe(false)
    expect(ready.aaaSkinningMarketingAllowed).toBe(false)

    const topology = probeCharacterTopologyHonesty({
      webgpuComputeAvailable: true,
      dqSoak: soak,
      capabilityScore: 40,
    })
    expect(topology.dualQuaternionSkinning.dqComputeSkinningReady).toBe(true)
    expect(topology.dualQuaternionSkinning.held).toBe(false)
    expect(topology.gasClientPrediction.ggpoLiveMarketingAllowed).toBe(false)
  })
})
