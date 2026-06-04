/** @aethel-heavy-async-boundary Studio/motion-matching locomotion preset runtime. */

import * as THREE from 'three';
import { LOCOMOTION_PRESET_CONFIG } from './motion-matching-defaults';
import { MotionMatchingSystem } from './motion-matching-system';

export class LocomotionPreset {
  private motionSystem: MotionMatchingSystem;
  constructor() {
    this.motionSystem = new MotionMatchingSystem(LOCOMOTION_PRESET_CONFIG);
  }
  generateProceduralLocomotion(): void {
    this.generateIdleAnimation();
    this.generateWalkAnimation('walk_forward', new THREE.Vector3(0, 0, 1), 1.4);
    this.generateWalkAnimation('walk_backward', new THREE.Vector3(0, 0, -1), 1.2);
    this.generateWalkAnimation('walk_left', new THREE.Vector3(-1, 0, 0), 1.2);
    this.generateWalkAnimation('walk_right', new THREE.Vector3(1, 0, 0), 1.2);
    this.generateRunAnimation('run_forward', new THREE.Vector3(0, 0, 1), 4.0);
    this.generateRunAnimation('run_backward', new THREE.Vector3(0, 0, -1), 3.0);
    this.generateTurnAnimation('turn_left', -Math.PI / 2);
    this.generateTurnAnimation('turn_right', Math.PI / 2);
    this.motionSystem.buildSearchTree();
  }
  private generateIdleAnimation(): void {
    const duration = 2.0;
    const frameRate = 30;
    this.motionSystem.addAnimation(
      'idle',
      'Idle',
      duration,
      frameRate,
      true,
      ['idle', 'standing'],
      false,
      (time: number) => {
        const breathCycle = Math.sin(time * Math.PI);
        return {
          boneTransforms: this.createStandingPose(breathCycle * 0.02),
          rootPosition: new THREE.Vector3(),
          rootRotation: new THREE.Quaternion(),
        };
      }
    );
  }
  private generateWalkAnimation(id: string, direction: THREE.Vector3, speed: number): void {
    const duration = 1.0; // One full walk cycle
    const frameRate = 30;
    const stride = speed * duration / 2; // Distance per step
    const tags = ['locomotion', 'walk'];
    if (direction.z > 0) tags.push('forward');
    if (direction.z < 0) tags.push('backward');
    if (direction.x < 0) tags.push('strafe_left');
    if (direction.x > 0) tags.push('strafe_right');
    this.motionSystem.addAnimation(
      id,
      id.replace('_', ' '),
      duration,
      frameRate,
      true,
      tags,
      true,
      (time: number) => {
        const phase = (time / duration) * 2 * Math.PI;
        const leftFootPhase = phase;
        const rightFootPhase = phase + Math.PI;
        const leftFootX = Math.sin(leftFootPhase) * 0.1 * direction.x;
        const leftFootY = Math.max(0, Math.sin(leftFootPhase)) * 0.1;
        const leftFootZ = Math.sin(leftFootPhase) * stride * 0.5 * direction.z;
        const rightFootX = Math.sin(rightFootPhase) * 0.1 * direction.x;
        const rightFootY = Math.max(0, Math.sin(rightFootPhase)) * 0.1;
        const rightFootZ = Math.sin(rightFootPhase) * stride * 0.5 * direction.z;
        const hipSway = Math.sin(phase * 2) * 0.03;
        const transforms = this.createStandingPose(0);
        transforms.set('LeftFoot', {
          position: new THREE.Vector3(-0.1 + leftFootX, leftFootY, leftFootZ),
          rotation: new THREE.Quaternion(),
        });
        transforms.set('RightFoot', {
          position: new THREE.Vector3(0.1 + rightFootX, rightFootY, rightFootZ),
          rotation: new THREE.Quaternion(),
        });
        transforms.set('Hips', {
          position: new THREE.Vector3(hipSway, 1.0 + Math.sin(phase * 2) * 0.02, 0),
          rotation: new THREE.Quaternion(),
        });
        return {
          boneTransforms: transforms,
          rootPosition: direction.clone().multiplyScalar(time * speed),
          rootRotation: new THREE.Quaternion(),
        };
      }
    );
  }
  private generateRunAnimation(id: string, direction: THREE.Vector3, speed: number): void {
    const duration = 0.6; // Faster cycle
    const frameRate = 30;
    const stride = speed * duration / 2;
    const tags = ['locomotion', 'run'];
    if (direction.z > 0) tags.push('forward');
    if (direction.z < 0) tags.push('backward');
    this.motionSystem.addAnimation(
      id,
      id.replace('_', ' '),
      duration,
      frameRate,
      true,
      tags,
      true,
      (time: number) => {
        const phase = (time / duration) * 2 * Math.PI;
        const leftFootPhase = phase;
        const rightFootPhase = phase + Math.PI;
        const leftFootY = Math.max(0, Math.sin(leftFootPhase)) * 0.2;
        const leftFootZ = Math.sin(leftFootPhase) * stride * 0.5 * direction.z;
        const rightFootY = Math.max(0, Math.sin(rightFootPhase)) * 0.2;
        const rightFootZ = Math.sin(rightFootPhase) * stride * 0.5 * direction.z;
        const bounce = Math.abs(Math.sin(phase)) * 0.05;
        const transforms = this.createStandingPose(0);
        transforms.set('LeftFoot', {
          position: new THREE.Vector3(-0.1, leftFootY, leftFootZ),
          rotation: new THREE.Quaternion(),
        });
        transforms.set('RightFoot', {
          position: new THREE.Vector3(0.1, rightFootY, rightFootZ),
          rotation: new THREE.Quaternion(),
        });
        transforms.set('Hips', {
          position: new THREE.Vector3(0, 1.0 + bounce, 0),
          rotation: new THREE.Quaternion(),
        });
        transforms.set('LeftHand', {
          position: new THREE.Vector3(-0.3, 0.8, Math.sin(rightFootPhase) * 0.3),
          rotation: new THREE.Quaternion(),
        });
        transforms.set('RightHand', {
          position: new THREE.Vector3(0.3, 0.8, Math.sin(leftFootPhase) * 0.3),
          rotation: new THREE.Quaternion(),
        });
        return {
          boneTransforms: transforms,
          rootPosition: direction.clone().multiplyScalar(time * speed),
          rootRotation: new THREE.Quaternion(),
        };
      }
    );
  }
  private generateTurnAnimation(id: string, angle: number): void {
    const duration = 0.5;
    const frameRate = 30;
    const tags = ['locomotion', 'turn'];
    if (angle < 0) tags.push('turn_left');
    if (angle > 0) tags.push('turn_right');
    this.motionSystem.addAnimation(
      id,
      id.replace('_', ' '),
      duration,
      frameRate,
      false,
      tags,
      true,
      (time: number) => {
        const t = time / duration;
        const easeT = t * t * (3 - 2 * t); // Smoothstep
        const currentAngle = angle * easeT;
        const transforms = this.createStandingPose(0);
        transforms.set('Hips', {
          position: new THREE.Vector3(0, 1.0, 0),
          rotation: new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            currentAngle * 0.2
          ),
        });
        if (angle < 0) {
          transforms.set('LeftFoot', {
            position: new THREE.Vector3(-0.1, 0, 0),
            rotation: new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              currentAngle * 0.5
            ),
          });
        } else {
          transforms.set('RightFoot', {
            position: new THREE.Vector3(0.1, 0, 0),
            rotation: new THREE.Quaternion().setFromAxisAngle(
              new THREE.Vector3(0, 1, 0),
              currentAngle * 0.5
            ),
          });
        }
        return {
          boneTransforms: transforms,
          rootPosition: new THREE.Vector3(),
          rootRotation: new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            currentAngle
          ),
        };
      }
    );
  }
  private createStandingPose(breathOffset: number): Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> {
    const transforms = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>();
    transforms.set('Hips', {
      position: new THREE.Vector3(0, 1.0, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('Spine', {
      position: new THREE.Vector3(0, 1.2 + breathOffset, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('Chest', {
      position: new THREE.Vector3(0, 1.4 + breathOffset, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('Head', {
      position: new THREE.Vector3(0, 1.7 + breathOffset, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('LeftShoulder', {
      position: new THREE.Vector3(-0.2, 1.5, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('RightShoulder', {
      position: new THREE.Vector3(0.2, 1.5, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('LeftHand', {
      position: new THREE.Vector3(-0.3, 0.9, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('RightHand', {
      position: new THREE.Vector3(0.3, 0.9, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('LeftFoot', {
      position: new THREE.Vector3(-0.1, 0, 0),
      rotation: new THREE.Quaternion(),
    });
    transforms.set('RightFoot', {
      position: new THREE.Vector3(0.1, 0, 0),
      rotation: new THREE.Quaternion(),
    });
    return transforms;
  }
  getMotionSystem(): MotionMatchingSystem {
    return this.motionSystem;
  }
}
export const createLocomotionPreset = (): LocomotionPreset => {
  const preset = new LocomotionPreset();
  preset.generateProceduralLocomotion();
  return preset;
};
