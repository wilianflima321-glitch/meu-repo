"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldCompositionManager = exports.SceneManager = exports.Scene = exports.SceneLoadMode = exports.SceneLoadState = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
const ecs_world_1 = require("./ecs-world");
/**
 * Scene loading state
 */
var SceneLoadState;
(function (SceneLoadState) {
    SceneLoadState["Unloaded"] = "unloaded";
    SceneLoadState["Loading"] = "loading";
    SceneLoadState["Loaded"] = "loaded";
    SceneLoadState["Unloading"] = "unloading";
    SceneLoadState["Failed"] = "failed";
})(SceneLoadState || (exports.SceneLoadState = SceneLoadState = {}));
/**
 * Scene loading mode
 */
var SceneLoadMode;
(function (SceneLoadMode) {
    SceneLoadMode["Single"] = "single";
    SceneLoadMode["Additive"] = "additive";
    SceneLoadMode["Streaming"] = "streaming"; // Stream in/out based on player position
})(SceneLoadMode || (exports.SceneLoadMode = SceneLoadMode = {}));
// ============================================================================
// SCENE CLASS
// ============================================================================
class Scene {
    constructor(metadata, world) {
        // Entity management
        this.entityRefs = new Map();
        this.rootEntities = [];
        // Layers
        this.layers = [];
        // Spatial partitioning (octree-like grid)
        this.spatialGrid = new Map();
        this.cellSize = 100;
        // State
        this._loadState = SceneLoadState.Unloaded;
        this._isActive = false;
        this._isDirty = false;
        // Events
        this.onLoadStateChangedEmitter = new common_1.Emitter();
        this.onEntityAddedEmitter = new common_1.Emitter();
        this.onEntityRemovedEmitter = new common_1.Emitter();
        this.onDirtyChangedEmitter = new common_1.Emitter();
        this.onLoadStateChanged = this.onLoadStateChangedEmitter.event;
        this.onEntityAdded = this.onEntityAddedEmitter.event;
        this.onEntityRemoved = this.onEntityRemovedEmitter.event;
        this.onDirtyChanged = this.onDirtyChangedEmitter.event;
        this.id = metadata.id;
        this.metadata = metadata;
        this.world = world ?? new ecs_world_1.ECSWorld();
        // Initialize default layers
        this.initializeDefaultLayers();
        // Listen to world events
        this.world.onEntityCreated(({ entity }) => {
            this.trackEntity(entity);
        });
        this.world.onEntityDestroyed(({ entity }) => {
            this.untrackEntity(entity);
        });
    }
    // ========================================================================
    // STATE
    // ========================================================================
    get loadState() {
        return this._loadState;
    }
    set loadState(state) {
        if (this._loadState !== state) {
            this._loadState = state;
            this.onLoadStateChangedEmitter.fire(state);
        }
    }
    get isActive() {
        return this._isActive;
    }
    set isActive(active) {
        this._isActive = active;
    }
    get isDirty() {
        return this._isDirty;
    }
    markDirty() {
        if (!this._isDirty) {
            this._isDirty = true;
            this.onDirtyChangedEmitter.fire(true);
        }
    }
    clearDirty() {
        if (this._isDirty) {
            this._isDirty = false;
            this.onDirtyChangedEmitter.fire(false);
        }
    }
    // ========================================================================
    // LAYERS
    // ========================================================================
    initializeDefaultLayers() {
        this.layers.push({ id: 0, name: 'Default', visible: true, locked: false, color: '#ffffff' }, { id: 1, name: 'TransparentFX', visible: true, locked: false, color: '#00ff00' }, { id: 2, name: 'Ignore Raycast', visible: true, locked: false, color: '#ff0000' }, { id: 3, name: 'Water', visible: true, locked: false, color: '#0000ff' }, { id: 4, name: 'UI', visible: true, locked: false, color: '#ffff00' }, { id: 5, name: 'PostProcessing', visible: true, locked: false, color: '#ff00ff' });
    }
    getLayers() {
        return [...this.layers];
    }
    getLayer(id) {
        return this.layers.find(l => l.id === id);
    }
    addLayer(name) {
        const id = this.layers.length;
        const layer = {
            id,
            name,
            visible: true,
            locked: false,
            color: `#${Math.floor(Math.random() * 16777215).toString(16)}`
        };
        this.layers.push(layer);
        this.markDirty();
        return layer;
    }
    setLayerVisibility(id, visible) {
        const layer = this.layers.find(l => l.id === id);
        if (layer) {
            layer.visible = visible;
            this.markDirty();
        }
    }
    // ========================================================================
    // ENTITY TRACKING
    // ========================================================================
    trackEntity(entityId) {
        if (this.entityRefs.has(entityId))
            return;
        const ref = {
            entityId,
            isStatic: false,
            layer: 0,
            cullingMask: 0xFFFFFFFF
        };
        this.entityRefs.set(entityId, ref);
        this.updateEntitySpatialCell(entityId);
        this.onEntityAddedEmitter.fire(entityId);
        this.markDirty();
    }
    untrackEntity(entityId) {
        const ref = this.entityRefs.get(entityId);
        if (!ref)
            return;
        this.removeEntityFromSpatialGrid(entityId);
        this.entityRefs.delete(entityId);
        this.onEntityRemovedEmitter.fire(entityId);
        this.markDirty();
    }
    // ========================================================================
    // SPATIAL PARTITIONING
    // ========================================================================
    getCellKey(x, y, z) {
        const cx = Math.floor(x / this.cellSize);
        const cy = Math.floor(y / this.cellSize);
        const cz = Math.floor(z / this.cellSize);
        return `${cx},${cy},${cz}`;
    }
    updateEntitySpatialCell(entityId) {
        const transform = this.world.getComponent(entityId, 'Transform');
        if (!transform)
            return;
        this.removeEntityFromSpatialGrid(entityId);
        const key = this.getCellKey(transform.position.x, transform.position.y, transform.position.z);
        let cell = this.spatialGrid.get(key);
        if (!cell) {
            cell = {
                x: Math.floor(transform.position.x / this.cellSize),
                y: Math.floor(transform.position.y / this.cellSize),
                z: Math.floor(transform.position.z / this.cellSize),
                entities: new Set()
            };
            this.spatialGrid.set(key, cell);
        }
        cell.entities.add(entityId);
    }
    removeEntityFromSpatialGrid(entityId) {
        for (const cell of this.spatialGrid.values()) {
            cell.entities.delete(entityId);
        }
    }
    /**
     * Query entities within radius of position
     */
    queryEntitiesInRadius(center, radius) {
        const results = [];
        const radiusSq = radius * radius;
        // Determine cells to check
        const minCx = Math.floor((center.x - radius) / this.cellSize);
        const maxCx = Math.floor((center.x + radius) / this.cellSize);
        const minCy = Math.floor((center.y - radius) / this.cellSize);
        const maxCy = Math.floor((center.y + radius) / this.cellSize);
        const minCz = Math.floor((center.z - radius) / this.cellSize);
        const maxCz = Math.floor((center.z + radius) / this.cellSize);
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                for (let cz = minCz; cz <= maxCz; cz++) {
                    const cell = this.spatialGrid.get(`${cx},${cy},${cz}`);
                    if (!cell)
                        continue;
                    for (const entityId of cell.entities) {
                        const transform = this.world.getComponent(entityId, 'Transform');
                        if (!transform)
                            continue;
                        const dx = transform.position.x - center.x;
                        const dy = transform.position.y - center.y;
                        const dz = transform.position.z - center.z;
                        const distSq = dx * dx + dy * dy + dz * dz;
                        if (distSq <= radiusSq) {
                            results.push(entityId);
                        }
                    }
                }
            }
        }
        return results;
    }
    /**
     * Query entities in frustum (for culling)
     */
    queryEntitiesInFrustum(_frustum) {
        // Simplified: return all entities for now
        // Full implementation would do frustum-cell intersection tests
        return Array.from(this.entityRefs.keys());
    }
    // ========================================================================
    // HIERARCHY
    // ========================================================================
    /**
     * Get root entities (no parent)
     */
    getRootEntities() {
        const roots = [];
        for (const entityId of this.entityRefs.keys()) {
            const data = this.world.getEntityData(entityId);
            if (data && data.parent === null) {
                roots.push(entityId);
            }
        }
        return roots;
    }
    /**
     * Build scene hierarchy tree
     */
    buildHierarchy() {
        const buildNode = (entityId) => {
            const data = this.world.getEntityData(entityId);
            const ref = this.entityRefs.get(entityId);
            const layer = ref ? this.layers.find(l => l.id === ref.layer) : undefined;
            return {
                entityId,
                name: data?.name ?? 'Unknown',
                children: data ? Array.from(data.children).map(buildNode) : [],
                expanded: true,
                visible: layer?.visible ?? true,
                locked: layer?.locked ?? false
            };
        };
        return this.getRootEntities().map(buildNode);
    }
    // ========================================================================
    // SERIALIZATION
    // ========================================================================
    /**
     * Serialize scene to JSON
     */
    serialize() {
        const data = {
            metadata: this.metadata,
            layers: this.layers,
            entityRefs: Array.from(this.entityRefs.entries()).map(([, ref]) => ({
                ...ref
            })),
            world: this.world.serialize()
        };
        return JSON.stringify(data, null, 2);
    }
    /**
     * Deserialize scene from JSON
     */
    deserialize(json) {
        const data = JSON.parse(json);
        // Restore layers
        this.layers.length = 0;
        this.layers.push(...data.layers);
        // Restore world
        this.world.deserialize(data.world);
        // Restore entity refs
        this.entityRefs.clear();
        for (const refData of data.entityRefs) {
            this.entityRefs.set(refData.entityId, {
                entityId: refData.entityId,
                prefabId: refData.prefabId,
                isStatic: refData.isStatic,
                layer: refData.layer,
                cullingMask: refData.cullingMask
            });
        }
        // Rebuild spatial grid
        for (const entityId of this.entityRefs.keys()) {
            this.updateEntitySpatialCell(entityId);
        }
        this.clearDirty();
    }
    // ========================================================================
    // CLEANUP
    // ========================================================================
    dispose() {
        this.world.dispose();
        this.entityRefs.clear();
        this.spatialGrid.clear();
        this.onLoadStateChangedEmitter.dispose();
        this.onEntityAddedEmitter.dispose();
        this.onEntityRemovedEmitter.dispose();
        this.onDirtyChangedEmitter.dispose();
    }
}
exports.Scene = Scene;
// ============================================================================
// SCENE MANAGER
// ============================================================================
let SceneManager = class SceneManager {
    constructor() {
        // Scene registry
        this.scenes = new Map();
        this.sceneMetadata = new Map();
        // Active scenes (can have multiple for additive loading)
        this.activeScenes = [];
        this._mainScene = null;
        // Streaming
        this.streamingEnabled = false;
        this.streamingAnchor = { x: 0, y: 0, z: 0 };
        // Events
        this.onSceneLoadedEmitter = new common_1.Emitter();
        this.onSceneUnloadedEmitter = new common_1.Emitter();
        this.onActiveSceneChangedEmitter = new common_1.Emitter();
        this.onSceneLoaded = this.onSceneLoadedEmitter.event;
        this.onSceneUnloaded = this.onSceneUnloadedEmitter.event;
        this.onActiveSceneChanged = this.onActiveSceneChangedEmitter.event;
    }
    // ========================================================================
    // SCENE REGISTRY
    // ========================================================================
    /**
     * Register scene metadata
     */
    registerScene(metadata) {
        this.sceneMetadata.set(metadata.id, metadata);
    }
    /**
     * Get all registered scenes
     */
    getRegisteredScenes() {
        return Array.from(this.sceneMetadata.values());
    }
    /**
     * Get scene metadata
     */
    getSceneMetadata(sceneId) {
        return this.sceneMetadata.get(sceneId);
    }
    // ========================================================================
    // SCENE LOADING
    // ========================================================================
    /**
     * Load a scene
     */
    async loadScene(sceneId, mode = SceneLoadMode.Single) {
        const metadata = this.sceneMetadata.get(sceneId);
        if (!metadata) {
            throw new Error(`Scene ${sceneId} not found in registry`);
        }
        // Check if already loaded
        let scene = this.scenes.get(sceneId);
        if (scene && scene.loadState === SceneLoadState.Loaded) {
            if (mode === SceneLoadMode.Single) {
                this.setMainScene(scene);
            }
            return scene;
        }
        // Handle load mode
        if (mode === SceneLoadMode.Single) {
            // Unload all current scenes
            await this.unloadAllScenes();
        }
        // Create new scene
        scene = new Scene(metadata);
        scene.loadState = SceneLoadState.Loading;
        this.scenes.set(sceneId, scene);
        try {
            // Simulate loading (in real impl, would load from file)
            await this.loadSceneData(scene);
            scene.loadState = SceneLoadState.Loaded;
            this.activeScenes.push(scene);
            if (mode === SceneLoadMode.Single || !this._mainScene) {
                this.setMainScene(scene);
            }
            this.onSceneLoadedEmitter.fire(scene);
            return scene;
        }
        catch (error) {
            scene.loadState = SceneLoadState.Failed;
            throw error;
        }
    }
    /**
     * Load scene data
     */
    async loadSceneData(scene) {
        // In real implementation, would load from file
        // For now, create an empty scene with default environment
        // Apply environment settings
        if (scene.metadata.environment) {
            // Would configure rendering pipeline here
        }
        // Scene is ready
        await new Promise(resolve => setTimeout(resolve, 10)); // Simulate async
    }
    /**
     * Unload a scene
     */
    async unloadScene(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (!scene)
            return;
        if (scene.metadata.isPersistent) {
            console.warn(`Cannot unload persistent scene: ${sceneId}`);
            return;
        }
        scene.loadState = SceneLoadState.Unloading;
        // Remove from active scenes
        const index = this.activeScenes.indexOf(scene);
        if (index !== -1) {
            this.activeScenes.splice(index, 1);
        }
        // Update main scene
        if (this._mainScene === scene) {
            this._mainScene = this.activeScenes[0] ?? null;
            this.onActiveSceneChangedEmitter.fire(this._mainScene);
        }
        // Cleanup
        scene.dispose();
        this.scenes.delete(sceneId);
        scene.loadState = SceneLoadState.Unloaded;
        this.onSceneUnloadedEmitter.fire(sceneId);
    }
    /**
     * Unload all scenes
     */
    async unloadAllScenes() {
        const sceneIds = Array.from(this.scenes.keys());
        for (const sceneId of sceneIds) {
            await this.unloadScene(sceneId);
        }
    }
    // ========================================================================
    // ACTIVE SCENE
    // ========================================================================
    /**
     * Get main active scene
     */
    get mainScene() {
        return this._mainScene;
    }
    /**
     * Set main active scene
     */
    setMainScene(scene) {
        if (this._mainScene !== scene) {
            if (this._mainScene) {
                this._mainScene.isActive = false;
            }
            this._mainScene = scene;
            scene.isActive = true;
            this.onActiveSceneChangedEmitter.fire(scene);
        }
    }
    /**
     * Get all active scenes
     */
    getActiveScenes() {
        return [...this.activeScenes];
    }
    /**
     * Get loaded scene by ID
     */
    getLoadedScene(sceneId) {
        return this.scenes.get(sceneId);
    }
    // ========================================================================
    // STREAMING
    // ========================================================================
    /**
     * Enable scene streaming
     */
    enableStreaming() {
        this.streamingEnabled = true;
    }
    /**
     * Disable scene streaming
     */
    disableStreaming() {
        this.streamingEnabled = false;
    }
    /**
     * Update streaming anchor (usually player position)
     */
    updateStreamingAnchor(position) {
        this.streamingAnchor = { ...position };
        if (this.streamingEnabled) {
            this.updateStreaming();
        }
    }
    /**
     * Update streaming (load/unload based on anchor)
     */
    async updateStreaming() {
        for (const metadata of this.sceneMetadata.values()) {
            if (!metadata.streaming?.enabled)
                continue;
            const bounds = metadata.streaming.boundingBox;
            if (!bounds)
                continue;
            const center = {
                x: (bounds.min.x + bounds.max.x) / 2,
                y: (bounds.min.y + bounds.max.y) / 2,
                z: (bounds.min.z + bounds.max.z) / 2
            };
            const dx = this.streamingAnchor.x - center.x;
            const dy = this.streamingAnchor.y - center.y;
            const dz = this.streamingAnchor.z - center.z;
            const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const scene = this.scenes.get(metadata.id);
            if (distance <= metadata.streaming.loadDistance) {
                // Should be loaded
                if (!scene || scene.loadState === SceneLoadState.Unloaded) {
                    await this.loadScene(metadata.id, SceneLoadMode.Additive);
                }
            }
            else if (distance > metadata.streaming.unloadDistance) {
                // Should be unloaded
                if (scene && scene.loadState === SceneLoadState.Loaded) {
                    await this.unloadScene(metadata.id);
                }
            }
        }
    }
    // ========================================================================
    // SCENE CREATION
    // ========================================================================
    /**
     * Create a new empty scene
     */
    createScene(name, path) {
        const id = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const metadata = {
            id,
            name,
            path: path ?? `/scenes/${id}.scene`,
            createdAt: Date.now(),
            modifiedAt: Date.now(),
            environment: {
                ambientColor: { r: 0.2, g: 0.2, b: 0.2 },
                ambientIntensity: 1,
                fogEnabled: false,
                fogColor: { r: 0.5, g: 0.5, b: 0.5 },
                fogDensity: 0.01,
                fogStart: 0,
                fogEnd: 100
            }
        };
        this.registerScene(metadata);
        const scene = new Scene(metadata);
        scene.loadState = SceneLoadState.Loaded;
        this.scenes.set(id, scene);
        this.activeScenes.push(scene);
        if (!this._mainScene) {
            this.setMainScene(scene);
        }
        return scene;
    }
    /**
     * Save scene to storage
     */
    async saveScene(sceneId) {
        const scene = this.scenes.get(sceneId);
        if (!scene) {
            throw new Error(`Scene ${sceneId} not loaded`);
        }
        const json = scene.serialize();
        // In real implementation, would save to file system
        console.log(`[SceneManager] Saving scene ${sceneId} (${json.length} bytes)`);
        scene.metadata.modifiedAt = Date.now();
        scene.clearDirty();
    }
    // ========================================================================
    // UPDATE
    // ========================================================================
    /**
     * Update all active scenes
     */
    update(deltaTime) {
        for (const scene of this.activeScenes) {
            if (scene.loadState === SceneLoadState.Loaded) {
                scene.world.update(deltaTime);
            }
        }
    }
    /**
     * Fixed update all active scenes
     */
    fixedUpdate(deltaTime) {
        for (const scene of this.activeScenes) {
            if (scene.loadState === SceneLoadState.Loaded) {
                scene.world.fixedUpdate(deltaTime);
            }
        }
    }
    /**
     * Late update all active scenes
     */
    lateUpdate(deltaTime) {
        for (const scene of this.activeScenes) {
            if (scene.loadState === SceneLoadState.Loaded) {
                scene.world.lateUpdate(deltaTime);
            }
        }
    }
    // ========================================================================
    // CLEANUP
    // ========================================================================
    dispose() {
        for (const scene of this.scenes.values()) {
            scene.dispose();
        }
        this.scenes.clear();
        this.sceneMetadata.clear();
        this.activeScenes.length = 0;
        this._mainScene = null;
        this.onSceneLoadedEmitter.dispose();
        this.onSceneUnloadedEmitter.dispose();
        this.onActiveSceneChangedEmitter.dispose();
    }
};
exports.SceneManager = SceneManager;
exports.SceneManager = SceneManager = __decorate([
    (0, inversify_1.injectable)()
], SceneManager);
// ============================================================================
// WORLD COMPOSITION (for large open worlds)
// ============================================================================
let WorldCompositionManager = class WorldCompositionManager {
    constructor() {
        // World tiles
        this.tiles = new Map();
        // Tile settings
        this.tileSize = 1000;
        this.loadRadius = 2;
        this.currentTile = { x: 0, z: 0 };
    }
    /**
     * Configure world composition
     */
    configure(tileSize, loadRadius) {
        this.tileSize = tileSize;
        this.loadRadius = loadRadius;
    }
    /**
     * Register a world tile
     */
    registerTile(x, z, sceneId) {
        const key = `${x},${z}`;
        this.tiles.set(key, { x, z, sceneId, loaded: false });
    }
    /**
     * Update player position (triggers tile loading)
     */
    async updatePlayerPosition(position) {
        const tileX = Math.floor(position.x / this.tileSize);
        const tileZ = Math.floor(position.z / this.tileSize);
        if (tileX !== this.currentTile.x || tileZ !== this.currentTile.z) {
            this.currentTile = { x: tileX, z: tileZ };
            await this.updateLoadedTiles();
        }
    }
    /**
     * Update which tiles are loaded
     */
    async updateLoadedTiles() {
        const tilesToLoad = new Set();
        const tilesToUnload = new Set();
        // Determine tiles that should be loaded
        for (let dx = -this.loadRadius; dx <= this.loadRadius; dx++) {
            for (let dz = -this.loadRadius; dz <= this.loadRadius; dz++) {
                const key = `${this.currentTile.x + dx},${this.currentTile.z + dz}`;
                if (this.tiles.has(key)) {
                    tilesToLoad.add(key);
                }
            }
        }
        // Determine tiles to unload
        for (const [key, tile] of this.tiles) {
            if (tile.loaded && !tilesToLoad.has(key)) {
                tilesToUnload.add(key);
            }
        }
        // Unload tiles
        for (const key of tilesToUnload) {
            const tile = this.tiles.get(key);
            await this.sceneManager.unloadScene(tile.sceneId);
            tile.loaded = false;
        }
        // Load tiles
        for (const key of tilesToLoad) {
            const tile = this.tiles.get(key);
            if (!tile.loaded) {
                await this.sceneManager.loadScene(tile.sceneId, SceneLoadMode.Additive);
                tile.loaded = true;
            }
        }
    }
    /**
     * Get loaded tile count
     */
    getLoadedTileCount() {
        let count = 0;
        for (const tile of this.tiles.values()) {
            if (tile.loaded)
                count++;
        }
        return count;
    }
};
exports.WorldCompositionManager = WorldCompositionManager;
__decorate([
    (0, inversify_1.inject)(SceneManager),
    __metadata("design:type", SceneManager)
], WorldCompositionManager.prototype, "sceneManager", void 0);
exports.WorldCompositionManager = WorldCompositionManager = __decorate([
    (0, inversify_1.injectable)()
], WorldCompositionManager);
