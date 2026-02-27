import { EventEmitter } from 'events';
import { AudioSource } from './audio-source';
import type { AudioGroupConfig } from './audio-manager.types';

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
    destination: AudioNode,
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
          this.audioContext.currentTime + fadeTime,
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
        this.audioContext.currentTime + fadeTime,
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
