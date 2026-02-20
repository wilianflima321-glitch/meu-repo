import * as THREE from 'three';

import type { RigidBody } from './physics-system';

export type ColliderType =
  | 'box'
  | 'sphere'
  | 'capsule'
  | 'cylinder'
  | 'plane'
  | 'mesh'
  | 'convex';
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
  // Box
  halfExtents?: THREE.Vector3;
  // Sphere
  radius?: number;
  // Capsule/Cylinder
  height?: number;
  // Mesh
  vertices?: Float32Array;
  indices?: Uint32Array;
  scale?: THREE.Vector3;
}

export interface Material {
  friction: number;
  restitution: number;
  density: number;
  rollingFriction: number;
}

export interface RigidBodyConfig {
  type: BodyType;
  mass: number;
  material: Material;
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

export interface CollisionEvent {
  bodyA: RigidBody;
  bodyB: RigidBody;
  contacts: CollisionContact[];
}

export interface RaycastHit {
  body: RigidBody;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
}

export interface ConstraintConfig {
  type: ConstraintType;
  bodyA: RigidBody;
  bodyB: RigidBody | null;
  pivotA: THREE.Vector3;
  pivotB: THREE.Vector3;
  axisA?: THREE.Vector3;
  axisB?: THREE.Vector3;
  // Hinge
  lowerLimit?: number;
  upperLimit?: number;
  // Spring
  stiffness?: number;
  damping?: number;
  restLength?: number;
  // Distance
  minDistance?: number;
  maxDistance?: number;
}
