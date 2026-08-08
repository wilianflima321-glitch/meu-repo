import { DOMAIN_SCENE_DEFAULTS } from '@/lib/design-system/domain-color-presets'
// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';
import { EventEmitter } from 'events';
import { CutsceneAudioManager } from './audio-manager';
import {
  easingFunctions,
  type AudioClipData,
  type CameraClipData,
  type CharacterClipData,
  type Clip,
  type CutsceneDefinition,
  type CutsceneState,
  type FadeClipData,
  type PropertyClipData,
  type SpawnClipData,
  type SubtitleClipData,
  type Track,
} from './types';

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
      color: data.color || DOMAIN_SCENE_DEFAULTS.fade,
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

// CUTSCENE AUDIO MANAGER
