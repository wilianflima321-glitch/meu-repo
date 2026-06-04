import { createComponentLogger } from '@/lib/observability/logger';
import { componentSerializers } from './component-serializers';
import type {
  LevelSettings,
  RuntimeEntity,
  RuntimeLevel,
  RuntimePrefab,
  RuntimeTransformSource,
  SerializedComponent,
  SerializedEntity,
  SerializedLevel,
  SerializedPrefab,
  SerializedQuaternion,
  SerializedTransform,
  SerializedVector3,
} from './types';
import { quaternion, toComponentData, vector3 } from './utils';

const log = createComponentLogger('level-serializer');

export class LevelSerializer {
  private static FORMAT_VERSION = '1.0.0';

  static serializeEntity(entity: RuntimeEntity): SerializedEntity {
    const components: SerializedComponent[] = [];

    if (entity.components) {
      for (const [type, component] of Object.entries(entity.components)) {
        const serializer = componentSerializers.get(type);
        const data = serializer
          ? serializer.serialize(toComponentData(component))
          : toComponentData(component);

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

  static deserializeEntity(data: SerializedEntity): RuntimeEntity {
    const entity: RuntimeEntity = {
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
    const components = entity.components ?? (entity.components = {});
    for (const comp of data.components) {
      const serializer = componentSerializers.get(comp.type);
      components[comp.type] = serializer
        ? serializer.deserialize(comp.data)
        : comp.data;
    }

    return entity;
  }

  static serializeTransform(obj: RuntimeTransformSource): SerializedTransform {
    const position = vector3(obj.position, { x: 0, y: 0, z: 0 });
    const rotation = quaternion(obj.rotation || obj.quaternion, { x: 0, y: 0, z: 0, w: 1 });
    const scale = vector3(obj.scale, { x: 1, y: 1, z: 1 });

    return {
      position,
      rotation,
      scale,
    };
  }

  static deserializeTransform(data: SerializedTransform): {
    position: SerializedVector3;
    rotation: SerializedQuaternion;
    scale: SerializedVector3;
  } {
    return {
      position: vector3(data.position, { x: 0, y: 0, z: 0 }),
      rotation: quaternion(data.rotation, { x: 0, y: 0, z: 0, w: 1 }),
      scale: vector3(data.scale, { x: 1, y: 1, z: 1 }),
    };
  }

  static serializePrefab(prefab: RuntimePrefab): SerializedPrefab {
    const entities = prefab.entities.map((e: RuntimeEntity) => this.serializeEntity(e));

    return {
      id: prefab.id || this.generateId(),
      name: prefab.name || 'Prefab',
      entities,
      rootEntityId: prefab.rootEntityId || entities[0]?.id || this.generateId(),
    };
  }

  static deserializePrefab(data: SerializedPrefab): RuntimePrefab {
    return {
      id: data.id,
      name: data.name,
      entities: data.entities.map(e => this.deserializeEntity(e)),
      rootEntityId: data.rootEntityId,
    };
  }

  static serializeLevel(level: RuntimeLevel): SerializedLevel {
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
      entities: (level.entities || []).map((e: RuntimeEntity) => this.serializeEntity(e)),
      prefabs: (level.prefabs || []).map((p: RuntimePrefab) => this.serializePrefab(p)),
      settings: level.settings || this.getDefaultSettings(),
    };
  }

  static deserializeLevel(data: SerializedLevel): RuntimeLevel {
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
    log.info(`Migrating level from version ${data.formatVersion} to ${this.FORMAT_VERSION}`);
    data.formatVersion = this.FORMAT_VERSION;
    return data;
  }

  static generateId(): string {
    return `${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
