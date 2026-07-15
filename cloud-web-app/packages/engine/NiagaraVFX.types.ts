import type * as THREE from 'three';

export interface ParticleSystemState {
  id: string;
  name: string;
  emitters: EmitterConfig[];
  isPlaying: boolean;
  duration: number;
  looping: boolean;
}
export interface EmitterConfig {
  id: string;
  name: string;
  enabled: boolean;
  spawnRate: number;
  spawnBurst: { time: number; count: number }[];
  maxParticles: number;
  lifetime: { min: number; max: number };
  spawnShape: 'point' | 'sphere' | 'box' | 'cone' | 'cylinder' | 'mesh';
  spawnShapeParams: Record<string, number>;
  initialVelocity: { min: THREE.Vector3; max: THREE.Vector3 };
  velocityOverLife: VelocityCurve[];
  initialSize: { min: number; max: number };
  sizeOverLife: SizeCurve[];
  initialColor: THREE.Color;
  colorOverLife: ColorGradient[];
  initialRotation: { min: number; max: number };
  rotationRate: { min: number; max: number };
  gravity: THREE.Vector3;
  drag: number;
  turbulence: { strength: number; frequency: number };
  material: 'sprite' | 'mesh' | 'ribbon' | 'beam';
  texture?: string;
  blendMode: 'additive' | 'alpha' | 'multiply';
  sortMode: 'none' | 'byDistance' | 'byAge';
}
export interface VelocityCurve {
  time: number;
  multiplier: number;
}
export interface SizeCurve {
  time: number;
  size: number;
}
export interface ColorGradient {
  time: number;
  color: THREE.Color;
  alpha: number;
}
export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  size: number;
  color: THREE.Color;
  alpha: number;
  rotation: number;
  rotationRate: number;
}
