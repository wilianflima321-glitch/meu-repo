/**
 * Shared contracts for advanced particle runtime system.
 */

import * as THREE from 'three';

export type EmitterShape = 'point' | 'box' | 'sphere' | 'cone' | 'circle' | 'edge' | 'mesh';
export type BlendMode = 'additive' | 'normal' | 'multiply' | 'screen';
export type SimulationSpace = 'local' | 'world';

export interface Vector3Range {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface FloatRange {
  min: number;
  max: number;
}

export interface ColorStop {
  time: number; // 0-1
  color: { r: number; g: number; b: number; a: number };
}

export interface FloatCurve {
  time: number;
  value: number;
  inTangent?: number;
  outTangent?: number;
}

export interface EmitterSettings {
  shape: EmitterShape;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  
  // Shape-specific
  boxSize?: { x: number; y: number; z: number };
  sphereRadius?: number;
  coneAngle?: number;
  coneRadius?: number;
  circleRadius?: number;
  edgeLength?: number;
  
  // Emission
  rate: number; // Particles per second
  bursts?: { time: number; count: number; probability: number }[];
  
  // Space
  simulationSpace: SimulationSpace;
}

export interface ParticleSettings {
  // Lifetime
  lifetime: FloatRange;
  
  // Initial values
  startSpeed: FloatRange;
  startSize: FloatRange;
  startRotation: FloatRange;
  startColor: ColorStop[];
  
  // Over lifetime
  sizeOverLifetime?: FloatCurve[];
  speedOverLifetime?: FloatCurve[];
  colorOverLifetime?: ColorStop[];
  rotationOverLifetime?: number; // Degrees per second
  
  // Velocity
  inheritVelocity: number;
  velocityRandomness: Vector3Range;
  
  // Rendering
  texture?: string;
  blendMode: BlendMode;
  renderOrder: number;
  
  // Billboard
  billboard: boolean;
  stretchedBillboard: boolean;
  stretchFactor: number;
  
  // Sorting
  sortByDistance: boolean;
}

export interface ModifierSettings {
  gravity: { x: number; y: number; z: number };
  drag: number;
  
  // Noise/Turbulence
  turbulenceStrength: number;
  turbulenceFrequency: number;
  turbulenceScrollSpeed: number;
  
  // Attractors
  attractors?: {
    position: { x: number; y: number; z: number };
    strength: number;
    radius: number;
  }[];
  
  // Vortex
  vortex?: {
    axis: { x: number; y: number; z: number };
    strength: number;
    center: { x: number; y: number; z: number };
  };
}

export interface CollisionSettings {
  enabled: boolean;
  bounce: number;
  dampen: number;
  lifetime: number; // Multiplier on collision
  planes?: { normal: { x: number; y: number; z: number }; distance: number }[];
  world: boolean;
}

export interface SubEmitterSettings {
  trigger: 'birth' | 'death' | 'collision';
  emitterId: string;
  probability: number;
  inheritVelocity: number;
}

export interface ParticleSystemSettings {
  id: string;
  name: string;
  duration: number;
  looping: boolean;
  prewarm: boolean;
  maxParticles: number;
  
  emitter: EmitterSettings;
  particle: ParticleSettings;
  modifiers: ModifierSettings;
  collision: CollisionSettings;
  subEmitters: SubEmitterSettings[];
}

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  size: number;
  rotation: number;
  color: THREE.Color;
  alpha: number;
  speed: number;
  alive: boolean;
}
