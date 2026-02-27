import type * as THREE from 'three';

export interface ClothConfig {
  width: number;
  height: number;
  segmentsX: number;
  segmentsY: number;
  mass: number;
  stiffness: number;
  damping: number;
  gravity: THREE.Vector3;
  wind: THREE.Vector3;
  windVariation: number;
  iterations: number;
  tearThreshold: number;
  selfCollision: boolean;
  groundPlane: boolean;
  groundHeight: number;
}

export interface ClothParticle {
  position: THREE.Vector3;
  previousPosition: THREE.Vector3;
  acceleration: THREE.Vector3;
  mass: number;
  invMass: number;
  pinned: boolean;
  index: number;
}

export interface ClothConstraint {
  p1: number;
  p2: number;
  restLength: number;
  stiffness: number;
  type: 'structural' | 'shear' | 'bend';
  broken: boolean;
}

export interface ClothCollider {
  type: 'sphere' | 'plane' | 'capsule' | 'box';
  position: THREE.Vector3;
  radius?: number;
  normal?: THREE.Vector3;
  size?: THREE.Vector3;
  start?: THREE.Vector3;
  end?: THREE.Vector3;
}
