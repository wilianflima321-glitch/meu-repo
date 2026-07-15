/**
 * Advanced Input System - split runtime modules.
 *
 * Keep input runtime isolated from public route shells; Studio/game surfaces can
 * lazy-load the barrel when they need keyboard, mouse, touch, or gamepad input.
 */

import type { GestureConfig } from './types';

export class GestureRecognizer {
  private gestures: Map<string, GestureConfig> = new Map();
  private callbacks: Map<string, ((data: unknown) => void)[]> = new Map();
  
  private touchStart: Map<number, { x: number; y: number; time: number }> = new Map();
  private lastTapTime: number = 0;
  private tapCount: number = 0;
  
  registerGesture(name: string, config: GestureConfig): void {
    this.gestures.set(name, config);
    this.callbacks.set(name, []);
  }
  
  onGesture(name: string, callback: (data: unknown) => void): void {
    const callbacks = this.callbacks.get(name);
    if (callbacks) {
      callbacks.push(callback);
    }
  }
  
  processTouchStart(touches: Map<number, { x: number; y: number }>): void {
    const now = Date.now();
    
    for (const [id, pos] of touches) {
      this.touchStart.set(id, { x: pos.x, y: pos.y, time: now });
    }
  }
  
  processTouchEnd(touches: Map<number, { x: number; y: number }>): void {
    const now = Date.now();
    
    for (const [id, endPos] of touches) {
      const start = this.touchStart.get(id);
      if (!start) continue;
      
      const deltaX = endPos.x - start.x;
      const deltaY = endPos.y - start.y;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      const duration = now - start.time;
      
      // Check each gesture
      for (const [name, config] of this.gestures) {
        if (this.matchesGesture(config, distance, duration, deltaX, deltaY, touches.size)) {
          this.emit(name, { deltaX, deltaY, distance, duration });
        }
      }
      
      this.touchStart.delete(id);
    }
  }
  
  private matchesGesture(
    config: GestureConfig,
    distance: number,
    duration: number,
    deltaX: number,
    deltaY: number,
    fingerCount: number
  ): boolean {
    if (config.fingers && config.fingers !== fingerCount) return false;
    
    switch (config.type) {
      case 'swipe':
        return distance >= (config.minDistance ?? 50) && duration < (config.maxTime ?? 500);
        
      case 'tap':
        return distance < 10 && duration < 200;
        
      case 'hold':
        return distance < 10 && duration >= (config.maxTime ?? 500);
        
      default:
        return false;
    }
  }
  
  private emit(name: string, data: unknown): void {
    const callbacks = this.callbacks.get(name);
    if (callbacks) {
      for (const cb of callbacks) {
        cb(data);
      }
    }
  }
}

// ============================================================================
// INPUT RECORDER
// ============================================================================
