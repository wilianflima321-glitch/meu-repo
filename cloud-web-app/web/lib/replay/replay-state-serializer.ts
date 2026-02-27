import type { EntitySnapshot, StateSnapshot } from './replay-types';

export class StateSerializer {
  private entitySerializers: Map<string, (entity: unknown) => unknown> = new Map();

  registerSerializer(type: string, serializer: (entity: unknown) => unknown): void {
    this.entitySerializers.set(type, serializer);
  }

  serializeState(world: { entities: Map<string, unknown>; globals?: Map<string, unknown> }): StateSnapshot {
    const entities: EntitySnapshot[] = [];

    for (const [id, entity] of world.entities) {
      entities.push(this.serializeEntity(id, entity));
    }

    return {
      entities,
      globals: new Map(world.globals || []),
      random: Math.random(),
    };
  }

  private serializeEntity(id: string, entity: unknown): EntitySnapshot {
    const type = (entity as { type?: string }).type || 'unknown';
    const components = new Map<string, unknown>();

    const serializer = this.entitySerializers.get(type);
    if (serializer) {
      const data = serializer(entity);
      if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          components.set(key, this.deepClone(value));
        }
      }
    } else {
      if (typeof entity === 'object' && entity !== null) {
        for (const [key, value] of Object.entries(entity)) {
          if (this.isSerializable(value)) {
            components.set(key, this.deepClone(value));
          }
        }
      }
    }

    return {
      id,
      type,
      components,
    };
  }

  deserializeState(snapshot: StateSnapshot): Map<string, unknown> {
    const entities = new Map<string, unknown>();

    for (const entitySnapshot of snapshot.entities) {
      entities.set(entitySnapshot.id, {
        id: entitySnapshot.id,
        type: entitySnapshot.type,
        ...Object.fromEntries(entitySnapshot.components),
      });
    }

    return entities;
  }

  private isSerializable(value: unknown): boolean {
    if (value === null || value === undefined) return true;
    if (typeof value === 'function') return false;
    if (typeof value === 'symbol') return false;
    return true;
  }

  private deepClone<T>(value: T): T {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;

    if (Array.isArray(value)) {
      return value.map(v => this.deepClone(v)) as unknown as T;
    }

    if (value instanceof Map) {
      return new Map(Array.from(value.entries()).map(([k, v]) => [k, this.deepClone(v)])) as unknown as T;
    }

    if (value instanceof Set) {
      return new Set(Array.from(value).map(v => this.deepClone(v))) as unknown as T;
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      result[key] = this.deepClone(val);
    }
    return result as T;
  }
}
