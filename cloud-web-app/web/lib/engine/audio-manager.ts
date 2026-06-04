/**
 * Aethel Engine - Audio System
 *
 * Full 3D spatial audio system using Web Audio API.
 * Supports positional audio, reverb, effects, and dynamic mixing.
 */

import { EventEmitter } from 'events';

import {createComponentLogger, logger} from '@/lib/observability/logger'
import { AudioSource } from './audio-source'
import type {
  AudioEffectConfig,
  AudioGroupConfig,
  AudioListenerConfig,
  AudioSnapshot,
  AudioSourceConfig,
  ReverbPreset,
  Vector3,
} from './audio-manager-contracts'
export { ReverbPresets } from './audio-manager-presets'
export { AudioSource } from './audio-source'
export type {
  AudioEffectConfig,
  AudioGroupConfig,
  AudioListenerConfig,
  AudioSnapshot,
  AudioSourceConfig,
  ReverbPreset,
  Vector3,
} from './audio-manager-contracts'

const log = createComponentLogger('engine/audio-manager')

// ============================================================================
// Audio Source
// ============================================================================

// ============================================================================
// Audio Group (Bus)
// ============================================================================

export class AudioGroup extends EventEmitter {
  public name: string;

  private audioContext: AudioContext;
  private gainNode: GainNode;
  private sources: AudioSource[] = [];
  private _muted = false;
  private _volume = 1;

  constructor(
    audioContext: AudioContext,
    config: AudioGroupConfig,
    destination: AudioNode
  ) {
    super();

    this.name = config.name;
    this.audioContext = audioContext;

    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = config.volume ?? 1;
    this._volume = config.volume ?? 1;
    this._muted = config.muted ?? false;

    if (this._muted) {
      this.gainNode.gain.value = 0;
    }

    this.gainNode.connect(destination);
  }

  getInputNode(): AudioNode {
    return this.gainNode;
  }

  addSource(source: AudioSource): void {
    this.sources.push(source);
  }

  removeSource(source: AudioSource): void {
    const index = this.sources.indexOf(source);
    if (index !== -1) {
      this.sources.splice(index, 1);
    }
  }

  setVolume(value: number, fadeTime = 0): void {
    this._volume = Math.max(0, Math.min(1, value));

    if (!this._muted) {
      if (fadeTime > 0) {
        this.gainNode.gain.linearRampToValueAtTime(
          this._volume,
          this.audioContext.currentTime + fadeTime
        );
      } else {
        this.gainNode.gain.value = this._volume;
      }
    }
  }

  getVolume(): number {
    return this._volume;
  }

  setMuted(muted: boolean, fadeTime = 0): void {
    this._muted = muted;
    const targetValue = muted ? 0 : this._volume;

    if (fadeTime > 0) {
      this.gainNode.gain.linearRampToValueAtTime(
        targetValue,
        this.audioContext.currentTime + fadeTime
      );
    } else {
      this.gainNode.gain.value = targetValue;
    }
  }

  isMuted(): boolean {
    return this._muted;
  }

  stopAll(): void {
    for (const source of this.sources) {
      source.stop();
    }
  }

  pauseAll(): void {
    for (const source of this.sources) {
      if (source.getIsPlaying()) {
        source.pause();
      }
    }
  }

  resumeAll(): void {
    for (const source of this.sources) {
      if (source.getIsPaused()) {
        source.resume();
      }
    }
  }

  dispose(): void {
    this.stopAll();
    this.gainNode.disconnect();
    this.sources = [];
    this.removeAllListeners();
  }
}

// ============================================================================
// Reverb Effect
// ============================================================================

class ReverbEffect {
  private audioContext: AudioContext;
  private convolverNode: ConvolverNode;
  private wetGainNode: GainNode;
  private dryGainNode: GainNode;
  private inputNode: GainNode;
  private outputNode: GainNode;

  constructor(audioContext: AudioContext, preset?: ReverbPreset) {
    this.audioContext = audioContext;

    this.inputNode = audioContext.createGain();
    this.outputNode = audioContext.createGain();
    this.convolverNode = audioContext.createConvolver();
    this.wetGainNode = audioContext.createGain();
    this.dryGainNode = audioContext.createGain();

    // Connect nodes
    this.inputNode.connect(this.dryGainNode);
    this.inputNode.connect(this.convolverNode);
    this.convolverNode.connect(this.wetGainNode);
    this.dryGainNode.connect(this.outputNode);
    this.wetGainNode.connect(this.outputNode);

    // Set initial mix
    this.wetGainNode.gain.value = preset?.wetMix ?? 0.3;
    this.dryGainNode.gain.value = 1 - (preset?.wetMix ?? 0.3);

    // Generate impulse response
    this.generateImpulseResponse(preset?.decay ?? 2, preset?.preDelay ?? 0.01);
  }

  private generateImpulseResponse(decay: number, preDelay: number): void {
    const sampleRate = this.audioContext.sampleRate;
    const length = sampleRate * decay;
    const preDelaySamples = sampleRate * preDelay;
    const buffer = this.audioContext.createBuffer(2, length, sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const channelData = buffer.getChannelData(channel);

      for (let i = 0; i < length; i++) {
        if (i < preDelaySamples) {
          channelData[i] = 0;
        } else {
          const t = (i - preDelaySamples) / length;
          channelData[i] = (Math.random() * 2 - 1) * Math.exp(-3 * t);
        }
      }
    }

    this.convolverNode.buffer = buffer;
  }

  setWetMix(value: number): void {
    this.wetGainNode.gain.value = value;
    this.dryGainNode.gain.value = 1 - value;
  }

  getInputNode(): AudioNode {
    return this.inputNode;
  }

  getOutputNode(): AudioNode {
    return this.outputNode;
  }

  dispose(): void {
    this.inputNode.disconnect();
    this.outputNode.disconnect();
    this.convolverNode.disconnect();
    this.wetGainNode.disconnect();
    this.dryGainNode.disconnect();
  }
}

// ============================================================================
// Audio Manager
// ============================================================================

export class AudioManager extends EventEmitter {
  private static instance: AudioManager | null = null;

  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private reverb: ReverbEffect | null = null;

  private sources = new Map<string, AudioSource>();
  private groups = new Map<string, AudioGroup>();
  private bufferCache = new Map<string, AudioBuffer>();

  private listener: AudioListenerConfig = {
    position: { x: 0, y: 0, z: 0 },
    forward: { x: 0, y: 0, z: -1 },
    up: { x: 0, y: 1, z: 0 },
  };

  private isInitialized = false;
  private isSuspended = false;

  private constructor() {
    super();
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  static resetInstance(): void {
    if (AudioManager.instance) {
      AudioManager.instance.dispose();
      AudioManager.instance = null;
    }
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Create audio context
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      // Create master gain
      this.masterGain = this.audioContext.createGain();

      // Create compressor for master bus
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.compressor.threshold.value = -24;
      this.compressor.knee.value = 30;
      this.compressor.ratio.value = 12;
      this.compressor.attack.value = 0.003;
      this.compressor.release.value = 0.25;

      // Create reverb
      this.reverb = new ReverbEffect(this.audioContext);

      // Connect master chain
      this.masterGain.connect(this.compressor);
      this.compressor.connect(this.audioContext.destination);

      // Create default groups
      this.createGroup({ name: 'master', volume: 1 });
      this.createGroup({ name: 'music', volume: 0.7 });
      this.createGroup({ name: 'sfx', volume: 1 });
      this.createGroup({ name: 'voice', volume: 1 });
      this.createGroup({ name: 'ambient', volume: 0.5 });

      this.isInitialized = true;
      this.emit('initialized');

      log.info('[Audio] System initialized');
    } catch (error) {
      logger.error('[Audio] Failed to initialize:', error);
      throw error;
    }
  }

  // Context management
  async resume(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
      this.isSuspended = false;
      this.emit('resumed');
    }
  }

  async suspend(): Promise<void> {
    if (this.audioContext?.state === 'running') {
      await this.audioContext.suspend();
      this.isSuspended = true;
      this.emit('suspended');
    }
  }

  // Group management
  createGroup(config: AudioGroupConfig): AudioGroup {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('Audio system not initialized');
    }

    const group = new AudioGroup(
      this.audioContext,
      config,
      this.masterGain
    );

    this.groups.set(config.name, group);
    return group;
  }

  getGroup(name: string): AudioGroup | undefined {
    return this.groups.get(name);
  }

  setGroupVolume(groupName: string, volume: number, fadeTime = 0): void {
    const group = this.groups.get(groupName);
    if (group) {
      group.setVolume(volume, fadeTime);
    }
  }

  setGroupMuted(groupName: string, muted: boolean, fadeTime = 0): void {
    const group = this.groups.get(groupName);
    if (group) {
      group.setMuted(muted, fadeTime);
    }
  }

  // Source management
  createSource(config: AudioSourceConfig): AudioSource {
    if (!this.audioContext || !this.masterGain) {
      throw new Error('Audio system not initialized');
    }

    // Get destination (group or master)
    let destination: AudioNode = this.masterGain;
    if (config.group) {
      const group = this.groups.get(config.group);
      if (group) {
        destination = group.getInputNode();
      }
    }

    const source = new AudioSource(
      this.audioContext,
      config,
      destination
    );

    this.sources.set(source.id, source);

    if (config.group) {
      const group = this.groups.get(config.group);
      group?.addSource(source);
    }

    return source;
  }

  getSource(id: string): AudioSource | undefined {
    return this.sources.get(id);
  }

  removeSource(id: string): boolean {
    const source = this.sources.get(id);
    if (source) {
      source.dispose();
      this.sources.delete(id);
      return true;
    }
    return false;
  }

  // Quick play methods
  async playSound(url: string, config?: Partial<AudioSourceConfig>): Promise<AudioSource> {
    // Check cache
    let buffer = this.bufferCache.get(url);

    if (!buffer && this.audioContext) {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.bufferCache.set(url, buffer);
    }

    const source = this.createSource({
      name: url,
      buffer,
      group: 'sfx',
      spatial: false,
      ...config,
    });

    source.play();

    // Auto-cleanup non-looping sounds
    if (!config?.loop) {
      source.on('ended', () => {
        this.removeSource(source.id);
      });
    }

    return source;
  }

  async playMusic(url: string, config?: Partial<AudioSourceConfig>): Promise<AudioSource> {
    // Stop existing music in group
    const musicGroup = this.groups.get('music');
    musicGroup?.stopAll();

    const source = this.createSource({
      name: url,
      url,
      group: 'music',
      spatial: false,
      loop: true,
      volume: 0,
      ...config,
    });

    // Fade in
    source.on('loaded', () => {
      source.play();
      source.setVolume(config?.volume ?? 1, 2);
    });

    return source;
  }

  async play3DSound(
    url: string,
    position: Vector3,
    config?: Partial<AudioSourceConfig>
  ): Promise<AudioSource> {
    const source = await this.playSound(url, {
      spatial: true,
      position,
      group: 'sfx',
      ...config,
    });

    return source;
  }

  // Listener management
  setListenerPosition(position: Vector3): void {
    this.listener.position = position;

    if (this.audioContext) {
      const listener = this.audioContext.listener;

      if (listener.positionX) {
        listener.positionX.value = position.x;
        listener.positionY.value = position.y;
        listener.positionZ.value = position.z;
      } else {
        // Legacy API
        listener.setPosition(position.x, position.y, position.z);
      }
    }
  }

  setListenerOrientation(forward: Vector3, up: Vector3): void {
    this.listener.forward = forward;
    this.listener.up = up;

    if (this.audioContext) {
      const listener = this.audioContext.listener;

      if (listener.forwardX) {
        listener.forwardX.value = forward.x;
        listener.forwardY.value = forward.y;
        listener.forwardZ.value = forward.z;
        listener.upX.value = up.x;
        listener.upY.value = up.y;
        listener.upZ.value = up.z;
      } else {
        // Legacy API
        listener.setOrientation(
          forward.x, forward.y, forward.z,
          up.x, up.y, up.z
        );
      }
    }
  }

  getListenerPosition(): Vector3 {
    return { ...this.listener.position };
  }

  // Master controls
  setMasterVolume(volume: number, fadeTime = 0): void {
    if (!this.masterGain) return;

    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (fadeTime > 0 && this.audioContext) {
      this.masterGain.gain.linearRampToValueAtTime(
        clampedVolume,
        this.audioContext.currentTime + fadeTime
      );
    } else {
      this.masterGain.gain.value = clampedVolume;
    }
  }

  getMasterVolume(): number {
    return this.masterGain?.gain.value ?? 1;
  }

  // Reverb
  setReverbMix(mix: number): void {
    this.reverb?.setWetMix(mix);
  }

  // Snapshot system for audio states
  createSnapshot(): AudioSnapshot {
    const snapshot: AudioSnapshot = {
      masterVolume: this.getMasterVolume(),
      groups: [],
      sources: [],
    };

    for (const [name, group] of this.groups) {
      snapshot.groups.push({
        name,
        volume: group.getVolume(),
        muted: group.isMuted(),
      });
    }

    for (const [id, source] of this.sources) {
      snapshot.sources.push({
        id,
        volume: source.getVolume(),
        position: source.getPosition(),
      });
    }

    return snapshot;
  }

  applySnapshot(snapshot: AudioSnapshot, fadeTime = 0): void {
    this.setMasterVolume(snapshot.masterVolume, fadeTime);

    for (const groupData of snapshot.groups) {
      const group = this.groups.get(groupData.name);
      if (group) {
        group.setVolume(groupData.volume, fadeTime);
        group.setMuted(groupData.muted, fadeTime);
      }
    }

    for (const sourceData of snapshot.sources) {
      const source = this.sources.get(sourceData.id);
      if (source) {
        source.setVolume(sourceData.volume, fadeTime);
        if (sourceData.position) {
          source.setPosition(sourceData.position);
        }
      }
    }
  }

  // Stop all audio
  stopAll(): void {
    for (const source of this.sources.values()) {
      source.stop();
    }
  }

  pauseAll(): void {
    for (const source of this.sources.values()) {
      if (source.getIsPlaying()) {
        source.pause();
      }
    }
  }

  resumeAll(): void {
    for (const source of this.sources.values()) {
      if (source.getIsPaused()) {
        source.resume();
      }
    }
  }

  // Cleanup
  clear(): void {
    this.stopAll();

    for (const source of this.sources.values()) {
      source.dispose();
    }
    this.sources.clear();

    this.bufferCache.clear();
  }

  dispose(): void {
    this.clear();

    for (const group of this.groups.values()) {
      group.dispose();
    }
    this.groups.clear();

    this.reverb?.dispose();
    this.compressor?.disconnect();
    this.masterGain?.disconnect();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.isInitialized = false;
    this.removeAllListeners();
  }

  // State
  getIsInitialized(): boolean {
    return this.isInitialized;
  }

  getIsSuspended(): boolean {
    return this.isSuspended;
  }

  getAudioContext(): AudioContext | null {
    return this.audioContext;
  }
}

export default AudioManager;
