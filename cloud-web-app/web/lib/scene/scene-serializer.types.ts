export interface Vector3Serialized {
  x: number;
  y: number;
  z: number;
}

export interface QuaternionSerialized {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface EulerSerialized {
  x: number;
  y: number;
  z: number;
  order: string;
}

export interface ColorSerialized {
  r: number;
  g: number;
  b: number;
}

export interface TransformSerialized {
  position: Vector3Serialized;
  rotation: EulerSerialized;
  scale: Vector3Serialized;
}

export interface MaterialSerialized {
  type: 'standard' | 'basic' | 'phong' | 'lambert' | 'physical' | 'toon';
  color: ColorSerialized;
  opacity: number;
  transparent: boolean;
  metalness?: number;
  roughness?: number;
  emissive?: ColorSerialized;
  emissiveIntensity?: number;
  map?: string; // Texture URI
  normalMap?: string;
  roughnessMap?: string;
  metalnessMap?: string;
  aoMap?: string;
  envMapIntensity?: number;
  wireframe?: boolean;
  side?: 'front' | 'back' | 'double';
  flatShading?: boolean;
}

export interface GeometrySerialized {
  type: 'box' | 'sphere' | 'cylinder' | 'cone' | 'torus' | 'plane' | 'capsule' | 'custom';
  parameters: Record<string, number>;
  vertices?: number[]; // For custom geometry
  indices?: number[];
  normals?: number[];
  uvs?: number[];
}

export interface MeshSerialized {
  id: string;
  name: string;
  type: 'mesh';
  transform: TransformSerialized;
  geometry: GeometrySerialized;
  material: MaterialSerialized;
  visible: boolean;
  castShadow: boolean;
  receiveShadow: boolean;
  userData: Record<string, unknown>;
  children: SceneObjectSerialized[];
  tags: string[];
  layer: number;
}

export interface LightSerialized {
  id: string;
  name: string;
  type: 'light';
  lightType: 'point' | 'directional' | 'spot' | 'ambient' | 'hemisphere' | 'rectArea';
  transform: TransformSerialized;
  color: ColorSerialized;
  intensity: number;
  visible: boolean;
  castShadow: boolean;
  // Point/Spot specific
  distance?: number;
  decay?: number;
  // Spot specific
  angle?: number;
  penumbra?: number;
  // Hemisphere specific
  groundColor?: ColorSerialized;
  // RectArea specific
  width?: number;
  height?: number;
  // Shadow settings
  shadow?: {
    mapSize: { width: number; height: number };
    bias: number;
    normalBias: number;
    radius: number;
    camera?: {
      near: number;
      far: number;
      left?: number;
      right?: number;
      top?: number;
      bottom?: number;
      fov?: number;
    };
  };
  userData: Record<string, unknown>;
  children: SceneObjectSerialized[];
}

export interface CameraSerialized {
  id: string;
  name: string;
  type: 'camera';
  cameraType: 'perspective' | 'orthographic';
  transform: TransformSerialized;
  // Perspective
  fov?: number;
  aspect?: number;
  // Orthographic
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  // Common
  near: number;
  far: number;
  zoom: number;
  visible: boolean;
  userData: Record<string, unknown>;
  children: SceneObjectSerialized[];
}

export interface GroupSerialized {
  id: string;
  name: string;
  type: 'group';
  transform: TransformSerialized;
  visible: boolean;
  userData: Record<string, unknown>;
  children: SceneObjectSerialized[];
}

export interface EmptySerialized {
  id: string;
  name: string;
  type: 'empty';
  transform: TransformSerialized;
  visible: boolean;
  userData: Record<string, unknown>;
  children: SceneObjectSerialized[];
}

export type SceneObjectSerialized = 
  | MeshSerialized 
  | LightSerialized 
  | CameraSerialized 
  | GroupSerialized 
  | EmptySerialized;

export interface EnvironmentSerialized {
  background: {
    type: 'color' | 'texture' | 'equirectangular' | 'cubemap';
    value: ColorSerialized | string | string[];
  };
  fog?: {
    type: 'linear' | 'exponential';
    color: ColorSerialized;
    near?: number;
    far?: number;
    density?: number;
  };
  ambientLight?: {
    color: ColorSerialized;
    intensity: number;
  };
  hdr?: {
    uri: string;
    exposure: number;
  };
}

export interface PhysicsSettingsSerialized {
  enabled: boolean;
  gravity: Vector3Serialized;
  defaultFriction: number;
  defaultRestitution: number;
  solver: 'sequential' | 'pgs';
  iterations: number;
}

export interface SceneSettingsSerialized {
  name: string;
  renderer: {
    antialias: boolean;
    shadowMap: boolean;
    shadowMapType: 'basic' | 'pcf' | 'pcfSoft' | 'vsm';
    toneMapping: 'none' | 'linear' | 'reinhard' | 'cineon' | 'aces';
    toneMappingExposure: number;
    outputColorSpace: 'srgb' | 'linear';
  };
  postProcessing?: {
    enabled: boolean;
    bloom?: { enabled: boolean; intensity: number; threshold: number; radius: number };
    ssao?: { enabled: boolean; radius: number; intensity: number };
    dof?: { enabled: boolean; focus: number; aperture: number; maxBlur: number };
    vignette?: { enabled: boolean; offset: number; darkness: number };
  };
}

export interface SceneSerialized {
  version: string;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  author?: string;
  description?: string;
  thumbnail?: string;
  settings: SceneSettingsSerialized;
  environment: EnvironmentSerialized;
  physics: PhysicsSettingsSerialized;
  objects: SceneObjectSerialized[];
  activeCamera?: string;
  assets: {
    textures: { id: string; uri: string; name: string }[];
    models: { id: string; uri: string; name: string }[];
    materials: { id: string; name: string; data: MaterialSerialized }[];
  };
  scripts: {
    id: string;
    name: string;
    objectId: string;
    uri: string;
  }[];
}
