/**
 * Letter cc — World Forge conveyor (A–F + beyond).
 *
 * LoRA inject (HELD soak) → SDF heightfield → seamless PBR helper → biome mask
 * → PCG InstancedMesh scatter → collider LOD → NavMesh rebuild → FusionTx stamp.
 *
 * Empty-honest Zero-UI when native ONNX/LoRA HELD → BYOK pieces + math world still works.
 * Local $0 still FusionTx on viewport/manifest writes (Law XVI Trava II).
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  beginCreativeFusionTransaction,
  commitCreativeFusionTransaction,
  abortCreativeFusionTransaction,
  recordFusionMutation,
  type FusionScopeStore,
} from '@/lib/production/creative-fusion-transaction'
import { runLoraPagerInject } from '@/lib/world-forge/lora-pager-inject'
import type { LoraClayGenreId } from '@/lib/world-forge/lora-clay-registry'
import { bakeSdfParamsToHeightfield } from '@/lib/world-forge/sdf-fractal-sculpt'
import {
  bakeSeamlessPbrTile,
  buildSyntheticSplatAlbedo,
} from '@/lib/world-forge/seamless-pbr-bake'
import { buildSemanticBiomeMask } from '@/lib/world-forge/semantic-biome-mask'
import { runPcgHybridScatter } from '@/lib/world-forge/pcg-hybrid-scatter'
import { buildScatterColliderLod } from '@/lib/world-forge/scatter-collider-lod'
import { rebuildNavMeshGpuOrCpu } from '@/lib/world-forge/gpu-recast-navmesh'
import {
  rebuildDetourNavFromWalkable,
  type DetourNavSession,
  type OffMeshLink,
} from '@/lib/world-forge/detour-navmesh'
import { buildWorldForgeMaestroPlan } from '@/lib/world-forge/world-forge-maestro'
import {
  WORLD_FORGE_LETTER,
  WORLD_FORGE_PIPELINE_ID,
  evaluateWorldForgeCapability,
  type WorldForgeStageReceipt,
} from '@/lib/world-forge/types'
import type { HeightfieldDocument } from '@/lib/production/terrain-heightfield-math'
import type { FoliageDocument } from '@/lib/production/terrain-foliage-math'
import type { NavMeshGrid } from '@/lib/world-forge/navmesh-rebuild'
import type { SeamlessPbrBakeResult } from '@/lib/world-forge/seamless-pbr-bake'
import type { BiomeMaskDocument } from '@/lib/world-forge/semantic-biome-mask'
import type { ScatterColliderLodPlan } from '@/lib/world-forge/scatter-collider-lod'

const log = createComponentLogger('world-forge-conveyor')

export const WORLD_FORGE_CONVEYOR_WIRED = true as const

export interface WorldForgeConveyorInput {
  projectId: string
  userId: string
  prompt: string
  seed?: number
  capabilityScore?: number
  preferWebBudget?: boolean
  loraGenreId?: LoraClayGenreId
  legoCount?: number
  fusionStore?: FusionScopeStore
  /** Skip LoRA pager (tests focusing on math world). */
  skipLora?: boolean
  /** Letter ch — WebGPU present (adapter). */
  webgpuAvailable?: boolean
  /** Letter ch — compute shader path available. */
  webgpuComputeAvailable?: boolean
  /** Letter ch — soak proven before flipping gpuRecastReady. */
  gpuRecastSoakPassed?: boolean
  gpuRecastSoakFrames?: number
  /** Optional GPU device / Vitest mock for compute dispatch. */
  gpuDevice?: import('@/lib/world-forge/gpu-recast-navmesh').GpuRecastGpuDeviceLike | null
  /** Letter ct — optional off-mesh links registered after walkable rebuild. */
  offMeshLinks?: OffMeshLink[]
  /** Letter ct — soak proven before flipping detourNavReady. */
  detourNavSoakPassed?: boolean
  detourNavSoakFrames?: number
}

export interface WorldForgeConveyorResult {
  letter: typeof WORLD_FORGE_LETTER
  pipelineId: typeof WORLD_FORGE_PIPELINE_ID
  success: boolean
  zeroUi: boolean
  blockedReason?: string
  stages: WorldForgeStageReceipt[]
  heightfield?: HeightfieldDocument
  foliage?: FoliageDocument
  biomeMask?: BiomeMaskDocument
  seamlessPbr?: SeamlessPbrBakeResult
  navmesh?: NavMeshGrid
  /** Letter ct — Detour agent session after walkable rebuild. */
  detourNav?: DetourNavSession
  colliderLod?: ScatterColliderLodPlan
  loraClayReady: false
  nativeOnnxReady: false
  cityFromPromptReady: false
  substanceClassParityReady: false
  /** Soak-gated — true only when GPU heightfield→walkable proven this run. */
  gpuRecastReady: boolean
  /**
   * Letter ct — true only when Detour agent/off-mesh soak proven this run.
   * Distinct from gpuRecastReady (ch) and unrealRecastParityReady (always false).
   */
  detourNavReady: boolean
  /** Always false — Unreal Recast/Detour parity HELD. */
  unrealRecastParityReady: false
  streamingCarveReady: false
  fusionTxId?: string
}

export async function runWorldForgeConveyor(
  input: WorldForgeConveyorInput,
): Promise<WorldForgeConveyorResult> {
  const stages: WorldForgeStageReceipt[] = []
  const gate = evaluateWorldForgeCapability({
    capabilityScore: input.capabilityScore ?? 100,
    preferWebBudget: input.preferWebBudget,
  })
  const plan = buildWorldForgeMaestroPlan({
    prompt: input.prompt,
    seed: input.seed,
    legoCount: input.legoCount,
    loraGenreId: input.loraGenreId,
  })

  const base: WorldForgeConveyorResult = {
    letter: WORLD_FORGE_LETTER,
    pipelineId: WORLD_FORGE_PIPELINE_ID,
    success: false,
    zeroUi: gate.zeroUiFallback,
    stages,
    loraClayReady: false,
    nativeOnnxReady: false,
    cityFromPromptReady: false,
    substanceClassParityReady: false,
    gpuRecastReady: false,
    detourNavReady: false,
    unrealRecastParityReady: false,
    streamingCarveReady: false,
  }

  let fusionTxId: string | undefined
  try {
    // A — LoRA inject (HELD soak → held/zero-ui receipt; math continues)
    if (!input.skipLora) {
      const lora = runLoraPagerInject({
        genreId: input.loraGenreId ?? 'generic-prop',
        prompt: input.prompt,
        capabilityScore: gate.capabilityScore,
      })
      stages.push(lora.receipt)
    } else {
      stages.push({
        stage: 'lora-inject',
        status: 'skipped',
        evidence: ['skipLora'],
      })
    }

    // C — SDF → heightfield (an path)
    const sdf = bakeSdfParamsToHeightfield({
      prompt: input.prompt,
      seed: plan.seed,
      resolution: 65,
    })
    stages.push(sdf.receipt)
    base.heightfield = sdf.heightfield

    // D — Seamless PBR helper for splat layers
    const albedo = buildSyntheticSplatAlbedo(32, 32)
    const seamless = bakeSeamlessPbrTile({
      source: albedo,
      width: 32,
      height: 32,
      channels: 3,
      channelKind: 'albedo',
    })
    stages.push(seamless.receipt)
    base.seamlessPbr = seamless

    // E — Semantic biome mask
    const biome = buildSemanticBiomeMask({
      prompt: plan.biomePrompt ?? input.prompt,
      seed: plan.seed,
      resolution: 48,
      source: 'maestro',
    })
    stages.push(biome.receipt)
    base.biomeMask = biome.mask

    // B — PCG hybrid InstancedMesh scatter (bf foliage SoA)
    const heightSample = {
      resolution: sdf.heightfield.meta.resolution,
      widthMeters: sdf.heightfield.meta.widthMeters,
      depthMeters: sdf.heightfield.meta.depthMeters,
      maxHeight: sdf.heightfield.meta.maxHeight,
      heights: sdf.heightfield.heights,
    }
    const pcg = runPcgHybridScatter({
      seed: plan.seed,
      capabilityScore: gate.capabilityScore,
      preferWebBudget: input.preferWebBudget,
      requestedCount: gate.instanceBudget,
      widthMeters: sdf.heightfield.meta.widthMeters,
      depthMeters: sdf.heightfield.meta.depthMeters,
      heightSample,
      biomeMask: biome.mask,
      legoMeshes: plan.legoMeshes,
      densityMode: plan.densityMode,
    })
    stages.push(pcg.receipt)
    base.foliage = pcg.foliage

    // Beyond — collider LOD (V-HACD heroes only)
    const colliders = buildScatterColliderLod({
      legoMeshes: plan.legoMeshes,
      capabilityScore: gate.capabilityScore,
    })
    stages.push(colliders.receipt)
    base.colliderLod = colliders

    // F — NavMesh rebuild (letter ch: GPU heightfield→walkable when soak+adapter; else CPU)
    const nav = rebuildNavMeshGpuOrCpu({
      heightfield: sdf.heightfield,
      resolution: 32,
      version: 1,
      capabilityScore: gate.capabilityScore,
      webgpuAvailable: input.webgpuAvailable,
      webgpuComputeAvailable: input.webgpuComputeAvailable,
      soakPassed: input.gpuRecastSoakPassed,
      soakFramesProven: input.gpuRecastSoakFrames,
      device: input.gpuDevice ?? null,
    })
    stages.push(nav.receipt)
    base.navmesh = nav.navmesh
    base.gpuRecastReady = nav.gpuRecastReady

    // F+ — Detour agent / off-mesh rebuild after World Forge gen (letter ct)
    const detour = rebuildDetourNavFromWalkable({
      navmesh: nav.navmesh,
      offMeshLinks: input.offMeshLinks,
      version: nav.navmesh.version,
      soakPassed: input.detourNavSoakPassed,
      soakFramesProven: input.detourNavSoakFrames,
    })
    stages.push(detour.receipt)
    base.detourNav = detour.session
    base.detourNavReady = detour.detourNavReady

    // Law XVI Trava II — local $0 still FusionTx on viewport/manifest writes
    if (input.fusionStore) {
      try {
        const tx = await beginCreativeFusionTransaction({
          projectId: input.projectId,
          yDocScope: 'manifest',
          store: input.fusionStore,
        })
        fusionTxId = tx.id
        recordFusionMutation(
          tx.id,
          input.fusionStore,
          JSON.stringify({
            worldForge: true,
            letter: WORLD_FORGE_LETTER,
            pipelineId: WORLD_FORGE_PIPELINE_ID,
            prompt: input.prompt.slice(0, 120),
            heightfieldRes: sdf.heightfield.meta.resolution,
            instanceCount: pcg.instanceCount,
            walkableCount: nav.navmesh.walkableCount,
            userId: input.userId,
          }),
        )
        await commitCreativeFusionTransaction(tx.id, input.fusionStore)
        stages.push({
          stage: 'fusion-viewport',
          status: 'closed',
          evidence: ['creative-fusion-transaction', 'trava-ii', 'local-zero-cost-still-tx'],
        })
        base.fusionTxId = fusionTxId
      } catch (err) {
        if (fusionTxId) {
          await abortCreativeFusionTransaction(fusionTxId, input.fusionStore).catch(() => undefined)
        }
        stages.push({
          stage: 'fusion-viewport',
          status: 'rejected',
          evidence: ['fusion-abort'],
          heldReason: err instanceof Error ? err.message : 'fusion_failed',
        })
      }
    }

    const mathOk =
      Boolean(base.heightfield) &&
      (pcg.instanceCount > 0 || gate.zeroUiFallback) &&
      nav.navmesh.walkableCount > 0

    base.success = mathOk
    base.stages = stages
    if (!mathOk) {
      base.blockedReason = 'World Forge math path produced empty/unwalkable world'
    }

    log.info('world_forge_conveyor_done', {
      success: base.success,
      zeroUi: base.zeroUi,
      instances: pcg.instanceCount,
      walkable: nav.navmesh.walkableCount,
    })

    return base
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.info('world_forge_conveyor_fail', { message })
    return {
      ...base,
      success: false,
      blockedReason: message,
      stages,
    }
  }
}
