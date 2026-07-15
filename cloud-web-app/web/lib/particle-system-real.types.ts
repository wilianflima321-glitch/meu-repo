import type * as THREE from 'three';

export interface ParticleEmitterConfig {
  maxParticles: number;
  emissionRate: number;
  lifetime: { min: number; max: number };
  startSize: { min: number; max: number };
  endSize: { min: number; max: number };
  startColor: THREE.Color;
  endColor: THREE.Color;
  startOpacity: number;
  endOpacity: number;
  velocity: { min: THREE.Vector3; max: THREE.Vector3 };
  acceleration: THREE.Vector3;
  angularVelocity: { min: number; max: number };
  texture?: THREE.Texture;
  blendMode: 'additive' | 'normal' | 'multiply';
  shape: EmitterShape;
  worldSpace: boolean;
}

export type EmitterShape =
  | { type: 'point' }
  | { type: 'sphere'; radius: number }
  | { type: 'box'; size: THREE.Vector3 }
  | { type: 'cone'; angle: number; radius: number; height: number }
  | { type: 'circle'; radius: number }
  | { type: 'mesh'; geometry: THREE.BufferGeometry };

export interface ParticleForce {
  type: 'gravity' | 'wind' | 'vortex' | 'turbulence' | 'attractor' | 'repulsor';
  strength: number;
  position?: THREE.Vector3;
  direction?: THREE.Vector3;
  radius?: number;
  frequency?: number;
}

export interface ParticleCollider {
  type: 'plane' | 'sphere' | 'box';
  position: THREE.Vector3;
  normal?: THREE.Vector3;
  radius?: number;
  size?: THREE.Vector3;
  bounce: number;
  friction: number;
}

export interface ParticleData {
  position: Float32Array;
  velocity: Float32Array;
  color: Float32Array;
  size: Float32Array;
  age: Float32Array;
  lifetime: Float32Array;
  rotation: Float32Array;
  angularVelocity: Float32Array;
  alive: Uint8Array;
}
