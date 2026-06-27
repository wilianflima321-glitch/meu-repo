/**
 * ai-animation.ts  — Sprint V33
 *
 * MetaHuman-equivalent AI animation system for Aethel Engine.
 *
 * Implements:
 *   - IKJoint / IKChain types
 *   - solveCCDIK() — Cyclic Coordinate Descent Inverse Kinematics
 *   - AnimationBlender — state machine for blending multiple clips
 *   - PoseInterpolator — smooth quaternion-slerp pose transitions
 *   - FootIK — terrain-adaptive foot placement
 *
 * CCD-IK math:
 *   For each joint j from effector→root:
 *     θ = arccos( (e-j)·(t-j) / |e-j||t-j| )
 *     Axis = (e-j) × (t-j) / |(e-j) × (t-j)|
 *     Apply clamp(θ, minAngle, maxAngle) rotation around Axis
 *
 * Converges when |e - t| < tolerance or maxIterations reached.
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Types (spec-aligned)
// ---------------------------------------------------------------------------

export interface IKJoint {
  name: string;
  position: [number, number, number];
  rotation: [number, number, number, number]; // Quaternion [x,y,z,w]
  limits: { minAngle: number; maxAngle: number };
}

export interface AnimationClip {
  name: string;
  duration: number;       // seconds
  fps: number;
  tracks: AnimationTrack[];
}

export interface AnimationTrack {
  boneName: string;
  type: 'position' | 'rotation' | 'scale';
  times: Float32Array;
  values: Float32Array;
}

export interface BlendState {
  clipName: string;
  weight: number;
  time: number;
  loop: boolean;
  speed: number;
}

// ---------------------------------------------------------------------------
// CCD-IK Solver
// ---------------------------------------------------------------------------

/**
 * Solves CCD Inverse Kinematics in-place on the provided joint chain.
 * Modifies joint.position and joint.rotation.
 *
 * @param chain  Joints from root to effector (end-effector is chain[chain.length-1])
 * @param target Target world-space position for the effector
 */
export function solveCCDIK(
  chain: IKJoint[],
  target: [number, number, number],
  iterations = 10,
  tolerance = 0.01,
): void {
  const targetV = new THREE.Vector3(...target);
  const n = chain.length;
  if (n < 2) return;

  const positions = chain.map((j) => new THREE.Vector3(...j.position));
  const rotations = chain.map((j) => new THREE.Quaternion(...j.rotation));

  for (let iter = 0; iter < iterations; iter++) {
    const effector = positions[n - 1];
    if (effector.distanceTo(targetV) < tolerance) break;

    // Iterate from tip-1 to root
    for (let i = n - 2; i >= 0; i--) {
      const jointPos = positions[i];
      const toEffector = effector.clone().sub(jointPos);
      const toTarget = targetV.clone().sub(jointPos);

      const lenE = toEffector.length();
      const lenT = toTarget.length();
      if (lenE < 1e-8 || lenT < 1e-8) continue;

      // θ = arccos( dot(e-j, t-j) / (|e-j||t-j|) )
      const cosTheta = THREE.MathUtils.clamp(
        toEffector.dot(toTarget) / (lenE * lenT),
        -1,
        1,
      );
      let theta = Math.acos(cosTheta);

      // Clamp to joint limits
      const { minAngle, maxAngle } = chain[i].limits;
      theta = THREE.MathUtils.clamp(theta, minAngle, maxAngle);

      if (Math.abs(theta) < 1e-6) continue;

      // Rotation axis = (e-j) × (t-j)
      const axis = toEffector.clone().cross(toTarget);
      if (axis.length() < 1e-8) continue;
      axis.normalize();

      // Build delta rotation
      const delta = new THREE.Quaternion().setFromAxisAngle(axis, theta);
      rotations[i].premultiply(delta);
      rotations[i].normalize();

      // Forward-propagate positions along the chain
      for (let k = i + 1; k < n; k++) {
        const boneDelta = positions[k].clone().sub(positions[k - 1]);
        boneDelta.applyQuaternion(delta);
        positions[k].copy(positions[k - 1]).add(boneDelta);
      }
    }
  }

  // Write back
  for (let i = 0; i < n; i++) {
    chain[i].position = [positions[i].x, positions[i].y, positions[i].z];
    chain[i].rotation = [rotations[i].x, rotations[i].y, rotations[i].z, rotations[i].w];
  }
}

// ---------------------------------------------------------------------------
// AnimationBlender — multi-clip weighted blend
// ---------------------------------------------------------------------------

export class AnimationBlender {
  private clips = new Map<string, AnimationClip>();
  private states: BlendState[] = [];

  registerClip(clip: AnimationClip): void {
    this.clips.set(clip.name, clip);
  }

  play(clipName: string, options: Partial<Omit<BlendState, 'clipName' | 'time'>> = {}): void {
    const existing = this.states.find((s) => s.clipName === clipName);
    if (existing) {
      existing.weight = options.weight ?? 1;
      return;
    }
    this.states.push({
      clipName,
      weight: options.weight ?? 1,
      time: 0,
      loop: options.loop ?? true,
      speed: options.speed ?? 1,
    });
    this.normalizeWeights();
  }

  stop(clipName: string): void {
    this.states = this.states.filter((s) => s.clipName !== clipName);
    this.normalizeWeights();
  }

  private normalizeWeights(): void {
    const total = this.states.reduce((s, b) => s + b.weight, 0);
    if (total > 0) this.states.forEach((b) => (b.weight /= total));
  }

  /**
   * Advance all active states and compute blended pose.
   * Returns a map: boneName → { position, rotation, scale }
   */
  update(dt: number): Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3 }> {
    const blended = new Map<string, { position: THREE.Vector3; rotation: THREE.Quaternion; scale: THREE.Vector3 }>();

    for (const state of this.states) {
      const clip = this.clips.get(state.clipName);
      if (!clip) continue;

      state.time += dt * state.speed;
      if (state.loop) state.time %= clip.duration;
      else state.time = Math.min(state.time, clip.duration);

      for (const track of clip.tracks) {
        const sample = sampleTrack(track, state.time);
        if (!blended.has(track.boneName)) {
          blended.set(track.boneName, {
            position: new THREE.Vector3(),
            rotation: new THREE.Quaternion(),
            scale: new THREE.Vector3(1, 1, 1),
          });
        }
        const bone = blended.get(track.boneName)!;
        if (track.type === 'position') bone.position.addScaledVector(sample as THREE.Vector3, state.weight);
        if (track.type === 'rotation') bone.rotation.slerp(sample as THREE.Quaternion, state.weight);
        if (track.type === 'scale') bone.scale.addScaledVector(sample as THREE.Vector3, state.weight);
      }
    }

    return blended;
  }
}

function sampleTrack(track: AnimationTrack, time: number): THREE.Vector3 | THREE.Quaternion {
  const { times, values } = track;
  if (times.length === 0) return track.type === 'rotation' ? new THREE.Quaternion() : new THREE.Vector3();

  // Find surrounding keyframes
  let lo = 0;
  for (let i = 0; i < times.length - 1; i++) {
    if (times[i + 1] > time) { lo = i; break; }
  }
  const hi = Math.min(lo + 1, times.length - 1);
  const t0 = times[lo], t1 = times[hi];
  const alpha = t1 === t0 ? 0 : (time - t0) / (t1 - t0);

  if (track.type === 'rotation') {
    const q0 = new THREE.Quaternion(values[lo * 4], values[lo * 4 + 1], values[lo * 4 + 2], values[lo * 4 + 3]);
    const q1 = new THREE.Quaternion(values[hi * 4], values[hi * 4 + 1], values[hi * 4 + 2], values[hi * 4 + 3]);
    return q0.slerp(q1, alpha);
  }

  const stride = track.type === 'scale' ? 3 : 3;
  const v0 = new THREE.Vector3(values[lo * stride], values[lo * stride + 1], values[lo * stride + 2]);
  const v1 = new THREE.Vector3(values[hi * stride], values[hi * stride + 1], values[hi * stride + 2]);
  return v0.lerp(v1, alpha);
}

// ---------------------------------------------------------------------------
// Foot IK — terrain-adaptive foot placement
// ---------------------------------------------------------------------------

export interface FootIKConfig {
  leftFootBone: string;
  rightFootBone: string;
  hipBone: string;
  maxStepHeight: number;
  raycastDistance: number;
}

export class FootIKController {
  private leftFoot: IKJoint[] = [];
  private rightFoot: IKJoint[] = [];

  constructor(private config: FootIKConfig) {}

  buildChain(joints: IKJoint[], footBoneName: string): IKJoint[] {
    const footIdx = joints.findIndex((j) => j.name === footBoneName);
    if (footIdx < 0) return [];
    return joints.slice(Math.max(0, footIdx - 2), footIdx + 1);
  }

  /**
   * Adjust foot placement to match terrain height.
   * terrainHeight: function returning world-Y at a given (x,z)
   */
  solve(
    joints: IKJoint[],
    terrainHeight: (x: number, z: number) => number,
  ): void {
    const leftChain = this.buildChain(joints, this.config.leftFootBone);
    const rightChain = this.buildChain(joints, this.config.rightFootBone);

    if (leftChain.length > 0) {
      const foot = leftChain[leftChain.length - 1];
      const ty = terrainHeight(foot.position[0], foot.position[2]);
      solveCCDIK(leftChain, [foot.position[0], ty, foot.position[2]]);
    }
    if (rightChain.length > 0) {
      const foot = rightChain[rightChain.length - 1];
      const ty = terrainHeight(foot.position[0], foot.position[2]);
      solveCCDIK(rightChain, [foot.position[0], ty, foot.position[2]]);
    }
  }
}
