/**
 * Animation System - split runtime modules.
 *
 * Animation player, state machine, timeline, and hooks are separated so Studio
 * can lazy-load only the animation layer needed by each editor surface.
 */

import { EventEmitter } from 'events';
import type { AnimationClipData, AnimationTrack, EasingType, Keyframe, PropertyType } from './types';

export class AnimationTimeline extends EventEmitter {
  private clip: AnimationClipData;
  private tracks: Map<string, AnimationTrack<unknown>> = new Map();
  private selectedTrackId: string | null = null;
  private selectedKeyframeIndex: number | null = null;
  private zoom = 1;
  private scrollX = 0;
  private currentTime = 0;
  private isPlaying = false;
  private playbackSpeed = 1;
  
  constructor(name: string = 'New Animation') {
    super();
    
    this.clip = {
      id: this.generateId(),
      name,
      duration: 5,
      tracks: [],
      loop: false,
      speed: 1,
      blendMode: 'override',
    };
  }
  
  private generateId(): string {
    return `timeline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  // Track management
  addTrack<T>(name: string, propertyPath: string, propertyType: PropertyType): AnimationTrack<T> {
    const track: AnimationTrack<T> = {
      id: this.generateId(),
      name,
      propertyPath,
      propertyType,
      keyframes: [],
      enabled: true,
    };
    
    this.tracks.set(track.id, track as AnimationTrack<unknown>);
    this.clip.tracks.push(track as AnimationTrack<unknown>);
    
    this.emit('trackAdded', { track });
    return track;
  }
  
  removeTrack(trackId: string): void {
    this.tracks.delete(trackId);
    this.clip.tracks = this.clip.tracks.filter(t => t.id !== trackId);
    
    if (this.selectedTrackId === trackId) {
      this.selectedTrackId = null;
      this.selectedKeyframeIndex = null;
    }
    
    this.emit('trackRemoved', { trackId });
  }
  
  getTrack<T>(trackId: string): AnimationTrack<T> | undefined {
    return this.tracks.get(trackId) as AnimationTrack<T> | undefined;
  }
  
  getAllTracks(): AnimationTrack<unknown>[] {
    return Array.from(this.tracks.values());
  }
  
  // Keyframe management
  addKeyframe<T>(trackId: string, time: number, value: T, easing: EasingType = 'easeInOutQuad'): Keyframe<T> {
    const track = this.tracks.get(trackId) as AnimationTrack<T> | undefined;
    if (!track) throw new Error(`Track not found: ${trackId}`);
    
    const keyframe: Keyframe<T> = { time, value, easing };
    
    // Insert in sorted order
    const insertIndex = track.keyframes.findIndex(k => k.time > time);
    if (insertIndex === -1) {
      track.keyframes.push(keyframe);
    } else {
      track.keyframes.splice(insertIndex, 0, keyframe);
    }
    
    // Expand duration if needed
    if (time > this.clip.duration) {
      this.clip.duration = time;
    }
    
    this.emit('keyframeAdded', { trackId, keyframe });
    return keyframe;
  }
  
  removeKeyframe(trackId: string, keyframeIndex: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    
    track.keyframes.splice(keyframeIndex, 1);
    
    if (this.selectedTrackId === trackId && this.selectedKeyframeIndex === keyframeIndex) {
      this.selectedKeyframeIndex = null;
    }
    
    this.emit('keyframeRemoved', { trackId, keyframeIndex });
  }
  
  moveKeyframe(trackId: string, keyframeIndex: number, newTime: number): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    
    const keyframe = track.keyframes[keyframeIndex];
    if (!keyframe) return;
    
    keyframe.time = Math.max(0, newTime);
    
    // Re-sort keyframes
    track.keyframes.sort((a, b) => a.time - b.time);
    
    // Update selection index if needed
    if (this.selectedTrackId === trackId) {
      this.selectedKeyframeIndex = track.keyframes.indexOf(keyframe);
    }
    
    this.emit('keyframeMoved', { trackId, keyframe, newTime });
  }
  
  updateKeyframeValue<T>(trackId: string, keyframeIndex: number, value: T): void {
    const track = this.tracks.get(trackId) as AnimationTrack<T> | undefined;
    if (!track) return;
    
    const keyframe = track.keyframes[keyframeIndex];
    if (!keyframe) return;
    
    keyframe.value = value;
    
    this.emit('keyframeUpdated', { trackId, keyframeIndex, value });
  }
  
  updateKeyframeEasing(trackId: string, keyframeIndex: number, easing: EasingType): void {
    const track = this.tracks.get(trackId);
    if (!track) return;
    
    const keyframe = track.keyframes[keyframeIndex];
    if (!keyframe) return;
    
    keyframe.easing = easing;
    
    this.emit('keyframeUpdated', { trackId, keyframeIndex, easing });
  }
  
  // Selection
  selectTrack(trackId: string | null): void {
    this.selectedTrackId = trackId;
    this.selectedKeyframeIndex = null;
    this.emit('selectionChanged', { trackId, keyframeIndex: null });
  }
  
  selectKeyframe(trackId: string, keyframeIndex: number): void {
    this.selectedTrackId = trackId;
    this.selectedKeyframeIndex = keyframeIndex;
    this.emit('selectionChanged', { trackId, keyframeIndex });
  }
  
  getSelection(): { trackId: string | null; keyframeIndex: number | null } {
    return {
      trackId: this.selectedTrackId,
      keyframeIndex: this.selectedKeyframeIndex,
    };
  }
  
  // Playback
  play(): void {
    this.isPlaying = true;
    this.emit('play');
  }
  
  pause(): void {
    this.isPlaying = false;
    this.emit('pause');
  }
  
  stop(): void {
    this.isPlaying = false;
    this.currentTime = 0;
    this.emit('stop');
  }
  
  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.clip.duration));
    this.emit('seek', { time: this.currentTime });
  }
  
  update(deltaTime: number): void {
    if (!this.isPlaying) return;
    
    this.currentTime += deltaTime * this.playbackSpeed;
    
    if (this.currentTime >= this.clip.duration) {
      if (this.clip.loop) {
        this.currentTime %= this.clip.duration;
        this.emit('loop');
      } else {
        this.currentTime = this.clip.duration;
        this.isPlaying = false;
        this.emit('complete');
      }
    }
    
    this.emit('timeUpdate', { time: this.currentTime });
  }
  
  // Getters/Setters
  getCurrentTime(): number { return this.currentTime; }
  getDuration(): number { return this.clip.duration; }
  getIsPlaying(): boolean { return this.isPlaying; }
  
  setDuration(duration: number): void {
    this.clip.duration = Math.max(0.1, duration);
    this.emit('durationChanged', { duration: this.clip.duration });
  }
  
  setLoop(loop: boolean): void {
    this.clip.loop = loop;
  }
  
  setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }
  
  // Zoom/Scroll
  setZoom(zoom: number): void {
    this.zoom = Math.max(0.1, Math.min(10, zoom));
    this.emit('zoomChanged', { zoom: this.zoom });
  }
  
  setScrollX(scrollX: number): void {
    this.scrollX = Math.max(0, scrollX);
    this.emit('scrollChanged', { scrollX: this.scrollX });
  }
  
  getZoom(): number { return this.zoom; }
  getScrollX(): number { return this.scrollX; }
  
  // Export
  getClip(): AnimationClipData {
    return { ...this.clip, tracks: [...this.clip.tracks] };
  }
  
  toJSON(): string {
    return JSON.stringify(this.clip, null, 2);
  }
  
  static fromJSON(json: string): AnimationTimeline {
    const data = JSON.parse(json) as AnimationClipData;
    const timeline = new AnimationTimeline(data.name);
    
    timeline.clip = data;
    for (const track of data.tracks) {
      timeline.tracks.set(track.id, track);
    }
    
    return timeline;
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================
