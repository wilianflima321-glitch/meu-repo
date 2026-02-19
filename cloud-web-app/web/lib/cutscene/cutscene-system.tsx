/**
 * Cutscene System - Sistema de Cutscenes Cinemáticas
 * 
 * Sistema completo com:
 * - Timeline-based cutscenes
 * - Multiple track types
 * - Camera control
 * - Character actions
 * - Audio synchronization
 * - Subtitle display
 * - Skip/pause functionality
 * - Event triggers
 * - Branching cutscenes
 * 
 * @module lib/cutscene/cutscene-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

import type {
  AnimationClipData,
  AudioClipData,
  CameraClipData,
  CharacterClipData,
  Clip,
  ClipData,
  CutsceneBranch,
  CutsceneDefinition,
  EasingType,
  EffectClipData,
  EventClipData,
  FadeClipData,
  PropertyClipData,
  SpawnClipData,
  SubtitleClipData,
  Track,
  TrackType
} from './cutscene-types';

export type {
  AnimationClipData,
  AudioClipData,
  CameraClipData,
  CharacterClipData,
  Clip,
  ClipData,
  CutsceneBranch,
  CutsceneDefinition,
  EasingType,
  EffectClipData,
  EventClipData,
  FadeClipData,
  PropertyClipData,
  SpawnClipData,
  SubtitleClipData,
  Track,
  TrackType
} from './cutscene-types';

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => t * (2 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  bounce: (t) => {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  },
};

// ============================================================================
// CUTSCENE PLAYER
// ============================================================================

export interface CutsceneState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  progress: number;
  currentSubtitle: SubtitleClipData | null;
  fadeState: { active: boolean; type: 'in' | 'out'; progress: number; color: string } | null;
}

export class CutscenePlayer extends EventEmitter {
  private cutscene: CutsceneDefinition | null = null;
  private state: CutsceneState = {
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    progress: 0,
    currentSubtitle: null,
    fadeState: null,
  };
  
  private activeClips: Set<string> = new Set();
  private completedClips: Set<string> = new Set();
  
  // External references
  private camera: THREE.Camera | null = null;
  private scene: THREE.Scene | null = null;
  private targets: Map<string, THREE.Object3D> = new Map();
  
  // Audio context
  private audioManager: CutsceneAudioManager | null = null;
  
  constructor() {
    super();
    this.audioManager = new CutsceneAudioManager();
  }
  
  // ============================================================================
  // SETUP
  // ============================================================================
  
  setCamera(camera: THREE.Camera): void {
    this.camera = camera;
  }
  
  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }
  
  registerTarget(id: string, object: THREE.Object3D): void {
    this.targets.set(id, object);
  }
  
  unregisterTarget(id: string): void {
    this.targets.delete(id);
  }
  
  // ============================================================================
  // PLAYBACK CONTROL
  // ============================================================================
  
  load(cutscene: CutsceneDefinition): void {
    this.cutscene = cutscene;
    this.state.duration = cutscene.duration;
    this.reset();
    
    this.emit('loaded', { cutsceneId: cutscene.id });
  }
  
  play(): void {
    if (!this.cutscene) return;
    
    if (this.state.isPaused) {
      this.state.isPaused = false;
      this.emit('resumed');
      return;
    }
    
    this.state.isPlaying = true;
    this.state.isPaused = false;
    this.state.currentTime = 0;
    this.activeClips.clear();
    this.completedClips.clear();
    
    this.emit('started', { cutsceneId: this.cutscene.id });
  }
  
  pause(): void {
    if (!this.cutscene?.pausable) return;
    if (!this.state.isPlaying) return;
    
    this.state.isPaused = true;
    this.emit('paused', { currentTime: this.state.currentTime });
  }
  
  resume(): void {
    if (!this.state.isPaused) return;
    
    this.state.isPaused = false;
    this.emit('resumed');
  }
  
  stop(): void {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentTime = 0;
    this.state.currentSubtitle = null;
    this.state.fadeState = null;
    
    this.audioManager?.stopAll();
    
    this.emit('stopped');
  }
  
  skip(): void {
    if (!this.cutscene?.skippable) return;
    
    this.state.currentTime = this.cutscene.duration;
    this.complete();
  }
  
  seek(time: number): void {
    if (!this.cutscene) return;
    
    this.state.currentTime = Math.max(0, Math.min(time, this.cutscene.duration));
    this.state.progress = this.state.currentTime / this.state.duration;
    
    // Reset clip tracking
    this.activeClips.clear();
    this.completedClips.clear();
    
    // Mark clips before current time as completed
    for (const track of this.cutscene.tracks) {
      for (const clip of track.clips) {
        if (clip.endTime < this.state.currentTime) {
          this.completedClips.add(clip.id);
        }
      }
    }
    
    this.emit('seeked', { time: this.state.currentTime });
  }
  
  private reset(): void {
    this.state.isPlaying = false;
    this.state.isPaused = false;
    this.state.currentTime = 0;
    this.state.progress = 0;
    this.state.currentSubtitle = null;
    this.state.fadeState = null;
    this.activeClips.clear();
    this.completedClips.clear();
  }
  
  private complete(): void {
    const cutsceneId = this.cutscene?.id;
    const onComplete = this.cutscene?.onComplete;
    
    this.stop();
    
    this.emit('completed', { cutsceneId });
    
    if (onComplete) {
      this.emit('event', { eventId: onComplete });
    }
  }
  
  // ============================================================================
  // UPDATE
  // ============================================================================
  
  update(deltaTime: number): void {
    if (!this.cutscene || !this.state.isPlaying || this.state.isPaused) return;
    
    this.state.currentTime += deltaTime;
    this.state.progress = this.state.currentTime / this.state.duration;
    
    // Check completion
    if (this.state.currentTime >= this.cutscene.duration) {
      this.complete();
      return;
    }
    
    // Process all tracks
    for (const track of this.cutscene.tracks) {
      if (!track.enabled) continue;
      
      for (const clip of track.clips) {
        this.processClip(track, clip);
      }
    }
    
    // Check branches
    if (this.cutscene.branches) {
      for (const branch of this.cutscene.branches) {
        if (
          branch.triggerTime !== undefined &&
          this.state.currentTime >= branch.triggerTime &&
          !this.completedClips.has(`branch_${branch.id}`)
        ) {
          this.completedClips.add(`branch_${branch.id}`);
          this.emit('branchTriggered', { branch });
        }
      }
    }
    
    this.emit('update', { 
      currentTime: this.state.currentTime,
      progress: this.state.progress,
    });
  }
  
  private processClip(track: Track, clip: Clip): void {
    const { currentTime } = this.state;
    
    // Check if clip should be active
    if (currentTime < clip.startTime || currentTime > clip.endTime) {
      // Clip ended
      if (this.activeClips.has(clip.id) && currentTime > clip.endTime) {
        this.onClipEnd(track, clip);
        this.activeClips.delete(clip.id);
        this.completedClips.add(clip.id);
      }
      return;
    }
    
    // Clip just started
    if (!this.activeClips.has(clip.id) && !this.completedClips.has(clip.id)) {
      this.onClipStart(track, clip);
      this.activeClips.add(clip.id);
    }
    
    // Calculate progress within clip
    const clipDuration = clip.endTime - clip.startTime;
    const clipProgress = (currentTime - clip.startTime) / clipDuration;
    const easedProgress = clip.easing 
      ? easingFunctions[clip.easing](clipProgress)
      : clipProgress;
    
    // Update clip
    this.updateClip(track, clip, easedProgress);
  }
  
  private onClipStart(track: Track, clip: Clip): void {
    this.emit('clipStarted', { trackId: track.id, clipId: clip.id });
    
    // Type-specific start handling
    switch (clip.data.type) {
      case 'audio':
        this.handleAudioStart(clip.data);
        break;
      case 'subtitle':
        this.state.currentSubtitle = clip.data;
        break;
      case 'event':
        this.emit('event', { eventId: clip.data.eventId, data: clip.data.eventData });
        break;
      case 'spawn':
        this.handleSpawn(clip.data);
        break;
      case 'effect':
        this.emit('effect', { effectId: clip.data.effectId, data: clip.data });
        break;
    }
  }
  
  private onClipEnd(track: Track, clip: Clip): void {
    this.emit('clipEnded', { trackId: track.id, clipId: clip.id });
    
    switch (clip.data.type) {
      case 'subtitle':
        if (this.state.currentSubtitle === clip.data) {
          this.state.currentSubtitle = null;
        }
        break;
      case 'fade':
        if (clip.data.fadeType === 'in') {
          this.state.fadeState = null;
        }
        break;
    }
  }
  
  private updateClip(track: Track, clip: Clip, progress: number): void {
    switch (clip.data.type) {
      case 'camera':
        this.updateCameraClip(clip.data, progress);
        break;
      case 'character':
        this.updateCharacterClip(track.targetId!, clip.data, progress);
        break;
      case 'property':
        this.updatePropertyClip(track.targetId!, clip.data, progress);
        break;
      case 'fade':
        this.updateFadeClip(clip.data, progress);
        break;
    }
  }
  
  // ============================================================================
  // CLIP HANDLERS
  // ============================================================================
  
  private updateCameraClip(data: CameraClipData, progress: number): void {
    if (!this.camera) return;
    
    // Interpolate position
    const position = new THREE.Vector3(
      data.startPosition.x + (data.endPosition.x - data.startPosition.x) * progress,
      data.startPosition.y + (data.endPosition.y - data.startPosition.y) * progress,
      data.startPosition.z + (data.endPosition.z - data.startPosition.z) * progress
    );
    
    this.camera.position.copy(position);
    
    // Interpolate look at
    const lookAt = new THREE.Vector3(
      data.startLookAt.x + (data.endLookAt.x - data.startLookAt.x) * progress,
      data.startLookAt.y + (data.endLookAt.y - data.startLookAt.y) * progress,
      data.startLookAt.z + (data.endLookAt.z - data.startLookAt.z) * progress
    );
    
    this.camera.lookAt(lookAt);
    
    // Interpolate FOV
    if (this.camera instanceof THREE.PerspectiveCamera && data.startFov && data.endFov) {
      this.camera.fov = data.startFov + (data.endFov - data.startFov) * progress;
      this.camera.updateProjectionMatrix();
    }
  }
  
  private updateCharacterClip(targetId: string, data: CharacterClipData, progress: number): void {
    const target = this.targets.get(targetId);
    if (!target) return;
    
    switch (data.action) {
      case 'move':
        if (data.startValue && data.endValue) {
          const start = data.startValue as { x: number; y: number; z: number };
          const end = data.endValue as { x: number; y: number; z: number };
          
          target.position.set(
            start.x + (end.x - start.x) * progress,
            start.y + (end.y - start.y) * progress,
            start.z + (end.z - start.z) * progress
          );
        }
        break;
      
      case 'rotate':
        if (data.startValue && data.endValue) {
          const start = data.startValue as { x: number; y: number; z: number };
          const end = data.endValue as { x: number; y: number; z: number };
          
          const startQuat = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(start.x, start.y, start.z)
          );
          const endQuat = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(end.x, end.y, end.z)
          );
          
          target.quaternion.slerpQuaternions(startQuat, endQuat, progress);
        }
        break;
      
      case 'look_at':
        if (data.endValue) {
          const lookAt = data.endValue as { x: number; y: number; z: number };
          target.lookAt(new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z));
        }
        break;
    }
    
    this.emit('characterUpdate', { targetId, action: data.action, progress });
  }
  
  private updatePropertyClip(targetId: string, data: PropertyClipData, progress: number): void {
    const target = this.targets.get(targetId);
    if (!target) return;
    
    const value = data.startValue + (data.endValue - data.startValue) * progress;
    
    // Set nested property
    const parts = data.property.split('.');
    let obj: Record<string, unknown> = target as unknown as Record<string, unknown>;
    
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]] as Record<string, unknown>;
      if (!obj) return;
    }
    
    obj[parts[parts.length - 1]] = value;
  }
  
  private updateFadeClip(data: FadeClipData, progress: number): void {
    const fadeProgress = data.fadeType === 'in' ? 1 - progress : progress;
    
    this.state.fadeState = {
      active: true,
      type: data.fadeType,
      progress: fadeProgress,
      color: data.color || '#000000',
    };
  }
  
  private handleAudioStart(data: AudioClipData): void {
    if (!this.audioManager) return;
    
    switch (data.action) {
      case 'play':
        this.audioManager.play(data.audioId, { volume: data.volume, loop: data.loop });
        break;
      case 'stop':
        this.audioManager.stop(data.audioId);
        break;
      case 'fade_in':
        this.audioManager.fadeIn(data.audioId, data.volume || 1);
        break;
      case 'fade_out':
        this.audioManager.fadeOut(data.audioId);
        break;
    }
  }
  
  private handleSpawn(data: SpawnClipData): void {
    this.emit('spawn', {
      entityId: data.entityId,
      prefabId: data.prefabId,
      position: data.position,
      rotation: data.rotation,
    });
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getState(): CutsceneState {
    return { ...this.state };
  }
  
  getCutscene(): CutsceneDefinition | null {
    return this.cutscene;
  }
  
  isPlaying(): boolean {
    return this.state.isPlaying;
  }
  
  isPaused(): boolean {
    return this.state.isPaused;
  }
  
  getCurrentTime(): number {
    return this.state.currentTime;
  }
  
  getProgress(): number {
    return this.state.progress;
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stop();
    this.audioManager?.dispose();
    this.targets.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// CUTSCENE AUDIO MANAGER
// ============================================================================

class CutsceneAudioManager {
  private audioContext: AudioContext | null = null;
  private sounds: Map<string, { buffer: AudioBuffer; source: AudioBufferSourceNode | null; gain: GainNode | null }> = new Map();
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
  }
  
  async loadAudio(id: string, url: string): Promise<void> {
    if (!this.audioContext) return;
    
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    
    this.sounds.set(id, { buffer: audioBuffer, source: null, gain: null });
  }
  
  play(id: string, options: { volume?: number; loop?: boolean } = {}): void {
    if (!this.audioContext) return;
    
    const sound = this.sounds.get(id);
    if (!sound) return;
    
    // Create source and gain
    const source = this.audioContext.createBufferSource();
    source.buffer = sound.buffer;
    source.loop = options.loop || false;
    
    const gain = this.audioContext.createGain();
    gain.gain.value = options.volume ?? 1;
    
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    
    source.start();
    
    sound.source = source;
    sound.gain = gain;
  }
  
  stop(id: string): void {
    const sound = this.sounds.get(id);
    if (!sound?.source) return;
    
    sound.source.stop();
    sound.source = null;
    sound.gain = null;
  }
  
  fadeIn(id: string, targetVolume: number, duration = 1): void {
    if (!this.audioContext) return;
    
    const sound = this.sounds.get(id);
    if (!sound) return;
    
    // Start playing at 0 volume
    this.play(id, { volume: 0 });
    
    if (sound.gain) {
      sound.gain.gain.linearRampToValueAtTime(
        targetVolume,
        this.audioContext.currentTime + duration
      );
    }
  }
  
  fadeOut(id: string, duration = 1): void {
    if (!this.audioContext) return;
    
    const sound = this.sounds.get(id);
    if (!sound?.gain) return;
    
    sound.gain.gain.linearRampToValueAtTime(
      0,
      this.audioContext.currentTime + duration
    );
    
    setTimeout(() => {
      this.stop(id);
    }, duration * 1000);
  }
  
  stopAll(): void {
    for (const id of this.sounds.keys()) {
      this.stop(id);
    }
  }
  
  dispose(): void {
    this.stopAll();
    this.sounds.clear();
    this.audioContext?.close();
  }
}

// ============================================================================
// CUTSCENE BUILDER
// ============================================================================

export class CutsceneBuilder {
  private definition: Partial<CutsceneDefinition> = {
    tracks: [],
    skippable: true,
    pausable: true,
  };
  
  private currentTrack: Track | null = null;
  
  static create(id: string): CutsceneBuilder {
    return new CutsceneBuilder().id(id);
  }
  
  id(id: string): this {
    this.definition.id = id;
    return this;
  }
  
  name(name: string): this {
    this.definition.name = name;
    return this;
  }
  
  duration(seconds: number): this {
    this.definition.duration = seconds;
    return this;
  }
  
  skippable(skippable = true): this {
    this.definition.skippable = skippable;
    return this;
  }
  
  pausable(pausable = true): this {
    this.definition.pausable = pausable;
    return this;
  }
  
  autoPlay(autoPlay = true): this {
    this.definition.autoPlay = autoPlay;
    return this;
  }
  
  onComplete(eventId: string): this {
    this.definition.onComplete = eventId;
    return this;
  }
  
  // Track building
  
  track(type: TrackType, targetId?: string): this {
    this.currentTrack = {
      id: `track_${this.definition.tracks!.length}`,
      type,
      targetId,
      clips: [],
      enabled: true,
    };
    this.definition.tracks!.push(this.currentTrack);
    return this;
  }
  
  cameraTrack(): this {
    return this.track('camera');
  }
  
  characterTrack(targetId: string): this {
    return this.track('character', targetId);
  }
  
  audioTrack(): this {
    return this.track('audio');
  }
  
  subtitleTrack(): this {
    return this.track('subtitle');
  }
  
  eventTrack(): this {
    return this.track('event');
  }
  
  fadeTrack(): this {
    return this.track('fade');
  }
  
  // Clip building
  
  clip(startTime: number, endTime: number, data: ClipData, easing?: EasingType): this {
    if (!this.currentTrack) {
      throw new Error('No track selected. Call track() first.');
    }
    
    this.currentTrack.clips.push({
      id: `clip_${this.currentTrack.clips.length}`,
      startTime,
      endTime,
      data,
      easing,
    });
    
    return this;
  }
  
  // Camera clips
  
  cameraMove(
    startTime: number,
    endTime: number,
    startPos: { x: number; y: number; z: number },
    endPos: { x: number; y: number; z: number },
    lookAt: { x: number; y: number; z: number },
    easing: EasingType = 'easeInOut'
  ): this {
    return this.clip(startTime, endTime, {
      type: 'camera',
      startPosition: startPos,
      endPosition: endPos,
      startLookAt: lookAt,
      endLookAt: lookAt,
    }, easing);
  }
  
  cameraPan(
    startTime: number,
    endTime: number,
    startPos: { x: number; y: number; z: number },
    endPos: { x: number; y: number; z: number },
    startLookAt: { x: number; y: number; z: number },
    endLookAt: { x: number; y: number; z: number },
    easing: EasingType = 'easeInOut'
  ): this {
    return this.clip(startTime, endTime, {
      type: 'camera',
      startPosition: startPos,
      endPosition: endPos,
      startLookAt,
      endLookAt,
    }, easing);
  }
  
  // Character clips
  
  characterMove(
    startTime: number,
    endTime: number,
    startPos: { x: number; y: number; z: number },
    endPos: { x: number; y: number; z: number },
    easing: EasingType = 'linear'
  ): this {
    return this.clip(startTime, endTime, {
      type: 'character',
      action: 'move',
      startValue: startPos,
      endValue: endPos,
    }, easing);
  }
  
  // Audio clips
  
  playAudio(startTime: number, audioId: string, volume = 1): this {
    return this.clip(startTime, startTime + 0.1, {
      type: 'audio',
      action: 'play',
      audioId,
      volume,
    });
  }
  
  fadeInAudio(startTime: number, endTime: number, audioId: string, volume = 1): this {
    return this.clip(startTime, endTime, {
      type: 'audio',
      action: 'fade_in',
      audioId,
      volume,
    });
  }
  
  fadeOutAudio(startTime: number, endTime: number, audioId: string): this {
    return this.clip(startTime, endTime, {
      type: 'audio',
      action: 'fade_out',
      audioId,
    });
  }
  
  // Subtitle clips
  
  subtitle(
    startTime: number,
    endTime: number,
    text: string,
    speaker?: string,
    style: 'normal' | 'thought' | 'shout' | 'whisper' = 'normal'
  ): this {
    return this.clip(startTime, endTime, {
      type: 'subtitle',
      text,
      speaker,
      style,
    });
  }
  
  // Event clips
  
  event(time: number, eventId: string, data?: unknown): this {
    return this.clip(time, time + 0.1, {
      type: 'event',
      eventId,
      eventData: data,
    });
  }
  
  // Fade clips
  
  fadeIn(startTime: number, endTime: number, color = '#000000'): this {
    return this.clip(startTime, endTime, {
      type: 'fade',
      fadeType: 'in',
      color,
    });
  }
  
  fadeOut(startTime: number, endTime: number, color = '#000000'): this {
    return this.clip(startTime, endTime, {
      type: 'fade',
      fadeType: 'out',
      color,
    });
  }
  
  // Build
  
  build(): CutsceneDefinition {
    if (!this.definition.id) throw new Error('Cutscene ID is required');
    if (!this.definition.name) throw new Error('Cutscene name is required');
    if (!this.definition.duration) throw new Error('Duration is required');
    
    return this.definition as CutsceneDefinition;
  }
}

// ============================================================================
// CUTSCENE MANAGER
// ============================================================================

export class CutsceneManager extends EventEmitter {
  private definitions: Map<string, CutsceneDefinition> = new Map();
  private player: CutscenePlayer;
  
  constructor() {
    super();
    this.player = new CutscenePlayer();
    
    // Forward player events
    this.player.on('started', (data) => this.emit('started', data));
    this.player.on('completed', (data) => this.emit('completed', data));
    this.player.on('paused', (data) => this.emit('paused', data));
    this.player.on('resumed', () => this.emit('resumed'));
    this.player.on('stopped', () => this.emit('stopped'));
    this.player.on('event', (data) => this.emit('event', data));
    this.player.on('update', (data) => this.emit('update', data));
  }
  
  register(cutscene: CutsceneDefinition): void {
    this.definitions.set(cutscene.id, cutscene);
  }
  
  registerMany(cutscenes: CutsceneDefinition[]): void {
    for (const cs of cutscenes) {
      this.register(cs);
    }
  }
  
  play(cutsceneId: string): boolean {
    const definition = this.definitions.get(cutsceneId);
    if (!definition) return false;
    
    this.player.load(definition);
    this.player.play();
    return true;
  }
  
  pause(): void {
    this.player.pause();
  }
  
  resume(): void {
    this.player.resume();
  }
  
  stop(): void {
    this.player.stop();
  }
  
  skip(): void {
    this.player.skip();
  }
  
  update(deltaTime: number): void {
    this.player.update(deltaTime);
  }
  
  getPlayer(): CutscenePlayer {
    return this.player;
  }
  
  getState(): CutsceneState {
    return this.player.getState();
  }
  
  dispose(): void {
    this.player.dispose();
    this.definitions.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useRef, useEffect, useContext, createContext, useCallback } from 'react';

const CutsceneContext = createContext<CutsceneManager | null>(null);

export function CutsceneProvider({ children }: { children: React.ReactNode }) {
  const managerRef = useRef<CutsceneManager>(new CutsceneManager());
  
  useEffect(() => {
    const manager = managerRef.current;
    return () => {
      manager.dispose();
    };
  }, []);
  
  return (
    <CutsceneContext.Provider value={managerRef.current}>
      {children}
    </CutsceneContext.Provider>
  );
}

export function useCutscene() {
  const manager = useContext(CutsceneContext);
  if (!manager) {
    throw new Error('useCutscene must be used within a CutsceneProvider');
  }
  
  const [state, setState] = useState<CutsceneState>(manager.getState());
  
  useEffect(() => {
    const handleUpdate = () => {
      setState(manager.getState());
    };
    
    manager.on('update', handleUpdate);
    manager.on('started', handleUpdate);
    manager.on('completed', handleUpdate);
    manager.on('paused', handleUpdate);
    manager.on('resumed', handleUpdate);
    manager.on('stopped', handleUpdate);
    
    return () => {
      manager.off('update', handleUpdate);
      manager.off('started', handleUpdate);
      manager.off('completed', handleUpdate);
      manager.off('paused', handleUpdate);
      manager.off('resumed', handleUpdate);
      manager.off('stopped', handleUpdate);
    };
  }, [manager]);
  
  const play = useCallback((cutsceneId: string) => {
    return manager.play(cutsceneId);
  }, [manager]);
  
  const pause = useCallback(() => {
    manager.pause();
  }, [manager]);
  
  const resume = useCallback(() => {
    manager.resume();
  }, [manager]);
  
  const stop = useCallback(() => {
    manager.stop();
  }, [manager]);
  
  const skip = useCallback(() => {
    manager.skip();
  }, [manager]);
  
  return {
    manager,
    state,
    play,
    pause,
    resume,
    stop,
    skip,
    register: manager.register.bind(manager),
    update: manager.update.bind(manager),
  };
}

export function useCutsceneEvents() {
  const { manager } = useCutscene();
  
  const onEvent = useCallback((handler: (eventId: string, data?: unknown) => void) => {
    const listener = ({ eventId, data }: { eventId: string; data?: unknown }) => {
      handler(eventId, data);
    };
    
    manager.on('event', listener);
    
    return () => {
      manager.off('event', listener);
    };
  }, [manager]);
  
  return { onEvent };
}

const __defaultExport = {
  CutscenePlayer,
  CutsceneManager,
  CutsceneBuilder,
  CutsceneProvider,
  useCutscene,
  useCutsceneEvents,
};

export default __defaultExport;
