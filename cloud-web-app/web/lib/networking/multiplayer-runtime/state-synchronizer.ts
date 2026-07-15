/**
 * Networking & Multiplayer System - split runtime modules.
 *
 * Keep this package Studio/runtime-only. Public surfaces should lazy-load it
 * through explicit boundaries rather than importing the multiplayer barrel.
 */

import type { SyncMode, SyncedVariable } from './types';

export class StateSynchronizer {
  private syncedVars: Map<string, SyncedVariable> = new Map();
  private dirtyVars: Set<string> = new Set();
  private interpolationBuffer: Map<string, { value: unknown; timestamp: number }[]> = new Map();
  private interpolationDelay: number;
  
  constructor(interpolationDelay = 100) {
    this.interpolationDelay = interpolationDelay;
  }
  
  register(name: string, initialValue: unknown, mode: SyncMode, owner: string): void {
    this.syncedVars.set(name, {
      name,
      value: initialValue,
      mode,
      owner,
      lastUpdate: Date.now(),
    });
    this.interpolationBuffer.set(name, []);
  }
  
  unregister(name: string): void {
    this.syncedVars.delete(name);
    this.interpolationBuffer.delete(name);
  }
  
  set(name: string, value: unknown, localPlayerId: string): void {
    const syncVar = this.syncedVars.get(name);
    if (!syncVar) return;
    
    // Only owner can modify
    if (syncVar.owner !== localPlayerId && syncVar.owner !== 'any') return;
    
    syncVar.value = value;
    syncVar.lastUpdate = Date.now();
    this.dirtyVars.add(name);
  }
  
  get<T>(name: string): T | undefined {
    return this.syncedVars.get(name)?.value as T;
  }
  
  receiveUpdate(name: string, value: unknown, timestamp: number): void {
    const syncVar = this.syncedVars.get(name);
    if (!syncVar) return;
    
    // Add to interpolation buffer
    const buffer = this.interpolationBuffer.get(name);
    if (buffer) {
      buffer.push({ value, timestamp });
      
      // Keep only recent values
      const cutoff = timestamp - this.interpolationDelay * 3;
      while (buffer.length > 1 && buffer[0].timestamp < cutoff) {
        buffer.shift();
      }
    }
    
    // For state mode, update immediately
    if (syncVar.mode === 'state') {
      syncVar.value = value;
      syncVar.lastUpdate = timestamp;
    }
  }
  
  interpolate(currentTime: number): void {
    const targetTime = currentTime - this.interpolationDelay;
    
    for (const [name, buffer] of this.interpolationBuffer) {
      if (buffer.length < 2) continue;
      
      const syncVar = this.syncedVars.get(name);
      if (!syncVar || syncVar.mode === 'state') continue;
      
      // Find surrounding samples
      let from = buffer[0];
      let to = buffer[1];
      
      for (let i = 0; i < buffer.length - 1; i++) {
        if (buffer[i].timestamp <= targetTime && buffer[i + 1].timestamp >= targetTime) {
          from = buffer[i];
          to = buffer[i + 1];
          break;
        }
      }
      
      // Interpolate
      const t = (targetTime - from.timestamp) / (to.timestamp - from.timestamp);
      syncVar.value = this.interpolateValue(from.value, to.value, Math.max(0, Math.min(1, t)));
    }
  }
  
  private interpolateValue(from: unknown, to: unknown, t: number): unknown {
    if (typeof from === 'number' && typeof to === 'number') {
      return from + (to - from) * t;
    }
    
    if (typeof from === 'object' && from !== null && typeof to === 'object' && to !== null) {
      const result: Record<string, unknown> = {};
      
      for (const key of Object.keys(from as Record<string, unknown>)) {
        result[key] = this.interpolateValue(
          (from as Record<string, unknown>)[key],
          (to as Record<string, unknown>)[key],
          t
        );
      }
      
      return result;
    }
    
    return t < 0.5 ? from : to;
  }
  
  getDirtyVars(): Map<string, SyncedVariable> {
    const dirty = new Map<string, SyncedVariable>();
    
    for (const name of this.dirtyVars) {
      const syncVar = this.syncedVars.get(name);
      if (syncVar) {
        dirty.set(name, syncVar);
      }
    }
    
    this.dirtyVars.clear();
    return dirty;
  }
  
  getAllVars(): Map<string, SyncedVariable> {
    return new Map(this.syncedVars);
  }
}

// ============================================================================
// INPUT PREDICTION
// ============================================================================
