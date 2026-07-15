import type * as THREE from 'three';

export type ColliderType = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'plane' | 'mesh' | 'convex';
export type BodyType = 'dynamic' | 'static' | 'kinematic';
export type ConstraintType = 'fixed' | 'hinge' | 'slider' | 'ball' | 'spring' | 'distance';

export interface PhysicsSettings {
  gravity: THREE.Vector3;
  fixedTimeStep: number;
  maxSubSteps: number;
  broadphase: 'naive' | 'sap' | 'grid';
  solverIterations: number;
  allowSleep: boolean;
  sleepThreshold: number;
  collisionGroups: number;
}

export interface ColliderShape {
  type: ColliderType;
  offset: THREE.Vector3;
  rotation: THREE.Quaternion;
  halfExtents?: THREE.Vector3;
  radius?: number;
  height?: number;
  vertices?: Float32Array;
  indices?: Uint32Array;
  scale?: THREE.Vector3;
}

export interface PhysicsMaterial {
  friction: number;
  restitution: number;
  density: number;
  rollingFriction: number;
}

export interface RigidBodyConfig {
  type: BodyType;
  mass: number;
  material: PhysicsMaterial;
  linearDamping: number;
  angularDamping: number;
  linearVelocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  allowSleep: boolean;
  isTrigger: boolean;
  collisionGroup: number;
  collisionMask: number;
  fixedRotation: boolean;
  gravityScale: number;
}

export interface CollisionContact {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  penetration: number;
  impulse: number;
}
