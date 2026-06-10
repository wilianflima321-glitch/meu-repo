import type { Archetype, ComponentType, Entity, Query } from './ecs-dots-contracts';
import { ComponentRegistry } from './ecs-dots-registry';

export class ArchetypeStorage {
  private archetypes: Map<string, Archetype> = new Map();
  private entityToArchetype: Map<Entity, Archetype> = new Map();
  private entityToIndex: Map<Entity, number> = new Map();
  private nextArchetypeId: number = 0;

  private registry: ComponentRegistry;
  private defaultCapacity: number;

  constructor(registry: ComponentRegistry, defaultCapacity: number = 1024) {
    this.registry = registry;
    this.defaultCapacity = defaultCapacity;
  }

  /**
   * Obtém ou cria archetype para conjunto de componentes
   */
  getOrCreateArchetype(componentTypes: ComponentType[]): Archetype {
    const key = this.getArchetypeKey(componentTypes);

    if (this.archetypes.has(key)) {
      return this.archetypes.get(key)!;
    }

    // Criar novo archetype
    const archetype: Archetype = {
      id: this.nextArchetypeId++,
      componentTypes: new Set(componentTypes),
      componentArrays: new Map(),
      entityIds: [],
      entityCount: 0,
      capacity: this.defaultCapacity,
    };

    // Alocar arrays para cada componente
    for (const type of componentTypes) {
      const schema = this.registry.getSchema(type);
      if (schema) {
        const buffer = new ArrayBuffer(schema.size * this.defaultCapacity);
        archetype.componentArrays.set(type, buffer);
      }
    }

    this.archetypes.set(key, archetype);
    return archetype;
  }

  private getArchetypeKey(componentTypes: ComponentType[]): string {
    return [...componentTypes].sort((a, b) => a - b).join(',');
  }

  /**
   * Adiciona entidade ao archetype
   */
  addEntity(entity: Entity, archetype: Archetype): number {
    // Verificar capacidade
    if (archetype.entityCount >= archetype.capacity) {
      this.growArchetype(archetype);
    }

    const index = archetype.entityCount++;
    archetype.entityIds[index] = entity;

    this.entityToArchetype.set(entity, archetype);
    this.entityToIndex.set(entity, index);

    return index;
  }

  /**
   * Remove entidade do archetype
   */
  removeEntity(entity: Entity): boolean {
    const archetype = this.entityToArchetype.get(entity);
    if (!archetype) return false;

    const index = this.entityToIndex.get(entity)!;
    const lastIndex = --archetype.entityCount;

    // Swap-remove
    if (index !== lastIndex) {
      const lastEntity = archetype.entityIds[lastIndex];
      archetype.entityIds[index] = lastEntity;
      this.entityToIndex.set(lastEntity, index);

      // Copiar dados do último para a posição removida
      for (const [type, buffer] of archetype.componentArrays) {
        const schema = this.registry.getSchema(type)!;
        const src = new Uint8Array(buffer, lastIndex * schema.size, schema.size);
        const dst = new Uint8Array(buffer, index * schema.size, schema.size);
        dst.set(src);
      }
    }

    this.entityToArchetype.delete(entity);
    this.entityToIndex.delete(entity);

    return true;
  }

  /**
   * Move entidade para novo archetype (ao adicionar/remover componentes)
   */
  moveEntity(entity: Entity, newComponentTypes: ComponentType[]): Archetype {
    const oldArchetype = this.entityToArchetype.get(entity);
    const oldIndex = this.entityToIndex.get(entity);

    const newArchetype = this.getOrCreateArchetype(newComponentTypes);
    const newIndex = this.addEntity(entity, newArchetype);

    // Copiar componentes que existem em ambos
    if (oldArchetype && oldIndex !== undefined) {
      for (const type of newArchetype.componentTypes) {
        if (oldArchetype.componentTypes.has(type)) {
          const schema = this.registry.getSchema(type)!;
          const srcBuffer = oldArchetype.componentArrays.get(type)!;
          const dstBuffer = newArchetype.componentArrays.get(type)!;

          const src = new Uint8Array(srcBuffer, oldIndex * schema.size, schema.size);
          const dst = new Uint8Array(dstBuffer, newIndex * schema.size, schema.size);
          dst.set(src);
        }
      }

      // Remover do archetype antigo
      this.removeEntityFromArchetype(entity, oldArchetype, oldIndex);
    }

    return newArchetype;
  }

  private removeEntityFromArchetype(entity: Entity, archetype: Archetype, index: number): void {
    const lastIndex = --archetype.entityCount;

    if (index !== lastIndex) {
      const lastEntity = archetype.entityIds[lastIndex];
      archetype.entityIds[index] = lastEntity;
      this.entityToIndex.set(lastEntity, index);

      for (const [type, buffer] of archetype.componentArrays) {
        const schema = this.registry.getSchema(type)!;
        const src = new Uint8Array(buffer, lastIndex * schema.size, schema.size);
        const dst = new Uint8Array(buffer, index * schema.size, schema.size);
        dst.set(src);
      }
    }
  }

  private growArchetype(archetype: Archetype): void {
    const newCapacity = archetype.capacity * 2;

    for (const [type, oldBuffer] of archetype.componentArrays) {
      const schema = this.registry.getSchema(type)!;
      const newBuffer = new ArrayBuffer(schema.size * newCapacity);
      new Uint8Array(newBuffer).set(new Uint8Array(oldBuffer));
      archetype.componentArrays.set(type, newBuffer);
    }

    archetype.capacity = newCapacity;
  }

  getEntityArchetype(entity: Entity): Archetype | undefined {
    return this.entityToArchetype.get(entity);
  }

  getEntityIndex(entity: Entity): number | undefined {
    return this.entityToIndex.get(entity);
  }

  getAllArchetypes(): Archetype[] {
    return Array.from(this.archetypes.values());
  }

  /**
   * Query archetypes que correspondem aos critérios
   */
  queryArchetypes(query: Query): Archetype[] {
    const results: Archetype[] = [];

    for (const archetype of this.archetypes.values()) {
      if (this.archetypeMatchesQuery(archetype, query)) {
        results.push(archetype);
      }
    }

    return results;
  }

  private archetypeMatchesQuery(archetype: Archetype, query: Query): boolean {
    // All - deve ter todos
    if (query.all) {
      for (const type of query.all) {
        if (!archetype.componentTypes.has(type)) return false;
      }
    }

    // Any - deve ter pelo menos um
    if (query.any && query.any.length > 0) {
      let hasAny = false;
      for (const type of query.any) {
        if (archetype.componentTypes.has(type)) {
          hasAny = true;
          break;
        }
      }
      if (!hasAny) return false;
    }

    // None - não deve ter nenhum
    if (query.none) {
      for (const type of query.none) {
        if (archetype.componentTypes.has(type)) return false;
      }
    }

    return true;
  }
}

