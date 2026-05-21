import { logger } from '@/lib/observability/logger';
import * as THREE from 'three';
import { ComponentRegistry } from './component-registry';
import { EntityManager } from './entity-manager';
import {
  type Component,
  type ComponentData,
  type ComponentType,
  type Entity,
  type PrefabData,
  type SerializedComponent,
  type SerializedEntity,
  type TransformData,
} from './types';
import { EventEmitter } from 'events';

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
      logger.warn(`Prefab not found: ${prefabId}`);
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
      logger.warn(`Prefab not found: ${prefabId}`);
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
      logger.error('Failed to import prefab:', error);
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
