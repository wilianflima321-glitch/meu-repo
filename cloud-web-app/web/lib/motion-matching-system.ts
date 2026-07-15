// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
/**
 * MOTION MATCHING SYSTEM - Aethel Engine
 *
 * Block 5 CORE (MOTION-001 / IMPROVE-ENG-014):
 * - SOA Float32Array pose DB
 * - O(1) frame index lookup (no poses.find on hot path)
 * - Two-bone analytical foot IK when leg chain present; else honest lerp HELD
 */
import * as THREE from 'three';
import { DEFAULT_MOTION_MATCHING_CONFIG } from './motion-matching-defaults';
import { MotionKDTree } from './motion-matching-kdtree';
import { MotionPoseSoaDatabase } from './motion-matching-soa';
import type {
  AnimationData,
  AnimationPoseData,
  FootLockIkMode,
  FootLockState,
  MotionDatabase,
  MotionFeature,
  MotionMatchingConfig,
  PoseFeature,
  TrajectoryPoint,
} from './motion-matching-contracts';
import { FOOT_LOCK_IK_SHIP_STATUS } from './motion-matching-contracts';

export type {
  AnimationData,
  AnimationPoseData,
  FootLockIkMode,
  FootLockState,
  MotionDatabase,
  MotionFeature,
  MotionMatchingConfig,
  PoseFeature,
  TrajectoryPoint,
} from './motion-matching-contracts';

export { FOOT_LOCK_IK_SHIP_STATUS } from './motion-matching-contracts';
export { MotionKDTree } from './motion-matching-kdtree';
export { MotionPoseSoaDatabase } from './motion-matching-soa';

const LEG_CHAINS = {
  left: { root: 'LeftUpLeg', mid: 'LeftLeg', end: 'LeftFoot' },
  right: { root: 'RightUpLeg', mid: 'RightLeg', end: 'RightFoot' },
} as const

/**
 * Analytical two-bone IK (cosine law) for a hip→knee→foot chain.
 * Mutates mid + end positions in the transform map; rotations face the bone axes.
 */
export function solveTwoBoneIkPositions(
  transforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
  rootName: string,
  midName: string,
  endName: string,
  target: THREE.Vector3,
  poleHint?: THREE.Vector3,
): boolean {
  const root = transforms.get(rootName)
  const mid = transforms.get(midName)
  const end = transforms.get(endName)
  if (!root || !mid || !end) return false

  const rootPos = root.position
  const upperLen = rootPos.distanceTo(mid.position)
  const lowerLen = mid.position.distanceTo(end.position)
  const total = upperLen + lowerLen
  if (total < 1e-6) return false

  const toTarget = target.clone().sub(rootPos)
  const targetDist = Math.min(toTarget.length(), total * 0.999)
  if (targetDist < 1e-6) {
    end.position.copy(rootPos)
    return true
  }
  const rootToTarget = toTarget.normalize()

  const cosAngle =
    (upperLen * upperLen + targetDist * targetDist - lowerLen * lowerLen) /
    (2 * upperLen * targetDist)
  const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)))

  const pole =
    poleHint?.clone() ??
    mid.position.clone().add(new THREE.Vector3(0, 0, 0.25))
  const poleDir = pole.sub(rootPos).normalize()
  let polePlaneNormal = new THREE.Vector3().crossVectors(rootToTarget, poleDir)
  if (polePlaneNormal.lengthSq() < 1e-8) {
    polePlaneNormal = new THREE.Vector3(0, 1, 0).cross(rootToTarget)
  }
  polePlaneNormal.normalize()

  const upperRotation = new THREE.Quaternion().setFromAxisAngle(polePlaneNormal, angle)
  const upperDir = rootToTarget.clone().applyQuaternion(upperRotation)
  const newMid = rootPos.clone().add(upperDir.clone().multiplyScalar(upperLen))
  const midToTarget = target.clone().sub(newMid).normalize()

  mid.position.copy(newMid)
  end.position.copy(target)

  const look = (dir: THREE.Vector3) => {
    const q = new THREE.Quaternion()
    const m = new THREE.Matrix4()
    m.lookAt(new THREE.Vector3(), dir, new THREE.Vector3(0, 1, 0))
    q.setFromRotationMatrix(m)
    return q
  }
  root.rotation.copy(look(upperDir))
  mid.rotation.copy(look(midToTarget))
  return true
}

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
    const omega = 10;
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
  private lockThreshold: number = 0.1;
  private unlockThreshold: number = 0.3;
  private maxLockDistance: number = 0.3;
  /** Last mode used — honest for UX badges. */
  lastMode: FootLockIkMode = 'lerp_not_production_ik';

  getShipHonesty(): { mode: FootLockIkMode; status: string; note: string } {
    if (this.lastMode === 'two_bone') {
      return { mode: 'two_bone', status: FOOT_LOCK_IK_SHIP_STATUS.twoBone, note: 'Analytical two-bone foot IK' }
    }
    return {
      mode: 'lerp_not_production_ik',
      status: FOOT_LOCK_IK_SHIP_STATUS.lerpFallback,
      note: FOOT_LOCK_IK_SHIP_STATUS.labelLerp,
    }
  }

  /**
   * Prefer two-bone when leg chains exist in the pose; otherwise lerp (HELD / not production IK).
   */
  applyToPose(
    boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
    leftFootVel: THREE.Vector3,
    rightFootVel: THREE.Vector3,
    deltaTime: number,
  ): void {
    const leftFoot = boneTransforms.get(LEG_CHAINS.left.end)
    const rightFoot = boneTransforms.get(LEG_CHAINS.right.end)
    if (!leftFoot || !rightFoot) return

    const hasLeftChain =
      boneTransforms.has(LEG_CHAINS.left.root) && boneTransforms.has(LEG_CHAINS.left.mid)
    const hasRightChain =
      boneTransforms.has(LEG_CHAINS.right.root) && boneTransforms.has(LEG_CHAINS.right.mid)

    if (hasLeftChain && hasRightChain) {
      this.lastMode = 'two_bone'
      const leftTarget = this.resolveLockTarget(this.leftFootState, leftFoot.position, leftFootVel, leftFoot.rotation, deltaTime)
      const rightTarget = this.resolveLockTarget(this.rightFootState, rightFoot.position, rightFootVel, rightFoot.rotation, deltaTime)
      solveTwoBoneIkPositions(
        boneTransforms,
        LEG_CHAINS.left.root,
        LEG_CHAINS.left.mid,
        LEG_CHAINS.left.end,
        leftTarget.position,
      )
      boneTransforms.get(LEG_CHAINS.left.end)!.rotation.copy(leftTarget.rotation)
      solveTwoBoneIkPositions(
        boneTransforms,
        LEG_CHAINS.right.root,
        LEG_CHAINS.right.mid,
        LEG_CHAINS.right.end,
        rightTarget.position,
      )
      boneTransforms.get(LEG_CHAINS.right.end)!.rotation.copy(rightTarget.rotation)
      return
    }

    this.lastMode = 'lerp_not_production_ik'
    const leftResult = this.updateFoot(this.leftFootState, leftFoot.position, leftFootVel, leftFoot.rotation, deltaTime)
    const rightResult = this.updateFoot(this.rightFootState, rightFoot.position, rightFootVel, rightFoot.rotation, deltaTime)
    boneTransforms.set(LEG_CHAINS.left.end, leftResult)
    boneTransforms.set(LEG_CHAINS.right.end, rightResult)
  }

  update(
    leftFootPos: THREE.Vector3,
    leftFootVel: THREE.Vector3,
    leftFootRot: THREE.Quaternion,
    rightFootPos: THREE.Vector3,
    rightFootVel: THREE.Vector3,
    rightFootRot: THREE.Quaternion,
    deltaTime: number
  ): { leftFoot: { position: THREE.Vector3; rotation: THREE.Quaternion }; rightFoot: { position: THREE.Vector3; rotation: THREE.Quaternion } } {
    this.lastMode = 'lerp_not_production_ik'
    return {
      leftFoot: this.updateFoot(this.leftFootState, leftFootPos, leftFootVel, leftFootRot, deltaTime),
      rightFoot: this.updateFoot(this.rightFootState, rightFootPos, rightFootVel, rightFootRot, deltaTime),
    };
  }

  private resolveLockTarget(
    state: FootLockState,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    rotation: THREE.Quaternion,
    deltaTime: number,
  ): { position: THREE.Vector3; rotation: THREE.Quaternion } {
    return this.updateFoot(state, position, velocity, rotation, deltaTime)
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
      return { position: position.clone(), rotation: rotation.clone() };
    }
    const distance = position.distanceTo(state.lockPosition);
    if (speed > this.unlockThreshold || distance > this.maxLockDistance) {
      state.unlockProgress += deltaTime * 5;
      if (state.unlockProgress >= 1) {
        state.locked = false;
        state.unlockProgress = 1;
        return { position: position.clone(), rotation: rotation.clone() };
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
    _stickInput: THREE.Vector2
  ): TrajectoryPoint[] {
    const points: TrajectoryPoint[] = [];
    const dt = this.predictionTime / this.pointCount;
    let pos = currentPosition.clone();
    let vel = currentVelocity.clone();
    let facing = currentFacing.clone();
    const acceleration = 10;
    const turnSpeed = 5;
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
    currentFacing: number,
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
  private soa: MotionPoseSoaDatabase;
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
  private scratchBones: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> = new Map();
  private blendTargetBones: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> = new Map();
  private rootPosition: THREE.Vector3 = new THREE.Vector3();
  private rootRotation: THREE.Quaternion = new THREE.Quaternion();

  constructor(config: Partial<MotionMatchingConfig> = {}) {
    this.config = {
      ...DEFAULT_MOTION_MATCHING_CONFIG,
      ...config,
    };
    this.soa = new MotionPoseSoaDatabase();
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

  getSoaDatabase(): MotionPoseSoaDatabase {
    return this.soa
  }

  getFootLockHonesty() {
    return this.footLocker.getShipHonesty()
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
    this.soa.beginAnimation(id);
    let prevSample: ReturnType<typeof samplePose> | null = null;
    for (let i = 0; i < frameCount; i++) {
      const time = i / frameRate;
      const sample = samplePose(time);
      const feature = this.extractFeature(sample, prevSample, 1 / frameRate);
      feature.tags = tags;
      const soaIndex = this.soa.appendPose({
        animationId: id,
        frameIndex: i,
        time,
        feature,
        boneTransforms: sample.boneTransforms,
        rootPosition: sample.rootPosition,
        rootRotation: sample.rootRotation,
      });
      this.database.poses.push({
        animationId: id,
        frameIndex: i,
        time,
        feature,
        rootPosition: sample.rootPosition.clone(),
        rootRotation: sample.rootRotation.clone(),
        soaIndex,
        boneTransforms: new Map(),
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
      rootAngVel = euler.y / dt;
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
      trajectory: [],
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
            this.soa.readBoneTransforms(bestMatch.poseData.soaIndex, this.blendTargetBones);
            this.blender.startBlend(
              currentBoneTransforms,
              this.blendTargetBones,
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
    if (this.config.footLockingEnabled && this.currentPose) {
      this.footLocker.applyToPose(
        boneTransforms,
        this.currentPose.feature.pose.leftFootVelocity,
        this.currentPose.feature.pose.rightFootVelocity,
        deltaTime,
      );
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

  /** O(1) SOA playback — never `poses.find`. */
  private getCurrentBoneTransforms(): Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> {
    if (!this.currentPose) {
      return new Map();
    }
    const animData = this.database.animations.get(this.currentPose.animationId);
    if (!animData) {
      this.soa.readBoneTransforms(this.currentPose.soaIndex, this.scratchBones);
      return this.cloneBoneMap(this.scratchBones);
    }
    const frameIndex = Math.floor(this.currentTime * animData.frameRate);
    const soaIndex = this.soa.getPoseIndex(this.currentPose.animationId, frameIndex);
    const index = soaIndex >= 0 ? soaIndex : this.currentPose.soaIndex;
    this.soa.readBoneTransforms(index, this.scratchBones);
    return this.cloneBoneMap(this.scratchBones);
  }

  private cloneBoneMap(
    src: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>,
  ): Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }> {
    const out = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>();
    for (const [k, v] of src) {
      out.set(k, { position: v.position.clone(), rotation: v.rotation.clone() });
    }
    return out;
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

  getStats(): { animationCount: number; poseCount: number; tags: string[]; soaPoseCount: number } {
    const allTags = new Set<string>();
    for (const pose of this.database.poses) {
      for (const tag of pose.feature.tags) {
        allTags.add(tag);
      }
    }
    return {
      animationCount: this.database.animations.size,
      poseCount: this.database.poses.length,
      soaPoseCount: this.soa.poseCount,
      tags: Array.from(allTags),
    };
  }
}

export { LocomotionPreset, createLocomotionPreset } from './motion-matching-locomotion-preset';
