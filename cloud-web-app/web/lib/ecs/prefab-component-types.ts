/**
 * Prefab/component shared contracts.
 */

import * as THREE from 'three';

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
