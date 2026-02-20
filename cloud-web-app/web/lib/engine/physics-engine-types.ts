export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export type Vector = Vector2 | Vector3;

export interface Transform {
  position: Vector3;
  rotation: Quaternion;
  scale: Vector3;
}

export interface AABB {
  min: Vector3;
  max: Vector3;
}

export type ColliderType = 'box' | 'sphere' | 'capsule' | 'mesh' | 'plane';
export type BodyType = 'dynamic' | 'static' | 'kinematic';

export interface ColliderConfig {
  type: ColliderType;
  size?: Vector3;
  radius?: number;
  height?: number;
  vertices?: Vector3[];
  indices?: number[];
  friction?: number;
  restitution?: number;
  isTrigger?: boolean;
}

export interface RigidBodyConfig {
  type: BodyType;
  mass?: number;
  linearDamping?: number;
  angularDamping?: number;
  gravityScale?: number;
  fixedRotation?: boolean;
  collider?: ColliderConfig;
  position?: Vector3;
  rotation?: Quaternion;
}

export interface PhysicsConfig {
  gravity: Vector3;
  fixedTimeStep: number;
  maxSubSteps: number;
  velocityIterations: number;
  positionIterations: number;
  broadphaseType: 'aabb' | 'sap' | 'bvh';
  enableSleeping: boolean;
  sleepThreshold: number;
}
