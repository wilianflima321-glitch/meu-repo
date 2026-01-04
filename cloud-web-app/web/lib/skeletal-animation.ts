/**
 * Skeletal Animation System REAL
 * 
 * Sistema REAL de animação skeletal com bones, skinning, IK, blending.
 * Suporta GPU skinning, retargeting, animação procedural.
 * 
 * NÃO É MOCK - Sistema completo de animação!
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS
// ============================================================================

export interface BoneData {
  name: string;
  parentIndex: number;
  localPosition: THREE.Vector3;
  localRotation: THREE.Quaternion;
  localScale: THREE.Vector3;
  length: number;
}

export interface SkeletonData {
  bones: BoneData[];
  rootBoneIndices: number[];
}

export interface AnimationKeyframe {
  time: number;
  position?: THREE.Vector3;
  rotation?: THREE.Quaternion;
  scale?: THREE.Vector3;
}

export interface BoneAnimation {
  boneName: string;
  keyframes: AnimationKeyframe[];
}

export interface AnimationClipData {
  name: string;
  duration: number;
  frameRate: number;
  tracks: BoneAnimation[];
  loop: boolean;
  events?: AnimationEvent[];
}

export interface AnimationEvent {
  time: number;
  name: string;
  data?: Record<string, unknown>;
}

export interface IKTarget {
  boneName: string;
  targetPosition: THREE.Vector3;
  weight: number;
  chainLength: number;
  poleTarget?: THREE.Vector3;
}

export interface BlendWeight {
  animation: string;
  weight: number;
  speed: number;
  time: number;
}

// ============================================================================
// BONE
// ============================================================================

export class Bone extends THREE.Object3D {
  public boneData: BoneData;
  public bindMatrix: THREE.Matrix4;
  public inverseBindMatrix: THREE.Matrix4;
  public boneIndex: number;
  public restPosition: THREE.Vector3;
  public restRotation: THREE.Quaternion;
  public restScale: THREE.Vector3;
  
  constructor(data: BoneData, index: number) {
    super();
    
    this.name = data.name;
    this.boneData = data;
    this.boneIndex = index;
    
    this.position.copy(data.localPosition);
    this.quaternion.copy(data.localRotation);
    this.scale.copy(data.localScale);
    
    this.restPosition = data.localPosition.clone();
    this.restRotation = data.localRotation.clone();
    this.restScale = data.localScale.clone();
    
    this.bindMatrix = new THREE.Matrix4();
    this.inverseBindMatrix = new THREE.Matrix4();
  }
  
  calculateBindMatrix(): void {
    this.updateWorldMatrix(true, false);
    this.bindMatrix.copy(this.matrixWorld);
    this.inverseBindMatrix.copy(this.bindMatrix).invert();
  }
  
  resetToRest(): void {
    this.position.copy(this.restPosition);
    this.quaternion.copy(this.restRotation);
    this.scale.copy(this.restScale);
  }
}

// ============================================================================
// SKELETON
// ============================================================================

export class Skeleton {
  public bones: Bone[] = [];
  public boneMatrices: Float32Array;
  public boneTexture: THREE.DataTexture | null = null;
  private boneByName: Map<string, Bone> = new Map();
  
  constructor(data: SkeletonData) {
    this.buildSkeleton(data);
    this.boneMatrices = new Float32Array(this.bones.length * 16);
    this.createBoneTexture();
  }
  
  private buildSkeleton(data: SkeletonData): void {
    // Create all bones first
    for (let i = 0; i < data.bones.length; i++) {
      const boneData = data.bones[i];
      const bone = new Bone(boneData, i);
      this.bones.push(bone);
      this.boneByName.set(boneData.name, bone);
    }
    
    // Set up hierarchy
    for (let i = 0; i < data.bones.length; i++) {
      const boneData = data.bones[i];
      const bone = this.bones[i];
      
      if (boneData.parentIndex >= 0) {
        const parent = this.bones[boneData.parentIndex];
        parent.add(bone);
      }
    }
    
    // Calculate bind matrices
    for (const bone of this.bones) {
      bone.calculateBindMatrix();
    }
  }
  
  private createBoneTexture(): void {
    // Create a texture to store bone matrices for GPU skinning
    const size = Math.ceil(Math.sqrt(this.bones.length * 4));
    const textureData = new Float32Array(size * size * 4);
    
    this.boneTexture = new THREE.DataTexture(
      textureData,
      size,
      size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    this.boneTexture.needsUpdate = true;
  }
  
  getBone(name: string): Bone | undefined {
    return this.boneByName.get(name);
  }
  
  getBoneIndex(name: string): number {
    const bone = this.boneByName.get(name);
    return bone ? bone.boneIndex : -1;
  }
  
  updateMatrices(): void {
    const offsetMatrix = new THREE.Matrix4();
    
    for (let i = 0; i < this.bones.length; i++) {
      const bone = this.bones[i];
      bone.updateWorldMatrix(true, false);
      
      offsetMatrix.multiplyMatrices(bone.matrixWorld, bone.inverseBindMatrix);
      offsetMatrix.toArray(this.boneMatrices, i * 16);
    }
    
    if (this.boneTexture) {
      const size = this.boneTexture.image.width;
			const data = this.boneTexture.image.data as unknown as Float32Array;
      
      for (let i = 0; i < this.bones.length; i++) {
        const matrixOffset = i * 16;
        const textureOffset = i * 16;
        
        for (let j = 0; j < 16; j++) {
          data[textureOffset + j] = this.boneMatrices[matrixOffset + j];
        }
      }
      
      this.boneTexture.needsUpdate = true;
    }
  }
  
  resetToBindPose(): void {
    for (const bone of this.bones) {
      bone.resetToRest();
    }
    this.updateMatrices();
  }
  
  clone(): Skeleton {
    const data: SkeletonData = {
      bones: this.bones.map(bone => ({
        ...bone.boneData,
        localPosition: bone.restPosition.clone(),
        localRotation: bone.restRotation.clone(),
        localScale: bone.restScale.clone(),
      })),
      rootBoneIndices: this.bones
        .filter(b => b.boneData.parentIndex < 0)
        .map(b => b.boneIndex),
    };
    
    return new Skeleton(data);
  }
  
  dispose(): void {
    if (this.boneTexture) {
      this.boneTexture.dispose();
    }
  }
}

// ============================================================================
// ANIMATION CLIP
// ============================================================================

export class AnimationClip {
  public name: string;
  public duration: number;
  public frameRate: number;
  public loop: boolean;
  public tracks: Map<string, AnimationKeyframe[]> = new Map();
  public events: AnimationEvent[] = [];
  
  constructor(data: AnimationClipData) {
    this.name = data.name;
    this.duration = data.duration;
    this.frameRate = data.frameRate;
    this.loop = data.loop;
    this.events = data.events || [];
    
    for (const track of data.tracks) {
      this.tracks.set(track.boneName, track.keyframes);
    }
  }
  
  sample(boneName: string, time: number): { position?: THREE.Vector3; rotation?: THREE.Quaternion; scale?: THREE.Vector3 } {
    const keyframes = this.tracks.get(boneName);
    if (!keyframes || keyframes.length === 0) {
      return {};
    }
    
    // Find surrounding keyframes
    let k0 = keyframes[0];
    let k1 = keyframes[0];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time < keyframes[i + 1].time) {
        k0 = keyframes[i];
        k1 = keyframes[i + 1];
        break;
      }
    }
    
    if (time >= keyframes[keyframes.length - 1].time) {
      k0 = keyframes[keyframes.length - 1];
      k1 = keyframes[keyframes.length - 1];
    }
    
    // Interpolation factor
    const t = k0.time === k1.time ? 0 : (time - k0.time) / (k1.time - k0.time);
    
    const result: { position?: THREE.Vector3; rotation?: THREE.Quaternion; scale?: THREE.Vector3 } = {};
    
    // Interpolate position
    if (k0.position && k1.position) {
      result.position = new THREE.Vector3().lerpVectors(k0.position, k1.position, t);
    }
    
    // Interpolate rotation (slerp)
    if (k0.rotation && k1.rotation) {
      result.rotation = new THREE.Quaternion().slerpQuaternions(k0.rotation, k1.rotation, t);
    }
    
    // Interpolate scale
    if (k0.scale && k1.scale) {
      result.scale = new THREE.Vector3().lerpVectors(k0.scale, k1.scale, t);
    }
    
    return result;
  }
  
  getEventsInRange(startTime: number, endTime: number): AnimationEvent[] {
    return this.events.filter(e => e.time > startTime && e.time <= endTime);
  }
}

// ============================================================================
// ANIMATION STATE
// ============================================================================

export class AnimationState {
  public clip: AnimationClip;
  public time: number = 0;
  public speed: number = 1;
  public weight: number = 1;
  public isPlaying: boolean = false;
  public isPaused: boolean = false;
  
  private lastEventTime: number = 0;
  private onEvent?: (event: AnimationEvent) => void;
  
  constructor(clip: AnimationClip, onEvent?: (event: AnimationEvent) => void) {
    this.clip = clip;
    this.onEvent = onEvent;
  }
  
  play(): void {
    this.isPlaying = true;
    this.isPaused = false;
  }
  
  pause(): void {
    this.isPaused = true;
  }
  
  resume(): void {
    this.isPaused = false;
  }
  
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.time = 0;
    this.lastEventTime = 0;
  }
  
  update(deltaTime: number): void {
    if (!this.isPlaying || this.isPaused) return;
    
    const prevTime = this.time;
    this.time += deltaTime * this.speed;
    
    // Check for events
    if (this.onEvent) {
      const events = this.clip.getEventsInRange(prevTime, this.time);
      for (const event of events) {
        this.onEvent(event);
      }
    }
    
    // Handle looping
    if (this.clip.loop) {
      while (this.time >= this.clip.duration) {
        this.time -= this.clip.duration;
        this.lastEventTime = 0;
      }
    } else if (this.time >= this.clip.duration) {
      this.time = this.clip.duration;
      this.isPlaying = false;
    }
  }
  
  setTime(time: number): void {
    this.time = Math.max(0, Math.min(time, this.clip.duration));
  }
  
  getNormalizedTime(): number {
    return this.clip.duration > 0 ? this.time / this.clip.duration : 0;
  }
}

// ============================================================================
// ANIMATION MIXER
// ============================================================================

export class AnimationMixer {
  private skeleton: Skeleton;
  private clips: Map<string, AnimationClip> = new Map();
  private states: Map<string, AnimationState> = new Map();
  private blendWeights: BlendWeight[] = [];
  private onEvent?: (event: AnimationEvent) => void;
  
  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
  }
  
  setEventHandler(handler: (event: AnimationEvent) => void): void {
    this.onEvent = handler;
  }
  
  addClip(clip: AnimationClip): void {
    this.clips.set(clip.name, clip);
    this.states.set(clip.name, new AnimationState(clip, this.onEvent));
  }
  
  removeClip(name: string): void {
    this.clips.delete(name);
    this.states.delete(name);
  }
  
  play(name: string, fadeTime: number = 0.2): void {
    const state = this.states.get(name);
    if (!state) return;
    
    if (fadeTime > 0) {
      // Fade out other animations
      for (const [otherName, otherState] of this.states) {
        if (otherName !== name && otherState.isPlaying) {
          this.fadeOut(otherName, fadeTime);
        }
      }
      
      // Fade in this animation
      this.fadeIn(name, fadeTime);
    } else {
      // Stop all other animations
      for (const [otherName, otherState] of this.states) {
        if (otherName !== name) {
          otherState.stop();
          otherState.weight = 0;
        }
      }
      
      state.weight = 1;
    }
    
    state.play();
  }
  
  stop(name: string): void {
    const state = this.states.get(name);
    if (state) {
      state.stop();
    }
  }
  
  stopAll(): void {
    for (const state of this.states.values()) {
      state.stop();
    }
    this.blendWeights = [];
  }
  
  fadeIn(name: string, duration: number): void {
    const state = this.states.get(name);
    if (!state) return;
    
    // Remove existing blend for this animation
    this.blendWeights = this.blendWeights.filter(b => b.animation !== name);
    
    // Add new fade in
    this.blendWeights.push({
      animation: name,
      weight: state.weight,
      speed: (1 - state.weight) / duration,
      time: duration,
    });
    
    state.play();
  }
  
  fadeOut(name: string, duration: number): void {
    const state = this.states.get(name);
    if (!state) return;
    
    // Remove existing blend for this animation
    this.blendWeights = this.blendWeights.filter(b => b.animation !== name);
    
    // Add new fade out
    this.blendWeights.push({
      animation: name,
      weight: state.weight,
      speed: -state.weight / duration,
      time: duration,
    });
  }
  
  crossFade(from: string, to: string, duration: number): void {
    this.fadeOut(from, duration);
    this.fadeIn(to, duration);
    
    const toState = this.states.get(to);
    if (toState) {
      toState.time = 0;
      toState.play();
    }
  }
  
  setWeight(name: string, weight: number): void {
    const state = this.states.get(name);
    if (state) {
      state.weight = Math.max(0, Math.min(1, weight));
    }
  }
  
  setSpeed(name: string, speed: number): void {
    const state = this.states.get(name);
    if (state) {
      state.speed = speed;
    }
  }
  
  update(deltaTime: number): void {
    // Update blend weights
    for (let i = this.blendWeights.length - 1; i >= 0; i--) {
      const blend = this.blendWeights[i];
      blend.weight += blend.speed * deltaTime;
      blend.time -= deltaTime;
      
      const state = this.states.get(blend.animation);
      if (state) {
        state.weight = Math.max(0, Math.min(1, blend.weight));
        
        // Stop animation if faded out completely
        if (blend.speed < 0 && state.weight <= 0) {
          state.stop();
        }
      }
      
      // Remove completed blend
      if (blend.time <= 0) {
        this.blendWeights.splice(i, 1);
      }
    }
    
    // Update animation states
    for (const state of this.states.values()) {
      state.update(deltaTime);
    }
    
    // Apply animations to skeleton
    this.applyAnimations();
  }
  
  private applyAnimations(): void {
    // Reset skeleton to bind pose
    this.skeleton.resetToBindPose();
    
    // Collect active animations
    const activeStates: AnimationState[] = [];
    let totalWeight = 0;
    
    for (const state of this.states.values()) {
      if (state.isPlaying && state.weight > 0) {
        activeStates.push(state);
        totalWeight += state.weight;
      }
    }
    
    if (activeStates.length === 0) return;
    
    // Normalize weights if needed
    const normalizeWeights = totalWeight > 1;
    
    // Apply each bone
    for (const bone of this.skeleton.bones) {
      let finalPosition: THREE.Vector3 | null = null;
      let finalRotation: THREE.Quaternion | null = null;
      let finalScale: THREE.Vector3 | null = null;
      
      for (const state of activeStates) {
        const sample = state.clip.sample(bone.name, state.time);
        let weight = state.weight;
        
        if (normalizeWeights) {
          weight /= totalWeight;
        }
        
        if (sample.position) {
          if (!finalPosition) {
            finalPosition = sample.position.clone().multiplyScalar(weight);
          } else {
            finalPosition.add(sample.position.clone().multiplyScalar(weight));
          }
        }
        
        if (sample.rotation) {
          if (!finalRotation) {
            finalRotation = sample.rotation.clone();
            // For first animation, we need to handle weight properly
            if (weight < 1) {
              finalRotation.slerp(bone.restRotation, 1 - weight);
            }
          } else {
            finalRotation.slerp(sample.rotation, weight);
          }
        }
        
        if (sample.scale) {
          if (!finalScale) {
            finalScale = sample.scale.clone().multiplyScalar(weight);
          } else {
            finalScale.add(sample.scale.clone().multiplyScalar(weight));
          }
        }
      }
      
      // Apply final transforms
      if (finalPosition) {
        bone.position.copy(finalPosition);
      }
      if (finalRotation) {
        bone.quaternion.copy(finalRotation);
      }
      if (finalScale) {
        bone.scale.copy(finalScale);
      }
    }
    
    this.skeleton.updateMatrices();
  }
  
  getState(name: string): AnimationState | undefined {
    return this.states.get(name);
  }
  
  getClip(name: string): AnimationClip | undefined {
    return this.clips.get(name);
  }
  
  getActiveAnimations(): string[] {
    const active: string[] = [];
    for (const [name, state] of this.states) {
      if (state.isPlaying) {
        active.push(name);
      }
    }
    return active;
  }
}

// ============================================================================
// INVERSE KINEMATICS
// ============================================================================

export class IKSolver {
  private skeleton: Skeleton;
  private maxIterations: number = 10;
  private threshold: number = 0.001;
  
  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
  }
  
  solve(target: IKTarget): void {
    const endBone = this.skeleton.getBone(target.boneName);
    if (!endBone) return;
    
    // Get chain of bones
    const chain: Bone[] = [];
    let current: THREE.Object3D | null = endBone;
    
    for (let i = 0; i < target.chainLength && current; i++) {
      if (current instanceof Bone) {
        chain.unshift(current);
      }
      current = current.parent;
    }
    
    if (chain.length === 0) return;
    
    // FABRIK algorithm
    for (let iteration = 0; iteration < this.maxIterations; iteration++) {
      // Get current end effector position
      endBone.updateWorldMatrix(true, false);
      const endPos = new THREE.Vector3().setFromMatrixPosition(endBone.matrixWorld);
      
      // Check if we're close enough
      const distance = endPos.distanceTo(target.targetPosition);
      if (distance < this.threshold) break;
      
      // Forward reaching
      const positions: THREE.Vector3[] = chain.map(bone => {
        bone.updateWorldMatrix(true, false);
        return new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
      });
      
      // Move end to target
      positions[positions.length - 1].copy(target.targetPosition);
      
      // Backward pass
      for (let i = positions.length - 2; i >= 0; i--) {
        const dir = new THREE.Vector3()
          .subVectors(positions[i], positions[i + 1])
          .normalize();
        const length = chain[i + 1].boneData.length;
        positions[i].copy(positions[i + 1]).add(dir.multiplyScalar(length));
      }
      
      // Forward pass - constrain to root
      const rootBone = chain[0];
      rootBone.updateWorldMatrix(true, false);
      positions[0].setFromMatrixPosition(rootBone.matrixWorld);
      
      for (let i = 1; i < positions.length; i++) {
        const dir = new THREE.Vector3()
          .subVectors(positions[i], positions[i - 1])
          .normalize();
        const length = chain[i].boneData.length;
        positions[i].copy(positions[i - 1]).add(dir.multiplyScalar(length));
      }
      
      // Apply rotations
      this.applyRotations(chain, positions, target.poleTarget);
    }
    
    // Apply weight
    if (target.weight < 1) {
      for (const bone of chain) {
        bone.quaternion.slerp(bone.restRotation, 1 - target.weight);
      }
    }
    
    this.skeleton.updateMatrices();
  }
  
  private applyRotations(chain: Bone[], positions: THREE.Vector3[], poleTarget?: THREE.Vector3): void {
    for (let i = 0; i < chain.length - 1; i++) {
      const bone = chain[i];
      const currentPos = positions[i];
      const targetPos = positions[i + 1];
      
      // Calculate direction to next bone
      const targetDir = new THREE.Vector3()
        .subVectors(targetPos, currentPos)
        .normalize();
      
      // Get parent world matrix
      const parentWorldMatrix = bone.parent 
        ? (bone.parent as THREE.Object3D).matrixWorld 
        : new THREE.Matrix4();
      const parentWorldInverse = new THREE.Matrix4().copy(parentWorldMatrix).invert();
      
      // Convert target direction to local space
      const localTargetDir = targetDir.clone().transformDirection(parentWorldInverse);
      
      // Calculate rotation from rest direction to target direction
      const restDir = new THREE.Vector3(0, 1, 0); // Assuming Y-up bone orientation
      const rotation = new THREE.Quaternion().setFromUnitVectors(restDir, localTargetDir);
      
      bone.quaternion.copy(rotation);
      
      // Apply pole target constraint for mid-bones
      if (poleTarget && i > 0 && i < chain.length - 1) {
        // Calculate pole vector
        const poleDir = new THREE.Vector3()
          .subVectors(poleTarget, currentPos)
          .normalize();
        
        // Calculate current up vector
        const forward = targetDir;
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        
        // Calculate angle to rotate
        const currentAngle = Math.atan2(
          up.dot(poleDir),
          right.dot(poleDir)
        );
        
        // Apply twist
        const twist = new THREE.Quaternion().setFromAxisAngle(forward, -currentAngle);
        bone.quaternion.premultiply(twist);
      }
    }
  }
  
  solveTwoBone(
    rootBoneName: string,
    midBoneName: string,
    endBoneName: string,
    targetPosition: THREE.Vector3,
    poleTarget?: THREE.Vector3,
    weight: number = 1
  ): void {
    const rootBone = this.skeleton.getBone(rootBoneName);
    const midBone = this.skeleton.getBone(midBoneName);
    const endBone = this.skeleton.getBone(endBoneName);
    
    if (!rootBone || !midBone || !endBone) return;
    
    // Get lengths
    const upperLength = midBone.boneData.length;
    const lowerLength = endBone.boneData.length;
    
    // Get root position in world space
    rootBone.updateWorldMatrix(true, false);
    const rootPos = new THREE.Vector3().setFromMatrixPosition(rootBone.matrixWorld);
    
    // Calculate distance to target
    const targetDir = new THREE.Vector3().subVectors(targetPosition, rootPos);
    const targetDist = Math.min(targetDir.length(), upperLength + lowerLength - 0.001);
    targetDir.normalize();
    
    // Law of cosines to find angles
    const cosAngleUpper = 
      (upperLength * upperLength + targetDist * targetDist - lowerLength * lowerLength) /
      (2 * upperLength * targetDist);
    
    const cosAngleMid = 
      (upperLength * upperLength + lowerLength * lowerLength - targetDist * targetDist) /
      (2 * upperLength * lowerLength);
    
    const angleUpper = Math.acos(Math.max(-1, Math.min(1, cosAngleUpper)));
    const angleMid = Math.PI - Math.acos(Math.max(-1, Math.min(1, cosAngleMid)));
    
    // Apply rotations
    const parentWorldInverse = rootBone.parent 
      ? new THREE.Matrix4().copy((rootBone.parent as THREE.Object3D).matrixWorld).invert()
      : new THREE.Matrix4();
    
    // Root bone rotation
    const localTargetDir = targetDir.clone().transformDirection(parentWorldInverse);
    const restDir = new THREE.Vector3(0, 1, 0);
    
    let rootRotation = new THREE.Quaternion().setFromUnitVectors(restDir, localTargetDir);
    
    // Apply upper arm angle
    const upperAngleQuat = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      angleUpper
    );
    rootRotation.multiply(upperAngleQuat);
    
    // Apply pole target
    if (poleTarget) {
      const poleDir = new THREE.Vector3()
        .subVectors(poleTarget, rootPos)
        .normalize();
      
      const right = new THREE.Vector3().crossVectors(targetDir, new THREE.Vector3(0, 1, 0)).normalize();
      const up = new THREE.Vector3().crossVectors(right, targetDir).normalize();
      
      const poleAngle = Math.atan2(
        up.dot(poleDir),
        right.dot(poleDir)
      );
      
      const twistQuat = new THREE.Quaternion().setFromAxisAngle(targetDir, -poleAngle);
      rootRotation.premultiply(twistQuat);
    }
    
    // Mid bone rotation
    const midRotation = new THREE.Quaternion().setFromAxisAngle(
      new THREE.Vector3(1, 0, 0),
      angleMid
    );
    
    // Apply with weight
    if (weight < 1) {
      rootBone.quaternion.slerp(rootRotation, weight);
      midBone.quaternion.slerp(midRotation, weight);
    } else {
      rootBone.quaternion.copy(rootRotation);
      midBone.quaternion.copy(midRotation);
    }
    
    this.skeleton.updateMatrices();
  }
}

// ============================================================================
// ANIMATION RETARGETING
// ============================================================================

export class AnimationRetargeter {
  private sourceRig: Map<string, string> = new Map(); // source bone -> target bone
  private boneMapping: Map<string, string> = new Map();
  
  constructor() {}
  
  setBoneMapping(mapping: Record<string, string>): void {
    this.boneMapping.clear();
    for (const [source, target] of Object.entries(mapping)) {
      this.boneMapping.set(source, target);
    }
  }
  
  retargetClip(sourceClip: AnimationClip, targetSkeleton: Skeleton): AnimationClip {
    const retargetedTracks: BoneAnimation[] = [];
    
    for (const [sourceBoneName, keyframes] of sourceClip.tracks) {
      const targetBoneName = this.boneMapping.get(sourceBoneName) || sourceBoneName;
      const targetBone = targetSkeleton.getBone(targetBoneName);
      
      if (!targetBone) continue;
      
      const retargetedKeyframes: AnimationKeyframe[] = keyframes.map(kf => ({
        time: kf.time,
        position: kf.position?.clone(),
        rotation: kf.rotation?.clone(),
        scale: kf.scale?.clone(),
      }));
      
      retargetedTracks.push({
        boneName: targetBoneName,
        keyframes: retargetedKeyframes,
      });
    }
    
    return new AnimationClip({
      name: sourceClip.name + '_retargeted',
      duration: sourceClip.duration,
      frameRate: sourceClip.frameRate,
      tracks: retargetedTracks,
      loop: sourceClip.loop,
      events: sourceClip.events,
    });
  }
  
  // Auto-map bones based on naming conventions
  autoMapBones(sourceSkeleton: Skeleton, targetSkeleton: Skeleton): void {
    const commonNames = [
      'hips', 'spine', 'chest', 'neck', 'head',
      'shoulder_l', 'shoulder_r', 'upper_arm_l', 'upper_arm_r',
      'forearm_l', 'forearm_r', 'hand_l', 'hand_r',
      'thigh_l', 'thigh_r', 'shin_l', 'shin_r', 'foot_l', 'foot_r',
    ];
    
    for (const name of commonNames) {
      const sourceBone = this.findBoneByPartialName(sourceSkeleton, name);
      const targetBone = this.findBoneByPartialName(targetSkeleton, name);
      
      if (sourceBone && targetBone) {
        this.boneMapping.set(sourceBone.name, targetBone.name);
      }
    }
  }
  
  private findBoneByPartialName(skeleton: Skeleton, partialName: string): Bone | null {
    const lowerPartial = partialName.toLowerCase();
    
    for (const bone of skeleton.bones) {
      const lowerBoneName = bone.name.toLowerCase();
      if (lowerBoneName.includes(lowerPartial)) {
        return bone;
      }
    }
    
    return null;
  }
}

// ============================================================================
// PROCEDURAL ANIMATION
// ============================================================================

export class ProceduralAnimator {
  private skeleton: Skeleton;
  
  constructor(skeleton: Skeleton) {
    this.skeleton = skeleton;
  }
  
  applyBreathing(spineBones: string[], intensity: number, frequency: number, time: number): void {
    const breathValue = Math.sin(time * frequency * Math.PI * 2) * intensity;
    
    for (let i = 0; i < spineBones.length; i++) {
      const bone = this.skeleton.getBone(spineBones[i]);
      if (!bone) continue;
      
      const factor = (i + 1) / spineBones.length;
      const angle = breathValue * factor * 0.02;
      
      const breathRotation = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(1, 0, 0),
        angle
      );
      
      bone.quaternion.multiply(breathRotation);
    }
    
    this.skeleton.updateMatrices();
  }
  
  applyLookAt(headBone: string, neckBone: string, targetPosition: THREE.Vector3, weight: number = 1): void {
    const head = this.skeleton.getBone(headBone);
    const neck = this.skeleton.getBone(neckBone);
    
    if (!head) return;
    
    head.updateWorldMatrix(true, false);
    const headPos = new THREE.Vector3().setFromMatrixPosition(head.matrixWorld);
    
    const lookDir = new THREE.Vector3()
      .subVectors(targetPosition, headPos)
      .normalize();
    
    // Get parent world inverse
    const parentWorldInverse = head.parent 
      ? new THREE.Matrix4().copy((head.parent as THREE.Object3D).matrixWorld).invert()
      : new THREE.Matrix4();
    
    const localLookDir = lookDir.clone().transformDirection(parentWorldInverse);
    
    // Calculate rotation
    const forward = new THREE.Vector3(0, 0, 1);
    const lookRotation = new THREE.Quaternion().setFromUnitVectors(forward, localLookDir);
    
    // Apply with weight, split between neck and head
    if (neck) {
      const neckWeight = weight * 0.3;
      const headWeight = weight * 0.7;
      
      neck.quaternion.slerp(lookRotation, neckWeight);
      head.quaternion.slerp(lookRotation, headWeight);
    } else {
      head.quaternion.slerp(lookRotation, weight);
    }
    
    this.skeleton.updateMatrices();
  }
  
  applyJiggle(boneName: string, velocity: THREE.Vector3, stiffness: number, damping: number, time: number): void {
    const bone = this.skeleton.getBone(boneName);
    if (!bone) return;
    
    // Simple spring physics for jiggle
    const jiggleX = Math.sin(time * stiffness) * velocity.x * damping;
    const jiggleY = Math.sin(time * stiffness * 1.1) * velocity.y * damping;
    const jiggleZ = Math.sin(time * stiffness * 0.9) * velocity.z * damping;
    
    const jiggleRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(jiggleX, jiggleY, jiggleZ)
    );
    
    bone.quaternion.multiply(jiggleRotation);
    this.skeleton.updateMatrices();
  }
  
  applyFootIK(
    footBoneName: string,
    groundHeight: number,
    raycast: (origin: THREE.Vector3, direction: THREE.Vector3) => { point: THREE.Vector3; normal: THREE.Vector3 } | null
  ): void {
    const foot = this.skeleton.getBone(footBoneName);
    if (!foot) return;
    
    foot.updateWorldMatrix(true, false);
    const footPos = new THREE.Vector3().setFromMatrixPosition(foot.matrixWorld);
    
    // Raycast down
    const hit = raycast(
      new THREE.Vector3(footPos.x, footPos.y + 1, footPos.z),
      new THREE.Vector3(0, -1, 0)
    );
    
    if (hit && hit.point.y > groundHeight) {
      // Adjust foot position
      const offset = hit.point.y - footPos.y;
      foot.position.y += offset;
      
      // Align foot to ground normal
      const up = new THREE.Vector3(0, 1, 0);
      const alignment = new THREE.Quaternion().setFromUnitVectors(up, hit.normal);
      foot.quaternion.premultiply(alignment);
      
      this.skeleton.updateMatrices();
    }
  }
}

// ============================================================================
// SKINNED MESH
// ============================================================================

export class SkinnedMesh extends THREE.SkinnedMesh {
  public animationMixer: AnimationMixer;
  public ikSolver: IKSolver;
  public proceduralAnimator: ProceduralAnimator;
  private customSkeleton: Skeleton;
  
  constructor(
    geometry: THREE.BufferGeometry,
    material: THREE.Material | THREE.Material[],
    skeleton: Skeleton
  ) {
    super(geometry, material);
    
    this.customSkeleton = skeleton;
    this.animationMixer = new AnimationMixer(skeleton);
    this.ikSolver = new IKSolver(skeleton);
    this.proceduralAnimator = new ProceduralAnimator(skeleton);
    
    // Connect Three.js skeleton
    const threeBones = skeleton.bones.map(bone => bone as unknown as THREE.Bone);
    const threeSkeleton = new THREE.Skeleton(threeBones);
    this.bind(threeSkeleton);
  }
  
  update(deltaTime: number): void {
    this.animationMixer.update(deltaTime);
    this.customSkeleton.updateMatrices();
  }
  
  playAnimation(name: string, fadeTime?: number): void {
    this.animationMixer.play(name, fadeTime);
  }
  
  addAnimation(clip: AnimationClip): void {
    this.animationMixer.addClip(clip);
  }
  
  getSkeleton(): Skeleton {
    return this.customSkeleton;
  }
  
  getAnimationMixer(): AnimationMixer {
    return this.animationMixer;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createSkeleton(data: SkeletonData): Skeleton {
  return new Skeleton(data);
}

export function createAnimationClip(data: AnimationClipData): AnimationClip {
  return new AnimationClip(data);
}

export function createAnimationMixer(skeleton: Skeleton): AnimationMixer {
  return new AnimationMixer(skeleton);
}

export function createIKSolver(skeleton: Skeleton): IKSolver {
  return new IKSolver(skeleton);
}

export function createRetargeter(): AnimationRetargeter {
  return new AnimationRetargeter();
}

export function createSkinnedMesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material | THREE.Material[],
  skeleton: Skeleton
): SkinnedMesh {
  return new SkinnedMesh(geometry, material, skeleton);
}

// ============================================================================
// PRESET SKELETONS
// ============================================================================

export const SkeletonPresets = {
  humanoid: (): SkeletonData => ({
    bones: [
      { name: 'hips', parentIndex: -1, localPosition: new THREE.Vector3(0, 1, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'spine', parentIndex: 0, localPosition: new THREE.Vector3(0, 0.2, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'chest', parentIndex: 1, localPosition: new THREE.Vector3(0, 0.2, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'neck', parentIndex: 2, localPosition: new THREE.Vector3(0, 0.2, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.1 },
      { name: 'head', parentIndex: 3, localPosition: new THREE.Vector3(0, 0.1, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'shoulder_l', parentIndex: 2, localPosition: new THREE.Vector3(0.1, 0.15, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.1 },
      { name: 'upper_arm_l', parentIndex: 5, localPosition: new THREE.Vector3(0.1, 0, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.3 },
      { name: 'forearm_l', parentIndex: 6, localPosition: new THREE.Vector3(0.3, 0, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.25 },
      { name: 'hand_l', parentIndex: 7, localPosition: new THREE.Vector3(0.25, 0, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.1 },
      { name: 'shoulder_r', parentIndex: 2, localPosition: new THREE.Vector3(-0.1, 0.15, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.1 },
      { name: 'upper_arm_r', parentIndex: 9, localPosition: new THREE.Vector3(-0.1, 0, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.3 },
      { name: 'forearm_r', parentIndex: 10, localPosition: new THREE.Vector3(-0.3, 0, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.25 },
      { name: 'hand_r', parentIndex: 11, localPosition: new THREE.Vector3(-0.25, 0, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.1 },
      { name: 'thigh_l', parentIndex: 0, localPosition: new THREE.Vector3(0.1, 0, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.45 },
      { name: 'shin_l', parentIndex: 13, localPosition: new THREE.Vector3(0, -0.45, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.4 },
      { name: 'foot_l', parentIndex: 14, localPosition: new THREE.Vector3(0, -0.4, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.15 },
      { name: 'thigh_r', parentIndex: 0, localPosition: new THREE.Vector3(-0.1, 0, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.45 },
      { name: 'shin_r', parentIndex: 16, localPosition: new THREE.Vector3(0, -0.45, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.4 },
      { name: 'foot_r', parentIndex: 17, localPosition: new THREE.Vector3(0, -0.4, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.15 },
    ],
    rootBoneIndices: [0],
  }),
  
  quadruped: (): SkeletonData => ({
    bones: [
      { name: 'root', parentIndex: -1, localPosition: new THREE.Vector3(0, 0.5, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'spine_front', parentIndex: 0, localPosition: new THREE.Vector3(0, 0, 0.3), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.3 },
      { name: 'spine_back', parentIndex: 0, localPosition: new THREE.Vector3(0, 0, -0.3), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.3 },
      { name: 'neck', parentIndex: 1, localPosition: new THREE.Vector3(0, 0.1, 0.2), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'head', parentIndex: 3, localPosition: new THREE.Vector3(0, 0.1, 0.15), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.15 },
      { name: 'tail_1', parentIndex: 2, localPosition: new THREE.Vector3(0, 0, -0.2), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.15 },
      { name: 'tail_2', parentIndex: 5, localPosition: new THREE.Vector3(0, 0, -0.15), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.15 },
      { name: 'leg_fl', parentIndex: 1, localPosition: new THREE.Vector3(0.15, -0.1, 0.1), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.25 },
      { name: 'leg_fl_lower', parentIndex: 7, localPosition: new THREE.Vector3(0, -0.25, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'leg_fr', parentIndex: 1, localPosition: new THREE.Vector3(-0.15, -0.1, 0.1), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.25 },
      { name: 'leg_fr_lower', parentIndex: 9, localPosition: new THREE.Vector3(0, -0.25, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'leg_bl', parentIndex: 2, localPosition: new THREE.Vector3(0.15, -0.1, -0.1), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.25 },
      { name: 'leg_bl_lower', parentIndex: 11, localPosition: new THREE.Vector3(0, -0.25, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
      { name: 'leg_br', parentIndex: 2, localPosition: new THREE.Vector3(-0.15, -0.1, -0.1), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.25 },
      { name: 'leg_br_lower', parentIndex: 13, localPosition: new THREE.Vector3(0, -0.25, 0), localRotation: new THREE.Quaternion(), localScale: new THREE.Vector3(1, 1, 1), length: 0.2 },
    ],
    rootBoneIndices: [0],
  }),
};
