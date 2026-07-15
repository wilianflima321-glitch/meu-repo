// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/**
 * Spatial audio source component for 3D objects.
 */

import * as THREE from 'three';
import type { SoundSettings } from './spatial-audio-contracts';
import type { SpatialAudioManager } from './spatial-audio-system';

// ============================================================================
// AUDIO SOURCE COMPONENT (for 3D objects)
// ============================================================================

export class AudioSource {
  private manager: SpatialAudioManager;
  private object3D: THREE.Object3D;
  private soundId: string | null = null;
  private clipId: string | null = null;
  private settings: Partial<SoundSettings>;
  private autoPlay = false;

  constructor(
    manager: SpatialAudioManager,
    object3D: THREE.Object3D,
    options: {
      clipId?: string;
      settings?: Partial<SoundSettings>;
      autoPlay?: boolean;
    } = {}
  ) {
    this.manager = manager;
    this.object3D = object3D;
    this.clipId = options.clipId || null;
    this.settings = options.settings || {};
    this.autoPlay = options.autoPlay || false;

    if (this.autoPlay && this.clipId) {
      this.play();
    }
  }

  play(clipId?: string): void {
    const id = clipId || this.clipId;
    if (!id) return;

    const position = new THREE.Vector3();
    this.object3D.getWorldPosition(position);

    this.soundId = this.manager.playAt(id, position, this.settings);
    this.clipId = id;
  }

  stop(fadeTime = 0): void {
    if (this.soundId) {
      this.manager.stop(this.soundId, fadeTime);
      this.soundId = null;
    }
  }

  pause(): void {
    if (this.soundId) {
      this.manager.pause(this.soundId);
    }
  }

  resume(): void {
    if (this.soundId) {
      this.manager.resume(this.soundId);
    }
  }

  update(): void {
    if (this.soundId) {
      const position = new THREE.Vector3();
      this.object3D.getWorldPosition(position);
      this.manager.setPosition(this.soundId, position);
    }
  }

  setVolume(volume: number): void {
    if (this.soundId) {
      this.manager.setVolume(this.soundId, volume);
    }
    this.settings.volume = volume;
  }

  setPitch(pitch: number): void {
    if (this.soundId) {
      this.manager.setPitch(this.soundId, pitch);
    }
    this.settings.pitch = pitch;
  }

  isPlaying(): boolean {
    return this.soundId ? this.manager.isPlaying(this.soundId) : false;
  }

  getSoundId(): string | null {
    return this.soundId;
  }
}
