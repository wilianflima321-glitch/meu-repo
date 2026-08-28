/**
 * Letter bw — 3D Quality Pipeline (game-ready refine vs Meshy/Tripo clay).
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  buildTestIcosphere,
  countTriangles,
  MESH_QUALITY_PIPELINE_LETTER,
  DEFAULT_RETOPO_TARGET_TRIANGLES,
} from '@/lib/mesh-quality/types'
import {
  runAutoRetopology,
  runAutoRetopologyJob,
  AUTO_RETOPOLOGY_WIRED,
  INSTANT_MESHES_PARITY_HELD,
} from '@/lib/mesh-quality/auto-retopology'
import { buildMeshLodCascade } from '@/lib/mesh-quality/mesh-lod-cascade'
import { ensureAndValidateUvs } from '@/lib/mesh-quality/mesh-uv-validate'
import { cookMeshColliders } from '@/lib/mesh-quality/mesh-collider-cook'
import { runMeshAutoRigger } from '@/lib/mesh-quality/mesh-auto-rigger'
import { assignContextualPbr } from '@/lib/mesh-quality/contextual-pbr'
import {
  buildMinimalObjFixture,
  parseObjToRawMesh,
  ingestClayMesh,
} from '@/lib/mesh-quality/clay-provider-adapters'
import { critiqueMeshTopology } from '@/lib/mesh-quality/mesh-topology-critic'
import { runGameReadyQualityPipeline } from '@/lib/mesh-quality/game-ready-quality-pipeline'
import { probeMeshQualityHonesty } from '@/lib/mesh-quality/mesh-quality-honesty'
import { referenceAssetQualityManifest } from '@/lib/production/asset-quality-gate-verdict'
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

describe('3D Quality Pipeline flags (bw)', () => {
  it('wires letter bw modules', () => {
    expect(MESH_QUALITY_PIPELINE_LETTER).toBe('bw')
    expect(AUTO_RETOPOLOGY_WIRED).toBe(true)
    expect(INSTANT_MESHES_PARITY_HELD).toBe(true)
    const honesty = probeMeshQualityHonesty({ conveyorProven: true, liveClayPollProven: true })
    expect(honesty.meshQualityPipelineReady).toBe(true)
    expect(honesty.liveClayPollReady).toBe(true)
    expect(honesty.tripoOnlyShipAllowed).toBe(false)
    expect(honesty.instantMeshesParity).toBe(false)
  })
})

describe('Auto-retopology (bw)', () => {
  it('drops triangle count and returns non-empty mesh', () => {
    const clay = buildTestIcosphere(5)
    const before = countTriangles(clay)
    expect(before).toBeGreaterThan(DEFAULT_RETOPO_TARGET_TRIANGLES)

    const result = runAutoRetopology({
      mesh: clay,
      targetTriangles: 2_000,
      capabilityScore: 80,
      allowInlineOnWeakGpu: true,
    })

    expect(result.trianglesAfter).toBeGreaterThan(0)
    expect(result.trianglesAfter).toBeLessThan(before)
    expect(result.mesh.positions.length).toBeGreaterThan(0)
    expect(result.instantMeshesParity).toBe(false)
    expect(result.receipt.status).toBe('closed')
  })

  it('defers heavy remesh on weak GPU (Law XV)', () => {
    const clay = buildTestIcosphere(2)
    const result = runAutoRetopology({
      mesh: clay,
      targetTriangles: 500,
      capabilityScore: 20,
      allowInlineOnWeakGpu: false,
    })
    expect(result.deferredToWorker).toBe(true)
    expect(result.receipt.status).toBe('held')
  })

  it('job wrapper yields non-empty simplify', async () => {
    const clay = buildTestIcosphere(2)
    const before = countTriangles(clay)
    const result = await runAutoRetopologyJob({
      mesh: clay,
      targetTriangles: Math.max(100, Math.floor(before / 4)),
      capabilityScore: 10,
    })
    expect(result.mesh.positions.length).toBeGreaterThan(0)
    expect(result.trianglesAfter).toBeLessThanOrEqual(before)
  })
})

describe('LOD / UV / collider / critic (bw)', () => {
  it('builds LOD0/1/2 cascade', () => {
    const mesh = buildTestIcosphere(2)
    const lods = buildMeshLodCascade({ mesh, lod0Triangles: 800, capabilityScore: 90 })
    expect(lods.lods).toHaveLength(3)
    expect(lods.lods.every((l) => l.triangleCount > 0)).toBe(true)
    expect(lods.receipt.status).toBe('closed')
  })

  it('unwraps UVs when missing and validates tangent readiness', () => {
    const mesh = buildTestIcosphere(1)
    const uv = ensureAndValidateUvs(mesh)
    expect(uv.unwrapped).toBe(true)
    if (!uv.mesh.uvs) {
      throw new Error('expected UVs after unwrap')
    }
    expect(uv.mesh.uvs.length).toBeGreaterThan(0)
    expect(uv.hasTangents).toBe(true)
    expect(uv.receipt.status).toBe('closed')
  })

  it('cooks convex + trimesh colliders', () => {
    const mesh = buildTestIcosphere(1)
    const cooked = cookMeshColliders({ mesh, maxHullPoints: 16 })
    expect(cooked.convex.points.length).toBeGreaterThanOrEqual(4)
    expect(cooked.trimesh.triangleCount).toBeGreaterThan(0)
    expect(cooked.receipt.status).toBe('closed')
  })

  it('critic rejects mesh without UVs when required', () => {
    const mesh = buildTestIcosphere(1)
    const bad = critiqueMeshTopology({ mesh, requireUvs: true, requireNormals: true })
    expect(bad.approved).toBe(false)
    expect(bad.rejectReasons).toContain('uv_missing')
  })
})

describe('Auto-rig + contextual PBR (bw)', () => {
  it('empty-honest on non-humanoid blob', () => {
    const mesh = buildTestIcosphere(1)
    const rig = runMeshAutoRigger(mesh)
    // Sphere aspect ~1 — not biped
    expect(rig.humanoid).toBe(false)
    expect(rig.walkReady).toBe(false)
    expect(rig.bones).toHaveLength(0)
    expect(rig.receipt.status).toBe('skipped')
  })

  it('assigns dark-fantasy rain PBR without baking lighting into albedo', () => {
    const pbr = assignContextualPbr({
      context: {
        biome: 'dark-fantasy',
        weather: 'rain',
        promptHint: 'gothic wet stone',
      },
    })
    expect(pbr.bakedLightingInAlbedo).toBe(false)
    const wet = pbr.slots.find((s) => s.slot === 'wetness')
    const rough = pbr.slots.find((s) => s.slot === 'roughness')
    expect((wet?.value as number) > 0.4).toBe(true)
    expect((rough?.value as number) < 0.55).toBe(true)
    expect(pbr.receipt.status).toBe('closed')
  })
})

describe('Clay ingest CostGuard (bw)', () => {
  it('fail-closed without BYOK/credits — Zero-UI', async () => {
    const adapter = createMemoryCostGuardLedger()
    const result = await ingestClayMesh({
      request: {
        prompt: 'a clay knight',
        projectId: 'p1',
        userId: 'u1',
        provider: 'tripo',
        planId: 'free',
        offlineObjText: buildMinimalObjFixture(),
      },
      adapter,
    })
    expect(result.ok).toBe(false)
    expect(result.receipt.status).toBe('rejected')
  })

  it('ingests offline OBJ clay when BYOK present', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const obj = buildMinimalObjFixture(1)
    const parsed = parseObjToRawMesh(obj)
    expect(parsed).not.toBeNull()
    if (!parsed) {
      throw new Error('expected parsed mesh')
    }
    expect(countTriangles(parsed)).toBeGreaterThan(0)

    const result = await ingestClayMesh({
      request: {
        prompt: 'cube clay',
        projectId: 'p1',
        userId: 'u1',
        provider: 'tripo',
        planId: 'pro',
        byokProfileId: 'byok-1',
        offlineObjText: obj,
      },
      adapter,
    })
    expect(result.ok).toBe(true)
    expect(result.mesh).toBeDefined()
    expect(result.receipt.status).toBe('closed')
  })
})

describe('Game-ready conveyor (bw)', () => {
  it('runs clay→retopo→uv→lod→rig→pbr→collider→critic→pack', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const store = createMemoryFusionScopeStore()
    const clay = buildTestIcosphere(4)
    const before = countTriangles(clay)

    const result = await runGameReadyQualityPipeline({
      projectId: 'p-bw',
      userId: 'u1',
      prompt: 'dark fantasy rain knight',
      clayMesh: clay,
      targetTriangles: Math.max(200, Math.floor(before / 4)),
      capabilityScore: 75,
      sceneContext: { biome: 'dark-fantasy', weather: 'rain' },
      writePackEntry: true,
      fusionStore: store,
      costGuardAdapter: adapter,
      byokProfileId: 'byok-1',
      planId: 'pro',
    })

    expect(result.letter).toBe('bw')
    expect(result.success).toBe(true)
    expect(result.tripoOnlyShipAllowed).toBe(false)
    expect(result.instantMeshesParity).toBe(false)
    expect(result.mesh).toBeDefined()
    if (!result.mesh) {
      throw new Error('expected mesh after conveyor')
    }
    expect(countTriangles(result.mesh)).toBeLessThan(before)
    expect(result.lods).toHaveLength(3)
    expect(result.pbr?.bakedLightingInAlbedo).toBe(false)
    expect(result.colliders?.convex.points.length).toBeGreaterThanOrEqual(4)
    if (!result.packBytes) {
      throw new Error('expected packBytes after conveyor')
    }
    expect(result.packBytes.byteLength).toBeGreaterThan(0)
    expect(result.packSha256).toBeTruthy()
    expect(result.stages.some((s) => s.stage === 'auto-retopo' && s.status === 'closed')).toBe(true)
    expect(result.stages.some((s) => s.stage === 'topology-critic' && s.status === 'closed')).toBe(true)
  })

  it('tier-aware (GAP 2): ai-draft + declared manifest → verdict measured from REALITY (declared overridden)', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const store = createMemoryFusionScopeStore()
    const clay = buildTestIcosphere(2)

    const result = await runGameReadyQualityPipeline({
      projectId: 'p-bw-t1',
      userId: 'u1',
      prompt: 'tier ai-draft hero',
      clayMesh: clay,
      capabilityScore: 90,
      sceneContext: { biome: 'dark-fantasy', weather: 'clear' },
      writePackEntry: false,
      fusionStore: store,
      costGuardAdapter: adapter,
      byokProfileId: 'byok-1',
      planId: 'pro',
      targetTier: 'ai-draft',
      // Declarado minúsculo (1/1) — o conveyor SOBRESCREVE com os triângulos reais medidos.
      qualityManifest: {
        ...referenceAssetQualityManifest('ai-draft'),
        previewTriangles: 1,
        heroTriangles: 1,
      },
    })

    expect(result.success).toBe(true)
    if (!result.qualityVerdict) {
      throw new Error('expected qualityVerdict (GAP 2)')
    }
    const v = result.qualityVerdict
    expect(v.previewTriangles).toBeGreaterThan(1)
    expect(v.heroTriangles).toBeGreaterThan(1)
    expect(v.triangleBudgetOk).toBe(true)
    expect(v.topologyGrade).toBe(100)
    expect(v.ready).toBe(true)
    expect(v.blockerCount).toBe(0)
    expect(result.notes.some((n) => n.startsWith('bw-verdict:ready'))).toBe(true)
  })

  it('tier-aware (GAP 2): no manifest → fail-closed verdict, readiness never fabricated', async () => {
    const adapter = createMemoryCostGuardLedger()
    adapter.enableByok('u1')
    const store = createMemoryFusionScopeStore()
    const clay = buildTestIcosphere(2)

    const result = await runGameReadyQualityPipeline({
      projectId: 'p-bw-t2',
      userId: 'u1',
      prompt: 'tier studio hero',
      clayMesh: clay,
      capabilityScore: 90,
      sceneContext: { biome: 'dark-fantasy', weather: 'clear' },
      writePackEntry: false,
      fusionStore: store,
      costGuardAdapter: adapter,
      byokProfileId: 'byok-1',
      planId: 'pro',
      targetTier: 'studio-local-optimized',
    })

    expect(result.success).toBe(true)
    if (!result.qualityVerdict) {
      throw new Error('expected qualityVerdict (GAP 2)')
    }
    const v = result.qualityVerdict
    expect(v.ready).toBe(false)
    expect(v.blockerCount).toBe(9)
    expect(v.topologyOk).toBe(false)
    expect(result.notes.some((n) => n.startsWith('bw-verdict:fail_closed'))).toBe(true)
  })
})
