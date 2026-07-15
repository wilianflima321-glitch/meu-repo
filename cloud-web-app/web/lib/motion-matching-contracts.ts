import type * as THREE from 'three';
export interface MotionMatchingConfig {
  featureWeights: FeatureWeights;
  searchRadius: number;
  blendTime: number;
  minTimeBetweenSearches: number;
  trajectoryPredictionTime: number;
  trajectoryPoints: number;
  footLockingEnabled: boolean;
  rootMotionEnabled: boolean;
}
export interface FeatureWeights {
  leftFootPosition: number;
  rightFootPosition: number;
  leftFootVelocity: number;
  rightFootVelocity: number;
  hipPosition: number;
  hipVelocity: number;
  trajectory: number;
  facing: number;
}
export interface PoseFeature {
  leftFootPosition: THREE.Vector3;
  rightFootPosition: THREE.Vector3;
  leftHandPosition: THREE.Vector3;
  rightHandPosition: THREE.Vector3;
  hipPosition: THREE.Vector3;
  leftFootVelocity: THREE.Vector3;
  rightFootVelocity: THREE.Vector3;
  hipVelocity: THREE.Vector3;
  rootVelocity: THREE.Vector3;
  rootAngularVelocity: number;
}
export interface TrajectoryPoint {
  position: THREE.Vector3;
  facing: THREE.Vector2;  // 2D facing direction
  time: number;
}
export interface MotionFeature {
  pose: PoseFeature;
  trajectory: TrajectoryPoint[];
  tags: string[];
}
export interface AnimationPoseData {
  animationId: string;
  frameIndex: number;
  time: number;
  feature: MotionFeature;
  rootPosition: THREE.Vector3;
  rootRotation: THREE.Quaternion;
  /** SOA row index — hot-path bone data lives in Float32Array strides (MOTION-001). */
  soaIndex: number;
  /**
   * Scratch / blend surface only. Prefer SOA O(1) lookup for playback.
   * May be empty until materialised from SOA for inertialization blend.
   */
  boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>;
}
export interface MotionDatabase {
  poses: AnimationPoseData[];
  animations: Map<string, AnimationData>;
}

/** Foot lock solver honesty — two-bone is production; lerp alone is NOT. */
export type FootLockIkMode = 'two_bone' | 'lerp_not_production_ik'

export const FOOT_LOCK_IK_SHIP_STATUS = {
  twoBone: 'SHIPPED' as const,
  lerpFallback: 'HELD' as const,
  labelLerp: 'NOT production IK — lerp foot lock only',
}
export interface AnimationData {
  id: string;
  name: string;
  duration: number;
  frameRate: number;
  looping: boolean;
  tags: string[];
  rootMotion: boolean;
}
export interface MotionMatchResult {
  poseData: AnimationPoseData;
  cost: number;
  featureCosts: FeatureCosts;
}
export interface FeatureCosts {
  pose: number;
  velocity: number;
  trajectory: number;
  total: number;
}
export interface KDNode {
  pose: AnimationPoseData;
  featureVector: number[];
  left: KDNode | null;
  right: KDNode | null;
  splitAxis: number;
}

export interface FootLockState {
  locked: boolean;
  lockPosition: THREE.Vector3;
  lockRotation: THREE.Quaternion;
  unlockProgress: number;
}
