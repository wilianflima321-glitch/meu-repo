/**
 * Aethel Engine - Entry Point
 * 
 * Engine principal com:
 * - Unified API
 * - System initialization
 * - Update loop
 * - Event coordination
 * - State management
 * - Module exports
 * 
 * @module lib/engine/aethel-engine
 */

'use client';

import React, { createContext, useContext, useRef, useEffect, useState, type ReactNode } from 'react';
import { EventEmitter } from 'events';

// ============================================================================
// IMPORTS - All Engine Systems (using defaults where available)
// ============================================================================

// Core Systems
import { SceneSerializer } from '../scene/scene-serializer';
import { AssetImporter } from '../assets/asset-importer';
import AnimationDefaults, { AnimationState, AnimationStateMachine, useAnimationPlayer } from '../animation/animation-system';
import MaterialDefaults, { MaterialEditor, MaterialFactory, useMaterialEditor } from '../materials/material-editor';

// Environment
import TerrainDefaults, { TerrainManager, TerrainMesh, useTerrainManager } from '../terrain/terrain-system';
import ParticleDefaults, { ParticleEmitter, useParticleSystem } from '../particles/advanced-particle-system';
import AudioDefaults, { SpatialAudioManager, AudioSource, useSpatialAudio } from '../audio/spatial-audio-system';

// Gameplay
import PhysicsDefaults, { PhysicsWorld, RigidBody, CollisionDetector, usePhysics } from '../physics/physics-system';
import InputDefaults, { InputManager, InputAction, useInputManager } from '../input/input-manager';
import GameStateDefaults, { GameStateManager, useGameState } from '../state/game-state-manager';
import QuestDefaults, { QuestManager, QuestBuilder, useQuests } from '../quests/quest-system';
import InventoryDefaults, { Inventory, EquipmentManager, ItemRegistry, useInventory } from '../inventory/inventory-system';

// AI & Behavior
import BehaviorTreeDefaults, { BehaviorTree, AIAgent, useAI } from '../ai/behavior-tree-system';
import DialogueDefaults, { DialogueManager, DialogueBuilder, useDialogue } from '../dialogue/dialogue-system';
import AchievementDefaults, { AchievementManager, AchievementBuilder, useAchievements } from '../achievements/achievement-system';

// Rendering & Post-Processing
import PostProcessingDefaults, { EffectComposer, BloomPass, usePostProcessing } from '../postprocessing/post-processing-system';

// UI & Localization
import UIDefaults, { UIManager } from '../ui/ui-framework';
import LocalizationDefaults, { LocalizationManager, useLocalization } from '../localization/localization-system';

// Streaming & Level Management
import StreamingDefaults, { LevelStreamingManager, AssetCache, useLevelStreaming } from '../streaming/level-streaming-system';

// Camera & Cinematics
import CameraDefaults, { CameraController, useCameraController } from '../camera/camera-system';
import CutsceneDefaults, { CutscenePlayer, CutsceneManager, CutsceneBuilder, useCutscene } from '../cutscene/cutscene-system';

// Networking
import NetworkDefaults, { NetworkManager } from '../networking/multiplayer-system';

// Debug & Development
import DebugDefaults, { DebugConsole, PerformanceMonitor, StatsOverlay } from '../debug/debug-console';
import ProfilerDefaults, { Profiler, Timeline } from '../debug/profiler-system';
import InspectorDefaults, { ObjectInspector } from '../debug/object-inspector';
import ReplayDefaults, { ReplayManager, ReplayRecorder, ReplayPlayer } from '../replay/replay-system';

// Plugins
import PluginDefaults, { PluginLoader } from '../plugins/plugin-system';

// ECS & Prefabs
import ECSDefaults, { EntityManager, ComponentRegistry, PrefabManager } from '../ecs/prefab-component-system';

// Events
import EventDefaults, { EventBus, EventChannel } from '../events/event-bus-system';

// Visual Scripting
import VisualScriptDefaults, { VisualScriptRuntime } from '../visual-script/runtime';

// ============================================================================
// TYPES
// ============================================================================

export interface EngineConfig {
  name: string;
  version: string;
  debug: boolean;
  targetFPS: number;
  fixedTimestep: number;
  maxDeltaTime: number;
  autoStart: boolean;
}

export interface EngineState {
  isRunning: boolean;
  isPaused: boolean;
  frameCount: number;
  deltaTime: number;
  totalTime: number;
  fps: number;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const DEFAULT_CONFIG: EngineConfig = {
  name: 'Aethel Engine',
  version: '1.0.0',
  debug: process.env.NODE_ENV === 'development',
  targetFPS: 60,
  fixedTimestep: 1 / 60,
  maxDeltaTime: 0.1,
  autoStart: true,
};

// ============================================================================
// AETHEL ENGINE CLASS
// ============================================================================

export class AethelEngine extends EventEmitter {
  private static instance: AethelEngine | null = null;
  
  private config: EngineConfig;
  private state: EngineState;
  private animationFrameId: number | null = null;
  private lastTime = 0;
  private accumulator = 0;
  private fpsAccumulator = 0;
  private fpsFrameCount = 0;
  
  // Subsystems (initialized on demand)
  private _eventBus: EventBus | null = null;
  private _debugConsole: DebugConsole | null = null;
  private _profiler: Profiler | null = null;
  
  constructor(config: Partial<EngineConfig> = {}) {
    super();
    
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.state = {
      isRunning: false,
      isPaused: false,
      frameCount: 0,
      deltaTime: 0,
      totalTime: 0,
      fps: 0,
    };
    
    if (this.config.debug) {
      console.log(`[${this.config.name}] v${this.config.version} initialized`);
    }
  }
  
  static getInstance(config?: Partial<EngineConfig>): AethelEngine {
    if (!AethelEngine.instance) {
      AethelEngine.instance = new AethelEngine(config);
    }
    return AethelEngine.instance;
  }
  
  static resetInstance(): void {
    if (AethelEngine.instance) {
      AethelEngine.instance.stop();
      AethelEngine.instance = null;
    }
  }
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  start(): void {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    this.state.isPaused = false;
    this.lastTime = performance.now();
    
    this.emit('start');
    this.loop();
    
    if (this.config.debug) {
      console.log(`[${this.config.name}] Started`);
    }
  }
  
  stop(): void {
    if (!this.state.isRunning) return;
    
    this.state.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.emit('stop');
    
    if (this.config.debug) {
      console.log(`[${this.config.name}] Stopped`);
    }
  }
  
  pause(): void {
    if (!this.state.isRunning || this.state.isPaused) return;
    
    this.state.isPaused = true;
    this.emit('pause');
  }
  
  resume(): void {
    if (!this.state.isRunning || !this.state.isPaused) return;
    
    this.state.isPaused = false;
    this.lastTime = performance.now();
    this.emit('resume');
  }
  
  // ============================================================================
  // MAIN LOOP
  // ============================================================================
  
  private loop = (): void => {
    if (!this.state.isRunning) return;
    
    const currentTime = performance.now();
    let deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    // Clamp delta time
    if (deltaTime > this.config.maxDeltaTime) {
      deltaTime = this.config.maxDeltaTime;
    }
    
    // Update FPS counter
    this.fpsAccumulator += deltaTime;
    this.fpsFrameCount++;
    if (this.fpsAccumulator >= 1.0) {
      this.state.fps = this.fpsFrameCount / this.fpsAccumulator;
      this.fpsAccumulator = 0;
      this.fpsFrameCount = 0;
    }
    
    if (!this.state.isPaused) {
      this.state.deltaTime = deltaTime;
      this.state.totalTime += deltaTime;
      this.state.frameCount++;
      
      // Fixed timestep update
      this.accumulator += deltaTime;
      while (this.accumulator >= this.config.fixedTimestep) {
        this.emit('fixedUpdate', this.config.fixedTimestep);
        this.accumulator -= this.config.fixedTimestep;
      }
      
      // Regular update
      this.emit('update', deltaTime);
      
      // Late update
      this.emit('lateUpdate', deltaTime);
      
      // Render
      this.emit('render', deltaTime);
    }
    
    this.animationFrameId = requestAnimationFrame(this.loop);
  };
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getConfig(): EngineConfig {
    return { ...this.config };
  }
  
  getState(): EngineState {
    return { ...this.state };
  }
  
  get eventBus(): EventBus {
    if (!this._eventBus) {
      this._eventBus = EventBus.getInstance();
    }
    return this._eventBus;
  }
  
  get debugConsole(): DebugConsole {
    if (!this._debugConsole) {
      this._debugConsole = DebugConsole.getInstance();
    }
    return this._debugConsole;
  }
  
  get profiler(): Profiler {
    if (!this._profiler) {
      this._profiler = Profiler.getInstance();
    }
    return this._profiler;
  }
  
  // ============================================================================
  // DISPOSE
  // ============================================================================
  
  dispose(): void {
    this.stop();
    this.removeAllListeners();
    
    if (this.config.debug) {
      console.log(`[${this.config.name}] Disposed`);
    }
  }
}

// ============================================================================
// REACT CONTEXT
// ============================================================================

interface EngineContextValue {
  engine: AethelEngine;
}

const EngineContext = createContext<EngineContextValue | null>(null);

export interface EngineProviderProps {
  children: ReactNode;
  config?: Partial<EngineConfig>;
}

export function EngineProvider({ children, config }: EngineProviderProps) {
  const engineRef = useRef<AethelEngine | null>(null);
  
  if (!engineRef.current) {
    engineRef.current = new AethelEngine(config);
  }
  
  useEffect(() => {
    const engine = engineRef.current;
    if (engine && engine.getConfig().autoStart) {
      engine.start();
    }
    
    return () => {
      engine?.dispose();
    };
  }, []);
  
  return (
    <EngineContext.Provider value={{ engine: engineRef.current }}>
      {children}
    </EngineContext.Provider>
  );
}

export function useEngine(): AethelEngine {
  const context = useContext(EngineContext);
  if (!context) {
    throw new Error('useEngine must be used within EngineProvider');
  }
  return context.engine;
}

export function useEngineState(): EngineState {
  const engine = useEngine();
  const [state, setState] = useState(engine.getState());
  
  useEffect(() => {
    const handleUpdate = () => setState(engine.getState());
    engine.on('update', handleUpdate);
    return () => {
      engine.off('update', handleUpdate);
    };
  }, [engine]);
  
  return state;
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Animation
export type { AnimationState };
export { AnimationStateMachine, useAnimationPlayer };
export { AnimationDefaults };

// Materials
export { MaterialEditor, MaterialFactory, useMaterialEditor };
export { MaterialDefaults };

// Terrain
export { TerrainManager, TerrainMesh, useTerrainManager };
export { TerrainDefaults };

// Particles
export { ParticleEmitter, useParticleSystem };
export { ParticleDefaults };

// Audio
export { SpatialAudioManager, AudioSource, useSpatialAudio };
export { AudioDefaults };

// Physics
export { PhysicsWorld, RigidBody, CollisionDetector, usePhysics };
export { PhysicsDefaults };

// Input
export type { InputAction };
export { InputManager, useInputManager };
export { InputDefaults };

// Game State
export { GameStateManager, useGameState };
export { GameStateDefaults };

// Quests
export { QuestManager, QuestBuilder, useQuests };
export { QuestDefaults };

// Inventory
export { Inventory, EquipmentManager, ItemRegistry, useInventory };
export { InventoryDefaults };

// AI & Behavior
export { BehaviorTree, AIAgent, useAI };
export { BehaviorTreeDefaults };

// Dialogue
export { DialogueManager, DialogueBuilder, useDialogue };
export { DialogueDefaults };

// Achievements
export { AchievementManager, AchievementBuilder, useAchievements };
export { AchievementDefaults };

// Post-Processing
export { EffectComposer, BloomPass, usePostProcessing };
export { PostProcessingDefaults };

// UI
export { UIManager };
export { UIDefaults };

// Localization
export { LocalizationManager, useLocalization };
export { LocalizationDefaults };

// Streaming
export { LevelStreamingManager, AssetCache, useLevelStreaming };
export { StreamingDefaults };

// Camera
export { CameraController, useCameraController };
export { CameraDefaults };

// Cutscene
export { CutscenePlayer, CutsceneManager, CutsceneBuilder, useCutscene };
export { CutsceneDefaults };

// Network
export { NetworkManager };
export { NetworkDefaults };

// Debug
export { DebugConsole, PerformanceMonitor, StatsOverlay };
export { DebugDefaults };
export { Profiler, Timeline };
export { ProfilerDefaults };
export { ObjectInspector };
export { InspectorDefaults };

// Replay
export { ReplayManager, ReplayRecorder, ReplayPlayer };
export { ReplayDefaults };

// Plugins
export { PluginLoader };
export { PluginDefaults };

// ECS
export { EntityManager, ComponentRegistry, PrefabManager };
export { ECSDefaults };

// Events
export { EventBus, EventChannel };
export { EventDefaults };

// Visual Scripting
export { VisualScriptRuntime };
export { VisualScriptDefaults };

// Scene & Assets
export { SceneSerializer, AssetImporter };

// Default export
export default {
  AethelEngine,
  EngineProvider,
  useEngine,
  useEngineState,
};
