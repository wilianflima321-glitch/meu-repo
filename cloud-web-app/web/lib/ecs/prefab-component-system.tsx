/**
 * Prefab & Component System - Sistema de Prefabs e Componentes
 * 
 * Sistema ECS-like com:
 * - Entity-Component architecture
 * - Prefab creation/instantiation
 * - Component lifecycle
 * - Prefab variants/overrides
 * - Serialization
 * - Hot reloading
 * 
 * @module lib/ecs/prefab-component-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type EntityId = string;
export type ComponentType = string;

export interface ComponentData {
  [key: string]: unknown;
}

export interface ComponentDefinition<T extends ComponentData = ComponentData> {
  type: ComponentType;
  defaultData: () => T;
  schema?: Record<string, PropertySchema>;
  onAttach?: (entity: Entity, component: Component<T>) => void;
  onDetach?: (entity: Entity, component: Component<T>) => void;
  onUpdate?: (entity: Entity, component: Component<T>, deltaTime: number) => void;
  onSerialize?: (data: T) => unknown;
  onDeserialize?: (serialized: unknown) => T;
}

export interface PropertySchema {
  type: 'number' | 'string' | 'boolean' | 'vector2' | 'vector3' | 'color' | 'entity' | 'asset' | 'enum' | 'array' | 'object';
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description?: string;
}

export interface Component<T extends ComponentData = ComponentData> {
  id: string;
  type: ComponentType;
  data: T;
  enabled: boolean;
  entity: Entity | null;
}

export interface Entity {
  id: EntityId;
  name: string;
  enabled: boolean;
  parent: Entity | null;
  children: Entity[];
  components: Map<ComponentType, Component>;
  tags: Set<string>;
  layer: number;
  prefabId?: string;
  prefabOverrides?: Map<string, unknown>;
  object3D?: THREE.Object3D;
}

export interface PrefabData {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  entity: SerializedEntity;
  version: number;
  created: number;
  modified: number;
}

export interface SerializedEntity {
  name: string;
  enabled: boolean;
  tags: string[];
  layer: number;
  components: SerializedComponent[];
  children: SerializedEntity[];
  transform?: {
    position: [number, number, number];
    rotation: [number, number, number, number];
    scale: [number, number, number];
  };
}

export interface SerializedComponent {
  type: ComponentType;
  enabled: boolean;
  data: unknown;
}

// ============================================================================
// BUILT-IN COMPONENTS
// ============================================================================

export interface TransformData extends ComponentData {
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  scale: THREE.Vector3;
  localPosition: THREE.Vector3;
  localRotation: THREE.Quaternion;
  localScale: THREE.Vector3;
}

export interface MeshRendererData extends ComponentData {
  meshId: string;
  materialIds: string[];
  castShadow: boolean;
  receiveShadow: boolean;
  visible: boolean;
  renderOrder: number;
}

export interface LightData extends ComponentData {
  type: 'directional' | 'point' | 'spot' | 'ambient' | 'hemisphere';
  color: THREE.Color;
  intensity: number;
  range?: number;
  angle?: number;
  penumbra?: number;
  decay?: number;
  castShadow: boolean;
  shadowMapSize: number;
  shadowBias: number;
}

export interface CameraData extends ComponentData {
  type: 'perspective' | 'orthographic';
  fov: number;
  near: number;
  far: number;
  orthographicSize?: number;
  depth: number;
  clearFlags: 'skybox' | 'color' | 'depth' | 'nothing';
  clearColor: THREE.Color;
  cullingMask: number;
}

export interface ColliderData extends ComponentData {
  type: 'box' | 'sphere' | 'capsule' | 'mesh' | 'plane';
  isTrigger: boolean;
  center: THREE.Vector3;
  size?: THREE.Vector3;
  radius?: number;
  height?: number;
  direction?: 'x' | 'y' | 'z';
  meshId?: string;
}

export interface RigidbodyData extends ComponentData {
  mass: number;
  drag: number;
  angularDrag: number;
  useGravity: boolean;
  isKinematic: boolean;
  freezePosition: { x: boolean; y: boolean; z: boolean };
  freezeRotation: { x: boolean; y: boolean; z: boolean };
  collisionDetection: 'discrete' | 'continuous' | 'continuous_dynamic';
}

export interface AudioSourceData extends ComponentData {
  clipId: string;
  volume: number;
  pitch: number;
  loop: boolean;
  playOnAwake: boolean;
  spatial: boolean;
  minDistance: number;
  maxDistance: number;
  rolloffMode: 'linear' | 'logarithmic' | 'custom';
}

export interface ScriptData extends ComponentData {
  scriptPath: string;
  properties: Record<string, unknown>;
}

// ============================================================================
// COMPONENT REGISTRY
// ============================================================================

export class ComponentRegistry {
  private definitions: Map<ComponentType, ComponentDefinition> = new Map();
  
  constructor() {
    this.registerBuiltInComponents();
  }
  
  register<T extends ComponentData>(definition: ComponentDefinition<T>): void {
    this.definitions.set(definition.type, definition as unknown as ComponentDefinition);
  }
  
  get(type: ComponentType): ComponentDefinition | undefined {
    return this.definitions.get(type);
  }
  
  has(type: ComponentType): boolean {
    return this.definitions.has(type);
  }
  
  getAll(): ComponentDefinition[] {
    return Array.from(this.definitions.values());
  }
  
  createComponent<T extends ComponentData>(type: ComponentType): Component<T> | null {
    const definition = this.definitions.get(type);
    if (!definition) {
      console.warn(`Component type not registered: ${type}`);
      return null;
    }
    
    return {
      id: `comp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      data: definition.defaultData() as T,
      enabled: true,
      entity: null,
    };
  }
  
  private registerBuiltInComponents(): void {
    // Transform
    this.register<TransformData>({
      type: 'transform',
      defaultData: () => ({
        position: new THREE.Vector3(),
        rotation: new THREE.Quaternion(),
        scale: new THREE.Vector3(1, 1, 1),
        localPosition: new THREE.Vector3(),
        localRotation: new THREE.Quaternion(),
        localScale: new THREE.Vector3(1, 1, 1),
      }),
      schema: {
        position: { type: 'vector3', description: 'World position' },
        rotation: { type: 'vector3', description: 'Euler angles in degrees' },
        scale: { type: 'vector3', description: 'Scale' },
      },
      onSerialize: (data) => ({
        position: data.position.toArray(),
        rotation: data.rotation.toArray(),
        scale: data.scale.toArray(),
      }),
      onDeserialize: (serialized: any) => ({
        position: new THREE.Vector3().fromArray(serialized.position),
        rotation: new THREE.Quaternion().fromArray(serialized.rotation),
        scale: new THREE.Vector3().fromArray(serialized.scale),
        localPosition: new THREE.Vector3(),
        localRotation: new THREE.Quaternion(),
        localScale: new THREE.Vector3(1, 1, 1),
      }),
    });
    
    // MeshRenderer
    this.register<MeshRendererData>({
      type: 'meshRenderer',
      defaultData: () => ({
        meshId: '',
        materialIds: [],
        castShadow: true,
        receiveShadow: true,
        visible: true,
        renderOrder: 0,
      }),
      schema: {
        meshId: { type: 'asset', description: 'Mesh asset' },
        materialIds: { type: 'array', description: 'Material assets' },
        castShadow: { type: 'boolean', default: true },
        receiveShadow: { type: 'boolean', default: true },
        visible: { type: 'boolean', default: true },
        renderOrder: { type: 'number', default: 0 },
      },
    });
    
    // Light
    this.register<LightData>({
      type: 'light',
      defaultData: () => ({
        type: 'point',
        color: new THREE.Color(0xffffff),
        intensity: 1,
        range: 10,
        angle: Math.PI / 4,
        penumbra: 0.1,
        decay: 2,
        castShadow: false,
        shadowMapSize: 1024,
        shadowBias: -0.0001,
      }),
      schema: {
        type: { type: 'enum', options: ['directional', 'point', 'spot', 'ambient', 'hemisphere'] },
        color: { type: 'color' },
        intensity: { type: 'number', min: 0, max: 10, default: 1 },
        range: { type: 'number', min: 0, default: 10 },
        castShadow: { type: 'boolean', default: false },
      },
      onSerialize: (data) => ({
        ...data,
        color: data.color.getHex(),
      }),
      onDeserialize: (serialized: any) => ({
        ...serialized,
        color: new THREE.Color(serialized.color),
      }),
    });
    
    // Camera
    this.register<CameraData>({
      type: 'camera',
      defaultData: () => ({
        type: 'perspective',
        fov: 60,
        near: 0.1,
        far: 1000,
        orthographicSize: 10,
        depth: 0,
        clearFlags: 'skybox',
        clearColor: new THREE.Color(0x000000),
        cullingMask: 0xffffffff,
      }),
      schema: {
        type: { type: 'enum', options: ['perspective', 'orthographic'] },
        fov: { type: 'number', min: 1, max: 179, default: 60 },
        near: { type: 'number', min: 0.001, default: 0.1 },
        far: { type: 'number', min: 1, default: 1000 },
      },
    });
    
    // Collider
    this.register<ColliderData>({
      type: 'collider',
      defaultData: () => ({
        type: 'box',
        isTrigger: false,
        center: new THREE.Vector3(),
        size: new THREE.Vector3(1, 1, 1),
        radius: 0.5,
        height: 2,
        direction: 'y',
      }),
      schema: {
        type: { type: 'enum', options: ['box', 'sphere', 'capsule', 'mesh', 'plane'] },
        isTrigger: { type: 'boolean', default: false },
        center: { type: 'vector3' },
        size: { type: 'vector3' },
        radius: { type: 'number', min: 0, default: 0.5 },
      },
    });
    
    // Rigidbody
    this.register<RigidbodyData>({
      type: 'rigidbody',
      defaultData: () => ({
        mass: 1,
        drag: 0,
        angularDrag: 0.05,
        useGravity: true,
        isKinematic: false,
        freezePosition: { x: false, y: false, z: false },
        freezeRotation: { x: false, y: false, z: false },
        collisionDetection: 'discrete',
      }),
      schema: {
        mass: { type: 'number', min: 0, default: 1 },
        drag: { type: 'number', min: 0, default: 0 },
        useGravity: { type: 'boolean', default: true },
        isKinematic: { type: 'boolean', default: false },
      },
    });
    
    // AudioSource
    this.register<AudioSourceData>({
      type: 'audioSource',
      defaultData: () => ({
        clipId: '',
        volume: 1,
        pitch: 1,
        loop: false,
        playOnAwake: false,
        spatial: true,
        minDistance: 1,
        maxDistance: 500,
        rolloffMode: 'logarithmic',
      }),
      schema: {
        clipId: { type: 'asset' },
        volume: { type: 'number', min: 0, max: 1, default: 1 },
        pitch: { type: 'number', min: 0.1, max: 3, default: 1 },
        loop: { type: 'boolean', default: false },
        spatial: { type: 'boolean', default: true },
      },
    });
    
    // Script
    this.register<ScriptData>({
      type: 'script',
      defaultData: () => ({
        scriptPath: '',
        properties: {},
      }),
      schema: {
        scriptPath: { type: 'string', description: 'Path to script file' },
        properties: { type: 'object', description: 'Script properties' },
      },
    });
  }
}

// ============================================================================
// ENTITY MANAGER
// ============================================================================

export class EntityManager extends EventEmitter {
  private entities: Map<EntityId, Entity> = new Map();
  private componentRegistry: ComponentRegistry;
  private entityIdCounter = 0;
  private rootEntities: Entity[] = [];
  
  constructor(componentRegistry: ComponentRegistry) {
    super();
    this.componentRegistry = componentRegistry;
  }
  
  createEntity(name = 'Entity'): Entity {
    const entity: Entity = {
      id: `entity_${++this.entityIdCounter}`,
      name,
      enabled: true,
      parent: null,
      children: [],
      components: new Map(),
      tags: new Set(),
      layer: 0,
    };
    
    // Always add transform component
    const transform = this.componentRegistry.createComponent<TransformData>('transform');
    if (transform) {
      this.attachComponent(entity, transform);
    }
    
    this.entities.set(entity.id, entity);
    this.rootEntities.push(entity);
    
    this.emit('entityCreated', { entity });
    return entity;
  }
  
  destroyEntity(entityId: EntityId): void {
    const entity = this.entities.get(entityId);
    if (!entity) return;
    
    // Destroy children first
    for (const child of [...entity.children]) {
      this.destroyEntity(child.id);
    }
    
    // Detach all components
    for (const component of entity.components.values()) {
      this.detachComponent(entity, component.type);
    }
    
    // Remove from parent
    if (entity.parent) {
      const index = entity.parent.children.indexOf(entity);
      if (index !== -1) {
        entity.parent.children.splice(index, 1);
      }
    } else {
      const index = this.rootEntities.indexOf(entity);
      if (index !== -1) {
        this.rootEntities.splice(index, 1);
      }
    }
    
    // Remove Object3D
    if (entity.object3D) {
      entity.object3D.removeFromParent();
    }
    
    this.entities.delete(entityId);
    this.emit('entityDestroyed', { entityId });
  }
  
  getEntity(entityId: EntityId): Entity | undefined {
    return this.entities.get(entityId);
  }
  
  getAllEntities(): Entity[] {
    return Array.from(this.entities.values());
  }
  
  getRootEntities(): Entity[] {
    return [...this.rootEntities];
  }
  
  setParent(entity: Entity, parent: Entity | null): void {
    // Remove from current parent
    if (entity.parent) {
      const index = entity.parent.children.indexOf(entity);
      if (index !== -1) {
        entity.parent.children.splice(index, 1);
      }
    } else {
      const index = this.rootEntities.indexOf(entity);
      if (index !== -1) {
        this.rootEntities.splice(index, 1);
      }
    }
    
    // Set new parent
    entity.parent = parent;
    
    if (parent) {
      parent.children.push(entity);
    } else {
      this.rootEntities.push(entity);
    }
    
    // Update Object3D hierarchy
    if (entity.object3D) {
      if (parent?.object3D) {
        parent.object3D.add(entity.object3D);
      } else {
        entity.object3D.removeFromParent();
      }
    }
    
    this.emit('parentChanged', { entity, parent });
  }
  
  attachComponent<T extends ComponentData>(entity: Entity, component: Component<T>): void {
    if (entity.components.has(component.type)) {
      console.warn(`Entity already has component: ${component.type}`);
      return;
    }
    
    component.entity = entity;
    entity.components.set(component.type, component);
    
    const definition = this.componentRegistry.get(component.type);
    if (definition?.onAttach) {
      definition.onAttach(entity, component);
    }
    
    this.emit('componentAttached', { entity, component });
  }
  
  detachComponent(entity: Entity, componentType: ComponentType): void {
    const component = entity.components.get(componentType);
    if (!component) return;
    
    const definition = this.componentRegistry.get(componentType);
    if (definition?.onDetach) {
      definition.onDetach(entity, component);
    }
    
    component.entity = null;
    entity.components.delete(componentType);
    
    this.emit('componentDetached', { entity, componentType });
  }
  
  getComponent<T extends ComponentData>(entity: Entity, componentType: ComponentType): Component<T> | undefined {
    return entity.components.get(componentType) as Component<T> | undefined;
  }
  
  hasComponent(entity: Entity, componentType: ComponentType): boolean {
    return entity.components.has(componentType);
  }
  
  findByName(name: string): Entity | undefined {
    for (const entity of this.entities.values()) {
      if (entity.name === name) return entity;
    }
    return undefined;
  }
  
  findByTag(tag: string): Entity[] {
    return Array.from(this.entities.values()).filter((e) => e.tags.has(tag));
  }
  
  findByComponent(componentType: ComponentType): Entity[] {
    return Array.from(this.entities.values()).filter((e) => e.components.has(componentType));
  }
  
  update(deltaTime: number): void {
    for (const entity of this.entities.values()) {
      if (!entity.enabled) continue;
      
      for (const component of entity.components.values()) {
        if (!component.enabled) continue;
        
        const definition = this.componentRegistry.get(component.type);
        if (definition?.onUpdate) {
          definition.onUpdate(entity, component, deltaTime);
        }
      }
    }
  }
  
  clear(): void {
    for (const entityId of [...this.entities.keys()]) {
      this.destroyEntity(entityId);
    }
    
    this.entities.clear();
    this.rootEntities = [];
    this.entityIdCounter = 0;
    
    this.emit('cleared');
  }
}

// ============================================================================
// PREFAB MANAGER
// ============================================================================

export class PrefabManager extends EventEmitter {
  private prefabs: Map<string, PrefabData> = new Map();
  private entityManager: EntityManager;
  private componentRegistry: ComponentRegistry;
  
  constructor(entityManager: EntityManager, componentRegistry: ComponentRegistry) {
    super();
    this.entityManager = entityManager;
    this.componentRegistry = componentRegistry;
  }
  
  createPrefab(entity: Entity, name: string, description?: string): PrefabData {
    const prefabId = `prefab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const prefab: PrefabData = {
      id: prefabId,
      name,
      description,
      entity: this.serializeEntity(entity),
      version: 1,
      created: Date.now(),
      modified: Date.now(),
    };
    
    this.prefabs.set(prefabId, prefab);
    this.emit('prefabCreated', { prefab });
    
    return prefab;
  }
  
  updatePrefab(prefabId: string, entity: Entity): void {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) {
      console.warn(`Prefab not found: ${prefabId}`);
      return;
    }
    
    prefab.entity = this.serializeEntity(entity);
    prefab.version++;
    prefab.modified = Date.now();
    
    this.emit('prefabUpdated', { prefab });
  }
  
  deletePrefab(prefabId: string): void {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return;
    
    this.prefabs.delete(prefabId);
    this.emit('prefabDeleted', { prefabId });
  }
  
  getPrefab(prefabId: string): PrefabData | undefined {
    return this.prefabs.get(prefabId);
  }
  
  getAllPrefabs(): PrefabData[] {
    return Array.from(this.prefabs.values());
  }
  
  instantiate(
    prefabId: string,
    position?: THREE.Vector3,
    rotation?: THREE.Quaternion,
    parent?: Entity
  ): Entity | null {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) {
      console.warn(`Prefab not found: ${prefabId}`);
      return null;
    }
    
    const entity = this.deserializeEntity(prefab.entity);
    entity.prefabId = prefabId;
    entity.prefabOverrides = new Map();
    
    // Apply position/rotation
    const transform = entity.components.get('transform') as Component<TransformData> | undefined;
    if (transform) {
      if (position) {
        transform.data.position.copy(position);
        transform.data.localPosition.copy(position);
      }
      if (rotation) {
        transform.data.rotation.copy(rotation);
        transform.data.localRotation.copy(rotation);
      }
    }
    
    // Set parent
    if (parent) {
      this.entityManager.setParent(entity, parent);
    }
    
    this.emit('prefabInstantiated', { prefab, entity });
    return entity;
  }
  
  applyOverride(entity: Entity, componentType: ComponentType, propertyPath: string, value: unknown): void {
    if (!entity.prefabId) return;
    
    if (!entity.prefabOverrides) {
      entity.prefabOverrides = new Map();
    }
    
    const key = `${componentType}.${propertyPath}`;
    entity.prefabOverrides.set(key, value);
    
    this.emit('overrideApplied', { entity, componentType, propertyPath, value });
  }
  
  revertOverride(entity: Entity, componentType: ComponentType, propertyPath: string): void {
    if (!entity.prefabId || !entity.prefabOverrides) return;
    
    const prefab = this.prefabs.get(entity.prefabId);
    if (!prefab) return;
    
    const key = `${componentType}.${propertyPath}`;
    entity.prefabOverrides.delete(key);
    
    // Restore original value from prefab
    // This would require deep property access implementation
    
    this.emit('overrideReverted', { entity, componentType, propertyPath });
  }
  
  revertAllOverrides(entity: Entity): void {
    if (!entity.prefabId) return;
    
    const prefab = this.prefabs.get(entity.prefabId);
    if (!prefab) return;
    
    // Re-instantiate from prefab
    const transform = entity.components.get('transform') as Component<TransformData> | undefined;
    const position = transform?.data.position.clone();
    const rotation = transform?.data.rotation.clone();
    const parent = entity.parent;
    
    // Destroy current entity
    this.entityManager.destroyEntity(entity.id);
    
    // Re-instantiate
    this.instantiate(prefab.id, position, rotation, parent || undefined);
  }
  
  // ============================================================================
  // SERIALIZATION
  // ============================================================================
  
  private serializeEntity(entity: Entity): SerializedEntity {
    const components: SerializedComponent[] = [];
    
    for (const [type, component] of entity.components) {
      const definition = this.componentRegistry.get(type);
      let data: ComponentData;
      
      if (definition?.onSerialize) {
        data = definition.onSerialize(component.data) as ComponentData;
      } else {
        // Default serialization for THREE objects
        data = this.serializeComponentData(component.data) as ComponentData;
      }
      
      components.push({
        type,
        enabled: component.enabled,
        data,
      });
    }
    
    const transform = entity.components.get('transform') as Component<TransformData> | undefined;
    
    return {
      name: entity.name,
      enabled: entity.enabled,
      tags: Array.from(entity.tags),
      layer: entity.layer,
      components,
      children: entity.children.map((child) => this.serializeEntity(child)),
      transform: transform ? {
        position: transform.data.position.toArray() as [number, number, number],
        rotation: transform.data.rotation.toArray() as [number, number, number, number],
        scale: transform.data.scale.toArray() as [number, number, number],
      } : undefined,
    };
  }
  
  private serializeComponentData(data: ComponentData): unknown {
    const result: Record<string, unknown> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof THREE.Vector3) {
        result[key] = { type: 'Vector3', value: value.toArray() };
      } else if (value instanceof THREE.Vector2) {
        result[key] = { type: 'Vector2', value: value.toArray() };
      } else if (value instanceof THREE.Quaternion) {
        result[key] = { type: 'Quaternion', value: value.toArray() };
      } else if (value instanceof THREE.Color) {
        result[key] = { type: 'Color', value: value.getHex() };
      } else if (value instanceof THREE.Euler) {
        result[key] = { type: 'Euler', value: value.toArray() };
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  private deserializeEntity(serialized: SerializedEntity, parent?: Entity): Entity {
    const entity = this.entityManager.createEntity(serialized.name);
    entity.enabled = serialized.enabled;
    entity.layer = serialized.layer;
    
    for (const tag of serialized.tags) {
      entity.tags.add(tag);
    }
    
    // Apply transform
    if (serialized.transform) {
      const transform = entity.components.get('transform') as Component<TransformData>;
      if (transform) {
        transform.data.position.fromArray(serialized.transform.position);
        transform.data.rotation.fromArray(serialized.transform.rotation);
        transform.data.scale.fromArray(serialized.transform.scale);
        transform.data.localPosition.copy(transform.data.position);
        transform.data.localRotation.copy(transform.data.rotation);
        transform.data.localScale.copy(transform.data.scale);
      }
    }
    
    // Add components
    for (const serializedComp of serialized.components) {
      if (serializedComp.type === 'transform') continue; // Already added
      
      const component = this.componentRegistry.createComponent(serializedComp.type);
      if (component) {
        const definition = this.componentRegistry.get(serializedComp.type);
        
        if (definition?.onDeserialize) {
          component.data = definition.onDeserialize(serializedComp.data);
        } else {
          component.data = this.deserializeComponentData(serializedComp.data as Record<string, unknown>);
        }
        
        component.enabled = serializedComp.enabled;
        this.entityManager.attachComponent(entity, component);
      }
    }
    
    // Set parent
    if (parent) {
      this.entityManager.setParent(entity, parent);
    }
    
    // Deserialize children
    for (const childData of serialized.children) {
      this.deserializeEntity(childData, entity);
    }
    
    return entity;
  }
  
  private deserializeComponentData(data: Record<string, unknown>): ComponentData {
    const result: ComponentData = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'object' && value !== null && 'type' in value && 'value' in value) {
        const typed = value as { type: string; value: unknown };
        
        switch (typed.type) {
          case 'Vector3':
            result[key] = new THREE.Vector3().fromArray(typed.value as number[]);
            break;
          case 'Vector2':
            result[key] = new THREE.Vector2().fromArray(typed.value as number[]);
            break;
          case 'Quaternion':
            result[key] = new THREE.Quaternion().fromArray(typed.value as number[]);
            break;
          case 'Color':
            result[key] = new THREE.Color(typed.value as number);
            break;
          case 'Euler': {
            const arr = typed.value as [number, number, number, string?];
            result[key] = new THREE.Euler(arr[0], arr[1], arr[2], arr[3] as THREE.EulerOrder || 'XYZ');
            break;
          }
          default:
            result[key] = typed.value;
        }
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
  
  // ============================================================================
  // EXPORT/IMPORT
  // ============================================================================
  
  exportPrefab(prefabId: string): string | null {
    const prefab = this.prefabs.get(prefabId);
    if (!prefab) return null;
    
    return JSON.stringify(prefab, null, 2);
  }
  
  importPrefab(json: string): PrefabData | null {
    try {
      const prefab = JSON.parse(json) as PrefabData;
      
      // Generate new ID to avoid conflicts
      prefab.id = `prefab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      prefab.modified = Date.now();
      
      this.prefabs.set(prefab.id, prefab);
      this.emit('prefabImported', { prefab });
      
      return prefab;
    } catch (error) {
      console.error('Failed to import prefab:', error);
      return null;
    }
  }
  
  async savePrefabsToFile(): Promise<void> {
    const data = JSON.stringify(Array.from(this.prefabs.values()), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    
    if ('showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: 'prefabs.json',
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        
        this.emit('prefabsSaved');
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          throw error;
        }
      }
    } else {
      // Fallback
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prefabs.json';
      a.click();
      URL.revokeObjectURL(url);
      
      this.emit('prefabsSaved');
    }
  }
  
  async loadPrefabsFromFile(): Promise<void> {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        
        const file = await handle.getFile();
        const text = await file.text();
        const prefabs = JSON.parse(text) as PrefabData[];
        
        for (const prefab of prefabs) {
          this.prefabs.set(prefab.id, prefab);
        }
        
        this.emit('prefabsLoaded', { count: prefabs.length });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          throw error;
        }
      }
    }
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useCallback, useRef, useEffect, useMemo, useContext, createContext } from 'react';

interface ECSContextValue {
  componentRegistry: ComponentRegistry;
  entityManager: EntityManager;
  prefabManager: PrefabManager;
}

const ECSContext = createContext<ECSContextValue | null>(null);

export function ECSProvider({ children }: { children: React.ReactNode }) {
  const valueRef = useRef<ECSContextValue | null>(null);
  
  if (!valueRef.current) {
    const componentRegistry = new ComponentRegistry();
    const entityManager = new EntityManager(componentRegistry);
    const prefabManager = new PrefabManager(entityManager, componentRegistry);
    
    valueRef.current = {
      componentRegistry,
      entityManager,
      prefabManager,
    };
  }
  
  return (
    <ECSContext.Provider value={valueRef.current}>
      {children}
    </ECSContext.Provider>
  );
}

export function useECS(): ECSContextValue {
  const context = useContext(ECSContext);
  if (!context) {
    throw new Error('useECS must be used within an ECSProvider');
  }
  return context;
}

export function useEntity(entityId: EntityId) {
  const { entityManager } = useECS();
  const [entity, setEntity] = useState<Entity | undefined>(() => 
    entityManager.getEntity(entityId)
  );
  
  useEffect(() => {
    const handleChange = () => {
      setEntity(entityManager.getEntity(entityId));
    };
    
    entityManager.on('entityCreated', handleChange);
    entityManager.on('entityDestroyed', handleChange);
    entityManager.on('componentAttached', handleChange);
    entityManager.on('componentDetached', handleChange);
    
    return () => {
      entityManager.off('entityCreated', handleChange);
      entityManager.off('entityDestroyed', handleChange);
      entityManager.off('componentAttached', handleChange);
      entityManager.off('componentDetached', handleChange);
    };
  }, [entityManager, entityId]);
  
  return entity;
}

export function useComponent<T extends ComponentData>(
  entity: Entity | undefined,
  componentType: ComponentType
): Component<T> | undefined {
  const [component, setComponent] = useState<Component<T> | undefined>(
    () => entity?.components.get(componentType) as Component<T> | undefined
  );
  
  useEffect(() => {
    if (entity) {
      setComponent(entity.components.get(componentType) as Component<T> | undefined);
    }
  }, [entity, componentType]);
  
  return component;
}

export function usePrefabs() {
  const { prefabManager } = useECS();
  const [prefabs, setPrefabs] = useState<PrefabData[]>(() => prefabManager.getAllPrefabs());
  
  useEffect(() => {
    const updatePrefabs = () => {
      setPrefabs(prefabManager.getAllPrefabs());
    };
    
    prefabManager.on('prefabCreated', updatePrefabs);
    prefabManager.on('prefabUpdated', updatePrefabs);
    prefabManager.on('prefabDeleted', updatePrefabs);
    prefabManager.on('prefabImported', updatePrefabs);
    prefabManager.on('prefabsLoaded', updatePrefabs);
    
    return () => {
      prefabManager.off('prefabCreated', updatePrefabs);
      prefabManager.off('prefabUpdated', updatePrefabs);
      prefabManager.off('prefabDeleted', updatePrefabs);
      prefabManager.off('prefabImported', updatePrefabs);
      prefabManager.off('prefabsLoaded', updatePrefabs);
    };
  }, [prefabManager]);
  
  const createPrefab = useCallback((entity: Entity, name: string, description?: string) => {
    return prefabManager.createPrefab(entity, name, description);
  }, [prefabManager]);
  
  const instantiate = useCallback((
    prefabId: string,
    position?: THREE.Vector3,
    rotation?: THREE.Quaternion,
    parent?: Entity
  ) => {
    return prefabManager.instantiate(prefabId, position, rotation, parent);
  }, [prefabManager]);
  
  const deletePrefab = useCallback((prefabId: string) => {
    prefabManager.deletePrefab(prefabId);
  }, [prefabManager]);
  
  return {
    prefabs,
    createPrefab,
    instantiate,
    deletePrefab,
    exportPrefab: (id: string) => prefabManager.exportPrefab(id),
    importPrefab: (json: string) => prefabManager.importPrefab(json),
    savePrefabsToFile: () => prefabManager.savePrefabsToFile(),
    loadPrefabsFromFile: () => prefabManager.loadPrefabsFromFile(),
  };
}

const __defaultExport = {
  ComponentRegistry,
  EntityManager,
  PrefabManager,
  ECSProvider,
  useECS,
  useEntity,
  useComponent,
  usePrefabs,
};

export default __defaultExport;
