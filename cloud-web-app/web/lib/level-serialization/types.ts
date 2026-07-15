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

export type RuntimeComponentData = Record<string, unknown>;

export interface RuntimeEntity {
  id?: string;
  name?: string;
  parentId?: string | null;
  transform?: RuntimeTransformSource;
  position?: RuntimeVector3;
  rotation?: RuntimeQuaternion;
  quaternion?: RuntimeQuaternion;
  scale?: RuntimeVector3;
  components?: Record<string, unknown>;
  tags?: string[];
  layer?: number;
  active?: boolean;
  prefabId?: string;
  prefabInstanceId?: string;
  [key: string]: unknown;
}

export interface RuntimePrefab {
  id?: string;
  name?: string;
  entities: RuntimeEntity[];
  rootEntityId?: string;
  [key: string]: unknown;
}

export interface RuntimeLevel {
  name?: string;
  description?: string;
  author?: string;
  createdAt?: string;
  modifiedAt?: string;
  version?: string;
  thumbnail?: string;
  tags?: string[];
  assets?: SerializedAssetRef[];
  entities: RuntimeEntity[];
  prefabs: RuntimePrefab[];
  settings?: LevelSettings;
}

export type RuntimeVector3 = Partial<SerializedVector3>;
export type RuntimeQuaternion = Partial<SerializedQuaternion>;
export type RuntimeTransformSource = {
  position?: RuntimeVector3;
  rotation?: RuntimeQuaternion;
  quaternion?: RuntimeQuaternion;
  scale?: RuntimeVector3;
};
