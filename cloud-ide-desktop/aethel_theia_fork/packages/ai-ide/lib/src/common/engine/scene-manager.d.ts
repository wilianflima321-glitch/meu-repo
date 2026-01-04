import { Event } from '@theia/core/lib/common';
import { ECSWorld, EntityId } from './ecs-world';
export type SceneId = string;
export type LayerId = number;
/**
 * Scene loading state
 */
export declare enum SceneLoadState {
    Unloaded = "unloaded",
    Loading = "loading",
    Loaded = "loaded",
    Unloading = "unloading",
    Failed = "failed"
}
/**
 * Scene loading mode
 */
export declare enum SceneLoadMode {
    Single = "single",// Unload all scenes, load new one
    Additive = "additive",// Keep existing scenes, add new one
    Streaming = "streaming"
}
/**
 * Scene streaming settings
 */
export interface StreamingSettings {
    enabled: boolean;
    loadDistance: number;
    unloadDistance: number;
    priority: number;
    boundingBox?: {
        min: Vector3;
        max: Vector3;
    };
}
/**
 * Vector3 for positions
 */
export interface Vector3 {
    x: number;
    y: number;
    z: number;
}
/**
 * Scene metadata
 */
export interface SceneMetadata {
    id: SceneId;
    name: string;
    path: string;
    description?: string;
    thumbnail?: string;
    tags?: string[];
    isDefault?: boolean;
    isPersistent?: boolean;
    streaming?: StreamingSettings;
    environment?: EnvironmentSettings;
    createdAt: number;
    modifiedAt: number;
}
/**
 * Environment settings for scene
 */
export interface EnvironmentSettings {
    ambientColor: {
        r: number;
        g: number;
        b: number;
    };
    ambientIntensity: number;
    fogEnabled: boolean;
    fogColor: {
        r: number;
        g: number;
        b: number;
    };
    fogDensity: number;
    fogStart: number;
    fogEnd: number;
    skyboxId?: string;
    reflectionProbeId?: string;
}
/**
 * Entity reference in scene
 */
export interface SceneEntityRef {
    entityId: EntityId;
    prefabId?: string;
    isStatic: boolean;
    layer: LayerId;
    cullingMask: number;
}
/**
 * Scene hierarchy node
 */
export interface SceneNode {
    entityId: EntityId;
    name: string;
    children: SceneNode[];
    expanded?: boolean;
    visible: boolean;
    locked: boolean;
}
/**
 * Scene layer
 */
export interface SceneLayer {
    id: LayerId;
    name: string;
    visible: boolean;
    locked: boolean;
    color: string;
}
export declare class Scene {
    readonly id: SceneId;
    readonly metadata: SceneMetadata;
    readonly world: ECSWorld;
    private readonly entityRefs;
    private rootEntities;
    private readonly layers;
    private readonly spatialGrid;
    private readonly cellSize;
    private _loadState;
    private _isActive;
    private _isDirty;
    private readonly onLoadStateChangedEmitter;
    private readonly onEntityAddedEmitter;
    private readonly onEntityRemovedEmitter;
    private readonly onDirtyChangedEmitter;
    readonly onLoadStateChanged: Event<SceneLoadState>;
    readonly onEntityAdded: Event<EntityId>;
    readonly onEntityRemoved: Event<EntityId>;
    readonly onDirtyChanged: Event<boolean>;
    constructor(metadata: SceneMetadata, world?: ECSWorld);
    get loadState(): SceneLoadState;
    set loadState(state: SceneLoadState);
    get isActive(): boolean;
    set isActive(active: boolean);
    get isDirty(): boolean;
    markDirty(): void;
    clearDirty(): void;
    private initializeDefaultLayers;
    getLayers(): SceneLayer[];
    getLayer(id: LayerId): SceneLayer | undefined;
    addLayer(name: string): SceneLayer;
    setLayerVisibility(id: LayerId, visible: boolean): void;
    private trackEntity;
    private untrackEntity;
    private getCellKey;
    private updateEntitySpatialCell;
    private removeEntityFromSpatialGrid;
    /**
     * Query entities within radius of position
     */
    queryEntitiesInRadius(center: Vector3, radius: number): EntityId[];
    /**
     * Query entities in frustum (for culling)
     */
    queryEntitiesInFrustum(_frustum: Float32Array): EntityId[];
    /**
     * Get root entities (no parent)
     */
    getRootEntities(): EntityId[];
    /**
     * Build scene hierarchy tree
     */
    buildHierarchy(): SceneNode[];
    /**
     * Serialize scene to JSON
     */
    serialize(): string;
    /**
     * Deserialize scene from JSON
     */
    deserialize(json: string): void;
    dispose(): void;
}
export declare class SceneManager {
    private readonly scenes;
    private readonly sceneMetadata;
    private readonly activeScenes;
    private _mainScene;
    private streamingEnabled;
    private streamingAnchor;
    private readonly onSceneLoadedEmitter;
    private readonly onSceneUnloadedEmitter;
    private readonly onActiveSceneChangedEmitter;
    readonly onSceneLoaded: Event<Scene>;
    readonly onSceneUnloaded: Event<SceneId>;
    readonly onActiveSceneChanged: Event<Scene | null>;
    /**
     * Register scene metadata
     */
    registerScene(metadata: SceneMetadata): void;
    /**
     * Get all registered scenes
     */
    getRegisteredScenes(): SceneMetadata[];
    /**
     * Get scene metadata
     */
    getSceneMetadata(sceneId: SceneId): SceneMetadata | undefined;
    /**
     * Load a scene
     */
    loadScene(sceneId: SceneId, mode?: SceneLoadMode): Promise<Scene>;
    /**
     * Load scene data
     */
    private loadSceneData;
    /**
     * Unload a scene
     */
    unloadScene(sceneId: SceneId): Promise<void>;
    /**
     * Unload all scenes
     */
    unloadAllScenes(): Promise<void>;
    /**
     * Get main active scene
     */
    get mainScene(): Scene | null;
    /**
     * Set main active scene
     */
    setMainScene(scene: Scene): void;
    /**
     * Get all active scenes
     */
    getActiveScenes(): Scene[];
    /**
     * Get loaded scene by ID
     */
    getLoadedScene(sceneId: SceneId): Scene | undefined;
    /**
     * Enable scene streaming
     */
    enableStreaming(): void;
    /**
     * Disable scene streaming
     */
    disableStreaming(): void;
    /**
     * Update streaming anchor (usually player position)
     */
    updateStreamingAnchor(position: Vector3): void;
    /**
     * Update streaming (load/unload based on anchor)
     */
    private updateStreaming;
    /**
     * Create a new empty scene
     */
    createScene(name: string, path?: string): Scene;
    /**
     * Save scene to storage
     */
    saveScene(sceneId: SceneId): Promise<void>;
    /**
     * Update all active scenes
     */
    update(deltaTime: number): void;
    /**
     * Fixed update all active scenes
     */
    fixedUpdate(deltaTime: number): void;
    /**
     * Late update all active scenes
     */
    lateUpdate(deltaTime: number): void;
    dispose(): void;
}
export declare class WorldCompositionManager {
    private readonly sceneManager;
    private readonly tiles;
    private tileSize;
    private loadRadius;
    private currentTile;
    /**
     * Configure world composition
     */
    configure(tileSize: number, loadRadius: number): void;
    /**
     * Register a world tile
     */
    registerTile(x: number, z: number, sceneId: SceneId): void;
    /**
     * Update player position (triggers tile loading)
     */
    updatePlayerPosition(position: Vector3): Promise<void>;
    /**
     * Update which tiles are loaded
     */
    private updateLoadedTiles;
    /**
     * Get loaded tile count
     */
    getLoadedTileCount(): number;
}
