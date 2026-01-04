import { Event } from '@theia/core/lib/common';
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
    rotation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    scale: Vector3;
}
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
export declare enum CellState {
    Unloaded = "unloaded",
    Loading = "loading",
    Loaded = "loaded",
    Activated = "activated",
    Unloading = "unloading"
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
export declare enum ActorRuntimeState {
    Unloaded = "unloaded",
    Loading = "loading",
    Loaded = "loaded",
    BeginPlay = "begin_play",
    Active = "active",
    EndPlay = "end_play",
    Unloading = "unloading"
}
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
    color: {
        r: number;
        g: number;
        b: number;
    };
    /** Description */
    description: string;
}
export declare enum DataLayerType {
    /** Runtime data layer - always loaded when cell is loaded */
    Runtime = "runtime",
    /** Editor data layer - only loaded in editor */
    Editor = "editor",
    /** Optional layer - loaded on demand */
    Optional = "optional"
}
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
export interface SpatialQuery {
    /** Query bounds */
    bounds?: BoundingBox;
    /** Query sphere */
    sphere?: {
        center: Vector3;
        radius: number;
    };
    /** Query ray */
    ray?: {
        origin: Vector3;
        direction: Vector3;
        maxDistance: number;
    };
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
export declare class WorldPartitionSystem {
    private settings;
    private cells;
    private actors;
    private dataLayers;
    private levelInstances;
    private streamingSources;
    private spatialHash;
    private actorToCells;
    private loadedCells;
    private activeCells;
    private pendingLoads;
    private pendingUnloads;
    private memoryBudgetBytes;
    private currentMemoryUsage;
    private readonly onCellLoadedEmitter;
    private readonly onCellUnloadedEmitter;
    private readonly onActorLoadedEmitter;
    private readonly onActorUnloadedEmitter;
    private readonly onDataLayerChangedEmitter;
    readonly onCellLoaded: Event<WorldCell>;
    readonly onCellUnloaded: Event<WorldCell>;
    readonly onActorLoaded: Event<WorldActor>;
    readonly onActorUnloaded: Event<WorldActor>;
    readonly onDataLayerChanged: Event<DataLayer>;
    initialize(settings: Partial<WorldPartitionSettings>): void;
    private initializeGridCells;
    private getCellKey;
    private worldToCellCoords;
    private getOrCreateCell;
    getCellAtPosition(position: Vector3, level?: number): WorldCell | undefined;
    getCellsInBounds(bounds: BoundingBox, level?: number): WorldCell[];
    addActor(actor: WorldActor): void;
    removeActor(actorId: string): void;
    moveActor(actorId: string, newTransform: Transform): void;
    getActor(actorId: string): WorldActor | undefined;
    private calculateWorldBounds;
    private getCellsContainingBounds;
    private getSpatialHashKey;
    private updateSpatialHash;
    private removeSpatialHash;
    private getSpatialHashKeysForBounds;
    addStreamingSource(source: StreamingSource): void;
    removeStreamingSource(sourceId: string): void;
    updateStreamingSource(sourceId: string, position: Vector3): void;
    /**
     * Main streaming update - call every frame
     */
    updateStreaming(): Promise<void>;
    private loadCell;
    private unloadCell;
    private loadActor;
    private unloadActor;
    private getCellCenter;
    createDataLayer(config: Omit<DataLayer, 'actorIds' | 'childLayerIds'>): DataLayer;
    getDataLayer(id: string): DataLayer | undefined;
    setDataLayerLoaded(layerId: string, loaded: boolean): void;
    setDataLayerVisible(layerId: string, visible: boolean): void;
    addActorToDataLayer(actorId: string, layerId: string): void;
    createLevelInstance(config: Omit<LevelInstance, 'actorIds' | 'isLoaded'>): LevelInstance;
    loadLevelInstance(instanceId: string): Promise<void>;
    unloadLevelInstance(instanceId: string): Promise<void>;
    querySpatial(query: SpatialQuery): SpatialQueryResult[];
    private rayIntersectsActor;
    private markHLODDirty;
    /**
     * Build HLODs for dirty cells
     */
    buildHLODs(): Promise<void>;
    private buildHLODForCell;
    getStatistics(): WorldPartitionStatistics;
    private vec3Distance;
}
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
