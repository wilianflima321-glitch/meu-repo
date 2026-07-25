/**
 * Pure foliage brush placement math — used by FoliagePainterRuntime paint strokes.
 * Falloff must affect placement probability; radius/density alone are not enough.
 */

export type BrushStrokeSample = {
  offsetX: number
  offsetZ: number
  accepted: boolean
}

/**
 * Sample one candidate instance offset inside the brush disk.
 * Higher falloff rejects more samples near the edge (UE-style soft brush).
 */
export function sampleBrushStrokeOffset(input: {
  radius: number
  falloff: number
  random?: () => number
}): BrushStrokeSample {
  const random = input.random ?? Math.random
  const radius = Math.max(0, input.radius)
  const falloff = Math.min(1, Math.max(0, input.falloff))
  const angle = random() * Math.PI * 2
  const dist = Math.sqrt(random()) * radius
  const edgeT = radius <= 0 ? 0 : dist / radius
  // Soft reject: at falloff=0 keep all; at falloff=1 keep ~center-weighted only.
  const keepChance = 1 - edgeT * falloff
  return {
    offsetX: Math.cos(angle) * dist,
    offsetZ: Math.sin(angle) * dist,
    accepted: random() <= keepChance,
  }
}

export function instancesPerStroke(density: number): number {
  return Math.max(0, Math.floor(Math.min(1, Math.max(0, density)) * 10))
}

/** Minimal heightfield shape needed for per-instance terrain sampling (no THREE dependency). */
export interface FoliageTerrainHeightfield {
  heights: Float32Array
  resolution: number
  widthMeters: number
  depthMeters: number
  maxHeight: number
}

export interface FoliageTerrainSample {
  heightM: number
  slopeDeg: number
}

/**
 * Bilinear height + central-difference slope sample at a world (x, z).
 * Without a heightfield (flat plane substrate) height falls back to the
 * brush point's own Y and slope is honestly 0 — never a fabricated value.
 */
export function sampleFoliageTerrain(
  heightfield: FoliageTerrainHeightfield | null | undefined,
  worldX: number,
  worldZ: number,
  fallbackHeight: number,
): FoliageTerrainSample {
  if (!heightfield || heightfield.heights.length !== heightfield.resolution * heightfield.resolution) {
    return { heightM: fallbackHeight, slopeDeg: 0 }
  }

  const { heights, resolution: res, widthMeters, depthMeters, maxHeight } = heightfield

  const sampleAt = (x: number, z: number): number => {
    const u = x / widthMeters + 0.5
    const v = z / depthMeters + 0.5
    if (u < 0 || u > 1 || v < 0 || v > 1) return fallbackHeight
    const fx = u * (res - 1)
    const fz = v * (res - 1)
    const x0 = Math.floor(fx)
    const z0 = Math.floor(fz)
    const x1 = Math.min(res - 1, x0 + 1)
    const z1 = Math.min(res - 1, z0 + 1)
    const tx = fx - x0
    const tz = fz - z0
    const h00 = heights[z0 * res + x0] ?? 0
    const h10 = heights[z0 * res + x1] ?? 0
    const h01 = heights[z1 * res + x0] ?? 0
    const h11 = heights[z1 * res + x1] ?? 0
    const h0 = h00 * (1 - tx) + h10 * tx
    const h1 = h01 * (1 - tx) + h11 * tx
    return (h0 * (1 - tz) + h1 * tz) * maxHeight
  }

  const heightM = sampleAt(worldX, worldZ)
  const eps = Math.max(widthMeters, depthMeters) / Math.max(1, res)
  const dHdx = (sampleAt(worldX + eps, worldZ) - sampleAt(worldX - eps, worldZ)) / (2 * eps)
  const dHdz = (sampleAt(worldX, worldZ + eps) - sampleAt(worldX, worldZ - eps)) / (2 * eps)
  const slopeDeg = Math.atan(Math.sqrt(dHdx * dHdx + dHdz * dHdz)) * (180 / Math.PI)

  return { heightM, slopeDeg }
}
