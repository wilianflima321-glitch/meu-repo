import type { MotionMatchingConfig } from './motion-matching-contracts';

export const DEFAULT_MOTION_MATCHING_CONFIG: MotionMatchingConfig = {
  featureWeights: {
    leftFootPosition: 1.0,
    rightFootPosition: 1.0,
    leftFootVelocity: 0.5,
    rightFootVelocity: 0.5,
    hipPosition: 0.8,
    hipVelocity: 0.3,
    trajectory: 1.5,
    facing: 1.0,
  },
  searchRadius: 10,
  blendTime: 0.2,
  minTimeBetweenSearches: 0.1,
  trajectoryPredictionTime: 1.0,
  trajectoryPoints: 5,
  footLockingEnabled: true,
  rootMotionEnabled: true,
};

export const LOCOMOTION_PRESET_CONFIG: Partial<MotionMatchingConfig> = {
  featureWeights: {
    leftFootPosition: 1.0,
    rightFootPosition: 1.0,
    leftFootVelocity: 0.8,
    rightFootVelocity: 0.8,
    hipPosition: 0.5,
    hipVelocity: 0.5,
    trajectory: 2.0,
    facing: 1.5,
  },
  footLockingEnabled: true,
  rootMotionEnabled: true,
};
