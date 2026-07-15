/**
 * Letter cd — Studio IDE entry: Generate world (World Forge).
 *
 * Route (selectWorldForgeRoute) → runWorldForgeConveyor (cc):
 *   SDF heightfield + biome mask + PCG scatter + NavMesh + FusionTx
 *
 * Zero-UI when LoRA/ONNX HELD — math world still works.
 * No Coins / Agones / ORT / Nanite invention.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  selectWorldForgeRoute,
  WORLD_FORGE_IDE_LETTER,
  type WorldForgeIdeHonestyBadge,
  type WorldForgeIdePath,
  type WorldForgeIdeRouteDecision,
} from '@/lib/world-forge/world-forge-ide-route'
import {
  runWorldForgeConveyor,
  type WorldForgeConveyorInput,
  type WorldForgeConveyorResult,
} from '@/lib/world-forge/world-forge-conveyor'
import { LORA_CLAY_READY, type LoraClayGenreId } from '@/lib/world-forge/lora-clay-registry'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'
import type { FusionScopeStore } from '@/lib/production/creative-fusion-transaction'

const log = createComponentLogger('world-forge-ide-bridge')

export const WORLD_FORGE_IDE_BRIDGE_WIRED = true as const

export interface GenerateWorldForgeInput {
  projectId: string
  userId: string
  prompt: string
  seed?: number
  capabilityScore?: number
  preferWebBudget?: boolean
  loraGenreId?: LoraClayGenreId
  legoCount?: number
  fusionStore?: FusionScopeStore
  /** Test / future soak override — production must not invent true. */
  forceLoraClayReady?: boolean
  forceNativeOnnxReady?: boolean
  /** Skip LoRA pager (default true when HELD). */
  skipLora?: boolean
}

export interface GenerateWorldForgeResult {
  letter: typeof WORLD_FORGE_IDE_LETTER
  success: boolean
  path: WorldForgeIdePath
  honestyBadge: WorldForgeIdeHonestyBadge
  route: WorldForgeIdeRouteDecision
  zeroUi: boolean
  /** Always false until ORT+LoRA soak. */
  loraClayReady: boolean
  nativeOnnxReady: boolean
  mathWorldReady: true
  localMathCostUsd: 0
  blockedReason?: string
  conveyor?: WorldForgeConveyorResult
  notes: string[]
}

/**
 * Studio IDE entry: text → route → World Forge conveyor → FusionTx viewport stamp.
 */
export async function generateWorldForge(
  input: GenerateWorldForgeInput,
): Promise<GenerateWorldForgeResult> {
  const route = selectWorldForgeRoute({
    loraClayReady: input.forceLoraClayReady ?? LORA_CLAY_READY,
    nativeOnnxReady: input.forceNativeOnnxReady ?? NATIVE_ONNX_READY,
  })
  const notes = [
    'Letter cd — World Forge → Studio IDE wire',
    ...route.notes,
  ]

  // When LoRA HELD: skip LoRA silently (Zero-UI); math conveyor always runs.
  const skipLora =
    input.skipLora ??
    (route.path === 'math-pcg' || !route.loraClayReady)

  const conveyorInput: WorldForgeConveyorInput = {
    projectId: input.projectId,
    userId: input.userId,
    prompt: input.prompt,
    seed: input.seed,
    capabilityScore: input.capabilityScore,
    preferWebBudget: input.preferWebBudget,
    loraGenreId: input.loraGenreId,
    legoCount: input.legoCount,
    fusionStore: input.fusionStore,
    skipLora,
  }

  const conveyor = await runWorldForgeConveyor(conveyorInput)
  notes.push(
    route.path === 'math-pcg'
      ? 'cd: math-pcg path — SDF/biome/PCG/NavMesh; LoRA Zero-UI skipped'
      : 'cd: lora-enriched path — pager inject + math conveyor',
  )
  notes.push('cd: local $0; FusionTx for heightfield/foliage/navmesh manifest')

  log.info('world_forge_ide_generate_done', {
    path: route.path,
    success: conveyor.success,
    zeroUi: conveyor.zeroUi || route.zeroUiSilentLoraFallback,
  })

  return {
    letter: WORLD_FORGE_IDE_LETTER,
    success: conveyor.success,
    path: route.path,
    honestyBadge: route.honestyBadge,
    route,
    zeroUi: conveyor.zeroUi || route.zeroUiSilentLoraFallback,
    loraClayReady: route.loraClayReady,
    nativeOnnxReady: route.nativeOnnxReady,
    mathWorldReady: true,
    localMathCostUsd: 0,
    blockedReason: conveyor.blockedReason,
    conveyor,
    notes: [...notes, ...conveyor.stages.map((s) => `${s.stage}:${s.status}`)],
  }
}
