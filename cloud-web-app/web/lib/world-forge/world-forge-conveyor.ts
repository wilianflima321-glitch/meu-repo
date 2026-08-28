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
import type { CostGuardLedgerAdapter } from '@/lib/production/creative-cost-guard'
import {
  appendTaskEvidence,
  type TaskEvidenceLedger,
} from '@/lib/production/task-evidence-ledger'
import {
  bindCreativeQualityTier,
  scaleCreativeTokenWeightForFidelity,
  type CreativeQualityTierBinding,
} from '@/lib/production/creative-quality-tier-binding'
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
  gateWorldForgeMissionSuccess,
  type WorldForgeMaestroSuccessVerdict,
} from '@/lib/world-forge/world-forge-maestro-barrier'
import {
  WORLD_FORGE_LETTER,
  WORLD_FORGE_PIPELINE_ID,
  evaluateWorldForgeCapability,
  type WorldForgeStageId,
  type WorldForgeStageReceipt,
} from '@/lib/world-forge/types'
import {
  attributeWorldForgeStageActual,
  cancelWorldForgeSpend,
  reserveWorldForgeSpend,
  settleWorldForgeSpend,
  type WorldForgeSpendHeld,
  type WorldForgeSpendReceipt,
} from '@/lib/world-forge/world-forge-multistage-spend'
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
  /**
   * Letter cc — Law XVI Trava I CostGuard funding for the World Forge mission.
   * When provided (with costGuardAdapter) the conveyor reserves ONE held reservation
   * before stage A and settles once on success (or refunds on any fail-closed stage).
   */
  costGuard?: {
    byokProfileId?: string
    usageBucketId?: string
    planId?: string
    estimatedTokenWeight: number
    settleCeilingMultiplier?: number
  }
  /** Letter cc — CostGuard ledger adapter (memory / spend-resolver). */
  costGuardAdapter?: CostGuardLedgerAdapter
  /** Letter cc — caller-owned evidence ledger to carry spend/settle/refund events. */
  ledger?: TaskEvidenceLedger
  /**
   * Letter cc — caller-attributed actual token consumption per stage (provider/cloud only).
   * Omitted or 0 stages are local $0 math — never invented spend.
   */
  stageActuals?: Partial<Record<WorldForgeStageId, number>>
  /**
   * Letter cq — CapScore → fidelity band budget bind (Law XV + XVI).
   * When provided the conveyor binds the creative cook budget and scales the
   * CostGuard reserve by the fidelity multiplier. Fail-closed when the bind
   * refuses (missing CapScore, no cloud lane).
   */
  qualityTier?: {
    capabilityScore?: number | null
    preferCloudCook?: boolean
    ignoreCapabilityScore?: boolean
  }
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
  /** Top-8 #5 — Maestro success barrier fingerprint when success allowed. */
  maestroBarrier?: WorldForgeMaestroSuccessVerdict
  /**
   * Letter cc — multi-stage CostGuard spend receipt when the mission was funded
   * (null when reserve denied; undefined when unfunded/zero-UI).
   */
  worldForgeSpend?: WorldForgeSpendReceipt | null
  /** Letter cc — Trava I denial reason when CostGuard refused the mission. */
  spendDeniedReason?: string
  /** Letter cc — evidence ledger carrying spend/settle/refund events. */
  ledger?: TaskEvidenceLedger
  /**
   * Letter cq — CapScore fidelity band + cook budget bound for this mission
   * (null when the caller requested a bind and it was refused).
   */
  qualityTier?: CreativeQualityTierBinding | null
  /** Letter cq — quality-tier denial reason when the bind refused the mission. */
  tierDeniedReason?: string
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
    ledger: input.ledger,
  }

  let fusionTxId: string | undefined
  let spend: WorldForgeSpendHeld | null = null
  let ledger = input.ledger
  try {
    // Letter cq — CapScore → fidelity band budget bind (Law XV + XVI). Scales the
    // CostGuard reserve by the fidelity multiplier; fail-closed when the caller
    // requested a tier bind and the bind refuses (missing CapScore, no cloud lane).
    let qualityBinding: CreativeQualityTierBinding | null | undefined
    if (input.qualityTier) {
      qualityBinding = bindCreativeQualityTier({
        capabilityScore: input.qualityTier.capabilityScore,
        preferCloudCook: input.qualityTier.preferCloudCook,
        ignoreCapabilityScore: input.qualityTier.ignoreCapabilityScore,
        domain: 'world-layout',
      })
      if (!qualityBinding.ok) {
        if (ledger) {
          ledger = appendTaskEvidence(ledger, {
            kind: 'cost',
            title: 'World Forge quality tier refused',
            summary: `${qualityBinding.rejectCode}: ${qualityBinding.reason}`,
            refs: [`world-forge:${WORLD_FORGE_LETTER}`],
            actor: 'WorldForgeQualityTier',
          })
        }
        base.blockedReason = qualityBinding.reason
        base.qualityTier = null
        base.tierDeniedReason = qualityBinding.reason
        base.ledger = ledger
        log.info('world_forge_quality_tier_denied', { rejectCode: qualityBinding.rejectCode })
        return base
      }
      base.qualityTier = qualityBinding
    }

    // Letter cc — Law XVI Trava I: reserve ONE held reservation before ANY stage executes.
    if (input.costGuard && input.costGuardAdapter) {
      const reserved = await reserveWorldForgeSpend(
        {
          userId: input.userId,
          projectId: input.projectId,
          estimatedTokenWeight:
            qualityBinding && qualityBinding.ok
              ? scaleCreativeTokenWeightForFidelity(input.costGuard.estimatedTokenWeight, qualityBinding)
              : input.costGuard.estimatedTokenWeight,
          byokProfileId: input.costGuard.byokProfileId,
          usageBucketId: input.costGuard.usageBucketId,
          planId: input.costGuard.planId,
          settleCeilingMultiplier: input.costGuard.settleCeilingMultiplier,
        },
        input.costGuardAdapter,
      )
      if (!reserved.ok) {
        if (ledger) {
          ledger = appendTaskEvidence(ledger, {
            kind: 'cost',
            title: 'World Forge CostGuard denied',
            summary: `${reserved.reason}: ${reserved.message}`,
            refs: [`world-forge:${WORLD_FORGE_LETTER}`],
            actor: 'WorldForgeCostGuard',
          })
        }
        base.spendDeniedReason = reserved.message
        base.worldForgeSpend = null
        base.ledger = ledger
        log.info('world_forge_spend_denied', { reason: reserved.reason, message: reserved.message })
        return base
      }
      spend = reserved.held
    }

    const applyStageActual = (stage: WorldForgeStageId): void => {
      if (!spend) return
      const actual = input.stageActuals?.[stage] ?? 0
      const attributed = attributeWorldForgeStageActual(spend, stage, actual)
      if (attributed.ok) spend = attributed.held
    }

    // A — LoRA inject (HELD soak → held/zero-ui receipt; math continues)
    if (!input.skipLora) {
      const lora = runLoraPagerInject({
        genreId: input.loraGenreId ?? 'generic-prop',
        prompt: input.prompt,
        capabilityScore: gate.capabilityScore,
      })
      stages.push(lora.receipt)
      applyStageActual('lora-inject')
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
    applyStageActual('sdf-sculpt')
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
    applyStageActual('seamless-pbr')
    base.seamlessPbr = seamless

    // E — Semantic biome mask
    const biome = buildSemanticBiomeMask({
      prompt: plan.biomePrompt ?? input.prompt,
      seed: plan.seed,
      resolution: 48,
      source: 'maestro',
    })
    stages.push(biome.receipt)
    applyStageActual('biome-mask')
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
    applyStageActual('pcg-scatter')
    base.foliage = pcg.foliage

    // Beyond — collider LOD (V-HACD heroes only)
    const colliders = buildScatterColliderLod({
      legoMeshes: plan.legoMeshes,
      capabilityScore: gate.capabilityScore,
    })
    stages.push(colliders.receipt)
    applyStageActual('collider-lod')
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
    applyStageActual('navmesh-rebuild')
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
    applyStageActual('detour-nav-rebuild')
    base.detourNav = detour.session
    base.detourNavReady = detour.detourNavReady

    let fusionAborted = false
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
        applyStageActual('fusion-viewport')
      } catch (err) {
        fusionAborted = true
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

    const gated = gateWorldForgeMissionSuccess({
      projectId: input.projectId,
      proposedSuccess: mathOk && !fusionAborted,
      heightfield: base.heightfield,
      foliage: base.foliage,
      fusionAborted,
      zeroUiFallback: gate.zeroUiFallback && pcg.instanceCount <= 0,
    })

    base.success = gated.success
    base.stages = stages
    if (gated.verdict) {
      base.maestroBarrier = gated.verdict
    }
    if (!gated.success) {
      base.blockedReason =
        gated.blockedReason ??
        (!mathOk ? 'World Forge math path produced empty/unwalkable world' : 'maestro_barrier_refused')
    }

    // Letter cc — settle once on success; refund the full hold on ANY fail-closed stage.
    if (spend && input.costGuardAdapter) {
      if (gated.success) {
        const settled = await settleWorldForgeSpend({
          held: spend,
          adapter: input.costGuardAdapter,
          ledger,
          stageReceipts: stages,
        })
        base.worldForgeSpend = settled.receipt
        ledger = settled.ledger
      } else {
        const cancelled = await cancelWorldForgeSpend({
          held: spend,
          adapter: input.costGuardAdapter,
          ledger,
          reason: base.blockedReason ?? 'maestro_barrier_refused',
          stageReceipts: stages,
        })
        base.worldForgeSpend = cancelled.receipt
        ledger = cancelled.ledger
      }
    }
    base.ledger = ledger

    log.info('world_forge_conveyor_done', {
      success: base.success,
      zeroUi: base.zeroUi,
      instances: pcg.instanceCount,
      walkable: nav.navmesh.walkableCount,
      barrier: gated.verdict?.fingerprint,
    })

    return base
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.info('world_forge_conveyor_fail', { message })
    let finalLedger = ledger
    let spendReceipt: WorldForgeSpendReceipt | null | undefined
    if (spend && input.costGuardAdapter) {
      const cancelled = await cancelWorldForgeSpend({
        held: spend,
        adapter: input.costGuardAdapter,
        ledger: finalLedger,
        reason: message,
        stageReceipts: stages,
      })
      spendReceipt = cancelled.receipt
      finalLedger = cancelled.ledger
    }
    return {
      ...base,
      success: false,
      blockedReason: message,
      stages,
      worldForgeSpend: spendReceipt,
      ledger: finalLedger,
    }
  }
}
