/**
 * Onda A.1 deepen — pure LandscapeEditor ↔ heightfield stroke mapping (no fetch / DOM).
 */

import type { TerrainBrushStroke } from '@/lib/production/terrain-heightfield-math'

export type LandscapeBrushSettingsLike = {
  size: number
  strength: number
  falloff: number
  mode: string
  operation?: string
  targetHeight?: number
  /** Letter bh — optional noise/erosion seed for authority replay */
  seed?: number
}

export type LandscapeTerrainExtents = {
  widthMeters: number
  depthMeters: number
  resolution: number
}

/** World XZ (terrain centered at origin) → heightfield UV 0..1 */
export function worldPointToHeightfieldUv(
  point: { x: number; z: number },
  extents: LandscapeTerrainExtents,
): { u: number; v: number } {
  const u = (point.x + extents.widthMeters / 2) / extents.widthMeters
  const v = (point.z + extents.depthMeters / 2) / extents.depthMeters
  return {
    u: Math.min(1, Math.max(0, u)),
    v: Math.min(1, Math.max(0, v)),
  }
}

/**
 * Map LandscapeEditor brush → TerrainBrushStroke.
 * Returns null-path as `{ held }` for modes that are not durable yet — honest HELD.
 * Letter bh: sculpt/noise → mode 'noise' (seeded) — durable.
 */
export function landscapeBrushToTerrainStroke(
  point: { x: number; z: number },
  brush: LandscapeBrushSettingsLike,
  extents: LandscapeTerrainExtents,
): { stroke: TerrainBrushStroke } | { held: string } {
  const { u, v } = worldPointToHeightfieldUv(point, extents)
  const radius = Math.min(0.5, Math.max(0.01, brush.size / Math.max(extents.widthMeters, 1)))
  const falloff = Math.max(0.5, brush.falloff)

  if (brush.mode === 'smooth') {
    return {
      stroke: {
        u,
        v,
        radius,
        strength: Math.max(0.02, Math.min(1, brush.strength * 0.5)),
        falloff,
        mode: 'smooth',
      },
    }
  }

  if (brush.mode === 'flatten') {
    return {
      stroke: {
        u,
        v,
        radius,
        strength: Math.max(0.05, Math.min(1, brush.strength)),
        falloff,
        mode: 'flatten',
      },
    }
  }

  if (brush.mode === 'sculpt') {
    const op = brush.operation ?? 'raise'
    if (op === 'noise') {
      const magnitude = Math.max(0.01, Math.min(0.45, brush.strength * 0.2))
      return {
        stroke: {
          u,
          v,
          radius,
          strength: magnitude,
          falloff,
          mode: 'noise',
          ...(brush.seed !== undefined ? { seed: brush.seed } : {}),
        },
      }
    }
    if (op === 'level') {
      return {
        stroke: {
          u,
          v,
          radius,
          strength: Math.max(0.05, Math.min(1, brush.strength)),
          falloff,
          mode: 'flatten',
        },
      }
    }
    const magnitude = Math.max(0.01, Math.min(0.45, brush.strength * 0.2))
    const signed = op === 'lower' ? -magnitude : magnitude
    return {
      stroke: {
        u,
        v,
        radius,
        strength: signed,
        falloff,
        mode: 'sculpt',
      },
    }
  }

  if (brush.mode === 'paint') {
    return {
      held: 'paint brush uses splatmap authority — call landscapeBrushToSplatStroke (letter be)',
    }
  }

  if (brush.mode === 'foliage') {
    return {
      held: 'foliage brush uses foliage authority — call landscapeBrushToFoliageStroke (letter bf)',
    }
  }

  if (brush.mode === 'erosion') {
    const erosionType =
      brush.operation === 'thermal' || brush.operation === 'level' ? 'thermal' : 'hydraulic'
    return {
      stroke: {
        u,
        v,
        radius,
        strength: Math.max(0.1, Math.min(1, brush.strength)),
        falloff,
        mode: 'erosion',
        erosionType,
        iterations: erosionType === 'thermal' ? 6 : 64,
      },
    }
  }

  return { held: `Unknown brush mode "${brush.mode}" — not persisted [HELD]` }
}
