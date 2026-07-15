/**
 * Landscape foliage deepen — pure LandscapeEditor ↔ foliage stroke mapping (no fetch / DOM).
 */

import type { TerrainFoliageStroke } from '@/lib/production/terrain-foliage-math'
import {
  worldPointToHeightfieldUv,
  type LandscapeBrushSettingsLike,
  type LandscapeTerrainExtents,
} from '@/lib/production/landscape-heightfield-stroke'

export type LandscapeFoliageBrushLike = LandscapeBrushSettingsLike & {
  /** Selected foliage type id from Landscape config / brush panel */
  selectedFoliageTypeId?: string | null
}

/**
 * Map LandscapeEditor foliage brush → TerrainFoliageStroke.
 * erosion uses heightfield authority (letter bg); paint/sculpt use their own mappers.
 */
export function landscapeBrushToFoliageStroke(
  point: { x: number; z: number },
  brush: LandscapeFoliageBrushLike,
  extents: LandscapeTerrainExtents,
  foliageTypes: { id: string }[],
): { stroke: TerrainFoliageStroke } | { held: string } {
  if (brush.mode === 'erosion') {
    return {
      held: 'erosion brush uses heightfield authority — call landscapeBrushToTerrainStroke (letter bg)',
    }
  }
  if (brush.mode !== 'foliage') {
    return { held: `Mode "${brush.mode}" is not a foliage placement stroke [HELD]` }
  }
  if (!foliageTypes.length) {
    return { held: 'No foliage types — placement blocked [HELD]' }
  }

  const typeId = brush.selectedFoliageTypeId ?? foliageTypes[0]!.id
  const resolved =
    foliageTypes.find((t) => t.id === typeId)?.id ?? foliageTypes[0]!.id

  const { u, v } = worldPointToHeightfieldUv(point, extents)
  const radius = Math.min(0.5, Math.max(0.01, brush.size / Math.max(extents.widthMeters, 1)))
  const falloff = Math.max(0.5, brush.falloff)
  const operation: TerrainFoliageStroke['operation'] =
    brush.operation === 'lower' ? 'erase' : 'paint'

  return {
    stroke: {
      u,
      v,
      radius,
      strength: Math.max(0.05, Math.min(1, brush.strength)),
      falloff,
      typeId: resolved,
      operation,
      widthMeters: extents.widthMeters,
      depthMeters: extents.depthMeters,
    },
  }
}
