import * as THREE from 'three';
import type { EasingFunction } from './sequencer-easings';

export type KeyframeValue = number | THREE.Vector3 | THREE.Quaternion | THREE.Color | boolean | string;

export interface Keyframe<T = KeyframeValue> {
  time: number;
  value: T;
  easing: EasingFunction;
  tangentIn?: number;
  tangentOut?: number;
}

export interface Track {
  id: string;
  name: string;
  type: 'transform' | 'property' | 'event' | 'audio' | 'camera' | 'visibility';
  targetId: string;
  property?: string;
  keyframes: Keyframe[];
  enabled: boolean;
  locked: boolean;
  muted: boolean;
}

export interface Section {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  color: string;
  tracks: string[]; // Track IDs
}

export interface SequenceConfig {
  name: string;
  duration: number;
  frameRate: number;
  playbackSpeed: number;
  loop: boolean;
  autoPlay: boolean;
}

export interface CameraCut {
  time: number;
  cameraId: string;
  blendTime: number;
  blendType: 'cut' | 'linear' | 'ease';
}
