import type * as THREE from 'three'

export interface TerrainSettings {
  width: number
  depth: number
  resolution: number
  maxHeight: number
  lodLevels: number
  lodDistance: number
  textureRepeat: number
  generateCollider: boolean
}

export interface TerrainLayer {
  id: string
  name: string
  texture: string
  normalMap?: string
  tileSize: number
  minHeight: number
  maxHeight: number
  minSlope: number
  maxSlope: number
  blendSharpness: number
}

export interface NoiseSettings {
  type: 'perlin' | 'simplex' | 'ridged' | 'billowy' | 'hybrid'
  seed: number
  octaves: number
  frequency: number
  amplitude: number
  lacunarity: number
  persistence: number
  offset: { x: number; y: number }
}

export interface BrushSettings {
  size: number
  strength: number
  falloff: number
  shape: 'circle' | 'square' | 'soft'
}

export interface FoliageType {
  id: string
  name: string
  mesh: THREE.Object3D | null
  density: number
  minScale: number
  maxScale: number
  alignToNormal: boolean
  randomRotation: boolean
  minSlope: number
  maxSlope: number
  minHeight: number
  maxHeight: number
}

export interface FoliageInstance {
  position: THREE.Vector3
  rotation: THREE.Euler
  scale: THREE.Vector3
  typeId: string
}
