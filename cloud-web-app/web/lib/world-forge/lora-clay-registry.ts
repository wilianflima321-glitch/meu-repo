/**
 * Letter cc — LoRA / domain clay specialization registry.
 *
 * Genre packs (medieval horror, etc.) for native-gen VRAM pager inject.
 * `loraClayReady` flips ONLY when ONNX+LoRA load path is real — else scaffold + HELD.
 * CostGuard: local $0 still requires FusionTx on viewport writes (conveyor).
 */

export const LORA_CLAY_REGISTRY_WIRED = true as const
export const LORA_CLAY_LETTER = 'cc' as const

/**
 * Real ONNX Runtime + LoRA weight load — HELD until soak.
 * Scaffold registry + inject protocol ship; never flip readiness on empty weights.
 */
export const LORA_CLAY_READY = false as const
export const LORA_WEIGHTS_HELD = true as const

export type LoraClayGenreId =
  | 'medieval-horror'
  | 'sci-fi-brutalist'
  | 'fantasy-organic'
  | 'desert-ruins'
  | 'cyber-neon'
  | 'generic-prop'

export interface LoraClayPack {
  id: LoraClayGenreId
  label: string
  /** Prompt bias tokens injected into native clay / BYOK clay. */
  promptBias: string[]
  /** Relative adapter weight path — HELD until ORT+weights. */
  adapterRelativePath: string
  rank: number
  alpha: number
  /** True when adapter bytes proven loaded in ORT session. */
  weightsSoaked: false
}

export const LORA_CLAY_PACKS: readonly LoraClayPack[] = [
  {
    id: 'medieval-horror',
    label: 'Medieval Horror',
    promptBias: ['weathered stone', 'gothic ruin', 'moss', 'torch soot', 'iron fittings'],
    adapterRelativePath: 'models/lora/medieval-horror.onnx.lora',
    rank: 16,
    alpha: 32,
    weightsSoaked: false,
  },
  {
    id: 'sci-fi-brutalist',
    label: 'Sci-Fi Brutalist',
    promptBias: ['panel lines', 'anodized metal', 'hard edges', 'utility markings'],
    adapterRelativePath: 'models/lora/sci-fi-brutalist.onnx.lora',
    rank: 16,
    alpha: 28,
    weightsSoaked: false,
  },
  {
    id: 'fantasy-organic',
    label: 'Fantasy Organic',
    promptBias: ['bark', 'crystal veins', 'asymmetry', 'living wood'],
    adapterRelativePath: 'models/lora/fantasy-organic.onnx.lora',
    rank: 8,
    alpha: 24,
    weightsSoaked: false,
  },
  {
    id: 'desert-ruins',
    label: 'Desert Ruins',
    promptBias: ['sandstone', 'wind erosion', 'sun-bleached', 'arch fragment'],
    adapterRelativePath: 'models/lora/desert-ruins.onnx.lora',
    rank: 8,
    alpha: 20,
    weightsSoaked: false,
  },
  {
    id: 'cyber-neon',
    label: 'Cyber Neon',
    promptBias: ['emissive trim', 'acrylic', 'chrome', 'circuit etch'],
    adapterRelativePath: 'models/lora/cyber-neon.onnx.lora',
    rank: 16,
    alpha: 30,
    weightsSoaked: false,
  },
  {
    id: 'generic-prop',
    label: 'Generic Prop',
    promptBias: ['game-ready prop', 'clean silhouette'],
    adapterRelativePath: 'models/lora/generic-prop.onnx.lora',
    rank: 4,
    alpha: 8,
    weightsSoaked: false,
  },
] as const

export function getLoraClayPack(id: LoraClayGenreId): LoraClayPack {
  const pack = LORA_CLAY_PACKS.find((p) => p.id === id)
  if (!pack) {
    return LORA_CLAY_PACKS.find((p) => p.id === 'generic-prop')!
  }
  return pack
}

export function listLoraClayPacks(): readonly LoraClayPack[] {
  return LORA_CLAY_PACKS
}

export function resolveLoraPromptBias(id: LoraClayGenreId, userPrompt: string): string {
  const pack = getLoraClayPack(id)
  const bias = pack.promptBias.join(', ')
  return `${userPrompt.trim()} | domain:${pack.id} [${bias}]`
}

export interface LoraClayReadinessProbe {
  registryWired: true
  /** Always false until ORT + LoRA weights soak. */
  loraClayReady: false
  weightsHeld: true
  packCount: number
  note: string
}

export function probeLoraClayReadiness(): LoraClayReadinessProbe {
  return {
    registryWired: true,
    loraClayReady: LORA_CLAY_READY,
    weightsHeld: LORA_WEIGHTS_HELD,
    packCount: LORA_CLAY_PACKS.length,
    note:
      'Letter cc — LoRA genre registry + inject protocol wired; ORT+LoRA load HELD; loraClayReady: false',
  }
}
