/**
 * Pure foliage paint/erase stroke application — keeps FoliagePainterRuntime under LoC budget.
 */

import * as THREE from 'three'
import {
  instancesPerStroke,
  sampleBrushStrokeOffset,
  sampleFoliageTerrain,
  type FoliageTerrainHeightfield,
} from '@/lib/environment/foliage-brush-placement'
import type {
  FoliageBrushSettings,
  FoliageCamada,
  FoliageInstance,
  FoliageType,
} from '@/lib/environment/foliage-painter-types'

export function applyFoliagePaintStroke(input: {
  point: THREE.Vector3
  layers: FoliageCamada[]
  activeCamadaId: string
  selectedTypes: string[]
  foliageTypes: FoliageType[]
  brush: Pick<FoliageBrushSettings, 'density' | 'radius' | 'falloff'>
  /** Durable terrain heights for per-instance slope/height sampling; flat substrate when absent. */
  heightfield?: FoliageTerrainHeightfield | null
  /** Honest per-stroke evidence — how many candidates a species constraint actually blocked. */
  onStrokeResult?: (result: { placed: number; constraintRejected: number }) => void
  now?: number
  random?: () => number
}): FoliageCamada[] {
  const { point, layers, activeCamadaId, selectedTypes, foliageTypes, brush, heightfield, onStrokeResult } = input
  const random = input.random ?? Math.random
  const now = input.now ?? Date.now()
  const newInstances: FoliageInstance[] = []
  const strokeCount = instancesPerStroke(brush.density)
  let constraintRejected = 0

  for (let i = 0; i < strokeCount; i++) {
    const typeId = selectedTypes[Math.floor(random() * selectedTypes.length)]
    const type = foliageTypes.find((t) => t.id === typeId)
    if (!type) continue

    const sample = sampleBrushStrokeOffset({
      radius: brush.radius,
      falloff: brush.falloff,
      random,
    })
    if (!sample.accepted) continue

    const x = point.x + sample.offsetX
    const z = point.z + sample.offsetZ

    // Law XV / Zero-MVP: minSlope/maxSlope/minHeight/maxHeight are real
    // per-type constraints, not decorative fields — reject placement that
    // would land on terrain this species cannot legally grow on.
    const terrain = sampleFoliageTerrain(heightfield, x, z, point.y)
    if (
      terrain.slopeDeg < type.minSlope ||
      terrain.slopeDeg > type.maxSlope ||
      terrain.heightM < type.minHeight ||
      terrain.heightM > type.maxHeight
    ) {
      constraintRejected += 1
      continue
    }

    const scaleValue = type.scaleMin + random() * (type.scaleMax - type.scaleMin)

    newInstances.push({
      id: `inst_${now}_${i}`,
      typeId,
      position: new THREE.Vector3(x, terrain.heightM, z),
      rotation: new THREE.Euler(0, type.rotationYRandom ? random() * Math.PI * 2 : 0, 0),
      scale: new THREE.Vector3(scaleValue, scaleValue, scaleValue),
    })
  }

  onStrokeResult?.({ placed: newInstances.length, constraintRejected })

  return layers.map((l) =>
    l.id === activeCamadaId
      ? { ...l, instancias: [...l.instancias, ...newInstances] }
      : l,
  )
}

export function applyFoliageEraseStroke(input: {
  point: THREE.Vector3
  layers: FoliageCamada[]
  activeCamadaId: string
  radius: number
}): FoliageCamada[] {
  const { point, layers, activeCamadaId, radius } = input
  return layers.map((l) =>
    l.id === activeCamadaId
      ? {
          ...l,
          instancias: l.instancias.filter((inst) => inst.position.distanceTo(point) > radius),
        }
      : l,
  )
}
