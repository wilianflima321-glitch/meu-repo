import * as THREE from 'three';

export interface XRConfig {
  sessionMode: 'immersive-vr' | 'immersive-ar' | 'inline';
  referenceSpace: 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
  features: XRFeature[];
  optionalFeatures: XRFeature[];
  foveatedRendering: boolean;
  handTracking: boolean;
  passthrough: boolean;
}

export type XRFeature =
  | 'local'
  | 'local-floor'
  | 'bounded-floor'
  | 'unbounded'
  | 'hand-tracking'
  | 'eye-tracking'
  | 'hit-test'
  | 'anchors'
  | 'plane-detection'
  | 'mesh-detection'
  | 'depth-sensing'
  | 'light-estimation'
  | 'camera-access';

export interface XRControllerState {
  hand: 'left' | 'right';
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  connected: boolean;
  trigger: number;
  grip: number;
  thumbstick: THREE.Vector2;
  thumbstickPressed: boolean;
  primaryButton: boolean;
  secondaryButton: boolean;
  selectStart: boolean;
  selectEnd: boolean;
  squeezeStart: boolean;
  squeezeEnd: boolean;
}

// Named as HandJointData to avoid collision with native XRHandJoint.
export interface HandJointData {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  radius: number;
  visible: boolean;
}

export interface XRHandState {
  hand: 'left' | 'right';
  joints: Map<string, HandJointData>;
  pinching: boolean;
  pinchStrength: number;
  pointing: boolean;
  fist: boolean;
  wristPosition: THREE.Vector3;
  wristRotation: THREE.Quaternion;
}

export interface XRHitTestResult {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  normal: THREE.Vector3;
  planeId?: string;
}

export interface XRAnchor {
  id: string;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  persistent: boolean;
}

export interface TeleportTarget {
  position: THREE.Vector3;
  valid: boolean;
  normal: THREE.Vector3;
}

export interface GrabState {
  object: THREE.Object3D | null;
  hand: 'left' | 'right';
  offsetPosition: THREE.Vector3;
  offsetRotation: THREE.Quaternion;
}

export const XR_HAND_JOINTS = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
] as const;
