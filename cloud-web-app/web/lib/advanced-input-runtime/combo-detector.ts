/**
 * Advanced Input System - split runtime modules.
 *
 * Keep input runtime isolated from public route shells; Studio/game surfaces can
 * lazy-load the barrel when they need keyboard, mouse, touch, or gamepad input.
 */

import type { InputAction, InputCombo } from './types';

export class ComboDetector {
  private combos: InputCombo[] = [];
  private activeSequences: Map<InputCombo, { step: number; lastTime: number }> = new Map();
  
  addCombo(combo: InputCombo): void {
    this.combos.push(combo);
  }
  
  removeCombo(name: string): void {
    this.combos = this.combos.filter(c => c.name !== name);
    for (const combo of this.combos) {
      if (combo.name === name) {
        this.activeSequences.delete(combo);
      }
    }
  }
  
  processInput(action: string): void {
    const now = Date.now();
    
    for (const combo of this.combos) {
      let state = this.activeSequences.get(combo);
      
      if (!state) {
        // Check if this action starts the combo
        if (combo.steps[0].action === action) {
          this.activeSequences.set(combo, { step: 1, lastTime: now });
        }
        continue;
      }
      
      const currentStep = combo.steps[state.step];
      
      // Check timeout
      if (now - state.lastTime > currentStep.maxDelay) {
        this.activeSequences.delete(combo);
        
        // Check if this action restarts the combo
        if (combo.steps[0].action === action) {
          this.activeSequences.set(combo, { step: 1, lastTime: now });
        }
        continue;
      }
      
      // Check if action matches
      if (currentStep.action === action) {
        state.step++;
        state.lastTime = now;
        
        // Check if combo complete
        if (state.step >= combo.steps.length) {
          combo.onComplete();
          this.activeSequences.delete(combo);
        }
      }
    }
  }
  
  reset(): void {
    this.activeSequences.clear();
  }
}

// ============================================================================
// GESTURE RECOGNIZER
// ============================================================================
