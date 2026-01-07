import * as THREE from 'three';
import { Track, SequenceConfig, Easings, KeyframeValue } from './sequencer-cinematics';

export interface SequencerState {
  currentTime: number;
  isPlaying: boolean;
  playbackRate: number;
}

export class SequencerRuntime {
  private config: SequenceConfig;
  private tracks: Track[];
  private _currentTime: number = 0;
  private _isPlaying: boolean = false;
  
  // Cache for rapid lookup
  private trackMap: Map<string, Track>;
  
  constructor(config: SequenceConfig, tracks: Track[]) {
    this.config = config;
    this.tracks = tracks;
    this.trackMap = new Map(tracks.map(t => [t.id, t]));
  }

  play() {
    this._isPlaying = true;
  }

  pause() {
    this._isPlaying = false;
  }

  stop() {
    this._isPlaying = false;
    this._currentTime = 0;
  }

  update(dt: number, sceneConfig?: { camera?: THREE.Camera, scene?: THREE.Scene }) {
    if (this._isPlaying) {
      this._currentTime += dt * this.config.playbackSpeed;
      if (this.config.loop && this._currentTime > this.config.duration) {
        this._currentTime = 0;
      }
    }
    
    // Apply tracks
    for (const track of this.tracks) {
      if (!track.enabled || track.muted) continue;
      this.applyTrack(track, this._currentTime, sceneConfig);
    }
  }

  private applyTrack(track: Track, time: number, sceneConfig?: { camera?: THREE.Camera, scene?: THREE.Scene }) {
    // Binary search for keyframes could be optimized here
    const keys = track.keyframes;
    if (keys.length === 0) return;

    // Find surrounding keys
    let k1 = keys[0];
    let k2 = keys[0];
    
    for (let i = 0; i < keys.length; i++) {
        if (keys[i].time <= time) {
            k1 = keys[i];
        }
        if (keys[i].time > time) {
            k2 = keys[i];
            break;
        }
    }

    if (k1 === k2) {
        // Exact match or out of bounds
        this.applyValue(track, k1.value, sceneConfig);
        return;
    }

    // Interpolate
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    const blendedValue = this.lerp(k1.value, k2.value, easedT);
    
    this.applyValue(track, blendedValue, sceneConfig);
  }

  private lerp(v1: KeyframeValue, v2: KeyframeValue, t: number): KeyframeValue {
    if (typeof v1 === 'number' && typeof v2 === 'number') {
        return v1 + (v2 - v1) * t;
    }
    if (v1 instanceof THREE.Vector3 && v2 instanceof THREE.Vector3) {
        return v1.clone().lerp(v2, t);
    }
    if (v1 instanceof THREE.Quaternion && v2 instanceof THREE.Quaternion) {
        return v1.clone().slerp(v2, t);
    }
    if (v1 instanceof THREE.Color && v2 instanceof THREE.Color) {
        return v1.clone().lerp(v2, t);
    }
    // Discrete values (boolean, string) switch at 50%
    return t < 0.5 ? v1 : v2;
  }

  private applyValue(track: Track, value: KeyframeValue, sceneConfig?: { camera?: THREE.Camera, scene?: THREE.Scene }) {
      // Integration with Game Engine would actually query Entity ID here
      // For now, assume global objects or provided scene config
      if (track.type === 'camera' && sceneConfig?.camera && track.property === 'fov') {
        if (sceneConfig.camera instanceof THREE.PerspectiveCamera) {
             sceneConfig.camera.fov = value as number;
             sceneConfig.camera.updateProjectionMatrix();
        }
      }
      
      // More property mappings would go here (transform, etc)
      // This bridges the "Data" to the "Engine"
  }
}
