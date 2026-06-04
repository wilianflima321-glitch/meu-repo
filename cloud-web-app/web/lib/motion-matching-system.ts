// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
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
import { DEFAULT_MOTION_MATCHING_CONFIG } from './motion-matching-defaults';
import { MotionKDTree } from './motion-matching-kdtree';
import type {
  AnimationData,
  AnimationPoseData,
  FootLockState,
  MotionDatabase,
  MotionFeature,
  MotionMatchingConfig,
  PoseFeature,
  TrajectoryPoint,
} from './motion-matching-contracts';

export type {
  AnimationData,
  AnimationPoseData,
  FootLockState,
  MotionDatabase,
  MotionFeature,
  MotionMatchingConfig,
  PoseFeature,
  TrajectoryPoint,
} from './motion-matching-contracts';

export { MotionKDTree } from './motion-matching-kdtree';

export class InertializationBlender {
  private sourceOffset: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> = new Map();
  private sourceVelocity: Map<string, { position: THREE.Vector3; rotation: THREE.Vector3 }> = new Map();
  private blendTime: number = 0;
  private blendDuration: number = 0.2;
  private isBlending: boolean = false;
  startBlend(
    currentPose: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
    targetPose: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
    velocities: Map<string, { position: THREE.Vector3; rotation: THREE.Vector3 }>,
    duration: number = 0.2
  ): void {
    this.sourceOffset.clear();
    this.sourceVelocity.clear();
    for (const [boneName, current] of currentPose) {
      const target = targetPose.get(boneName);
      if (!target) continue;
      const posOffset = current.position.clone().sub(target.position);
      const rotOffset = current.rotation.clone().multiply(target.rotation.clone().invert());
      this.sourceOffset.set(boneName, {
        position: posOffset,
        rotation: rotOffset,
      });
      const vel = velocities.get(boneName) || {
        position: new THREE.Vector3(),
        rotation: new THREE.Vector3()
      };
      this.sourceVelocity.set(boneName, vel);
    }
    this.blendTime = 0;
    this.blendDuration = duration;
    this.isBlending = true;
  }
  update(deltaTime: number): void {
    if (!this.isBlending) return;
    this.blendTime += deltaTime;
    if (this.blendTime >= this.blendDuration) {
      this.isBlending = false;
      this.sourceOffset.clear();
      this.sourceVelocity.clear();
    }
  }
  applyToPosition(boneName: string, position: THREE.Vector3): THREE.Vector3 {
    if (!this.isBlending) return position;
    const offset = this.sourceOffset.get(boneName);
    const velocity = this.sourceVelocity.get(boneName);
    if (!offset || !velocity) return position;
    const t = this.blendTime / this.blendDuration;
    const x0 = offset.position;
    const v0 = velocity.position;
    const decay = this.inertializeDecay(t, x0.length(), v0.length());
    return position.clone().add(x0.clone().multiplyScalar(decay));
  }
  applyToRotation(boneName: string, rotation: THREE.Quaternion): THREE.Quaternion {
    if (!this.isBlending) return rotation;
    const offset = this.sourceOffset.get(boneName);
    if (!offset) return rotation;
    const t = this.blendTime / this.blendDuration;
    const decay = this.inertializeDecay(t, 1, 0);
    const blendedOffset = new THREE.Quaternion().slerpQuaternions(
      offset.rotation,
      new THREE.Quaternion(),
      1 - decay
    );
    return rotation.clone().multiply(blendedOffset);
  }
  private inertializeDecay(t: number, x0: number, v0: number): number {
    const omega = 10; // Damping frequency
    const exp = Math.exp(-omega * t);
    return (1 + omega * t) * exp;
  }
  getIsBlending(): boolean {
    return this.isBlending;
  }
}
export class FootLockingIK {
  private leftFootState: FootLockState = {
    locked: false,
    lockPosition: new THREE.Vector3(),
    lockRotation: new THREE.Quaternion(),
    unlockProgress: 1,
  };
  private rightFootState: FootLockState = {
    locked: false,
    lockPosition: new THREE.Vector3(),
    lockRotation: new THREE.Quaternion(),
    unlockProgress: 1,
  };
  private lockThreshold: number = 0.1; // Velocity threshold for locking
  private unlockThreshold: number = 0.3; // Velocity threshold for unlocking
  private maxLockDistance: number = 0.3; // Max distance before forced unlock
  update(
    leftFootPos: THREE.Vector3,
    leftFootVel: THREE.Vector3,
    leftFootRot: THREE.Quaternion,
    rightFootPos: THREE.Vector3,
    rightFootVel: THREE.Vector3,
    rightFootRot: THREE.Quaternion,
    deltaTime: number
  ): { leftFoot: { position: THREE.Vector3; rotation: THREE.Quaternion }; rightFoot: { position: THREE.Vector3; rotation: THREE.Quaternion } } {
    const leftResult = this.updateFoot(
      this.leftFootState,
      leftFootPos,
      leftFootVel,
      leftFootRot,
      deltaTime
    );
    const rightResult = this.updateFoot(
      this.rightFootState,
      rightFootPos,
      rightFootVel,
      rightFootRot,
      deltaTime
    );
    return {
      leftFoot: leftResult,
      rightFoot: rightResult,
    };
  }
  private updateFoot(
    state: FootLockState,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    rotation: THREE.Quaternion,
    deltaTime: number
  ): { position: THREE.Vector3; rotation: THREE.Quaternion } {
    const speed = velocity.length();
    if (!state.locked) {
      if (speed < this.lockThreshold) {
        state.locked = true;
        state.lockPosition.copy(position);
        state.lockRotation.copy(rotation);
        state.unlockProgress = 0;
      }
      return { position, rotation };
    }
    const distance = position.distanceTo(state.lockPosition);
    if (speed > this.unlockThreshold || distance > this.maxLockDistance) {
      state.unlockProgress += deltaTime * 5; // Unlock over 0.2 seconds
      if (state.unlockProgress >= 1) {
        state.locked = false;
        state.unlockProgress = 1;
        return { position, rotation };
      }
    }
    const t = state.unlockProgress;
    const blendedPosition = state.lockPosition.clone().lerp(position, t);
    const blendedRotation = state.lockRotation.clone().slerp(rotation, t);
    return { position: blendedPosition, rotation: blendedRotation };
  }
  reset(): void {
    this.leftFootState.locked = false;
    this.leftFootState.unlockProgress = 1;
    this.rightFootState.locked = false;
    this.rightFootState.unlockProgress = 1;
  }
}
export class TrajectoryPredictor {
  private predictionTime: number;
  private pointCount: number;
  constructor(predictionTime: number = 1.0, pointCount: number = 5) {
    this.predictionTime = predictionTime;
    this.pointCount = pointCount;
  }
  predict(
    currentPosition: THREE.Vector3,
    currentVelocity: THREE.Vector3,
    currentFacing: THREE.Vector2,
    desiredVelocity: THREE.Vector3,
    desiredFacing: THREE.Vector2,
    stickInput: THREE.Vector2
  ): TrajectoryPoint[] {
    const points: TrajectoryPoint[] = [];
    const dt = this.predictionTime / this.pointCount;
    let pos = currentPosition.clone();
    let vel = currentVelocity.clone();
    let facing = currentFacing.clone();
    const acceleration = 10; // m/s²
    const turnSpeed = 5; // rad/s
    for (let i = 0; i < this.pointCount; i++) {
      const t = (i + 1) * dt;
      const velDiff = desiredVelocity.clone().sub(vel);
      const velDiffLength = velDiff.length();
      if (velDiffLength > 0.01) {
        const accel = velDiff.normalize().multiplyScalar(Math.min(acceleration * dt, velDiffLength));
        vel.add(accel);
      }
      pos = pos.clone().add(vel.clone().multiplyScalar(dt));
      const facingDiff = desiredFacing.clone().sub(facing);
      const maxTurn = turnSpeed * dt;
      if (facingDiff.length() > maxTurn) {
        facingDiff.normalize().multiplyScalar(maxTurn);
      }
      facing.add(facingDiff).normalize();
      points.push({
        position: pos.clone(),
        facing: facing.clone(),
        time: t,
      });
    }
    return points;
  }
  predictFromInput(
    currentPosition: THREE.Vector3,
    currentVelocity: THREE.Vector3,
    currentFacing: number, // Yaw angle
    inputDirection: THREE.Vector2,
    inputMagnitude: number,
    maxSpeed: number
  ): TrajectoryPoint[] {
    const desiredVelocity = new THREE.Vector3(
      inputDirection.x * inputMagnitude * maxSpeed,
      0,
      inputDirection.y * inputMagnitude * maxSpeed
    );
    const desiredFacing = inputMagnitude > 0.1
      ? new THREE.Vector2(inputDirection.x, inputDirection.y).normalize()
      : new THREE.Vector2(Math.sin(currentFacing), Math.cos(currentFacing));
    const currentFacingVec = new THREE.Vector2(
      Math.sin(currentFacing),
      Math.cos(currentFacing)
    );
    return this.predict(
      currentPosition,
      currentVelocity,
      currentFacingVec,
      desiredVelocity,
      desiredFacing,
      inputDirection
    );
  }
}
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
      ...DEFAULT_MOTION_MATCHING_CONFIG,
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
    this.database.animations.set(id, {
      id,
      name,
      duration,
      frameRate,
      looping,
      tags,
      rootMotion,
    });
    const frameCount = Math.ceil(duration * frameRate);
    let prevSample: ReturnType<typeof samplePose> | null = null;
    for (let i = 0; i < frameCount; i++) {
      const time = i / frameRate;
      const sample = samplePose(time);
      const feature = this.extractFeature(sample, prevSample, 1 / frameRate);
      feature.tags = tags;
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
  buildSearchTree(): void {
    this.kdTree = new MotionKDTree(this.database.poses, this.config.featureWeights);
  }
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
    if (this.currentPose) {
      this.currentTime += deltaTime;
      const animData = this.database.animations.get(this.currentPose.animationId);
      if (animData && this.currentTime >= animData.duration) {
        if (animData.looping) {
          this.currentTime = this.currentTime % animData.duration;
        } else {
          this.timeSinceLastSearch = this.config.minTimeBetweenSearches;
        }
      }
    }
    const currentFacing = new THREE.Euler().setFromQuaternion(this.rootRotation).y;
    const trajectory = this.trajectoryPredictor.predictFromInput(
      this.rootPosition,
      this.currentPose?.feature.pose.rootVelocity || new THREE.Vector3(),
      currentFacing,
      inputDirection,
      inputMagnitude,
      maxSpeed
    );
    const shouldSearch = this.timeSinceLastSearch >= this.config.minTimeBetweenSearches;
    if (shouldSearch && this.kdTree) {
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
      const results = this.kdTree.findNearest(queryFeature, 1, tags);
      if (results.length > 0) {
        const bestMatch = results[0];
        if (!this.currentPose ||
            bestMatch.poseData.animationId !== this.currentPose.animationId ||
            Math.abs(bestMatch.poseData.time - this.currentTime) > 0.1) {
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
    let boneTransforms = this.getCurrentBoneTransforms();
    this.blender.update(deltaTime);
    const blendedTransforms = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>();
    for (const [name, transform] of boneTransforms) {
      blendedTransforms.set(name, {
        position: this.blender.applyToPosition(name, transform.position),
        rotation: this.blender.applyToRotation(name, transform.rotation),
      });
    }
    boneTransforms = blendedTransforms;
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
    this.updateBoneVelocities(boneTransforms, deltaTime);
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
    const animData = this.database.animations.get(this.currentPose.animationId);
    if (!animData) return this.currentPose.boneTransforms;
    const frameIndex = Math.floor(this.currentTime * animData.frameRate);
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
  setRootTransform(position: THREE.Vector3, rotation: THREE.Quaternion): void {
    this.rootPosition.copy(position);
    this.rootRotation.copy(rotation);
  }
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

export { LocomotionPreset, createLocomotionPreset } from './motion-matching-locomotion-preset';
