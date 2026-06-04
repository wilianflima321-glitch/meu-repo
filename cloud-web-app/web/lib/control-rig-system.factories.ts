// @aethel-heavy-async-boundary Studio/render-gated runtime; imported only by the control rig boundary.
import * as THREE from 'three';

import type { LookAtSettings, RigControl, SplineIKSettings, TwoBoneIKSettings } from './control-rig-system.types';

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

/**
 * Cria um setup básico de IK para braço
 */
export function createArmIKSetup(
  shoulder: string,
  elbow: string,
  wrist: string
): RigControl {
  return {
    id: `arm_ik_${Date.now()}`,
    name: 'Arm IK',
    type: 'ik_two_bone',
    enabled: true,
    weight: 1,
    targetBones: [shoulder, elbow, wrist],
    settings: {
      rootBone: shoulder,
      midBone: elbow,
      endBone: wrist,
      poleVector: new THREE.Vector3(0, 0, -1),
      soften: 0,
      twist: 0,
    } as TwoBoneIKSettings,
  };
}

/**
 * Cria um setup de IK para perna
 */
export function createLegIKSetup(
  thigh: string,
  knee: string,
  ankle: string
): RigControl {
  return {
    id: `leg_ik_${Date.now()}`,
    name: 'Leg IK',
    type: 'ik_two_bone',
    enabled: true,
    weight: 1,
    targetBones: [thigh, knee, ankle],
    settings: {
      rootBone: thigh,
      midBone: knee,
      endBone: ankle,
      poleVector: new THREE.Vector3(0, 0, 1),
      soften: 0,
      twist: 0,
    } as TwoBoneIKSettings,
  };
}

/**
 * Cria setup de spine IK
 */
export function createSpineIKSetup(spineBones: string[]): RigControl {
  return {
    id: `spine_ik_${Date.now()}`,
    name: 'Spine IK',
    type: 'ik_spline',
    enabled: true,
    weight: 1,
    targetBones: spineBones,
    settings: {
      chainBones: spineBones,
      splinePoints: [
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0, 0.5, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 1.5, 0),
      ],
      twistStart: 0,
      twistEnd: 0,
      stretch: 0,
    } as SplineIKSettings,
  };
}

/**
 * Cria setup de look at para cabeça
 */
export function createHeadLookAtSetup(headBone: string): RigControl {
  return {
    id: `head_lookat_${Date.now()}`,
    name: 'Head Look At',
    type: 'look_at',
    enabled: true,
    weight: 1,
    targetBones: [headBone],
    settings: {
      headBone,
      target: new THREE.Vector3(0, 1.7, 5),
      upVector: new THREE.Vector3(0, 1, 0),
      limits: {
        yawMin: -70,
        yawMax: 70,
        pitchMin: -30,
        pitchMax: 45,
      },
      speed: 5,
    } as LookAtSettings,
  };
}
