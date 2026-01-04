"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldPartitionSystem = exports.DataLayerType = exports.ActorRuntimeState = exports.CellState = void 0;
const inversify_1 = require("inversify");
const common_1 = require("@theia/core/lib/common");
var CellState;
(function (CellState) {
    CellState["Unloaded"] = "unloaded";
    CellState["Loading"] = "loading";
    CellState["Loaded"] = "loaded";
    CellState["Activated"] = "activated";
    CellState["Unloading"] = "unloading";
})(CellState || (exports.CellState = CellState = {}));
var ActorRuntimeState;
(function (ActorRuntimeState) {
    ActorRuntimeState["Unloaded"] = "unloaded";
    ActorRuntimeState["Loading"] = "loading";
    ActorRuntimeState["Loaded"] = "loaded";
    ActorRuntimeState["BeginPlay"] = "begin_play";
    ActorRuntimeState["Active"] = "active";
    ActorRuntimeState["EndPlay"] = "end_play";
    ActorRuntimeState["Unloading"] = "unloading";
})(ActorRuntimeState || (exports.ActorRuntimeState = ActorRuntimeState = {}));
var DataLayerType;
(function (DataLayerType) {
    /** Runtime data layer - always loaded when cell is loaded */
    DataLayerType["Runtime"] = "runtime";
    /** Editor data layer - only loaded in editor */
    DataLayerType["Editor"] = "editor";
    /** Optional layer - loaded on demand */
    DataLayerType["Optional"] = "optional";
})(DataLayerType || (exports.DataLayerType = DataLayerType = {}));
// ============================================================================
// WORLD PARTITION ENGINE
// ============================================================================
let WorldPartitionSystem = class WorldPartitionSystem {
    constructor() {
        this.settings = {
            cellSize: 12800, // 128m default
            gridLevels: 4,
            loadingRangeMultiplier: 2,
            enableHLOD: true,
            enableDataLayers: true,
            enableSpatialHash: true,
            maxActorsPerCell: 1000,
        };
        // Storage
        this.cells = new Map();
        this.actors = new Map();
        this.dataLayers = new Map();
        this.levelInstances = new Map();
        this.streamingSources = new Map();
        // Spatial acceleration
        this.spatialHash = new Map(); // cellKey -> actorIds
        this.actorToCells = new Map(); // actorId -> cellKeys
        // Runtime state
        this.loadedCells = new Set();
        this.activeCells = new Set();
        this.pendingLoads = new Map();
        this.pendingUnloads = new Map();
        // Memory management
        this.memoryBudgetBytes = 2 * 1024 * 1024 * 1024; // 2GB default
        this.currentMemoryUsage = 0;
        // Events
        this.onCellLoadedEmitter = new common_1.Emitter();
        this.onCellUnloadedEmitter = new common_1.Emitter();
        this.onActorLoadedEmitter = new common_1.Emitter();
        this.onActorUnloadedEmitter = new common_1.Emitter();
        this.onDataLayerChangedEmitter = new common_1.Emitter();
        this.onCellLoaded = this.onCellLoadedEmitter.event;
        this.onCellUnloaded = this.onCellUnloadedEmitter.event;
        this.onActorLoaded = this.onActorLoadedEmitter.event;
        this.onActorUnloaded = this.onActorUnloadedEmitter.event;
        this.onDataLayerChanged = this.onDataLayerChangedEmitter.event;
    }
    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    initialize(settings) {
        this.settings = { ...this.settings, ...settings };
        this.initializeGridCells();
    }
    initializeGridCells() {
        // Create root cells for each grid level
        for (let level = 0; level < this.settings.gridLevels; level++) {
            const levelCellSize = this.settings.cellSize * Math.pow(2, level);
            // Initial cells created on demand as actors are added
        }
    }
    // ========================================================================
    // CELL MANAGEMENT
    // ========================================================================
    getCellKey(gridX, gridY, gridZ, level) {
        return `${level}_${gridX}_${gridY}_${gridZ}`;
    }
    worldToCellCoords(position, level) {
        const levelCellSize = this.settings.cellSize * Math.pow(2, level);
        return {
            gridX: Math.floor(position.x / levelCellSize),
            gridY: Math.floor(position.y / levelCellSize),
            gridZ: Math.floor(position.z / levelCellSize),
        };
    }
    getOrCreateCell(gridX, gridY, gridZ, level) {
        const key = this.getCellKey(gridX, gridY, gridZ, level);
        let cell = this.cells.get(key);
        if (cell)
            return cell;
        const levelCellSize = this.settings.cellSize * Math.pow(2, level);
        cell = {
            id: key,
            gridX,
            gridY,
            gridZ,
            level,
            bounds: {
                min: {
                    x: gridX * levelCellSize,
                    y: gridY * levelCellSize,
                    z: gridZ * levelCellSize,
                },
                max: {
                    x: (gridX + 1) * levelCellSize,
                    y: (gridY + 1) * levelCellSize,
                    z: (gridZ + 1) * levelCellSize,
                },
            },
            actorIds: new Set(),
            state: CellState.Unloaded,
            priority: 0,
            childCellIds: [],
            dataLayers: new Set(),
            lastAccessTime: Date.now(),
            memorySizeBytes: 0,
        };
        // Link to parent cell
        if (level < this.settings.gridLevels - 1) {
            const parentCoords = this.worldToCellCoords({ x: gridX * levelCellSize, y: gridY * levelCellSize, z: gridZ * levelCellSize }, level + 1);
            const parentKey = this.getCellKey(parentCoords.gridX, parentCoords.gridY, parentCoords.gridZ, level + 1);
            cell.parentCellId = parentKey;
            // Ensure parent exists and add child
            const parent = this.getOrCreateCell(parentCoords.gridX, parentCoords.gridY, parentCoords.gridZ, level + 1);
            parent.childCellIds.push(key);
        }
        this.cells.set(key, cell);
        return cell;
    }
    getCellAtPosition(position, level = 0) {
        const coords = this.worldToCellCoords(position, level);
        return this.cells.get(this.getCellKey(coords.gridX, coords.gridY, coords.gridZ, level));
    }
    getCellsInBounds(bounds, level = 0) {
        const cells = [];
        const levelCellSize = this.settings.cellSize * Math.pow(2, level);
        const minCoords = this.worldToCellCoords(bounds.min, level);
        const maxCoords = this.worldToCellCoords(bounds.max, level);
        for (let x = minCoords.gridX; x <= maxCoords.gridX; x++) {
            for (let y = minCoords.gridY; y <= maxCoords.gridY; y++) {
                for (let z = minCoords.gridZ; z <= maxCoords.gridZ; z++) {
                    const cell = this.cells.get(this.getCellKey(x, y, z, level));
                    if (cell)
                        cells.push(cell);
                }
            }
        }
        return cells;
    }
    // ========================================================================
    // ACTOR MANAGEMENT
    // ========================================================================
    addActor(actor) {
        this.actors.set(actor.id, actor);
        // Calculate world bounds
        const worldBounds = this.calculateWorldBounds(actor);
        // Add to appropriate cells at level 0
        const cells = this.getCellsContainingBounds(worldBounds, 0);
        const cellIds = new Set();
        for (const cellCoords of cells) {
            const cell = this.getOrCreateCell(cellCoords.gridX, cellCoords.gridY, cellCoords.gridZ, 0);
            cell.actorIds.add(actor.id);
            cellIds.add(cell.id);
            // Add data layers
            for (const layer of actor.dataLayers) {
                cell.dataLayers.add(layer);
            }
        }
        // Store actor cell association
        actor.cellId = cellIds.values().next().value;
        this.actorToCells.set(actor.id, cellIds);
        // Update spatial hash
        if (this.settings.enableSpatialHash) {
            this.updateSpatialHash(actor.id, cellIds);
        }
        // Propagate to HLOD cells if needed
        if (actor.flags.contributesToHLOD && this.settings.enableHLOD) {
            this.markHLODDirty(cellIds);
        }
    }
    removeActor(actorId) {
        const actor = this.actors.get(actorId);
        if (!actor)
            return;
        // Remove from cells
        const cellIds = this.actorToCells.get(actorId);
        if (cellIds) {
            for (const cellId of cellIds) {
                const cell = this.cells.get(cellId);
                if (cell) {
                    cell.actorIds.delete(actorId);
                }
            }
        }
        // Remove from spatial hash
        if (this.settings.enableSpatialHash) {
            this.removeSpatialHash(actorId);
        }
        // Clean up
        this.actorToCells.delete(actorId);
        this.actors.delete(actorId);
    }
    moveActor(actorId, newTransform) {
        const actor = this.actors.get(actorId);
        if (!actor)
            return;
        actor.transform = newTransform;
        // Recalculate cells
        const worldBounds = this.calculateWorldBounds(actor);
        const newCells = this.getCellsContainingBounds(worldBounds, 0);
        const oldCellIds = this.actorToCells.get(actorId) || new Set();
        const newCellIds = new Set();
        for (const cellCoords of newCells) {
            const cell = this.getOrCreateCell(cellCoords.gridX, cellCoords.gridY, cellCoords.gridZ, 0);
            newCellIds.add(cell.id);
        }
        // Find cells to add/remove
        const toAdd = new Set([...newCellIds].filter(id => !oldCellIds.has(id)));
        const toRemove = new Set([...oldCellIds].filter(id => !newCellIds.has(id)));
        // Update cells
        for (const cellId of toRemove) {
            const cell = this.cells.get(cellId);
            if (cell)
                cell.actorIds.delete(actorId);
        }
        for (const cellId of toAdd) {
            const cell = this.cells.get(cellId);
            if (cell)
                cell.actorIds.add(actorId);
        }
        this.actorToCells.set(actorId, newCellIds);
        actor.cellId = newCellIds.values().next().value;
        // Update spatial hash
        if (this.settings.enableSpatialHash) {
            this.updateSpatialHash(actorId, newCellIds);
        }
    }
    getActor(actorId) {
        return this.actors.get(actorId);
    }
    calculateWorldBounds(actor) {
        const { position, scale } = actor.transform;
        const local = actor.localBounds;
        return {
            min: {
                x: position.x + local.min.x * scale.x,
                y: position.y + local.min.y * scale.y,
                z: position.z + local.min.z * scale.z,
            },
            max: {
                x: position.x + local.max.x * scale.x,
                y: position.y + local.max.y * scale.y,
                z: position.z + local.max.z * scale.z,
            },
        };
    }
    getCellsContainingBounds(bounds, level) {
        const results = [];
        const minCoords = this.worldToCellCoords(bounds.min, level);
        const maxCoords = this.worldToCellCoords(bounds.max, level);
        for (let x = minCoords.gridX; x <= maxCoords.gridX; x++) {
            for (let y = minCoords.gridY; y <= maxCoords.gridY; y++) {
                for (let z = minCoords.gridZ; z <= maxCoords.gridZ; z++) {
                    results.push({ gridX: x, gridY: y, gridZ: z });
                }
            }
        }
        return results;
    }
    // ========================================================================
    // SPATIAL HASHING
    // ========================================================================
    getSpatialHashKey(position) {
        const hashSize = this.settings.cellSize / 4; // Finer granularity for spatial hash
        const x = Math.floor(position.x / hashSize);
        const y = Math.floor(position.y / hashSize);
        const z = Math.floor(position.z / hashSize);
        return `sh_${x}_${y}_${z}`;
    }
    updateSpatialHash(actorId, cellIds) {
        const actor = this.actors.get(actorId);
        if (!actor)
            return;
        // Remove old entries
        this.removeSpatialHash(actorId);
        // Add new entries
        const bounds = this.calculateWorldBounds(actor);
        const hashKeys = this.getSpatialHashKeysForBounds(bounds);
        for (const key of hashKeys) {
            let actors = this.spatialHash.get(key);
            if (!actors) {
                actors = new Set();
                this.spatialHash.set(key, actors);
            }
            actors.add(actorId);
        }
    }
    removeSpatialHash(actorId) {
        for (const [key, actors] of this.spatialHash) {
            actors.delete(actorId);
            if (actors.size === 0) {
                this.spatialHash.delete(key);
            }
        }
    }
    getSpatialHashKeysForBounds(bounds) {
        const keys = [];
        const hashSize = this.settings.cellSize / 4;
        const minX = Math.floor(bounds.min.x / hashSize);
        const maxX = Math.floor(bounds.max.x / hashSize);
        const minY = Math.floor(bounds.min.y / hashSize);
        const maxY = Math.floor(bounds.max.y / hashSize);
        const minZ = Math.floor(bounds.min.z / hashSize);
        const maxZ = Math.floor(bounds.max.z / hashSize);
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                for (let z = minZ; z <= maxZ; z++) {
                    keys.push(`sh_${x}_${y}_${z}`);
                }
            }
        }
        return keys;
    }
    // ========================================================================
    // STREAMING
    // ========================================================================
    addStreamingSource(source) {
        this.streamingSources.set(source.id, source);
    }
    removeStreamingSource(sourceId) {
        this.streamingSources.delete(sourceId);
    }
    updateStreamingSource(sourceId, position) {
        const source = this.streamingSources.get(sourceId);
        if (source) {
            source.position = position;
        }
    }
    /**
     * Main streaming update - call every frame
     */
    async updateStreaming() {
        const cellsToLoad = new Set();
        const cellsToUnload = new Set();
        // Determine which cells should be loaded based on streaming sources
        for (const source of this.streamingSources.values()) {
            if (!source.isActive)
                continue;
            const radius = source.loadingRadius;
            const bounds = {
                min: {
                    x: source.position.x - radius,
                    y: source.position.y - radius,
                    z: source.position.z - radius,
                },
                max: {
                    x: source.position.x + radius,
                    y: source.position.y + radius,
                    z: source.position.z + radius,
                },
            };
            // Get cells at each level
            for (let level = 0; level < this.settings.gridLevels; level++) {
                const levelRadius = radius * Math.pow(this.settings.loadingRangeMultiplier, level);
                const levelBounds = {
                    min: {
                        x: source.position.x - levelRadius,
                        y: source.position.y - levelRadius,
                        z: source.position.z - levelRadius,
                    },
                    max: {
                        x: source.position.x + levelRadius,
                        y: source.position.y + levelRadius,
                        z: source.position.z + levelRadius,
                    },
                };
                const cellCoords = this.getCellsContainingBounds(levelBounds, level);
                for (const coords of cellCoords) {
                    const key = this.getCellKey(coords.gridX, coords.gridY, coords.gridZ, level);
                    const cell = this.cells.get(key);
                    if (cell) {
                        const distance = this.vec3Distance(source.position, this.getCellCenter(cell));
                        cell.priority = Math.max(cell.priority, source.priority * (1 - distance / levelRadius));
                        cellsToLoad.add(key);
                    }
                }
            }
        }
        // Find cells to unload
        for (const cellId of this.loadedCells) {
            if (!cellsToLoad.has(cellId)) {
                cellsToUnload.add(cellId);
            }
        }
        // Process unloads first to free memory
        for (const cellId of cellsToUnload) {
            if (!this.pendingUnloads.has(cellId)) {
                this.pendingUnloads.set(cellId, this.unloadCell(cellId));
            }
        }
        // Process loads (sorted by priority)
        const sortedLoads = Array.from(cellsToLoad)
            .filter(id => !this.loadedCells.has(id) && !this.pendingLoads.has(id))
            .map(id => ({ id, priority: this.cells.get(id)?.priority || 0 }))
            .sort((a, b) => b.priority - a.priority);
        for (const { id } of sortedLoads) {
            // Check memory budget
            const cell = this.cells.get(id);
            if (cell && this.currentMemoryUsage + cell.memorySizeBytes > this.memoryBudgetBytes) {
                continue; // Skip if would exceed budget
            }
            this.pendingLoads.set(id, this.loadCell(id));
        }
        // Wait for critical loads
        const criticalLoads = sortedLoads.slice(0, 5).map(l => this.pendingLoads.get(l.id));
        await Promise.all(criticalLoads);
    }
    async loadCell(cellId) {
        const cell = this.cells.get(cellId);
        if (!cell || cell.state !== CellState.Unloaded)
            return;
        cell.state = CellState.Loading;
        try {
            // Load actors in this cell
            for (const actorId of cell.actorIds) {
                const actor = this.actors.get(actorId);
                if (actor && !actor.flags.alwaysLoaded && actor.flags.isStreamable) {
                    await this.loadActor(actor);
                }
            }
            cell.state = CellState.Loaded;
            this.loadedCells.add(cellId);
            this.currentMemoryUsage += cell.memorySizeBytes;
            this.onCellLoadedEmitter.fire(cell);
        }
        catch (error) {
            cell.state = CellState.Unloaded;
            throw error;
        }
        finally {
            this.pendingLoads.delete(cellId);
        }
    }
    async unloadCell(cellId) {
        const cell = this.cells.get(cellId);
        if (!cell || cell.state === CellState.Unloaded)
            return;
        cell.state = CellState.Unloading;
        try {
            // Unload actors in this cell
            for (const actorId of cell.actorIds) {
                const actor = this.actors.get(actorId);
                if (actor && !actor.flags.alwaysLoaded && actor.flags.isStreamable) {
                    await this.unloadActor(actor);
                }
            }
            cell.state = CellState.Unloaded;
            this.loadedCells.delete(cellId);
            this.currentMemoryUsage -= cell.memorySizeBytes;
            this.onCellUnloadedEmitter.fire(cell);
        }
        catch (error) {
            cell.state = CellState.Loaded;
            throw error;
        }
        finally {
            this.pendingUnloads.delete(cellId);
        }
    }
    async loadActor(actor) {
        actor.runtimeState = ActorRuntimeState.Loading;
        actor.runtimeState = ActorRuntimeState.Loaded;
        actor.isSpatiallyLoaded = true;
        this.onActorLoadedEmitter.fire(actor);
    }
    async unloadActor(actor) {
        actor.runtimeState = ActorRuntimeState.Unloading;
        // Cleanup actor
        actor.runtimeState = ActorRuntimeState.Unloaded;
        actor.isSpatiallyLoaded = false;
        this.onActorUnloadedEmitter.fire(actor);
    }
    getCellCenter(cell) {
        return {
            x: (cell.bounds.min.x + cell.bounds.max.x) / 2,
            y: (cell.bounds.min.y + cell.bounds.max.y) / 2,
            z: (cell.bounds.min.z + cell.bounds.max.z) / 2,
        };
    }
    // ========================================================================
    // DATA LAYERS
    // ========================================================================
    createDataLayer(config) {
        const layer = {
            ...config,
            actorIds: new Set(),
            childLayerIds: [],
        };
        // Link to parent
        if (layer.parentLayerId) {
            const parent = this.dataLayers.get(layer.parentLayerId);
            if (parent) {
                parent.childLayerIds.push(layer.id);
            }
        }
        this.dataLayers.set(layer.id, layer);
        return layer;
    }
    getDataLayer(id) {
        return this.dataLayers.get(id);
    }
    setDataLayerLoaded(layerId, loaded) {
        const layer = this.dataLayers.get(layerId);
        if (!layer)
            return;
        layer.isLoaded = loaded;
        // Load/unload actors in this layer
        for (const actorId of layer.actorIds) {
            const actor = this.actors.get(actorId);
            if (actor) {
                if (loaded && !actor.isSpatiallyLoaded) {
                    this.loadActor(actor);
                }
                else if (!loaded && actor.isSpatiallyLoaded) {
                    this.unloadActor(actor);
                }
            }
        }
        this.onDataLayerChangedEmitter.fire(layer);
    }
    setDataLayerVisible(layerId, visible) {
        const layer = this.dataLayers.get(layerId);
        if (layer) {
            layer.isVisible = visible;
            this.onDataLayerChangedEmitter.fire(layer);
        }
    }
    addActorToDataLayer(actorId, layerId) {
        const actor = this.actors.get(actorId);
        const layer = this.dataLayers.get(layerId);
        if (!actor || !layer)
            return;
        actor.dataLayers.add(layerId);
        layer.actorIds.add(actorId);
        // Update cell data layers
        const cellIds = this.actorToCells.get(actorId);
        if (cellIds) {
            for (const cellId of cellIds) {
                const cell = this.cells.get(cellId);
                if (cell)
                    cell.dataLayers.add(layerId);
            }
        }
    }
    // ========================================================================
    // LEVEL INSTANCES
    // ========================================================================
    createLevelInstance(config) {
        const instance = {
            ...config,
            actorIds: new Set(),
            isLoaded: false,
        };
        this.levelInstances.set(instance.id, instance);
        return instance;
    }
    async loadLevelInstance(instanceId) {
        const instance = this.levelInstances.get(instanceId);
        if (!instance || instance.isLoaded)
            return;
        // Load source level and instantiate actors
        // This would load from asset system
        instance.isLoaded = true;
    }
    async unloadLevelInstance(instanceId) {
        const instance = this.levelInstances.get(instanceId);
        if (!instance || !instance.isLoaded)
            return;
        // Remove all actors in instance
        for (const actorId of instance.actorIds) {
            this.removeActor(actorId);
        }
        instance.actorIds.clear();
        instance.isLoaded = false;
    }
    // ========================================================================
    // SPATIAL QUERIES
    // ========================================================================
    querySpatial(query) {
        const results = [];
        const candidates = new Set();
        // Get candidate actors from spatial hash
        if (query.bounds) {
            const hashKeys = this.getSpatialHashKeysForBounds(query.bounds);
            for (const key of hashKeys) {
                const actors = this.spatialHash.get(key);
                if (actors) {
                    for (const actorId of actors) {
                        candidates.add(actorId);
                    }
                }
            }
        }
        else if (query.sphere) {
            const bounds = {
                min: {
                    x: query.sphere.center.x - query.sphere.radius,
                    y: query.sphere.center.y - query.sphere.radius,
                    z: query.sphere.center.z - query.sphere.radius,
                },
                max: {
                    x: query.sphere.center.x + query.sphere.radius,
                    y: query.sphere.center.y + query.sphere.radius,
                    z: query.sphere.center.z + query.sphere.radius,
                },
            };
            const hashKeys = this.getSpatialHashKeysForBounds(bounds);
            for (const key of hashKeys) {
                const actors = this.spatialHash.get(key);
                if (actors) {
                    for (const actorId of actors) {
                        candidates.add(actorId);
                    }
                }
            }
        }
        // Filter candidates
        for (const actorId of candidates) {
            const actor = this.actors.get(actorId);
            if (!actor)
                continue;
            // Check loaded state
            if (!query.includeUnloaded && !actor.isSpatiallyLoaded)
                continue;
            // Check class filter
            if (query.actorClassFilter && !query.actorClassFilter.includes(actor.actorClass))
                continue;
            // Check data layer filter
            if (query.dataLayerFilter) {
                const hasLayer = query.dataLayerFilter.some(l => actor.dataLayers.has(l));
                if (!hasLayer)
                    continue;
            }
            // Calculate distance
            let distance = 0;
            let hitPoint;
            if (query.sphere) {
                distance = this.vec3Distance(query.sphere.center, actor.transform.position);
                if (distance > query.sphere.radius)
                    continue;
            }
            else if (query.bounds) {
                // Point in bounds check
                const pos = actor.transform.position;
                if (pos.x < query.bounds.min.x || pos.x > query.bounds.max.x ||
                    pos.y < query.bounds.min.y || pos.y > query.bounds.max.y ||
                    pos.z < query.bounds.min.z || pos.z > query.bounds.max.z) {
                    continue;
                }
            }
            else if (query.ray) {
                const hit = this.rayIntersectsActor(query.ray, actor);
                if (!hit)
                    continue;
                distance = hit.distance;
                hitPoint = hit.point;
            }
            results.push({ actorId, distance, hitPoint });
            if (results.length >= query.maxResults)
                break;
        }
        // Sort by distance
        results.sort((a, b) => a.distance - b.distance);
        return results.slice(0, query.maxResults);
    }
    rayIntersectsActor(ray, actor) {
        // Simple AABB ray intersection
        const bounds = this.calculateWorldBounds(actor);
        let tmin = 0;
        let tmax = ray.maxDistance;
        for (let axis = 0; axis < 3; axis++) {
            const axisKey = ['x', 'y', 'z'][axis];
            const invD = 1 / ray.direction[axisKey];
            let t0 = (bounds.min[axisKey] - ray.origin[axisKey]) * invD;
            let t1 = (bounds.max[axisKey] - ray.origin[axisKey]) * invD;
            if (invD < 0) {
                [t0, t1] = [t1, t0];
            }
            tmin = Math.max(tmin, t0);
            tmax = Math.min(tmax, t1);
            if (tmax <= tmin)
                return null;
        }
        const point = {
            x: ray.origin.x + ray.direction.x * tmin,
            y: ray.origin.y + ray.direction.y * tmin,
            z: ray.origin.z + ray.direction.z * tmin,
        };
        return { distance: tmin, point };
    }
    // ========================================================================
    // HLOD SYSTEM
    // ========================================================================
    markHLODDirty(cellIds) {
        for (const cellId of cellIds) {
            const cell = this.cells.get(cellId);
            if (cell?.hlod) {
                cell.hlod.buildStatus = 'pending';
            }
            // Propagate to parent
            if (cell?.parentCellId) {
                this.markHLODDirty(new Set([cell.parentCellId]));
            }
        }
    }
    /**
     * Build HLODs for dirty cells
     */
    async buildHLODs() {
        for (const cell of this.cells.values()) {
            if (cell.hlod?.buildStatus === 'pending') {
                await this.buildHLODForCell(cell);
            }
        }
    }
    async buildHLODForCell(cell) {
        if (!cell.hlod) {
            cell.hlod = {
                lodDistances: [1000, 5000, 20000],
                buildStatus: 'building',
            };
        }
        cell.hlod.buildStatus = 'building';
        try {
            // Collect static actors that contribute to HLOD
            const staticActors = [];
            for (const actorId of cell.actorIds) {
                const actor = this.actors.get(actorId);
                if (actor?.flags.contributesToHLOD && actor.flags.isStatic) {
                    staticActors.push(actor);
                }
            }
            if (staticActors.length > 0) {
                // Generate combined mesh (would use mesh simplification)
                // cell.hlod.combinedMeshId = await this.generateCombinedMesh(staticActors);
                // Generate impostor for very far distances
                // cell.hlod.impostorMeshId = await this.generateImpostor(staticActors);
            }
            cell.hlod.buildStatus = 'built';
        }
        catch (error) {
            cell.hlod.buildStatus = 'error';
            throw error;
        }
    }
    // ========================================================================
    // STATISTICS & DEBUG
    // ========================================================================
    getStatistics() {
        let loadedActors = 0;
        let totalActors = this.actors.size;
        for (const actor of this.actors.values()) {
            if (actor.isSpatiallyLoaded)
                loadedActors++;
        }
        return {
            totalCells: this.cells.size,
            loadedCells: this.loadedCells.size,
            activeCells: this.activeCells.size,
            totalActors,
            loadedActors,
            memoryUsageBytes: this.currentMemoryUsage,
            memoryBudgetBytes: this.memoryBudgetBytes,
            dataLayers: this.dataLayers.size,
            levelInstances: this.levelInstances.size,
            streamingSources: this.streamingSources.size,
        };
    }
    // ========================================================================
    // UTILITIES
    // ========================================================================
    vec3Distance(a, b) {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
};
exports.WorldPartitionSystem = WorldPartitionSystem;
exports.WorldPartitionSystem = WorldPartitionSystem = __decorate([
    (0, inversify_1.injectable)()
], WorldPartitionSystem);
