/**
 * Landscape seeded sculpt-noise deepen (letter bh) — deterministic brush-local noise.
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

/** Deterministic 0..1 hash — authority-safe (mirrors erosionHash01 / foliageHash01). */
export function noiseHash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Value-noise sample at integer lattice — smooth enough for sculpt strokes, byte-stable.
 */
export function noiseSample2(seed: number, x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const sx = fx * fx * (3 - 2 * fx)
  const sy = fy * fy * (3 - 2 * fy)
  const n00 = noiseHash01(seed + ix * 374761 + iy * 668265)
  const n10 = noiseHash01(seed + (ix + 1) * 374761 + iy * 668265)
  const n01 = noiseHash01(seed + ix * 374761 + (iy + 1) * 668265)
  const n11 = noiseHash01(seed + (ix + 1) * 374761 + (iy + 1) * 668265)
  const nx0 = n00 + (n10 - n00) * sx
  const nx1 = n01 + (n11 - n01) * sx
  return nx0 + (nx1 - nx0) * sy
}

/**
 * Brush-local seeded noise sculpt: signed displacement under falloff disk.
 * Same seed + params → identical heights (authority replay).
 */
export function applyNoiseStroke(
  doc: HeightfieldDocument,
  stroke: TerrainBrushStroke,
): HeightfieldDocument {
  const res = doc.meta.resolution
  const heights = doc.heights
  const cx = clamp01(stroke.u) * (res - 1)
  const cy = clamp01(stroke.v) * (res - 1)
  const radiusPx = Math.max(1, stroke.radius * (res - 1))
  const falloff = stroke.falloff ?? 2
  const magnitude = Math.abs(stroke.strength)
  const seed =
    stroke.seed ??
    doc.meta.strokeCount * 9973 +
      Math.floor(stroke.u * 1e4) * 13 +
      Math.floor(stroke.v * 1e4) * 17
  const r2 = radiusPx * radiusPx
  // Frequency scales with brush size so small brushes stay crisp
  const freq = Math.max(0.08, Math.min(0.45, 4 / Math.max(radiusPx, 1)))

  for (let y = 0; y < res; y++) {
    for (let x = 0; x < res; x++) {
      const dx = x - cx
      const dy = y - cy
      const d2 = dx * dx + dy * dy
      if (d2 > r2) continue
      const t = Math.sqrt(d2) / radiusPx
      const w = softFalloff(t, falloff)
      const n = noiseSample2(seed, x * freq, y * freq) * 2 - 1
      const i = y * res + x
      heights[i] = clamp01(heights[i]! + magnitude * w * n)
    }
  }

  doc.meta.strokeCount += 1
  doc.meta.updatedAt = new Date().toISOString()
  return doc
}
