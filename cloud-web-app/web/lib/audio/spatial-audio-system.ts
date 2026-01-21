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

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export interface AudioSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  voiceVolume: number;
  muted: boolean;
  spatialEnabled: boolean;
  maxDistance: number;
  rolloffFactor: number;
  dopplerFactor: number;
}

export interface SoundSettings {
  volume: number;
  pitch: number;
  loop: boolean;
  spatial: boolean;
  minDistance: number;
  maxDistance: number;
  rolloffFactor: number;
  coneInnerAngle: number;
  coneOuterAngle: number;
  coneOuterGain: number;
  category: 'sfx' | 'music' | 'ambient' | 'voice';
}

export interface AudioZone {
  id: string;
  name: string;
  bounds: THREE.Box3;
  reverbPreset: ReverbPreset;
  volume: number;
  priority: number;
}

export type ReverbPreset = 
  | 'none'
  | 'small_room'
  | 'medium_room'
  | 'large_hall'
  | 'cathedral'
  | 'cave'
  | 'tunnel'
  | 'outdoor'
  | 'underwater';

export interface ReverbSettings {
  decay: number;
  preDelay: number;
  wetDry: number;
}

export interface AudioClip {
  id: string;
  name: string;
  buffer: AudioBuffer;
  duration: number;
}

export interface ActiveSound {
  id: string;
  clipId: string;
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  pannerNode?: PannerNode;
  filterNode?: BiquadFilterNode;
  position?: THREE.Vector3;
  settings: SoundSettings;
  startTime: number;
  pauseTime?: number;
  onComplete?: () => void;
}

// ============================================================================
// REVERB PRESETS
// ============================================================================

const REVERB_PRESETS: Record<ReverbPreset, ReverbSettings> = {
  none: { decay: 0, preDelay: 0, wetDry: 0 },
  small_room: { decay: 0.5, preDelay: 0.01, wetDry: 0.3 },
  medium_room: { decay: 1, preDelay: 0.02, wetDry: 0.4 },
  large_hall: { decay: 2.5, preDelay: 0.03, wetDry: 0.5 },
  cathedral: { decay: 4, preDelay: 0.04, wetDry: 0.6 },
  cave: { decay: 3, preDelay: 0.05, wetDry: 0.7 },
  tunnel: { decay: 2, preDelay: 0.02, wetDry: 0.5 },
  outdoor: { decay: 0.3, preDelay: 0.01, wetDry: 0.2 },
  underwater: { decay: 1.5, preDelay: 0.03, wetDry: 0.6 },
};

// ============================================================================
// AUDIO MANAGER
// ============================================================================

export class SpatialAudioManager extends EventEmitter {
  private context: AudioContext | null = null;
  private listener: AudioListener | null = null;
  private masterGain: GainNode | null = null;
  private categoryGains: Map<string, GainNode> = new Map();
  
  private clips: Map<string, AudioClip> = new Map();
  private activeSounds: Map<string, ActiveSound> = new Map();
  private zones: Map<string, AudioZone> = new Map();
  
  private settings: AudioSettings;
  private listenerPosition = new THREE.Vector3();
  private listenerForward = new THREE.Vector3(0, 0, -1);
  private listenerUp = new THREE.Vector3(0, 1, 0);
  
  private reverbNode: ConvolverNode | null = null;
  private reverbGain: GainNode | null = null;
  private currentReverbPreset: ReverbPreset = 'none';
  
  private soundIdCounter = 0;
  
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
      
      // Create reverb chain
      this.reverbGain = this.context.createGain();
      this.reverbGain.gain.value = 0;
      this.reverbGain.connect(this.masterGain);
      
      // Apply initial settings
      this.applySettings();
      
      this.emit('initialized');
    } catch (error) {
      console.error('Failed to initialize audio context:', error);
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
      console.warn(`Audio clip not found: ${clipId}`);
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
    
    // Connect to category gain
    const categoryGain = this.categoryGains.get(settings.category);
    if (categoryGain) {
      gainNode.connect(categoryGain);
    } else {
      gainNode.connect(this.masterGain);
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
  
  private stopImmediate(soundId: string): void {
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
  
  private currentMusicId: string | null = null;
  
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
  
  private applySettings(): void {
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
  
  private getCategoryVolume(category: string): number {
    switch (category) {
      case 'sfx': return this.settings.sfxVolume;
      case 'music': return this.settings.musicVolume;
      case 'ambient': return this.settings.ambientVolume;
      case 'voice': return this.settings.voiceVolume;
      default: return 1;
    }
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

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

export function useSpatialAudio() {
  const managerRef = useRef<SpatialAudioManager>(new SpatialAudioManager());
  const [isInitialized, setIsInitialized] = useState(false);
  const [settings, setSettings] = useState<AudioSettings>(managerRef.current.getSettings());
  const [activeSoundCount, setActiveSoundCount] = useState(0);
  
  useEffect(() => {
    const manager = managerRef.current;
    
    manager.on('initialized', () => setIsInitialized(true));
    manager.on('settingsChanged', ({ settings: s }) => setSettings(s));
    manager.on('soundStarted', () => setActiveSoundCount(manager.getActiveSounds().length));
    manager.on('soundEnded', () => setActiveSoundCount(manager.getActiveSounds().length));
    manager.on('soundStopped', () => setActiveSoundCount(manager.getActiveSounds().length));
    
    return () => {
      manager.removeAllListeners();
      manager.dispose();
    };
  }, []);
  
  const initialize = useCallback(async () => {
    await managerRef.current.initialize();
  }, []);
  
  const loadClip = useCallback(async (id: string, url: string) => {
    return managerRef.current.loadClip(id, url);
  }, []);
  
  const play = useCallback((
    clipId: string,
    options?: Partial<SoundSettings>,
    position?: THREE.Vector3
  ) => {
    return managerRef.current.play(clipId, options, position);
  }, []);
  
  const playAt = useCallback((
    clipId: string,
    position: THREE.Vector3,
    options?: Partial<SoundSettings>
  ) => {
    return managerRef.current.playAt(clipId, position, options);
  }, []);
  
  const stop = useCallback((soundId: string, fadeTime?: number) => {
    managerRef.current.stop(soundId, fadeTime);
  }, []);
  
  const playMusic = useCallback(async (clipId: string, fadeInTime?: number) => {
    return managerRef.current.playMusic(clipId, fadeInTime);
  }, []);
  
  const stopMusic = useCallback((fadeOutTime?: number) => {
    managerRef.current.stopMusic(fadeOutTime);
  }, []);
  
  const updateListenerFromCamera = useCallback((camera: THREE.Camera) => {
    managerRef.current.updateListenerFromCamera(camera);
  }, []);
  
  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    managerRef.current.updateSettings(newSettings);
  }, []);
  
  return {
    manager: managerRef.current,
    isInitialized,
    settings,
    activeSoundCount,
    initialize,
    loadClip,
    play,
    playAt,
    stop,
    playMusic,
    stopMusic,
    updateListenerFromCamera,
    updateSettings,
    mute: () => managerRef.current.mute(),
    unmute: () => managerRef.current.unmute(),
    toggleMute: () => managerRef.current.toggleMute(),
    resumeContext: () => managerRef.current.resumeContext(),
    suspendContext: () => managerRef.current.suspendContext(),
  };
}

export function useAudioSource(
  object3D: THREE.Object3D | null,
  clipId: string | null,
  options: Partial<SoundSettings> = {}
) {
  const { manager } = useSpatialAudio();
  const sourceRef = useRef<AudioSource | null>(null);
  
  useEffect(() => {
    if (object3D && clipId) {
      sourceRef.current = new AudioSource(manager, object3D, {
        clipId,
        settings: options,
      });
    }
    
    return () => {
      sourceRef.current?.stop();
      sourceRef.current = null;
    };
  }, [manager, object3D, clipId, options]);
  
  return sourceRef.current;
}

export default {
  SpatialAudioManager,
  AudioSource,
  REVERB_PRESETS,
};
