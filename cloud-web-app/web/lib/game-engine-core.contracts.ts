// @aethel-heavy-async-boundary Studio/engine ECS contracts; keep runtime imports behind engine boundaries.import type * as THREE from 'three';

export type EntityId = string;
export type ComponentType = string;

/**
 * Entidade - Apenas um ID que agrupa componentes
 */
export interface Entity {
  id: EntityId;
  name: string;
  active: boolean;
  tags: Set<string>;
  parent?: EntityId;
  children: EntityId[];
}

/**
 * Componente - Dados puros, sem lógica
 */
export interface Component {
  type: ComponentType;
  entityId: EntityId;
}

/**
 * Sistema - Lógica que opera em componentes
 */
export interface System {
  name: string;
  requiredComponents: ComponentType[];
  priority: number; // Menor = executa primeiro
  update(entities: Entity[], deltaTime: number): void;
  onEntityAdded?(entity: Entity): void;
  onEntityRemoved?(entity: Entity): void;
}

// ============================================================================
// COMPONENTES BUILT-IN
// ============================================================================

export interface TransformComponent extends Component {
  type: 'transform';
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  localPosition: THREE.Vector3;
  localRotation: THREE.Euler;
  localScale: THREE.Vector3;
}

export interface MeshComponent extends Component {
  type: 'mesh';
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
  castShadow: boolean;
  receiveShadow: boolean;
}

export interface RigidbodyComponent extends Component {
  type: 'rigidbody';
  mass: number;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  drag: number;
  angularDrag: number;
  useGravity: boolean;
  isKinematic: boolean;
  constraints: {
    freezePositionX: boolean;
    freezePositionY: boolean;
    freezePositionZ: boolean;
    freezeRotationX: boolean;
    freezeRotationY: boolean;
    freezeRotationZ: boolean;
  };
}

export interface ColliderComponent extends Component {
  type: 'collider';
  shape: 'box' | 'sphere' | 'capsule' | 'mesh';
  size: THREE.Vector3;
  center: THREE.Vector3;
  isTrigger: boolean;
  physicMaterial?: {
    friction: number;
    bounciness: number;
  };
}

export interface CameraComponent extends Component {
  type: 'camera';
  fov: number;
  near: number;
  far: number;
  isMain: boolean;
  clearColor?: number;
}

export interface LightComponent extends Component {
  type: 'light';
  lightType: 'directional' | 'point' | 'spot' | 'ambient';
  color: number;
  intensity: number;
  castShadow: boolean;
  shadowMapSize: number;
  // Spot/Point specific
  range?: number;
  // Spot specific
  angle?: number;
  penumbra?: number;
}

export interface AudioSourceComponent extends Component {
  type: 'audioSource';
  clip?: string;
  volume: number;
  pitch: number;
  loop: boolean;
  playOnAwake: boolean;
  spatialBlend: number; // 0 = 2D, 1 = 3D
  minDistance: number;
  maxDistance: number;
}

export interface AnimatorComponent extends Component {
  type: 'animator';
  clips: Map<string, THREE.AnimationClip>;
  currentClip?: string;
  speed: number;
  mixer?: THREE.AnimationMixer;
}

export interface SpriteComponent extends Component {
  type: 'sprite';
  texture: string;
  color: number;
  flipX: boolean;
  flipY: boolean;
  pixelsPerUnit: number;
}

export interface UIComponent extends Component {
  type: 'ui';
  uiType: 'text' | 'image' | 'button' | 'panel' | 'slider';
  text?: string;
  fontSize?: number;
  color?: number;
  onClick?: () => void;
}

export interface ParticleSystemComponent extends Component {
  type: 'particleSystem';
  maxParticles: number;
  emissionRate: number;
  lifetime: { min: number; max: number };
  startSpeed: { min: number; max: number };
  startSize: { min: number; max: number };
  startColor: { min: number; max: number };
  gravity: number;
  texture?: string;
  shape: 'sphere' | 'cone' | 'box';
}

export interface CollisionContact {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  impulse: number;
}

// ============================================================================
// PREFAB SYSTEM
// ============================================================================

export type PrefabComponent = Omit<Component, 'entityId'> & Record<string, unknown>;

export interface Prefab {
  name: string;
  components: PrefabComponent[];
  children?: Prefab[];
}
