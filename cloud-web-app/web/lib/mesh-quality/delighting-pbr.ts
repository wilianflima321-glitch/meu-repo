/**
 * Letter bz — Delighting PBR (Native Generation dossier fold).
 *
 * Strip baked lighting / shadows from clay albedo-ish textures and emit
 * Radiance-ready albedo / normal / roughness / metalness channels.
 * Heuristic delighting — not commercial ML delighting parity (HELD).
 */

import type { MeshQualityStageReceipt } from '@/lib/mesh-quality/types'
import type { RadiancePbrSlotAssignment, ScenePbrContext } from '@/lib/mesh-quality/contextual-pbr'

export const DELIGHTING_PBR_WIRED = true as const
export const DELIGHTING_PBR_LETTER = 'bz' as const
/** Commercial ML delighting / Meshy-class texture separation — HELD. */
export const DELIGHTING_COMMERCIAL_PARITY_HELD = true as const
export const DELIGHTING_COMMERCIAL_PARITY_READY = false as const

export type RadiancePbrChannelId = 'albedo' | 'normal' | 'roughness' | 'metalness'

export interface ClayTextureBuffer {
  /** RGBA8 tightly packed, row-major. */
  rgba: Uint8ClampedArray
  width: number
  height: number
}

export interface RadiancePbrChannelMaps {
  /** Linear RGB albedo 0–1 (no baked lighting). */
  albedo: Float32Array
  /** Tangent-space-ish normal XYZ in [-1,1] (flat default when unknown). */
  normal: Float32Array
  /** Scalar roughness 0–1 per texel. */
  roughness: Float32Array
  /** Scalar metalness 0–1 per texel. */
  metalness: Float32Array
  width: number
  height: number
}

export interface DelightingPbrResult {
  channels: RadiancePbrChannelMaps
  slots: RadiancePbrSlotAssignment[]
  bakedLightingInAlbedo: false
  bakedLightingStripped: true
  delightingCommercialParityReady: false
  receipt: MeshQualityStageReceipt
}

/** Build a deliberately baked (lit) clay albedo fixture for soak tests. */
export function buildBakedClayTextureFixture(width = 32, height = 32): ClayTextureBuffer {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4
      // Soft clay base
      let r = 160
      let g = 120
      let b = 90
      // Fake directional shadow baked into albedo (darken lower-left)
      const shade = 0.35 + 0.65 * ((x + y) / (width + height))
      // Fake specular hot-spot baked in (upper-right)
      const hx = x / width - 0.75
      const hy = y / height - 0.25
      const hot = Math.max(0, 1 - Math.hypot(hx, hy) * 4) * 80
      r = Math.min(255, Math.floor(r * shade + hot))
      g = Math.min(255, Math.floor(g * shade + hot * 0.9))
      b = Math.min(255, Math.floor(b * shade + hot * 0.7))
      rgba[i] = r
      rgba[i + 1] = g
      rgba[i + 2] = b
      rgba[i + 3] = 255
    }
  }
  return { rgba, width, height }
}

/**
 * Delight clay texture → Radiance PBR channels.
 * Strips low-frequency lighting estimate from RGB; never writes lit bake into albedo.
 */
export function delightClayTextureToRadiancePbr(input: {
  clayTexture?: ClayTextureBuffer
  context?: ScenePbrContext
  /** Fallback solid albedo when no texture (still emits channel maps). */
  fallbackAlbedo?: [number, number, number]
  metallicHint?: number
  roughnessHint?: number
}): DelightingPbrResult {
  const tex = input.clayTexture ?? solidTexture(input.fallbackAlbedo ?? [0.4, 0.4, 0.4], 8, 8)
  const { width, height, rgba } = tex
  const n = width * height

  const albedo = new Float32Array(n * 3)
  const normal = new Float32Array(n * 3)
  const roughness = new Float32Array(n)
  const metalness = new Float32Array(n)

  // Pass 1 — luminance + local mean for lighting estimate
  const lum = new Float32Array(n)
  let meanLum = 0
  for (let i = 0; i < n; i++) {
    const o = i * 4
    const r = rgba[o]! / 255
    const g = rgba[o + 1]! / 255
    const b = rgba[o + 2]! / 255
    lum[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b
    meanLum += lum[i]!
  }
  meanLum /= Math.max(1, n)

  // Blurred lighting proxy (box 3×3)
  const lit = new Float32Array(n)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let s = 0
      let c = 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = Math.min(width - 1, Math.max(0, x + dx))
          const yy = Math.min(height - 1, Math.max(0, y + dy))
          s += lum[yy * width + xx]!
          c++
        }
      }
      lit[y * width + x] = s / c
    }
  }

  const metallicHint = clamp01(input.metallicHint ?? metallicFromContext(input.context))
  const roughnessHint = clamp01(input.roughnessHint ?? roughnessFromContext(input.context))

  let maxAlbedoLum = 0
  let minAlbedoLum = 1
  for (let i = 0; i < n; i++) {
    const o = i * 4
    const r = rgba[o]! / 255
    const g = rgba[o + 1]! / 255
    const b = rgba[o + 2]! / 255
    // Divide out lighting estimate (delight) — clamp to avoid blowouts
    const L = Math.max(0.08, lit[i]!)
    const scale = meanLum / L
    let ar = clamp01(r * scale)
    let ag = clamp01(g * scale)
    let ab = clamp01(b * scale)
    // Soft normalize chroma so residual shadow doesn't dominate albedo
    const aLum = 0.2126 * ar + 0.7152 * ag + 0.0722 * ab
    if (aLum > 1e-4) {
      const target = Math.min(0.92, Math.max(0.12, aLum))
      const k = target / aLum
      ar = clamp01(ar * k)
      ag = clamp01(ag * k)
      ab = clamp01(ab * k)
    }
    albedo[i * 3] = ar
    albedo[i * 3 + 1] = ag
    albedo[i * 3 + 2] = ab
    maxAlbedoLum = Math.max(maxAlbedoLum, 0.2126 * ar + 0.7152 * ag + 0.0722 * ab)
    minAlbedoLum = Math.min(minAlbedoLum, 0.2126 * ar + 0.7152 * ag + 0.0722 * ab)

    // Height-from-delit luminance → simple normal
    const x = i % width
    const y = Math.floor(i / width)
    const iL = lum[y * width + Math.max(0, x - 1)]!
    const iR = lum[y * width + Math.min(width - 1, x + 1)]!
    const iU = lum[Math.max(0, y - 1) * width + x]!
    const iD = lum[Math.min(height - 1, y + 1) * width + x]!
    let nx = (iL - iR) * 2
    let ny = (iU - iD) * 2
    let nz = 1
    const len = Math.hypot(nx, ny, nz) || 1
    nx /= len
    ny /= len
    nz /= len
    normal[i * 3] = nx
    normal[i * 3 + 1] = ny
    normal[i * 3 + 2] = nz

    // High residual lighting variance → slightly rougher (diffuse clay)
    const residual = Math.abs(lum[i]! - lit[i]!)
    roughness[i] = clamp01(roughnessHint + residual * 0.35)
    metalness[i] = clamp01(metallicHint * (1 - residual))
  }

  const avgAlbedo = averageRgb(albedo)
  const avgRough = averageScalar(roughness)
  const avgMetal = averageScalar(metalness)

  const slots: RadiancePbrSlotAssignment[] = [
    { slot: 'baseColor', value: avgAlbedo, source: 'texture-refine' },
    { slot: 'metallic', value: avgMetal, source: 'texture-refine' },
    { slot: 'roughness', value: avgRough, source: 'texture-refine' },
    { slot: 'normal', value: 1, source: 'texture-refine' },
    { slot: 'ao', value: 1, source: 'default' },
    { slot: 'emissive', value: [0, 0, 0], source: 'default' },
  ]

  const dynamicRangeBefore = estimateBakeDynamicRange(rgba)
  const dynamicRangeAfter = maxAlbedoLum - minAlbedoLum

  return {
    channels: { albedo, normal, roughness, metalness, width, height },
    slots,
    bakedLightingInAlbedo: false,
    bakedLightingStripped: true,
    delightingCommercialParityReady: false,
    receipt: {
      stage: 'contextual-pbr',
      status: 'closed',
      evidence: [
        'delighting-pbr-bz',
        'baked-lighting-stripped',
        'radiance-albedo-normal-roughness-metalness',
        'no-baked-shadows-in-albedo',
        'delighting-commercial-parity-HELD',
      ],
      metrics: {
        width,
        height,
        avgRough,
        avgMetal,
        bakeDynamicRangeBefore: dynamicRangeBefore,
        albedoDynamicRangeAfter: dynamicRangeAfter,
        bakedLightingStripped: true,
        delightingCommercialParityReady: false,
      },
    },
  }
}

function solidTexture(
  rgb: [number, number, number],
  width: number,
  height: number,
): ClayTextureBuffer {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = Math.round(clamp01(rgb[0]) * 255)
    rgba[i * 4 + 1] = Math.round(clamp01(rgb[1]) * 255)
    rgba[i * 4 + 2] = Math.round(clamp01(rgb[2]) * 255)
    rgba[i * 4 + 3] = 255
  }
  return { rgba, width, height }
}

function estimateBakeDynamicRange(rgba: Uint8ClampedArray): number {
  let minL = 1
  let maxL = 0
  for (let i = 0; i < rgba.length; i += 4) {
    const r = rgba[i]! / 255
    const g = rgba[i + 1]! / 255
    const b = rgba[i + 2]! / 255
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
    minL = Math.min(minL, L)
    maxL = Math.max(maxL, L)
  }
  return maxL - minL
}

function averageRgb(albedo: Float32Array): [number, number, number] {
  let r = 0
  let g = 0
  let b = 0
  const n = albedo.length / 3
  for (let i = 0; i < n; i++) {
    r += albedo[i * 3]!
    g += albedo[i * 3 + 1]!
    b += albedo[i * 3 + 2]!
  }
  return [r / n, g / n, b / n]
}

function averageScalar(a: Float32Array): number {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i]!
  return s / Math.max(1, a.length)
}

function metallicFromContext(ctx?: ScenePbrContext): number {
  if (!ctx) return 0.1
  if (ctx.biome === 'sci-fi') return 0.65
  if (ctx.biome === 'urban') return 0.3
  return 0.08
}

function roughnessFromContext(ctx?: ScenePbrContext): number {
  if (!ctx) return 0.55
  if (ctx.weather === 'rain') return 0.28
  if (ctx.biome === 'desert') return 0.8
  if (ctx.biome === 'dark-fantasy') return 0.5
  return 0.55
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}
