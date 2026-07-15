/**
 * Landscape erosion deepen (letter bg) — deterministic brush-local hydraulic + thermal.
 * Writes heights only; no Math.random; client-safe (no fs / Node).
 */

import type { HeightfieldDocument, TerrainBrushStroke } from '@/lib/production/terrain-heightfield-math'

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

function softFalloff(t: number, power: number): number {
  const x = clamp01(1 - t)
  return Math.pow(x, Math.max(0.5, power))
}

/** Deterministic 0..1 hash — authority-safe (mirrors foliageHash01). */
export function erosionHash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

export const EROSION_DROPLET_CAP = 96
export const EROSION_STEP_CAP = 48
export const EROSION_THERMAL_ITER_CAP = 8

export type TerrainErosionType = 'hydraulic' | 'thermal'

export function resolveErosionType(stroke: TerrainBrushStroke): TerrainErosionType {
  return stroke.erosionType === 'thermal' ? 'thermal' : 'hydraulic'
}

function sampleHeight(heights: Float32Array, res: number, x: number, y: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const x1 = Math.min(res - 1, x0 + 1)
  const y1 = Math.min(res - 1, y0 + 1)
  const tx = x - x0
  const ty = y - y0
  const h00 = heights[y0 * res + x0] ?? 0
  const h10 = heights[y0 * res + x1] ?? 0
  const h01 = heights[y1 * res + x0] ?? 0
  const h11 = heights[y1 * res + x1] ?? 0
  return h00 * (1 - tx) * (1 - ty) + h10 * tx * (1 - ty) + h01 * (1 - tx) * ty + h11 * tx * ty
}

function depositAt(
  heights: Float32Array,
  res: number,
  x: number,
  y: number,
  amount: number,
  mask: (px: number, py: number) => number,
): void {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  if (xi < 0 || yi < 0 || xi >= res || yi >= res) return
  const w = mask(xi, yi)
  if (w <= 0) return
  const i = yi * res + xi
  heights[i] = clamp01(heights[i]! + amount * w)
}

function erodeAt(
  heights: Float32Array,
  res: number,
  x: number,
  y: number,
  amount: number,
  mask: (px: number, py: number) => number,
): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  if (xi < 0 || yi < 0 || xi >= res || yi >= res) return 0
  const w = mask(xi, yi)
  if (w <= 0) return 0
  const i = yi * res + xi
  const removed = Math.min(heights[i]!, Math.max(0, amount) * w)
  heights[i] = clamp01(heights[i]! - removed)
  return removed
}

/**
 * Brush-local hydraulic erosion: seeded droplets within the stroke disk.
 * Simplified Musgrave-style sediment capacity — real height mutation, not particle theater.
 */
export function applyHydraulicErosionStroke(
  doc: HeightfieldDocument,
  stroke: TerrainBrushStroke,
): HeightfieldDocument {
  const res = doc.meta.resolution
  const heights = doc.heights
  const cx = clamp01(stroke.u) * (res - 1)
  const cy = clamp01(stroke.v) * (res - 1)
  const radiusPx = Math.max(1, stroke.radius * (res - 1))
  const falloff = stroke.falloff ?? 2
  const strength = clamp01(Math.abs(stroke.strength))
  const seed = stroke.seed ?? doc.meta.strokeCount * 9973 + 17
  const dropletCount = Math.max(
    8,
    Math.min(EROSION_DROPLET_CAP, Math.floor((stroke.iterations ?? 48) * (0.5 + strength))),
  )

  const mask = (px: number, py: number): number => {
    const dx = px - cx
    const dy = py - cy
    const d = Math.sqrt(dx * dx + dy * dy)
    if (d > radiusPx) return 0
    return softFalloff(d / radiusPx, falloff)
  }

  const inertia = 0.35
  const capacityFactor = 3.5 * (0.4 + strength)
  const erosionRate = 0.28 * (0.35 + strength)
  const depositionRate = 0.28
  const evaporationRate = 0.02
  const gravity = 3.5
  const stepLen = 1.15

  for (let d = 0; d < dropletCount; d++) {
    const a = erosionHash01(seed + d * 19.17) * Math.PI * 2
    const r = Math.sqrt(erosionHash01(seed + d * 31.41 + 0.7)) * radiusPx
    let x = cx + Math.cos(a) * r
    let y = cy + Math.sin(a) * r
    let sediment = 0
    let water = 1
    let speed = 0.05 + erosionHash01(seed + d * 7.3) * 0.1
    let dx = 0
    let dy = 0

    for (let step = 0; step < EROSION_STEP_CAP; step++) {
      if (x < 1 || y < 1 || x >= res - 2 || y >= res - 2) break
      if (mask(Math.floor(x), Math.floor(y)) <= 0.02) break

      const xi = Math.floor(x)
      const yi = Math.floor(y)
      const h00 = heights[yi * res + xi]!
      const h10 = heights[yi * res + (xi + 1)]!
      const h01 = heights[(yi + 1) * res + xi]!
      const h11 = heights[(yi + 1) * res + (xi + 1)]!

      const gx = (h10 - h00 + h11 - h01) * 0.5
      const gy = (h01 - h00 + h11 - h10) * 0.5

      dx = dx * inertia - gx * (1 - inertia)
      dy = dy * inertia - gy * (1 - inertia)
      const len = Math.sqrt(dx * dx + dy * dy)
      if (len < 1e-5) break
      dx /= len
      dy /= len

      const prevH = sampleHeight(heights, res, x, y)
      x += dx * stepLen
      y += dy * stepLen
      const nextH = sampleHeight(heights, res, x, y)
      const heightDiff = nextH - prevH

      speed = Math.sqrt(Math.max(0, speed * speed + Math.max(0, -heightDiff) * gravity))
      const capacity = Math.max(0.005, Math.max(0, -heightDiff) * speed * water * capacityFactor)

      if (sediment > capacity || heightDiff > 0) {
        const deposit = (sediment - Math.min(sediment, capacity)) * depositionRate
        if (deposit > 0) {
          depositAt(heights, res, x - dx * stepLen, y - dy * stepLen, deposit, mask)
          sediment -= deposit
        }
      } else {
        const want = (capacity - sediment) * erosionRate
        const eroded = erodeAt(heights, res, x - dx * stepLen, y - dy * stepLen, want, mask)
        sediment += eroded
      }

      water *= 1 - evaporationRate
      if (water < 0.02) break
    }
  }

  doc.meta.strokeCount += 1
  doc.meta.updatedAt = new Date().toISOString()
  return doc
}

/**
 * Brush-local thermal weathering: talus angle redistribute within the stroke disk.
 */
export function applyThermalErosionStroke(
  doc: HeightfieldDocument,
  stroke: TerrainBrushStroke,
): HeightfieldDocument {
  const res = doc.meta.resolution
  const heights = doc.heights
  const cx = clamp01(stroke.u) * (res - 1)
  const cy = clamp01(stroke.v) * (res - 1)
  const radiusPx = Math.max(1, stroke.radius * (res - 1))
  const falloff = stroke.falloff ?? 2
  const strength = clamp01(Math.abs(stroke.strength))
  const iterations = Math.max(
    1,
    Math.min(EROSION_THERMAL_ITER_CAP, Math.floor((stroke.iterations ?? 4) * (0.5 + strength))),
  )
  // Normalized height delta ≈ talus for ~grid spacing
  const talus = 0.012 + (1 - strength) * 0.02

  const x0 = Math.max(1, Math.floor(cx - radiusPx))
  const x1 = Math.min(res - 2, Math.ceil(cx + radiusPx))
  const y0 = Math.max(1, Math.floor(cy - radiusPx))
  const y1 = Math.min(res - 2, Math.ceil(cy + radiusPx))

  const scratch = new Float32Array(heights)

  for (let iter = 0; iter < iterations; iter++) {
    scratch.set(heights)
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = x - cx
        const dy = y - cy
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > radiusPx) continue
        const w = softFalloff(d / radiusPx, falloff) * strength
        if (w <= 0) continue

        const i = y * res + x
        const h = scratch[i]!
        let maxDiff = 0
        let maxN = -1
        const neighbors = [
          i - 1,
          i + 1,
          i - res,
          i + res,
          i - res - 1,
          i - res + 1,
          i + res - 1,
          i + res + 1,
        ]
        for (let n = 0; n < neighbors.length; n++) {
          const ni = neighbors[n]!
          if (ni < 0 || ni >= heights.length) continue
          const diff = h - scratch[ni]!
          if (diff > maxDiff) {
            maxDiff = diff
            maxN = ni
          }
        }
        if (maxN < 0 || maxDiff <= talus) continue
        const excess = (maxDiff - talus) * 0.5 * w
        heights[i] = clamp01(heights[i]! - excess)
        heights[maxN] = clamp01(heights[maxN]! + excess)
      }
    }
  }

  doc.meta.strokeCount += 1
  doc.meta.updatedAt = new Date().toISOString()
  return doc
}

/**
 * Dispatch erosion stroke. Caller (applyBrushStroke) owns non-erosion modes.
 */
export function applyErosionStroke(
  doc: HeightfieldDocument,
  stroke: TerrainBrushStroke,
): HeightfieldDocument {
  if (resolveErosionType(stroke) === 'thermal') {
    return applyThermalErosionStroke(doc, stroke)
  }
  return applyHydraulicErosionStroke(doc, stroke)
}
