/**
 * Letter ca — Native 3D Generation Travas 1–7 soak.
 * VRAM pager · splat→mesh · bz semantic/delight · V-HACD · LOD · heat skin · ONNX honesty.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  evaluateNativeGenCapability,
  buildSyntheticSplatCloud,
  NATIVE_GEN_LETTER,
  NATIVE_ONNX_WEAK_VRAM_MB_CEILING,
} from '@/lib/native-gen/types'
import {
  createVramPager,
  transitionVramPager,
  runVramPagerNativeGenWindow,
  VRAM_PAGER_HAPPY_PATH,
  VRAM_PAGER_WIRED,
} from '@/lib/native-gen/vram-pager'
import {
  submitOnnxNativeGenJob,
  probeOnnxNativeSession,
  NATIVE_ONNX_READY,
  NATIVE_ONNX_MODELS_HELD,
} from '@/lib/native-gen/onnx-job-protocol'
import {
  extractMeshFromSplats,
  SPLAT_TO_MESH_WIRED,
  POISSON_COMMERCIAL_PARITY_READY,
} from '@/lib/native-gen/splat-to-mesh'
import {
  decomposeVhacdApproximate,
  VHACD_WIRED,
  VHACD_COMMERCIAL_PARITY_READY,
} from '@/lib/native-gen/vhacd-decomposition'
import {
  paintHeatDiffusionSkinWeights,
  buildBipedTestMesh,
  HEAT_DIFFUSION_SKIN_WIRED,
} from '@/lib/native-gen/heat-diffusion-skin'
import {
  runNativeGenConveyor,
  NATIVE_GEN_CONVEYOR_WIRED,
} from '@/lib/native-gen/native-gen-conveyor'
import { probeNativeGenHonesty } from '@/lib/native-gen/native-gen-honesty'
import { buildTestIcosphere } from '@/lib/mesh-quality/types'
import { buildBakedClayTextureFixture } from '@/lib/mesh-quality/delighting-pbr'
import { runMeshAutoRigger } from '@/lib/mesh-quality/mesh-auto-rigger'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'

beforeEach(() => {
  __resetCreativeFusionTransactionsForTests()
})

describe('Native gen honesty (ca)', () => {
  it('flips ready flags without Instant Meshes / Tripo / ONNX model claims', () => {
    expect(NATIVE_GEN_LETTER).toBe('ca')
    expect(VRAM_PAGER_WIRED).toBe(true)
    expect(SPLAT_TO_MESH_WIRED).toBe(true)
    expect(VHACD_WIRED).toBe(true)
    expect(HEAT_DIFFUSION_SKIN_WIRED).toBe(true)
    expect(NATIVE_GEN_CONVEYOR_WIRED).toBe(true)
    expect(NATIVE_ONNX_READY).toBe(false)
    expect(NATIVE_ONNX_MODELS_HELD).toBe(true)
    expect(POISSON_COMMERCIAL_PARITY_READY).toBe(false)
    expect(VHACD_COMMERCIAL_PARITY_READY).toBe(false)

    const honesty = probeNativeGenHonesty({
      vramPagerProven: true,
      splatToMeshProven: true,
      vhacdProven: true,
      heatDiffusionProven: true,
      conveyorProven: true,
    })
    expect(honesty.nativeOnnxReady).toBe(false)
    expect(honesty.vramPagerReady).toBe(true)
    expect(honesty.splatToMeshReady).toBe(true)
    expect(honesty.vhacdReady).toBe(true)
    expect(honesty.heatDiffusionReady).toBe(true)
    expect(honesty.semanticRetopoConsumed).toBe(true)
    expect(honesty.delightingConsumed).toBe(true)
    expect(honesty.instantMeshesParityReady).toBe(false)
    expect(honesty.tripoLocalParityReady).toBe(false)
    expect(honesty.conveyorReady).toBe(true)
  })

  it('keeps ready false when soak unproven', () => {
    const honesty = probeNativeGenHonesty({
      vramPagerProven: false,
      splatToMeshProven: false,
      vhacdProven: false,
      heatDiffusionProven: false,
      conveyorProven: false,
    })
    expect(honesty.vramPagerReady).toBe(false)
    expect(honesty.splatToMeshReady).toBe(false)
    expect(honesty.vhacdReady).toBe(false)
    expect(honesty.heatDiffusionReady).toBe(false)
    expect(honesty.nativeOnnxReady).toBe(false)
  })
})

describe('VRAM pager state machine (ca)', () => {
  it('walks happy path pause→isolate→generate→unload→resume→idle', () => {
    let snap = createVramPager({ capabilityScore: 70, dedicatedVramMb: 8192 })
    expect(snap.state).toBe('idle')
    for (const step of VRAM_PAGER_HAPPY_PATH.slice(1)) {
      const t = transitionVramPager(snap, step)
      expect(t.ok).toBe(true)
      snap = t.snapshot
    }
    expect(snap.state).toBe('idle')
    expect(snap.modelResident).toBe(false)
    expect(snap.luxuryViewportPaused).toBe(false)
  })

  it('rejects illegal transitions', () => {
    const snap = createVramPager({ capabilityScore: 70 })
    const bad = transitionVramPager(snap, 'generate')
    expect(bad.ok).toBe(false)
    expect(bad.receipt.status).toBe('rejected')
  })

  it('GT730-class never claims 8GB and Zero-UI falls back', async () => {
    const gate = evaluateNativeGenCapability({
      capabilityScore: 12,
      dedicatedVramMb: 8192,
    })
    expect(gate.claimedVramMb).toBeLessThanOrEqual(NATIVE_ONNX_WEAK_VRAM_MB_CEILING)
    expect(gate.onnxPathAllowed).toBe(false)
    expect(gate.zeroUiFallback).toBe(true)

    const window = await runVramPagerNativeGenWindow({
      capabilityScore: 12,
      dedicatedVramMb: 8192,
      job: async () => ({ ok: true }),
    })
    expect(window.zeroUi).toBe(true)
    expect(window.jobOk).toBe(false)
    expect(window.snapshot.modelResident).toBe(false)
  })
})

describe('ONNX job protocol (ca)', () => {
  it('probe stays nativeOnnxReady false', () => {
    const p = probeOnnxNativeSession()
    expect(p.nativeOnnxReady).toBe(false)
    expect(p.modelsHeld).toBe(true)
    expect(p.ipcScaffoldReady).toBe(true)
  })

  it('submit never invents mesh bytes', () => {
    const r = submitOnnxNativeGenJob({
      kind: 'text-to-3d',
      prompt: 'hero rock',
      projectId: 'p1',
      capabilityScore: 80,
      dedicatedVramMb: 8192,
    })
    expect(r.accepted).toBe(false)
    expect(r.nativeOnnxReady).toBe(false)
    expect(r.held).toBe(true)
    expect(r.meshPositions).toBeUndefined()
  })
})

describe('Splat→Mesh density smoke (ca)', () => {
  it('extracts mesh from synthetic splat cloud', () => {
    const cloud = buildSyntheticSplatCloud(256)
    const result = extractMeshFromSplats({ cloud, resolution: 14, isoLevel: 0.12 })
    expect(result.splatToMeshReady).toBe(true)
    expect(result.triangleCount).toBeGreaterThanOrEqual(4)
    expect(result.mesh.positions.length).toBeGreaterThanOrEqual(12)
    expect(result.poissonCommercialParityReady).toBe(false)
    expect(result.receipt.status).toBe('closed')
  })

  it('poisson interface delegates without commercial claim', () => {
    const cloud = buildSyntheticSplatCloud(128)
    const result = extractMeshFromSplats({
      cloud,
      method: 'poisson-interface',
      resolution: 10,
    })
    expect(result.method).toBe('poisson-interface')
    expect(result.poissonCommercialParityReady).toBe(false)
  })
})

describe('V-HACD hierarchical approx (ca)', () => {
  it('produces multiple convex hulls for Rapier — not trimesh-only', () => {
    const mesh = buildTestIcosphere(2)
    const result = decomposeVhacdApproximate({
      mesh,
      maxHulls: 8,
      capabilityScore: 70,
    })
    expect(result.vhacdReady).toBe(true)
    expect(result.hullCount).toBeGreaterThanOrEqual(1)
    expect(result.rapierConvexPreferred).toBe(true)
    expect(result.commercialParityReady).toBe(false)
    expect(result.hulls.every((h) => h.points.length >= 4)).toBe(true)
  })

  it('fail-closed single convex on weak GPU / too heavy', () => {
    const mesh = buildTestIcosphere(1)
    const weak = decomposeVhacdApproximate({
      mesh,
      capabilityScore: 15,
      allowInlineOnWeakGpu: false,
    })
    expect(weak.failClosedSingle).toBe(true)
    expect(weak.hullCount).toBe(1)
    expect(weak.deferredOffline).toBe(true)
    expect(weak.vhacdReady).toBe(true)

    const forced = decomposeVhacdApproximate({
      mesh,
      capabilityScore: 90,
      forceSingleHull: true,
    })
    expect(forced.failClosedSingle).toBe(true)
    expect(forced.hullCount).toBe(1)
  })
})

describe('Heat diffusion skin (ca)', () => {
  it('paints MM/DQ weights and reduces forearm↔ear leak vs nearest', () => {
    const mesh = buildBipedTestMesh()
    const nearest = runMeshAutoRigger(mesh)
    expect(nearest.humanoid).toBe(true)

    const heat = paintHeatDiffusionSkinWeights({ mesh, rig: nearest, iterations: 20 })
    expect(heat.humanoid).toBe(true)
    expect(heat.heatDiffusionReady).toBe(true)
    expect(heat.skinWeights.length).toBe(Math.floor(mesh.positions.length / 3) * 4)
    expect(heat.crossBindLeakScore).toBeLessThanOrEqual(0.55)
  })

  it('empty-honest on non-humanoid blob', () => {
    const blob = buildTestIcosphere(1)
    const heat = paintHeatDiffusionSkinWeights({ mesh: blob })
    expect(heat.humanoid).toBe(false)
    expect(heat.heatDiffusionReady).toBe(false)
    expect(heat.skinWeights.length).toBe(0)
    expect(heat.receipt.status).toBe('skipped')
  })
})

describe('Native gen conveyor (ca)', () => {
  it('runs splat→mesh→LOD→V-HACD→skin under pager with FusionTx', async () => {
    const store = createMemoryFusionScopeStore()
    const cloud = buildSyntheticSplatCloud(160)
    const result = await runNativeGenConveyor({
      projectId: 'proj-ca',
      userId: 'user-ca',
      prompt: 'native hero prop',
      capabilityScore: 72,
      dedicatedVramMb: 8192,
      splatCloud: cloud,
      clayTexture: buildBakedClayTextureFixture(16, 16),
      fusionStore: store,
      skipOnnx: true,
      maxHulls: 6,
    })

    expect(result.letter).toBe('ca')
    expect(result.success).toBe(true)
    expect(result.nativeOnnxReady).toBe(false)
    expect(result.vramPagerReady).toBe(true)
    expect(result.splatToMeshReady).toBe(true)
    expect(result.vhacdReady).toBe(true)
    expect(result.lods?.length).toBe(3)
    expect(result.lods?.[2]?.level).toBe(2)
    expect(result.delighting?.bakedLightingInAlbedo).toBe(false)
    expect(result.instantMeshesParityReady).toBe(false)
    expect(result.tripoLocalParityReady).toBe(false)
    expect(result.stages.some((s) => s.stage === 'vram-pager')).toBe(true)
    expect(result.stages.some((s) => s.stage === 'semantic-retopo')).toBe(true)
    expect(result.stages.some((s) => s.stage === 'fusion-viewport')).toBe(true)
  })

  it('Zero-UI on GT730 without claiming ONNX ready', async () => {
    const result = await runNativeGenConveyor({
      projectId: 'proj-ca-gt',
      userId: 'user-ca',
      prompt: 'should zero-ui',
      capabilityScore: 10,
      dedicatedVramMb: 8192,
      skipOnnx: false,
    })
    expect(result.zeroUi).toBe(true)
    expect(result.nativeOnnxReady).toBe(false)
    expect(result.success).toBe(false)
  })
})
