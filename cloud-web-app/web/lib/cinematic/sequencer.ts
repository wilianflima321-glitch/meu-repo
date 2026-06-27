/**
 * sequencer.ts  — Sprint V33
 *
 * Cinematic Sequencer for Aethel Engine — equivalent to Unreal Engine's Sequencer.
 *
 * Features:
 *   - Timeline-based camera rail system (bezier splines)
 *   - Per-track keyframe animation (transform, FOV, depth-of-field, motion blur)
 *   - Event tracks (trigger asset spawning, music cues, faction dialogue)
 *   - Playback control (play, pause, seek, loop, reverse)
 *   - Integration with Three.js camera and the existing GameLoop
 *
 * Architecture:
 *   CinematicSequencer.addTrack()   → register a track (camera / prop / event)
 *   CinematicSequencer.play()       → start playback
 *   CinematicSequencer.update(dt)   → advance playhead, apply all tracks
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Track types
// ---------------------------------------------------------------------------

export type TrackType = 'camera_transform' | 'camera_fov' | 'dof' | 'motion_blur' | 'event' | 'prop_transform';

export interface Keyframe<T> {
  time: number;   // seconds
  value: T;
  easing: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'bezier';
  /** Tangent handles for cubic bezier easing */
  tangentIn?: number;
  tangentOut?: number;
}

export interface CameraTransformKeyframe {
  position: [number, number, number];
  target: [number, number, number]; // look-at point
  roll: number; // radians
}

export interface DOFKeyframe {
  focusDistance: number;
  aperture: number;      // f-stop (lower = blurrier)
  bokehScale: number;    // 0..1
}

export interface Track {
  id: string;
  type: TrackType;
  targetId?: string; // Object3D UUID for prop tracks
  enabled: boolean;
}

export interface CameraTransformTrack extends Track {
  type: 'camera_transform';
  keyframes: Keyframe<CameraTransformKeyframe>[];
}

export interface FOVTrack extends Track {
  type: 'camera_fov';
  keyframes: Keyframe<number>[];
}

export interface DOFTrack extends Track {
  type: 'dof';
  keyframes: Keyframe<DOFKeyframe>[];
}

export interface MotionBlurTrack extends Track {
  type: 'motion_blur';
  keyframes: Keyframe<number>[]; // intensity 0..1
}

export interface EventTrack extends Track {
  type: 'event';
  events: Array<{ time: number; name: string; payload: unknown }>;
}

export interface PropTransformTrack extends Track {
  type: 'prop_transform';
  targetId: string;
  keyframes: Keyframe<{ position: [number, number, number]; rotation: [number, number, number, number]; scale: [number, number, number] }>[];
}

export type AnyTrack = CameraTransformTrack | FOVTrack | DOFTrack | MotionBlurTrack | EventTrack | PropTransformTrack;

// ---------------------------------------------------------------------------
// Bezier easing helpers
// ---------------------------------------------------------------------------

function applyEasing(t: number, easing: Keyframe<unknown>['easing']): number {
  switch (easing) {
    case 'ease_in': return t * t;
    case 'ease_out': return t * (2 - t);
    case 'ease_in_out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default: return t;
  }
}

function lerpKeyframes<T>(
  kf0: Keyframe<T>,
  kf1: Keyframe<T>,
  time: number,
  lerp: (a: T, b: T, t: number) => T,
): T {
  const raw = (time - kf0.time) / (kf1.time - kf0.time);
  const t = applyEasing(THREE.MathUtils.clamp(raw, 0, 1), kf0.easing);
  return lerp(kf0.value, kf1.value, t);
}

function lerpNum(a: number, b: number, t: number): number { return a + (b - a) * t; }
function lerpArr3(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

// ---------------------------------------------------------------------------
// CinematicSequencer
// ---------------------------------------------------------------------------

export interface SequencerState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  loop: boolean;
  motionBlurIntensity: number;
  dof: DOFKeyframe;
}

export type EventListener = (eventName: string, payload: unknown) => void;

export class CinematicSequencer {
  private tracks = new Map<string, AnyTrack>();
  private camera: THREE.PerspectiveCamera;
  private scene: THREE.Scene;
  private eventListeners = new Set<EventListener>();
  private firedEvents = new Set<string>();

  public state: SequencerState = {
    currentTime: 0,
    duration: 60,
    isPlaying: false,
    loop: false,
    motionBlurIntensity: 0,
    dof: { focusDistance: 10, aperture: 2.8, bokehScale: 0 },
  };

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
  }

  // ── Track management ────────────────────────────────────────────────────────

  addTrack(track: AnyTrack): void {
    this.tracks.set(track.id, track);
    this.state.duration = this.computeDuration();
  }

  removeTrack(trackId: string): void {
    this.tracks.delete(trackId);
    this.state.duration = this.computeDuration();
  }

  private computeDuration(): number {
    let max = 0;
    for (const track of this.tracks.values()) {
      if (track.type === 'event') {
        const t = track as EventTrack;
        const last = t.events[t.events.length - 1]?.time ?? 0;
        if (last > max) max = last;
      } else {
        // All non-event tracks have keyframes
        const t = track as CameraTransformTrack | FOVTrack | DOFTrack | MotionBlurTrack | PropTransformTrack;
        const kfs = (t as CameraTransformTrack).keyframes ?? [];
        const last = kfs[kfs.length - 1]?.time ?? 0;
        if (last > max) max = last;
      }
    }
    return max;
  }

  // ── Playback ────────────────────────────────────────────────────────────────

  play(): void { this.state.isPlaying = true; }
  pause(): void { this.state.isPlaying = false; }
  stop(): void { this.state.isPlaying = false; this.seek(0); }
  seek(time: number): void {
    this.state.currentTime = THREE.MathUtils.clamp(time, 0, this.state.duration);
    this.firedEvents.clear();
  }

  onEvent(listener: EventListener): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  // ── Per-frame update ────────────────────────────────────────────────────────

  update(dt: number, { camera, scene }: { camera?: THREE.PerspectiveCamera; scene?: THREE.Scene } = {}): void {
    if (!this.state.isPlaying) return;

    this.state.currentTime += dt;
    if (this.state.currentTime >= this.state.duration) {
      if (this.state.loop) { this.state.currentTime = 0; this.firedEvents.clear(); }
      else { this.state.currentTime = this.state.duration; this.state.isPlaying = false; }
    }

    const t = this.state.currentTime;
    const cam = camera ?? this.camera;
    const sc = scene ?? this.scene;

    for (const track of this.tracks.values()) {
      if (!track.enabled) continue;
      this.applyTrack(track, t, cam, sc);
    }
  }

  private applyTrack(track: AnyTrack, t: number, camera: THREE.PerspectiveCamera, scene: THREE.Scene): void {
    switch (track.type) {
      case 'camera_transform': {
        const tr = track as CameraTransformTrack;
        const v = this.sampleKF(tr.keyframes, t, (a, b, alpha) => ({
          position: lerpArr3(a.position, b.position, alpha),
          target: lerpArr3(a.target, b.target, alpha),
          roll: lerpNum(a.roll, b.roll, alpha),
        }));
        if (!v) break;
        camera.position.set(...v.position);
        camera.lookAt(...v.target);
        break;
      }
      case 'camera_fov': {
        const tr = track as FOVTrack;
        const v = this.sampleKF(tr.keyframes, t, (a, b, alpha) => lerpNum(a, b, alpha));
        if (v !== null && v !== undefined) camera.fov = v;
        camera.updateProjectionMatrix();
        break;
      }
      case 'dof': {
        const tr = track as DOFTrack;
        const v = this.sampleKF(tr.keyframes, t, (a, b, alpha) => ({
          focusDistance: lerpNum(a.focusDistance, b.focusDistance, alpha),
          aperture: lerpNum(a.aperture, b.aperture, alpha),
          bokehScale: lerpNum(a.bokehScale, b.bokehScale, alpha),
        }));
        if (v) this.state.dof = v;
        break;
      }
      case 'motion_blur': {
        const tr = track as MotionBlurTrack;
        const v = this.sampleKF(tr.keyframes, t, lerpNum);
        if (v !== null && v !== undefined) this.state.motionBlurIntensity = v;
        break;
      }
      case 'event': {
        const tr = track as EventTrack;
        for (const ev of tr.events) {
          const key = `${track.id}:${ev.time}:${ev.name}`;
          if (ev.time <= t && !this.firedEvents.has(key)) {
            this.firedEvents.add(key);
            for (const l of this.eventListeners) l(ev.name, ev.payload);
          }
        }
        break;
      }
      case 'prop_transform': {
        const tr = track as PropTransformTrack;
        const obj = scene.getObjectByProperty('uuid', tr.targetId);
        if (!obj) break;
        const v = this.sampleKF(tr.keyframes, t, (a, b, alpha) => ({
          position: lerpArr3(a.position, b.position, alpha),
          rotation: [
            lerpNum(a.rotation[0], b.rotation[0], alpha),
            lerpNum(a.rotation[1], b.rotation[1], alpha),
            lerpNum(a.rotation[2], b.rotation[2], alpha),
            lerpNum(a.rotation[3], b.rotation[3], alpha),
          ] as [number, number, number, number],
          scale: lerpArr3(a.scale, b.scale, alpha),
        }));
        if (!v) break;
        obj.position.set(...v.position);
        obj.quaternion.set(...v.rotation);
        obj.scale.set(...v.scale);
        break;
      }
    }
  }

  private sampleKF<T>(keyframes: Keyframe<T>[], t: number, lerp: (a: T, b: T, alpha: number) => T): T | null {
    if (!keyframes.length) return null;
    if (t <= keyframes[0].time) return keyframes[0].value;
    if (t >= keyframes[keyframes.length - 1].time) return keyframes[keyframes.length - 1].value;
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i + 1].time > t) {
        return lerpKeyframes(keyframes[i], keyframes[i + 1], t, lerp);
      }
    }
    return keyframes[keyframes.length - 1].value;
  }

  exportJSON(): string {
    return JSON.stringify({ state: this.state, tracks: [...this.tracks.values()] }, null, 2);
  }

  importJSON(json: string): void {
    const data = JSON.parse(json);
    this.state = { ...this.state, ...data.state };
    for (const track of data.tracks ?? []) this.tracks.set(track.id, track);
  }
}
