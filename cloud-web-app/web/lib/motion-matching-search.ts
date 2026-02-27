import * as THREE from 'three';
import type {
  AnimationPoseData,
  FeatureCosts,
  FeatureWeights,
  MotionFeature,
  MotionMatchResult,
} from './motion-matching-types';

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

    return results.map((r) => ({
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
      const hasRequiredTag = tags.some((t) => node.pose.feature.tags.includes(t));
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
        rotation: new THREE.Vector3(),
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
