/**
 * Animation System - split runtime modules.
 *
 * Animation player, state machine, timeline, and hooks are separated so Studio
 * can lazy-load only the animation layer needed by each editor surface.
 */

// @aethel-heavy-async-boundary Studio/animation runtime; do not import from public route shells.
import { logger } from '@/lib/observability/logger';
import { EventEmitter } from 'events';
import * as THREE from 'three';
import { EasingFunctions } from './easing';
import type { AnimationClipData, AnimationTrack, PropertyType } from './types';

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
      logger.warn(`Animation clip not found: ${clipId}`);
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
