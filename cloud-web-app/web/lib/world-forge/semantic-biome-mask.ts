/**
 * Letter cc — Semantic biome masks (2D heatmap) → PCG / foliage scatter filters.
 * No pine on lava. Maestro/heuristic — not ML segmentation claim.
 */

import { foliageHash01, type FoliageCategory, type FoliageInstanceRecord } from '@/lib/production/terrain-foliage-math'
import type { WorldForgeStageReceipt } from '@/lib/world-forge/types'

export const SEMANTIC_BIOME_MASK_WIRED = true as const

export type BiomeKind = 'temperate' | 'hot' | 'cold' | 'swamp' | 'lava' | 'desert' | 'ocean'

export interface BiomeWeights {
  temperate: number
  hot: number
  cold: number
  swamp: number
  lava: number
  desert: number
  ocean: number
}

export interface BiomeMaskDocument {
  resolution: number
  /** Row-major dominant biome id index into BIOME_ORDER */
  dominant: Uint8Array
  /** Optional soft weights packed [res*res*7] 0..1 */
  weights?: Float32Array
  seed: number
  source: 'heuristic' | 'maestro'
}

export const BIOME_ORDER: readonly BiomeKind[] = [
  'temperate',
  'hot',
  'cold',
  'swamp',
  'lava',
  'desert',
  'ocean',
] as const

const CATEGORY_ALLOW: Record<BiomeKind, readonly FoliageCategory[]> = {
  temperate: ['tree', 'bush', 'grass', 'flower', 'rock'],
  hot: ['bush', 'grass', 'rock'],
  cold: ['tree', 'rock', 'grass'],
  swamp: ['bush', 'grass', 'flower', 'rock'],
  lava: ['rock'],
  desert: ['rock', 'bush'],
  ocean: ['rock'],
}

/** Pine / tree ban on lava & ocean (and sparse desert). */
const TYPE_DENY: Partial<Record<BiomeKind, readonly string[]>> = {
  lava: ['tree-1', 'bush-1', 'grass-1', 'flower'],
  ocean: ['tree-1', 'bush-1', 'grass-1'],
  desert: ['tree-1', 'grass-1'],
  hot: ['tree-1'],
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function emptyWeights(): BiomeWeights {
  return {
    temperate: 0,
    hot: 0,
    cold: 0,
    swamp: 0,
    lava: 0,
    desert: 0,
    ocean: 0,
  }
}

/**
 * Heuristic / Maestro prompt → soft biome mix (normalized).
 */
export function parseBiomePromptHeuristic(prompt: string): BiomeWeights {
  const p = prompt.toLowerCase()
  const w = emptyWeights()
  if (/lava|volcan|magma|fire/.test(p)) w.lava += 1.2
  if (/swamp|marsh|bog|wetland/.test(p)) w.swamp += 1
  if (/cold|snow|tundra|arctic|ice/.test(p)) w.cold += 1
  if (/desert|arid|dune|sand/.test(p)) w.desert += 1
  if (/hot|savanna|tropic|jungle/.test(p)) w.hot += 0.9
  if (/ocean|sea|coast|island/.test(p)) w.ocean += 1
  if (/forest|meadow|temperate|grassland|pine/.test(p)) w.temperate += 1
  const sum = Object.values(w).reduce((a, b) => a + b, 0)
  if (sum <= 0) {
    w.temperate = 1
    return w
  }
  for (const k of BIOME_ORDER) {
    w[k] = w[k] / sum
  }
  return w
}

function pickDominant(weights: BiomeWeights, noise: number): BiomeKind {
  // Noise-perturbed argmax for spatial variety
  let best: BiomeKind = 'temperate'
  let bestScore = -1
  for (const k of BIOME_ORDER) {
    const score = weights[k] * (0.75 + noise * 0.5)
    if (score > bestScore) {
      bestScore = score
      best = k
    }
  }
  return best
}

/**
 * Build 2D biome heatmap from global mix + Perlin-ish noise.
 */
export function buildSemanticBiomeMask(input: {
  resolution?: number
  seed?: number
  prompt?: string
  weights?: BiomeWeights
  source?: 'heuristic' | 'maestro'
}): { mask: BiomeMaskDocument; receipt: WorldForgeStageReceipt } {
  const resolution = Math.max(8, Math.min(256, Math.floor(input.resolution ?? 64)))
  const seed = (input.seed ?? 7) >>> 0
  const weights = input.weights ?? parseBiomePromptHeuristic(input.prompt ?? 'temperate forest')
  const dominant = new Uint8Array(resolution * resolution)
  const packed = new Float32Array(resolution * resolution * BIOME_ORDER.length)

  for (let y = 0; y < resolution; y++) {
    for (let x = 0; x < resolution; x++) {
      const u = x / (resolution - 1)
      const v = y / (resolution - 1)
      const n = foliageHash01(seed + x * 13 + y * 17 + Math.floor(u * 100) * 3)
      const local: BiomeWeights = { ...weights }
      // Spatial bias: edges cooler / center hotter for variety
      local.cold += (1 - u) * 0.08
      local.hot += u * 0.06
      local.swamp += (1 - Math.abs(v - 0.5) * 2) * 0.05 * (weights.swamp > 0 ? 1 : 0)
      const sum = BIOME_ORDER.reduce((a, k) => a + local[k], 0) || 1
      const idx = y * resolution + x
      for (let i = 0; i < BIOME_ORDER.length; i++) {
        const k = BIOME_ORDER[i]!
        packed[idx * BIOME_ORDER.length + i] = clamp01(local[k] / sum)
      }
      const dom = pickDominant(local, n)
      dominant[idx] = BIOME_ORDER.indexOf(dom)
    }
  }

  const mask: BiomeMaskDocument = {
    resolution,
    dominant,
    weights: packed,
    seed,
    source: input.source ?? 'heuristic',
  }

  return {
    mask,
    receipt: {
      stage: 'biome-mask',
      status: 'closed',
      evidence: ['semantic-heatmap', mask.source, `res=${resolution}`],
      metrics: {
        temperate: weights.temperate,
        lava: weights.lava,
        cold: weights.cold,
        swamp: weights.swamp,
      },
    },
  }
}

export function sampleBiomeAtUv(mask: BiomeMaskDocument, u: number, v: number): BiomeKind {
  const res = mask.resolution
  const x = Math.min(res - 1, Math.max(0, Math.floor(clamp01(u) * (res - 1))))
  const y = Math.min(res - 1, Math.max(0, Math.floor(clamp01(v) * (res - 1))))
  const idx = mask.dominant[y * res + x] ?? 0
  return BIOME_ORDER[idx] ?? 'temperate'
}

export function isFoliageAllowedInBiome(input: {
  biome: BiomeKind
  typeId: string
  category?: FoliageCategory
}): boolean {
  const deny = TYPE_DENY[input.biome]
  if (deny?.some((d) => input.typeId.includes(d) || input.typeId === d)) {
    return false
  }
  if (input.biome === 'lava' && (input.category === 'tree' || input.typeId.includes('tree'))) {
    return false
  }
  if (input.category) {
    return CATEGORY_ALLOW[input.biome].includes(input.category)
  }
  return true
}

/**
 * Filter scatter instances by biome mask (world XZ → UV).
 */
export function filterInstancesByBiomeMask(input: {
  instances: FoliageInstanceRecord[]
  mask: BiomeMaskDocument
  widthMeters: number
  depthMeters: number
  categoryOf?: (typeId: string) => FoliageCategory | undefined
}): {
  kept: FoliageInstanceRecord[]
  rejected: number
  receipt: WorldForgeStageReceipt
} {
  const kept: FoliageInstanceRecord[] = []
  let rejected = 0
  for (const inst of input.instances) {
    const u = inst.x / input.widthMeters + 0.5
    const v = inst.z / input.depthMeters + 0.5
    const biome = sampleBiomeAtUv(input.mask, u, v)
    const category = input.categoryOf?.(inst.typeId)
    if (
      isFoliageAllowedInBiome({
        biome,
        typeId: inst.typeId,
        category,
      })
    ) {
      kept.push(inst)
    } else {
      rejected++
    }
  }
  return {
    kept,
    rejected,
    receipt: {
      stage: 'biome-mask',
      status: 'closed',
      evidence: ['scatter-filter', `kept=${kept.length}`, `rejected=${rejected}`],
      metrics: { kept: kept.length, rejected },
    },
  }
}
