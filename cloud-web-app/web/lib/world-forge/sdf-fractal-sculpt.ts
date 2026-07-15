/**
 * Letter cc — SDF / fractal world sculpt → durable heightfield authority path (an).
 *
 * Text prompts (“abyss + sharp peaks”) → SDF/fractal parameters → Float32 height samples.
 * Streaming carve HELD without World Partition — still ships parameter→heightfield wire.
 */

import {
  createFlatHeightfield,
  type HeightfieldDocument,
} from '@/lib/production/terrain-heightfield-math'
import type { WorldForgeStageReceipt } from '@/lib/world-forge/types'

export const SDF_FRACTAL_SCULPT_WIRED = true as const
/** World Partition streaming carve — HELD. */
export const SDF_STREAMING_CARVE_HELD = true as const
export const SDF_STREAMING_CARVE_READY = false as const

export type SdfWorldMotif =
  | 'abyss'
  | 'sharp-peaks'
  | 'rolling-hills'
  | 'mesa'
  | 'crater'
  | 'ridged-mountains'
  | 'flat'

export interface SdfFractalParams {
  motifs: SdfWorldMotif[]
  seed: number
  abyssDepth: number
  peakSharpness: number
  ridgeFrequency: number
  mesaFlatness: number
  craterRadius: number
  baseAmplitude: number
  octaves: number
  prompt: string
}

export interface SdfSculptResult {
  params: SdfFractalParams
  heightfield: HeightfieldDocument
  streamingCarveReady: false
  receipt: WorldForgeStageReceipt
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/** Deterministic 0..1 hash — no Math.random. */
function hash01(seed: number, x: number, z: number): number {
  const v = Math.sin(seed * 12.9898 + x * 78.233 + z * 37.719) * 43758.5453
  return v - Math.floor(v)
}

function valueNoise2(seed: number, x: number, z: number): number {
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const fx = x - x0
  const fz = z - z0
  const sx = fx * fx * (3 - 2 * fx)
  const sz = fz * fz * (3 - 2 * fz)
  const n00 = hash01(seed, x0, z0)
  const n10 = hash01(seed, x0 + 1, z0)
  const n01 = hash01(seed, x0, z0 + 1)
  const n11 = hash01(seed, x0 + 1, z0 + 1)
  const nx0 = n00 * (1 - sx) + n10 * sx
  const nx1 = n01 * (1 - sx) + n11 * sx
  return nx0 * (1 - sz) + nx1 * sz
}

function fbm(seed: number, x: number, z: number, octaves: number): number {
  let amp = 0.5
  let freq = 1
  let sum = 0
  let norm = 0
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise2(seed + i * 17, x * freq, z * freq)
    norm += amp
    amp *= 0.5
    freq *= 2
  }
  return norm > 0 ? sum / norm : 0
}

/** Ridged multifractal — sharp peaks. */
function ridged(seed: number, x: number, z: number, sharpness: number): number {
  const n = fbm(seed, x, z, 4)
  const r = 1 - Math.abs(n * 2 - 1)
  return Math.pow(clamp01(r), Math.max(0.5, sharpness))
}

/**
 * Heuristic prompt → SDF/fractal parameters (Maestro-friendly, no LLM required).
 */
export function parseSdfPromptToParams(prompt: string, seed = 42): SdfFractalParams {
  const p = prompt.toLowerCase()
  const motifs: SdfWorldMotif[] = []
  if (/abyss|chasm|void|gorge|pit/.test(p)) motifs.push('abyss')
  if (/sharp|peak|spire|needle|jagged/.test(p)) motifs.push('sharp-peaks')
  if (/ridge|mountain|alpine/.test(p)) motifs.push('ridged-mountains')
  if (/mesa|plateau|tableland/.test(p)) motifs.push('mesa')
  if (/crater|impact|caldera/.test(p)) motifs.push('crater')
  if (/hill|rolling|gentle|meadow/.test(p)) motifs.push('rolling-hills')
  if (motifs.length === 0) motifs.push('rolling-hills')

  return {
    motifs,
    seed: seed >>> 0,
    abyssDepth: motifs.includes('abyss') ? 0.85 : 0.15,
    peakSharpness: motifs.includes('sharp-peaks') ? 2.4 : 1.2,
    ridgeFrequency: motifs.includes('ridged-mountains') || motifs.includes('sharp-peaks') ? 6 : 2.5,
    mesaFlatness: motifs.includes('mesa') ? 0.8 : 0.2,
    craterRadius: motifs.includes('crater') ? 0.35 : 0.1,
    baseAmplitude: motifs.includes('rolling-hills') && motifs.length === 1 ? 0.35 : 0.55,
    octaves: Math.min(6, 3 + motifs.length),
    prompt,
  }
}

/**
 * Sample SDF/fractal field at UV → height 0..1.
 * Combinations are soft-min / soft-max of motif contributions (CPU SDF-ish).
 */
export function sampleSdfHeight(params: SdfFractalParams, u: number, v: number): number {
  const x = (u - 0.5) * params.ridgeFrequency
  const z = (v - 0.5) * params.ridgeFrequency
  const cx = u - 0.5
  const cz = v - 0.5
  const dist = Math.sqrt(cx * cx + cz * cz)

  let h = fbm(params.seed, x, z, params.octaves) * params.baseAmplitude

  for (const motif of params.motifs) {
    switch (motif) {
      case 'abyss': {
        const bowl = Math.pow(clamp01(dist / 0.55), 1.6)
        const carve = (1 - bowl) * params.abyssDepth
        h = Math.min(h, 0.55 - carve)
        break
      }
      case 'sharp-peaks': {
        const peaks = ridged(params.seed + 3, x * 1.4, z * 1.4, params.peakSharpness)
        h = Math.max(h, peaks * 0.95)
        break
      }
      case 'ridged-mountains': {
        const r = ridged(params.seed + 7, x, z, 1.8)
        h = Math.max(h, r * 0.8 + fbm(params.seed + 9, x * 0.5, z * 0.5, 3) * 0.15)
        break
      }
      case 'mesa': {
        const plateau = fbm(params.seed + 11, x * 0.4, z * 0.4, 3)
        const flat = plateau > 0.45 ? 0.55 + plateau * 0.2 * (1 - params.mesaFlatness) : plateau * 0.35
        h = h * (1 - params.mesaFlatness) + flat * params.mesaFlatness
        break
      }
      case 'crater': {
        const rim = Math.abs(dist - params.craterRadius)
        const bowl = dist < params.craterRadius ? 0.15 : h
        const ring = rim < 0.06 ? 0.75 : bowl
        h = Math.min(h, ring)
        break
      }
      case 'rolling-hills': {
        h = Math.max(h, fbm(params.seed + 13, x * 0.7, z * 0.7, 4) * 0.45)
        break
      }
      case 'flat':
        h = 0.2
        break
    }
  }

  return clamp01(h)
}

/**
 * Bake params into a durable-compatible HeightfieldDocument (an path).
 */
export function bakeSdfParamsToHeightfield(input: {
  prompt: string
  seed?: number
  resolution?: number
  widthMeters?: number
  depthMeters?: number
  maxHeight?: number
}): SdfSculptResult {
  const params = parseSdfPromptToParams(input.prompt, input.seed ?? 42)
  const doc = createFlatHeightfield({
    resolution: input.resolution ?? 129,
    widthMeters: input.widthMeters ?? 256,
    depthMeters: input.depthMeters ?? 256,
    maxHeight: input.maxHeight ?? 64,
  })
  const res = doc.meta.resolution
  for (let z = 0; z < res; z++) {
    for (let x = 0; x < res; x++) {
      const u = res <= 1 ? 0.5 : x / (res - 1)
      const v = res <= 1 ? 0.5 : z / (res - 1)
      doc.heights[z * res + x] = sampleSdfHeight(params, u, v)
    }
  }
  doc.meta.strokeCount = 1
  doc.meta.updatedAt = new Date().toISOString()

  return {
    params,
    heightfield: doc,
    streamingCarveReady: false,
    receipt: {
      stage: 'sdf-sculpt',
      status: 'closed',
      evidence: [
        'sdf-fractal-params',
        ...params.motifs,
        `res=${res}`,
        'streaming-carve-held',
      ],
      heldReason: SDF_STREAMING_CARVE_HELD
        ? 'World Partition streaming carve HELD — parameter→heightfield wire CLOSED'
        : undefined,
      metrics: {
        seed: params.seed,
        abyssDepth: params.abyssDepth,
        peakSharpness: params.peakSharpness,
        samples: res * res,
      },
    },
  }
}
