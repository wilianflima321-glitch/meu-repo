/**
 * MOTION MATCHING SYSTEM - Aethel Engine
 * 
 * Sistema de animação baseado em Motion Matching como Unreal Engine 5.
 * Busca animações em banco de dados baseado em features do movimento atual.
 * 
 * FEATURES:
 * - Feature extraction (pose, velocity, trajectory)
 * - KD-Tree para busca eficiente
 * - Inertialization blending
 * - Foot locking IK
 * - Trajectory prediction
 * - Animation tagging
 * - Root motion extraction
 * - Strafe/locomotion presets
 */

import * as THREE from 'three';
import { FootLockingIK, TrajectoryPredictor } from './motion-matching-runtime-helpers';
import { InertializationBlender, MotionKDTree } from './motion-matching-search';
import type {
  AnimationData,
  AnimationPoseData,
  FeatureWeights,
  FootLockState,
  MotionDatabase,
  MotionFeature,
  MotionMatchingConfig,
  PoseFeature,
  TrajectoryPoint,
} from './motion-matching-types';
export { FootLockingIK, TrajectoryPredictor } from './motion-matching-runtime-helpers';
export { InertializationBlender, MotionKDTree } from './motion-matching-search';
export type {
  AnimationData,
  AnimationPoseData,
  FeatureWeights,
  FootLockState,
  MotionDatabase,
  MotionFeature,
  MotionMatchingConfig,
  PoseFeature,
  TrajectoryPoint,
} from './motion-matching-types';

// ============================================================================
// MOTION MATCHING SYSTEM
// ============================================================================

export class MotionMatchingSystem {
  private database: MotionDatabase;
  private kdTree: MotionKDTree | null = null;
  private config: MotionMatchingConfig;
  
  private currentPose: AnimationPoseData | null = null;
  private currentTime: number = 0;
  private timeSinceLastSearch: number = 0;
  
  private blender: InertializationBlender;
  private footLocker: FootLockingIK;
  private trajectoryPredictor: TrajectoryPredictor;
  
  private boneVelocities: Map<string, { position: THREE.Vector3; rotation: THREE.Vector3 }> = new Map();
  private lastBoneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> = new Map();
  
  private rootPosition: THREE.Vector3 = new THREE.Vector3();
  private rootRotation: THREE.Quaternion = new THREE.Quaternion();
  
  constructor(config: Partial<MotionMatchingConfig> = {}) {
    this.config = {
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
      ...config,
    };
    
    this.database = {
      poses: [],
      animations: new Map(),
    };
    
    this.blender = new InertializationBlender();
    this.footLocker = new FootLockingIK();
    this.trajectoryPredictor = new TrajectoryPredictor(
      this.config.trajectoryPredictionTime,
      this.config.trajectoryPoints
    );
  }
  
  // Add animation to database
  addAnimation(
    id: string,
    name: string,
    duration: number,
    frameRate: number,
    looping: boolean,
    tags: string[],
    rootMotion: boolean,
    samplePose: (time: number) => {
      boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>;
      rootPosition: THREE.Vector3;
      rootRotation: THREE.Quaternion;
    }
  ): void {
    // Store animation data
    this.database.animations.set(id, {
      id,
      name,
      duration,
      frameRate,
      looping,
      tags,
      rootMotion,
    });
    
    // Sample animation at frame rate
    const frameCount = Math.ceil(duration * frameRate);
    let prevSample: ReturnType<typeof samplePose> | null = null;
    
    for (let i = 0; i < frameCount; i++) {
      const time = i / frameRate;
      const sample = samplePose(time);
      
      // Extract feature
      const feature = this.extractFeature(sample, prevSample, 1 / frameRate);
      feature.tags = tags;
      
      // Add pose to database
      this.database.poses.push({
        animationId: id,
        frameIndex: i,
        time,
        feature,
        rootPosition: sample.rootPosition.clone(),
        rootRotation: sample.rootRotation.clone(),
        boneTransforms: new Map(
          Array.from(sample.boneTransforms.entries()).map(([k, v]) => [
            k,
            { position: v.position.clone(), rotation: v.rotation.clone() },
          ])
        ),
      });
      
      prevSample = sample;
    }
  }
  
  // Build KD-tree after all animations added
  buildSearchTree(): void {
    this.kdTree = new MotionKDTree(this.database.poses, this.config.featureWeights);
  }
  
  // Extract motion feature from pose
  private extractFeature(
    sample: {
      boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>;
      rootPosition: THREE.Vector3;
      rootRotation: THREE.Quaternion;
    },
    prevSample: typeof sample | null,
    dt: number
  ): MotionFeature {
    const getBonePos = (name: string) => 
      sample.boneTransforms.get(name)?.position.clone() || new THREE.Vector3();
    
    const getBoneVel = (name: string) => {
      if (!prevSample) return new THREE.Vector3();
      const curr = sample.boneTransforms.get(name)?.position;
      const prev = prevSample.boneTransforms.get(name)?.position;
      if (!curr || !prev) return new THREE.Vector3();
      return curr.clone().sub(prev).divideScalar(dt);
    };
    
    const rootVel = prevSample
      ? sample.rootPosition.clone().sub(prevSample.rootPosition).divideScalar(dt)
      : new THREE.Vector3();
    
    // Calculate root angular velocity
    let rootAngVel = 0;
    if (prevSample) {
      const q1 = prevSample.rootRotation;
      const q2 = sample.rootRotation;
      const deltaQ = q2.clone().multiply(q1.clone().invert());
      const euler = new THREE.Euler().setFromQuaternion(deltaQ);
      rootAngVel = euler.y / dt; // Yaw rotation speed
    }
    
    return {
      pose: {
        leftFootPosition: getBonePos('LeftFoot'),
        rightFootPosition: getBonePos('RightFoot'),
        leftHandPosition: getBonePos('LeftHand'),
        rightHandPosition: getBonePos('RightHand'),
        hipPosition: getBonePos('Hips'),
        leftFootVelocity: getBoneVel('LeftFoot'),
        rightFootVelocity: getBoneVel('RightFoot'),
        hipVelocity: getBoneVel('Hips'),
        rootVelocity: rootVel,
        rootAngularVelocity: rootAngVel,
      },
      trajectory: [], // Will be filled during search
      tags: [],
    };
  }
  
  // Update motion matching
  update(
    deltaTime: number,
    inputDirection: THREE.Vector2,
    inputMagnitude: number,
    maxSpeed: number,
    tags?: string[]
  ): {
    boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>;
    rootPosition: THREE.Vector3;
    rootRotation: THREE.Quaternion;
  } {
    this.timeSinceLastSearch += deltaTime;
    
    // Update current animation time
    if (this.currentPose) {
      this.currentTime += deltaTime;
      
      // Get animation data
      const animData = this.database.animations.get(this.currentPose.animationId);
      if (animData && this.currentTime >= animData.duration) {
        if (animData.looping) {
          this.currentTime = this.currentTime % animData.duration;
        } else {
          // Force search for new animation
          this.timeSinceLastSearch = this.config.minTimeBetweenSearches;
        }
      }
    }
    
    // Predict trajectory from input
    const currentFacing = new THREE.Euler().setFromQuaternion(this.rootRotation).y;
    const trajectory = this.trajectoryPredictor.predictFromInput(
      this.rootPosition,
      this.currentPose?.feature.pose.rootVelocity || new THREE.Vector3(),
      currentFacing,
      inputDirection,
      inputMagnitude,
      maxSpeed
    );
    
    // Should we search for new animation?
    const shouldSearch = this.timeSinceLastSearch >= this.config.minTimeBetweenSearches;
    
    if (shouldSearch && this.kdTree) {
      // Build query feature
      const queryFeature: MotionFeature = this.currentPose
        ? {
            ...this.currentPose.feature,
            trajectory,
            tags: tags || [],
          }
        : {
            pose: {
              leftFootPosition: new THREE.Vector3(),
              rightFootPosition: new THREE.Vector3(),
              leftHandPosition: new THREE.Vector3(),
              rightHandPosition: new THREE.Vector3(),
              hipPosition: new THREE.Vector3(),
              leftFootVelocity: new THREE.Vector3(),
              rightFootVelocity: new THREE.Vector3(),
              hipVelocity: new THREE.Vector3(),
              rootVelocity: new THREE.Vector3(),
              rootAngularVelocity: 0,
            },
            trajectory,
            tags: tags || [],
          };
      
      // Find best matching pose
      const results = this.kdTree.findNearest(queryFeature, 1, tags);
      
      if (results.length > 0) {
        const bestMatch = results[0];
        
        // Check if this is a different pose than current
        if (!this.currentPose ||
            bestMatch.poseData.animationId !== this.currentPose.animationId ||
            Math.abs(bestMatch.poseData.time - this.currentTime) > 0.1) {
          
          // Start blend to new pose
          if (this.currentPose) {
            const currentBoneTransforms = this.getCurrentBoneTransforms();
            this.blender.startBlend(
              currentBoneTransforms,
              bestMatch.poseData.boneTransforms,
              this.boneVelocities,
              this.config.blendTime
            );
          }
          
          this.currentPose = bestMatch.poseData;
          this.currentTime = bestMatch.poseData.time;
        }
      }
      
      this.timeSinceLastSearch = 0;
    }
    
    // Get current pose transforms
    let boneTransforms = this.getCurrentBoneTransforms();
    
    // Apply inertialization blending
    this.blender.update(deltaTime);
    
    const blendedTransforms = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>();
    for (const [name, transform] of boneTransforms) {
      blendedTransforms.set(name, {
        position: this.blender.applyToPosition(name, transform.position),
        rotation: this.blender.applyToRotation(name, transform.rotation),
      });
    }
    boneTransforms = blendedTransforms;
    
    // Apply foot locking IK
    if (this.config.footLockingEnabled) {
      const leftFoot = boneTransforms.get('LeftFoot');
      const rightFoot = boneTransforms.get('RightFoot');
      
      if (leftFoot && rightFoot && this.currentPose) {
        const footResult = this.footLocker.update(
          leftFoot.position,
          this.currentPose.feature.pose.leftFootVelocity,
          leftFoot.rotation,
          rightFoot.position,
          this.currentPose.feature.pose.rightFootVelocity,
          rightFoot.rotation,
          deltaTime
        );
        
        boneTransforms.set('LeftFoot', footResult.leftFoot);
        boneTransforms.set('RightFoot', footResult.rightFoot);
      }
    }
    
    // Update bone velocities for next frame
    this.updateBoneVelocities(boneTransforms, deltaTime);
    
    // Apply root motion
    if (this.config.rootMotionEnabled && this.currentPose) {
      const rootVel = this.currentPose.feature.pose.rootVelocity;
      this.rootPosition.add(rootVel.clone().multiplyScalar(deltaTime));
      
      const angVel = this.currentPose.feature.pose.rootAngularVelocity;
      const deltaRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        angVel * deltaTime
      );
      this.rootRotation.premultiply(deltaRotation);
    }
    
    return {
      boneTransforms,
      rootPosition: this.rootPosition.clone(),
      rootRotation: this.rootRotation.clone(),
    };
  }
  
  private getCurrentBoneTransforms(): Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> {
    if (!this.currentPose) {
      return new Map();
    }
    
    // Find the frame at current time
    const animData = this.database.animations.get(this.currentPose.animationId);
    if (!animData) return this.currentPose.boneTransforms;
    
    const frameIndex = Math.floor(this.currentTime * animData.frameRate);
    
    // Find pose at this frame
    const pose = this.database.poses.find(
      p => p.animationId === this.currentPose!.animationId && p.frameIndex === frameIndex
    );
    
    return pose?.boneTransforms || this.currentPose.boneTransforms;
  }
  
  private updateBoneVelocities(
    currentTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
    deltaTime: number
  ): void {
    for (const [name, transform] of currentTransforms) {
      const last = this.lastBoneTransforms.get(name);
      
      if (last) {
        const posVel = transform.position.clone().sub(last.position).divideScalar(deltaTime);
        
        const deltaQ = transform.rotation.clone().multiply(last.rotation.clone().invert());
        const euler = new THREE.Euler().setFromQuaternion(deltaQ);
        const rotVel = new THREE.Vector3(euler.x, euler.y, euler.z).divideScalar(deltaTime);
        
        this.boneVelocities.set(name, { position: posVel, rotation: rotVel });
      }
      
      this.lastBoneTransforms.set(name, {
        position: transform.position.clone(),
        rotation: transform.rotation.clone(),
      });
    }
  }
  
  // Set root position/rotation directly
  setRootTransform(position: THREE.Vector3, rotation: THREE.Quaternion): void {
    this.rootPosition.copy(position);
    this.rootRotation.copy(rotation);
  }
  
  // Get database stats
  getStats(): { animationCount: number; poseCount: number; tags: string[] } {
    const allTags = new Set<string>();
    for (const pose of this.database.poses) {
      for (const tag of pose.feature.tags) {
        allTags.add(tag);
      }
    }
    
    return {
      animationCount: this.database.animations.size,
      poseCount: this.database.poses.length,
      tags: Array.from(allTags),
    };
  }
}

// ============================================================================
// LOCOMOTION PRESET
// ============================================================================

export class LocomotionPreset {
  private motionSystem: MotionMatchingSystem;
  
  constructor() {
    this.motionSystem = new MotionMatchingSystem({
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
    });
  }
  
  // Generate procedural locomotion data
  generateProceduralLocomotion(): void {
    // Generate idle
    this.generateIdleAnimation();
    
    // Generate walks
    this.generateWalkAnimation('walk_forward', new THREE.Vector3(0, 0, 1), 1.4);
    this.generateWalkAnimation('walk_backward', new THREE.Vector3(0, 0, -1), 1.2);
    this.generateWalkAnimation('walk_left', new THREE.Vector3(-1, 0, 0), 1.2);
    this.generateWalkAnimation('walk_right', new THREE.Vector3(1, 0, 0), 1.2);
    
    // Generate runs
    this.generateRunAnimation('run_forward', new THREE.Vector3(0, 0, 1), 4.0);
    this.generateRunAnimation('run_backward', new THREE.Vector3(0, 0, -1), 3.0);
    
    // Generate turns
    this.generateTurnAnimation('turn_left', -Math.PI / 2);
    this.generateTurnAnimation('turn_right', Math.PI / 2);
    
    // Build search tree
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
        // Subtle breathing motion
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
        
        // Walk cycle - feet alternating
        const leftFootPhase = phase;
        const rightFootPhase = phase + Math.PI;
        
        // Foot positions
        const leftFootX = Math.sin(leftFootPhase) * 0.1 * direction.x;
        const leftFootY = Math.max(0, Math.sin(leftFootPhase)) * 0.1;
        const leftFootZ = Math.sin(leftFootPhase) * stride * 0.5 * direction.z;
        
        const rightFootX = Math.sin(rightFootPhase) * 0.1 * direction.x;
        const rightFootY = Math.max(0, Math.sin(rightFootPhase)) * 0.1;
        const rightFootZ = Math.sin(rightFootPhase) * stride * 0.5 * direction.z;
        
        // Hip sway
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
        
        // Run cycle - more pronounced movements
        const leftFootPhase = phase;
        const rightFootPhase = phase + Math.PI;
        
        const leftFootY = Math.max(0, Math.sin(leftFootPhase)) * 0.2;
        const leftFootZ = Math.sin(leftFootPhase) * stride * 0.5 * direction.z;
        
        const rightFootY = Math.max(0, Math.sin(rightFootPhase)) * 0.2;
        const rightFootZ = Math.sin(rightFootPhase) * stride * 0.5 * direction.z;
        
        // Body bounce
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
        
        // Arms swing opposite to legs
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
        
        // Rotate hips slightly ahead
        transforms.set('Hips', {
          position: new THREE.Vector3(0, 1.0, 0),
          rotation: new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            currentAngle * 0.2
          ),
        });
        
        // Pivot foot
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

// ============================================================================
// EXPORTS
// ============================================================================

export const createLocomotionPreset = (): LocomotionPreset => {
  const preset = new LocomotionPreset();
  preset.generateProceduralLocomotion();
  return preset;
};
