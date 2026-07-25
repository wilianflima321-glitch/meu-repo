import { describe, expect, it } from 'vitest'
import * as THREE from 'three'

import {
  applyFoliageEraseStroke,
  applyFoliagePaintStroke,
} from '@/lib/environment/foliage-brush-actions'
import type { FoliageCamada, FoliageType } from '@/lib/environment/foliage-painter-types'

const baseType: FoliageType = {
  id: 'grass',
  name: 'Grass',
  meshPath: '',
  thumbnail: '',
  category: 'grass',
  densityMin: 0,
  densityMax: 1,
  scaleMin: 1,
  scaleMax: 1,
  rotationYRandom: false,
  alignToNormal: false,
  normalAlignmentStrength: 0,
  minSlope: 0,
  maxSlope: 90,
  minHeight: 0,
  maxHeight: 100,
  castShadow: false,
  receiveShadow: false,
  cullDistance: 100,
  lodBias: 0,
  hasCollision: false,
  collisionType: 'box',
  windEnabled: false,
  windStrength: 0,
  windFrequencia: 1,
}

function layer(instancias: FoliageCamada['instancias'] = []): FoliageCamada {
  return {
    id: 'default',
    name: 'Default',
    visible: true,
    locked: false,
    types: [],
    instancias,
  }
}

describe('foliage-brush-actions', () => {
  it('paint stroke uses density + falloff and mutates active layer only', () => {
    const seq = [0.1, 0.2, 0.05, 0.1, 0.2, 0.05, 0.1, 0.2, 0.05, 0.1, 0.2, 0.05]
    let i = 0
    const random = () => seq[i++ % seq.length]

    const next = applyFoliagePaintStroke({
      point: new THREE.Vector3(0, 1, 0),
      layers: [layer(), { ...layer(), id: 'other' }],
      activeCamadaId: 'default',
      selectedTypes: ['grass'],
      foliageTypes: [baseType],
      brush: { density: 0.5, radius: 2, falloff: 0 },
      now: 42,
      random,
    })

    expect(next[0].instancias.length).toBeGreaterThan(0)
    expect(next[1].instancias).toHaveLength(0)
    expect(next[0].instancias[0]?.position.y).toBe(1)
  })

  it('erase stroke removes instances inside radius', () => {
    const keep = {
      id: 'a',
      typeId: 'grass',
      position: new THREE.Vector3(10, 0, 10),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1),
    }
    const drop = {
      id: 'b',
      typeId: 'grass',
      position: new THREE.Vector3(0.2, 0, 0.2),
      rotation: new THREE.Euler(),
      scale: new THREE.Vector3(1, 1, 1),
    }
    const next = applyFoliageEraseStroke({
      point: new THREE.Vector3(0, 0, 0),
      layers: [layer([keep, drop])],
      activeCamadaId: 'default',
      radius: 1,
    })
    expect(next[0].instancias.map((x) => x.id)).toEqual(['a'])
  })
})
