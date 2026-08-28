// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
import { EventEmitter } from 'events';
import { logger } from '@/lib/observability/logger';
import { THREE } from '../three/static';
import { REVERB_PRESETS } from './spatial-audio-presets';
import type {
  ActiveSound,
  AudioClip,
  AudioSettings,
  AudioZone,
  ReverbPreset,
  SoundSettings,
} from './spatial-audio-contracts';
import { getLastAcousticAtmosphereApply } from '@/lib/cosmos/acoustic-atmosphere-wire';
/** Build a simple decaying noise IR for ConvolverNode (no external asset required). */
export function buildSyntheticImpulseResponse(
  context: BaseAudioContext,
  durationSec: number,
  decay: number,
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * Math.max(0.05, durationSec)));
  const buffer = context.createBuffer(2, length, sampleRate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * (2.5 / Math.max(0.05, decay)));
      data[i] = (Math.random() * 2 - 1) * envelope;
    }
  }
  return buffer;
}

export class SpatialAudioManagerCore extends EventEmitter {
  protected context: AudioContext | null = null;
  protected listener: AudioListener | null = null;
  protected masterGain: GainNode | null = null;
  protected categoryGains: Map<string, GainNode> = new Map();

  protected clips: Map<string, AudioClip> = new Map();
  protected activeSounds: Map<string, ActiveSound> = new Map();
  protected zones: Map<string, AudioZone> = new Map();

  protected settings: AudioSettings;
  protected listenerPosition = new THREE.Vector3();
  protected listenerForward = new THREE.Vector3(0, 0, -1);
  protected listenerUp = new THREE.Vector3(0, 1, 0);

  protected reverbNode: ConvolverNode | null = null;
  protected reverbGain: GainNode | null = null;
  protected currentReverbPreset: ReverbPreset = 'none';

  protected soundIdCounter = 0;

  constructor() {
    super();

    this.settings = {
      masterVolume: 1,
      musicVolume: 0.8,
      sfxVolume: 1,
      ambientVolume: 0.7,
      voiceVolume: 1,
      muted: false,
      spatialEnabled: true,
      maxDistance: 100,
      rolloffFactor: 1,
      dopplerFactor: 1,
    };
  }

  async initialize(): Promise<void> {
    if (this.context) return;

    try {
      this.context = new AudioContext();

      // Create master gain
      this.masterGain = this.context.createGain();
      this.masterGain.connect(this.context.destination);

      // Create category gains
      const categories = ['sfx', 'music', 'ambient', 'voice'];
      for (const category of categories) {
        const gain = this.context.createGain();
        gain.connect(this.masterGain);
        this.categoryGains.set(category, gain);
      }

      // Create reverb chain â€” Convolver + wet gain (AUDIO-001: sources must send here)
      this.reverbNode = this.context.createConvolver();
      this.reverbNode.buffer = buildSyntheticImpulseResponse(this.context, 1.2, 1);
      this.reverbGain = this.context.createGain();
      this.reverbGain.gain.value = 0;
      this.reverbNode.connect(this.reverbGain);
      this.reverbGain.connect(this.masterGain);
      this.setReverbPreset(this.currentReverbPreset);

      // Apply initial settings
      this.applySettings();

      this.emit('initialized');
    } catch (error) {
      logger.error('Failed to initialize audio context:', error);
      throw error;
    }
  }

  async resumeContext(): Promise<void> {
    if (this.context?.state === 'suspended') {
      await this.context.resume();
      this.emit('resumed');
    }
  }

  async suspendContext(): Promise<void> {
    if (this.context?.state === 'running') {
      await this.context.suspend();
      this.emit('suspended');
    }
  }

  // ============================================================================
  // CLIP MANAGEMENT
  // ============================================================================

  async loadClip(id: string, url: string): Promise<AudioClip> {
    if (!this.context) throw new Error('Audio not initialized');

    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = await this.context.decodeAudioData(arrayBuffer);

    const clip: AudioClip = {
      id,
      name: url.split('/').pop() || id,
      buffer,
      duration: buffer.duration,
    };

    this.clips.set(id, clip);
    this.emit('clipLoaded', { clip });

    return clip;
  }

  async loadClipFromBuffer(id: string, arrayBuffer: ArrayBuffer): Promise<AudioClip> {
    if (!this.context) throw new Error('Audio not initialized');

    const buffer = await this.context.decodeAudioData(arrayBuffer);

    const clip: AudioClip = {
      id,
      name: id,
      buffer,
      duration: buffer.duration,
    };

    this.clips.set(id, clip);
    this.emit('clipLoaded', { clip });

    return clip;
  }

  getClip(id: string): AudioClip | undefined {
    return this.clips.get(id);
  }

  unloadClip(id: string): void {
    this.clips.delete(id);
    this.emit('clipUnloaded', { id });
  }

  // ============================================================================
  // PLAYBACK
  // ============================================================================

  play(
    clipId: string,
    options: Partial<SoundSettings> = {},
    position?: THREE.Vector3
  ): string | null {
    if (!this.context || !this.masterGain) return null;

    const clip = this.clips.get(clipId);
    if (!clip) {
      logger.warn(`Audio clip not found: ${clipId}`);
      return null;
    }

    const settings: SoundSettings = {
      volume: 1,
      pitch: 1,
      loop: false,
      spatial: !!position,
      minDistance: 1,
      maxDistance: this.settings.maxDistance,
      rolloffFactor: this.settings.rolloffFactor,
      coneInnerAngle: 360,
      coneOuterAngle: 360,
      coneOuterGain: 0,
      category: 'sfx',
      ...options,
    };

    const soundId = `sound_${++this.soundIdCounter}`;

    // Create source
    const source = this.context.createBufferSource();
    source.buffer = clip.buffer;
    source.loop = settings.loop;
    source.playbackRate.value = settings.pitch;

    // Create gain
    const gainNode = this.context.createGain();
    gainNode.gain.value = settings.volume * this.getCategoryVolume(settings.category);
    // Letter cr — cosmos volumetric acoustic (vacuum silent / hull / atmosphere wet).
    // Full HRTF AAA occlusion suite remains HELD — this only scales dry (+ optional wet).
    const cosmosAcoustic = getLastAcousticAtmosphereApply();
    if (cosmosAcoustic?.applied) {
      gainNode.gain.value *= Math.max(0, Math.min(1, cosmosAcoustic.transmission));
      if (this.reverbGain && cosmosAcoustic.wetGain > 0) {
        this.reverbGain.gain.value = Math.max(
          this.reverbGain.gain.value,
          Math.max(0, Math.min(1, cosmosAcoustic.wetGain)),
        );
      }
    }

    // Create panner if spatial
    let pannerNode: PannerNode | undefined;
    if (settings.spatial && position) {
      pannerNode = this.context.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = 'inverse';
      pannerNode.refDistance = settings.minDistance;
      pannerNode.maxDistance = settings.maxDistance;
      pannerNode.rolloffFactor = settings.rolloffFactor;
      pannerNode.coneInnerAngle = settings.coneInnerAngle;
      pannerNode.coneOuterAngle = settings.coneOuterAngle;
      pannerNode.coneOuterGain = settings.coneOuterGain;
      pannerNode.setPosition(position.x, position.y, position.z);

      source.connect(pannerNode);
      pannerNode.connect(gainNode);
    } else {
      source.connect(gainNode);
    }

    // Connect dry â†’ category â†’ master; wet send â†’ reverb convolver (AUDIO-001)
    const categoryGain = this.categoryGains.get(settings.category);
    if (categoryGain) {
      gainNode.connect(categoryGain);
    } else {
      gainNode.connect(this.masterGain);
    }
    if (this.reverbNode && this.currentReverbPreset !== 'none') {
      gainNode.connect(this.reverbNode);
    }

    // Store active sound
    const activeSound: ActiveSound = {
      id: soundId,
      clipId,
      source,
      gainNode,
      pannerNode,
      position: position?.clone(),
      settings,
      startTime: this.context.currentTime,
    };

    this.activeSounds.set(soundId, activeSound);

    // Handle completion
    source.onended = () => {
      if (this.activeSounds.has(soundId)) {
        this.activeSounds.delete(soundId);
        activeSound.onComplete?.();
        this.emit('soundEnded', { soundId, clipId });
      }
    };

    // Start playback
    source.start(0);
    this.emit('soundStarted', { soundId, clipId, position });

    return soundId;
  }

  playAt(
    clipId: string,
    position: THREE.Vector3,
    options: Partial<SoundSettings> = {}
  ): string | null {
    return this.play(clipId, { ...options, spatial: true }, position);
  }

  play2D(clipId: string, options: Partial<SoundSettings> = {}): string | null {
    return this.play(clipId, { ...options, spatial: false });
  }

  stop(soundId: string, fadeTime = 0): void {
    const sound = this.activeSounds.get(soundId);
    if (!sound) return;

    if (fadeTime > 0) {
      this.fadeOut(soundId, fadeTime).then(() => {
        this.stopImmediate(soundId);
      });
    } else {
      this.stopImmediate(soundId);
    }
  }

  protected stopImmediate(soundId: string): void {
    const sound = this.activeSounds.get(soundId);
    if (!sound) return;

    try {
      sound.source.stop();
    } catch {
      // Already stopped
    }

    this.activeSounds.delete(soundId);
    this.emit('soundStopped', { soundId });
  }

  stopAll(category?: string): void {
    for (const [soundId, sound] of this.activeSounds) {
      if (!category || sound.settings.category === category) {
        this.stopImmediate(soundId);
      }
    }
  }

  pause(soundId: string): void {
    const sound = this.activeSounds.get(soundId);
    if (!sound || !this.context) return;

    sound.pauseTime = this.context.currentTime - sound.startTime;
    sound.source.stop();
    this.emit('soundPaused', { soundId });
  }

  resume(soundId: string): void {
    const sound = this.activeSounds.get(soundId);
    if (!sound || !this.context || sound.pauseTime === undefined) return;

    const clip = this.clips.get(sound.clipId);
    if (!clip) return;

    // Create new source
    const newSource = this.context.createBufferSource();
    newSource.buffer = clip.buffer;
    newSource.loop = sound.settings.loop;
    newSource.playbackRate.value = sound.settings.pitch;

    // Reconnect
    if (sound.pannerNode) {
      newSource.connect(sound.pannerNode);
    } else {
      newSource.connect(sound.gainNode);
    }

    sound.source = newSource;
    sound.startTime = this.context.currentTime - sound.pauseTime;
    sound.pauseTime = undefined;

    newSource.onended = () => {
      if (this.activeSounds.has(soundId)) {
        this.activeSounds.delete(soundId);
        sound.onComplete?.();
        this.emit('soundEnded', { soundId });
      }
    };

    newSource.start(0, sound.pauseTime);
    this.emit('soundResumed', { soundId });
  }

  // ============================================================================
  // VOLUME / EFFECTS
  // ============================================================================

  setVolume(soundId: string, volume: number, fadeTime = 0): void {
    const sound = this.activeSounds.get(soundId);
    if (!sound || !this.context) return;

    if (fadeTime > 0) {
      sound.gainNode.gain.linearRampToValueAtTime(
        volume,
        this.context.currentTime + fadeTime
      );
    } else {
      sound.gainNode.gain.value = volume;
    }
  }

  async fadeOut(soundId: string, duration: number): Promise<void> {
    const sound = this.activeSounds.get(soundId);
    if (!sound || !this.context) return;

    sound.gainNode.gain.linearRampToValueAtTime(
      0,
      this.context.currentTime + duration
    );

    return new Promise((resolve) => {
      setTimeout(resolve, duration * 1000);
    });
  }

  async fadeIn(soundId: string, duration: number, targetVolume = 1): Promise<void> {
    const sound = this.activeSounds.get(soundId);
    if (!sound || !this.context) return;

    sound.gainNode.gain.value = 0;
    sound.gainNode.gain.linearRampToValueAtTime(
      targetVolume,
      this.context.currentTime + duration
    );

    return new Promise((resolve) => {
      setTimeout(resolve, duration * 1000);
    });
  }

  /**
   * AUDIO-001 â€” apply zone/global reverb: rebuild IR + set wet gain.
   * Sources already send to `reverbNode` when preset â‰  none.
   */
  setReverbPreset(preset: ReverbPreset): void {
    this.currentReverbPreset = preset;
    if (!this.context || !this.reverbNode || !this.reverbGain) return;

    const settings = REVERB_PRESETS[preset];
    if (preset === 'none' || settings.wetDry <= 0) {
      this.reverbGain.gain.value = 0;
      return;
    }

    const duration = Math.min(6, Math.max(0.2, settings.decay * 1.25 + settings.preDelay));
    this.reverbNode.buffer = buildSyntheticImpulseResponse(this.context, duration, settings.decay);
    this.reverbGain.gain.value = Math.max(0, Math.min(1, settings.wetDry));
    this.emit('reverbPresetChanged', { preset, wetDry: settings.wetDry });
  }

  getReverbPreset(): ReverbPreset {
    return this.currentReverbPreset;
  }

  /** True when convolver exists and wet path can receive source sends. */
  isReverbSendWired(): boolean {
    return Boolean(this.reverbNode && this.reverbGain);
  }

  protected applySettings(): void {
    if (!this.masterGain) return;

    this.masterGain.gain.value = this.settings.muted ? 0 : this.settings.masterVolume;

    const categoryMap: Record<string, keyof AudioSettings> = {
      sfx: 'sfxVolume',
      music: 'musicVolume',
      ambient: 'ambientVolume',
      voice: 'voiceVolume',
    };

    for (const [category, settingKey] of Object.entries(categoryMap)) {
      const gain = this.categoryGains.get(category);
      if (gain) {
        gain.gain.value = this.settings[settingKey] as number;
      }
    }
  }

  protected getCategoryVolume(category: string): number {
    switch (category) {
      case 'sfx': return this.settings.sfxVolume;
      case 'music': return this.settings.musicVolume;
      case 'ambient': return this.settings.ambientVolume;
      case 'voice': return this.settings.voiceVolume;
      default: return 1;
    }
  }
}
