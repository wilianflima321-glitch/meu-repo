import { EventEmitter } from 'events';
import { ComponentRegistry } from './component-registry';
import { type Component, type ComponentData, type ComponentType, type Entity, type EntityId } from './types';

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
      logger.warn(`Entity already has component: ${component.type}`);
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
