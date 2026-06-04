import type * as THREE from 'three';

export interface Bone {
  name: string;
  index: number;
  parent: number;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  length: number;
  bindPose: THREE.Matrix4;
  worldMatrix: THREE.Matrix4;
}

export interface RigHierarchy {
  bones: Bone[];
  boneNameToIndex: Map<string, number>;
  rootBones: number[];
}

export type ControlType =
  | 'fk'
  | 'ik_two_bone'
  | 'ik_fabrik'
  | 'ik_ccd'
  | 'ik_spline'
  | 'look_at'
  | 'aim'
  | 'parent_constraint'
  | 'position_constraint'
  | 'rotation_constraint'
  | 'scale_constraint'
  | 'twist_corrective'
  | 'pole_vector';

export interface RigControl {
  id: string;
  name: string;
  type: ControlType;
  enabled: boolean;
  weight: number;
  targetBones: string[];
  settings: RigControlSettings;
}

export interface RigVariable {
  id: string;
  name: string;
  type: 'float' | 'vector3' | 'quaternion' | 'bool';
  value: number | THREE.Vector3 | THREE.Quaternion | boolean;
  min?: number;
  max?: number;
  expression?: string; // Para valores calculados
}

export interface IKTarget {
  position: THREE.Vector3;
  rotation?: THREE.Quaternion;
  poleVector?: THREE.Vector3;
  twist?: number;
  blend?: number;
}

export interface FABRIKSettings {
  chainBones: string[];
  endEffector: string;
  tolerance: number;
  maxIterations: number;
  chainLength?: number;
}

export interface TwoBoneIKSettings {
  rootBone: string;
  midBone: string;
  endBone: string;
  poleVector: THREE.Vector3;
  soften: number;
  twist: number;
}

export interface SplineIKSettings {
  chainBones: string[];
  splinePoints: THREE.Vector3[];
  twistStart: number;
  twistEnd: number;
  stretch: number;
}

export interface LookAtSettings {
  headBone: string;
  target: THREE.Vector3;
  upVector: THREE.Vector3;
  limits: {
    yawMin: number;
    yawMax: number;
    pitchMin: number;
    pitchMax: number;
  };
  speed: number;
}

export interface TwistCorrectiveSettings {
  sourceBone: string;
  twistBones: string[];
  twistAxis: THREE.Vector3;
  distribution: number[]; // Weight distribution along twist chain
}

// Union type para settings
export type RigControlSettings =
  | FABRIKSettings
  | TwoBoneIKSettings
  | SplineIKSettings
  | LookAtSettings
  | TwistCorrectiveSettings
  | Record<string, unknown>;
