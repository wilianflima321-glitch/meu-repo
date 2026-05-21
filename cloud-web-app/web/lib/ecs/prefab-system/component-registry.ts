import { logger } from '@/lib/observability/logger';
import * as THREE from 'three';
import {
  asNumberArray,
  asRecord,
  type AudioSourceData,
  type CameraData,
  type ColliderData,
  type Component,
  type ComponentData,
  type ComponentDefinition,
  type ComponentType,
  type LightData,
  type MeshRendererData,
  type RigidbodyData,
  type ScriptData,
  type TransformData,
} from './types';

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
      logger.warn(`Component type not registered: ${type}`);
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
      onDeserialize: (serialized) => {
        const data = asRecord(serialized);
        return {
        position: new THREE.Vector3().fromArray(asNumberArray(data.position)),
        rotation: new THREE.Quaternion().fromArray(asNumberArray(data.rotation)),
        scale: new THREE.Vector3().fromArray(asNumberArray(data.scale)),
        localPosition: new THREE.Vector3(),
        localRotation: new THREE.Quaternion(),
        localScale: new THREE.Vector3(1, 1, 1),
      };
      },
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
      onDeserialize: (serialized) => {
        const data = asRecord(serialized);
        return {
          ...data,
          color: new THREE.Color(typeof data.color === 'number' || typeof data.color === 'string' ? data.color : 0xffffff),
        } as LightData;
      },
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
