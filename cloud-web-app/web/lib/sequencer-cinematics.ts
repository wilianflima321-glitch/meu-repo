/**
 * SEQUENCER/CINEMATICS SYSTEM - Aethel Engine
 * 
 * Sistema de cinematics tipo Unreal Sequencer.
 * Permite criar cutscenes, trailers e animações em tempo real.
 * 
 * FEATURES:
 * - Timeline com múltiplas tracks
 * - Keyframe animation
 * - Camera cuts e blends
 * - Audio sync
 * - Events/triggers
 * - Curves de animação (Bezier, Linear, Step)
 * - Playback controls
 * - Export para vídeo
 */

import * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export type EasingFunction = (t: number) => number;

export type KeyframeValue = number | THREE.Vector3 | THREE.Quaternion | THREE.Color | boolean | string;

export interface Keyframe<T = KeyframeValue> {
  time: number;
  value: T;
  easing: EasingFunction;
  tangentIn?: number;
  tangentOut?: number;
}

export interface Track {
  id: string;
  name: string;
  type: 'transform' | 'property' | 'event' | 'audio' | 'camera' | 'visibility';
  targetId: string;
  property?: string;
  keyframes: Keyframe[];
  enabled: boolean;
  locked: boolean;
  muted: boolean;
}

export interface Section {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  color: string;
  tracks: string[]; // Track IDs
}

export interface SequenceConfig {
  name: string;
  duration: number;
  frameRate: number;
  playbackSpeed: number;
  loop: boolean;
  autoPlay: boolean;
}

export interface CameraCut {
  time: number;
  cameraId: string;
  blendTime: number;
  blendType: 'cut' | 'linear' | 'ease';
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

export const Easings = {
  linear: (t: number) => t,
  
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (--t) * t * t + 1,
  easeInOutCubic: (t: number) => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (--t) * t * t * t,
  easeInOutQuart: (t: number) => t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t,
  
  easeInQuint: (t: number) => t * t * t * t * t,
  easeOutQuint: (t: number) => 1 + (--t) * t * t * t * t,
  easeInOutQuint: (t: number) => t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t,
  
  easeInSine: (t: number) => 1 - Math.cos(t * Math.PI / 2),
  easeOutSine: (t: number) => Math.sin(t * Math.PI / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  
  easeInExpo: (t: number) => t === 0 ? 0 : Math.pow(2, 10 * t - 10),
  easeOutExpo: (t: number) => t === 1 ? 1 : 1 - Math.pow(2, -10 * t),
  easeInOutExpo: (t: number) => {
    if (t === 0 || t === 1) return t;
    return t < 0.5 
      ? Math.pow(2, 20 * t - 10) / 2 
      : (2 - Math.pow(2, -20 * t + 10)) / 2;
  },
  
  easeInCirc: (t: number) => 1 - Math.sqrt(1 - t * t),
  easeOutCirc: (t: number) => Math.sqrt(1 - (--t) * t),
  easeInOutCirc: (t: number) => t < 0.5
    ? (1 - Math.sqrt(1 - Math.pow(2 * t, 2))) / 2
    : (Math.sqrt(1 - Math.pow(-2 * t + 2, 2)) + 1) / 2,
  
  easeInElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : -Math.pow(2, 10 * t - 10) * Math.sin((t * 10 - 10.75) * c4);
  },
  easeOutElastic: (t: number) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  
  easeInBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return c3 * t * t * t - c1 * t * t;
  },
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  
  easeInBounce: (t: number) => 1 - Easings.easeOutBounce(1 - t),
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
  
  step: (t: number) => t < 1 ? 0 : 1,
  stepMiddle: (t: number) => t < 0.5 ? 0 : 1,
};

// ============================================================================
// KEYFRAME INTERPOLATION
// ============================================================================

export class KeyframeInterpolator {
  static interpolateNumber(keyframes: Keyframe<number>[], time: number): number {
    if (keyframes.length === 0) return 0;
    if (keyframes.length === 1) return keyframes[0].value;
    
    // Find surrounding keyframes
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= k1.time) return k1.value;
    if (time >= k2.time) return k2.value;
    
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    
    return k1.value + (k2.value - k1.value) * easedT;
  }
  
  static interpolateVector3(keyframes: Keyframe<THREE.Vector3>[], time: number): THREE.Vector3 {
    if (keyframes.length === 0) return new THREE.Vector3();
    if (keyframes.length === 1) return keyframes[0].value.clone();
    
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= k1.time) return k1.value.clone();
    if (time >= k2.time) return k2.value.clone();
    
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    
    return new THREE.Vector3().lerpVectors(k1.value, k2.value, easedT);
  }
  
  static interpolateQuaternion(keyframes: Keyframe<THREE.Quaternion>[], time: number): THREE.Quaternion {
    if (keyframes.length === 0) return new THREE.Quaternion();
    if (keyframes.length === 1) return keyframes[0].value.clone();
    
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= k1.time) return k1.value.clone();
    if (time >= k2.time) return k2.value.clone();
    
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    
    return new THREE.Quaternion().slerpQuaternions(k1.value, k2.value, easedT);
  }
  
  static interpolateColor(keyframes: Keyframe<THREE.Color>[], time: number): THREE.Color {
    if (keyframes.length === 0) return new THREE.Color();
    if (keyframes.length === 1) return keyframes[0].value.clone();
    
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= k1.time) return k1.value.clone();
    if (time >= k2.time) return k2.value.clone();
    
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    
    return new THREE.Color().lerpColors(k1.value, k2.value, easedT);
  }
}

// ============================================================================
// ANIMATION TRACK
// ============================================================================

export class AnimationTrack {
  readonly id: string;
  name: string;
  type: Track['type'];
  targetId: string;
  property: string;
  enabled: boolean = true;
  locked: boolean = false;
  muted: boolean = false;
  
  private keyframes: Keyframe[] = [];
  private target: THREE.Object3D | null = null;
  
  constructor(config: Partial<Track>) {
    this.id = config.id ?? crypto.randomUUID();
    this.name = config.name ?? 'Track';
    this.type = config.type ?? 'property';
    this.targetId = config.targetId ?? '';
    this.property = config.property ?? '';
    this.enabled = config.enabled ?? true;
    this.locked = config.locked ?? false;
    this.muted = config.muted ?? false;
    
    if (config.keyframes) {
      this.keyframes = [...config.keyframes];
    }
  }
  
  setTarget(target: THREE.Object3D | null): void {
    this.target = target;
  }
  
  addKeyframe(time: number, value: KeyframeValue, easing: EasingFunction = Easings.linear): Keyframe {
    const keyframe: Keyframe = { time, value, easing };
    
    // Insert in sorted order
    let insertIndex = this.keyframes.findIndex(k => k.time > time);
    if (insertIndex === -1) insertIndex = this.keyframes.length;
    
    // Check for existing keyframe at same time
    const existingIndex = this.keyframes.findIndex(k => Math.abs(k.time - time) < 0.001);
    if (existingIndex !== -1) {
      this.keyframes[existingIndex] = keyframe;
    } else {
      this.keyframes.splice(insertIndex, 0, keyframe);
    }
    
    return keyframe;
  }
  
  removeKeyframe(time: number): void {
    const index = this.keyframes.findIndex(k => Math.abs(k.time - time) < 0.001);
    if (index !== -1) {
      this.keyframes.splice(index, 1);
    }
  }
  
  getKeyframes(): Keyframe[] {
    return this.keyframes;
  }
  
  evaluate(time: number): KeyframeValue | null {
    if (!this.enabled || this.muted || this.keyframes.length === 0) {
      return null;
    }
    
    const firstKeyframe = this.keyframes[0];
    
    // Determine interpolation type from first keyframe value
    if (typeof firstKeyframe.value === 'number') {
      return KeyframeInterpolator.interpolateNumber(
        this.keyframes as Keyframe<number>[], 
        time
      );
    }
    
    if (firstKeyframe.value instanceof THREE.Vector3) {
      return KeyframeInterpolator.interpolateVector3(
        this.keyframes as Keyframe<THREE.Vector3>[], 
        time
      );
    }
    
    if (firstKeyframe.value instanceof THREE.Quaternion) {
      return KeyframeInterpolator.interpolateQuaternion(
        this.keyframes as Keyframe<THREE.Quaternion>[], 
        time
      );
    }
    
    if (firstKeyframe.value instanceof THREE.Color) {
      return KeyframeInterpolator.interpolateColor(
        this.keyframes as Keyframe<THREE.Color>[], 
        time
      );
    }
    
    // For non-interpolatable types, return the last keyframe before current time
    let result: typeof firstKeyframe.value = firstKeyframe.value;
    for (const kf of this.keyframes as Array<Keyframe<typeof firstKeyframe.value>>) {
      if (kf.time <= time) {
        result = kf.value;
      } else {
        break;
      }
    }
    
    return result;
  }
  
  apply(time: number): void {
    if (!this.target || !this.enabled || this.muted) return;
    
    const value = this.evaluate(time);
    if (value === null) return;
    
    switch (this.type) {
      case 'transform':
        this.applyTransform(value);
        break;
      case 'property':
        this.applyProperty(value);
        break;
      case 'visibility':
        if (typeof value === 'boolean') {
          this.target.visible = value;
        }
        break;
    }
  }
  
  private applyTransform(value: KeyframeValue): void {
    if (!this.target) return;
    
    switch (this.property) {
      case 'position':
        if (value instanceof THREE.Vector3) {
          this.target.position.copy(value);
        }
        break;
      case 'rotation':
        if (value instanceof THREE.Quaternion) {
          this.target.quaternion.copy(value);
        } else if (value instanceof THREE.Vector3) {
          this.target.rotation.setFromVector3(value);
        }
        break;
      case 'scale':
        if (value instanceof THREE.Vector3) {
          this.target.scale.copy(value);
        } else if (typeof value === 'number') {
          this.target.scale.setScalar(value);
        }
        break;
    }
  }
  
  private applyProperty(value: KeyframeValue): void {
    if (!this.target || !this.property) return;
    
    // Navigate property path
    const parts = this.property.split('.');
    let obj: any = this.target;
    
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
      if (!obj) return;
    }
    
    const lastPart = parts[parts.length - 1];
    
    if (value instanceof THREE.Color && obj[lastPart] instanceof THREE.Color) {
      obj[lastPart].copy(value);
    } else if (value instanceof THREE.Vector3 && obj[lastPart] instanceof THREE.Vector3) {
      obj[lastPart].copy(value);
    } else {
      obj[lastPart] = value;
    }
  }
  
  serialize(): Track {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      targetId: this.targetId,
      property: this.property,
      keyframes: this.keyframes.map(k => ({
        time: k.time,
        value: this.serializeValue(k.value),
        easing: Easings.linear // Would need to serialize easing function name
      })),
      enabled: this.enabled,
      locked: this.locked,
      muted: this.muted
    };
  }
  
  private serializeValue(value: KeyframeValue): any {
    if (value instanceof THREE.Vector3) {
      return { type: 'Vector3', x: value.x, y: value.y, z: value.z };
    }
    if (value instanceof THREE.Quaternion) {
      return { type: 'Quaternion', x: value.x, y: value.y, z: value.z, w: value.w };
    }
    if (value instanceof THREE.Color) {
      return { type: 'Color', r: value.r, g: value.g, b: value.b };
    }
    return value;
  }
}

// ============================================================================
// EVENT TRACK
// ============================================================================

export interface SequenceEvent {
  time: number;
  name: string;
  data?: any;
}

export class EventTrack {
  readonly id: string;
  name: string;
  events: SequenceEvent[] = [];
  enabled: boolean = true;
  
  private lastTriggeredTime: number = -1;
  private onEventCallback?: (event: SequenceEvent) => void;
  
  constructor(name: string, id?: string) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
  }
  
  addEvent(time: number, name: string, data?: any): SequenceEvent {
    const event: SequenceEvent = { time, name, data };
    
    // Insert in sorted order
    let insertIndex = this.events.findIndex(e => e.time > time);
    if (insertIndex === -1) insertIndex = this.events.length;
    this.events.splice(insertIndex, 0, event);
    
    return event;
  }
  
  removeEvent(time: number): void {
    const index = this.events.findIndex(e => Math.abs(e.time - time) < 0.001);
    if (index !== -1) {
      this.events.splice(index, 1);
    }
  }
  
  evaluate(time: number): SequenceEvent[] {
    if (!this.enabled) return [];
    
    const triggeredEvents: SequenceEvent[] = [];
    
    for (const event of this.events) {
      if (event.time > this.lastTriggeredTime && event.time <= time) {
        triggeredEvents.push(event);
      }
    }
    
    this.lastTriggeredTime = time;
    return triggeredEvents;
  }
  
  onEvent(callback: (event: SequenceEvent) => void): void {
    this.onEventCallback = callback;
  }
  
  reset(): void {
    this.lastTriggeredTime = -1;
  }
}

// ============================================================================
// CAMERA TRACK
// ============================================================================

export class CameraTrack {
  readonly id: string;
  name: string;
  cuts: CameraCut[] = [];
  enabled: boolean = true;
  
  private cameras: Map<string, THREE.Camera> = new Map();
  private activeCamera: THREE.Camera | null = null;
  private blendingFrom: THREE.Camera | null = null;
  private blendProgress: number = 1;
  private blendDuration: number = 0;
  private blendType: CameraCut['blendType'] = 'cut';
  
  constructor(name: string, id?: string) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
  }
  
  registerCamera(id: string, camera: THREE.Camera): void {
    this.cameras.set(id, camera);
  }
  
  unregisterCamera(id: string): void {
    this.cameras.delete(id);
  }
  
  addCut(time: number, cameraId: string, blendTime: number = 0, blendType: CameraCut['blendType'] = 'cut'): CameraCut {
    const cut: CameraCut = { time, cameraId, blendTime, blendType };
    
    // Insert in sorted order
    let insertIndex = this.cuts.findIndex(c => c.time > time);
    if (insertIndex === -1) insertIndex = this.cuts.length;
    this.cuts.splice(insertIndex, 0, cut);
    
    return cut;
  }
  
  removeCut(time: number): void {
    const index = this.cuts.findIndex(c => Math.abs(c.time - time) < 0.001);
    if (index !== -1) {
      this.cuts.splice(index, 1);
    }
  }
  
  evaluate(time: number, dt: number): THREE.Camera | null {
    if (!this.enabled || this.cuts.length === 0) return null;
    
    // Find current cut
    let currentCut: CameraCut | null = null;
    for (const cut of this.cuts) {
      if (cut.time <= time) {
        currentCut = cut;
      } else {
        break;
      }
    }
    
    if (!currentCut) return null;
    
    const targetCamera = this.cameras.get(currentCut.cameraId);
    if (!targetCamera) return null;
    
    // Handle blending
    if (this.activeCamera !== targetCamera) {
      this.blendingFrom = this.activeCamera;
      this.activeCamera = targetCamera;
      this.blendProgress = 0;
      this.blendDuration = currentCut.blendTime;
      this.blendType = currentCut.blendType;
    }
    
    if (this.blendProgress < 1 && this.blendingFrom && this.blendDuration > 0) {
      this.blendProgress += dt / this.blendDuration;
      this.blendProgress = Math.min(1, this.blendProgress);
      
      // Return interpolated camera state
      return this.blendCameras(this.blendingFrom, targetCamera, this.blendProgress);
    }
    
    return targetCamera;
  }
  
  private blendCameras(from: THREE.Camera, to: THREE.Camera, t: number): THREE.Camera {
    // Apply easing
    let easedT = t;
    if (this.blendType === 'ease') {
      easedT = Easings.easeInOutCubic(t);
    }
    
    // For now, just return the target camera
    // In a full implementation, we'd interpolate position/rotation
    if (t >= 1) return to;
    
    // Simple interpolation
    if (from instanceof THREE.PerspectiveCamera && to instanceof THREE.PerspectiveCamera) {
      const blended = from.clone() as THREE.PerspectiveCamera;
      blended.position.lerpVectors(from.position, to.position, easedT);
      blended.quaternion.slerpQuaternions(from.quaternion, to.quaternion, easedT);
      blended.fov = THREE.MathUtils.lerp(from.fov, to.fov, easedT);
      blended.updateProjectionMatrix();
      return blended;
    }
    
    return t < 0.5 ? from : to;
  }
  
  getActiveCamera(): THREE.Camera | null {
    return this.activeCamera;
  }
  
  reset(): void {
    this.activeCamera = null;
    this.blendingFrom = null;
    this.blendProgress = 1;
  }
}

// ============================================================================
// AUDIO TRACK
// ============================================================================

export interface AudioClip {
  time: number;
  audioBuffer: AudioBuffer;
  volume: number;
  loop: boolean;
  startOffset?: number;
  duration?: number;
}

export class AudioTrack {
  readonly id: string;
  name: string;
  clips: AudioClip[] = [];
  enabled: boolean = true;
  muted: boolean = false;
  volume: number = 1;
  
  private audioContext: AudioContext | null = null;
  private activeSources: Map<AudioClip, AudioBufferSourceNode> = new Map();
  private gainNode: GainNode | null = null;
  private lastTime: number = -1;
  
  constructor(name: string, audioContext?: AudioContext, id?: string) {
    this.id = id ?? crypto.randomUUID();
    this.name = name;
    this.audioContext = audioContext ?? null;
    
    if (this.audioContext) {
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.audioContext.destination);
    }
  }
  
  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx;
    this.gainNode = ctx.createGain();
    this.gainNode.connect(ctx.destination);
    this.gainNode.gain.value = this.volume;
  }
  
  addClip(clip: AudioClip): void {
    this.clips.push(clip);
    this.clips.sort((a, b) => a.time - b.time);
  }
  
  removeClip(clip: AudioClip): void {
    const index = this.clips.indexOf(clip);
    if (index !== -1) {
      this.clips.splice(index, 1);
      this.stopClip(clip);
    }
  }
  
  evaluate(time: number): void {
    if (!this.enabled || this.muted || !this.audioContext || !this.gainNode) return;
    
    // Check for clips that should start
    for (const clip of this.clips) {
      if (clip.time > this.lastTime && clip.time <= time) {
        this.playClip(clip, time - clip.time);
      }
    }
    
    this.lastTime = time;
  }
  
  private playClip(clip: AudioClip, offset: number = 0): void {
    if (!this.audioContext || !this.gainNode) return;
    
    // Stop if already playing
    this.stopClip(clip);
    
    const source = this.audioContext.createBufferSource();
    source.buffer = clip.audioBuffer;
    source.loop = clip.loop;
    
    const clipGain = this.audioContext.createGain();
    clipGain.gain.value = clip.volume;
    
    source.connect(clipGain);
    clipGain.connect(this.gainNode);
    
    const startOffset = (clip.startOffset ?? 0) + offset;
    source.start(0, startOffset, clip.duration);
    
    this.activeSources.set(clip, source);
    
    if (!clip.loop) {
      source.onended = () => {
        this.activeSources.delete(clip);
      };
    }
  }
  
  private stopClip(clip: AudioClip): void {
    const source = this.activeSources.get(clip);
    if (source) {
      source.stop();
      this.activeSources.delete(clip);
    }
  }
  
  stopAll(): void {
    for (const [clip, source] of this.activeSources) {
      source.stop();
    }
    this.activeSources.clear();
  }
  
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }
  
  reset(): void {
    this.stopAll();
    this.lastTime = -1;
  }
}

// ============================================================================
// SEQUENCE
// ============================================================================

export class Sequence {
  readonly id: string;
  name: string;
  duration: number;
  frameRate: number;
  playbackSpeed: number;
  loop: boolean;
  
  private tracks: Map<string, AnimationTrack> = new Map();
  private eventTracks: Map<string, EventTrack> = new Map();
  private cameraTrack: CameraTrack | null = null;
  private audioTracks: Map<string, AudioTrack> = new Map();
  private sections: Map<string, Section> = new Map();
  
  private scene: THREE.Scene | null = null;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;
  
  private onTimeUpdateCallbacks: ((time: number) => void)[] = [];
  private onCompleteCallbacks: (() => void)[] = [];
  private onEventCallbacks: ((event: SequenceEvent) => void)[] = [];
  
  constructor(config: Partial<SequenceConfig> = {}) {
    this.id = crypto.randomUUID();
    this.name = config.name ?? 'Sequence';
    this.duration = config.duration ?? 10;
    this.frameRate = config.frameRate ?? 30;
    this.playbackSpeed = config.playbackSpeed ?? 1;
    this.loop = config.loop ?? false;
    
    if (config.autoPlay) {
      this.play();
    }
  }
  
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
    
    // Bind tracks to scene objects
    for (const track of this.tracks.values()) {
      const target = this.findObjectById(track.targetId);
      track.setTarget(target);
    }
  }
  
  private findObjectById(id: string): THREE.Object3D | null {
    if (!this.scene) return null;
    
    let result: THREE.Object3D | null = null;
    this.scene.traverse((obj) => {
      if (obj.uuid === id || obj.name === id) {
        result = obj;
      }
    });
    return result;
  }
  
  // Track management
  createTrack(config: Partial<Track>): AnimationTrack {
    const track = new AnimationTrack(config);
    
    if (this.scene && config.targetId) {
      const target = this.findObjectById(config.targetId);
      track.setTarget(target);
    }
    
    this.tracks.set(track.id, track);
    return track;
  }
  
  removeTrack(id: string): void {
    this.tracks.delete(id);
  }
  
  getTrack(id: string): AnimationTrack | undefined {
    return this.tracks.get(id);
  }
  
  getAllTracks(): AnimationTrack[] {
    return Array.from(this.tracks.values());
  }
  
  // Event tracks
  createEventTrack(name: string): EventTrack {
    const track = new EventTrack(name);
    this.eventTracks.set(track.id, track);
    return track;
  }
  
  getEventTrack(id: string): EventTrack | undefined {
    return this.eventTracks.get(id);
  }
  
  // Camera track
  setCameraTrack(track: CameraTrack): void {
    this.cameraTrack = track;
  }
  
  getCameraTrack(): CameraTrack | null {
    return this.cameraTrack;
  }
  
  // Audio tracks
  createAudioTrack(name: string, audioContext?: AudioContext): AudioTrack {
    const track = new AudioTrack(name, audioContext);
    this.audioTracks.set(track.id, track);
    return track;
  }
  
  getAudioTrack(id: string): AudioTrack | undefined {
    return this.audioTracks.get(id);
  }
  
  // Sections
  createSection(name: string, startTime: number, endTime: number, color?: string): Section {
    const section: Section = {
      id: crypto.randomUUID(),
      name,
      startTime,
      endTime,
      color: color ?? '#3498db',
      tracks: []
    };
    this.sections.set(section.id, section);
    return section;
  }
  
  // Playback
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
    this.currentTime = 0;
    this.reset();
  }
  
  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(this.duration, time));
    this.evaluate(this.currentTime);
  }
  
  seekToFrame(frame: number): void {
    this.seek(frame / this.frameRate);
  }
  
  getCurrentTime(): number {
    return this.currentTime;
  }
  
  getCurrentFrame(): number {
    return Math.floor(this.currentTime * this.frameRate);
  }
  
  isCurrentlyPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }
  
  // Update loop
  update(dt: number): THREE.Camera | null {
    if (!this.isPlaying || this.isPaused) return null;
    
    const previousTime = this.currentTime;
    this.currentTime += dt * this.playbackSpeed;
    
    // Handle end of sequence
    if (this.currentTime >= this.duration) {
      if (this.loop) {
        this.currentTime = this.currentTime % this.duration;
        this.reset();
      } else {
        this.currentTime = this.duration;
        this.isPlaying = false;
        
        for (const callback of this.onCompleteCallbacks) {
          callback();
        }
      }
    }
    
    // Notify time update
    for (const callback of this.onTimeUpdateCallbacks) {
      callback(this.currentTime);
    }
    
    return this.evaluate(this.currentTime);
  }
  
  private evaluate(time: number): THREE.Camera | null {
    // Evaluate animation tracks
    for (const track of this.tracks.values()) {
      track.apply(time);
    }
    
    // Evaluate event tracks
    for (const eventTrack of this.eventTracks.values()) {
      const events = eventTrack.evaluate(time);
      for (const event of events) {
        for (const callback of this.onEventCallbacks) {
          callback(event);
        }
      }
    }
    
    // Evaluate audio tracks
    for (const audioTrack of this.audioTracks.values()) {
      audioTrack.evaluate(time);
    }
    
    // Evaluate camera track
    if (this.cameraTrack) {
      return this.cameraTrack.evaluate(time, 1 / 60);
    }
    
    return null;
  }
  
  private reset(): void {
    for (const eventTrack of this.eventTracks.values()) {
      eventTrack.reset();
    }
    
    for (const audioTrack of this.audioTracks.values()) {
      audioTrack.reset();
    }
    
    this.cameraTrack?.reset();
  }
  
  // Callbacks
  onTimeUpdate(callback: (time: number) => void): void {
    this.onTimeUpdateCallbacks.push(callback);
  }
  
  onComplete(callback: () => void): void {
    this.onCompleteCallbacks.push(callback);
  }
  
  onEvent(callback: (event: SequenceEvent) => void): void {
    this.onEventCallbacks.push(callback);
  }
  
  // Serialization
  serialize(): any {
    return {
      id: this.id,
      name: this.name,
      duration: this.duration,
      frameRate: this.frameRate,
      playbackSpeed: this.playbackSpeed,
      loop: this.loop,
      tracks: Array.from(this.tracks.values()).map(t => t.serialize()),
      sections: Array.from(this.sections.values())
    };
  }
  
  static deserialize(data: any): Sequence {
    const seq = new Sequence({
      name: data.name,
      duration: data.duration,
      frameRate: data.frameRate,
      playbackSpeed: data.playbackSpeed,
      loop: data.loop
    });
    
    // Restore tracks
    for (const trackData of data.tracks ?? []) {
      seq.createTrack(trackData);
    }
    
    return seq;
  }
}

// ============================================================================
// SEQUENCER
// ============================================================================

export class Sequencer {
  private sequences: Map<string, Sequence> = new Map();
  private activeSequence: Sequence | null = null;
  private scene: THREE.Scene | null = null;
  private audioContext: AudioContext | null = null;
  
  constructor(scene?: THREE.Scene) {
    this.scene = scene ?? null;
  }
  
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
    
    for (const seq of this.sequences.values()) {
      seq.setScene(scene);
    }
  }
  
  setAudioContext(ctx: AudioContext): void {
    this.audioContext = ctx;
  }
  
  createSequence(config: Partial<SequenceConfig> = {}): Sequence {
    const sequence = new Sequence(config);
    
    if (this.scene) {
      sequence.setScene(this.scene);
    }
    
    this.sequences.set(sequence.id, sequence);
    return sequence;
  }
  
  getSequence(id: string): Sequence | undefined {
    return this.sequences.get(id);
  }
  
  removeSequence(id: string): void {
    const seq = this.sequences.get(id);
    if (seq) {
      seq.stop();
      this.sequences.delete(id);
      
      if (this.activeSequence === seq) {
        this.activeSequence = null;
      }
    }
  }
  
  playSequence(id: string): void {
    const seq = this.sequences.get(id);
    if (seq) {
      this.activeSequence?.stop();
      this.activeSequence = seq;
      seq.play();
    }
  }
  
  stopAll(): void {
    for (const seq of this.sequences.values()) {
      seq.stop();
    }
    this.activeSequence = null;
  }
  
  update(dt: number): THREE.Camera | null {
    return this.activeSequence?.update(dt) ?? null;
  }
  
  getActiveSequence(): Sequence | null {
    return this.activeSequence;
  }
  
  getAllSequences(): Sequence[] {
    return Array.from(this.sequences.values());
  }
}

// ============================================================================
// PRESETS / HELPERS
// ============================================================================

export function createCameraFlythrough(
  sequence: Sequence,
  cameraId: string,
  waypoints: { position: THREE.Vector3; lookAt: THREE.Vector3; time: number }[],
  easing: EasingFunction = Easings.easeInOutCubic
): AnimationTrack {
  const positionTrack = sequence.createTrack({
    name: `${cameraId}_position`,
    type: 'transform',
    targetId: cameraId,
    property: 'position'
  });
  
  for (const wp of waypoints) {
    positionTrack.addKeyframe(wp.time, wp.position.clone(), easing);
  }
  
  return positionTrack;
}

export function createFadeTransition(
  sequence: Sequence,
  targetId: string,
  startTime: number,
  endTime: number,
  fadeIn: boolean = true
): AnimationTrack {
  const track = sequence.createTrack({
    name: `${targetId}_fade`,
    type: 'property',
    targetId,
    property: 'material.opacity'
  });
  
  if (fadeIn) {
    track.addKeyframe(startTime, 0, Easings.easeInOutCubic);
    track.addKeyframe(endTime, 1, Easings.easeInOutCubic);
  } else {
    track.addKeyframe(startTime, 1, Easings.easeInOutCubic);
    track.addKeyframe(endTime, 0, Easings.easeInOutCubic);
  }
  
  return track;
}

export default Sequencer;
