import type * as THREE from 'three';

export type CameraMode =
  | 'free'
  | 'follow'
  | 'orbit'
  | 'first_person'
  | 'third_person'
  | 'top_down'
  | 'side_scroller'
  | 'cinematic'
  | 'fixed';

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  aspect: number;
}

export interface FollowSettings {
  target: THREE.Object3D | null;
  offset: THREE.Vector3;
  lookAtOffset: THREE.Vector3;
  smoothing: number;
  deadZone?: { x: number; y: number };
  lookAhead?: number;
}

export interface OrbitSettings {
  target: THREE.Vector3;
  distance: number;
  minDistance: number;
  maxDistance: number;
  azimuthAngle: number;
  polarAngle: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  rotationSpeed: number;
  zoomSpeed: number;
  enableDamping: boolean;
  dampingFactor: number;
}

export interface ShakeSettings {
  intensity: number;
  frequency: number;
  duration: number;
  decay: boolean;
}

export interface CameraPath {
  id: string;
  points: CameraPathPoint[];
  loop: boolean;
  duration: number;
  easing: EasingType;
}

export interface CameraPathPoint {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov?: number;
  time: number; // 0-1 normalized
}

export type EasingType =
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic';
