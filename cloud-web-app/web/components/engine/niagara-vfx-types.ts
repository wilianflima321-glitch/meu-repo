/**
 * Shared contracts for Niagara VFX editor/runtime surface.
 */

import * as THREE from 'three';

interface ParticleSystemState {
  id: string;
  name: string;
  emitters: EmitterConfig[];
  isPlaying: boolean;
  duration: number;
  looping: boolean;
}

interface EmitterConfig {
  id: string;
  name: string;
  enabled: boolean;
  
  // Spawn
  spawnRate: number;
  spawnBurst: { time: number; count: number }[];
  maxParticles: number;
  
  // Lifetime
  lifetime: { min: number; max: number };
  
  // Position
  spawnShape: 'point' | 'sphere' | 'box' | 'cone' | 'cylinder' | 'mesh';
  spawnShapeParams: Record<string, number>;
  
  // Velocity
  initialVelocity: { min: THREE.Vector3; max: THREE.Vector3 };
  velocityOverLife: VelocityCurve[];
  
  // Size
  initialSize: { min: number; max: number };
  sizeOverLife: SizeCurve[];
  
  // Color
  initialColor: THREE.Color;
  colorOverLife: ColorGradient[];
  
  // Rotation
  initialRotation: { min: number; max: number };
  rotationRate: { min: number; max: number };
  
  // Forces
  gravity: THREE.Vector3;
  drag: number;
  turbulence: { strength: number; frequency: number };
  
  // Rendering
  material: 'sprite' | 'mesh' | 'ribbon' | 'beam';
  texture?: string;
  blendMode: 'additive' | 'alpha' | 'multiply';
  sortMode: 'none' | 'byDistance' | 'byAge';
}

interface VelocityCurve {
  time: number;
  multiplier: number;
}

interface SizeCurve {
  time: number;
  size: number;
}

interface ColorGradient {
  time: number;
  color: THREE.Color;
  alpha: number;
}

interface Particle {
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
