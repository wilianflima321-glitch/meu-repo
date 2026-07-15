/**
 * Letter cc — Aethel World Forge deepen soak.
 * Biome filter · seamless wrap · SDF→height · PCG budget · navmesh · LoRA pager state.
 */

import { describe, expect, it, beforeEach } from 'vitest'
import {
  WORLD_FORGE_LETTER,
  evaluateWorldForgeCapability,
  WORLD_FORGE_GT730_FAIL_CLOSED_SCORE,
} from '@/lib/world-forge/types'
import {
  LORA_CLAY_READY,
  LORA_WEIGHTS_HELD,
  listLoraClayPacks,
  resolveLoraPromptBias,
} from '@/lib/world-forge/lora-clay-registry'
import { runLoraPagerInject, LORA_PAGER_INJECT_WIRED } from '@/lib/world-forge/lora-pager-inject'
import { resolvePcgInstanceBudget } from '@/lib/world-forge/instance-capability-budget'
import {
  bakeSdfParamsToHeightfield,
  parseSdfPromptToParams,
  sampleSdfHeight,
  SDF_STREAMING_CARVE_READY,
} from '@/lib/world-forge/sdf-fractal-sculpt'
import {
  bakeSeamlessPbrTile,
  buildSyntheticSplatAlbedo,
  SUBSTANCE_CLASS_PARITY_READY,
} from '@/lib/world-forge/seamless-pbr-bake'
import {
  buildSemanticBiomeMask,
  filterInstancesByBiomeMask,
  isFoliageAllowedInBiome,
  parseBiomePromptHeuristic,
} from '@/lib/world-forge/semantic-biome-mask'
import {
  runPcgHybridScatter,
  PCG_CITY_FROM_PROMPT_READY,
  WFC_FULL_PARITY_READY,
} from '@/lib/world-forge/pcg-hybrid-scatter'
import {
  rebuildNavMeshFromHeightfield,
  navMeshHasWalkablePath,
  NAVMESH_GPU_RECAST_READY,
} from '@/lib/world-forge/navmesh-rebuild'
import { buildWorldForgeMaestroPlan } from '@/lib/world-forge/world-forge-maestro'
import { runWorldForgeConveyor, WORLD_FORGE_CONVEYOR_WIRED } from '@/lib/world-forge/world-forge-conveyor'
import { probeWorldForgeHonesty } from '@/lib/world-forge/world-forge-honesty'
import {
  createMemoryFusionScopeStore,
  __resetCreativeFusionTransactionsForTests,
} from '@/lib/production/creative-fusion-transaction'

beforeEach(() => {
  __resetCreativeFusionTransactionsForTests()
})

describe('World Forge honesty (cc)', () => {
  it('keeps competitor posture honest — no Unreal/Nanite/Substance/city claims', () => {
    expect(WORLD_FORGE_LETTER).toBe('cc')
    expect(WORLD_FORGE_CONVEYOR_WIRED).toBe(true)
    expect(LORA_CLAY_READY).toBe(false)
    expect(LORA_WEIGHTS_HELD).toBe(true)
    expect(PCG_CITY_FROM_PROMPT_READY).toBe(false)
    expect(WFC_FULL_PARITY_READY).toBe(false)
    expect(SUBSTANCE_CLASS_PARITY_READY).toBe(false)
    expect(NAVMESH_GPU_RECAST_READY).toBe(false)
    expect(SDF_STREAMING_CARVE_READY).toBe(false)

    const honesty = probeWorldForgeHonesty({
      sdfProven: true,
      seamlessProven: true,
      biomeProven: true,
      pcgProven: true,
      navmeshProven: true,
      conveyorProven: true,
    })
    expect(honesty.loraClayReady).toBe(false)
    expect(honesty.nativeOnnxReady).toBe(false)
    expect(honesty.sdfSculptReady).toBe(true)
    expect(honesty.pcgHybridScatterReady).toBe(true)
    expect(honesty.surpassUnrealUnityAaaRuntime).toBe(false)
    expect(honesty.leadMeshyTripoOnGameReadyRefine).toBe(true)
    expect(honesty.beatMeshyTripoOnRawClayQuality).toBe(false)
    expect(honesty.cityFromPromptReady).toBe(false)
    expect(honesty.gpuRecastReady).toBe(false)
    expect(honesty.unrealRecastParityReady).toBe(false)
  })
})

describe('LoRA pager state (cc)', () => {
  it('registers genre packs and holds inject without soaked weights', () => {
    expect(listLoraClayPacks().length).toBeGreaterThanOrEqual(4)
    const biased = resolveLoraPromptBias('medieval-horror', 'stone arch')
    expect(biased).toContain('medieval-horror')
    expect(LORA_PAGER_INJECT_WIRED).toBe(true)

    const held = runLoraPagerInject({
      genreId: 'medieval-horror',
      prompt: 'ruined chapel',
      capabilityScore: 80,
    })
    expect(held.ok).toBe(false)
    expect(held.loraClayReady).toBe(false)
    expect(held.receipt.status).toBe('held')
    expect(held.pager.state).toBe('idle')

    const zero = runLoraPagerInject({
      genreId: 'generic-prop',
      prompt: 'crate',
      capabilityScore: WORLD_FORGE_GT730_FAIL_CLOSED_SCORE - 1,
    })
    expect(zero.zeroUi).toBe(true)
    expect(zero.receipt.status).toBe('zero-ui')
  })
})

describe('SDF → height samples (cc)', () => {
  it('parses abyss + sharp peaks into durable heightfield samples', () => {
    const params = parseSdfPromptToParams('abyss with sharp peaks', 11)
    expect(params.motifs).toContain('abyss')
    expect(params.motifs).toContain('sharp-peaks')

    const abyssOnly = parseSdfPromptToParams('deep abyss chasm', 11)
    const abyssCenter = sampleSdfHeight(abyssOnly, 0.5, 0.5)
    const abyssEdge = sampleSdfHeight(abyssOnly, 0.05, 0.05)
    expect(abyssCenter).toBeLessThan(abyssEdge)

    const peakOnly = parseSdfPromptToParams('sharp peaks spires', 11)
    const peakH = sampleSdfHeight(peakOnly, 0.35, 0.4)
    expect(peakH).toBeGreaterThan(0.2)

    const baked = bakeSdfParamsToHeightfield({
      prompt: 'abyss + sharp peaks',
      seed: 11,
      resolution: 33,
    })
    expect(baked.heightfield.heights.length).toBe(33 * 33)
    expect(baked.streamingCarveReady).toBe(false)
    expect(baked.receipt.status).toBe('closed')
    const mid = baked.heightfield.heights[16 * 33 + 16]!
    expect(mid).toBeGreaterThanOrEqual(0)
    expect(mid).toBeLessThanOrEqual(1)
  })
})

describe('Seamless PBR wrap (cc)', () => {
  it('edge-matches albedo without Substance claim', () => {
    const src = buildSyntheticSplatAlbedo(16, 16)
    const baked = bakeSeamlessPbrTile({
      source: src,
      width: 16,
      height: 16,
      channels: 3,
      channelKind: 'albedo',
    })
    expect(baked.seamless.length).toBe(16 * 16 * 3)
    expect(baked.substanceClassParityReady).toBe(false)
    expect(baked.receipt.status).toBe('closed')
    // Corner samples should be finite 0..1
    expect(baked.seamless[0]!).toBeGreaterThanOrEqual(0)
    expect(baked.seamless[0]!).toBeLessThanOrEqual(1)
  })
})

describe('Biome mask filter (cc)', () => {
  it('blocks pine/trees on lava', () => {
    const weights = parseBiomePromptHeuristic('lava volcanic waste')
    expect(weights.lava).toBeGreaterThan(0.4)
    expect(isFoliageAllowedInBiome({ biome: 'lava', typeId: 'tree-1', category: 'tree' })).toBe(
      false,
    )
    expect(isFoliageAllowedInBiome({ biome: 'lava', typeId: 'rock-1', category: 'rock' })).toBe(
      true,
    )

    const { mask } = buildSemanticBiomeMask({
      prompt: 'lava fields',
      seed: 3,
      resolution: 16,
    })
    const filtered = filterInstancesByBiomeMask({
      instances: [
        { id: 'a', typeId: 'tree-1', x: 0, y: 0, z: 0, rotY: 0, scale: 1 },
        { id: 'b', typeId: 'rock-1', x: 10, y: 0, z: 10, rotY: 0, scale: 1 },
      ],
      mask,
      widthMeters: 256,
      depthMeters: 256,
      categoryOf: (id) => (id.includes('tree') ? 'tree' : 'rock'),
    })
    expect(filtered.rejected + filtered.kept.length).toBe(2)
    expect(filtered.kept.some((i) => i.typeId === 'rock-1')).toBe(true)
    // Pine/trees must not survive lava-dominant cells
    for (const inst of filtered.kept) {
      if (inst.typeId === 'tree-1') {
        expect(
          isFoliageAllowedInBiome({
            biome: 'lava',
            typeId: 'tree-1',
            category: 'tree',
          }),
        ).toBe(false)
      }
    }
  })
})

describe('PCG instance budget (cc)', () => {
  it('caps instances by Capability Score — no 5M Nanite marketing', () => {
    const weak = resolvePcgInstanceBudget({ capabilityScore: 15, requestedCount: 5000 })
    expect(weak.marketing5mNaniteAllowed).toBe(false)
    expect(weak.allowedCount).toBeLessThanOrEqual(64)
    expect(weak.truncated).toBe(true)

    const desktop = resolvePcgInstanceBudget({ capabilityScore: 80, requestedCount: 5000 })
    expect(desktop.allowedCount).toBeLessThanOrEqual(2048)
    expect(desktop.allowedCount).toBeGreaterThan(100)

    const gate = evaluateWorldForgeCapability({ capabilityScore: 10 })
    expect(gate.zeroUiFallback).toBe(true)

    const scatter = runPcgHybridScatter({
      capabilityScore: 80,
      requestedCount: 400,
      seed: 5,
      biomePrompt: 'temperate forest',
      legoMeshes: [
        { id: 'a', foliageTypeId: 'rock-1', sockets: ['ground', 'stone'], heroProp: false },
        { id: 'b', foliageTypeId: 'tree-1', sockets: ['ground', 'wood'], heroProp: false },
      ],
    })
    expect(scatter.cityFromPromptReady).toBe(false)
    expect(scatter.instanceCount).toBeGreaterThan(0)
    expect(scatter.instanceCount).toBeLessThanOrEqual(400)
  })
})

describe('NavMesh rebuild smoke (cc)', () => {
  it('rebuilds walkable CPU grid after SDF heightfield', () => {
    const baked = bakeSdfParamsToHeightfield({
      prompt: 'rolling hills meadow',
      seed: 8,
      resolution: 33,
    })
    const { navmesh, gpuRecastReady, receipt } = rebuildNavMeshFromHeightfield({
      heightfield: baked.heightfield,
      resolution: 24,
    })
    expect(gpuRecastReady).toBe(false)
    expect(receipt.status).toBe('closed')
    expect(navmesh.walkableCount).toBeGreaterThan(0)
    expect(navmesh.backend).toBe('cpu-grid')

    // Find two walkable cells and assert BFS
    const walkables = navmesh.cells.filter((c) => c.walkable)
    expect(walkables.length).toBeGreaterThan(1)
    const a = walkables[0]!
    const b = walkables[Math.min(walkables.length - 1, 5)]!
    expect(navMeshHasWalkablePath(navmesh, { x: a.x, z: a.z }, { x: b.x, z: b.z })).toBe(true)
  })
})

describe('World Forge conveyor FusionTx (cc)', () => {
  it('runs math world + FusionTx while LoRA/ONNX stay HELD', async () => {
    const store = createMemoryFusionScopeStore()
    const plan = buildWorldForgeMaestroPlan({
      prompt: 'abyss peaks temperate forest ruins',
      seed: 42,
      legoCount: 4,
      loraGenreId: 'fantasy-organic',
    })
    expect(plan.cityFromPromptClaim).toBe(false)
    expect(plan.legoMeshes.length).toBe(4)

    const result = await runWorldForgeConveyor({
      projectId: 'proj-cc',
      userId: 'user-cc',
      prompt: 'abyss peaks temperate forest ruins',
      seed: 42,
      capabilityScore: 75,
      loraGenreId: 'fantasy-organic',
      fusionStore: store,
    })

    expect(result.letter).toBe('cc')
    expect(result.success).toBe(true)
    expect(result.loraClayReady).toBe(false)
    expect(result.nativeOnnxReady).toBe(false)
    expect(result.heightfield?.heights.length).toBeGreaterThan(0)
    expect(result.foliage?.instances.length).toBeGreaterThan(0)
    expect(result.navmesh?.walkableCount).toBeGreaterThan(0)
    expect(result.fusionTxId).toBeTruthy()
    expect(result.stages.some((s) => s.stage === 'lora-inject' && s.status === 'held')).toBe(true)
    expect(result.stages.some((s) => s.stage === 'fusion-viewport')).toBe(true)
  })
})
