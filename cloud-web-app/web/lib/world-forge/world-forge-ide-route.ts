/**
 * Letter cd — World Forge → Studio IDE route selection.
 *
 * text → math PCG world (SDF→heightfield + biome + scatter + NavMesh) always;
 * LoRA enrich when loraClayReady (HELD → Zero-UI silent skip, math still works).
 * Never invent ORT/LoRA weights — loraClayReady stays false until soak.
 */

import { LORA_CLAY_READY } from '@/lib/world-forge/lora-clay-registry'
import { NATIVE_ONNX_READY } from '@/lib/native-gen/onnx-job-protocol'

export const WORLD_FORGE_IDE_LETTER = 'cd' as const
export const WORLD_FORGE_IDE_ROUTE_WIRED = true as const

/** Honesty badge: LoRA HELD vs math PCG ready. */
export type WorldForgeIdeHonestyBadge = 'math-pcg' | 'lora-enriched'

/** Selected generation path for Studio "Generate world". */
export type WorldForgeIdePath = 'math-pcg' | 'lora-enriched'

export interface WorldForgeIdeRouteDecision {
  letter: typeof WORLD_FORGE_IDE_LETTER
  path: WorldForgeIdePath
  /** Mirror of LoRA soak gate — false until ORT+LoRA proven. */
  loraClayReady: boolean
  /** Mirror of native ONNX soak — false until soak. */
  nativeOnnxReady: boolean
  /** Math world always available (SDF/PCG/NavMesh). */
  mathWorldReady: true
  /** Local math is $0; still FusionTx for manifest/viewport. */
  localMathCostUsd: 0
  /** Honesty chip for Studio chrome. */
  honestyBadge: WorldForgeIdeHonestyBadge
  /** True when LoRA unavailable — silent Zero-UI (no LoRA-missing spam). */
  zeroUiSilentLoraFallback: boolean
  notes: string[]
}

/**
 * Prefer LoRA-enriched when ready; otherwise math PCG (always works).
 * Default uses LORA_CLAY_READY (HELD → math-pcg).
 */
export function selectWorldForgeRoute(input?: {
  /** Override for tests / future soak flip — never invent true in production. */
  loraClayReady?: boolean
  nativeOnnxReady?: boolean
}): WorldForgeIdeRouteDecision {
  const loraClayReady = input?.loraClayReady ?? LORA_CLAY_READY
  const nativeOnnxReady = input?.nativeOnnxReady ?? NATIVE_ONNX_READY

  if (loraClayReady && nativeOnnxReady) {
    return {
      letter: WORLD_FORGE_IDE_LETTER,
      path: 'lora-enriched',
      loraClayReady: true,
      nativeOnnxReady: true,
      mathWorldReady: true,
      localMathCostUsd: 0,
      honestyBadge: 'lora-enriched',
      zeroUiSilentLoraFallback: false,
      notes: [
        'cd: LoRA clay ready — enrich pager inject then math conveyor',
        'cd: FusionTx still stamps heightfield/foliage/navmesh viewport',
      ],
    }
  }

  return {
    letter: WORLD_FORGE_IDE_LETTER,
    path: 'math-pcg',
    loraClayReady: false,
    nativeOnnxReady: false,
    mathWorldReady: true,
    localMathCostUsd: 0,
    honestyBadge: 'math-pcg',
    zeroUiSilentLoraFallback: true,
    notes: [
      'cd: loraClayReady/nativeOnnxReady HELD — math PCG world still works (Zero-UI)',
      'cd: SDF→heightfield + biome + PCG scatter + CPU NavMesh + FusionTx',
      'cd: no LoRA-missing toast spam; no ORT/LoRA weight invention',
    ],
  }
}
