export type TransformMode = 'translate' | 'rotate' | 'scale';
export type ViewportMode = 'perspective' | 'top' | 'front' | 'right';
export type SnapMode = 'none' | 'grid' | 'vertex';

export interface LevelObject {
  id: string;
  name: string;
  type:
    | 'mesh'
    | 'light'
    | 'camera'
    | 'empty'
    | 'blueprint'
    | 'volume'
    | 'spline'
    | 'decal'
    | 'foliage'
    | 'audio';
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
  visible: boolean;
  locked: boolean;
  parentId?: string;
  children: string[];
  components: LevelComponent[];
  properties: Record<string, unknown>;
}

export interface LevelComponent {
  id: string;
  type: string;
  enabled: boolean;
  properties: Record<string, unknown>;
}

export interface LevelData {
  id: string;
  name: string;
  objects: LevelObject[];
  environment: EnvironmentSettings;
  lightmapSettings: LightmapSettings;
  navmeshSettings: NavmeshSettings;
}

export interface EnvironmentSettings {
  skyType: 'hdri' | 'procedural' | 'solid';
  skyColor: string;
  ambientIntensity: number;
  fogEnabled: boolean;
  fogColor: string;
  fogDensity: number;
  postProcessVolume?: string;
}

export interface LightmapSettings {
  resolution: number;
  quality: 'preview' | 'medium' | 'high' | 'production';
  directSamples: number;
  indirectSamples: number;
  bounces: number;
}

export interface NavmeshSettings {
  agentRadius: number;
  agentHeight: number;
  maxSlope: number;
  stepHeight: number;
  cellSize: number;
}

export const defaultObjects: LevelObject[] = [
  {
    id: 'floor',
    name: 'Floor',
    type: 'mesh',
    position: [0, 0, 0],
    rotation: [0, 0, 0],
    scale: [10, 0.1, 10],
    visible: true,
    locked: false,
    children: [],
    components: [
      {
        id: 'mesh_floor',
        type: 'StaticMesh',
        enabled: true,
        properties: { mesh: 'Cube', material: 'M_Floor' },
      },
      {
        id: 'col_floor',
        type: 'BoxCollider',
        enabled: true,
        properties: { isTrigger: false },
      },
    ],
    properties: { castShadow: true, receiveShadow: true },
  },
  {
    id: 'cube1',
    name: 'Cube_01',
    type: 'mesh',
    position: [0, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      {
        id: 'mesh_cube1',
        type: 'StaticMesh',
        enabled: true,
        properties: { mesh: 'Cube', material: 'M_Default' },
      },
    ],
    properties: { castShadow: true, receiveShadow: true },
  },
  {
    id: 'sphere1',
    name: 'Sphere_01',
    type: 'mesh',
    position: [3, 1, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      {
        id: 'mesh_sphere1',
        type: 'StaticMesh',
        enabled: true,
        properties: { mesh: 'Sphere', material: 'M_Metal' },
      },
    ],
    properties: { castShadow: true, receiveShadow: true },
  },
  {
    id: 'light_main',
    name: 'DirectionalLight',
    type: 'light',
    position: [5, 10, 5],
    rotation: [-45, 30, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      {
        id: 'light_dir',
        type: 'DirectionalLight',
        enabled: true,
        properties: { color: '#ffffff', intensity: 1, castShadow: true },
      },
    ],
    properties: {},
  },
  {
    id: 'light_point',
    name: 'PointLight',
    type: 'light',
    position: [-3, 2, 0],
    rotation: [0, 0, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      {
        id: 'light_pt',
        type: 'PointLight',
        enabled: true,
        properties: { color: '#ff9900', intensity: 1, range: 10 },
      },
    ],
    properties: {},
  },
  {
    id: 'camera_main',
    name: 'MainCamera',
    type: 'camera',
    position: [5, 5, 5],
    rotation: [-35, 45, 0],
    scale: [1, 1, 1],
    visible: true,
    locked: false,
    children: [],
    components: [
      {
        id: 'cam_main',
        type: 'Camera',
        enabled: true,
        properties: { fov: 60, near: 0.1, far: 1000 },
      },
    ],
    properties: {},
  },
];

export const defaultEnvironment: EnvironmentSettings = {
  skyType: 'procedural',
  skyColor: '#87ceeb',
  ambientIntensity: 0.3,
  fogEnabled: false,
  fogColor: '#aabbcc',
  fogDensity: 0.01,
};
