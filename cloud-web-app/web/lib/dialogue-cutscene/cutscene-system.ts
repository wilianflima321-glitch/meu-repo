// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';

import {
  isCameraTrackJSON,
  isNamedEventData,
  type CameraKeyframe,
  type Cutscene,
  type CutsceneJSON,
  type CutsceneTrack,
  type SubtitleEntry,
} from './types';

export class CutsceneSystem {
  private cutscenes: Map<string, Cutscene> = new Map();
  private currentCutscene: Cutscene | null = null;
  private currentTime: number = 0;
  private isPlaying: boolean = false;
  private isPaused: boolean = false;

  private camera: THREE.PerspectiveCamera | null = null;
  private scene: THREE.Scene | null = null;

  private activeSubtitles: SubtitleEntry[] = [];
  private activeTracks: Map<CutsceneTrack, boolean> = new Map();

  private onCutsceneStart?: (cutscene: Cutscene) => void;
  private onCutsceneEnd?: (cutscene: Cutscene) => void;
  private onSubtitleChange?: (subtitles: SubtitleEntry[]) => void;
  private onEvent?: (eventName: string, data: unknown) => void;

  private cinematicBarsEnabled: boolean = false;
  private cinematicBarsProgress: number = 0;

  constructor() {}

  setCamera(camera: THREE.PerspectiveCamera): void {
    this.camera = camera;
  }

  setScene(scene: THREE.Scene): void {
    this.scene = scene;
  }

  loadCutscene(cutscene: Cutscene): void {
    this.cutscenes.set(cutscene.id, cutscene);
  }

  loadFromJSON(json: CutsceneJSON): Cutscene {
    const cutscene: Cutscene = {
      id: json.id,
      name: json.name,
      duration: json.duration,
      tracks: json.tracks.map((track: CutsceneTrack) => ({
        ...track,
        data: this.parseTrackData(track.type, track.data),
      })),
      skippable: json.skippable ?? true,
    };

    this.loadCutscene(cutscene);
    return cutscene;
  }

  private parseTrackData(type: string, data: unknown): unknown {
    if (type === 'camera' && isCameraTrackJSON(data)) {
      return data.keyframes?.map((kf) => ({
        ...kf,
        position: new THREE.Vector3(kf.position.x, kf.position.y, kf.position.z),
        lookAt: new THREE.Vector3(kf.lookAt.x, kf.lookAt.y, kf.lookAt.z),
      })) ?? [];
    }
    return data;
  }

  play(cutsceneId: string): boolean {
    const cutscene = this.cutscenes.get(cutsceneId);
    if (!cutscene) return false;

    this.currentCutscene = cutscene;
    this.currentTime = 0;
    this.isPlaying = true;
    this.isPaused = false;
    this.activeTracks.clear();

    this.enableCinematicBars();

    this.onCutsceneStart?.(cutscene);

    return true;
  }

  update(deltaTime: number): void {
    if (!this.isPlaying || this.isPaused || !this.currentCutscene) return;

    this.currentTime += deltaTime;

    if (this.cinematicBarsEnabled && this.cinematicBarsProgress < 1) {
      this.cinematicBarsProgress = Math.min(1, this.cinematicBarsProgress + deltaTime * 2);
    }

    for (const track of this.currentCutscene.tracks) {
      const trackStarted = this.currentTime >= track.startTime;
      const trackEnded = this.currentTime >= track.startTime + track.duration;

      if (trackStarted && !trackEnded) {
        this.processTrack(track, this.currentTime - track.startTime, track.duration);
      } else if (trackEnded && this.activeTracks.has(track)) {
        this.endTrack(track);
      }
    }

    if (this.currentTime >= this.currentCutscene.duration) {
      this.stop();
    }
  }

  private processTrack(track: CutsceneTrack, localTime: number, duration: number): void {
    const t = localTime / duration;

    switch (track.type) {
      case 'camera':
        this.processCameraTrack(track.data as CameraKeyframe[], localTime);
        break;

      case 'animation':
        if (!this.activeTracks.has(track)) {
          this.activeTracks.set(track, true);
          this.onEvent?.('play_animation', track.data);
        }
        break;

      case 'audio':
        if (!this.activeTracks.has(track)) {
          this.activeTracks.set(track, true);
          this.onEvent?.('play_audio', track.data);
        }
        break;

      case 'dialogue':
        if (!this.activeTracks.has(track)) {
          this.activeTracks.set(track, true);
          this.onEvent?.('show_dialogue', track.data);
        }
        break;

      case 'event':
        if (!this.activeTracks.has(track)) {
          this.activeTracks.set(track, true);
          if (isNamedEventData(track.data)) {
            this.onEvent?.(track.data.name, track.data);
          }
        }
        break;

      case 'subtitle':
        this.processSubtitleTrack(track.data as SubtitleEntry[], localTime);
        break;
    }
  }

  private processCameraTrack(keyframes: CameraKeyframe[], time: number): void {
    if (!this.camera || keyframes.length === 0) return;

    let prevKf = keyframes[0];
    let nextKf = keyframes[0];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].time <= time && keyframes[i + 1].time > time) {
        prevKf = keyframes[i];
        nextKf = keyframes[i + 1];
        break;
      }
      if (keyframes[i].time > time) break;
      prevKf = keyframes[i];
      nextKf = keyframes[i];
    }

    if (time >= keyframes[keyframes.length - 1].time) {
      prevKf = keyframes[keyframes.length - 1];
      nextKf = prevKf;
    }

    if (prevKf === nextKf) {
      this.camera.position.copy(prevKf.position);
      this.camera.lookAt(prevKf.lookAt);
      if (prevKf.fov) this.camera.fov = prevKf.fov;
    } else {
      const t = (time - prevKf.time) / (nextKf.time - prevKf.time);
      const easedT = this.applyEasing(t, nextKf.easing || 'linear');

      this.camera.position.lerpVectors(prevKf.position, nextKf.position, easedT);

      const lookAt = prevKf.lookAt.clone().lerp(nextKf.lookAt, easedT);
      this.camera.lookAt(lookAt);

      if (prevKf.fov && nextKf.fov) {
        this.camera.fov = prevKf.fov + (nextKf.fov - prevKf.fov) * easedT;
      }
    }

    this.camera.updateProjectionMatrix();
  }

  private applyEasing(t: number, easing: string): number {
    switch (easing) {
      case 'easeIn': return t * t;
      case 'easeOut': return 1 - (1 - t) * (1 - t);
      case 'easeInOut': return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      default: return t;
    }
  }

  private processSubtitleTrack(subtitles: SubtitleEntry[], time: number): void {
    const active: SubtitleEntry[] = [];

    for (const sub of subtitles) {
      if (time >= sub.startTime && time < sub.endTime) {
        active.push(sub);
      }
    }

    if (JSON.stringify(active) !== JSON.stringify(this.activeSubtitles)) {
      this.activeSubtitles = active;
      this.onSubtitleChange?.(active);
    }
  }

  private endTrack(track: CutsceneTrack): void {
    this.activeTracks.delete(track);

    switch (track.type) {
      case 'audio':
        this.onEvent?.('stop_audio', track.data);
        break;
      case 'dialogue':
        this.onEvent?.('hide_dialogue', track.data);
        break;
    }
  }

  stop(): void {
    if (!this.currentCutscene) return;

    const cutscene = this.currentCutscene;

    for (const track of this.activeTracks.keys()) {
      this.endTrack(track);
    }

    this.isPlaying = false;
    this.currentCutscene = null;
    this.activeSubtitles = [];

    this.disableCinematicBars();

    this.onCutsceneEnd?.(cutscene);
    cutscene.onComplete?.();
  }

  skip(): void {
    if (!this.currentCutscene?.skippable) return;
    this.stop();
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  private enableCinematicBars(): void {
    this.cinematicBarsEnabled = true;
    this.cinematicBarsProgress = 0;
  }

  private disableCinematicBars(): void {
    this.cinematicBarsEnabled = false;
    this.cinematicBarsProgress = 0;
  }

  getCinematicBarsProgress(): number {
    return this.cinematicBarsProgress;
  }

  areCinematicBarsEnabled(): boolean {
    return this.cinematicBarsEnabled;
  }

  isPlaying_(): boolean {
    return this.isPlaying;
  }

  isPaused_(): boolean {
    return this.isPaused;
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getDuration(): number {
    return this.currentCutscene?.duration ?? 0;
  }

  getProgress(): number {
    if (!this.currentCutscene) return 0;
    return this.currentTime / this.currentCutscene.duration;
  }

  getActiveSubtitles(): SubtitleEntry[] {
    return this.activeSubtitles;
  }

  setOnCutsceneStart(callback: (cutscene: Cutscene) => void): void {
    this.onCutsceneStart = callback;
  }

  setOnCutsceneEnd(callback: (cutscene: Cutscene) => void): void {
    this.onCutsceneEnd = callback;
  }

  setOnSubtitleChange(callback: (subtitles: SubtitleEntry[]) => void): void {
    this.onSubtitleChange = callback;
  }

  setOnEvent(callback: (eventName: string, data: unknown) => void): void {
    this.onEvent = callback;
  }
}
