/**
 * Networking & Multiplayer System - split runtime modules.
 *
 * Keep this package Studio/runtime-only. Public surfaces should lazy-load it
 * through explicit boundaries rather than importing the multiplayer barrel.
 */

import type { InputSnapshot } from './types';

export class InputPredictor {
  private inputHistory: InputSnapshot[] = [];
  private maxHistoryLength: number;
  private currentTick = 0;
  
  constructor(maxHistoryLength = 120) {
    this.maxHistoryLength = maxHistoryLength;
  }
  
  recordInput(inputs: Record<string, unknown>, position: { x: number; y: number; z: number }, rotation: { x: number; y: number; z: number; w: number }): InputSnapshot {
    const snapshot: InputSnapshot = {
      tick: this.currentTick++,
      timestamp: Date.now(),
      inputs,
      position,
      rotation,
    };
    
    this.inputHistory.push(snapshot);
    
    // Trim old history
    while (this.inputHistory.length > this.maxHistoryLength) {
      this.inputHistory.shift();
    }
    
    return snapshot;
  }
  
  getInputsAfterTick(tick: number): InputSnapshot[] {
    return this.inputHistory.filter((s) => s.tick > tick);
  }
  
  reconcile(
    serverTick: number,
    serverPosition: { x: number; y: number; z: number },
    serverRotation: { x: number; y: number; z: number; w: number },
    applyInput: (input: Record<string, unknown>, dt: number) => { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } }
  ): { position: { x: number; y: number; z: number }; rotation: { x: number; y: number; z: number; w: number } } {
    // Find the snapshot matching server tick
    const serverSnapshotIndex = this.inputHistory.findIndex((s) => s.tick === serverTick);
    
    if (serverSnapshotIndex === -1) {
      return { position: serverPosition, rotation: serverRotation };
    }
    
    // Check if reconciliation needed
    const serverSnapshot = this.inputHistory[serverSnapshotIndex];
    const positionError = Math.sqrt(
      Math.pow(serverPosition.x - serverSnapshot.position.x, 2) +
      Math.pow(serverPosition.y - serverSnapshot.position.y, 2) +
      Math.pow(serverPosition.z - serverSnapshot.position.z, 2)
    );
    
    if (positionError < 0.01) {
      // No correction needed
      return this.inputHistory[this.inputHistory.length - 1]?.position 
        ? { position: this.inputHistory[this.inputHistory.length - 1].position, rotation: this.inputHistory[this.inputHistory.length - 1].rotation }
        : { position: serverPosition, rotation: serverRotation };
    }
    
    // Re-simulate from server state
    let currentPos = serverPosition;
    let currentRot = serverRotation;
    
    for (let i = serverSnapshotIndex + 1; i < this.inputHistory.length; i++) {
      const snapshot = this.inputHistory[i];
      const prevSnapshot = this.inputHistory[i - 1];
      const dt = (snapshot.timestamp - prevSnapshot.timestamp) / 1000;
      
      const result = applyInput(snapshot.inputs, dt);
      currentPos = result.position;
      currentRot = result.rotation;
      
      // Update history with corrected positions
      snapshot.position = currentPos;
      snapshot.rotation = currentRot;
    }
    
    return { position: currentPos, rotation: currentRot };
  }
  
  clear(): void {
    this.inputHistory = [];
    this.currentTick = 0;
  }
}

// ============================================================================
// LOBBY SYSTEM
// ============================================================================
