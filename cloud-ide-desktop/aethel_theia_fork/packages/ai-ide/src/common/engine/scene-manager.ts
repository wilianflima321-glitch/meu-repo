import { injectable, inject } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';
import { ECSWorld, EntityId, TransformComponent, IComponent } from './ecs-world';

// ============================================================================
// AETHEL SCENE SYSTEM
// Complete scene/world management comparable to Unreal's World/Level system
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type SceneId = string;
export type LayerId = number;

/**
 * Scene loading state
 */
export enum SceneLoadState {
  Unloaded = 'unloaded',
  Loading = 'loading',
  Loaded = 'loaded',
  Unloading = 'unloading',
  Failed = 'failed'
}

/**
 * Scene loading mode
 */
export enum SceneLoadMode {
  Single = 'single',        // Unload all scenes, load new one
  Additive = 'additive',    // Keep existing scenes, add new one
  Streaming = 'streaming'   // Stream in/out based on player position
}

/**
 * Scene streaming settings
 */
export interface StreamingSettings {
  enabled: boolean;
  loadDistance: number;
  unloadDistance: number;
  priority: number;
  boundingBox?: { min: Vector3; max: Vector3 };
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
  ambientColor: { r: number; g: number; b: number };
  ambientIntensity: number;
  fogEnabled: boolean;
  fogColor: { r: number; g: number; b: number };
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

/**
 * Spatial partition cell
 */
interface SpatialCell {
  x: number;
  y: number;
  z: number;
  entities: Set<EntityId>;
}

// ============================================================================
// SCENE CLASS
// ============================================================================

export class Scene {
  readonly id: SceneId;
  readonly metadata: SceneMetadata;
  
  // ECS World for this scene
  readonly world: ECSWorld;
  
  // Entity management
  private readonly entityRefs = new Map<EntityId, SceneEntityRef>();
  private rootEntities: EntityId[] = [];
  
  // Layers
  private readonly layers: SceneLayer[] = [];
  
  // Spatial partitioning (octree-like grid)
  private readonly spatialGrid = new Map<string, SpatialCell>();
  private readonly cellSize = 100;
  
  // State
  private _loadState = SceneLoadState.Unloaded;
  private _isActive = false;
  private _isDirty = false;

  // Events
  private readonly onLoadStateChangedEmitter = new Emitter<SceneLoadState>();
  private readonly onEntityAddedEmitter = new Emitter<EntityId>();
  private readonly onEntityRemovedEmitter = new Emitter<EntityId>();
  private readonly onDirtyChangedEmitter = new Emitter<boolean>();

  readonly onLoadStateChanged: Event<SceneLoadState> = this.onLoadStateChangedEmitter.event;
  readonly onEntityAdded: Event<EntityId> = this.onEntityAddedEmitter.event;
  readonly onEntityRemoved: Event<EntityId> = this.onEntityRemovedEmitter.event;
  readonly onDirtyChanged: Event<boolean> = this.onDirtyChangedEmitter.event;

  constructor(metadata: SceneMetadata, world?: ECSWorld) {
    this.id = metadata.id;
    this.metadata = metadata;
    this.world = world ?? new ECSWorld();

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

  get loadState(): SceneLoadState {
    return this._loadState;
  }

  set loadState(state: SceneLoadState) {
    if (this._loadState !== state) {
      this._loadState = state;
      this.onLoadStateChangedEmitter.fire(state);
    }
  }

  get isActive(): boolean {
    return this._isActive;
  }

  set isActive(active: boolean) {
    this._isActive = active;
  }

  get isDirty(): boolean {
    return this._isDirty;
  }

  markDirty(): void {
    if (!this._isDirty) {
      this._isDirty = true;
      this.onDirtyChangedEmitter.fire(true);
    }
  }

  clearDirty(): void {
    if (this._isDirty) {
      this._isDirty = false;
      this.onDirtyChangedEmitter.fire(false);
    }
  }

  // ========================================================================
  // LAYERS
  // ========================================================================

  private initializeDefaultLayers(): void {
    this.layers.push(
      { id: 0, name: 'Default', visible: true, locked: false, color: '#ffffff' },
      { id: 1, name: 'TransparentFX', visible: true, locked: false, color: '#00ff00' },
      { id: 2, name: 'Ignore Raycast', visible: true, locked: false, color: '#ff0000' },
      { id: 3, name: 'Water', visible: true, locked: false, color: '#0000ff' },
      { id: 4, name: 'UI', visible: true, locked: false, color: '#ffff00' },
      { id: 5, name: 'PostProcessing', visible: true, locked: false, color: '#ff00ff' }
    );
  }

  getLayers(): SceneLayer[] {
    return [...this.layers];
  }

  getLayer(id: LayerId): SceneLayer | undefined {
    return this.layers.find(l => l.id === id);
  }

  addLayer(name: string): SceneLayer {
    const id = this.layers.length;
    const layer: SceneLayer = {
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

  setLayerVisibility(id: LayerId, visible: boolean): void {
    const layer = this.layers.find(l => l.id === id);
    if (layer) {
      layer.visible = visible;
      this.markDirty();
    }
  }

  // ========================================================================
  // ENTITY TRACKING
  // ========================================================================

  private trackEntity(entityId: EntityId): void {
    if (this.entityRefs.has(entityId)) return;

    const ref: SceneEntityRef = {
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

  private untrackEntity(entityId: EntityId): void {
    const ref = this.entityRefs.get(entityId);
    if (!ref) return;

    this.removeEntityFromSpatialGrid(entityId);
    this.entityRefs.delete(entityId);
    this.onEntityRemovedEmitter.fire(entityId);
    this.markDirty();
  }

  // ========================================================================
  // SPATIAL PARTITIONING
  // ========================================================================

  private getCellKey(x: number, y: number, z: number): string {
    const cx = Math.floor(x / this.cellSize);
    const cy = Math.floor(y / this.cellSize);
    const cz = Math.floor(z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }

  private updateEntitySpatialCell(entityId: EntityId): void {
    const transform = this.world.getComponent<TransformComponent>(entityId, 'Transform');
    if (!transform) return;

    this.removeEntityFromSpatialGrid(entityId);

    const key = this.getCellKey(
      transform.position.x,
      transform.position.y,
      transform.position.z
    );

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

  private removeEntityFromSpatialGrid(entityId: EntityId): void {
    for (const cell of this.spatialGrid.values()) {
      cell.entities.delete(entityId);
    }
  }

  /**
   * Query entities within radius of position
   */
  queryEntitiesInRadius(center: Vector3, radius: number): EntityId[] {
    const results: EntityId[] = [];
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
          if (!cell) continue;

          for (const entityId of cell.entities) {
            const transform = this.world.getComponent<TransformComponent>(entityId, 'Transform');
            if (!transform) continue;

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
  queryEntitiesInFrustum(_frustum: Float32Array): EntityId[] {
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
  getRootEntities(): EntityId[] {
    const roots: EntityId[] = [];
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
  buildHierarchy(): SceneNode[] {
    const buildNode = (entityId: EntityId): SceneNode => {
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
  serialize(): string {
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
  deserialize(json: string): void {
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

  dispose(): void {
    this.world.dispose();
    this.entityRefs.clear();
    this.spatialGrid.clear();
    this.onLoadStateChangedEmitter.dispose();
    this.onEntityAddedEmitter.dispose();
    this.onEntityRemovedEmitter.dispose();
    this.onDirtyChangedEmitter.dispose();
  }
}

// ============================================================================
// SCENE MANAGER
// ============================================================================

@injectable()
export class SceneManager {
  // Scene registry
  private readonly scenes = new Map<SceneId, Scene>();
  private readonly sceneMetadata = new Map<SceneId, SceneMetadata>();
  
  // Active scenes (can have multiple for additive loading)
  private readonly activeScenes: Scene[] = [];
  private _mainScene: Scene | null = null;
  
  // Streaming
  private streamingEnabled = false;
  private streamingAnchor: Vector3 = { x: 0, y: 0, z: 0 };
  
  // Events
  private readonly onSceneLoadedEmitter = new Emitter<Scene>();
  private readonly onSceneUnloadedEmitter = new Emitter<SceneId>();
  private readonly onActiveSceneChangedEmitter = new Emitter<Scene | null>();

  readonly onSceneLoaded: Event<Scene> = this.onSceneLoadedEmitter.event;
  readonly onSceneUnloaded: Event<SceneId> = this.onSceneUnloadedEmitter.event;
  readonly onActiveSceneChanged: Event<Scene | null> = this.onActiveSceneChangedEmitter.event;

  // ========================================================================
  // SCENE REGISTRY
  // ========================================================================

  /**
   * Register scene metadata
   */
  registerScene(metadata: SceneMetadata): void {
    this.sceneMetadata.set(metadata.id, metadata);
  }

  /**
   * Get all registered scenes
   */
  getRegisteredScenes(): SceneMetadata[] {
    return Array.from(this.sceneMetadata.values());
  }

  /**
   * Get scene metadata
   */
  getSceneMetadata(sceneId: SceneId): SceneMetadata | undefined {
    return this.sceneMetadata.get(sceneId);
  }

  // ========================================================================
  // SCENE LOADING
  // ========================================================================

  /**
   * Load a scene
   */
  async loadScene(sceneId: SceneId, mode: SceneLoadMode = SceneLoadMode.Single): Promise<Scene> {
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

    } catch (error) {
      scene.loadState = SceneLoadState.Failed;
      throw error;
    }
  }

  /**
   * Load scene data
   */
  private async loadSceneData(scene: Scene): Promise<void> {
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
  async unloadScene(sceneId: SceneId): Promise<void> {
    const scene = this.scenes.get(sceneId);
    if (!scene) return;

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
  async unloadAllScenes(): Promise<void> {
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
  get mainScene(): Scene | null {
    return this._mainScene;
  }

  /**
   * Set main active scene
   */
  setMainScene(scene: Scene): void {
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
  getActiveScenes(): Scene[] {
    return [...this.activeScenes];
  }

  /**
   * Get loaded scene by ID
   */
  getLoadedScene(sceneId: SceneId): Scene | undefined {
    return this.scenes.get(sceneId);
  }

  // ========================================================================
  // STREAMING
  // ========================================================================

  /**
   * Enable scene streaming
   */
  enableStreaming(): void {
    this.streamingEnabled = true;
  }

  /**
   * Disable scene streaming
   */
  disableStreaming(): void {
    this.streamingEnabled = false;
  }

  /**
   * Update streaming anchor (usually player position)
   */
  updateStreamingAnchor(position: Vector3): void {
    this.streamingAnchor = { ...position };
    
    if (this.streamingEnabled) {
      this.updateStreaming();
    }
  }

  /**
   * Update streaming (load/unload based on anchor)
   */
  private async updateStreaming(): Promise<void> {
    for (const metadata of this.sceneMetadata.values()) {
      if (!metadata.streaming?.enabled) continue;

      const bounds = metadata.streaming.boundingBox;
      if (!bounds) continue;

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
      } else if (distance > metadata.streaming.unloadDistance) {
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
  createScene(name: string, path?: string): Scene {
    const id = `scene_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metadata: SceneMetadata = {
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
  async saveScene(sceneId: SceneId): Promise<void> {
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
  update(deltaTime: number): void {
    for (const scene of this.activeScenes) {
      if (scene.loadState === SceneLoadState.Loaded) {
        scene.world.update(deltaTime);
      }
    }
  }

  /**
   * Fixed update all active scenes
   */
  fixedUpdate(deltaTime: number): void {
    for (const scene of this.activeScenes) {
      if (scene.loadState === SceneLoadState.Loaded) {
        scene.world.fixedUpdate(deltaTime);
      }
    }
  }

  /**
   * Late update all active scenes
   */
  lateUpdate(deltaTime: number): void {
    for (const scene of this.activeScenes) {
      if (scene.loadState === SceneLoadState.Loaded) {
        scene.world.lateUpdate(deltaTime);
      }
    }
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  dispose(): void {
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
}

// ============================================================================
// WORLD COMPOSITION (for large open worlds)
// ============================================================================

@injectable()
export class WorldCompositionManager {
  @inject(SceneManager)
  private readonly sceneManager!: SceneManager;

  // World tiles
  private readonly tiles = new Map<string, {
    x: number;
    z: number;
    sceneId: SceneId;
    loaded: boolean;
  }>();
  
  // Tile settings
  private tileSize = 1000;
  private loadRadius = 2;
  private currentTile = { x: 0, z: 0 };

  /**
   * Configure world composition
   */
  configure(tileSize: number, loadRadius: number): void {
    this.tileSize = tileSize;
    this.loadRadius = loadRadius;
  }

  /**
   * Register a world tile
   */
  registerTile(x: number, z: number, sceneId: SceneId): void {
    const key = `${x},${z}`;
    this.tiles.set(key, { x, z, sceneId, loaded: false });
  }

  /**
   * Update player position (triggers tile loading)
   */
  async updatePlayerPosition(position: Vector3): Promise<void> {
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
  private async updateLoadedTiles(): Promise<void> {
    const tilesToLoad = new Set<string>();
    const tilesToUnload = new Set<string>();

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
      const tile = this.tiles.get(key)!;
      await this.sceneManager.unloadScene(tile.sceneId);
      tile.loaded = false;
    }

    // Load tiles
    for (const key of tilesToLoad) {
      const tile = this.tiles.get(key)!;
      if (!tile.loaded) {
        await this.sceneManager.loadScene(tile.sceneId, SceneLoadMode.Additive);
        tile.loaded = true;
      }
    }
  }

  /**
   * Get loaded tile count
   */
  getLoadedTileCount(): number {
    let count = 0;
    for (const tile of this.tiles.values()) {
      if (tile.loaded) count++;
    }
    return count;
  }
}
