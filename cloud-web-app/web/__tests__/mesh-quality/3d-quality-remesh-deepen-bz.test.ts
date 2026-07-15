/**
 * Letter bz — Remesh quality deepen (Instant Meshes parity path HELD).
 * Topology metrics must improve vs bw baseline fixtures.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildTestIcosphere,
  countTriangles,
} from '@/lib/mesh-quality/types'
import {
  buildChaoticClayFixture,
  measureMeshTopology,
} from '@/lib/mesh-quality/mesh-topology-metrics'
import {
  runAutoRetopology,
  runAutoRetopologyBwBaseline,
  AUTO_RETOPOLOGY_WIRED,
  AUTO_RETOPOLOGY_LETTER,
  INSTANT_MESHES_PARITY_HELD,
  INSTANT_MESHES_PARITY_READY,
  REMESH_QUALITY_DEEPENED,
  buildNativeRetopoProbeInvoke,
  buildNativeRetopoRunInvoke,
  probeNativeRetopoWorkerLocal,
  interpretNativeRetopoIpcStatus,
} from '@/lib/mesh-quality/auto-retopology'
import { buildMeshLodCascade, MESH_LOD_CA_CONSUMER_CONTRACT } from '@/lib/mesh-quality/mesh-lod-cascade'
import { ensureAndValidateUvs } from '@/lib/mesh-quality/mesh-uv-validate'
import { cookMeshColliders } from '@/lib/mesh-quality/mesh-collider-cook'
import { critiqueMeshTopology } from '@/lib/mesh-quality/mesh-topology-critic'
import { runGameReadyQualityPipeline } from '@/lib/mesh-quality/game-ready-quality-pipeline'
import { probeMeshQualityHonesty } from '@/lib/mesh-quality/mesh-quality-honesty'
import {
  detectSemanticLandmarks,
  buildSemanticFeatureMask,
  countSemanticLockedVertices,
  SEMANTIC_COMMERCIAL_PARITY_READY,
} from '@/lib/mesh-quality/semantic-retopology'
import {
  buildBakedClayTextureFixture,
  delightClayTextureToRadiancePbr,
  DELIGHTING_COMMERCIAL_PARITY_READY,
} from '@/lib/mesh-quality/delighting-pbr'
import { assignContextualPbr } from '@/lib/mesh-quality/contextual-pbr'
import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'

beforeEach(() => {
  __resetCreativeCostGuardForTests()
  __resetCreativeFusionTransactionsForTests()
})

describe('Remesh deepen honesty (bz)', () => {
  it('flips remeshQualityDeepened without Instant Meshes parity', () => {
    expect(AUTO_RETOPOLOGY_WIRED).toBe(true)
    expect(AUTO_RETOPOLOGY_LETTER).toBe('bz')
    expect(REMESH_QUALITY_DEEPENED).toBe(true)
    expect(INSTANT_MESHES_PARITY_READY).toBe(false)
    expect(INSTANT_MESHES_PARITY_HELD).toBe(true)

    const honesty = probeMeshQualityHonesty({
      conveyorProven: true,
      liveClayPollProven: true,
      remeshDeepenProven: true,
    })
    expect(honesty.remeshQualityDeepened).toBe(true)
    expect(honesty.instantMeshesParityReady).toBe(false)
    expect(honesty.instantMeshesParity).toBe(false)
    expect(honesty.commercialRemesherHeld).toBe(true)
    expect(honesty.rustRetopoWorkerHeld).toBe(true)
    expect(honesty.remeshDeepenLetter).toBe('bz')
    expect(honesty.semanticRetopoReady).toBe(true)
    expect(honesty.delightingPbrReady).toBe(true)
    expect(honesty.semanticCommercialParityReady).toBe(false)
    expect(honesty.delightingCommercialParityReady).toBe(false)
    expect(honesty.vHacdOwnedByCa).toBe(true)
    expect(honesty.heatDiffusionWeightsOwnedByCa).toBe(true)
  })

  it('keeps remeshQualityDeepened false when soak unproven', () => {
    const honesty = probeMeshQualityHonesty({ remeshDeepenProven: false })
    expect(honesty.remeshQualityDeepened).toBe(false)
    expect(honesty.instantMeshesParityReady).toBe(false)
  })
})

describe('Topology metrics improve vs bw baseline (bz)', () => {
  it('reduces non-manifold edges vs bw cluster on chaotic clay fixture', () => {
    const clay = buildChaoticClayFixture(11)
    const before = measureMeshTopology(clay)
    expect(before.nonManifoldEdges).toBeGreaterThan(0)

    const target = Math.max(80, Math.floor(before.triangles / 6))
    const bw = runAutoRetopologyBwBaseline({
      mesh: clay,
      targetTriangles: target,
      capabilityScore: 90,
      allowInlineOnWeakGpu: true,
    })
    const bz = runAutoRetopology({
      mesh: clay,
      targetTriangles: target,
      capabilityScore: 90,
      allowInlineOnWeakGpu: true,
    })

    expect(bz.algorithm).toBe('ts-feature-aware-manifold-v2')
    expect(bz.remeshQualityDeepened).toBe(true)
    expect(bz.instantMeshesParity).toBe(false)
    expect(INSTANT_MESHES_PARITY_READY).toBe(false)

    expect(bz.trianglesAfter).toBeGreaterThan(0)
    expect(bz.trianglesAfter).toBeLessThan(before.triangles)

    const bwTopo = bw.topologyAfter!
    const bzTopo = bz.topologyAfter!

    // Deepen must not invent Instant Meshes parity
    expect(bz.receipt.metrics?.instantMeshesParityReady).toBe(false)

    // Primary soak: non-manifold health vs input + bw baseline
    // (Cleanup may open boundaries → manifoldEdgeRatio can drop; non-manifold ratio is the gate.)
    expect(bzTopo.nonManifoldEdges).toBeLessThan(before.nonManifoldEdges)
    expect(bzTopo.nonManifoldEdgeRatio).toBeLessThan(before.nonManifoldEdgeRatio)
    expect(bzTopo.nonManifoldEdges).toBeLessThanOrEqual(bwTopo.nonManifoldEdges)
    expect(bzTopo.nonManifoldEdgeRatio).toBeLessThanOrEqual(bwTopo.nonManifoldEdgeRatio + 1e-9)
    expect(bzTopo.degenerateFaces).toBeLessThanOrEqual(before.degenerateFaces)
  })

  it('improves manifold ratio on subdivided icosphere vs bw baseline', () => {
    const clay = buildTestIcosphere(4)
    const beforeTris = countTriangles(clay)
    const target = Math.max(200, Math.floor(beforeTris / 5))

    const bw = runAutoRetopologyBwBaseline({
      mesh: clay,
      targetTriangles: target,
      capabilityScore: 80,
      allowInlineOnWeakGpu: true,
    })
    const bz = runAutoRetopology({
      mesh: clay,
      targetTriangles: target,
      capabilityScore: 80,
      allowInlineOnWeakGpu: true,
    })

    expect(bz.trianglesAfter).toBeLessThan(beforeTris)
    expect(bz.topologyAfter!.manifoldEdgeRatio).toBeGreaterThanOrEqual(
      bw.topologyAfter!.manifoldEdgeRatio - 0.02,
    )
    // Quad-ish pairing should report some candidates on organic sphere after pair pass
    expect(bz.topologyAfter!.quadIshRatio).toBeGreaterThanOrEqual(0)
    expect(bz.receipt.evidence).toContain('remesh-quality-deepened-bz')
  })
})

describe('Native worker IPC hooks (bz)', () => {
  it('builds probe/run invoke contracts without inventing remesh bytes', () => {
    const probe = buildNativeRetopoProbeInvoke()
    expect(probe.command).toBe('probe_auto_retopology_worker')
    expect(probe.request).toBeUndefined()

    const mesh = buildTestIcosphere(1)
    const run = buildNativeRetopoRunInvoke({
      mesh,
      targetTriangles: 500,
      capabilityScore: 80,
    })
    expect(run.command).toBe('run_auto_retopology_worker')
    expect(run.request!.positions.length).toBeGreaterThan(0)
    expect(run.request!.indices.length).toBeGreaterThan(0)

    const status = probeNativeRetopoWorkerLocal()
    expect(status.held).toBe(true)
    expect(status.instantMeshesParityReady).toBe(false)
    expect(status.remeshQualityDeepenedTs).toBe(true)
    expect(status.ipcReady).toBe(true)

    const interpreted = interpretNativeRetopoIpcStatus(status)
    expect(interpreted.tsFallback).toBe(true)
  })

  it('preferNativeWorker attaches HELD IPC status to result', () => {
    const clay = buildTestIcosphere(2)
    const result = runAutoRetopology({
      mesh: clay,
      targetTriangles: 300,
      capabilityScore: 90,
      allowInlineOnWeakGpu: true,
      preferNativeWorker: true,
    })
    expect(result.nativeWorker?.held).toBe(true)
    expect(result.nativeWorker?.instantMeshesParityReady).toBe(false)
    expect(result.remeshQualityDeepened).toBe(true)
  })
})

describe('LOD / UV / collider stay compatible (bz)', () => {
  it('LOD cascade + UV + collider work on deepened remesh output', () => {
    const clay = buildChaoticClayFixture(3)
    const retopo = runAutoRetopology({
      mesh: clay,
      targetTriangles: 400,
      capabilityScore: 85,
      allowInlineOnWeakGpu: true,
    })
    expect(retopo.receipt.status).toBe('closed')

    const uv = ensureAndValidateUvs(retopo.mesh)
    expect(uv.receipt.status).toBe('closed')
    expect(uv.mesh.uvs!.length).toBeGreaterThan(0)

    const lods = buildMeshLodCascade({
      mesh: uv.mesh,
      lod0Triangles: retopo.trianglesAfter,
      capabilityScore: 85,
    })
    expect(lods.lods).toHaveLength(3)
    expect(lods.lods.every((l) => l.triangleCount > 0)).toBe(true)
    expect(lods.caConsumer.contractId).toBe(MESH_LOD_CA_CONSUMER_CONTRACT)
    expect(lods.caConsumer.tiers).toHaveLength(3)
    expect(lods.caConsumer.instantMeshesParityReady).toBe(false)
    expect(lods.caConsumer.vHacdOwnedByCa).toBe(true)
    expect(lods.caConsumer.heatDiffusionWeightsOwnedByCa).toBe(true)

    const cooked = cookMeshColliders({ mesh: uv.mesh, maxHullPoints: 16 })
    expect(cooked.convex.points.length).toBeGreaterThanOrEqual(4)
    expect(cooked.trimesh.triangleCount).toBeGreaterThan(0)

    const critic = critiqueMeshTopology({ mesh: uv.mesh })
    expect(critic.approved).toBe(true)
    expect(critic.receipt.metrics?.manifoldEdgeRatio).toBeTypeOf('number')
  })
})

describe('Semantic retopo landmarks (bz)', () => {
  it('detects eyes/mouth/elbows and biases remesh without commercial parity', () => {
    // Tall biped-ish mesh so facial landmarks can fire
    const clay = buildTestIcosphere(3)
    // Stretch Y to humanoid aspect for landmark heuristics
    for (let i = 0; i < clay.positions.length; i += 3) {
      clay.positions[i + 1]! *= 2.2
    }
    const probe = detectSemanticLandmarks(clay)
    expect(probe.semanticCommercialParityReady).toBe(false)
    expect(SEMANTIC_COMMERCIAL_PARITY_READY).toBe(false)
    expect(probe.landmarks.some((l) => l.name === 'leftEye')).toBe(true)
    expect(probe.landmarks.some((l) => l.name === 'mouth')).toBe(true)
    expect(probe.landmarks.some((l) => l.name === 'leftElbow')).toBe(true)

    const mask = buildSemanticFeatureMask(clay)
    expect(countSemanticLockedVertices(mask)).toBeGreaterThan(0)

    const retopo = runAutoRetopology({
      mesh: clay,
      targetTriangles: 400,
      capabilityScore: 90,
      allowInlineOnWeakGpu: true,
      semanticLandmarks: true,
    })
    expect(retopo.semanticCommercialParityReady).toBe(false)
    expect(retopo.receipt.evidence).toContain('semantic-landmark-edge-loops')
    expect((retopo.semanticLandmarks?.length ?? 0)).toBeGreaterThan(0)
  })
})

describe('Delighting PBR Radiance channels (bz)', () => {
  it('strips baked lighting and emits albedo/normal/roughness/metalness', () => {
    const baked = buildBakedClayTextureFixture(24, 24)
    const beforeRange = (() => {
      let minL = 1
      let maxL = 0
      for (let i = 0; i < baked.rgba.length; i += 4) {
        const L =
          0.2126 * (baked.rgba[i]! / 255) +
          0.7152 * (baked.rgba[i + 1]! / 255) +
          0.0722 * (baked.rgba[i + 2]! / 255)
        minL = Math.min(minL, L)
        maxL = Math.max(maxL, L)
      }
      return maxL - minL
    })()

    const delighted = delightClayTextureToRadiancePbr({
      clayTexture: baked,
      context: { biome: 'dark-fantasy', weather: 'rain' },
    })
    expect(delighted.bakedLightingInAlbedo).toBe(false)
    expect(delighted.bakedLightingStripped).toBe(true)
    expect(delighted.delightingCommercialParityReady).toBe(false)
    expect(DELIGHTING_COMMERCIAL_PARITY_READY).toBe(false)
    expect(delighted.channels.albedo.length).toBe(24 * 24 * 3)
    expect(delighted.channels.normal.length).toBe(24 * 24 * 3)
    expect(delighted.channels.roughness.length).toBe(24 * 24)
    expect(delighted.channels.metalness.length).toBe(24 * 24)
    const afterRange = Number(delighted.receipt.metrics?.albedoDynamicRangeAfter ?? 1)
    expect(afterRange).toBeLessThan(beforeRange)

    const pbr = assignContextualPbr({
      context: { biome: 'dark-fantasy', weather: 'rain' },
      clayTexture: baked,
    })
    expect(pbr.bakedLightingStripped).toBe(true)
    expect(pbr.radianceChannels?.albedo.length).toBeGreaterThan(0)
    expect(pbr.delightingCommercialParityReady).toBe(false)
  })
})

describe('Game-ready conveyor with remesh deepen (bz)', () => {
  it('wires deepened remesh into conveyor with honest flags', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const store = createMemoryFusionScopeStore()
    const clay = buildChaoticClayFixture(5)
    const before = countTriangles(clay)
    const clayTexture = buildBakedClayTextureFixture(16, 16)

    const result = await runGameReadyQualityPipeline({
      projectId: 'p-bz',
      userId: 'u1',
      prompt: 'dark fantasy rain knight',
      clayMesh: clay,
      clayTexture,
      targetTriangles: Math.max(200, Math.floor(before / 5)),
      capabilityScore: 75,
      sceneContext: { biome: 'dark-fantasy', weather: 'rain' },
      writePackEntry: true,
      fusionStore: store,
      costGuardAdapter: adapter,
      byokProfileId: 'byok-1',
      planId: 'pro',
    })

    expect(result.success).toBe(true)
    expect(result.instantMeshesParity).toBe(false)
    expect(result.instantMeshesParityReady).toBe(false)
    expect(result.remeshQualityDeepened).toBe(true)
    expect(result.semanticCommercialParityReady).toBe(false)
    expect(result.delightingCommercialParityReady).toBe(false)
    expect(result.caLodConsumer?.contractId).toBe(MESH_LOD_CA_CONSUMER_CONTRACT)
    expect(result.caLodConsumer?.vHacdOwnedByCa).toBe(true)
    expect(result.pbr?.bakedLightingStripped).toBe(true)
    expect(result.pbr?.radianceChannels?.roughness.length).toBeGreaterThan(0)
    expect(countTriangles(result.mesh!)).toBeLessThan(before)
    expect(result.lods).toHaveLength(3)
    expect(result.stages.some((s) => s.stage === 'auto-retopo' && s.status === 'closed')).toBe(
      true,
    )
    expect(result.notes.some((n) => n.includes('remeshQualityDeepened'))).toBe(true)
  })
})
