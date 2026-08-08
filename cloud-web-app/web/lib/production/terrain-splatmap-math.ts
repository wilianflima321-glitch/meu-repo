import { DOMAIN_TERRAIN_SPLAT } from '@/lib/design-system/domain-color-presets'
/**
 * Landscape paint / layer brush — pure splat (weight-map) math (no fs / Node).
 * Shared by server authority + LandscapeEditor client so strokes match disk.
 * Zero-MVP: durable layer weights; no sin-wave mock as shipped surface.
 */

export interface SplatLayerMeta {
  id: string
  name: string
  color: string
}

export interface SplatmapMeta {
  resolution: number
  layerCount: number
  layers: SplatLayerMeta[]
  version: 1
  updatedAt: string
  strokeCount: number
}

export interface SplatmapDocument {
  meta: SplatmapMeta
  /**
   * Interleaved weights: texel i owns [i * layerCount .. (i+1) * layerCount).
   * Per-texel weights are normalized to sum ≈ 1.
   */
  weights: Float32Array
}

export interface TerrainSplatStroke {
  /** Normalized UV 0..1 */
  u: number
  v: number
  /** Brush radius in UV space (0..1) */
  radius: number
  /** Paint amount 0..1 */
  strength: number
  falloff?: number
  /** Target layer index into meta.layers */
  layerIndex: number
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function softFalloff(t: number, power: number): number {
  const x = clamp01(1 - t)
  return Math.pow(x, Math.max(0.5, power))
}

function normalizeTexel(weights: Float32Array, base: number, layerCount: number): void {
  let sum = 0
  for (let c = 0; c < layerCount; c++) sum += weights[base + c]!
  if (sum <= 1e-8) {
    weights[base] = 1
    for (let c = 1; c < layerCount; c++) weights[base + c] = 0
    return
  }
  for (let c = 0; c < layerCount; c++) {
    weights[base + c] = weights[base + c]! / sum
  }
}

export function createFlatSplatmap(input: {
  resolution?: number
  layers?: SplatLayerMeta[]
}): SplatmapDocument {
  const layers = (input.layers?.length ? input.layers : [
    { id: '1', name: 'Grass', color: DOMAIN_TERRAIN_SPLAT.grass },
    { id: '2', name: 'Rock', color: DOMAIN_TERRAIN_SPLAT.rock },
    { id: '3', name: 'Snow', color: DOMAIN_TERRAIN_SPLAT.snow },
  ]).slice(0, 8)
  const resolution = Math.max(8, Math.min(1025, Math.floor(input.resolution ?? 129)))
  const layerCount = layers.length
  const weights = new Float32Array(resolution * resolution * layerCount)
  // Default: full weight on layer 0
  for (let i = 0; i < resolution * resolution; i++) {
    weights[i * layerCount] = 1
  }
  return {
    meta: {
      resolution,
      layerCount,
      layers,
      version: 1,
      updatedAt: new Date().toISOString(),
      strokeCount: 0,
    },
    weights,
  }
}

/**
 * Apply a paint stroke in-place. Deterministic, no Three.js dependency.
 * Increases target layer weight under the brush falloff, then renormalizes.
 */
export function applySplatStroke(
  doc: SplatmapDocument,
  stroke: TerrainSplatStroke,
): SplatmapDocument {
  const res = doc.meta.resolution
  const layerCount = doc.meta.layerCount
  const weights = doc.weights
  const layerIndex = Math.max(0, Math.min(layerCount - 1, Math.floor(stroke.layerIndex)))
  const cx = clamp01(stroke.u) * (res - 1)
  const cy = clamp01(stroke.v) * (res - 1)
  const radiusPx = Math.max(1, stroke.radius * (res - 1))
  const falloff = stroke.falloff ?? 2
  const amount = clamp01(Math.abs(stroke.strength))
  const r2 = radiusPx * radiusPx

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const dx = x - cx
      const dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      const t = Math.sqrt(d2) / radiusPx
      const w = softFalloff(t, falloff) * amount
      if (w <= 0) continue
      const base = (y * res + x) * layerCount
      const current = weights[base + layerIndex]!
      weights[base + layerIndex] = current + (1 - current) * w
      // Bleed other channels toward zero proportionally
      const remain = 1 - weights[base + layerIndex]!
      let otherSum = 0
      for (let c = 0; c < layerCount; c++) {
        if (c === layerIndex) continue
        otherSum += weights[base + c]!
      }
      if (otherSum > 1e-8) {
        for (let c = 0; c < layerCount; c++) {
          if (c === layerIndex) continue
          weights[base + c] = (weights[base + c]! / otherSum) * remain
        }
      } else if (layerCount > 1) {
        const share = remain / (layerCount - 1)
        for (let c = 0; c < layerCount; c++) {
          if (c === layerIndex) continue
          weights[base + c] = share
        }
      }
      normalizeTexel(weights, base, layerCount)
    }
  }

  doc.meta.strokeCount += 1
  doc.meta.updatedAt = new Date().toISOString()
  return doc
}

/** Sample blended RGB (0..1) at texel for viewport preview. */
export function sampleSplatColor(
  doc: SplatmapDocument,
  texelIndex: number,
): { r: number; g: number; b: number } {
  const { layerCount, layers } = doc.meta
  const base = texelIndex * layerCount
  let r = 0
  let g = 0
  let b = 0
  for (let c = 0; c < layerCount; c++) {
    const w = doc.weights[base + c] ?? 0
    const parsed = parseCssColor(layers[c]?.color ?? DOMAIN_TERRAIN_SPLAT.fallback)
    r += parsed.r * w
    g += parsed.g * w
    b += parsed.b * w
  }
  return { r, g, b }
}

export function parseCssColor(input: string): { r: number; g: number; b: number } {
  const hex = input.trim().match(/^#([0-9a-fA-F]{6})$/)
  if (hex) {
    const n = parseInt(hex[1]!, 16)
    return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 }
  }
  const rgb = input.trim().match(/^rgba?\(\s*([\d.]+)\s*[,\s]\s*([\d.]+)\s*[,\s]\s*([\d.]+)/i)
  if (rgb) {
    return {
      r: clamp01(Number(rgb[1]) / 255),
      g: clamp01(Number(rgb[2]) / 255),
      b: clamp01(Number(rgb[3]) / 255),
    }
  }
  return { r: 0.5, g: 0.5, b: 0.5 }
}

export function splatmapHonestyReport(doc: SplatmapDocument | null): {
  status: 'live' | 'empty' | 'missing'
  mock: false
  resolution?: number
  strokeCount?: number
  layerCount?: number
  claim: string
} {
  if (!doc) {
    return {
      status: 'missing',
      mock: false,
      claim: 'No persisted splatmap — paint brush not live until first save',
    }
  }
  if (doc.meta.strokeCount === 0) {
    return {
      status: 'empty',
      mock: false,
      resolution: doc.meta.resolution,
      strokeCount: 0,
      layerCount: doc.meta.layerCount,
      claim: 'Splatmap substrate exists (base layer) — not mock; awaiting paint strokes',
    }
  }
  return {
    status: 'live',
    mock: false,
    resolution: doc.meta.resolution,
    strokeCount: doc.meta.strokeCount,
    layerCount: doc.meta.layerCount,
    claim: 'Persisted splat weight-map with paint history — Landscape paint live',
  }
}

export function encodeWeightsBase64(weights: Float32Array): string {
  const bytes = new Uint8Array(weights.buffer, weights.byteOffset, weights.byteLength)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

export function decodeWeightsBase64(b64: string, expected: number): Float32Array {
  let bytes: Uint8Array
  if (typeof Buffer !== 'undefined') {
    bytes = new Uint8Array(Buffer.from(b64, 'base64'))
  } else {
    const binary = atob(b64)
    bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  }
  const weights = new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4))
  if (weights.length !== expected) {
    throw new Error(`SPLATMAP_DECODE_MISMATCH: expected ${expected}, got ${weights.length}`)
  }
  return weights
}
