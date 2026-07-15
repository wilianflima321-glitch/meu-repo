/**
 * Focus 2B / Onda A.1 — pure heightfield brush math (no fs / Node).
 * Shared by server authority + LandscapeEditor client so strokes match disk.
 * Letter bg: erosion mode dispatches to terrain-heightfield-erosion-math.
 * Letter bh: noise mode dispatches to terrain-heightfield-noise-math (seeded).
 */

import { applyErosionStroke } from '@/lib/production/terrain-heightfield-erosion-math'
import { applyNoiseStroke } from '@/lib/production/terrain-heightfield-noise-math'

export interface HeightfieldMeta {
  resolution: number
  widthMeters: number
  depthMeters: number
  maxHeight: number
  version: 1
  updatedAt: string
  strokeCount: number
}

export interface HeightfieldDocument {
  meta: HeightfieldMeta
  /** Row-major heights normalized 0..1 */
  heights: Float32Array
}

export interface TerrainBrushStroke {
  /** Normalized UV 0..1 */
  u: number
  v: number
  /** Brush radius in UV space (0..1) */
  radius: number
  /** Signed strength — positive raise, negative lower; erosion uses abs magnitude */
  strength: number
  falloff?: number
  mode?: 'sculpt' | 'flatten' | 'smooth' | 'erosion' | 'noise'
  /** Letter bg — hydraulic (default) or thermal talus */
  erosionType?: 'hydraulic' | 'thermal'
  /** Letter bg — droplet / thermal iteration budget (capped in math) */
  iterations?: number
  /** Letter bg/bh — deterministic seed (erosion droplets / noise field; authority replay) */
  seed?: number
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function softFalloff(t: number, power: number): number {
  const x = clamp01(1 - t)
  return Math.pow(x, Math.max(0.5, power))
}

export function createFlatHeightfield(input: {
  resolution?: number
  widthMeters?: number
  depthMeters?: number
  maxHeight?: number
}): HeightfieldDocument {
  const resolution = Math.max(8, Math.min(1025, Math.floor(input.resolution ?? 129)))
  const heights = new Float32Array(resolution * resolution)
  return {
    meta: {
      resolution,
      widthMeters: input.widthMeters ?? 256,
      depthMeters: input.depthMeters ?? 256,
      maxHeight: input.maxHeight ?? 64,
      version: 1,
      updatedAt: new Date().toISOString(),
      strokeCount: 0,
    },
    heights,
  }
}

/**
 * Apply a brush stroke in-place. Deterministic, no Three.js dependency.
 */
export function applyBrushStroke(
  doc: HeightfieldDocument,
  stroke: TerrainBrushStroke,
): HeightfieldDocument {
  const mode = stroke.mode ?? 'sculpt'
  if (mode === 'erosion') {
    return applyErosionStroke(doc, stroke)
  }
  if (mode === 'noise') {
    return applyNoiseStroke(doc, stroke)
  }

  const res = doc.meta.resolution
  const heights = doc.heights
  const cx = clamp01(stroke.u) * (res - 1)
  const cy = clamp01(stroke.v) * (res - 1)
  const radiusPx = Math.max(1, stroke.radius * (res - 1))
  const falloff = stroke.falloff ?? 2
  const r2 = radiusPx * radiusPx

  let flattenTarget = 0
  if (mode === 'flatten') {
    const ix = Math.round(cx)
    const iy = Math.round(cy)
    flattenTarget = heights[iy * res + ix] ?? 0
  }

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const dx = x - cx
      const dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      const t = Math.sqrt(d2) / radiusPx
      const w = softFalloff(t, falloff)
      const i = y * res + x
      if (mode === 'sculpt') {
        heights[i] = clamp01(heights[i] + stroke.strength * w)
      } else if (mode === 'flatten') {
        heights[i] = heights[i] + (flattenTarget - heights[i]) * w * Math.abs(stroke.strength)
      } else if (mode === 'smooth') {
        let sum = 0
        let count = 0
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const nx = x + ox
            const ny = y + oy
            if (nx < 0 || ny < 0 || nx >= res || ny >= res) continue
            sum += heights[ny * res + nx]
            count++
          }
        }
        const mean = count > 0 ? sum / count : heights[i]
        heights[i] = heights[i] + (mean - heights[i]) * w * Math.abs(stroke.strength)
      }
    }
  }

  doc.meta.strokeCount += 1
  doc.meta.updatedAt = new Date().toISOString()
  return doc
}

export function heightfieldHonestyReport(doc: HeightfieldDocument | null): {
  status: 'live' | 'empty' | 'missing'
  mock: false
  resolution?: number
  strokeCount?: number
  claim: string
} {
  if (!doc) {
    return {
      status: 'missing',
      mock: false,
      claim: 'No persisted heightfield — terrain brush not live until first save',
    }
  }
  if (doc.meta.strokeCount === 0) {
    return {
      status: 'empty',
      mock: false,
      resolution: doc.meta.resolution,
      strokeCount: 0,
      claim: 'Heightfield substrate exists (flat) — not mock; awaiting sculpt strokes',
    }
  }
  return {
    status: 'live',
    mock: false,
    resolution: doc.meta.resolution,
    strokeCount: doc.meta.strokeCount,
    claim: 'Persisted heightfield with brush history — Focus 2B substrate live',
  }
}

export function encodeHeightsBase64(heights: Float32Array): string {
  const bytes = new Uint8Array(heights.buffer, heights.byteOffset, heights.byteLength)
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64')
  }
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

export function decodeHeightsBase64(b64: string, expected: number): Float32Array {
  let bytes: Uint8Array
  if (typeof Buffer !== 'undefined') {
    bytes = new Uint8Array(Buffer.from(b64, 'base64'))
  } else {
    const binary = atob(b64)
    bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  }
  const heights = new Float32Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 4))
  if (heights.length !== expected) {
    throw new Error(`HEIGHTFIELD_DECODE_MISMATCH: expected ${expected}, got ${heights.length}`)
  }
  return heights
}
