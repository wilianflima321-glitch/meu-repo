import { EventEmitter } from 'events';
import type { AudioSourceConfig, Vector3 } from './audio-manager.types';

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

  private _position: Vector3 = { x: 0, y: 0, z: 0 };
  private _velocity: Vector3 = { x: 0, y: 0, z: 0 };

  constructor(
    audioContext: AudioContext,
    config: AudioSourceConfig,
    destination: AudioNode,
  ) {
    super();

    this.id = crypto.randomUUID();
    this.name = config.name;
    this.config = config;
    this.audioContext = audioContext;

    this.gainNode = audioContext.createGain();
    this.gainNode.gain.value = config.volume ?? 1;

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

    this.connectNodes(destination);
    this.playbackRate = config.pitch ?? 1;

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

  setVolume(value: number, fadeTime = 0): void {
    const clampedValue = Math.max(0, Math.min(1, value));

    if (fadeTime > 0) {
      this.gainNode.gain.linearRampToValueAtTime(
        clampedValue,
        this.audioContext.currentTime + fadeTime,
      );
    } else {
      this.gainNode.gain.value = clampedValue;
    }
  }

  getVolume(): number {
    return this.gainNode.gain.value;
  }

  setPitch(value: number): void {
    this.playbackRate = value;
    if (this.sourceNode) {
      this.sourceNode.playbackRate.value = value;
    }
  }

  getPitch(): number {
    return this.playbackRate;
  }

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
  }

  getVelocity(): Vector3 {
    return { ...this._velocity };
  }

  setOrientation(forward: Vector3): void {
    if (this.pannerNode) {
      this.pannerNode.orientationX.value = forward.x;
      this.pannerNode.orientationY.value = forward.y;
      this.pannerNode.orientationZ.value = forward.z;
    }
  }

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
