import type * as THREE from 'three';

export interface BoneNode {
  id: string;
  name: string;
  parentId: string | null;
  position: THREE.Vector3;
  rotation: THREE.Euler;
  length: number;
  ikEnabled: boolean;
  fkWeight: number;
  locked: boolean;
  visible: boolean;
  children: string[];
}

export interface IKChain {
  id: string;
  name: string;
  startBone: string;
  endBone: string;
  poleVector: THREE.Vector3;
  effectorPosition: THREE.Vector3;
  iterations: number;
  tolerance: number;
  enabled: boolean;
}

export interface Constraint {
  id: string;
  type: 'aim' | 'lookAt' | 'parent' | 'point' | 'orient' | 'scale';
  sourceBone: string;
  targetBone: string;
  weight: number;
  maintainOffset: boolean;
  enabled: boolean;
}

export interface ControlRigConfig {
  bones: Record<string, BoneNode>;
  ikChains: IKChain[];
  constraints: Constraint[];
}

export interface SkeletonPreset {
  id: string;
  name: string;
  type: 'humanoid' | 'quadruped' | 'custom';
  bones: Partial<Record<string, Partial<BoneNode>>>;
}
