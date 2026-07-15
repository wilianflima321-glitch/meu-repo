/**
 * Landscape paint deepen — pure LandscapeEditor ↔ splat stroke mapping (no fetch / DOM).
 */

import type { TerrainSplatStroke } from '@/lib/production/terrain-splatmap-math'
import {
  worldPointToHeightfieldUv,
  type LandscapeBrushSettingsLike,
  type LandscapeTerrainExtents,
} from '@/lib/production/landscape-heightfield-stroke'

export type LandscapePaintBrushLike = LandscapeBrushSettingsLike & {
  /** Selected layer id from Layers panel */
  selectedLayerId?: string | null
}

/**
 * Map LandscapeEditor paint brush → TerrainSplatStroke.
 * foliage uses letter bf mapper; erosion uses heightfield authority (letter bg).
 */
export function landscapeBrushToSplatStroke(
  point: { x: number; z: number },
  brush: LandscapePaintBrushLike,
  extents: LandscapeTerrainExtents,
  layers: { id: string }[],
): { stroke: TerrainSplatStroke } | { held: string } {
  if (brush.mode === 'foliage') {
    return {
      held: 'foliage brush uses foliage authority — call landscapeBrushToFoliageStroke (letter bf)',
    }
  }
  if (brush.mode === 'erosion') {
    return {
      held: 'erosion brush uses heightfield authority — call landscapeBrushToTerrainStroke (letter bg)',
    }
  }
  if (brush.mode !== 'paint') {
    return { held: `Mode "${brush.mode}" is not a splat paint stroke [HELD]` }
  }
  if (!layers.length) {
    return { held: 'No terrain layers — paint blocked [HELD]' }
  }

  const layerId = brush.selectedLayerId ?? layers[0]!.id
  const layerIndex = Math.max(0, layers.findIndex((l) => l.id === layerId))
  const resolvedIndex = layerIndex >= 0 ? layerIndex : 0

  const { u, v } = worldPointToHeightfieldUv(point, extents)
  const radius = Math.min(0.5, Math.max(0.01, brush.size / Math.max(extents.widthMeters, 1)))
  const falloff = Math.max(0.5, brush.falloff)

  return {
    stroke: {
      u,
      v,
      radius,
      strength: Math.max(0.05, Math.min(1, brush.strength)),
      falloff,
      layerIndex: resolvedIndex,
    },
  }
}
