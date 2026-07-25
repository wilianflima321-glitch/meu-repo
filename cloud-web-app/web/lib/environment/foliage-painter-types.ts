import type * as THREE from 'three'

export type FoliageToolType = 'paint' | 'erase' | 'select' | 'move'

export interface FoliageType {
  id: string
  name: string
  meshPath: string
  thumbnail: string
  category: 'tree' | 'bush' | 'grass' | 'flower' | 'rock'

  densityMin: number
  densityMax: number
  scaleMin: number
  scaleMax: number
  rotationYRandom: boolean
  alignToNormal: boolean
  normalAlignmentStrength: number

  minSlope: number
  maxSlope: number
  minHeight: number
  maxHeight: number

  castShadow: boolean
  receiveShadow: boolean
  cullDistance: number
  lodBias: number

  hasCollision: boolean
  collisionType: 'box' | 'sphere' | 'mesh'

  windEnabled: boolean
  windStrength: number
  windFrequencia: number
}

export interface FoliageInstance {
  id: string
  typeId: string
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
}

export interface FoliageBrushSettings {
  tool: FoliageToolType
  radius: number
  density: number
  falloff: number
}

export interface FoliageCamada {
  id: string
  name: string
  visible: boolean
  locked: boolean
  types: string[]
  instancias: FoliageInstance[]
}
