import { Event } from '@theia/core/lib/common';
import { ECSWorld } from './ecs-world';
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
export type EngineState = 'uninitialized' | 'initializing' | 'ready' | 'running' | 'paused' | 'stopping' | 'stopped' | 'error';
/**
 * Engine mode
 */
export type EngineMode = 'editor' | 'play-in-editor' | 'standalone' | 'server' | 'client';
/**
 * Subsystem priority for initialization order
 */
export type SubsystemPriority = 'critical' | 'core' | 'gameplay' | 'editor' | 'optional';
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
    onStateChange: {
        previous: EngineState;
        current: EngineState;
    };
    onModeChange: {
        previous: EngineMode;
        current: EngineMode;
    };
    onFrameStart: {
        frameNumber: number;
        time: number;
    };
    onFrameEnd: {
        frameNumber: number;
        stats: FrameStats;
    };
    onSubsystemRegistered: {
        name: string;
        priority: SubsystemPriority;
    };
    onSubsystemInitialized: {
        name: string;
        time: number;
    };
    onError: {
        error: Error;
        subsystem?: string;
        recoverable: boolean;
    };
    onWorldLoad: {
        worldId: string;
        path: string;
    };
    onWorldUnload: {
        worldId: string;
    };
}
/**
 * Manages all time-related functionality
 */
export declare class EngineTime {
    private _time;
    private _deltaTime;
    private _unscaledDeltaTime;
    private _fixedDeltaTime;
    private _timeScale;
    private _frameCount;
    private _realtimeSinceStartup;
    private _fixedTime;
    private _maxDeltaTime;
    private _startTime;
    get time(): number;
    get deltaTime(): number;
    get unscaledDeltaTime(): number;
    get fixedDeltaTime(): number;
    get timeScale(): number;
    get frameCount(): number;
    get realtimeSinceStartup(): number;
    get fixedTime(): number;
    set timeScale(value: number);
    set fixedDeltaTime(value: number);
    set maxDeltaTime(value: number);
    initialize(): void;
    update(rawDeltaTime: number): void;
    updateFixed(): boolean;
}
export declare class AethelEngineRuntime {
    private _state;
    private _mode;
    private _config;
    private readonly subsystems;
    private sortedSubsystems;
    readonly time: EngineTime;
    readonly world: ECSWorld;
    private animationFrameId;
    private lastFrameTime;
    private frameStats;
    private fpsHistory;
    private currentWorldId;
    private loadedWorlds;
    private readonly onStateChangeEmitter;
    private readonly onModeChangeEmitter;
    private readonly onFrameStartEmitter;
    private readonly onFrameEndEmitter;
    private readonly onSubsystemRegisteredEmitter;
    private readonly onSubsystemInitializedEmitter;
    private readonly onErrorEmitter;
    private readonly onWorldLoadEmitter;
    private readonly onWorldUnloadEmitter;
    readonly onStateChange: Event<EngineEvents['onStateChange']>;
    readonly onModeChange: Event<EngineEvents['onModeChange']>;
    readonly onFrameStart: Event<EngineEvents['onFrameStart']>;
    readonly onFrameEnd: Event<EngineEvents['onFrameEnd']>;
    readonly onSubsystemRegistered: Event<EngineEvents['onSubsystemRegistered']>;
    readonly onSubsystemInitialized: Event<EngineEvents['onSubsystemInitialized']>;
    readonly onError: Event<EngineEvents['onError']>;
    readonly onWorldLoad: Event<EngineEvents['onWorldLoad']>;
    readonly onWorldUnload: Event<EngineEvents['onWorldUnload']>;
    get state(): EngineState;
    get mode(): EngineMode;
    get config(): EngineConfig | null;
    get isRunning(): boolean;
    get isPaused(): boolean;
    get isReady(): boolean;
    get currentStats(): FrameStats;
    /**
     * Initialize the engine with configuration
     */
    initialize(config: EngineConfig): Promise<void>;
    /**
     * Register a subsystem
     */
    registerSubsystem(subsystem: IEngineSubsystem, dependencies?: string[]): void;
    /**
     * Get a subsystem by name
     */
    getSubsystem<T extends IEngineSubsystem>(name: string): T | null;
    /**
     * Sort subsystems by priority and dependencies
     */
    private sortSubsystems;
    /**
     * Start the engine loop
     */
    start(): void;
    /**
     * Pause the engine
     */
    pause(): void;
    /**
     * Resume from pause
     */
    resume(): void;
    /**
     * Stop the engine
     */
    stop(): Promise<void>;
    /**
     * Main loop
     */
    private runLoop;
    /**
     * Fixed timestep tick (physics, deterministic systems)
     */
    private fixedTick;
    /**
     * Variable timestep tick
     */
    private tick;
    /**
     * Late tick (after main update, camera follow, etc.)
     */
    private lateTick;
    /**
     * Load a world/level
     */
    loadWorld(worldPath: string): Promise<void>;
    /**
     * Load world data from file system or network
     */
    private loadWorldData;
    /**
     * Apply world configuration
     */
    private applyWorldConfig;
    /**
     * Unload a world
     */
    unloadWorld(worldId: string): Promise<void>;
    /**
     * Release resources associated with a world
     */
    private releaseWorldResources;
    /**
     * Switch engine mode (e.g., editor to PIE)
     */
    setMode(newMode: EngineMode): Promise<void>;
    private setState;
    private handleSubsystemError;
    private updateFrameStats;
    /**
     * Collect performance statistics from registered subsystems
     */
    private collectSubsystemStats;
    private createEmptyFrameStats;
    private getMemoryUsage;
    private generateWorldId;
    dispose(): void;
}
export declare function getEngine(): AethelEngineRuntime;
export declare function createEngine(): AethelEngineRuntime;
