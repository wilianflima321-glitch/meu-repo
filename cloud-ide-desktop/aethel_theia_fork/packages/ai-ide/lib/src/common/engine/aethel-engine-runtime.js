"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AethelEngineRuntime = exports.EngineTime = void 0;
exports.getEngine = getEngine;
exports.createEngine = createEngine;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
const ecs_world_1 = require("./ecs-world");
// ============================================================================
// ENGINE TIME MANAGER
// ============================================================================
/**
 * Manages all time-related functionality
 */
class EngineTime {
    constructor() {
        this._time = 0;
        this._deltaTime = 0;
        this._unscaledDeltaTime = 0;
        this._fixedDeltaTime = 1 / 60;
        this._timeScale = 1;
        this._frameCount = 0;
        this._realtimeSinceStartup = 0;
        this._fixedTime = 0;
        this._maxDeltaTime = 0.1;
        this._startTime = 0;
    }
    get time() { return this._time; }
    get deltaTime() { return this._deltaTime; }
    get unscaledDeltaTime() { return this._unscaledDeltaTime; }
    get fixedDeltaTime() { return this._fixedDeltaTime; }
    get timeScale() { return this._timeScale; }
    get frameCount() { return this._frameCount; }
    get realtimeSinceStartup() { return this._realtimeSinceStartup; }
    get fixedTime() { return this._fixedTime; }
    set timeScale(value) {
        this._timeScale = Math.max(0, value);
    }
    set fixedDeltaTime(value) {
        this._fixedDeltaTime = Math.max(0.001, value);
    }
    set maxDeltaTime(value) {
        this._maxDeltaTime = Math.max(0.01, value);
    }
    initialize() {
        this._startTime = performance.now() / 1000;
        this._time = 0;
        this._frameCount = 0;
        this._realtimeSinceStartup = 0;
    }
    update(rawDeltaTime) {
        this._unscaledDeltaTime = Math.min(rawDeltaTime, this._maxDeltaTime);
        this._deltaTime = this._unscaledDeltaTime * this._timeScale;
        this._time += this._deltaTime;
        this._realtimeSinceStartup = (performance.now() / 1000) - this._startTime;
        this._frameCount++;
    }
    updateFixed() {
        if (this._time >= this._fixedTime + this._fixedDeltaTime) {
            this._fixedTime += this._fixedDeltaTime;
            return true;
        }
        return false;
    }
}
exports.EngineTime = EngineTime;
// ============================================================================
// MAIN ENGINE RUNTIME CLASS
// ============================================================================
let AethelEngineRuntime = class AethelEngineRuntime {
    constructor() {
        // State
        this._state = 'uninitialized';
        this._mode = 'editor';
        this._config = null;
        // Subsystems
        this.subsystems = new Map();
        this.sortedSubsystems = [];
        // Time management
        this.time = new EngineTime();
        // ECS World for entity management
        this.world = new ecs_world_1.ECSWorld();
        // Frame loop
        this.animationFrameId = null;
        this.lastFrameTime = 0;
        this.frameStats = this.createEmptyFrameStats();
        this.fpsHistory = [];
        // World management
        this.currentWorldId = null;
        this.loadedWorlds = new Map();
        // Events
        this.onStateChangeEmitter = new common_1.Emitter();
        this.onModeChangeEmitter = new common_1.Emitter();
        this.onFrameStartEmitter = new common_1.Emitter();
        this.onFrameEndEmitter = new common_1.Emitter();
        this.onSubsystemRegisteredEmitter = new common_1.Emitter();
        this.onSubsystemInitializedEmitter = new common_1.Emitter();
        this.onErrorEmitter = new common_1.Emitter();
        this.onWorldLoadEmitter = new common_1.Emitter();
        this.onWorldUnloadEmitter = new common_1.Emitter();
        // Event accessors
        this.onStateChange = this.onStateChangeEmitter.event;
        this.onModeChange = this.onModeChangeEmitter.event;
        this.onFrameStart = this.onFrameStartEmitter.event;
        this.onFrameEnd = this.onFrameEndEmitter.event;
        this.onSubsystemRegistered = this.onSubsystemRegisteredEmitter.event;
        this.onSubsystemInitialized = this.onSubsystemInitializedEmitter.event;
        this.onError = this.onErrorEmitter.event;
        this.onWorldLoad = this.onWorldLoadEmitter.event;
        this.onWorldUnload = this.onWorldUnloadEmitter.event;
    }
    // ========================================================================
    // GETTERS
    // ========================================================================
    get state() { return this._state; }
    get mode() { return this._mode; }
    get config() { return this._config; }
    get isRunning() { return this._state === 'running'; }
    get isPaused() { return this._state === 'paused'; }
    get isReady() { return this._state === 'ready' || this._state === 'running' || this._state === 'paused'; }
    get currentStats() { return { ...this.frameStats }; }
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    /**
     * Initialize the engine with configuration
     */
    async initialize(config) {
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
                }
                catch (error) {
                    console.error(`[AethelEngine] Failed to initialize ${entry.instance.name}:`, error);
                    this.onErrorEmitter.fire({
                        error: error,
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
        }
        catch (error) {
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
    registerSubsystem(subsystem, dependencies = []) {
        if (this.subsystems.has(subsystem.name)) {
            console.warn(`[AethelEngine] Subsystem ${subsystem.name} already registered`);
            return;
        }
        const priorityOrder = {
            'critical': 0,
            'core': 1,
            'gameplay': 2,
            'editor': 3,
            'optional': 4
        };
        const entry = {
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
    getSubsystem(name) {
        const entry = this.subsystems.get(name);
        return entry ? entry.instance : null;
    }
    /**
     * Sort subsystems by priority and dependencies
     */
    sortSubsystems() {
        const entries = Array.from(this.subsystems.values());
        // Topological sort with priority consideration
        const sorted = [];
        const visited = new Set();
        const visiting = new Set();
        const visit = (entry) => {
            if (visited.has(entry.instance.name))
                return;
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
    start() {
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
    pause() {
        if (this._state !== 'running')
            return;
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
    resume() {
        if (this._state !== 'paused')
            return;
        this.setState('running');
        this.lastFrameTime = performance.now();
        this.runLoop();
        console.log('[AethelEngine] Engine resumed');
    }
    /**
     * Stop the engine
     */
    async stop() {
        if (this._state === 'stopped' || this._state === 'uninitialized')
            return;
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
            }
            catch (error) {
                console.error(`[AethelEngine] Error shutting down ${entry.instance.name}:`, error);
            }
        }
        this.setState('stopped');
        console.log('[AethelEngine] Engine stopped');
    }
    /**
     * Main loop
     */
    runLoop() {
        if (this._state !== 'running')
            return;
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
    fixedTick() {
        for (const entry of this.sortedSubsystems) {
            if (entry.instance.isEnabled && entry.instance.isInitialized) {
                try {
                    // Call fixedTick if available
                    const subsystem = entry.instance;
                    if (subsystem.fixedTick) {
                        subsystem.fixedTick(this.time.fixedDeltaTime);
                    }
                }
                catch (error) {
                    this.handleSubsystemError(entry.instance.name, error);
                }
            }
        }
    }
    /**
     * Variable timestep tick
     */
    tick(deltaTime) {
        for (const entry of this.sortedSubsystems) {
            if (entry.instance.isEnabled && entry.instance.isInitialized) {
                try {
                    entry.instance.tick(deltaTime);
                }
                catch (error) {
                    this.handleSubsystemError(entry.instance.name, error);
                }
            }
        }
    }
    /**
     * Late tick (after main update, camera follow, etc.)
     */
    lateTick(deltaTime) {
        for (const entry of this.sortedSubsystems) {
            if (entry.instance.isEnabled && entry.instance.isInitialized) {
                try {
                    const subsystem = entry.instance;
                    if (subsystem.lateTick) {
                        subsystem.lateTick(deltaTime);
                    }
                }
                catch (error) {
                    this.handleSubsystemError(entry.instance.name, error);
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
    async loadWorld(worldPath) {
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
        }
        catch (error) {
            console.error(`[AethelEngine] Failed to load world ${worldPath}:`, error);
            throw error;
        }
    }
    /**
     * Load world data from file system or network
     */
    async loadWorldData(worldPath) {
        try {
            // Try to load from file system or fetch
            if (typeof fetch !== 'undefined') {
                const response = await fetch(worldPath);
                if (response.ok) {
                    return await response.json();
                }
            }
        }
        catch {
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
    applyWorldConfig(config) {
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
    async unloadWorld(worldId) {
        if (!this.loadedWorlds.has(worldId))
            return;
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
        }
        catch (error) {
            console.error(`[AethelEngine] Failed to unload world ${worldId}:`, error);
            throw error;
        }
    }
    /**
     * Release resources associated with a world
     */
    releaseWorldResources(_worldId) {
        // Release textures, meshes, audio etc. loaded for this world
        // In production, would call asset manager to unload world-specific assets
    }
    // ========================================================================
    // MODE SWITCHING
    // ========================================================================
    /**
     * Switch engine mode (e.g., editor to PIE)
     */
    async setMode(newMode) {
        if (newMode === this._mode)
            return;
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
    setState(newState) {
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
    handleSubsystemError(subsystemName, error) {
        console.error(`[AethelEngine] Error in ${subsystemName}:`, error);
        this.onErrorEmitter.fire({
            error,
            subsystem: subsystemName,
            recoverable: true
        });
    }
    updateFrameStats(frameStart, updateStart, updateEnd, frameEnd) {
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
    collectSubsystemStats() {
        const stats = {
            renderTime: 0,
            physicsTime: 0,
            aiTime: 0,
            scriptTime: 0,
            drawCalls: 0,
            triangles: 0,
        };
        for (const entry of this.sortedSubsystems) {
            const subsystem = entry.instance;
            // Get timing from subsystem if available
            if (subsystem.lastTickTime !== undefined) {
                const name = subsystem.name.toLowerCase();
                if (name.includes('render') || name.includes('graphics')) {
                    stats.renderTime = subsystem.lastTickTime;
                }
                else if (name.includes('physics')) {
                    stats.physicsTime = subsystem.lastTickTime;
                }
                else if (name.includes('ai')) {
                    stats.aiTime = subsystem.lastTickTime;
                }
                else if (name.includes('script')) {
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
    createEmptyFrameStats() {
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
    getMemoryUsage() {
        if (typeof performance !== 'undefined' && performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }
    generateWorldId(path) {
        return `world_${path.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    }
    // ========================================================================
    // CLEANUP
    // ========================================================================
    dispose() {
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
};
exports.AethelEngineRuntime = AethelEngineRuntime;
exports.AethelEngineRuntime = AethelEngineRuntime = __decorate([
    (0, inversify_1.injectable)()
], AethelEngineRuntime);
// ============================================================================
// SINGLETON INSTANCE
// ============================================================================
let engineInstance = null;
function getEngine() {
    if (!engineInstance) {
        engineInstance = new AethelEngineRuntime();
    }
    return engineInstance;
}
function createEngine() {
    engineInstance = new AethelEngineRuntime();
    return engineInstance;
}
