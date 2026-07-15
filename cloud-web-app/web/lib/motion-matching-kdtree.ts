// @aethel-heavy-async-boundary Studio animation search runtime; never import from route shells.
import * as THREE from 'three';

import type {
  AnimationPoseData,
  FeatureCosts,
  FeatureWeights,
  KDNode,
  MotionFeature,
  MotionMatchResult,
} from './motion-matching-contracts';

export class MotionKDTree {
  private root: KDNode | null = null;
  private dimensions: number;
  constructor(poses: AnimationPoseData[], private weights: FeatureWeights) {
    this.dimensions = this.calculateDimensions();
    this.root = this.buildTree(poses, 0);
  }
  private calculateDimensions(): number {
    return 9 * 3 + 1 + 5 * 5; // 53 dimensions
  }
  private poseToFeatureVector(pose: AnimationPoseData): number[] {
    const f = pose.feature;
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
  private buildTree(poses: AnimationPoseData[], depth: number): KDNode | null {
    if (poses.length === 0) return null;
    const axis = depth % this.dimensions;
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
    if (tags && tags.length > 0) {
      const hasRequiredTag = tags.some(t => node.pose.feature.tags.includes(t));
      if (!hasRequiredTag) {
        this.searchNearest(node.left, query, k, results, tags);
        this.searchNearest(node.right, query, k, results, tags);
        return;
      }
    }
    const distance = this.euclideanDistance(query, node.featureVector);
    if (results.length < k) {
      results.push({ node, distance });
      results.sort((a, b) => a.distance - b.distance);
    } else if (distance < results[results.length - 1].distance) {
      results[results.length - 1] = { node, distance };
      results.sort((a, b) => a.distance - b.distance);
    }
    const axis = node.splitAxis;
    const diff = query[axis] - node.featureVector[axis];
    const first = diff < 0 ? node.left : node.right;
    const second = diff < 0 ? node.right : node.left;
    this.searchNearest(first, query, k, results, tags);
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
    let poseCost = 0;
    for (let i = 0; i < 27; i++) {
      poseCost += (query[i] - target[i]) ** 2;
    }
    let velocityCost = 0;
    for (let i = 27; i < 37; i++) {
      velocityCost += (query[i] - target[i]) ** 2;
    }
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
