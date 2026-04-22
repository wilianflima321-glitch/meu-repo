import * as THREE from 'three';

export type KeyframeValue =
  | number
  | boolean
  | string
  | THREE.Vector3
  | THREE.Quaternion
  | THREE.Color;

export interface Keyframe {
  id: string;
  time: number;
  value: KeyframeValue;
  easing: (t: number) => number;
}

export type TrackType =
  | 'camera'
  | 'transform'
  | 'light'
  | 'audio'
  | 'event'
  | 'material'
  | 'visibility';

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  property: string;
  enabled: boolean;
  muted: boolean;
  keyframes: Keyframe[];
}

export interface SequenceConfig {
  duration: number;
  playbackSpeed: number;
  loop: boolean;
}

export const Easings = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

export default {
  Easings,
};
