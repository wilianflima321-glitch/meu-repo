import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

/**
 * ============================================================================
 * AETHEL WORLD PARTITION SYSTEM
 * ============================================================================
 * 
 * Sistema de particionamento de mundo AAA inspirado em:
 * - Unreal Engine 5 World Partition
 * - Hierarchical Level of Detail (HLOD)
 * - Runtime World Composition
 * 
 * Recursos:
 * - Grid-based world partition
 * - Automatic cell streaming
 * - HLOD generation
 * - Data layers (runtime/editor)
 * - Actor spatial queries
 * - Level instances
 * - One File Per Actor (OFPA)
 */

// ============================================================================
// MATH TYPES
// ============================================================================

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export interface BoundingBox {
    min: Vector3;
    max: Vector3;
}

export interface Transform {
    position: Vector3;
    rotation: { x: number; y: number; z: number; w: number };
    scale: Vector3;
}

// ============================================================================
// WORLD PARTITION TYPES
// ============================================================================

export interface WorldPartitionSettings {
    /** Size of each grid cell in world units */
    cellSize: number;
    /** Number of grid levels for HLOD */
    gridLevels: number;
    /** Loading range multiplier per level */
    loadingRangeMultiplier: number;
    /** Enable HLOD system */
    enableHLOD: boolean;
    /** Enable data layers */
    enableDataLayers: boolean;
    /** Enable runtime spatial hashing */
    enableSpatialHash: boolean;
    /** Maximum actors per cell before subdivision */
    maxActorsPerCell: number;
}

export interface WorldCell {
    id: string;
    /** Grid coordinates */
    gridX: number;
    gridY: number;
    gridZ: number;
    /** Grid level (0 = finest) */
    level: number;
    /** World-space bounds */
    bounds: BoundingBox;
    /** Actors in this cell */
    actorIds: Set<string>;
    /** Cell state */
    state: CellState;
    /** Loading priority */
    priority: number;
    /** Parent cell at coarser level */
    parentCellId?: string;
    /** Child cells at finer level */
    childCellIds: string[];
    /** HLOD data */
    hlod?: HLODCell;
    /** Data layer associations */
    dataLayers: Set<string>;
    /** Last access time */
    lastAccessTime: number;
    /** Memory size estimate in bytes */
    memorySizeBytes: number;
}

export enum CellState {
    Unloaded = 'unloaded',
    Loading = 'loading',
    Loaded = 'loaded',
    Activated = 'activated',
    Unloading = 'unloading',
}

export interface HLODCell {
    /** Combined mesh for this cell */
    combinedMeshId?: string;
    /** Impostor mesh for far distance */
    impostorMeshId?: string;
    /** Simplified collision */
    simplifiedCollision?: string;
    /** LOD distances */
    lodDistances: number[];
    /** Build status */
    buildStatus: 'pending' | 'building' | 'built' | 'error';
}

// ============================================================================
// ACTOR TYPES
// ============================================================================

export interface WorldActor {
    id: string;
    /** Actor name */
    name: string;
    /** Actor class/type */
    actorClass: string;
    /** World transform */
    transform: Transform;
    /** Bounding box in local space */
    localBounds: BoundingBox;
    /** Current cell */
    cellId?: string;
    /** Data layers this actor belongs to */
    dataLayers: Set<string>;
    /** Is actor spatially loaded */
    isSpatiallyLoaded: boolean;
    /** Actor flags */
    flags: ActorFlags;
    /** Custom properties */
    properties: Map<string, unknown>;
    /** Serialized data path (OFPA) */
    dataPath?: string;
    /** Runtime state */
    runtimeState: ActorRuntimeState;
}

export interface ActorFlags {
    /** Can be streamed in/out */
    isStreamable: boolean;
    /** Always loaded */
    alwaysLoaded: boolean;
    /** Hidden in editor */
    hiddenInEditor: boolean;
    /** Hidden in game */
    hiddenInGame: boolean;
    /** Is static (non-movable) */
    isStatic: boolean;
    /** Contributes to HLOD */
    contributesToHLOD: boolean;
    /** Can be selected */
    isSelectable: boolean;
}

export enum ActorRuntimeState {
    Unloaded = 'unloaded',
    Loading = 'loading',
    Loaded = 'loaded',
    BeginPlay = 'begin_play',
    Active = 'active',
    EndPlay = 'end_play',
    Unloading = 'unloading',
}

// ============================================================================
// DATA LAYER TYPES
// ============================================================================

export interface DataLayer {
    id: string;
    name: string;
    /** Layer type */
    type: DataLayerType;
    /** Is layer currently loaded */
    isLoaded: boolean;
    /** Is layer visible */
    isVisible: boolean;
    /** Parent layer */
    parentLayerId?: string;
    /** Child layers */
    childLayerIds: string[];
    /** Actors in this layer */
    actorIds: Set<string>;
    /** Layer color (for editor visualization) */
    color: { r: number; g: number; b: number };
    /** Description */
    description: string;
}

export enum DataLayerType {
    /** Runtime data layer - always loaded when cell is loaded */
    Runtime = 'runtime',
    /** Editor data layer - only loaded in editor */
    Editor = 'editor',
    /** Optional layer - loaded on demand */
    Optional = 'optional',
}

// ============================================================================
// LEVEL INSTANCE TYPES
// ============================================================================

export interface LevelInstance {
    id: string;
    name: string;
    /** Source level asset */
    sourceLevelId: string;
    /** Instance transform */
    transform: Transform;
    /** World bounds after transform */
    worldBounds: BoundingBox;
    /** Is loaded */
    isLoaded: boolean;
    /** Actors in this instance */
    actorIds: Set<string>;
    /** Can be streamed */
    isStreamable: boolean;
    /** Loading priority */
    priority: number;
}

// ============================================================================
// STREAMING SOURCE TYPES
// ============================================================================

export interface StreamingSource {
    id: string;
    name: string;
    /** Source position */
    position: Vector3;
    /** Loading radius */
    loadingRadius: number;
    /** Is active */
    isActive: boolean;
    /** Priority */
    priority: number;
    /** Source type */
    type: 'player' | 'camera' | 'custom';
}

// ============================================================================
// SPATIAL QUERY TYPES
// ============================================================================

export interface SpatialQuery {
    /** Query bounds */
    bounds?: BoundingBox;
    /** Query sphere */
    sphere?: { center: Vector3; radius: number };
    /** Query ray */
    ray?: { origin: Vector3; direction: Vector3; maxDistance: number };
    /** Filter by actor class */
    actorClassFilter?: string[];
    /** Filter by data layer */
    dataLayerFilter?: string[];
    /** Include unloaded actors */
    includeUnloaded: boolean;
    /** Maximum results */
    maxResults: number;
}

export interface SpatialQueryResult {
    actorId: string;
    distance: number;
    hitPoint?: Vector3;
}

// ============================================================================
// WORLD PARTITION ENGINE
// ============================================================================

@injectable()
export class WorldPartitionSystem {
    private settings: WorldPartitionSettings = {
        cellSize: 12800, // 128m default
        gridLevels: 4,
        loadingRangeMultiplier: 2,
        enableHLOD: true,
        enableDataLayers: true,
        enableSpatialHash: true,
        maxActorsPerCell: 1000,
    };

    // Storage
    private cells = new Map<string, WorldCell>();
    private actors = new Map<string, WorldActor>();
    private dataLayers = new Map<string, DataLayer>();
    private levelInstances = new Map<string, LevelInstance>();
    private streamingSources = new Map<string, StreamingSource>();

    // Spatial acceleration
    private spatialHash = new Map<string, Set<string>>(); // cellKey -> actorIds
    private actorToCells = new Map<string, Set<string>>(); // actorId -> cellKeys

    // Runtime state
    private loadedCells = new Set<string>();
    private activeCells = new Set<string>();
    private pendingLoads = new Map<string, Promise<void>>();
    private pendingUnloads = new Map<string, Promise<void>>();

    // Memory management
    private memoryBudgetBytes = 2 * 1024 * 1024 * 1024; // 2GB default
    private currentMemoryUsage = 0;

    // Events
    private readonly onCellLoadedEmitter = new Emitter<WorldCell>();
    private readonly onCellUnloadedEmitter = new Emitter<WorldCell>();
    private readonly onActorLoadedEmitter = new Emitter<WorldActor>();
    private readonly onActorUnloadedEmitter = new Emitter<WorldActor>();
    private readonly onDataLayerChangedEmitter = new Emitter<DataLayer>();

    readonly onCellLoaded: Event<WorldCell> = this.onCellLoadedEmitter.event;
    readonly onCellUnloaded: Event<WorldCell> = this.onCellUnloadedEmitter.event;
    readonly onActorLoaded: Event<WorldActor> = this.onActorLoadedEmitter.event;
    readonly onActorUnloaded: Event<WorldActor> = this.onActorUnloadedEmitter.event;
    readonly onDataLayerChanged: Event<DataLayer> = this.onDataLayerChangedEmitter.event;

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    initialize(settings: Partial<WorldPartitionSettings>): void {
        this.settings = { ...this.settings, ...settings };
        this.initializeGridCells();
    }

    private initializeGridCells(): void {
        // Create root cells for each grid level
        for (let level = 0; level < this.settings.gridLevels; level++) {
            const levelCellSize = this.settings.cellSize * Math.pow(2, level);
            // Initial cells created on demand as actors are added
        }
    }

    // ========================================================================
    // CELL MANAGEMENT
    // ========================================================================

    private getCellKey(gridX: number, gridY: number, gridZ: number, level: number): string {
        return `${level}_${gridX}_${gridY}_${gridZ}`;
    }

    private worldToCellCoords(position: Vector3, level: number): { gridX: number; gridY: number; gridZ: number } {
        const levelCellSize = this.settings.cellSize * Math.pow(2, level);
        return {
            gridX: Math.floor(position.x / levelCellSize),
            gridY: Math.floor(position.y / levelCellSize),
            gridZ: Math.floor(position.z / levelCellSize),
        };
    }

    private getOrCreateCell(gridX: number, gridY: number, gridZ: number, level: number): WorldCell {
        const key = this.getCellKey(gridX, gridY, gridZ, level);
        
        let cell = this.cells.get(key);
        if (cell) return cell;

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
            const parentCoords = this.worldToCellCoords(
                { x: gridX * levelCellSize, y: gridY * levelCellSize, z: gridZ * levelCellSize },
                level + 1
            );
            const parentKey = this.getCellKey(parentCoords.gridX, parentCoords.gridY, parentCoords.gridZ, level + 1);
            cell.parentCellId = parentKey;

            // Ensure parent exists and add child
            const parent = this.getOrCreateCell(parentCoords.gridX, parentCoords.gridY, parentCoords.gridZ, level + 1);
            parent.childCellIds.push(key);
        }

        this.cells.set(key, cell);
        return cell;
    }

    getCellAtPosition(position: Vector3, level: number = 0): WorldCell | undefined {
        const coords = this.worldToCellCoords(position, level);
        return this.cells.get(this.getCellKey(coords.gridX, coords.gridY, coords.gridZ, level));
    }

    getCellsInBounds(bounds: BoundingBox, level: number = 0): WorldCell[] {
        const cells: WorldCell[] = [];
        const levelCellSize = this.settings.cellSize * Math.pow(2, level);

        const minCoords = this.worldToCellCoords(bounds.min, level);
        const maxCoords = this.worldToCellCoords(bounds.max, level);

        for (let x = minCoords.gridX; x <= maxCoords.gridX; x++) {
            for (let y = minCoords.gridY; y <= maxCoords.gridY; y++) {
                for (let z = minCoords.gridZ; z <= maxCoords.gridZ; z++) {
                    const cell = this.cells.get(this.getCellKey(x, y, z, level));
                    if (cell) cells.push(cell);
                }
            }
        }

        return cells;
    }

    // ========================================================================
    // ACTOR MANAGEMENT
    // ========================================================================

    addActor(actor: WorldActor): void {
        this.actors.set(actor.id, actor);

        // Calculate world bounds
        const worldBounds = this.calculateWorldBounds(actor);

        // Add to appropriate cells at level 0
        const cells = this.getCellsContainingBounds(worldBounds, 0);
        const cellIds = new Set<string>();

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

    removeActor(actorId: string): void {
        const actor = this.actors.get(actorId);
        if (!actor) return;

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

    moveActor(actorId: string, newTransform: Transform): void {
        const actor = this.actors.get(actorId);
        if (!actor) return;

        actor.transform = newTransform;

        // Recalculate cells
        const worldBounds = this.calculateWorldBounds(actor);
        const newCells = this.getCellsContainingBounds(worldBounds, 0);
        const oldCellIds = this.actorToCells.get(actorId) || new Set();
        const newCellIds = new Set<string>();

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
            if (cell) cell.actorIds.delete(actorId);
        }

        for (const cellId of toAdd) {
            const cell = this.cells.get(cellId);
            if (cell) cell.actorIds.add(actorId);
        }

        this.actorToCells.set(actorId, newCellIds);
        actor.cellId = newCellIds.values().next().value;

        // Update spatial hash
        if (this.settings.enableSpatialHash) {
            this.updateSpatialHash(actorId, newCellIds);
        }
    }

    getActor(actorId: string): WorldActor | undefined {
        return this.actors.get(actorId);
    }

    private calculateWorldBounds(actor: WorldActor): BoundingBox {
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

    private getCellsContainingBounds(bounds: BoundingBox, level: number): { gridX: number; gridY: number; gridZ: number }[] {
        const results: { gridX: number; gridY: number; gridZ: number }[] = [];
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

    private getSpatialHashKey(position: Vector3): string {
        const hashSize = this.settings.cellSize / 4; // Finer granularity for spatial hash
        const x = Math.floor(position.x / hashSize);
        const y = Math.floor(position.y / hashSize);
        const z = Math.floor(position.z / hashSize);
        return `sh_${x}_${y}_${z}`;
    }

    private updateSpatialHash(actorId: string, cellIds: Set<string>): void {
        const actor = this.actors.get(actorId);
        if (!actor) return;

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

    private removeSpatialHash(actorId: string): void {
        for (const [key, actors] of this.spatialHash) {
            actors.delete(actorId);
            if (actors.size === 0) {
                this.spatialHash.delete(key);
            }
        }
    }

    private getSpatialHashKeysForBounds(bounds: BoundingBox): string[] {
        const keys: string[] = [];
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

    addStreamingSource(source: StreamingSource): void {
        this.streamingSources.set(source.id, source);
    }

    removeStreamingSource(sourceId: string): void {
        this.streamingSources.delete(sourceId);
    }

    updateStreamingSource(sourceId: string, position: Vector3): void {
        const source = this.streamingSources.get(sourceId);
        if (source) {
            source.position = position;
        }
    }

    /**
     * Main streaming update - call every frame
     */
    async updateStreaming(): Promise<void> {
        const cellsToLoad = new Set<string>();
        const cellsToUnload = new Set<string>();

        // Determine which cells should be loaded based on streaming sources
        for (const source of this.streamingSources.values()) {
            if (!source.isActive) continue;

            const radius = source.loadingRadius;
            const bounds: BoundingBox = {
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
                const levelBounds: BoundingBox = {
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

    private async loadCell(cellId: string): Promise<void> {
        const cell = this.cells.get(cellId);
        if (!cell || cell.state !== CellState.Unloaded) return;

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
        } catch (error) {
            cell.state = CellState.Unloaded;
            throw error;
        } finally {
            this.pendingLoads.delete(cellId);
        }
    }

    private async unloadCell(cellId: string): Promise<void> {
        const cell = this.cells.get(cellId);
        if (!cell || cell.state === CellState.Unloaded) return;

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
        } catch (error) {
            cell.state = CellState.Loaded;
            throw error;
        } finally {
            this.pendingUnloads.delete(cellId);
        }
    }

    private async loadActor(actor: WorldActor): Promise<void> {
        actor.runtimeState = ActorRuntimeState.Loading;

        actor.runtimeState = ActorRuntimeState.Loaded;
        actor.isSpatiallyLoaded = true;
        this.onActorLoadedEmitter.fire(actor);
    }

    private async unloadActor(actor: WorldActor): Promise<void> {
        actor.runtimeState = ActorRuntimeState.Unloading;

        // Cleanup actor
        actor.runtimeState = ActorRuntimeState.Unloaded;
        actor.isSpatiallyLoaded = false;
        this.onActorUnloadedEmitter.fire(actor);
    }

    private getCellCenter(cell: WorldCell): Vector3 {
        return {
            x: (cell.bounds.min.x + cell.bounds.max.x) / 2,
            y: (cell.bounds.min.y + cell.bounds.max.y) / 2,
            z: (cell.bounds.min.z + cell.bounds.max.z) / 2,
        };
    }

    // ========================================================================
    // DATA LAYERS
    // ========================================================================

    createDataLayer(config: Omit<DataLayer, 'actorIds' | 'childLayerIds'>): DataLayer {
        const layer: DataLayer = {
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

    getDataLayer(id: string): DataLayer | undefined {
        return this.dataLayers.get(id);
    }

    setDataLayerLoaded(layerId: string, loaded: boolean): void {
        const layer = this.dataLayers.get(layerId);
        if (!layer) return;

        layer.isLoaded = loaded;

        // Load/unload actors in this layer
        for (const actorId of layer.actorIds) {
            const actor = this.actors.get(actorId);
            if (actor) {
                if (loaded && !actor.isSpatiallyLoaded) {
                    this.loadActor(actor);
                } else if (!loaded && actor.isSpatiallyLoaded) {
                    this.unloadActor(actor);
                }
            }
        }

        this.onDataLayerChangedEmitter.fire(layer);
    }

    setDataLayerVisible(layerId: string, visible: boolean): void {
        const layer = this.dataLayers.get(layerId);
        if (layer) {
            layer.isVisible = visible;
            this.onDataLayerChangedEmitter.fire(layer);
        }
    }

    addActorToDataLayer(actorId: string, layerId: string): void {
        const actor = this.actors.get(actorId);
        const layer = this.dataLayers.get(layerId);
        if (!actor || !layer) return;

        actor.dataLayers.add(layerId);
        layer.actorIds.add(actorId);

        // Update cell data layers
        const cellIds = this.actorToCells.get(actorId);
        if (cellIds) {
            for (const cellId of cellIds) {
                const cell = this.cells.get(cellId);
                if (cell) cell.dataLayers.add(layerId);
            }
        }
    }

    // ========================================================================
    // LEVEL INSTANCES
    // ========================================================================

    createLevelInstance(config: Omit<LevelInstance, 'actorIds' | 'isLoaded'>): LevelInstance {
        const instance: LevelInstance = {
            ...config,
            actorIds: new Set(),
            isLoaded: false,
        };

        this.levelInstances.set(instance.id, instance);
        return instance;
    }

    async loadLevelInstance(instanceId: string): Promise<void> {
        const instance = this.levelInstances.get(instanceId);
        if (!instance || instance.isLoaded) return;

        // Load source level and instantiate actors
        // This would load from asset system

        instance.isLoaded = true;
    }

    async unloadLevelInstance(instanceId: string): Promise<void> {
        const instance = this.levelInstances.get(instanceId);
        if (!instance || !instance.isLoaded) return;

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

    querySpatial(query: SpatialQuery): SpatialQueryResult[] {
        const results: SpatialQueryResult[] = [];
        const candidates = new Set<string>();

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
        } else if (query.sphere) {
            const bounds: BoundingBox = {
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
            if (!actor) continue;

            // Check loaded state
            if (!query.includeUnloaded && !actor.isSpatiallyLoaded) continue;

            // Check class filter
            if (query.actorClassFilter && !query.actorClassFilter.includes(actor.actorClass)) continue;

            // Check data layer filter
            if (query.dataLayerFilter) {
                const hasLayer = query.dataLayerFilter.some(l => actor.dataLayers.has(l));
                if (!hasLayer) continue;
            }

            // Calculate distance
            let distance = 0;
            let hitPoint: Vector3 | undefined;

            if (query.sphere) {
                distance = this.vec3Distance(query.sphere.center, actor.transform.position);
                if (distance > query.sphere.radius) continue;
            } else if (query.bounds) {
                // Point in bounds check
                const pos = actor.transform.position;
                if (pos.x < query.bounds.min.x || pos.x > query.bounds.max.x ||
                    pos.y < query.bounds.min.y || pos.y > query.bounds.max.y ||
                    pos.z < query.bounds.min.z || pos.z > query.bounds.max.z) {
                    continue;
                }
            } else if (query.ray) {
                const hit = this.rayIntersectsActor(query.ray, actor);
                if (!hit) continue;
                distance = hit.distance;
                hitPoint = hit.point;
            }

            results.push({ actorId, distance, hitPoint });

            if (results.length >= query.maxResults) break;
        }

        // Sort by distance
        results.sort((a, b) => a.distance - b.distance);

        return results.slice(0, query.maxResults);
    }

    private rayIntersectsActor(ray: { origin: Vector3; direction: Vector3; maxDistance: number }, actor: WorldActor): { distance: number; point: Vector3 } | null {
        // Simple AABB ray intersection
        const bounds = this.calculateWorldBounds(actor);
        
        let tmin = 0;
        let tmax = ray.maxDistance;

        for (let axis = 0; axis < 3; axis++) {
            const axisKey = ['x', 'y', 'z'][axis] as keyof Vector3;
            const invD = 1 / ray.direction[axisKey];
            let t0 = (bounds.min[axisKey] - ray.origin[axisKey]) * invD;
            let t1 = (bounds.max[axisKey] - ray.origin[axisKey]) * invD;

            if (invD < 0) {
                [t0, t1] = [t1, t0];
            }

            tmin = Math.max(tmin, t0);
            tmax = Math.min(tmax, t1);

            if (tmax <= tmin) return null;
        }

        const point: Vector3 = {
            x: ray.origin.x + ray.direction.x * tmin,
            y: ray.origin.y + ray.direction.y * tmin,
            z: ray.origin.z + ray.direction.z * tmin,
        };

        return { distance: tmin, point };
    }

    // ========================================================================
    // HLOD SYSTEM
    // ========================================================================

    private markHLODDirty(cellIds: Set<string>): void {
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
    async buildHLODs(): Promise<void> {
        for (const cell of this.cells.values()) {
            if (cell.hlod?.buildStatus === 'pending') {
                await this.buildHLODForCell(cell);
            }
        }
    }

    private async buildHLODForCell(cell: WorldCell): Promise<void> {
        if (!cell.hlod) {
            cell.hlod = {
                lodDistances: [1000, 5000, 20000],
                buildStatus: 'building',
            };
        }

        cell.hlod.buildStatus = 'building';

        try {
            // Collect static actors that contribute to HLOD
            const staticActors: WorldActor[] = [];
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
        } catch (error) {
            cell.hlod.buildStatus = 'error';
            throw error;
        }
    }

    // ========================================================================
    // STATISTICS & DEBUG
    // ========================================================================

    getStatistics(): WorldPartitionStatistics {
        let loadedActors = 0;
        let totalActors = this.actors.size;

        for (const actor of this.actors.values()) {
            if (actor.isSpatiallyLoaded) loadedActors++;
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

    private vec3Distance(a: Vector3, b: Vector3): number {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
}

// ============================================================================
// STATISTICS TYPE
// ============================================================================

export interface WorldPartitionStatistics {
    totalCells: number;
    loadedCells: number;
    activeCells: number;
    totalActors: number;
    loadedActors: number;
    memoryUsageBytes: number;
    memoryBudgetBytes: number;
    dataLayers: number;
    levelInstances: number;
    streamingSources: number;
}
