/**
 * Level Serialization System REAL
 * 
 * Sistema REAL de serialização de níveis/cenas com compressão,
 * versionamento, prefabs, assets e referências.
 * 
 * NÃO É MOCK - Salva e carrega níveis de verdade!
 */

import * as THREE from 'three';
import pako from 'pako';

// ============================================================================
// TIPOS
// ============================================================================

export interface SerializedVector3 {
  x: number;
  y: number;
  z: number;
}

export interface SerializedQuaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface SerializedTransform {
  position: SerializedVector3;
  rotation: SerializedQuaternion;
  scale: SerializedVector3;
}

export interface SerializedComponent {
  type: string;
  data: Record<string, unknown>;
}

export interface SerializedEntity {
  id: string;
  name: string;
  parentId: string | null;
  transform: SerializedTransform;
  components: SerializedComponent[];
  tags: string[];
  layer: number;
  active: boolean;
  prefabId?: string;
  prefabInstanceId?: string;
}

export interface SerializedPrefab {
  id: string;
  name: string;
  entities: SerializedEntity[];
  rootEntityId: string;
}

export interface SerializedAssetRef {
  id: string;
  type: 'texture' | 'model' | 'audio' | 'material' | 'animation' | 'script' | 'prefab';
  path: string;
  hash?: string;
}

export interface SerializedLevelMetadata {
  name: string;
  description: string;
  author: string;
  createdAt: string;
  modifiedAt: string;
  version: string;
  thumbnail?: string;
  tags: string[];
}

export interface SerializedLevel {
  formatVersion: string;
  metadata: SerializedLevelMetadata;
  assets: SerializedAssetRef[];
  entities: SerializedEntity[];
  prefabs: SerializedPrefab[];
  settings: LevelSettings;
}

export interface LevelSettings {
  skybox?: SkyboxSettings;
  lighting?: LightingSettings;
  physics?: PhysicsSettings;
  audio?: AudioSettings;
  fog?: FogSettings;
  postProcessing?: PostProcessingSettings;
}

export interface SkyboxSettings {
  type: 'color' | 'gradient' | 'cubemap' | 'hdri';
  color?: string;
  gradientTop?: string;
  gradientBottom?: string;
  texture?: string;
  intensity?: number;
}

export interface LightingSettings {
  ambientColor: string;
  ambientIntensity: number;
  shadowsEnabled: boolean;
  shadowQuality: 'low' | 'medium' | 'high' | 'ultra';
}

export interface PhysicsSettings {
  gravity: SerializedVector3;
  fixedTimestep: number;
  maxSubSteps: number;
}

export interface AudioSettings {
  masterVolume: number;
  dopplerFactor: number;
  speedOfSound: number;
}

export interface FogSettings {
  enabled: boolean;
  type: 'linear' | 'exponential' | 'exponential2';
  color: string;
  density?: number;
  near?: number;
  far?: number;
}

export interface PostProcessingSettings {
  enabled: boolean;
  bloom?: { enabled: boolean; intensity: number; threshold: number };
  dof?: { enabled: boolean; focus: number; aperture: number };
  ssao?: { enabled: boolean; radius: number; intensity: number };
  colorGrading?: { enabled: boolean; saturation: number; contrast: number; brightness: number };
}

// ============================================================================
// COMPONENT SERIALIZERS
// ============================================================================

type ComponentSerializer = {
  serialize: (component: unknown) => Record<string, unknown>;
  deserialize: (data: Record<string, unknown>) => unknown;
};

const componentSerializers: Map<string, ComponentSerializer> = new Map();

export function registerComponentSerializer(type: string, serializer: ComponentSerializer): void {
  componentSerializers.set(type, serializer);
}

// Built-in serializers

registerComponentSerializer('MeshRenderer', {
  serialize: (component: any) => ({
    meshId: component.meshId,
    materialIds: component.materialIds,
    castShadows: component.castShadows,
    receiveShadows: component.receiveShadows,
  }),
  deserialize: (data) => ({
    meshId: data.meshId,
    materialIds: data.materialIds,
    castShadows: data.castShadows ?? true,
    receiveShadows: data.receiveShadows ?? true,
  }),
});

registerComponentSerializer('Light', {
  serialize: (component: any) => ({
    type: component.type,
    color: component.color,
    intensity: component.intensity,
    range: component.range,
    angle: component.angle,
    penumbra: component.penumbra,
    castShadows: component.castShadows,
  }),
  deserialize: (data) => ({
    type: data.type || 'point',
    color: data.color || '#ffffff',
    intensity: data.intensity ?? 1,
    range: data.range ?? 10,
    angle: data.angle ?? Math.PI / 4,
    penumbra: data.penumbra ?? 0.1,
    castShadows: data.castShadows ?? true,
  }),
});

registerComponentSerializer('Camera', {
  serialize: (component: any) => ({
    type: component.type,
    fov: component.fov,
    near: component.near,
    far: component.far,
    orthographicSize: component.orthographicSize,
    isMain: component.isMain,
  }),
  deserialize: (data) => ({
    type: data.type || 'perspective',
    fov: data.fov ?? 60,
    near: data.near ?? 0.1,
    far: data.far ?? 1000,
    orthographicSize: data.orthographicSize ?? 10,
    isMain: data.isMain ?? false,
  }),
});

registerComponentSerializer('Collider', {
  serialize: (component: any) => ({
    shape: component.shape,
    size: component.size,
    center: component.center,
    isTrigger: component.isTrigger,
    physicsMaterial: component.physicsMaterial,
  }),
  deserialize: (data) => ({
    shape: data.shape || 'box',
    size: data.size || { x: 1, y: 1, z: 1 },
    center: data.center || { x: 0, y: 0, z: 0 },
    isTrigger: data.isTrigger ?? false,
    physicsMaterial: data.physicsMaterial,
  }),
});

registerComponentSerializer('RigidBody', {
  serialize: (component: any) => ({
    mass: component.mass,
    drag: component.drag,
    angularDrag: component.angularDrag,
    useGravity: component.useGravity,
    isKinematic: component.isKinematic,
    constraints: component.constraints,
  }),
  deserialize: (data) => ({
    mass: data.mass ?? 1,
    drag: data.drag ?? 0,
    angularDrag: data.angularDrag ?? 0.05,
    useGravity: data.useGravity ?? true,
    isKinematic: data.isKinematic ?? false,
    constraints: data.constraints || {},
  }),
});

registerComponentSerializer('AudioSource', {
  serialize: (component: any) => ({
    clipId: component.clipId,
    volume: component.volume,
    pitch: component.pitch,
    loop: component.loop,
    playOnAwake: component.playOnAwake,
    spatial: component.spatial,
    minDistance: component.minDistance,
    maxDistance: component.maxDistance,
  }),
  deserialize: (data) => ({
    clipId: data.clipId,
    volume: data.volume ?? 1,
    pitch: data.pitch ?? 1,
    loop: data.loop ?? false,
    playOnAwake: data.playOnAwake ?? false,
    spatial: data.spatial ?? true,
    minDistance: data.minDistance ?? 1,
    maxDistance: data.maxDistance ?? 100,
  }),
});

registerComponentSerializer('Script', {
  serialize: (component: any) => ({
    scriptId: component.scriptId,
    properties: component.properties,
  }),
  deserialize: (data) => ({
    scriptId: data.scriptId,
    properties: data.properties || {},
  }),
});

registerComponentSerializer('ParticleSystem', {
  serialize: (component: any) => ({
    presetName: component.presetName,
    emissionRate: component.emissionRate,
    maxParticles: component.maxParticles,
    lifetime: component.lifetime,
    startColor: component.startColor,
    endColor: component.endColor,
    startSize: component.startSize,
    endSize: component.endSize,
  }),
  deserialize: (data) => ({
    presetName: data.presetName,
    emissionRate: data.emissionRate ?? 100,
    maxParticles: data.maxParticles ?? 1000,
    lifetime: data.lifetime ?? { min: 1, max: 3 },
    startColor: data.startColor,
    endColor: data.endColor,
    startSize: data.startSize ?? { min: 1, max: 2 },
    endSize: data.endSize ?? { min: 0.5, max: 1 },
  }),
});

registerComponentSerializer('Animator', {
  serialize: (component: any) => ({
    controllerPath: component.controllerPath,
    parameters: component.parameters,
    rootMotion: component.rootMotion,
  }),
  deserialize: (data) => ({
    controllerPath: data.controllerPath,
    parameters: data.parameters || {},
    rootMotion: data.rootMotion ?? false,
  }),
});

registerComponentSerializer('NavMeshAgent', {
  serialize: (component: any) => ({
    speed: component.speed,
    angularSpeed: component.angularSpeed,
    acceleration: component.acceleration,
    stoppingDistance: component.stoppingDistance,
    radius: component.radius,
    height: component.height,
    avoidancePriority: component.avoidancePriority,
  }),
  deserialize: (data) => ({
    speed: data.speed ?? 3.5,
    angularSpeed: data.angularSpeed ?? 120,
    acceleration: data.acceleration ?? 8,
    stoppingDistance: data.stoppingDistance ?? 0.1,
    radius: data.radius ?? 0.5,
    height: data.height ?? 2,
    avoidancePriority: data.avoidancePriority ?? 50,
  }),
});

// ============================================================================
// LEVEL SERIALIZER
// ============================================================================

export class LevelSerializer {
  private static FORMAT_VERSION = '1.0.0';
  
  static serializeEntity(entity: any): SerializedEntity {
    const components: SerializedComponent[] = [];
    
    if (entity.components) {
      for (const [type, component] of Object.entries(entity.components)) {
        const serializer = componentSerializers.get(type);
        const data = serializer 
          ? serializer.serialize(component)
          : component as Record<string, unknown>;
        
        components.push({ type, data });
      }
    }
    
    return {
      id: entity.id || this.generateId(),
      name: entity.name || 'Entity',
      parentId: entity.parentId || null,
      transform: this.serializeTransform(entity.transform || entity),
      components,
      tags: entity.tags || [],
      layer: entity.layer ?? 0,
      active: entity.active ?? true,
      prefabId: entity.prefabId,
      prefabInstanceId: entity.prefabInstanceId,
    };
  }
  
  static deserializeEntity(data: SerializedEntity): any {
    const entity: any = {
      id: data.id,
      name: data.name,
      parentId: data.parentId,
      tags: data.tags,
      layer: data.layer,
      active: data.active,
      prefabId: data.prefabId,
      prefabInstanceId: data.prefabInstanceId,
      components: {},
    };
    
    // Deserialize transform
    const transform = this.deserializeTransform(data.transform);
    entity.position = transform.position;
    entity.rotation = transform.rotation;
    entity.scale = transform.scale;
    
    // Deserialize components
    for (const comp of data.components) {
      const serializer = componentSerializers.get(comp.type);
      entity.components[comp.type] = serializer 
        ? serializer.deserialize(comp.data)
        : comp.data;
    }
    
    return entity;
  }
  
  static serializeTransform(obj: any): SerializedTransform {
    const position = obj.position || { x: 0, y: 0, z: 0 };
    const rotation = obj.rotation || obj.quaternion || { x: 0, y: 0, z: 0, w: 1 };
    const scale = obj.scale || { x: 1, y: 1, z: 1 };
    
    return {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w ?? 1 },
      scale: { x: scale.x, y: scale.y, z: scale.z },
    };
  }
  
  static deserializeTransform(data: SerializedTransform): {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    scale: THREE.Vector3;
  } {
    return {
      position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
      rotation: new THREE.Quaternion(data.rotation.x, data.rotation.y, data.rotation.z, data.rotation.w),
      scale: new THREE.Vector3(data.scale.x, data.scale.y, data.scale.z),
    };
  }
  
  static serializePrefab(prefab: any): SerializedPrefab {
    const entities = prefab.entities.map((e: any) => this.serializeEntity(e));
    
    return {
      id: prefab.id || this.generateId(),
      name: prefab.name || 'Prefab',
      entities,
      rootEntityId: prefab.rootEntityId || entities[0]?.id,
    };
  }
  
  static deserializePrefab(data: SerializedPrefab): any {
    return {
      id: data.id,
      name: data.name,
      entities: data.entities.map(e => this.deserializeEntity(e)),
      rootEntityId: data.rootEntityId,
    };
  }
  
  static serializeLevel(level: any): SerializedLevel {
    const now = new Date().toISOString();
    
    return {
      formatVersion: this.FORMAT_VERSION,
      metadata: {
        name: level.name || 'Untitled Level',
        description: level.description || '',
        author: level.author || 'Unknown',
        createdAt: level.createdAt || now,
        modifiedAt: now,
        version: level.version || '1.0.0',
        thumbnail: level.thumbnail,
        tags: level.tags || [],
      },
      assets: level.assets || [],
      entities: (level.entities || []).map((e: any) => this.serializeEntity(e)),
      prefabs: (level.prefabs || []).map((p: any) => this.serializePrefab(p)),
      settings: level.settings || this.getDefaultSettings(),
    };
  }
  
  static deserializeLevel(data: SerializedLevel): any {
    // Version migration if needed
    if (data.formatVersion !== this.FORMAT_VERSION) {
      data = this.migrateLevel(data);
    }
    
    return {
      name: data.metadata.name,
      description: data.metadata.description,
      author: data.metadata.author,
      createdAt: data.metadata.createdAt,
      modifiedAt: data.metadata.modifiedAt,
      version: data.metadata.version,
      thumbnail: data.metadata.thumbnail,
      tags: data.metadata.tags,
      assets: data.assets,
      entities: data.entities.map(e => this.deserializeEntity(e)),
      prefabs: data.prefabs.map(p => this.deserializePrefab(p)),
      settings: data.settings,
    };
  }
  
  static getDefaultSettings(): LevelSettings {
    return {
      skybox: {
        type: 'color',
        color: '#87CEEB',
      },
      lighting: {
        ambientColor: '#404040',
        ambientIntensity: 0.5,
        shadowsEnabled: true,
        shadowQuality: 'medium',
      },
      physics: {
        gravity: { x: 0, y: -9.81, z: 0 },
        fixedTimestep: 0.02,
        maxSubSteps: 3,
      },
      audio: {
        masterVolume: 1,
        dopplerFactor: 1,
        speedOfSound: 343,
      },
      fog: {
        enabled: false,
        type: 'linear',
        color: '#CCCCCC',
        near: 10,
        far: 100,
      },
      postProcessing: {
        enabled: false,
      },
    };
  }
  
  private static migrateLevel(data: SerializedLevel): SerializedLevel {
    // Add migration logic for older versions here
    console.log(`Migrating level from version ${data.formatVersion} to ${this.FORMAT_VERSION}`);
    data.formatVersion = this.FORMAT_VERSION;
    return data;
  }
  
  static generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// COMPRESSION
// ============================================================================

export class LevelCompression {
  static compress(data: string): Uint8Array {
    const textEncoder = new TextEncoder();
    const inputData = textEncoder.encode(data);
    return pako.deflate(inputData, { level: 9 });
  }
  
  static decompress(data: Uint8Array): string {
    const decompressed = pako.inflate(data);
    const textDecoder = new TextDecoder();
    return textDecoder.decode(decompressed);
  }
  
  static compressLevel(level: SerializedLevel): Uint8Array {
    const json = JSON.stringify(level);
    return this.compress(json);
  }
  
  static decompressLevel(data: Uint8Array): SerializedLevel {
    const json = this.decompress(data);
    return JSON.parse(json);
  }
}

// ============================================================================
// FILE FORMAT
// ============================================================================

export class LevelFileFormat {
  private static MAGIC = new Uint8Array([0x41, 0x45, 0x4C, 0x56]); // "AELV"
  private static VERSION = 1;
  
  static async save(level: SerializedLevel): Promise<Blob> {
    // Compress level data
    const compressed = LevelCompression.compressLevel(level);
    
    // Create file header
    const headerSize = 16;
    const totalSize = headerSize + compressed.length;
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);
    
    // Write magic number
    uint8.set(this.MAGIC, 0);
    
    // Write version
    view.setUint32(4, this.VERSION, true);
    
    // Write compressed data size
    view.setUint32(8, compressed.length, true);
    
    // Write uncompressed data size (for validation)
    const json = JSON.stringify(level);
    view.setUint32(12, json.length, true);
    
    // Write compressed data
    uint8.set(compressed, headerSize);
    
    return new Blob([buffer], { type: 'application/x-aethel-level' });
  }
  
  static async load(blob: Blob): Promise<SerializedLevel> {
    const buffer = await blob.arrayBuffer();
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);
    
    // Verify magic number
    const magic = uint8.slice(0, 4);
    if (!this.arrayEquals(magic, this.MAGIC)) {
      throw new Error('Invalid level file format');
    }
    
    // Read version
    const version = view.getUint32(4, true);
    if (version > this.VERSION) {
      throw new Error(`Level file version ${version} is not supported`);
    }
    
    // Read sizes
    const compressedSize = view.getUint32(8, true);
    // const uncompressedSize = view.getUint32(12, true);
    
    // Read compressed data
    const compressed = uint8.slice(16, 16 + compressedSize);
    
    // Decompress and parse
    return LevelCompression.decompressLevel(compressed);
  }
  
  private static arrayEquals(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
}

// ============================================================================
// LEVEL MANAGER
// ============================================================================

export class LevelManager {
  private currentLevel: any = null;
  private prefabLibrary: Map<string, any> = new Map();
  private assetCache: Map<string, any> = new Map();
  private onEntityCreated?: (entity: any) => void;
  private onEntityDestroyed?: (id: string) => void;
  
  constructor() {}
  
  setCallbacks(callbacks: {
    onEntityCreated?: (entity: any) => void;
    onEntityDestroyed?: (id: string) => void;
  }): void {
    this.onEntityCreated = callbacks.onEntityCreated;
    this.onEntityDestroyed = callbacks.onEntityDestroyed;
  }
  
  async newLevel(name: string = 'New Level'): Promise<any> {
    this.currentLevel = {
      name,
      description: '',
      author: '',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      version: '1.0.0',
      tags: [],
      assets: [],
      entities: [],
      prefabs: [],
      settings: LevelSerializer.getDefaultSettings(),
    };
    
    return this.currentLevel;
  }
  
  getCurrentLevel(): any {
    return this.currentLevel;
  }
  
  async saveLevel(filename?: string): Promise<Blob> {
    if (!this.currentLevel) {
      throw new Error('No level loaded');
    }
    
    const serialized = LevelSerializer.serializeLevel(this.currentLevel);
    return LevelFileFormat.save(serialized);
  }
  
  async loadLevel(blob: Blob): Promise<any> {
    const serialized = await LevelFileFormat.load(blob);
    this.currentLevel = LevelSerializer.deserializeLevel(serialized);
    
    // Load prefabs into library
    for (const prefab of this.currentLevel.prefabs) {
      this.prefabLibrary.set(prefab.id, prefab);
    }
    
    // Notify about created entities
    if (this.onEntityCreated) {
      for (const entity of this.currentLevel.entities) {
        this.onEntityCreated(entity);
      }
    }
    
    return this.currentLevel;
  }
  
  async exportToJSON(): Promise<string> {
    if (!this.currentLevel) {
      throw new Error('No level loaded');
    }
    
    const serialized = LevelSerializer.serializeLevel(this.currentLevel);
    return JSON.stringify(serialized, null, 2);
  }
  
  async importFromJSON(json: string): Promise<any> {
    const serialized = JSON.parse(json) as SerializedLevel;
    this.currentLevel = LevelSerializer.deserializeLevel(serialized);
    return this.currentLevel;
  }
  
  // Entity management
  
  addEntity(entity: any): string {
    if (!this.currentLevel) {
      throw new Error('No level loaded');
    }
    
    entity.id = entity.id || LevelSerializer.generateId();
    this.currentLevel.entities.push(entity);
    
    if (this.onEntityCreated) {
      this.onEntityCreated(entity);
    }
    
    return entity.id;
  }
  
  removeEntity(id: string): boolean {
    if (!this.currentLevel) return false;
    
    const index = this.currentLevel.entities.findIndex((e: any) => e.id === id);
    if (index === -1) return false;
    
    // Remove children first
    const children = this.currentLevel.entities.filter((e: any) => e.parentId === id);
    for (const child of children) {
      this.removeEntity(child.id);
    }
    
    this.currentLevel.entities.splice(index, 1);
    
    if (this.onEntityDestroyed) {
      this.onEntityDestroyed(id);
    }
    
    return true;
  }
  
  getEntity(id: string): any | null {
    if (!this.currentLevel) return null;
    return this.currentLevel.entities.find((e: any) => e.id === id) || null;
  }
  
  findEntitiesByTag(tag: string): any[] {
    if (!this.currentLevel) return [];
    return this.currentLevel.entities.filter((e: any) => e.tags?.includes(tag));
  }
  
  findEntitiesByName(name: string): any[] {
    if (!this.currentLevel) return [];
    return this.currentLevel.entities.filter((e: any) => e.name === name);
  }
  
  findEntitiesByComponent(componentType: string): any[] {
    if (!this.currentLevel) return [];
    return this.currentLevel.entities.filter((e: any) => 
      e.components && componentType in e.components
    );
  }
  
  // Prefab management
  
  createPrefab(entityId: string, name: string): string {
    if (!this.currentLevel) {
      throw new Error('No level loaded');
    }
    
    const entity = this.getEntity(entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }
    
    // Collect entity and all children
    const collectChildren = (id: string): any[] => {
      const entities: any[] = [];
      const e = this.getEntity(id);
      if (e) {
        entities.push({ ...e });
        const children = this.currentLevel.entities.filter((c: any) => c.parentId === id);
        for (const child of children) {
          entities.push(...collectChildren(child.id));
        }
      }
      return entities;
    };
    
    const entities = collectChildren(entityId);
    
    const prefab: any = {
      id: LevelSerializer.generateId(),
      name,
      entities,
      rootEntityId: entityId,
    };
    
    this.currentLevel.prefabs.push(prefab);
    this.prefabLibrary.set(prefab.id, prefab);
    
    return prefab.id;
  }
  
  instantiatePrefab(prefabId: string, position?: THREE.Vector3, rotation?: THREE.Quaternion): string[] {
    const prefab = this.prefabLibrary.get(prefabId);
    if (!prefab) {
      throw new Error('Prefab not found');
    }
    
    const instanceId = LevelSerializer.generateId();
    const idMapping = new Map<string, string>();
    const createdIds: string[] = [];
    
    // Create new IDs for all entities
    for (const entity of prefab.entities) {
      idMapping.set(entity.id, LevelSerializer.generateId());
    }
    
    // Instantiate entities
    for (const entity of prefab.entities) {
      const newEntity = JSON.parse(JSON.stringify(entity));
      newEntity.id = idMapping.get(entity.id)!;
      newEntity.prefabId = prefabId;
      newEntity.prefabInstanceId = instanceId;
      
      // Update parent reference
      if (newEntity.parentId && idMapping.has(newEntity.parentId)) {
        newEntity.parentId = idMapping.get(newEntity.parentId);
      } else {
        newEntity.parentId = null;
      }
      
      // Apply transform offset to root entity
      if (entity.id === prefab.rootEntityId) {
        if (position) {
          newEntity.position = { x: position.x, y: position.y, z: position.z };
        }
        if (rotation) {
          newEntity.rotation = { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w };
        }
      }
      
      this.addEntity(newEntity);
      createdIds.push(newEntity.id);
    }
    
    return createdIds;
  }
  
  getPrefab(id: string): any | null {
    return this.prefabLibrary.get(id) || null;
  }
  
  getAllPrefabs(): any[] {
    return Array.from(this.prefabLibrary.values());
  }
  
  // Asset management
  
  registerAsset(asset: SerializedAssetRef): void {
    if (!this.currentLevel) return;
    
    const existing = this.currentLevel.assets.find((a: any) => a.id === asset.id);
    if (!existing) {
      this.currentLevel.assets.push(asset);
    }
  }
  
  getAsset(id: string): SerializedAssetRef | null {
    if (!this.currentLevel) return null;
    return this.currentLevel.assets.find((a: any) => a.id === id) || null;
  }
  
  cacheAsset(id: string, data: any): void {
    this.assetCache.set(id, data);
  }
  
  getCachedAsset(id: string): any | null {
    return this.assetCache.get(id) || null;
  }
  
  // Level settings
  
  getSettings(): LevelSettings | null {
    return this.currentLevel?.settings || null;
  }
  
  updateSettings(settings: Partial<LevelSettings>): void {
    if (!this.currentLevel) return;
    this.currentLevel.settings = { ...this.currentLevel.settings, ...settings };
  }
  
  // Utility
  
  clear(): void {
    if (!this.currentLevel) return;
    
    // Notify about destroyed entities
    if (this.onEntityDestroyed) {
      for (const entity of this.currentLevel.entities) {
        this.onEntityDestroyed(entity.id);
      }
    }
    
    this.currentLevel.entities = [];
    this.assetCache.clear();
  }
  
  clone(): any {
    if (!this.currentLevel) return null;
    return JSON.parse(JSON.stringify(this.currentLevel));
  }
}

// ============================================================================
// UNDO/REDO SYSTEM
// ============================================================================

export interface LevelCommand {
  execute(): void;
  undo(): void;
  description: string;
}

export class LevelHistory {
  private undoStack: LevelCommand[] = [];
  private redoStack: LevelCommand[] = [];
  private maxHistory: number = 100;
  
  execute(command: LevelCommand): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
    
    // Limit history size
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
  }
  
  undo(): boolean {
    const command = this.undoStack.pop();
    if (!command) return false;
    
    command.undo();
    this.redoStack.push(command);
    return true;
  }
  
  redo(): boolean {
    const command = this.redoStack.pop();
    if (!command) return false;
    
    command.execute();
    this.undoStack.push(command);
    return true;
  }
  
  canUndo(): boolean {
    return this.undoStack.length > 0;
  }
  
  canRedo(): boolean {
    return this.redoStack.length > 0;
  }
  
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
  
  getUndoHistory(): string[] {
    return this.undoStack.map(c => c.description);
  }
  
  getRedoHistory(): string[] {
    return this.redoStack.map(c => c.description);
  }
}

// Built-in commands

export class AddEntityCommand implements LevelCommand {
  description: string;
  private manager: LevelManager;
  private entity: any;
  private id: string = '';
  
  constructor(manager: LevelManager, entity: any) {
    this.manager = manager;
    this.entity = entity;
    this.description = `Add entity: ${entity.name || 'Entity'}`;
  }
  
  execute(): void {
    this.id = this.manager.addEntity(this.entity);
  }
  
  undo(): void {
    this.manager.removeEntity(this.id);
  }
}

export class RemoveEntityCommand implements LevelCommand {
  description: string;
  private manager: LevelManager;
  private entityId: string;
  private entityData: any = null;
  private childrenData: any[] = [];
  
  constructor(manager: LevelManager, entityId: string) {
    this.manager = manager;
    this.entityId = entityId;
    this.description = `Remove entity`;
  }
  
  execute(): void {
    // Store entity data for undo
    this.entityData = this.manager.getEntity(this.entityId);
    
    // Store children data
    const level = this.manager.getCurrentLevel();
    if (level) {
      this.childrenData = level.entities.filter((e: any) => e.parentId === this.entityId);
    }
    
    this.manager.removeEntity(this.entityId);
  }
  
  undo(): void {
    if (this.entityData) {
      this.manager.addEntity({ ...this.entityData });
      
      for (const child of this.childrenData) {
        this.manager.addEntity({ ...child });
      }
    }
  }
}

export class ModifyEntityCommand implements LevelCommand {
  description: string;
  private manager: LevelManager;
  private entityId: string;
  private newData: Partial<any>;
  private oldData: Partial<any> = {};
  
  constructor(manager: LevelManager, entityId: string, newData: Partial<any>) {
    this.manager = manager;
    this.entityId = entityId;
    this.newData = newData;
    this.description = `Modify entity`;
  }
  
  execute(): void {
    const entity = this.manager.getEntity(this.entityId);
    if (!entity) return;
    
    // Store old values
    for (const key of Object.keys(this.newData)) {
      this.oldData[key] = JSON.parse(JSON.stringify(entity[key]));
    }
    
    // Apply new values
    Object.assign(entity, JSON.parse(JSON.stringify(this.newData)));
  }
  
  undo(): void {
    const entity = this.manager.getEntity(this.entityId);
    if (!entity) return;
    
    Object.assign(entity, JSON.parse(JSON.stringify(this.oldData)));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createLevelManager(): LevelManager {
  return new LevelManager();
}

export function createLevelHistory(): LevelHistory {
  return new LevelHistory();
}

export async function saveLevel(level: any): Promise<Blob> {
  const serialized = LevelSerializer.serializeLevel(level);
  return LevelFileFormat.save(serialized);
}

export async function loadLevel(blob: Blob): Promise<any> {
  const serialized = await LevelFileFormat.load(blob);
  return LevelSerializer.deserializeLevel(serialized);
}
