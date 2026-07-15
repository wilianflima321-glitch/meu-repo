import type * as THREE from 'three';
import type { LevelSettings, RuntimeEntity, RuntimeLevel, RuntimePrefab, SerializedAssetRef, SerializedLevel } from './types';
import { LevelSerializer } from './serializer';
import { LevelFileFormat } from './file-format';
import { cloneData } from './utils';

export class LevelManager {
  private currentLevel: RuntimeLevel | null = null;
  private prefabLibrary: Map<string, RuntimePrefab> = new Map();
  private assetCache: Map<string, unknown> = new Map();
  private onEntityCreated?: (entity: RuntimeEntity) => void;
  private onEntityDestroyed?: (id: string) => void;

  constructor() {}

  setCallbacks(callbacks: {
    onEntityCreated?: (entity: RuntimeEntity) => void;
    onEntityDestroyed?: (id: string) => void;
  }): void {
    this.onEntityCreated = callbacks.onEntityCreated;
    this.onEntityDestroyed = callbacks.onEntityDestroyed;
  }

  async newLevel(name: string = 'New Level'): Promise<RuntimeLevel> {
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

  getCurrentLevel(): RuntimeLevel | null {
    return this.currentLevel;
  }

  async saveLevel(filename?: string): Promise<Blob> {
    if (!this.currentLevel) {
      throw new Error('No level loaded');
    }

    const serialized = LevelSerializer.serializeLevel(this.currentLevel);
    return LevelFileFormat.save(serialized);
  }

  async loadLevel(blob: Blob): Promise<RuntimeLevel> {
    const serialized = await LevelFileFormat.load(blob);
    this.currentLevel = LevelSerializer.deserializeLevel(serialized);

    // Load prefabs into library
    for (const prefab of this.currentLevel.prefabs) {
      if (prefab.id) {
        this.prefabLibrary.set(prefab.id, prefab);
      }
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

  async importFromJSON(json: string): Promise<RuntimeLevel> {
    const serialized = JSON.parse(json) as SerializedLevel;
    this.currentLevel = LevelSerializer.deserializeLevel(serialized);
    return this.currentLevel;
  }

  // Entity management

  addEntity(entity: RuntimeEntity): string {
    if (!this.currentLevel) {
      throw new Error('No level loaded');
    }

    const entityId = entity.id || LevelSerializer.generateId();
    entity.id = entityId;
    this.currentLevel.entities.push(entity);

    if (this.onEntityCreated) {
      this.onEntityCreated(entity);
    }

    return entityId;
  }

  removeEntity(id: string): boolean {
    if (!this.currentLevel) return false;

    const index = this.currentLevel.entities.findIndex((e: RuntimeEntity) => e.id === id);
    if (index === -1) return false;

    // Remove children first
    const children = this.currentLevel.entities.filter((e: RuntimeEntity) => e.parentId === id);
    for (const child of children) {
      if (child.id) {
        this.removeEntity(child.id);
      }
    }

    this.currentLevel.entities.splice(index, 1);

    if (this.onEntityDestroyed) {
      this.onEntityDestroyed(id);
    }

    return true;
  }

  getEntity(id: string): RuntimeEntity | null {
    if (!this.currentLevel) return null;
    return this.currentLevel.entities.find((e: RuntimeEntity) => e.id === id) || null;
  }

  findEntitiesByTag(tag: string): RuntimeEntity[] {
    if (!this.currentLevel) return [];
    return this.currentLevel.entities.filter((e: RuntimeEntity) => e.tags?.includes(tag));
  }

  findEntitiesByName(name: string): RuntimeEntity[] {
    if (!this.currentLevel) return [];
    return this.currentLevel.entities.filter((e: RuntimeEntity) => e.name === name);
  }

  findEntitiesByComponent(componentType: string): RuntimeEntity[] {
    if (!this.currentLevel) return [];
    return this.currentLevel.entities.filter((e: RuntimeEntity) =>
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
    const currentLevel = this.currentLevel;
    const collectChildren = (id: string): RuntimeEntity[] => {
      const entities: RuntimeEntity[] = [];
      const e = this.getEntity(id);
      if (e) {
        entities.push({ ...e });
        const children = currentLevel.entities.filter((c: RuntimeEntity) => c.parentId === id);
        for (const child of children) {
          if (child.id) {
            entities.push(...collectChildren(child.id));
          }
        }
      }
      return entities;
    };

    const entities = collectChildren(entityId);

    const prefabId = LevelSerializer.generateId();
    const prefab: RuntimePrefab = {
      id: prefabId,
      name,
      entities,
      rootEntityId: entityId,
    };

    this.currentLevel.prefabs.push(prefab);
    this.prefabLibrary.set(prefabId, prefab);

    return prefabId;
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
      const sourceId = entity.id || LevelSerializer.generateId();
      entity.id = sourceId;
      idMapping.set(sourceId, LevelSerializer.generateId());
    }

    // Instantiate entities
    for (const entity of prefab.entities) {
      const sourceId = entity.id || LevelSerializer.generateId();
      const newEntity = cloneData(entity);
      newEntity.id = idMapping.get(sourceId) || LevelSerializer.generateId();
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
      if (newEntity.id) {
        createdIds.push(newEntity.id);
      }
    }

    return createdIds;
  }

  getPrefab(id: string): RuntimePrefab | null {
    return this.prefabLibrary.get(id) || null;
  }

  getAllPrefabs(): RuntimePrefab[] {
    return Array.from(this.prefabLibrary.values());
  }

  // Asset management

  registerAsset(asset: SerializedAssetRef): void {
    if (!this.currentLevel) return;

    const assets = this.currentLevel.assets ?? (this.currentLevel.assets = []);
    const existing = assets.find((a: SerializedAssetRef) => a.id === asset.id);
    if (!existing) {
      assets.push(asset);
    }
  }

  getAsset(id: string): SerializedAssetRef | null {
    if (!this.currentLevel) return null;
    return (this.currentLevel.assets ?? []).find((a: SerializedAssetRef) => a.id === id) || null;
  }

  cacheAsset(id: string, data: unknown): void {
    this.assetCache.set(id, data);
  }

  getCachedAsset(id: string): unknown | null {
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
        if (entity.id) {
          this.onEntityDestroyed(entity.id);
        }
      }
    }

    this.currentLevel.entities = [];
    this.assetCache.clear();
  }

  clone(): RuntimeLevel | null {
    if (!this.currentLevel) return null;
    return JSON.parse(JSON.stringify(this.currentLevel));
  }
}
