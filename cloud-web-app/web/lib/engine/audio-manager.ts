/**
 * Aethel Engine - Audio System
 * 
 * Full 3D spatial audio system using Web Audio API.
 * Supports positional audio, reverb, effects, and dynamic mixing.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface AudioListenerConfig {
  position: Vector3;
  forward: Vector3;
  up: Vector3;
}

export interface AudioSourceConfig {
  name: string;
  url?: string;
  buffer?: AudioBuffer;
  
  // Spatial
  spatial?: boolean;
  position?: Vector3;
  
  // Playback
  volume?: number;
  pitch?: number;
  loop?: boolean;
  autoplay?: boolean;
  
  // 3D Audio
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  coneInnerAngle?: number;
  coneOuterAngle?: number;
  coneOuterGain?: number;
  distanceModel?: 'linear' | 'inverse' | 'exponential';
  
  // Effects
  reverb?: boolean;
  reverbMix?: number;
  lowPassFilter?: number;
  highPassFilter?: number;
  
  // Group
  group?: string;
}

export interface AudioGroupConfig {
  name: string;
  volume?: number;
  muted?: boolean;
  effects?: AudioEffectConfig[];
}

export interface AudioEffectConfig {
  type: 'reverb' | 'delay' | 'distortion' | 'compressor' | 'eq';
  params: Record<string, number>;
}

export interface ReverbPreset {
  name: string;
  decay: number;
  preDelay: number;
  wetMix: number;
}

export interface AudioSnapshot {
  masterVolume: number;
  groups: { name: string; volume: number; muted: boolean }[];
  sources: { id: string; volume: number; position?: Vector3 }[];
}

// ============================================================================
// Audio Source
// ============================================================================

export class AudioSource extends EventEmitter {
  public id: string;
  public name: string;
  public config: AudioSourceConfig;
  
  private audioContext: AudioContext;
  private buffer: AudioBuffer | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode;
  private pannerNode: PannerNode | null = null;
  private lowPassNode: BiquadFilterNode | null = null;
  private highPassNode: BiquadFilterNode | null = null;
  
  private isPlaying = false;
  private isPaused = false;
  private startTime = 0;
  private pauseTime = 0;
  private playbackRate = 1;
  
  // Position
  private _position: Vector3 = { x: 0, y: 0, z: 0 };
  private _velocity: Vector3 = { x: 0, y: 0, z: 0 };

  constructor(
    audioContext: AudioContext,
    config: AudioSourceConfig,
    destination: AudioNode
  ) {
    super();
    
    this.id = crypto.randomUUID();
    this.name = config.name;
    this.config = config;
    this.audioContext = audioContext;
    
    // Create gain node
    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = config.volume ?? 1;
    
    // Create panner node for 3D audio
    if (config.spatial !== false) {
      this.pannerNode = audioContext.createPanner();
      this.pannerNode.panningModel = 'HRTF';
      this.pannerNode.distanceModel = config.distanceModel ?? 'inverse';
      this.pannerNode.refDistance = config.refDistance ?? 1;
      this.pannerNode.maxDistance = config.maxDistance ?? 10000;
      this.pannerNode.rolloffFactor = config.rolloffFactor ?? 1;
      this.pannerNode.coneInnerAngle = config.coneInnerAngle ?? 360;
      this.pannerNode.coneOuterAngle = config.coneOuterAngle ?? 360;
      this.pannerNode.coneOuterGain = config.coneOuterGain ?? 0;
      
      if (config.position) {
        this.setPosition(config.position);
      }
    }
    
    // Create filters
    if (config.lowPassFilter !== undefined) {
      this.lowPassNode = audioContext.createBiquadFilter();
      this.lowPassNode.type = 'lowpass';
      this.lowPassNode.frequency.value = config.lowPassFilter;
    }
    
    if (config.highPassFilter !== undefined) {
      this.highPassNode = audioContext.createBiquadFilter();
      this.highPassNode.type = 'highpass';
      this.highPassNode.frequency.value = config.highPassFilter;
    }
    
    // Connect nodes
    this.connectNodes(destination);
    
    // Set playback rate
    this.playbackRate = config.pitch ?? 1;
    
    // Load audio if URL provided
    if (config.url) {
      this.load(config.url);
    } else if (config.buffer) {
      this.buffer = config.buffer;
      if (config.autoplay) {
        this.play();
      }
    }
  }

  private connectNodes(destination: AudioNode): void {
    let lastNode: AudioNode = this.gainNode;
    
    if (this.highPassNode) {
      lastNode.connect(this.highPassNode);
      lastNode = this.highPassNode;
    }
    
    if (this.lowPassNode) {
      lastNode.connect(this.lowPassNode);
      lastNode = this.lowPassNode;
    }
    
    if (this.pannerNode) {
      lastNode.connect(this.pannerNode);
      lastNode = this.pannerNode;
    }
    
    lastNode.connect(destination);
  }

  async load(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      this.buffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.emit('loaded', this);
      
      if (this.config.autoplay) {
        this.play();
      }
    } catch (error) {
      console.error(`[Audio] Failed to load ${url}:`, error);
      this.emit('error', error);
    }
  }

  play(offset = 0): void {
    if (!this.buffer) {
      console.warn('[Audio] No buffer loaded');
      return;
    }
    
    if (this.isPlaying) {
      this.stop();
    }
    
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.buffer;
    this.sourceNode.loop = this.config.loop ?? false;
    this.sourceNode.playbackRate.value = this.playbackRate;
    
    this.sourceNode.connect(this.gainNode);
    
    this.sourceNode.onended = () => {
      if (!this.isPaused) {
        this.isPlaying = false;
        this.emit('ended', this);
      }
    };
    
    const actualOffset = this.isPaused ? this.pauseTime : offset;
    this.sourceNode.start(0, actualOffset);
    this.startTime = this.audioContext.currentTime - actualOffset;
    
    this.isPlaying = true;
    this.isPaused = false;
    
    this.emit('play', this);
  }

  pause(): void {
    if (!this.isPlaying || this.isPaused) return;
    
    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.sourceNode?.stop();
    this.sourceNode = null;
    
    this.isPaused = true;
    this.emit('pause', this);
  }

  resume(): void {
    if (!this.isPaused) return;
    this.play();
  }

  stop(): void {
    if (this.sourceNode) {
      this.sourceNode.stop();
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    
    this.isPlaying = false;
    this.isPaused = false;
    this.pauseTime = 0;
    
    this.emit('stop', this);
  }

  // Volume control
  setVolume(value: number, fadeTime = 0): void {
    const clampedValue = Math.max(0, Math.min(1, value));
    
    if (fadeTime > 0) {
      this.gainNode.gain.linearRampToValueAtTime(
        clampedValue,
        this.audioContext.currentTime + fadeTime
      );
    } else {
      this.gainNode.gain.value = clampedValue;
    }
  }

  getVolume(): number {
    return this.gainNode.gain.value;
  }

  // Pitch control
  setPitch(value: number): void {
    this.playbackRate = value;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = value;
    }
  }

  getPitch(): number {
    return this.playbackRate;
  }

  // Position for 3D audio
  setPosition(position: Vector3): void {
    this._position = position;
    if (this.pannerNode) {
      this.pannerNode.positionX.value = position.x;
      this.pannerNode.positionY.value = position.y;
      this.pannerNode.positionZ.value = position.z;
    }
  }

  getPosition(): Vector3 {
    return { ...this._position };
  }

  setVelocity(velocity: Vector3): void {
    this._velocity = velocity;
    // Note: Web Audio API doesn't support velocity directly
    // This can be used for doppler effect calculations
  }

  getVelocity(): Vector3 {
    return { ...this._velocity };
  }

  // Orientation for directional audio
  setOrientation(forward: Vector3): void {
    if (this.pannerNode) {
      this.pannerNode.orientationX.value = forward.x;
      this.pannerNode.orientationY.value = forward.y;
      this.pannerNode.orientationZ.value = forward.z;
    }
  }

  // Filter control
  setLowPassFrequency(frequency: number): void {
    if (this.lowPassNode) {
      this.lowPassNode.frequency.value = frequency;
    }
  }

  setHighPassFrequency(frequency: number): void {
    if (this.highPassNode) {
      this.highPassNode.frequency.value = frequency;
    }
  }

  // State
  getIsPlaying(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }

  getCurrentTime(): number {
    if (this.isPaused) return this.pauseTime;
    if (!this.isPlaying) return 0;
    return this.audioContext.currentTime - this.startTime;
  }

  getDuration(): number {
    return this.buffer?.duration ?? 0;
  }

  dispose(): void {
    this.stop();
    this.gainNode.disconnect();
    this.pannerNode?.disconnect();
    this.lowPassNode?.disconnect();
    this.highPassNode?.disconnect();
    this.removeAllListeners();
  }
}

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
      
      console.log('[Audio] System initialized');
    } catch (error) {
      console.error('[Audio] Failed to initialize:', error);
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

// ============================================================================
// Reverb Presets
// ============================================================================

export const ReverbPresets: Record<string, ReverbPreset> = {
  room: {
    name: 'Room',
    decay: 0.5,
    preDelay: 0.01,
    wetMix: 0.2,
  },
  hall: {
    name: 'Hall',
    decay: 2.0,
    preDelay: 0.02,
    wetMix: 0.3,
  },
  cathedral: {
    name: 'Cathedral',
    decay: 5.0,
    preDelay: 0.05,
    wetMix: 0.4,
  },
  cave: {
    name: 'Cave',
    decay: 3.0,
    preDelay: 0.1,
    wetMix: 0.5,
  },
  outdoor: {
    name: 'Outdoor',
    decay: 0.3,
    preDelay: 0.005,
    wetMix: 0.1,
  },
};

export default AudioManager;
