// @aethel-heavy-async-boundary
/**
 * spatial-audio-system.ts  — Sprint V31
 *
 * Exports two classes:
 *   SpatialAudioSystem  — new singleton-based engine used by AISoundscapeGenerator
 *   SpatialAudioManager — legacy EventEmitter-style manager used by studio hooks
 */

// ============================================================================
// LEGACY SpatialAudioManager (backward-compatible with existing studio hooks)
// ============================================================================
import type * as THREE_LEGACY from 'three';
import type { AudioSettings, SoundSettings, ActiveSound } from './spatial-audio-contracts';

type AudioEventName =
  | 'initialized'
  | 'settingsChanged'
  | 'soundStarted'
  | 'soundEnded'
  | 'soundStopped';

// eslint-disable-next-line
type AudioEventHandler = (payload?: any) => void;

const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 1,
  musicVolume: 0.8,
  sfxVolume: 1,
  ambientVolume: 0.7,
  voiceVolume: 1,
  muted: false,
  spatialEnabled: true,
  maxDistance: 80,
  rolloffFactor: 1,
  dopplerFactor: 0,
};

export class SpatialAudioManager {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private clips = new Map<string, AudioBuffer>();
  private sounds = new Map<string, ActiveSound>();
  private musicSourceId: string | null = null;
  private _settings: AudioSettings = { ...DEFAULT_SETTINGS };
  private handlers = new Map<AudioEventName, Set<AudioEventHandler>>();
  private initialized = false;

  // ── EventEmitter ────────────────────────────────────────────────────────────
  on(event: AudioEventName, handler: AudioEventHandler): this {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return this;
  }

  off(event: AudioEventName, handler: AudioEventHandler): this {
    this.handlers.get(event)?.delete(handler);
    return this;
  }

  removeAllListeners(): this {
    this.handlers.clear();
    return this;
  }

  private emit(event: AudioEventName, payload?: Record<string, unknown>): void {
    this.handlers.get(event)?.forEach((h) => h(payload));
  }

  // ── Init ────────────────────────────────────────────────────────────────────
  async initialize(): Promise<void> {
    if (this.initialized) return;
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this._settings.muted ? 0 : this._settings.masterVolume;
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
    this.emit('initialized');
  }

  private getCtx(): AudioContext {
    if (!this.ctx || !this.initialized) throw new Error('SpatialAudioManager not initialized');
    return this.ctx;
  }

  // ── Clips ────────────────────────────────────────────────────────────────────
  async loadClip(id: string, url: string): Promise<AudioBuffer> {
    if (this.clips.has(id)) return this.clips.get(id)!;
    const ctx = this.getCtx();
    const res = await fetch(url);
    const buf = await ctx.decodeAudioData(await res.arrayBuffer());
    this.clips.set(id, buf);
    return buf;
  }

  // ── Playback ─────────────────────────────────────────────────────────────────
  play(clipId: string, options?: Partial<SoundSettings>, position?: THREE_LEGACY.Vector3): string {
    const buf = this.clips.get(clipId);
    if (!buf) return '';
    return this._startSound(clipId, buf, options, position);
  }

  playAt(clipId: string, position: THREE_LEGACY.Vector3, options?: Partial<SoundSettings>): string {
    return this.play(clipId, options, position);
  }

  private _startSound(
    clipId: string,
    buf: AudioBuffer,
    options?: Partial<SoundSettings>,
    position?: THREE_LEGACY.Vector3,
  ): string {
    const ctx = this.getCtx();
    const id = `snd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const gainNode = ctx.createGain();
    const vol = (options?.volume ?? 1) * this._settings.sfxVolume * this._settings.masterVolume;
    gainNode.gain.value = this._settings.muted ? 0 : vol;

    let pannerNode: PannerNode | undefined;
    if (position && this._settings.spatialEnabled) {
      pannerNode = ctx.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = 'inverse';
      pannerNode.refDistance = options?.minDistance ?? 1;
      pannerNode.maxDistance = options?.maxDistance ?? this._settings.maxDistance;
      pannerNode.rolloffFactor = options?.rolloffFactor ?? this._settings.rolloffFactor;
      pannerNode.positionX.value = position.x;
      pannerNode.positionY.value = position.y;
      pannerNode.positionZ.value = position.z;
      gainNode.connect(pannerNode);
      pannerNode.connect(this.masterGain!);
    } else {
      gainNode.connect(this.masterGain!);
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = options?.loop ?? false;
    source.playbackRate.value = options?.pitch ?? 1;
    source.connect(gainNode);
    source.start(0);

    const activeSound: ActiveSound = {
      id,
      clipId,
      source,
      gainNode,
      pannerNode,
      position,
      settings: { volume: 1, pitch: 1, loop: false, spatial: !!position, minDistance: 1, maxDistance: 80, rolloffFactor: 1, coneInnerAngle: 360, coneOuterAngle: 360, coneOuterGain: 0, category: 'sfx', ...options },
      startTime: ctx.currentTime,
    };
    this.sounds.set(id, activeSound);
    source.onended = () => {
      this.sounds.delete(id);
      this.emit('soundEnded');
    };
    this.emit('soundStarted');
    return id;
  }

  stop(soundId: string, _fadeTime = 0): void {
    const sound = this.sounds.get(soundId);
    if (!sound) return;
    try { sound.source.stop(); } catch { /* already stopped */ }
    this.sounds.delete(soundId);
    this.emit('soundStopped');
  }

  pause(soundId: string): void {
    const sound = this.sounds.get(soundId);
    if (!sound) return;
    sound.pauseTime = this.ctx?.currentTime;
    try { sound.source.stop(); } catch { /* ok */ }
  }

  resume(soundId: string): void {
    const sound = this.sounds.get(soundId);
    if (!sound?.pauseTime) return;
    this.play(sound.clipId, sound.settings, sound.position);
  }

  async playMusic(clipId: string, _fadeInTime = 1): Promise<string> {
    if (this.musicSourceId) this.stop(this.musicSourceId);
    const buf = this.clips.get(clipId);
    if (!buf) return '';
    const id = this._startSound(clipId, buf, { loop: true, volume: this._settings.musicVolume, category: 'music' });
    this.musicSourceId = id;
    return id;
  }

  stopMusic(_fadeOutTime = 1): void {
    if (this.musicSourceId) {
      this.stop(this.musicSourceId);
      this.musicSourceId = null;
    }
  }

  // ── Spatial helpers ──────────────────────────────────────────────────────────
  setPosition(soundId: string, position: THREE_LEGACY.Vector3): void {
    const sound = this.sounds.get(soundId);
    if (!sound?.pannerNode) return;
    sound.pannerNode.positionX.value = position.x;
    sound.pannerNode.positionY.value = position.y;
    sound.pannerNode.positionZ.value = position.z;
    sound.position = position;
  }

  setVolume(soundId: string, volume: number): void {
    const sound = this.sounds.get(soundId);
    if (sound) sound.gainNode.gain.value = this._settings.muted ? 0 : volume;
  }

  setPitch(soundId: string, pitch: number): void {
    const sound = this.sounds.get(soundId);
    if (sound) sound.source.playbackRate.value = pitch;
  }

  isPlaying(soundId: string): boolean {
    return this.sounds.has(soundId);
  }

  updateListenerFromCamera(camera: THREE_LEGACY.Camera): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const pos = camera.position;
    const fwd = new (camera.constructor as typeof THREE_LEGACY.Camera)().position;
    camera.getWorldDirection(fwd as THREE_LEGACY.Vector3);
    if (l.positionX) {
      l.positionX.value = pos.x; l.positionY.value = pos.y; l.positionZ.value = pos.z;
      l.forwardX.value = (fwd as THREE_LEGACY.Vector3).x; l.forwardY.value = (fwd as THREE_LEGACY.Vector3).y; l.forwardZ.value = (fwd as THREE_LEGACY.Vector3).z;
    } else {
      l.setPosition(pos.x, pos.y, pos.z);
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────────────
  getSettings(): AudioSettings { return { ...this._settings }; }

  updateSettings(next: Partial<AudioSettings>): void {
    this._settings = { ...this._settings, ...next };
    if (this.masterGain) {
      this.masterGain.gain.value = this._settings.muted ? 0 : this._settings.masterVolume;
    }
    this.emit('settingsChanged', { settings: this._settings as unknown as Record<string, unknown> });
  }

  mute(): void { this.updateSettings({ muted: true }); }
  unmute(): void { this.updateSettings({ muted: false }); }
  toggleMute(): void { this.updateSettings({ muted: !this._settings.muted }); }

  async resumeContext(): Promise<void> { await this.ctx?.resume(); }
  async suspendContext(): Promise<void> { await this.ctx?.suspend(); }

  getActiveSounds(): ActiveSound[] { return Array.from(this.sounds.values()); }

  dispose(): void {
    this.sounds.forEach((_, id) => this.stop(id));
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
  }
}

// ============================================================================
// NEW SpatialAudioSystem (world-scale singleton for AISoundscapeGenerator)
// ============================================================================

/**
 *
 * Web Audio API spatial sound engine for Aethel Studio.
 *
 * Architecture:
 *   SpatialAudioSystem — owns the AudioContext, master gain, and listener
 *   AudioSourceHandle  — per-source emitter (3D position, volume, attenuation)
 *
 * Positions are in world-space THREE.Vector3 convention (Y = up).
 * The listener tracks the active camera each frame.
 *
 * Usage:
 *   const audio = SpatialAudioSystem.get();
 *   audio.setListenerPosition(camera.position, camera.getWorldDirection(...));
 *   const handle = await audio.createSource('/audio/wind.ogg', { loop: true });
 *   handle.setPosition(new THREE.Vector3(10, 0, -5));
 *   handle.play();
 */

import * as THREE from 'three';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('spatial-audio');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SpatialSourceOptions {
  loop?: boolean;
  /** Attenuation model: 'linear' (Web Audio default) or 'inverse' (physically accurate). */
  rolloffModel?: 'linear' | 'inverse' | 'exponential';
  /** Distance at which the source volume starts to drop. Default: 1 */
  refDistance?: number;
  /** Distance at which the volume reaches zero / minimum. Default: 100 */
  maxDistance?: number;
  /** 0–1 volume. Default: 1 */
  volume?: number;
}

export interface AudioSourceHandle {
  readonly id: string;
  setPosition(position: THREE.Vector3): void;
  setVolume(volume: number): void;
  play(): Promise<void>;
  pause(): void;
  stop(): void;
  dispose(): void;
}

// ---------------------------------------------------------------------------
// AudioSourceNode implementation
// ---------------------------------------------------------------------------

let nextSourceId = 1;

class AudioSourceNode implements AudioSourceHandle {
  readonly id: string;
  private bufferSource: AudioBufferSourceNode | null = null;
  private readonly gainNode: GainNode;
  private readonly pannerNode: PannerNode;
  private isPlaying = false;

  constructor(
    private readonly ctx: AudioContext,
    private readonly buffer: AudioBuffer,
    private readonly masterGain: GainNode,
    private readonly options: Required<SpatialSourceOptions>,
  ) {
    this.id = `source-${nextSourceId++}`;

    this.gainNode = ctx.createGain();
    this.gainNode.gain.value = options.volume;

    this.pannerNode = ctx.createPanner();
    this.pannerNode.panningModel = 'HRTF';
    this.pannerNode.distanceModel = options.rolloffModel;
    this.pannerNode.refDistance = options.refDistance;
    this.pannerNode.maxDistance = options.maxDistance;
    this.pannerNode.rolloffFactor = 1;

    this.gainNode.connect(this.pannerNode);
    this.pannerNode.connect(masterGain);
  }

  setPosition(position: THREE.Vector3): void {
    this.pannerNode.positionX.value = position.x;
    this.pannerNode.positionY.value = position.y;
    this.pannerNode.positionZ.value = position.z;
  }

  setVolume(volume: number): void {
    this.gainNode.gain.setTargetAtTime(
      Math.max(0, Math.min(1, volume)),
      this.ctx.currentTime,
      0.02,
    );
  }

  async play(): Promise<void> {
    if (this.isPlaying) return;
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.bufferSource = this.ctx.createBufferSource();
    this.bufferSource.buffer = this.buffer;
    this.bufferSource.loop = this.options.loop;
    this.bufferSource.connect(this.gainNode);
    this.bufferSource.start(0);
    this.isPlaying = true;

    this.bufferSource.onended = () => {
      this.isPlaying = false;
    };
  }

  pause(): void {
    if (!this.isPlaying) return;
    this.bufferSource?.stop();
    this.isPlaying = false;
  }

  stop(): void {
    this.pause();
    this.bufferSource?.disconnect();
    this.bufferSource = null;
  }

  dispose(): void {
    this.stop();
    this.gainNode.disconnect();
    this.pannerNode.disconnect();
  }
}

// ---------------------------------------------------------------------------
// SpatialAudioSystem
// ---------------------------------------------------------------------------

export class SpatialAudioSystem {
  private static instance: SpatialAudioSystem | null = null;

  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sources = new Map<string, AudioSourceNode>();
  private bufferCache = new Map<string, AudioBuffer>();

  private constructor() {}

  static get(): SpatialAudioSystem {
    if (!SpatialAudioSystem.instance) {
      SpatialAudioSystem.instance = new SpatialAudioSystem();
    }
    return SpatialAudioSystem.instance;
  }

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext({ latencyHint: 'interactive', sampleRate: 44100 });
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 1.0;
      this.masterGain.connect(this.ctx.destination);
      log.info('SpatialAudioSystem AudioContext created');
    }
    return this.ctx;
  }

  setMasterVolume(volume: number): void {
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, volume)),
        this.getCtx().currentTime,
        0.05,
      );
    }
  }

  /** Call every frame with the active camera's world position and forward direction. */
  setListenerTransform(position: THREE.Vector3, forward: THREE.Vector3): void {
    const ctx = this.getCtx();
    const l = ctx.listener;
    if (l.positionX) {
      l.positionX.value = position.x;
      l.positionY.value = position.y;
      l.positionZ.value = position.z;
      l.forwardX.value = forward.x;
      l.forwardY.value = forward.y;
      l.forwardZ.value = forward.z;
    } else {
      // Safari / older WebKit fallback
      l.setPosition(position.x, position.y, position.z);
      l.setOrientation(forward.x, forward.y, forward.z, 0, 1, 0);
    }
  }

  async loadBuffer(url: string): Promise<AudioBuffer> {
    if (this.bufferCache.has(url)) return this.bufferCache.get(url)!;
    const ctx = this.getCtx();
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    this.bufferCache.set(url, audioBuffer);
    return audioBuffer;
  }

  async createSource(
    url: string,
    options: SpatialSourceOptions = {},
  ): Promise<AudioSourceHandle> {
    const ctx = this.getCtx();
    const buffer = await this.loadBuffer(url);
    const resolved: Required<SpatialSourceOptions> = {
      loop: options.loop ?? false,
      rolloffModel: options.rolloffModel ?? 'inverse',
      refDistance: options.refDistance ?? 1,
      maxDistance: options.maxDistance ?? 100,
      volume: options.volume ?? 1,
    };
    const node = new AudioSourceNode(ctx, buffer, this.masterGain!, resolved);
    this.sources.set(node.id, node);
    return node;
  }

  removeSource(id: string): void {
    const src = this.sources.get(id);
    if (src) {
      src.dispose();
      this.sources.delete(id);
    }
  }

  async suspend(): Promise<void> {
    await this.ctx?.suspend();
  }

  async resume(): Promise<void> {
    await this.ctx?.resume();
  }

  dispose(): void {
    this.sources.forEach((s) => s.dispose());
    this.sources.clear();
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    SpatialAudioSystem.instance = null;
  }
}
