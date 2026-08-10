/**
 * Top-8 #4/#5 — clay→refine fingerprints + World Forge Maestro success barrier.
 */

import { describe, expect, it, beforeEach } from 'vitest'

import {
  sealClayRefineEvidence,
  probeClayRefineEvidenceReadiness,
  MESHY_TRIPO_CLAY_PARITY_CLAIM,
  UE_MESH_QUALITY_CLAIM,
} from '@/lib/mesh-quality/clay-refine-evidence'
import { buildTestIcosphere } from '@/lib/mesh-quality/types'
import {
  evaluateWorldForgeMaestroSuccessBarrier,
  gateWorldForgeMissionSuccess,
  probeWorldForgeMaestroBarrierReadiness,
  NATIVE_ONNX_READY,
} from '@/lib/world-forge/world-forge-maestro-barrier'
import { bakeSdfParamsToHeightfield } from '@/lib/world-forge/sdf-fractal-sculpt'
import { runPcgHybridScatter } from '@/lib/world-forge/pcg-hybrid-scatter'
import { buildWorldForgeMaestroPlan } from '@/lib/world-forge/world-forge-maestro'
import { runWorldForgeConveyor } from '@/lib/world-forge/world-forge-conveyor'
import {
  createMemoryCostGuardLedger,
  __resetCreativeCostGuardForTests,
} from '@/lib/production/creative-cost-guard'
import { evaluateMaestroCreativePulse } from '@/lib/production/maestro-creative-pulse'
import type { HeightfieldDocument } from '@/lib/production/terrain-heightfield-math'
import type { FoliageDocument } from '@/lib/production/terrain-foliage-math'

describe('clay-refine-evidence (#4)', () => {
  it('seals durable fingerprint on critic-pass mesh', () => {
    const mesh = buildTestIcosphere(1)
    const a = sealClayRefineEvidence({
      projectId: 'p1',
      providerId: 'tripo',
      capabilityScore: 55,
      fidelityBand: 'high',
      triangleBudgetTarget: 10_000,
      mesh,
      criticApproved: true,
      stages: [{ stage: 'topology-critic', status: 'closed', evidence: ['ok'] }],
      now: '2026-08-10T15:00:00.000Z',
    })
    const b = sealClayRefineEvidence({
      projectId: 'p1',
      providerId: 'tripo',
      capabilityScore: 55,
      fidelityBand: 'high',
      triangleBudgetTarget: 10_000,
      mesh,
      criticApproved: true,
      stages: [{ stage: 'topology-critic', status: 'closed', evidence: ['ok'] }],
      now: '2026-08-10T15:00:00.000Z',
    })
    expect(a.ok).toBe(true)
    expect(b.ok).toBe(true)
    if (a.ok && b.ok) {
      expect(a.value.fingerprint).toBe(b.value.fingerprint)
      expect(a.value.fingerprint.length).toBeGreaterThanOrEqual(16)
      expect(a.value.meshyTripoClayParityClaim).toBe(false)
      expect(a.value.ueMeshQualityClaim).toBe(false)
      expect(a.value.nativeOnnxReady).toBe(false)
      expect(a.value.triangleCount).toBeGreaterThan(0)
    }
  })

  it('fail-closes empty mesh, critic reject, and theater', () => {
    const mesh = buildTestIcosphere(0.5)
    expect(
      sealClayRefineEvidence({
        projectId: 'p',
        criticApproved: true,
        mesh: { positions: new Float32Array(), indices: new Uint32Array() },
      }).ok,
    ).toBe(false)

    const critic = sealClayRefineEvidence({
      projectId: 'p',
      criticApproved: false,
      criticRejectReasons: ['non_manifold'],
      mesh,
    })
    expect(critic.ok).toBe(false)
    if (!critic.ok) expect(critic.code).toBe('critic_rejected')

    const theater = sealClayRefineEvidence({
      projectId: 'p',
      criticApproved: true,
      sceneId: 'mock',
      mesh,
    })
    expect(theater.ok).toBe(false)
    if (!theater.ok) expect(theater.code).toBe('theater_payload')

    expect(MESHY_TRIPO_CLAY_PARITY_CLAIM).toBe(false)
    expect(UE_MESH_QUALITY_CLAIM).toBe(false)
    expect(probeClayRefineEvidenceReadiness().ready).toBe(true)
  })
})

describe('world-forge-maestro-barrier (#5)', () => {
  it('allows success only with heightfield + PCG foliage evidence', () => {
    const sdf = bakeSdfParamsToHeightfield({ prompt: 'forest hills', seed: 42, resolution: 33 })
    const plan = buildWorldForgeMaestroPlan({ prompt: 'forest', seed: 42, legoCount: 16 })
    const pcg = runPcgHybridScatter({
      seed: 42,
      capabilityScore: 60,
      requestedCount: 32,
      widthMeters: sdf.heightfield.meta.widthMeters,
      depthMeters: sdf.heightfield.meta.depthMeters,
      heightSample: {
        resolution: sdf.heightfield.meta.resolution,
        widthMeters: sdf.heightfield.meta.widthMeters,
        depthMeters: sdf.heightfield.meta.depthMeters,
        maxHeight: sdf.heightfield.meta.maxHeight,
        heights: sdf.heightfield.heights,
      },
      legoMeshes: plan.legoMeshes,
      densityMode: plan.densityMode,
    })

    const pass = evaluateWorldForgeMaestroSuccessBarrier({
      projectId: 'world_1',
      heightfield: sdf.heightfield,
      foliage: pcg.foliage,
      claimedSuccess: true,
      now: '2026-08-10T15:00:00.000Z',
    })
    expect(pass.ok).toBe(true)
    if (pass.ok) {
      expect(pass.value.allowed).toBe(true)
      expect(pass.value.foliageInstanceCount).toBeGreaterThan(0)
      expect(pass.value.nativeOnnxReady).toBe(false)
      expect(pass.value.loraClayReady).toBe(false)
      expect(pass.value.unrealWorldPartitionClaim).toBe(false)
    }
  })

  it('refuses missing terrain, empty foliage, fusion abort, theater, bake refuse', () => {
    const emptyHf: HeightfieldDocument = {
      meta: {
        resolution: 4,
        widthMeters: 16,
        depthMeters: 16,
        maxHeight: 8,
        version: 1,
        updatedAt: '2026-08-10T15:00:00.000Z',
        strokeCount: 0,
      },
      heights: new Float32Array(16),
    }
    const foliage: FoliageDocument = {
      meta: {
        version: 1,
        updatedAt: '2026-08-10T15:00:00.000Z',
        strokeCount: 0,
        types: [],
      },
      instances: [],
    }

    const missing = evaluateWorldForgeMaestroSuccessBarrier({
      projectId: 'p',
      foliage,
      claimedSuccess: true,
    })
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.code).toBe('missing_heightfield')

    const zeroWorld = evaluateWorldForgeMaestroSuccessBarrier({
      projectId: 'p',
      heightfield: emptyHf,
      foliage,
      claimedSuccess: true,
    })
    expect(zeroWorld.ok).toBe(false)

    const fusion = evaluateWorldForgeMaestroSuccessBarrier({
      projectId: 'p',
      heightfield: emptyHf,
      foliage,
      fusionAborted: true,
      claimedSuccess: true,
    })
    expect(fusion.ok).toBe(false)
    if (!fusion.ok) expect(fusion.code).toBe('fusion_aborted')

    const theater = evaluateWorldForgeMaestroSuccessBarrier({
      projectId: 'p',
      heightfield: emptyHf,
      foliage,
      sceneId: 'theater',
      claimedSuccess: true,
    })
    expect(theater.ok).toBe(false)
    if (!theater.ok) expect(theater.code).toBe('theater_payload')

    const bake = evaluateWorldForgeMaestroSuccessBarrier({
      projectId: 'p',
      heightfield: emptyHf,
      foliage: {
        ...foliage,
        instances: [{ id: 'i', typeId: 't', x: 0, y: 0, z: 0, rotY: 0, scale: 1 }],
      },
      checkBakeGate: true,
      bakeReceiptRef: 'mock',
      lightmapBytes: 0,
      claimedSuccess: true,
    })
    // empty heightfield fails first — use sdf for bake-only check
    const sdf = bakeSdfParamsToHeightfield({ prompt: 'ruin', seed: 7, resolution: 17 })
    const bakeOnly = evaluateWorldForgeMaestroSuccessBarrier({
      projectId: 'p',
      heightfield: sdf.heightfield,
      foliage: {
        ...foliage,
        instances: [{ id: 'i', typeId: 't', x: 0, y: 0, z: 0, rotY: 0, scale: 1 }],
      },
      checkBakeGate: true,
      bakeReceiptRef: 'mock',
      lightmapBytes: 0,
      claimedSuccess: true,
    })
    expect(bakeOnly.ok).toBe(false)
    if (!bakeOnly.ok) expect(bakeOnly.code).toBe('bake_gate_refuse')

    expect(NATIVE_ONNX_READY).toBe(false)
    expect(probeWorldForgeMaestroBarrierReadiness().ready).toBe(true)
    void bake
  })

  it('conveyor success carries maestroBarrier fingerprint', async () => {
    const result = await runWorldForgeConveyor({
      projectId: 'proj_wf',
      userId: 'u1',
      prompt: 'misty forest ridge',
      seed: 99,
      capabilityScore: 70,
      skipLora: true,
    })
    expect(result.success).toBe(true)
    expect(result.maestroBarrier?.fingerprint.length).toBeGreaterThanOrEqual(16)
    expect(result.nativeOnnxReady).toBe(false)
    expect(result.loraClayReady).toBe(false)

    const gated = gateWorldForgeMissionSuccess({
      projectId: 'proj_wf',
      proposedSuccess: true,
      heightfield: null,
      foliage: result.foliage,
    })
    expect(gated.success).toBe(false)
  })
})

describe('maestro pulse × world forge barrier', () => {
  beforeEach(() => {
    __resetCreativeCostGuardForTests()
  })

  it('pulse refuses worldForgeEvidence without terrain/PCG', async () => {
    const ledger = createMemoryCostGuardLedger()
    ledger.grant('u1', 5_000)

    const refuse = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'u1',
        intent: 'Generate a playable forest world',
        creationKind: 'game',
        domain: 'world-layout',
        capabilityScore: 48,
        costGuard: { estimatedTokenWeight: 120, planId: 'pro' },
        worldForgeEvidence: {
          heightfield: null,
          foliage: {
            meta: {
              version: 1,
              updatedAt: '2026-08-10T15:00:00.000Z',
              strokeCount: 0,
              types: [],
            },
            instances: [],
          },
        },
      },
      ledger,
    )
    expect(refuse.ok).toBe(false)
    if (!refuse.ok) expect(refuse.code).toBe('world_forge_barrier_refused')

    const sdf = bakeSdfParamsToHeightfield({ prompt: 'forest', seed: 3, resolution: 25 })
    const plan = buildWorldForgeMaestroPlan({ prompt: 'forest', seed: 3 })
    const pcg = runPcgHybridScatter({
      seed: 3,
      capabilityScore: 50,
      requestedCount: 24,
      widthMeters: sdf.heightfield.meta.widthMeters,
      depthMeters: sdf.heightfield.meta.depthMeters,
      heightSample: {
        resolution: sdf.heightfield.meta.resolution,
        widthMeters: sdf.heightfield.meta.widthMeters,
        depthMeters: sdf.heightfield.meta.depthMeters,
        maxHeight: sdf.heightfield.meta.maxHeight,
        heights: sdf.heightfield.heights,
      },
      legoMeshes: plan.legoMeshes,
      densityMode: 'hybrid',
    })

    const allow = await evaluateMaestroCreativePulse(
      {
        projectId: 'p',
        userId: 'u1',
        intent: 'Generate a playable forest world',
        creationKind: 'game',
        domain: 'world-layout',
        capabilityScore: 48,
        costGuard: { estimatedTokenWeight: 120, planId: 'pro' },
        worldForgeEvidence: {
          heightfield: sdf.heightfield,
          foliage: pcg.foliage,
        },
      },
      ledger,
    )
    expect(allow.ok).toBe(true)
    if (allow.ok) {
      expect(allow.value.worldForgeBarrier?.fingerprint.length).toBeGreaterThanOrEqual(16)
      expect(allow.value.orchestratorProdShipped).toBe(false)
    }
  })
})
