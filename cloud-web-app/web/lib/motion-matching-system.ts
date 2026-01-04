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

// ============================================================================
// TYPES
// ============================================================================

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
  // Bone positions relative to root
  leftFootPosition: THREE.Vector3;
  rightFootPosition: THREE.Vector3;
  leftHandPosition: THREE.Vector3;
  rightHandPosition: THREE.Vector3;
  hipPosition: THREE.Vector3;
  
  // Velocities
  leftFootVelocity: THREE.Vector3;
  rightFootVelocity: THREE.Vector3;
  hipVelocity: THREE.Vector3;
  
  // Root motion
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
  boneTransforms: Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion }>;
}

export interface MotionDatabase {
  poses: AnimationPoseData[];
  animations: Map<string, AnimationData>;
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

// ============================================================================
// KD-TREE FOR EFFICIENT SEARCH
// ============================================================================

interface KDNode {
  pose: AnimationPoseData;
  featureVector: number[];
  left: KDNode | null;
  right: KDNode | null;
  splitAxis: number;
}

export class MotionKDTree {
  private root: KDNode | null = null;
  private dimensions: number;
  
  constructor(poses: AnimationPoseData[], private weights: FeatureWeights) {
    this.dimensions = this.calculateDimensions();
    this.root = this.buildTree(poses, 0);
  }
  
  private calculateDimensions(): number {
    // 3D vectors: leftFoot, rightFoot, leftHand, rightHand, hip (positions)
    // 3D vectors: leftFootVel, rightFootVel, hipVel (velocities)
    // 3D vector: rootVelocity
    // 1 scalar: rootAngularVelocity
    // Trajectory: N points * (3D position + 2D facing) = N * 5
    return 9 * 3 + 1 + 5 * 5; // 53 dimensions
  }
  
  private poseToFeatureVector(pose: AnimationPoseData): number[] {
    const f = pose.feature;
    const vector: number[] = [];
    
    // Pose features (weighted)
    const addVec3 = (v: THREE.Vector3, w: number) => {
      vector.push(v.x * w, v.y * w, v.z * w);
    };
    
    addVec3(f.pose.leftFootPosition, this.weights.leftFootPosition);
    addVec3(f.pose.rightFootPosition, this.weights.rightFootPosition);
    addVec3(f.pose.leftHandPosition, 1.0);
    addVec3(f.pose.rightHandPosition, 1.0);
    addVec3(f.pose.hipPosition, this.weights.hipPosition);
    
    // Velocity features
    addVec3(f.pose.leftFootVelocity, this.weights.leftFootVelocity);
    addVec3(f.pose.rightFootVelocity, this.weights.rightFootVelocity);
    addVec3(f.pose.hipVelocity, this.weights.hipVelocity);
    addVec3(f.pose.rootVelocity, 1.0);
    
    vector.push(f.pose.rootAngularVelocity);
    
    // Trajectory features
    for (let i = 0; i < 5; i++) {
      const t = f.trajectory[i] || { position: new THREE.Vector3(), facing: new THREE.Vector2() };
      vector.push(
        t.position.x * this.weights.trajectory,
        t.position.y * this.weights.trajectory,
        t.position.z * this.weights.trajectory,
        t.facing.x * this.weights.facing,
        t.facing.y * this.weights.facing
      );
    }
    
    return vector;
  }
  
  private buildTree(poses: AnimationPoseData[], depth: number): KDNode | null {
    if (poses.length === 0) return null;
    
    const axis = depth % this.dimensions;
    
    // Sort by axis
    const sortedPoses = [...poses].sort((a, b) => {
      const vecA = this.poseToFeatureVector(a);
      const vecB = this.poseToFeatureVector(b);
      return vecA[axis] - vecB[axis];
    });
    
    const medianIndex = Math.floor(sortedPoses.length / 2);
    const medianPose = sortedPoses[medianIndex];
    
    return {
      pose: medianPose,
      featureVector: this.poseToFeatureVector(medianPose),
      left: this.buildTree(sortedPoses.slice(0, medianIndex), depth + 1),
      right: this.buildTree(sortedPoses.slice(medianIndex + 1), depth + 1),
      splitAxis: axis,
    };
  }
  
  findNearest(queryFeature: MotionFeature, k: number = 1, tags?: string[]): MotionMatchResult[] {
    const queryVector = this.featureToVector(queryFeature);
    const results: { node: KDNode; distance: number }[] = [];
    
    this.searchNearest(this.root, queryVector, k, results, tags);
    
    return results.map(r => ({
      poseData: r.node.pose,
      cost: r.distance,
      featureCosts: this.calculateFeatureCosts(queryVector, r.node.featureVector),
    }));
  }
  
  private featureToVector(feature: MotionFeature): number[] {
    const f = feature;
    const vector: number[] = [];
    
    const addVec3 = (v: THREE.Vector3, w: number) => {
      vector.push(v.x * w, v.y * w, v.z * w);
    };
    
    addVec3(f.pose.leftFootPosition, this.weights.leftFootPosition);
    addVec3(f.pose.rightFootPosition, this.weights.rightFootPosition);
    addVec3(f.pose.leftHandPosition, 1.0);
    addVec3(f.pose.rightHandPosition, 1.0);
    addVec3(f.pose.hipPosition, this.weights.hipPosition);
    
    addVec3(f.pose.leftFootVelocity, this.weights.leftFootVelocity);
    addVec3(f.pose.rightFootVelocity, this.weights.rightFootVelocity);
    addVec3(f.pose.hipVelocity, this.weights.hipVelocity);
    addVec3(f.pose.rootVelocity, 1.0);
    
    vector.push(f.pose.rootAngularVelocity);
    
    for (let i = 0; i < 5; i++) {
      const t = f.trajectory[i] || { position: new THREE.Vector3(), facing: new THREE.Vector2() };
      vector.push(
        t.position.x * this.weights.trajectory,
        t.position.y * this.weights.trajectory,
        t.position.z * this.weights.trajectory,
        t.facing.x * this.weights.facing,
        t.facing.y * this.weights.facing
      );
    }
    
    return vector;
  }
  
  private searchNearest(
    node: KDNode | null,
    query: number[],
    k: number,
    results: { node: KDNode; distance: number }[],
    tags?: string[]
  ): void {
    if (!node) return;
    
    // Check tags filter
    if (tags && tags.length > 0) {
      const hasRequiredTag = tags.some(t => node.pose.feature.tags.includes(t));
      if (!hasRequiredTag) {
        // Still need to search children
        this.searchNearest(node.left, query, k, results, tags);
        this.searchNearest(node.right, query, k, results, tags);
        return;
      }
    }
    
    const distance = this.euclideanDistance(query, node.featureVector);
    
    // Add to results
    if (results.length < k) {
      results.push({ node, distance });
      results.sort((a, b) => a.distance - b.distance);
    } else if (distance < results[results.length - 1].distance) {
      results[results.length - 1] = { node, distance };
      results.sort((a, b) => a.distance - b.distance);
    }
    
    // Determine which side to search first
    const axis = node.splitAxis;
    const diff = query[axis] - node.featureVector[axis];
    
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;
    
    this.searchNearest(first, query, k, results, tags);
    
    // Check if we need to search the other side
    if (results.length < k || Math.abs(diff) < results[results.length - 1].distance) {
      this.searchNearest(second, query, k, results, tags);
    }
  }
  
  private euclideanDistance(a: number[], b: number[]): number {
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      const diff = a[i] - b[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
  
  private calculateFeatureCosts(query: number[], target: number[]): FeatureCosts {
    // Pose cost (first 27 elements: 9 vectors * 3)
    let poseCost = 0;
    for (let i = 0; i < 27; i++) {
      poseCost += (query[i] - target[i]) ** 2;
    }
    
    // Velocity cost (elements 27-36: 3 velocities * 3)
    let velocityCost = 0;
    for (let i = 27; i < 37; i++) {
      velocityCost += (query[i] - target[i]) ** 2;
    }
    
    // Trajectory cost (remaining elements)
    let trajectoryCost = 0;
    for (let i = 37; i < query.length; i++) {
      trajectoryCost += (query[i] - target[i]) ** 2;
    }
    
    return {
      pose: Math.sqrt(poseCost),
      velocity: Math.sqrt(velocityCost),
      trajectory: Math.sqrt(trajectoryCost),
      total: Math.sqrt(poseCost + velocityCost + trajectoryCost),
    };
  }
}

// ============================================================================
// INERTIALIZATION BLENDER
// ============================================================================

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
      
      // Calculate offset
      const posOffset = current.position.clone().sub(target.position);
      const rotOffset = current.rotation.clone().multiply(target.rotation.clone().invert());
      
      this.sourceOffset.set(boneName, {
        position: posOffset,
        rotation: rotOffset,
      });
      
      // Store velocity
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
    
    // Inertialization decay function
    const x0 = offset.position;
    const v0 = velocity.position;
    
    // Critically damped spring response
    const decay = this.inertializeDecay(t, x0.length(), v0.length());
    
    return position.clone().add(x0.clone().multiplyScalar(decay));
  }
  
  applyToRotation(boneName: string, rotation: THREE.Quaternion): THREE.Quaternion {
    if (!this.isBlending) return rotation;
    
    const offset = this.sourceOffset.get(boneName);
    
    if (!offset) return rotation;
    
    const t = this.blendTime / this.blendDuration;
    const decay = this.inertializeDecay(t, 1, 0);
    
    // Slerp from offset to identity
    const blendedOffset = new THREE.Quaternion().slerpQuaternions(
      offset.rotation,
      new THREE.Quaternion(),
      1 - decay
    );
    
    return rotation.clone().multiply(blendedOffset);
  }
  
  private inertializeDecay(t: number, x0: number, v0: number): number {
    // Critically damped spring decay
    // x(t) = (x0 + (v0 + x0*ω)*t) * e^(-ω*t)
    const omega = 10; // Damping frequency
    const exp = Math.exp(-omega * t);
    return (1 + omega * t) * exp;
  }
  
  getIsBlending(): boolean {
    return this.isBlending;
  }
}

// ============================================================================
// FOOT LOCKING IK
// ============================================================================

export interface FootLockState {
  locked: boolean;
  lockPosition: THREE.Vector3;
  lockRotation: THREE.Quaternion;
  unlockProgress: number;
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
    // Update left foot
    const leftResult = this.updateFoot(
      this.leftFootState,
      leftFootPos,
      leftFootVel,
      leftFootRot,
      deltaTime
    );
    
    // Update right foot
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
      // Check if we should lock
      if (speed < this.lockThreshold) {
        state.locked = true;
        state.lockPosition.copy(position);
        state.lockRotation.copy(rotation);
        state.unlockProgress = 0;
      }
      return { position, rotation };
    }
    
    // We're locked - check if we should unlock
    const distance = position.distanceTo(state.lockPosition);
    
    if (speed > this.unlockThreshold || distance > this.maxLockDistance) {
      // Start unlocking
      state.unlockProgress += deltaTime * 5; // Unlock over 0.2 seconds
      
      if (state.unlockProgress >= 1) {
        state.locked = false;
        state.unlockProgress = 1;
        return { position, rotation };
      }
    }
    
    // Blend between locked and animated position
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

// ============================================================================
// TRAJECTORY PREDICTOR
// ============================================================================

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
    
    // Acceleration towards desired velocity
    const acceleration = 10; // m/s²
    const turnSpeed = 5; // rad/s
    
    for (let i = 0; i < this.pointCount; i++) {
      const t = (i + 1) * dt;
      
      // Accelerate towards desired velocity
      const velDiff = desiredVelocity.clone().sub(vel);
      const velDiffLength = velDiff.length();
      
      if (velDiffLength > 0.01) {
        const accel = velDiff.normalize().multiplyScalar(Math.min(acceleration * dt, velDiffLength));
        vel.add(accel);
      }
      
      // Update position
      pos = pos.clone().add(vel.clone().multiplyScalar(dt));
      
      // Turn towards desired facing
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
