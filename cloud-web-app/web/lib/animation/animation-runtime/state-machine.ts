/**
 * Animation System - split runtime modules.
 *
 * Animation player, state machine, timeline, and hooks are separated so Studio
 * can lazy-load only the animation layer needed by each editor surface.
 */

import { EventEmitter } from 'events';
import { AnimationPlayer } from './player';
import type { AnimationClipData, AnimationLayer, AnimationState, AnimationTransition } from './types';

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
