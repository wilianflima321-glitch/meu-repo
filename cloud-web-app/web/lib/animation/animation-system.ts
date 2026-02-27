/**
 * Animation System - Sistema de Animação Completo
 * 
 * Sistema profissional de animação com suporte a:
 * - Timeline com keyframes
 * - Curvas de easing
 * - Blending de animações
 * - Animation State Machine
 * - Skeletal animations
 * - Procedural animations
 * 
 * @module lib/animation/animation-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

import type {
  AnimationClipData,
  AnimationLayer,
  AnimationState,
  AnimationTrack,
  AnimationTransition,
  EasingType,
  Keyframe,
  PropertyType,
} from './animation-system.types';
import { EasingFunctions } from './animation-system.easing';

export type {
  AnimationClipData,
  AnimationLayer,
  AnimationState,
  AnimationTrack,
  AnimationTransition,
  EasingType,
  Keyframe,
  PropertyType,
} from './animation-system.types';

export { EasingFunctions } from './animation-system.easing';

// ============================================================================
// ANIMATION PLAYER
// ============================================================================

export class AnimationPlayer extends EventEmitter {
  private clips: Map<string, AnimationClipData> = new Map();
  private activeClips: Map<string, {
    clip: AnimationClipData;
    time: number;
    weight: number;
    playing: boolean;
    speed: number;
  }> = new Map();
  
  private target: Record<string, unknown>;
  private isPlaying = false;
  private globalSpeed = 1;
  
  constructor(target: Record<string, unknown>) {
    super();
    this.target = target;
  }
  
  // Register a clip
  registerClip(clip: AnimationClipData): void {
    this.clips.set(clip.id, clip);
  }
  
  // Remove a clip
  removeClip(clipId: string): void {
    this.clips.delete(clipId);
    this.activeClips.delete(clipId);
  }
  
  // Play a clip
  play(clipId: string, options?: { 
    weight?: number; 
    speed?: number; 
    from?: number;
    fadeIn?: number;
  }): void {
    const clip = this.clips.get(clipId);
    if (!clip) {
      console.warn(`Animation clip not found: ${clipId}`);
      return;
    }
    
    const weight = options?.weight ?? 1;
    const speed = options?.speed ?? clip.speed;
    const from = options?.from ?? 0;
    const fadeIn = options?.fadeIn ?? 0;
    
    this.activeClips.set(clipId, {
      clip,
      time: from,
      weight: fadeIn > 0 ? 0 : weight,
      playing: true,
      speed,
    });
    
    // Handle fade in
    if (fadeIn > 0) {
      this.fadeWeight(clipId, weight, fadeIn);
    }
    
    this.emit('play', { clipId, from });
  }
  
  // Stop a clip
  stop(clipId: string, fadeOut = 0): void {
    const active = this.activeClips.get(clipId);
    if (!active) return;
    
    if (fadeOut > 0) {
      this.fadeWeight(clipId, 0, fadeOut).then(() => {
        this.activeClips.delete(clipId);
        this.emit('stop', { clipId });
      });
    } else {
      this.activeClips.delete(clipId);
      this.emit('stop', { clipId });
    }
  }
  
  // Pause/resume
  pause(clipId?: string): void {
    if (clipId) {
      const active = this.activeClips.get(clipId);
      if (active) active.playing = false;
    } else {
      this.isPlaying = false;
    }
    this.emit('pause', { clipId });
  }
  
  resume(clipId?: string): void {
    if (clipId) {
      const active = this.activeClips.get(clipId);
      if (active) active.playing = true;
    } else {
      this.isPlaying = true;
    }
    this.emit('resume', { clipId });
  }
  
  // Seek to time
  seek(clipId: string, time: number): void {
    const active = this.activeClips.get(clipId);
    if (active) {
      active.time = Math.max(0, Math.min(time, active.clip.duration));
    }
  }
  
  // Fade weight
  async fadeWeight(clipId: string, targetWeight: number, duration: number): Promise<void> {
    const active = this.activeClips.get(clipId);
    if (!active) return;
    
    const startWeight = active.weight;
    const startTime = performance.now();
    
    return new Promise((resolve) => {
      const update = () => {
        const elapsed = (performance.now() - startTime) / 1000;
        const t = Math.min(elapsed / duration, 1);
        
        const current = this.activeClips.get(clipId);
        if (!current) {
          resolve();
          return;
        }
        
        current.weight = startWeight + (targetWeight - startWeight) * t;
        
        if (t < 1) {
          requestAnimationFrame(update);
        } else {
          resolve();
        }
      };
      
      requestAnimationFrame(update);
    });
  }
  
  // Crossfade between clips
  async crossfade(fromClipId: string, toClipId: string, duration: number): Promise<void> {
    this.play(toClipId, { weight: 0 });
    
    await Promise.all([
      this.fadeWeight(fromClipId, 0, duration),
      this.fadeWeight(toClipId, 1, duration),
    ]);
    
    this.stop(fromClipId);
  }
  
  // Update all active animations
  update(deltaTime: number): void {
    if (!this.isPlaying && this.activeClips.size === 0) return;
    
    // Reset properties for blending
    const propertyValues: Map<string, { value: unknown; weight: number }[]> = new Map();
    
    for (const [clipId, active] of this.activeClips) {
      if (!active.playing) continue;
      
      // Update time
      active.time += deltaTime * active.speed * this.globalSpeed;
      
      // Handle looping
      if (active.time >= active.clip.duration) {
        if (active.clip.loop) {
          active.time %= active.clip.duration;
          this.emit('loop', { clipId });
        } else {
          active.time = active.clip.duration;
          active.playing = false;
          this.emit('complete', { clipId });
        }
      }
      
      // Evaluate tracks
      for (const track of active.clip.tracks) {
        if (!track.enabled) continue;
        
        const value = this.evaluateTrack(track, active.time);
        
        if (!propertyValues.has(track.propertyPath)) {
          propertyValues.set(track.propertyPath, []);
        }
        
        propertyValues.get(track.propertyPath)!.push({
          value,
          weight: active.weight,
        });
      }
    }
    
    // Apply blended values
    for (const [path, values] of propertyValues) {
      const blended = this.blendValues(values);
      this.setProperty(path, blended);
    }
  }
  
  private evaluateTrack(track: AnimationTrack<unknown>, time: number): unknown {
    const keyframes = track.keyframes;
    if (keyframes.length === 0) return null;
    
    // Find keyframes before and after current time
    let prevKey = keyframes[0];
    let nextKey = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (keyframes[i].time <= time && keyframes[i + 1].time >= time) {
        prevKey = keyframes[i];
        nextKey = keyframes[i + 1];
        break;
      }
    }
    
    // If at or past last keyframe
    if (time >= nextKey.time) {
      return nextKey.value;
    }
    
    // Interpolate
    const duration = nextKey.time - prevKey.time;
    const t = duration > 0 ? (time - prevKey.time) / duration : 0;
    const easedT = EasingFunctions[prevKey.easing](t);
    
    return this.interpolateValue(
      prevKey.value,
      nextKey.value,
      easedT,
      track.propertyType
    );
  }
  
  private interpolateValue(
    a: unknown,
    b: unknown,
    t: number,
    type: PropertyType
  ): unknown {
    switch (type) {
      case 'number':
        return (a as number) + ((b as number) - (a as number)) * t;
        
      case 'vector2': {
        const va = a as { x: number; y: number };
        const vb = b as { x: number; y: number };
        return {
          x: va.x + (vb.x - va.x) * t,
          y: va.y + (vb.y - va.y) * t,
        };
      }
      
      case 'vector3': {
        const v3a = a as { x: number; y: number; z: number };
        const v3b = b as { x: number; y: number; z: number };
        return {
          x: v3a.x + (v3b.x - v3a.x) * t,
          y: v3a.y + (v3b.y - v3a.y) * t,
          z: v3a.z + (v3b.z - v3a.z) * t,
        };
      }
      
      case 'quaternion': {
        const qa = a as { x: number; y: number; z: number; w: number };
        const qb = b as { x: number; y: number; z: number; w: number };
        // Slerp
        const quatA = new THREE.Quaternion(qa.x, qa.y, qa.z, qa.w);
        const quatB = new THREE.Quaternion(qb.x, qb.y, qb.z, qb.w);
        quatA.slerp(quatB, t);
        return { x: quatA.x, y: quatA.y, z: quatA.z, w: quatA.w };
      }
      
      case 'color': {
        const ca = a as { r: number; g: number; b: number };
        const cb = b as { r: number; g: number; b: number };
        return {
          r: ca.r + (cb.r - ca.r) * t,
          g: ca.g + (cb.g - ca.g) * t,
          b: ca.b + (cb.b - ca.b) * t,
        };
      }
      
      case 'boolean':
        return t < 0.5 ? a : b;
        
      default:
        return t < 0.5 ? a : b;
    }
  }
  
  private blendValues(values: { value: unknown; weight: number }[]): unknown {
    if (values.length === 0) return null;
    if (values.length === 1) return values[0].value;
    
    // Normalize weights
    const totalWeight = values.reduce((sum, v) => sum + v.weight, 0);
    if (totalWeight === 0) return values[0].value;
    
    // Simple weighted average for numbers
    if (typeof values[0].value === 'number') {
      let result = 0;
      for (const v of values) {
        result += (v.value as number) * (v.weight / totalWeight);
      }
      return result;
    }
    
    // For other types, use highest weight
    let maxWeight = 0;
    let result = values[0].value;
    for (const v of values) {
      if (v.weight > maxWeight) {
        maxWeight = v.weight;
        result = v.value;
      }
    }
    return result;
  }
  
  private setProperty(path: string, value: unknown): void {
    const parts = path.split('.');
    let obj: Record<string, unknown> = this.target as Record<string, unknown>;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const next = obj[parts[i]];
      if (!next || typeof next !== 'object') return;
      obj = next as Record<string, unknown>;
    }
    
    const lastPart = parts[parts.length - 1];
    const target = obj[lastPart];
    
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Handle vector/color objects
      if ('x' in value && 'y' in value) {
        if (target instanceof THREE.Vector3) {
          const v = value as { x: number; y: number; z?: number };
          target.set(v.x, v.y, v.z ?? 0);
        } else if (target instanceof THREE.Vector2) {
          const v = value as { x: number; y: number };
          target.set(v.x, v.y);
        } else if (target instanceof THREE.Quaternion) {
          const q = value as { x: number; y: number; z: number; w: number };
          target.set(q.x, q.y, q.z, q.w);
        } else {
          obj[lastPart] = value;
        }
      } else if ('r' in value && 'g' in value && 'b' in value) {
        if (target instanceof THREE.Color) {
          const c = value as { r: number; g: number; b: number };
          target.setRGB(c.r, c.g, c.b);
        } else {
          obj[lastPart] = value;
        }
      } else {
        obj[lastPart] = value;
      }
    } else {
      obj[lastPart] = value;
    }
  }
  
  // Getters
  getClip(clipId: string): AnimationClipData | undefined {
    return this.clips.get(clipId);
  }
  
  getActiveClips(): string[] {
    return Array.from(this.activeClips.keys());
  }
  
  getTime(clipId: string): number {
    return this.activeClips.get(clipId)?.time ?? 0;
  }
  
  getProgress(clipId: string): number {
    const active = this.activeClips.get(clipId);
    if (!active) return 0;
    return active.time / active.clip.duration;
  }
  
  isClipPlaying(clipId: string): boolean {
    return this.activeClips.get(clipId)?.playing ?? false;
  }
  
  setGlobalSpeed(speed: number): void {
    this.globalSpeed = speed;
  }
}

// ============================================================================
// ANIMATION STATE MACHINE
// ============================================================================

export class AnimationStateMachine extends EventEmitter {
  private layers: Map<string, AnimationLayer> = new Map();
  private player: AnimationPlayer;
  private parameters: Map<string, boolean | number | string> = new Map();
  
  constructor(target: Record<string, unknown>) {
    super();
    this.player = new AnimationPlayer(target);
  }
  
  // Layer management
  addLayer(layer: AnimationLayer): void {
    this.layers.set(layer.id, layer);
    
    // Register all clips from states
    for (const state of layer.states) {
      const clip = this.getClipById(state.clipId);
      if (clip) {
        this.player.registerClip(clip);
      }
    }
  }
  
  removeLayer(layerId: string): void {
    this.layers.delete(layerId);
  }
  
  getLayer(layerId: string): AnimationLayer | undefined {
    return this.layers.get(layerId);
  }
  
  // State management
  addState(layerId: string, state: AnimationState): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    layer.states.push(state);
    
    const clip = this.getClipById(state.clipId);
    if (clip) {
      this.player.registerClip(clip);
    }
  }
  
  removeState(layerId: string, stateId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    layer.states = layer.states.filter(s => s.id !== stateId);
  }
  
  // Transition management
  addTransition(layerId: string, transition: AnimationTransition): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    layer.transitions.push(transition);
    layer.transitions.sort((a, b) => b.priority - a.priority);
  }
  
  removeTransition(layerId: string, transitionId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    layer.transitions = layer.transitions.filter(t => t.id !== transitionId);
  }
  
  // Parameter management
  setParameter(name: string, value: boolean | number | string): void {
    this.parameters.set(name, value);
  }
  
  getParameter(name: string): boolean | number | string | undefined {
    return this.parameters.get(name);
  }
  
  setTrigger(name: string): void {
    this.parameters.set(name, true);
    // Auto-reset after one frame
    requestAnimationFrame(() => {
      this.parameters.set(name, false);
    });
  }
  
  // State control
  setState(layerId: string, stateId: string): void {
    const layer = this.layers.get(layerId);
    if (!layer) return;
    
    const state = layer.states.find(s => s.id === stateId);
    if (!state) return;
    
    const currentStateId = layer.currentState;
    const currentState = layer.states.find(s => s.id === currentStateId);
    
    // Call exit callback
    if (currentState?.onExit) {
      currentState.onExit();
    }
    
    // Transition
    if (currentStateId && state.blendDuration > 0) {
      this.player.crossfade(currentState!.clipId, state.clipId, state.blendDuration);
    } else {
      if (currentStateId) {
        this.player.stop(currentState!.clipId);
      }
      this.player.play(state.clipId, {
        speed: state.speed,
      });
    }
    
    layer.currentState = stateId;
    
    // Call enter callback
    if (state.onEnter) {
      state.onEnter();
    }
    
    this.emit('stateChanged', { layerId, fromState: currentStateId, toState: stateId });
  }
  
  getCurrentState(layerId: string): string | null {
    return this.layers.get(layerId)?.currentState ?? null;
  }
  
  // Update
  update(deltaTime: number): void {
    // Check transitions for all layers
    for (const [layerId, layer] of this.layers) {
      if (!layer.currentState) {
        // Start with first state if none active
        if (layer.states.length > 0) {
          this.setState(layerId, layer.states[0].id);
        }
        continue;
      }
      
      // Check transitions
      for (const transition of layer.transitions) {
        if (transition.fromState !== layer.currentState) continue;
        
        if (transition.condition()) {
          this.setState(layerId, transition.toState);
          break;
        }
      }
      
      // Call update callback on current state
      const currentState = layer.states.find(s => s.id === layer.currentState);
      if (currentState?.onUpdate) {
        const time = this.player.getTime(currentState.clipId);
        const progress = this.player.getProgress(currentState.clipId);
        currentState.onUpdate(time, progress);
      }
    }
    
    // Update animation player
    this.player.update(deltaTime);
  }
  
  // Stub for getting clip by ID - should be connected to asset system
  private clipRegistry: Map<string, AnimationClipData> = new Map();
  
  registerClip(clip: AnimationClipData): void {
    this.clipRegistry.set(clip.id, clip);
  }
  
  private getClipById(clipId: string): AnimationClipData | undefined {
    return this.clipRegistry.get(clipId);
  }
  
  getPlayer(): AnimationPlayer {
    return this.player;
  }
}

// ============================================================================
// TIMELINE
// ============================================================================

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

import { useState, useCallback, useRef, useEffect } from 'react';

export function useAnimationPlayer(target: Record<string, unknown>) {
  const playerRef = useRef<AnimationPlayer>(new AnimationPlayer(target));
  const [activeClips, setActiveClips] = useState<string[]>([]);
  
  const play = useCallback((clipId: string, options?: Parameters<AnimationPlayer['play']>[1]) => {
    playerRef.current.play(clipId, options);
    setActiveClips(playerRef.current.getActiveClips());
  }, []);
  
  const stop = useCallback((clipId: string, fadeOut?: number) => {
    playerRef.current.stop(clipId, fadeOut);
    setActiveClips(playerRef.current.getActiveClips());
  }, []);
  
  const pause = useCallback((clipId?: string) => {
    playerRef.current.pause(clipId);
  }, []);
  
  const resume = useCallback((clipId?: string) => {
    playerRef.current.resume(clipId);
  }, []);
  
  const registerClip = useCallback((clip: AnimationClipData) => {
    playerRef.current.registerClip(clip);
  }, []);
  
  const update = useCallback((deltaTime: number) => {
    playerRef.current.update(deltaTime);
  }, []);
  
  return {
    player: playerRef.current,
    activeClips,
    play,
    stop,
    pause,
    resume,
    registerClip,
    update,
  };
}

export function useAnimationTimeline(initialName?: string) {
  const timelineRef = useRef<AnimationTimeline>(new AnimationTimeline(initialName));
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [tracks, setTracks] = useState<AnimationTrack<unknown>[]>([]);
  const [selection, setSelection] = useState<{ trackId: string | null; keyframeIndex: number | null }>({
    trackId: null,
    keyframeIndex: null,
  });
  
  useEffect(() => {
    const timeline = timelineRef.current;
    
    timeline.on('timeUpdate', ({ time }) => setCurrentTime(time));
    timeline.on('play', () => setIsPlaying(true));
    timeline.on('pause', () => setIsPlaying(false));
    timeline.on('stop', () => { setIsPlaying(false); setCurrentTime(0); });
    timeline.on('trackAdded', () => setTracks(timeline.getAllTracks()));
    timeline.on('trackRemoved', () => setTracks(timeline.getAllTracks()));
    timeline.on('keyframeAdded', () => setTracks(timeline.getAllTracks()));
    timeline.on('keyframeRemoved', () => setTracks(timeline.getAllTracks()));
    timeline.on('selectionChanged', ({ trackId, keyframeIndex }) => {
      setSelection({ trackId, keyframeIndex });
    });
    
    return () => {
      timeline.removeAllListeners();
    };
  }, []);
  
  return {
    timeline: timelineRef.current,
    currentTime,
    isPlaying,
    tracks,
    selection,
    play: () => timelineRef.current.play(),
    pause: () => timelineRef.current.pause(),
    stop: () => timelineRef.current.stop(),
    seek: (time: number) => timelineRef.current.seek(time),
    addTrack: <T,>(name: string, path: string, type: PropertyType) => 
      timelineRef.current.addTrack<T>(name, path, type),
    addKeyframe: <T,>(trackId: string, time: number, value: T, easing?: EasingType) =>
      timelineRef.current.addKeyframe(trackId, time, value, easing),
  };
}

const __defaultExport = {
  AnimationPlayer,
  AnimationStateMachine,
  AnimationTimeline,
  EasingFunctions,
};

export default __defaultExport;
