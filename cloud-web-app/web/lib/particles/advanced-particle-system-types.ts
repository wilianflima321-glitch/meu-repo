import type * as THREE from 'three'

export type EmitterShape = 'point' | 'box' | 'sphere' | 'cone' | 'circle' | 'edge' | 'mesh'
export type BlendMode = 'additive' | 'normal' | 'multiply' | 'screen'
export type SimulationSpace = 'local' | 'world'

export interface Vector3Range {
  min: { x: number; y: number; z: number }
  max: { x: number; y: number; z: number }
}

export interface FloatRange {
  min: number
  max: number
}

export interface ColorStop {
  time: number
  color: { r: number; g: number; b: number; a: number }
}

export interface FloatCurve {
  time: number
  value: number
  inTangent?: number
  outTangent?: number
}

export interface EmitterSettings {
  shape: EmitterShape
  position: { x: number; y: number; z: number }
  rotation: { x: number; y: number; z: number }
  boxSize?: { x: number; y: number; z: number }
  sphereRadius?: number
  coneAngle?: number
  coneRadius?: number
  circleRadius?: number
  edgeLength?: number
  rate: number
  bursts?: { time: number; count: number; probability: number }[]
  simulationSpace: SimulationSpace
}

export interface ParticleSettings {
  lifetime: FloatRange
  startSpeed: FloatRange
  startSize: FloatRange
  startRotation: FloatRange
  startColor: ColorStop[]
  sizeOverLifetime?: FloatCurve[]
  speedOverLifetime?: FloatCurve[]
  colorOverLifetime?: ColorStop[]
  rotationOverLifetime?: number
  inheritVelocity: number
  velocityRandomness: Vector3Range
  texture?: string
  blendMode: BlendMode
  renderOrder: number
  billboard: boolean
  stretchedBillboard: boolean
  stretchFactor: number
  sortByDistance: boolean
}

export interface ModifierSettings {
  gravity: { x: number; y: number; z: number }
  drag: number
  turbulenceStrength: number
  turbulenceFrequency: number
  turbulenceScrollSpeed: number
  attractors?: {
    position: { x: number; y: number; z: number }
    strength: number
    radius: number
  }[]
  vortex?: {
    axis: { x: number; y: number; z: number }
    strength: number
    center: { x: number; y: number; z: number }
  }
}

export interface CollisionSettings {
  enabled: boolean
  bounce: number
  dampen: number
  lifetime: number
  planes?: { normal: { x: number; y: number; z: number }; distance: number }[]
  world: boolean
}

export interface SubEmitterSettings {
  trigger: 'birth' | 'death' | 'collision'
  emitterId: string
  probability: number
  inheritVelocity: number
}

export interface ParticleSystemSettings {
  id: string
  name: string
  duration: number
  looping: boolean
  prewarm: boolean
  maxParticles: number
  emitter: EmitterSettings
  particle: ParticleSettings
  modifiers: ModifierSettings
  collision: CollisionSettings
  subEmitters: SubEmitterSettings[]
}

export interface Particle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  age: number
  lifetime: number
  size: number
  rotation: number
  color: THREE.Color
  alpha: number
  speed: number
  alive: boolean
}
