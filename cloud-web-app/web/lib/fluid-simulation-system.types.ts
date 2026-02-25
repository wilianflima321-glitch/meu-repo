import type * as THREE from 'three';

export interface FluidConfig {
  particleCount: number;
  particleRadius: number;
  smoothingRadius: number;
  restDensity: number;
  viscosity: number;
  surfaceTension: number;
  stiffness: number;
  gravity: THREE.Vector3;
  timeStep: number;
  iterations: number;
  boundaryDamping: number;
}

export interface FluidParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  density: number;
  pressure: number;
  mass: number;
  color: THREE.Color;
  neighbors: number[];
  affineMatrix?: THREE.Matrix3;
}

export interface FluidBoundary {
  type: 'box' | 'sphere' | 'plane' | 'mesh';
  position: THREE.Vector3;
  size?: THREE.Vector3;
  radius?: number;
  normal?: THREE.Vector3;
  friction: number;
}

export interface GridCell {
  particles: number[];
  velocity: THREE.Vector3;
  pressure: number;
  marker: 'air' | 'fluid' | 'solid';
}

export interface SurfaceVertex {
  position: THREE.Vector3;
  normal: THREE.Vector3;
}
