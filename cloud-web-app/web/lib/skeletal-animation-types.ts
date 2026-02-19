/**
 * Shared skeletal animation contract types.
 */

import * as THREE from 'three';

export interface BoneData {
  name: string;
  parentIndex: number;
  localPosition: THREE.Vector3;
  localRotation: THREE.Quaternion;
  localScale: THREE.Vector3;
  length: number;
}

export interface SkeletonData {
  bones: BoneData[];
  rootBoneIndices: number[];
}

export interface AnimationKeyframe {
  time: number;
  position?: THREE.Vector3;
  rotation?: THREE.Quaternion;
  scale?: THREE.Vector3;
}

export interface BoneAnimation {
  boneName: string;
  keyframes: AnimationKeyframe[];
}

export interface AnimationClipData {
  name: string;
  duration: number;
  frameRate: number;
  tracks: BoneAnimation[];
  loop: boolean;
  events?: AnimationEvent[];
}

export interface AnimationEvent {
  time: number;
  name: string;
  data?: Record<string, unknown>;
}

export interface IKTarget {
  boneName: string;
  targetPosition: THREE.Vector3;
  weight: number;
  chainLength: number;
  poleTarget?: THREE.Vector3;
}

export interface BlendWeight {
  animation: string;
  weight: number;
  speed: number;
  time: number;
}
