// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/**
 * Spatial Audio System - Sistema de Áudio 3D Espacial
 *
 * Sistema completo de áudio com:
 * - Web Audio API integration
 * - 3D positional audio
 * - Audio zones/reverb
 * - Sound mixing
 * - Audio pooling
 * - Real-time effects (reverb, delay, filter)
 * - Music system with crossfading
 *
 * @module lib/audio/spatial-audio-system
 */

import { THREE } from '../three/static';
import { REVERB_PRESETS } from './spatial-audio-presets';
import { SpatialAudioManagerCore } from './spatial-audio-manager-core';
import { AudioSource } from './spatial-audio-source';
import type {
  ActiveSound,
  AudioSettings,
  AudioZone,
  ReverbPreset,
  ReverbSettings,
} from './spatial-audio-contracts';
export { REVERB_PRESETS } from './spatial-audio-presets';
export type { ActiveSound, AudioClip, AudioSettings, AudioZone, ReverbPreset, ReverbSettings, SoundSettings } from './spatial-audio-contracts';


// ============================================================================
// AUDIO MANAGER
// ============================================================================

export class SpatialAudioManager extends SpatialAudioManagerCore {
  private currentMusicId: string | null = null;

  setPitch(soundId: string, pitch: number): void {
    const sound = this.activeSounds.get(soundId);
    if (!sound) return;

    sound.source.playbackRate.value = pitch;
    sound.settings.pitch = pitch;
  }

  setPosition(soundId: string, position: THREE.Vector3): void {
    const sound = this.activeSounds.get(soundId);
    if (!sound || !sound.pannerNode) return;

    sound.pannerNode.setPosition(position.x, position.y, position.z);
    sound.position = position.clone();
  }

  // ============================================================================
  // LISTENER
  // ============================================================================

  setListenerPosition(position: THREE.Vector3): void {
    this.listenerPosition.copy(position);

    if (this.context) {
      const listener = this.context.listener;
      if (listener.positionX) {
        listener.positionX.value = position.x;
        listener.positionY.value = position.y;
        listener.positionZ.value = position.z;
      } else {
        listener.setPosition(position.x, position.y, position.z);
      }
    }

    // Check audio zones
    this.checkAudioZones();
  }

  setListenerOrientation(forward: THREE.Vector3, up: THREE.Vector3): void {
    this.listenerForward.copy(forward);
    this.listenerUp.copy(up);

    if (this.context) {
      const listener = this.context.listener;
      if (listener.forwardX) {
        listener.forwardX.value = forward.x;
        listener.forwardY.value = forward.y;
        listener.forwardZ.value = forward.z;
        listener.upX.value = up.x;
        listener.upY.value = up.y;
        listener.upZ.value = up.z;
      } else {
        listener.setOrientation(
          forward.x, forward.y, forward.z,
          up.x, up.y, up.z
        );
      }
    }
  }

  updateListenerFromCamera(camera: THREE.Camera): void {
    camera.getWorldPosition(this.listenerPosition);
    camera.getWorldDirection(this.listenerForward);

    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    this.setListenerPosition(this.listenerPosition);
    this.setListenerOrientation(this.listenerForward, up);
  }

  // ============================================================================
  // AUDIO ZONES
  // ============================================================================

  addZone(zone: AudioZone): void {
    this.zones.set(zone.id, zone);
    this.emit('zoneAdded', { zone });
  }

  removeZone(zoneId: string): void {
    this.zones.delete(zoneId);
    this.emit('zoneRemoved', { zoneId });
  }

  private checkAudioZones(): void {
    let highestPriority = -1;
    let activeZone: AudioZone | null = null;

    for (const zone of this.zones.values()) {
      if (zone.bounds.containsPoint(this.listenerPosition)) {
        if (zone.priority > highestPriority) {
          highestPriority = zone.priority;
          activeZone = zone;
        }
      }
    }

    if (activeZone) {
      if (this.currentReverbPreset !== activeZone.reverbPreset) {
        this.setReverbPreset(activeZone.reverbPreset);
      }
    } else if (this.currentReverbPreset !== 'none') {
      this.setReverbPreset('none');
    }
  }

  // ============================================================================
  // REVERB
  // ============================================================================

  async setReverbPreset(preset: ReverbPreset): Promise<void> {
    if (!this.context || !this.reverbGain) return;

    this.currentReverbPreset = preset;
    const settings = REVERB_PRESETS[preset];

    if (preset === 'none') {
      this.reverbGain.gain.value = 0;
      return;
    }

    // Generate impulse response
    const impulseResponse = this.generateImpulseResponse(settings);

    if (this.reverbNode) {
      this.reverbNode.disconnect();
    }

    this.reverbNode = this.context.createConvolver();
    this.reverbNode.buffer = impulseResponse;
    this.reverbNode.connect(this.reverbGain);

    this.reverbGain.gain.value = settings.wetDry;

    this.emit('reverbChanged', { preset, settings });
  }

  private generateImpulseResponse(settings: ReverbSettings): AudioBuffer {
    if (!this.context) throw new Error('Audio not initialized');

    const sampleRate = this.context.sampleRate;
    const length = sampleRate * settings.decay;
    const impulse = this.context.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        // Exponential decay with random noise
        data[i] = (Math.random() * 2 - 1) * Math.exp(-t / (settings.decay * 0.5));
      }
    }

    return impulse;
  }

  // ============================================================================
  // MUSIC SYSTEM
  // ============================================================================

  async playMusic(clipId: string, fadeInTime = 2): Promise<string | null> {
    // Fade out current music
    if (this.currentMusicId) {
      const oldMusicId = this.currentMusicId;
      this.fadeOut(oldMusicId, fadeInTime).then(() => {
        this.stopImmediate(oldMusicId);
      });
    }

    // Start new music
    const soundId = this.play(clipId, {
      category: 'music',
      loop: true,
      spatial: false,
      volume: 0,
    });

    if (soundId) {
      this.currentMusicId = soundId;
      await this.fadeIn(soundId, fadeInTime, 1);
    }

    return soundId;
  }

  stopMusic(fadeOutTime = 2): void {
    if (this.currentMusicId) {
      this.stop(this.currentMusicId, fadeOutTime);
      this.currentMusicId = null;
    }
  }

  crossfadeMusic(clipId: string, fadeTime = 2): Promise<string | null> {
    return this.playMusic(clipId, fadeTime);
  }

  // ============================================================================
  // SETTINGS
  // ============================================================================

  updateSettings(newSettings: Partial<AudioSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.applySettings();
    this.emit('settingsChanged', { settings: this.settings });
  }

  getSettings(): AudioSettings {
    return { ...this.settings };
  }

  mute(): void {
    this.updateSettings({ muted: true });
  }

  unmute(): void {
    this.updateSettings({ muted: false });
  }

  toggleMute(): void {
    this.updateSettings({ muted: !this.settings.muted });
  }

  // ============================================================================
  // STATE
  // ============================================================================

  getActiveSounds(): ActiveSound[] {
    return Array.from(this.activeSounds.values());
  }

  isPlaying(soundId: string): boolean {
    return this.activeSounds.has(soundId);
  }

  getSoundProgress(soundId: string): number {
    const sound = this.activeSounds.get(soundId);
    if (!sound || !this.context) return 0;

    const clip = this.clips.get(sound.clipId);
    if (!clip) return 0;

    const elapsed = this.context.currentTime - sound.startTime;
    return (elapsed % clip.duration) / clip.duration;
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  dispose(): void {
    this.stopAll();
    this.clips.clear();

    if (this.context) {
      this.context.close();
      this.context = null;
    }

    this.emit('disposed');
  }
}

// ============================================================================
// AUDIO SOURCE + REACT HOOKS
// ============================================================================

export { AudioSource } from './spatial-audio-source';
export { useAudioSource, useSpatialAudio } from './spatial-audio-hooks';

const __defaultExport = {
  SpatialAudioManager,
  AudioSource,
  REVERB_PRESETS,
};

export default __defaultExport;
