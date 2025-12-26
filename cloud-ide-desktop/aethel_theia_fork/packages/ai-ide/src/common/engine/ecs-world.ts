import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

// ============================================================================
// AETHEL ECS (Entity Component System)
// High-performance data-oriented architecture
// Comparable to Unreal's Actor/Component, Unity's GameObject/Component
// ============================================================================

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Entity ID - unique identifier for each entity
 */
export type EntityId = number;

/**
 * Component type identifier
 */
export type ComponentType = string;

/**
 * System priority for execution order
 */
export type SystemPriority = number;

/**
 * Component base interface
 */
export interface IComponent {
  readonly type: ComponentType;
  enabled: boolean;
}

/**
 * System base interface
 */
export interface ISystem {
  readonly name: string;
  readonly priority: SystemPriority;
  readonly requiredComponents: ComponentType[];
  enabled: boolean;
  
  initialize?(): void;
  destroy?(): void;
  update(entities: EntityId[], deltaTime: number): void;
  fixedUpdate?(entities: EntityId[], deltaTime: number): void;
  lateUpdate?(entities: EntityId[], deltaTime: number): void;
}

/**
 * Query for filtering entities
 */
export interface ComponentQuery {
  all?: ComponentType[];       // Entity must have all these
  any?: ComponentType[];       // Entity must have at least one
  none?: ComponentType[];      // Entity must not have any of these
}

/**
 * Entity archetype - defines a set of components
 */
export interface Archetype {
  id: number;
  components: Set<ComponentType>;
  entities: Set<EntityId>;
}

/**
 * Entity creation descriptor
 */
export interface EntityDescriptor {
  name?: string;
  parent?: EntityId;
  tags?: string[];
  components?: IComponent[];
  active?: boolean;
}

/**
 * Entity data
 */
interface EntityData {
  id: EntityId;
  name: string;
  active: boolean;
  parent: EntityId | null;
  children: Set<EntityId>;
  tags: Set<string>;
  archetype: Archetype | null;
}

// ============================================================================
// BUILT-IN COMPONENTS
// ============================================================================

/**
 * Transform component - position, rotation, scale
 */
export class TransformComponent implements IComponent {
  readonly type = 'Transform';
  enabled = true;

  // Local space
  position = { x: 0, y: 0, z: 0 };
  rotation = { x: 0, y: 0, z: 0, w: 1 }; // Quaternion
  scale = { x: 1, y: 1, z: 1 };

  // Cached world space (computed)
  private _worldMatrix: Float32Array = new Float32Array(16);
  private _localMatrix: Float32Array = new Float32Array(16);
  private _dirty = true;

  get worldMatrix(): Float32Array {
    if (this._dirty) {
      this.updateMatrices();
    }
    return this._worldMatrix;
  }

  setPosition(x: number, y: number, z: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z;
    this._dirty = true;
  }

  setRotationEuler(x: number, y: number, z: number): void {
    // Convert euler to quaternion
    const cx = Math.cos(x * 0.5);
    const cy = Math.cos(y * 0.5);
    const cz = Math.cos(z * 0.5);
    const sx = Math.sin(x * 0.5);
    const sy = Math.sin(y * 0.5);
    const sz = Math.sin(z * 0.5);

    this.rotation.w = cx * cy * cz + sx * sy * sz;
    this.rotation.x = sx * cy * cz - cx * sy * sz;
    this.rotation.y = cx * sy * cz + sx * cy * sz;
    this.rotation.z = cx * cy * sz - sx * sy * cz;
    this._dirty = true;
  }

  setScale(x: number, y: number, z: number): void {
    this.scale.x = x;
    this.scale.y = y;
    this.scale.z = z;
    this._dirty = true;
  }

  lookAt(targetX: number, targetY: number, targetZ: number): void {
    // Simplified lookAt - compute direction and convert to quaternion
    const dx = targetX - this.position.x;
    const dy = targetY - this.position.y;
    const dz = targetZ - this.position.z;
    
    const yaw = Math.atan2(dx, dz);
    const pitch = Math.atan2(-dy, Math.sqrt(dx * dx + dz * dz));
    
    this.setRotationEuler(pitch, yaw, 0);
  }

  private updateMatrices(): void {
    // Build local matrix from TRS
    const { x: px, y: py, z: pz } = this.position;
    const { x: qx, y: qy, z: qz, w: qw } = this.rotation;
    const { x: sx, y: sy, z: sz } = this.scale;

    // Rotation matrix from quaternion
    const x2 = qx + qx, y2 = qy + qy, z2 = qz + qz;
    const xx = qx * x2, xy = qx * y2, xz = qx * z2;
    const yy = qy * y2, yz = qy * z2, zz = qz * z2;
    const wx = qw * x2, wy = qw * y2, wz = qw * z2;

    this._localMatrix[0] = (1 - (yy + zz)) * sx;
    this._localMatrix[1] = (xy + wz) * sx;
    this._localMatrix[2] = (xz - wy) * sx;
    this._localMatrix[3] = 0;
    this._localMatrix[4] = (xy - wz) * sy;
    this._localMatrix[5] = (1 - (xx + zz)) * sy;
    this._localMatrix[6] = (yz + wx) * sy;
    this._localMatrix[7] = 0;
    this._localMatrix[8] = (xz + wy) * sz;
    this._localMatrix[9] = (yz - wx) * sz;
    this._localMatrix[10] = (1 - (xx + yy)) * sz;
    this._localMatrix[11] = 0;
    this._localMatrix[12] = px;
    this._localMatrix[13] = py;
    this._localMatrix[14] = pz;
    this._localMatrix[15] = 1;

    // For now, world = local (parent hierarchy would multiply here)
    this._worldMatrix.set(this._localMatrix);
    this._dirty = false;
  }

  markDirty(): void {
    this._dirty = true;
  }
}

/**
 * Mesh Renderer component
 */
export class MeshRendererComponent implements IComponent {
  readonly type = 'MeshRenderer';
  enabled = true;

  meshId: string | null = null;
  materialIds: string[] = [];
  castShadows = true;
  receiveShadows = true;
  layer = 0;
  sortingOrder = 0;
}

/**
 * Camera component
 */
export class CameraComponent implements IComponent {
  readonly type = 'Camera';
  enabled = true;

  projection: 'perspective' | 'orthographic' = 'perspective';
  fieldOfView = 60; // Degrees
  nearClip = 0.1;
  farClip = 1000;
  orthographicSize = 5;
  aspectRatio = 16 / 9;
  clearColor = { r: 0.1, g: 0.1, b: 0.1, a: 1 };
  clearFlags: ('color' | 'depth' | 'stencil')[] = ['color', 'depth'];
  renderOrder = 0;
  viewport = { x: 0, y: 0, width: 1, height: 1 };

  getProjectionMatrix(): Float32Array {
    const matrix = new Float32Array(16);
    
    if (this.projection === 'perspective') {
      const f = 1.0 / Math.tan((this.fieldOfView * Math.PI / 180) / 2);
      const nf = 1 / (this.nearClip - this.farClip);
      
      matrix[0] = f / this.aspectRatio;
      matrix[5] = f;
      matrix[10] = (this.farClip + this.nearClip) * nf;
      matrix[11] = -1;
      matrix[14] = 2 * this.farClip * this.nearClip * nf;
    } else {
      const top = this.orthographicSize;
      const bottom = -this.orthographicSize;
      const right = this.orthographicSize * this.aspectRatio;
      const left = -right;
      
      matrix[0] = 2 / (right - left);
      matrix[5] = 2 / (top - bottom);
      matrix[10] = -2 / (this.farClip - this.nearClip);
      matrix[12] = -(right + left) / (right - left);
      matrix[13] = -(top + bottom) / (top - bottom);
      matrix[14] = -(this.farClip + this.nearClip) / (this.farClip - this.nearClip);
      matrix[15] = 1;
    }
    
    return matrix;
  }
}

/**
 * Light component
 */
export class LightComponent implements IComponent {
  readonly type = 'Light';
  enabled = true;

  lightType: 'directional' | 'point' | 'spot' | 'area' = 'point';
  color = { r: 1, g: 1, b: 1 };
  intensity = 1;
  range = 10;
  spotAngle = 30;
  innerSpotAngle = 21;
  castShadows = false;
  shadowResolution = 1024;
  shadowBias = 0.005;
  shadowNormalBias = 0.4;
}

/**
 * Rigidbody component (physics)
 */
export class RigidbodyComponent implements IComponent {
  readonly type = 'Rigidbody';
  enabled = true;

  bodyType: 'dynamic' | 'kinematic' | 'static' = 'dynamic';
  mass = 1;
  drag = 0;
  angularDrag = 0.05;
  useGravity = true;
  isKinematic = false;
  freezePosition = { x: false, y: false, z: false };
  freezeRotation = { x: false, y: false, z: false };
  
  // Runtime state
  velocity = { x: 0, y: 0, z: 0 };
  angularVelocity = { x: 0, y: 0, z: 0 };
  
  // Physics engine handle
  physicsHandle: number | null = null;
}

/**
 * Collider component base
 */
export class ColliderComponent implements IComponent {
  readonly type = 'Collider';
  enabled = true;

  colliderType: 'box' | 'sphere' | 'capsule' | 'mesh' = 'box';
  isTrigger = false;
  center = { x: 0, y: 0, z: 0 };
  
  // Box
  size = { x: 1, y: 1, z: 1 };
  
  // Sphere
  radius = 0.5;
  
  // Capsule
  height = 2;
  direction: 'x' | 'y' | 'z' = 'y';
  
  // Physics material
  friction = 0.5;
  bounciness = 0;
  
  // Physics engine handle
  physicsHandle: number | null = null;
}

/**
 * Audio Source component
 */
export class AudioSourceComponent implements IComponent {
  readonly type = 'AudioSource';
  enabled = true;

  clipId: string | null = null;
  volume = 1;
  pitch = 1;
  loop = false;
  playOnAwake = false;
  spatialBlend = 0; // 0 = 2D, 1 = 3D
  minDistance = 1;
  maxDistance = 500;
  rolloffMode: 'linear' | 'logarithmic' = 'logarithmic';
  
  // Runtime state
  isPlaying = false;
  time = 0;
}

/**
 * Script component - holds behavior references
 */
export class ScriptComponent implements IComponent {
  readonly type = 'Script';
  enabled = true;

  scriptId: string | null = null;
  properties: Record<string, unknown> = {};
  
  // Lifecycle callbacks
  onStart?: () => void;
  onUpdate?: (deltaTime: number) => void;
  onFixedUpdate?: (deltaTime: number) => void;
  onLateUpdate?: (deltaTime: number) => void;
  onDestroy?: () => void;
  onEnable?: () => void;
  onDisable?: () => void;
  onCollisionEnter?: (other: EntityId) => void;
  onCollisionExit?: (other: EntityId) => void;
  onTriggerEnter?: (other: EntityId) => void;
  onTriggerExit?: (other: EntityId) => void;
}

/**
 * Animator component
 */
export class AnimatorComponent implements IComponent {
  readonly type = 'Animator';
  enabled = true;

  controllerId: string | null = null;
  speed = 1;
  applyRootMotion = false;
  
  // Runtime state
  currentState: string | null = null;
  parameters: Map<string, number | boolean | string> = new Map();
  layers: { name: string; weight: number; blendMode: 'override' | 'additive' }[] = [];
}

/**
 * UI Canvas component
 */
export class CanvasComponent implements IComponent {
  readonly type = 'Canvas';
  enabled = true;

  renderMode: 'screen-space-overlay' | 'screen-space-camera' | 'world-space' = 'screen-space-overlay';
  sortOrder = 0;
  pixelPerfect = false;
  referenceResolution = { width: 1920, height: 1080 };
  scaleMode: 'constant-pixel-size' | 'scale-with-screen-size' | 'constant-physical-size' = 'scale-with-screen-size';
  matchWidthOrHeight = 0.5;
}

// ============================================================================
// COMPONENT REGISTRY
// ============================================================================

type ComponentConstructor<T extends IComponent = IComponent> = new () => T;

const componentRegistry = new Map<ComponentType, ComponentConstructor>();

export function registerComponent<T extends IComponent>(type: ComponentType, constructor: ComponentConstructor<T>): void {
  componentRegistry.set(type, constructor);
}

export function createComponentInstance(type: ComponentType): IComponent | null {
  const constructor = componentRegistry.get(type);
  if (!constructor) return null;
  return new constructor();
}

// Register built-in components
registerComponent('Transform', TransformComponent);
registerComponent('MeshRenderer', MeshRendererComponent);
registerComponent('Camera', CameraComponent);
registerComponent('Light', LightComponent);
registerComponent('Rigidbody', RigidbodyComponent);
registerComponent('Collider', ColliderComponent);
registerComponent('AudioSource', AudioSourceComponent);
registerComponent('Script', ScriptComponent);
registerComponent('Animator', AnimatorComponent);
registerComponent('Canvas', CanvasComponent);

// ============================================================================
// ENTITY-COMPONENT-SYSTEM WORLD
// ============================================================================

@injectable()
export class ECSWorld {
  private nextEntityId: EntityId = 1;
  private nextArchetypeId = 1;
  
  // Entity storage
  private readonly entities = new Map<EntityId, EntityData>();
  private readonly recycledIds: EntityId[] = [];
  
  // Component storage (sparse sets for cache efficiency)
  private readonly componentStores = new Map<ComponentType, Map<EntityId, IComponent>>();
  
  // Archetype management
  private readonly archetypes = new Map<string, Archetype>();
  
  // Systems
  private readonly systems: ISystem[] = [];
  private systemsSorted = false;
  
  // Query cache
  private readonly queryCache = new Map<string, Set<EntityId>>();
  private queryCacheDirty = true;
  
  // Events
  private readonly onEntityCreatedEmitter = new Emitter<{ entity: EntityId }>();
  private readonly onEntityDestroyedEmitter = new Emitter<{ entity: EntityId }>();
  private readonly onComponentAddedEmitter = new Emitter<{ entity: EntityId; component: ComponentType }>();
  private readonly onComponentRemovedEmitter = new Emitter<{ entity: EntityId; component: ComponentType }>();

  readonly onEntityCreated: Event<{ entity: EntityId }> = this.onEntityCreatedEmitter.event;
  readonly onEntityDestroyed: Event<{ entity: EntityId }> = this.onEntityDestroyedEmitter.event;
  readonly onComponentAdded: Event<{ entity: EntityId; component: ComponentType }> = this.onComponentAddedEmitter.event;
  readonly onComponentRemoved: Event<{ entity: EntityId; component: ComponentType }> = this.onComponentRemovedEmitter.event;

  // ========================================================================
  // ENTITY MANAGEMENT
  // ========================================================================

  /**
   * Create a new entity
   */
  createEntity(descriptor: EntityDescriptor = {}): EntityId {
    const id = this.recycledIds.pop() ?? this.nextEntityId++;

    const entityData: EntityData = {
      id,
      name: descriptor.name ?? `Entity_${id}`,
      active: descriptor.active ?? true,
      parent: descriptor.parent ?? null,
      children: new Set(),
      tags: new Set(descriptor.tags ?? []),
      archetype: null
    };

    this.entities.set(id, entityData);

    // Add to parent's children
    if (entityData.parent !== null) {
      const parentData = this.entities.get(entityData.parent);
      if (parentData) {
        parentData.children.add(id);
      }
    }

    // Add default Transform component
    this.addComponent(id, new TransformComponent());

    // Add specified components
    if (descriptor.components) {
      for (const component of descriptor.components) {
        this.addComponent(id, component);
      }
    }

    this.queryCacheDirty = true;
    this.onEntityCreatedEmitter.fire({ entity: id });

    return id;
  }

  /**
   * Destroy an entity and all its components
   */
  destroyEntity(entityId: EntityId): void {
    const entityData = this.entities.get(entityId);
    if (!entityData) return;

    // Destroy children first (recursive)
    for (const childId of entityData.children) {
      this.destroyEntity(childId);
    }

    // Remove from parent
    if (entityData.parent !== null) {
      const parentData = this.entities.get(entityData.parent);
      if (parentData) {
        parentData.children.delete(entityId);
      }
    }

    // Remove all components
    for (const [type, store] of this.componentStores) {
      if (store.has(entityId)) {
        store.delete(entityId);
        this.onComponentRemovedEmitter.fire({ entity: entityId, component: type });
      }
    }

    // Remove from archetype
    if (entityData.archetype) {
      entityData.archetype.entities.delete(entityId);
    }

    // Remove entity
    this.entities.delete(entityId);
    this.recycledIds.push(entityId);

    this.queryCacheDirty = true;
    this.onEntityDestroyedEmitter.fire({ entity: entityId });
  }

  /**
   * Check if entity exists
   */
  hasEntity(entityId: EntityId): boolean {
    return this.entities.has(entityId);
  }

  /**
   * Get entity data
   */
  getEntityData(entityId: EntityId): EntityData | undefined {
    return this.entities.get(entityId);
  }

  /**
   * Set entity active state
   */
  setEntityActive(entityId: EntityId, active: boolean): void {
    const entityData = this.entities.get(entityId);
    if (entityData) {
      entityData.active = active;
    }
  }

  /**
   * Get all entities
   */
  getAllEntities(): EntityId[] {
    return Array.from(this.entities.keys());
  }

  /**
   * Get entity count
   */
  getEntityCount(): number {
    return this.entities.size;
  }

  // ========================================================================
  // COMPONENT MANAGEMENT
  // ========================================================================

  /**
   * Add a component to an entity
   */
  addComponent<T extends IComponent>(entityId: EntityId, component: T): T {
    const entityData = this.entities.get(entityId);
    if (!entityData) {
      throw new Error(`Entity ${entityId} does not exist`);
    }

    let store = this.componentStores.get(component.type);
    if (!store) {
      store = new Map();
      this.componentStores.set(component.type, store);
    }

    store.set(entityId, component);

    // Update archetype
    this.updateEntityArchetype(entityId);

    this.queryCacheDirty = true;
    this.onComponentAddedEmitter.fire({ entity: entityId, component: component.type });

    return component;
  }

  /**
   * Remove a component from an entity
   */
  removeComponent(entityId: EntityId, componentType: ComponentType): void {
    const store = this.componentStores.get(componentType);
    if (!store || !store.has(entityId)) return;

    store.delete(entityId);

    // Update archetype
    this.updateEntityArchetype(entityId);

    this.queryCacheDirty = true;
    this.onComponentRemovedEmitter.fire({ entity: entityId, component: componentType });
  }

  /**
   * Get a component from an entity
   */
  getComponent<T extends IComponent>(entityId: EntityId, componentType: ComponentType): T | undefined {
    const store = this.componentStores.get(componentType);
    return store?.get(entityId) as T | undefined;
  }

  /**
   * Check if entity has a component
   */
  hasComponent(entityId: EntityId, componentType: ComponentType): boolean {
    const store = this.componentStores.get(componentType);
    return store?.has(entityId) ?? false;
  }

  /**
   * Get all components of an entity
   */
  getComponents(entityId: EntityId): IComponent[] {
    const components: IComponent[] = [];
    for (const store of this.componentStores.values()) {
      const component = store.get(entityId);
      if (component) {
        components.push(component);
      }
    }
    return components;
  }

  /**
   * Get all components of a type
   */
  getAllComponentsOfType<T extends IComponent>(componentType: ComponentType): Map<EntityId, T> {
    const store = this.componentStores.get(componentType);
    return (store ?? new Map()) as Map<EntityId, T>;
  }

  // ========================================================================
  // ARCHETYPE MANAGEMENT
  // ========================================================================

  private updateEntityArchetype(entityId: EntityId): void {
    const entityData = this.entities.get(entityId);
    if (!entityData) return;

    // Get component types for this entity
    const componentTypes = new Set<ComponentType>();
    for (const [type, store] of this.componentStores) {
      if (store.has(entityId)) {
        componentTypes.add(type);
      }
    }

    // Find or create archetype
    const archetypeKey = Array.from(componentTypes).sort().join(',');
    
    // Remove from old archetype
    if (entityData.archetype) {
      entityData.archetype.entities.delete(entityId);
    }

    // Add to new archetype
    let archetype = this.archetypes.get(archetypeKey);
    if (!archetype) {
      archetype = {
        id: this.nextArchetypeId++,
        components: componentTypes,
        entities: new Set()
      };
      this.archetypes.set(archetypeKey, archetype);
    }

    archetype.entities.add(entityId);
    entityData.archetype = archetype;
  }

  // ========================================================================
  // QUERY SYSTEM
  // ========================================================================

  /**
   * Query entities by component requirements
   */
  query(query: ComponentQuery): EntityId[] {
    const cacheKey = JSON.stringify(query);
    
    if (!this.queryCacheDirty && this.queryCache.has(cacheKey)) {
      return Array.from(this.queryCache.get(cacheKey)!);
    }

    const results = new Set<EntityId>();

    for (const [entityId, entityData] of this.entities) {
      if (!entityData.active) continue;

      let matches = true;

      // All: must have all specified components
      if (query.all) {
        for (const type of query.all) {
          if (!this.hasComponent(entityId, type)) {
            matches = false;
            break;
          }
        }
      }

      // Any: must have at least one
      if (matches && query.any && query.any.length > 0) {
        let hasAny = false;
        for (const type of query.any) {
          if (this.hasComponent(entityId, type)) {
            hasAny = true;
            break;
          }
        }
        matches = hasAny;
      }

      // None: must not have any
      if (matches && query.none) {
        for (const type of query.none) {
          if (this.hasComponent(entityId, type)) {
            matches = false;
            break;
          }
        }
      }

      if (matches) {
        results.add(entityId);
      }
    }

    this.queryCache.set(cacheKey, results);
    return Array.from(results);
  }

  /**
   * Query entities by tag
   */
  queryByTag(tag: string): EntityId[] {
    const results: EntityId[] = [];
    for (const [entityId, entityData] of this.entities) {
      if (entityData.tags.has(tag)) {
        results.push(entityId);
      }
    }
    return results;
  }

  /**
   * Query entities by name
   */
  queryByName(name: string): EntityId | undefined {
    for (const [entityId, entityData] of this.entities) {
      if (entityData.name === name) {
        return entityId;
      }
    }
    return undefined;
  }

  /**
   * Clear query cache
   */
  clearQueryCache(): void {
    this.queryCache.clear();
    this.queryCacheDirty = false;
  }

  // ========================================================================
  // SYSTEM MANAGEMENT
  // ========================================================================

  /**
   * Register a system
   */
  registerSystem(system: ISystem): void {
    this.systems.push(system);
    this.systemsSorted = false;
    
    if (system.initialize) {
      system.initialize();
    }
  }

  /**
   * Unregister a system
   */
  unregisterSystem(systemName: string): void {
    const index = this.systems.findIndex(s => s.name === systemName);
    if (index !== -1) {
      const system = this.systems[index];
      if (system.destroy) {
        system.destroy();
      }
      this.systems.splice(index, 1);
    }
  }

  /**
   * Get a system by name
   */
  getSystem<T extends ISystem>(name: string): T | undefined {
    return this.systems.find(s => s.name === name) as T | undefined;
  }

  /**
   * Sort systems by priority
   */
  private sortSystems(): void {
    if (this.systemsSorted) return;
    this.systems.sort((a, b) => a.priority - b.priority);
    this.systemsSorted = true;
  }

  // ========================================================================
  // UPDATE LOOP
  // ========================================================================

  /**
   * Update all systems
   */
  update(deltaTime: number): void {
    this.sortSystems();

    // Clear query cache if dirty
    if (this.queryCacheDirty) {
      this.clearQueryCache();
    }

    for (const system of this.systems) {
      if (!system.enabled) continue;

      const entities = this.query({ all: system.requiredComponents });
      
      try {
        system.update(entities, deltaTime);
      } catch (error) {
        console.error(`[ECS] Error in system ${system.name}:`, error);
      }
    }
  }

  /**
   * Fixed update all systems
   */
  fixedUpdate(deltaTime: number): void {
    this.sortSystems();

    for (const system of this.systems) {
      if (!system.enabled || !system.fixedUpdate) continue;

      const entities = this.query({ all: system.requiredComponents });
      
      try {
        system.fixedUpdate(entities, deltaTime);
      } catch (error) {
        console.error(`[ECS] Error in system ${system.name} fixedUpdate:`, error);
      }
    }
  }

  /**
   * Late update all systems
   */
  lateUpdate(deltaTime: number): void {
    this.sortSystems();

    for (const system of this.systems) {
      if (!system.enabled || !system.lateUpdate) continue;

      const entities = this.query({ all: system.requiredComponents });
      
      try {
        system.lateUpdate(entities, deltaTime);
      } catch (error) {
        console.error(`[ECS] Error in system ${system.name} lateUpdate:`, error);
      }
    }
  }

  // ========================================================================
  // SERIALIZATION
  // ========================================================================

  /**
   * Serialize world to JSON
   */
  serialize(): string {
    const data = {
      entities: [] as Array<{
        id: EntityId;
        name: string;
        active: boolean;
        parent: EntityId | null;
        tags: string[];
        components: Array<{ type: string; data: unknown }>;
      }>
    };

    for (const [entityId, entityData] of this.entities) {
      const components = this.getComponents(entityId).map(c => ({
        type: c.type,
        data: { ...c }
      }));

      data.entities.push({
        id: entityId,
        name: entityData.name,
        active: entityData.active,
        parent: entityData.parent,
        tags: Array.from(entityData.tags),
        components
      });
    }

    return JSON.stringify(data, null, 2);
  }

  /**
   * Deserialize world from JSON
   */
  deserialize(json: string): void {
    const data = JSON.parse(json);

    // Clear current world
    this.clear();

    // Create entities
    for (const entityData of data.entities) {
      const id = this.createEntity({
        name: entityData.name,
        active: entityData.active,
        tags: entityData.tags
      });

      // Add components
      for (const compData of entityData.components) {
        const component = createComponentInstance(compData.type);
        if (component) {
          Object.assign(component, compData.data);
          this.addComponent(id, component);
        }
      }
    }

    // Set up parent relationships (second pass)
    for (const entityData of data.entities) {
      if (entityData.parent !== null) {
        const entity = this.entities.get(entityData.id);
        const parent = this.entities.get(entityData.parent);
        if (entity && parent) {
          entity.parent = entityData.parent;
          parent.children.add(entityData.id);
        }
      }
    }
  }

  /**
   * Clear all entities and reset
   */
  clear(): void {
    const entityIds = Array.from(this.entities.keys());
    for (const id of entityIds) {
      this.destroyEntity(id);
    }
    
    this.nextEntityId = 1;
    this.recycledIds.length = 0;
    this.queryCache.clear();
    this.queryCacheDirty = false;
  }

  // ========================================================================
  // CLEANUP
  // ========================================================================

  dispose(): void {
    // Destroy all systems
    for (const system of this.systems) {
      if (system.destroy) {
        system.destroy();
      }
    }
    this.systems.length = 0;

    // Clear all entities
    this.clear();

    // Dispose emitters
    this.onEntityCreatedEmitter.dispose();
    this.onEntityDestroyedEmitter.dispose();
    this.onComponentAddedEmitter.dispose();
    this.onComponentRemovedEmitter.dispose();
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an entity with Transform at position
 */
export function createEntityAtPosition(
  world: ECSWorld,
  name: string,
  x: number, y: number, z: number
): EntityId {
  const entity = world.createEntity({ name });
  const transform = world.getComponent<TransformComponent>(entity, 'Transform');
  if (transform) {
    transform.setPosition(x, y, z);
  }
  return entity;
}

/**
 * Create a camera entity
 */
export function createCamera(
  world: ECSWorld,
  name: string,
  fov = 60
): EntityId {
  const entity = world.createEntity({ name });
  const camera = new CameraComponent();
  camera.fieldOfView = fov;
  world.addComponent(entity, camera);
  return entity;
}

/**
 * Create a light entity
 */
export function createLight(
  world: ECSWorld,
  name: string,
  type: 'directional' | 'point' | 'spot' = 'point'
): EntityId {
  const entity = world.createEntity({ name });
  const light = new LightComponent();
  light.lightType = type;
  world.addComponent(entity, light);
  return entity;
}
