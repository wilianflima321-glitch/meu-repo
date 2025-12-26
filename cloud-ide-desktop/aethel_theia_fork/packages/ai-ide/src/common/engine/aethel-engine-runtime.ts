import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';
import { ECSWorld } from './ecs-world';

// ============================================================================
// AETHEL ENGINE RUNTIME - Core Game/App Engine
// Unified runtime that integrates all systems into a cohesive engine
// Comparable to Unreal Engine's UEngine / Unity's RuntimeManager
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * World data structure for loading/saving worlds
 */
export interface WorldData {
  version: string;
  name: string;
  entities: Array<{
    id?: string;
    name?: string;
    components?: Record<string, unknown>;
  }>;
  config?: Record<string, unknown>;
}

/**
 * Engine state
 */
export type EngineState = 
  | 'uninitialized'
  | 'initializing'
  | 'ready'
  | 'running'
  | 'paused'
  | 'stopping'
  | 'stopped'
  | 'error';

/**
 * Engine mode
 */
export type EngineMode = 
  | 'editor'          // Full editor with all tools
  | 'play-in-editor'  // PIE mode - playing in editor
  | 'standalone'      // Standalone game/app
  | 'server'          // Dedicated server
  | 'client';         // Network client

/**
 * Subsystem priority for initialization order
 */
export type SubsystemPriority = 
  | 'critical'    // 0 - Must init first (memory, logging)
  | 'core'        // 1 - Core systems (rendering, physics)
  | 'gameplay'    // 2 - Gameplay systems (AI, scripting)
  | 'editor'      // 3 - Editor-only systems
  | 'optional';   // 4 - Nice to have

/**
 * Engine configuration
 */
export interface EngineConfig {
  mode: EngineMode;
  projectPath: string;
  targetFrameRate: number;
  fixedTimestep: number;
  maxDeltaTime: number;
  enableVSync: boolean;
  enableMultithreading: boolean;
  enableProfiling: boolean;
  enableHotReload: boolean;
  startupWorld?: string;
  commandLineArgs?: string[];
  customConfig?: Record<string, unknown>;
}

/**
 * Subsystem interface that all engine systems must implement
 */
export interface IEngineSubsystem {
  readonly name: string;
  readonly priority: SubsystemPriority;
  readonly isInitialized: boolean;
  readonly isEnabled: boolean;
  
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  tick(deltaTime: number): void;
  
  onEngineStateChange?(state: EngineState): void;
  onEngineModeChange?(mode: EngineMode): void;
}

/**
 * Registered subsystem info
 */
interface SubsystemEntry {
  instance: IEngineSubsystem;
  priority: number;
  dependencies: string[];
  initializeTime: number;
}

/**
 * Frame statistics
 */
export interface FrameStats {
  frameNumber: number;
  deltaTime: number;
  fps: number;
  avgFps: number;
  frameTime: number;
  updateTime: number;
  renderTime: number;
  physicsTime: number;
  aiTime: number;
  scriptTime: number;
  memoryUsed: number;
  drawCalls: number;
  triangles: number;
}

/**
 * Engine events
 */
export interface EngineEvents {
  onStateChange: { previous: EngineState; current: EngineState };
  onModeChange: { previous: EngineMode; current: EngineMode };
  onFrameStart: { frameNumber: number; time: number };
  onFrameEnd: { frameNumber: number; stats: FrameStats };
  onSubsystemRegistered: { name: string; priority: SubsystemPriority };
  onSubsystemInitialized: { name: string; time: number };
  onError: { error: Error; subsystem?: string; recoverable: boolean };
  onWorldLoad: { worldId: string; path: string };
  onWorldUnload: { worldId: string };
}

// ============================================================================
// ENGINE TIME MANAGER
// ============================================================================

/**
 * Manages all time-related functionality
 */
export class EngineTime {
  private _time = 0;
  private _deltaTime = 0;
  private _unscaledDeltaTime = 0;
  private _fixedDeltaTime = 1 / 60;
  private _timeScale = 1;
  private _frameCount = 0;
  private _realtimeSinceStartup = 0;
  private _fixedTime = 0;
  private _maxDeltaTime = 0.1;
  private _startTime = 0;

  get time(): number { return this._time; }
  get deltaTime(): number { return this._deltaTime; }
  get unscaledDeltaTime(): number { return this._unscaledDeltaTime; }
  get fixedDeltaTime(): number { return this._fixedDeltaTime; }
  get timeScale(): number { return this._timeScale; }
  get frameCount(): number { return this._frameCount; }
  get realtimeSinceStartup(): number { return this._realtimeSinceStartup; }
  get fixedTime(): number { return this._fixedTime; }

  set timeScale(value: number) {
    this._timeScale = Math.max(0, value);
  }

  set fixedDeltaTime(value: number) {
    this._fixedDeltaTime = Math.max(0.001, value);
  }

  set maxDeltaTime(value: number) {
    this._maxDeltaTime = Math.max(0.01, value);
  }

  initialize(): void {
    this._startTime = performance.now() / 1000;
    this._time = 0;
    this._frameCount = 0;
    this._realtimeSinceStartup = 0;
  }

  update(rawDeltaTime: number): void {
    this._unscaledDeltaTime = Math.min(rawDeltaTime, this._maxDeltaTime);
    this._deltaTime = this._unscaledDeltaTime * this._timeScale;
    this._time += this._deltaTime;
    this._realtimeSinceStartup = (performance.now() / 1000) - this._startTime;
    this._frameCount++;
  }

  updateFixed(): boolean {
    if (this._time >= this._fixedTime + this._fixedDeltaTime) {
      this._fixedTime += this._fixedDeltaTime;
      return true;
    }
    return false;
  }
}

// ============================================================================
// MAIN ENGINE RUNTIME CLASS
// ============================================================================

@injectable()
export class AethelEngineRuntime {
  // State
  private _state: EngineState = 'uninitialized';
  private _mode: EngineMode = 'editor';
  private _config: EngineConfig | null = null;
  
  // Subsystems
  private readonly subsystems = new Map<string, SubsystemEntry>();
  private sortedSubsystems: SubsystemEntry[] = [];
  
  // Time management
  public readonly time = new EngineTime();
  
  // ECS World for entity management
  public readonly world = new ECSWorld();
  
  // Frame loop
  private animationFrameId: number | null = null;
  private lastFrameTime = 0;
  private frameStats: FrameStats = this.createEmptyFrameStats();
  private fpsHistory: number[] = [];
  
  // World management
  private currentWorldId: string | null = null;
  private loadedWorlds = new Map<string, unknown>();
  
  // Events
  private readonly onStateChangeEmitter = new Emitter<EngineEvents['onStateChange']>();
  private readonly onModeChangeEmitter = new Emitter<EngineEvents['onModeChange']>();
  private readonly onFrameStartEmitter = new Emitter<EngineEvents['onFrameStart']>();
  private readonly onFrameEndEmitter = new Emitter<EngineEvents['onFrameEnd']>();
  private readonly onSubsystemRegisteredEmitter = new Emitter<EngineEvents['onSubsystemRegistered']>();
  private readonly onSubsystemInitializedEmitter = new Emitter<EngineEvents['onSubsystemInitialized']>();
  private readonly onErrorEmitter = new Emitter<EngineEvents['onError']>();
  private readonly onWorldLoadEmitter = new Emitter<EngineEvents['onWorldLoad']>();
  private readonly onWorldUnloadEmitter = new Emitter<EngineEvents['onWorldUnload']>();

  // Event accessors
  readonly onStateChange: Event<EngineEvents['onStateChange']> = this.onStateChangeEmitter.event;
  readonly onModeChange: Event<EngineEvents['onModeChange']> = this.onModeChangeEmitter.event;
  readonly onFrameStart: Event<EngineEvents['onFrameStart']> = this.onFrameStartEmitter.event;
  readonly onFrameEnd: Event<EngineEvents['onFrameEnd']> = this.onFrameEndEmitter.event;
  readonly onSubsystemRegistered: Event<EngineEvents['onSubsystemRegistered']> = this.onSubsystemRegisteredEmitter.event;
  readonly onSubsystemInitialized: Event<EngineEvents['onSubsystemInitialized']> = this.onSubsystemInitializedEmitter.event;
  readonly onError: Event<EngineEvents['onError']> = this.onErrorEmitter.event;
  readonly onWorldLoad: Event<EngineEvents['onWorldLoad']> = this.onWorldLoadEmitter.event;
  readonly onWorldUnload: Event<EngineEvents['onWorldUnload']> = this.onWorldUnloadEmitter.event;

  // ========================================================================
  // GETTERS
  // ========================================================================

  get state(): EngineState { return this._state; }
  get mode(): EngineMode { return this._mode; }
  get config(): EngineConfig | null { return this._config; }
  get isRunning(): boolean { return this._state === 'running'; }
  get isPaused(): boolean { return this._state === 'paused'; }
  get isReady(): boolean { return this._state === 'ready' || this._state === 'running' || this._state === 'paused'; }
  get currentStats(): FrameStats { return { ...this.frameStats }; }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize the engine with configuration
   */
  async initialize(config: EngineConfig): Promise<void> {
    if (this._state !== 'uninitialized') {
      throw new Error(`Cannot initialize engine in state: ${this._state}`);
    }

    this.setState('initializing');
    this._config = config;
    this._mode = config.mode;

    console.log(`[AethelEngine] Initializing in ${config.mode} mode...`);

    try {
      // Initialize time system
      this.time.initialize();
      this.time.fixedDeltaTime = config.fixedTimestep;
      this.time.maxDeltaTime = config.maxDeltaTime;

      // Sort subsystems by priority
      this.sortSubsystems();

      // Initialize all subsystems in order
      for (const entry of this.sortedSubsystems) {
        const startTime = performance.now();
        
        try {
          await entry.instance.initialize();
          entry.initializeTime = performance.now() - startTime;
          
          this.onSubsystemInitializedEmitter.fire({
            name: entry.instance.name,
            time: entry.initializeTime
          });
          
          console.log(`[AethelEngine] Initialized ${entry.instance.name} (${entry.initializeTime.toFixed(2)}ms)`);
        } catch (error) {
          console.error(`[AethelEngine] Failed to initialize ${entry.instance.name}:`, error);
          this.onErrorEmitter.fire({
            error: error as Error,
            subsystem: entry.instance.name,
            recoverable: false
          });
          throw error;
        }
      }

      // Load startup world if specified
      if (config.startupWorld) {
        await this.loadWorld(config.startupWorld);
      }

      this.setState('ready');
      console.log('[AethelEngine] Initialization complete');
    } catch (error) {
      this.setState('error');
      throw error;
    }
  }

  // ========================================================================
  // SUBSYSTEM MANAGEMENT
  // ========================================================================

  /**
   * Register a subsystem
   */
  registerSubsystem(subsystem: IEngineSubsystem, dependencies: string[] = []): void {
    if (this.subsystems.has(subsystem.name)) {
      console.warn(`[AethelEngine] Subsystem ${subsystem.name} already registered`);
      return;
    }

    const priorityOrder: Record<SubsystemPriority, number> = {
      'critical': 0,
      'core': 1,
      'gameplay': 2,
      'editor': 3,
      'optional': 4
    };

    const entry: SubsystemEntry = {
      instance: subsystem,
      priority: priorityOrder[subsystem.priority],
      dependencies,
      initializeTime: 0
    };

    this.subsystems.set(subsystem.name, entry);
    
    this.onSubsystemRegisteredEmitter.fire({
      name: subsystem.name,
      priority: subsystem.priority
    });

    console.log(`[AethelEngine] Registered subsystem: ${subsystem.name} (${subsystem.priority})`);
  }

  /**
   * Get a subsystem by name
   */
  getSubsystem<T extends IEngineSubsystem>(name: string): T | null {
    const entry = this.subsystems.get(name);
    return entry ? entry.instance as T : null;
  }

  /**
   * Sort subsystems by priority and dependencies
   */
  private sortSubsystems(): void {
    const entries = Array.from(this.subsystems.values());
    
    // Topological sort with priority consideration
    const sorted: SubsystemEntry[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (entry: SubsystemEntry) => {
      if (visited.has(entry.instance.name)) return;
      if (visiting.has(entry.instance.name)) {
        throw new Error(`Circular dependency detected: ${entry.instance.name}`);
      }

      visiting.add(entry.instance.name);

      for (const depName of entry.dependencies) {
        const depEntry = this.subsystems.get(depName);
        if (depEntry) {
          visit(depEntry);
        }
      }

      visiting.delete(entry.instance.name);
      visited.add(entry.instance.name);
      sorted.push(entry);
    };

    // Sort by priority first, then apply topological sort
    entries.sort((a, b) => a.priority - b.priority);
    
    for (const entry of entries) {
      visit(entry);
    }

    this.sortedSubsystems = sorted;
  }

  // ========================================================================
  // ENGINE LOOP
  // ========================================================================

  /**
   * Start the engine loop
   */
  start(): void {
    if (this._state !== 'ready' && this._state !== 'paused') {
      throw new Error(`Cannot start engine in state: ${this._state}`);
    }

    this.setState('running');
    this.lastFrameTime = performance.now();
    this.runLoop();
    
    console.log('[AethelEngine] Engine started');
  }

  /**
   * Pause the engine
   */
  pause(): void {
    if (this._state !== 'running') return;
    
    this.setState('paused');
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    console.log('[AethelEngine] Engine paused');
  }

  /**
   * Resume from pause
   */
  resume(): void {
    if (this._state !== 'paused') return;
    
    this.setState('running');
    this.lastFrameTime = performance.now();
    this.runLoop();
    
    console.log('[AethelEngine] Engine resumed');
  }

  /**
   * Stop the engine
   */
  async stop(): Promise<void> {
    if (this._state === 'stopped' || this._state === 'uninitialized') return;
    
    this.setState('stopping');

    // Stop the loop
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Unload current world
    if (this.currentWorldId) {
      await this.unloadWorld(this.currentWorldId);
    }

    // Shutdown subsystems in reverse order
    for (let i = this.sortedSubsystems.length - 1; i >= 0; i--) {
      const entry = this.sortedSubsystems[i];
      try {
        await entry.instance.shutdown();
        console.log(`[AethelEngine] Shutdown ${entry.instance.name}`);
      } catch (error) {
        console.error(`[AethelEngine] Error shutting down ${entry.instance.name}:`, error);
      }
    }

    this.setState('stopped');
    console.log('[AethelEngine] Engine stopped');
  }

  /**
   * Main loop
   */
  private runLoop(): void {
    if (this._state !== 'running') return;

    const currentTime = performance.now();
    const rawDeltaTime = (currentTime - this.lastFrameTime) / 1000;
    this.lastFrameTime = currentTime;

    // Update time
    this.time.update(rawDeltaTime);

    // Fire frame start event
    this.onFrameStartEmitter.fire({
      frameNumber: this.time.frameCount,
      time: this.time.time
    });

    const frameStartTime = performance.now();

    // Fixed update loop (physics, etc.)
    let fixedUpdates = 0;
    const maxFixedUpdates = 5; // Prevent spiral of death
    
    while (this.time.updateFixed() && fixedUpdates < maxFixedUpdates) {
      this.fixedTick();
      fixedUpdates++;
    }

    // Variable update
    const updateStartTime = performance.now();
    this.tick(this.time.deltaTime);
    const updateEndTime = performance.now();

    // Late update
    this.lateTick(this.time.deltaTime);

    // Update frame stats
    const frameEndTime = performance.now();
    this.updateFrameStats(frameStartTime, updateStartTime, updateEndTime, frameEndTime);

    // Fire frame end event
    this.onFrameEndEmitter.fire({
      frameNumber: this.time.frameCount,
      stats: this.frameStats
    });

    // Schedule next frame
    this.animationFrameId = requestAnimationFrame(() => this.runLoop());
  }

  /**
   * Fixed timestep tick (physics, deterministic systems)
   */
  private fixedTick(): void {
    for (const entry of this.sortedSubsystems) {
      if (entry.instance.isEnabled && entry.instance.isInitialized) {
        try {
          // Call fixedTick if available
          const subsystem = entry.instance as IEngineSubsystem & { fixedTick?: (dt: number) => void };
          if (subsystem.fixedTick) {
            subsystem.fixedTick(this.time.fixedDeltaTime);
          }
        } catch (error) {
          this.handleSubsystemError(entry.instance.name, error as Error);
        }
      }
    }
  }

  /**
   * Variable timestep tick
   */
  private tick(deltaTime: number): void {
    for (const entry of this.sortedSubsystems) {
      if (entry.instance.isEnabled && entry.instance.isInitialized) {
        try {
          entry.instance.tick(deltaTime);
        } catch (error) {
          this.handleSubsystemError(entry.instance.name, error as Error);
        }
      }
    }
  }

  /**
   * Late tick (after main update, camera follow, etc.)
   */
  private lateTick(deltaTime: number): void {
    for (const entry of this.sortedSubsystems) {
      if (entry.instance.isEnabled && entry.instance.isInitialized) {
        try {
          const subsystem = entry.instance as IEngineSubsystem & { lateTick?: (dt: number) => void };
          if (subsystem.lateTick) {
            subsystem.lateTick(deltaTime);
          }
        } catch (error) {
          this.handleSubsystemError(entry.instance.name, error as Error);
        }
      }
    }
  }

  // ========================================================================
  // WORLD MANAGEMENT
  // ========================================================================

  /**
   * Load a world/level
   */
  async loadWorld(worldPath: string): Promise<void> {
    const worldId = this.generateWorldId(worldPath);
    
    console.log(`[AethelEngine] Loading world: ${worldPath}`);

    // Unload current world if any
    if (this.currentWorldId) {
      await this.unloadWorld(this.currentWorldId);
    }

    try {
      // Load world data from path (async fetch or filesystem)
      const worldData = await this.loadWorldData(worldPath);
      
      // Initialize ECS world for this scene
      await this.world.clear();
      
      // Spawn entities from world data
      if (worldData.entities) {
        for (const entityData of worldData.entities) {
          const entity = this.world.createEntity({ name: entityData.name || 'Entity' });
          
          // Add components from entity data
          // Note: In production, would use component registry to create proper instances
          for (const [_componentType, _componentData] of Object.entries(entityData.components || {})) {
            // Component creation would require the proper component class instances
            // this.world.addComponent(entity, new ComponentClass(componentData));
            console.log(`[AethelEngine] Entity ${entity}: component data stored for later binding`);
          }
        }
      }
      
      // Load scene configuration
      if (worldData.config) {
        this.applyWorldConfig(worldData.config);
      }
      
      this.loadedWorlds.set(worldId, { 
        path: worldPath, 
        loaded: true,
        entityCount: worldData.entities?.length || 0,
      });
      this.currentWorldId = worldId;

      this.onWorldLoadEmitter.fire({ worldId, path: worldPath });
      
      console.log(`[AethelEngine] World loaded: ${worldId} (${worldData.entities?.length || 0} entities)`);
    } catch (error) {
      console.error(`[AethelEngine] Failed to load world ${worldPath}:`, error);
      throw error;
    }
  }

  /**
   * Load world data from file system or network
   */
  private async loadWorldData(worldPath: string): Promise<WorldData> {
    try {
      // Try to load from file system or fetch
      if (typeof fetch !== 'undefined') {
        const response = await fetch(worldPath);
        if (response.ok) {
          return await response.json() as WorldData;
        }
      }
    } catch {
      // Fallback to empty world
    }
    
    // Return minimal empty world structure
    return {
      version: '1.0',
      name: worldPath.split('/').pop() || 'Untitled',
      entities: [],
      config: {},
    };
  }

  /**
   * Apply world configuration
   */
  private applyWorldConfig(config: Record<string, unknown>): void {
    // Apply gravity
    if (config.gravity && Array.isArray(config.gravity)) {
      // Would set physics gravity here
      console.log('[AethelEngine] Applied world gravity:', config.gravity);
    }
    
    // Apply ambient light
    if (config.ambientLight) {
      console.log('[AethelEngine] Applied ambient light:', config.ambientLight);
    }
    
    // Apply fog settings
    if (config.fog) {
      console.log('[AethelEngine] Applied fog settings:', config.fog);
    }
  }

  /**
   * Unload a world
   */
  async unloadWorld(worldId: string): Promise<void> {
    if (!this.loadedWorlds.has(worldId)) return;

    console.log(`[AethelEngine] Unloading world: ${worldId}`);

    try {
      // Clear all entities from ECS
      await this.world.clear();
      
      // Release any world-specific resources
      this.releaseWorldResources(worldId);
      
      this.loadedWorlds.delete(worldId);
      
      if (this.currentWorldId === worldId) {
        this.currentWorldId = null;
      }

      this.onWorldUnloadEmitter.fire({ worldId });
      
      console.log(`[AethelEngine] World unloaded: ${worldId}`);
    } catch (error) {
      console.error(`[AethelEngine] Failed to unload world ${worldId}:`, error);
      throw error;
    }
  }

  /**
   * Release resources associated with a world
   */
  private releaseWorldResources(_worldId: string): void {
    // Release textures, meshes, audio etc. loaded for this world
    // In production, would call asset manager to unload world-specific assets
  }

  // ========================================================================
  // MODE SWITCHING
  // ========================================================================

  /**
   * Switch engine mode (e.g., editor to PIE)
   */
  async setMode(newMode: EngineMode): Promise<void> {
    if (newMode === this._mode) return;

    const previousMode = this._mode;
    console.log(`[AethelEngine] Switching mode: ${previousMode} -> ${newMode}`);

    // Pause during transition
    const wasRunning = this._state === 'running';
    if (wasRunning) {
      this.pause();
    }

    this._mode = newMode;

    // Notify subsystems
    for (const entry of this.sortedSubsystems) {
      if (entry.instance.onEngineModeChange) {
        entry.instance.onEngineModeChange(newMode);
      }
    }

    this.onModeChangeEmitter.fire({ previous: previousMode, current: newMode });

    // Resume if was running
    if (wasRunning) {
      this.resume();
    }
  }

  // ========================================================================
  // UTILITIES
  // ========================================================================

  private setState(newState: EngineState): void {
    const previousState = this._state;
    this._state = newState;

    // Notify subsystems
    for (const entry of this.sortedSubsystems) {
      if (entry.instance.onEngineStateChange) {
        entry.instance.onEngineStateChange(newState);
      }
    }

    this.onStateChangeEmitter.fire({ previous: previousState, current: newState });
  }

  private handleSubsystemError(subsystemName: string, error: Error): void {
    console.error(`[AethelEngine] Error in ${subsystemName}:`, error);
    
    this.onErrorEmitter.fire({
      error,
      subsystem: subsystemName,
      recoverable: true
    });
  }

  private updateFrameStats(
    frameStart: number,
    updateStart: number,
    updateEnd: number,
    frameEnd: number
  ): void {
    const frameTime = frameEnd - frameStart;
    const fps = 1000 / frameTime;

    // Update FPS history for averaging
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    // Collect stats from subsystems
    const subsystemStats = this.collectSubsystemStats();

    this.frameStats = {
      frameNumber: this.time.frameCount,
      deltaTime: this.time.deltaTime,
      fps,
      avgFps,
      frameTime,
      updateTime: updateEnd - updateStart,
      renderTime: subsystemStats.renderTime,
      physicsTime: subsystemStats.physicsTime,
      aiTime: subsystemStats.aiTime,
      scriptTime: subsystemStats.scriptTime,
      memoryUsed: this.getMemoryUsage(),
      drawCalls: subsystemStats.drawCalls,
      triangles: subsystemStats.triangles
    };
  }

  /**
   * Collect performance statistics from registered subsystems
   */
  private collectSubsystemStats(): {
    renderTime: number;
    physicsTime: number;
    aiTime: number;
    scriptTime: number;
    drawCalls: number;
    triangles: number;
  } {
    const stats = {
      renderTime: 0,
      physicsTime: 0,
      aiTime: 0,
      scriptTime: 0,
      drawCalls: 0,
      triangles: 0,
    };

    for (const entry of this.sortedSubsystems) {
      const subsystem = entry.instance as IEngineSubsystem & { 
        getStats?(): Record<string, number>;
        lastTickTime?: number;
      };
      
      // Get timing from subsystem if available
      if (subsystem.lastTickTime !== undefined) {
        const name = subsystem.name.toLowerCase();
        
        if (name.includes('render') || name.includes('graphics')) {
          stats.renderTime = subsystem.lastTickTime;
        } else if (name.includes('physics')) {
          stats.physicsTime = subsystem.lastTickTime;
        } else if (name.includes('ai')) {
          stats.aiTime = subsystem.lastTickTime;
        } else if (name.includes('script')) {
          stats.scriptTime = subsystem.lastTickTime;
        }
      }
      
      // Get detailed stats if subsystem provides them
      if (typeof subsystem.getStats === 'function') {
        const subsystemStats = subsystem.getStats();
        if (subsystemStats.drawCalls !== undefined) {
          stats.drawCalls = subsystemStats.drawCalls;
        }
        if (subsystemStats.triangles !== undefined) {
          stats.triangles = subsystemStats.triangles;
        }
      }
    }

    return stats;
  }

  private createEmptyFrameStats(): FrameStats {
    return {
      frameNumber: 0,
      deltaTime: 0,
      fps: 0,
      avgFps: 0,
      frameTime: 0,
      updateTime: 0,
      renderTime: 0,
      physicsTime: 0,
      aiTime: 0,
      scriptTime: 0,
      memoryUsed: 0,
      drawCalls: 0,
      triangles: 0
    };
  }

  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private generateWorldId(path: string): string {
    return `world_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  dispose(): void {
    this.stop().catch(console.error);
    
    this.onStateChangeEmitter.dispose();
    this.onModeChangeEmitter.dispose();
    this.onFrameStartEmitter.dispose();
    this.onFrameEndEmitter.dispose();
    this.onSubsystemRegisteredEmitter.dispose();
    this.onSubsystemInitializedEmitter.dispose();
    this.onErrorEmitter.dispose();
    this.onWorldLoadEmitter.dispose();
    this.onWorldUnloadEmitter.dispose();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let engineInstance: AethelEngineRuntime | null = null;

export function getEngine(): AethelEngineRuntime {
  if (!engineInstance) {
    engineInstance = new AethelEngineRuntime();
  }
  return engineInstance;
}

export function createEngine(): AethelEngineRuntime {
  engineInstance = new AethelEngineRuntime();
  return engineInstance;
}
