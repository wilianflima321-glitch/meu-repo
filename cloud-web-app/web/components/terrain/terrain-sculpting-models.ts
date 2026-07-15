export type TerrainToolType =
  | 'sculpt_raise'
  | 'sculpt_lower'
  | 'sculpt_smooth'
  | 'sculpt_flatten'
  | 'sculpt_noise'
  | 'sculpt_erosion'
  | 'paint_layer'
  | 'paint_hole'
  | 'foliage_paint'
  | 'foliage_erase'
  | 'select'
  | 'region';
export type BrushShape = 'circle' | 'square' | 'custom';
export type BrushFalloff = 'linear' | 'smooth' | 'spherical' | 'tip' | 'constant';
export interface BrushSettings {
  size: number;           // Radius in world units
  strength: number;       // 0-1
  falloff: BrushFalloff;
  shape: BrushShape;
  rotation: number;       // Degrees
  spacing: number;        // Stroke spacing
  jitter: number;         // Position randomization
  customMask?: ImageData; // For custom shapes
}
export interface TerrainLayer {
  id: string;
  name: string;
  diffuseTexture: string;
  normalTexture?: string;
  roughnessTexture?: string;
  tiling: { x: number; y: number };
  heightBlend: number;
  metallic: number;
  roughness: number;
}
export interface ErosionSettings {
  type: 'hydraulic' | 'thermal' | 'wind';
  iterations: number;
  strength: number;
  rainAmount?: number;
  evaporation?: number;
  sedimentCapacity?: number;
  talusAngle?: number;
  windDirection?: { x: number; y: number };
  windStrength?: number;
}
export interface FoliageType {
  id: string;
  name: string;
  mesh: string;
  density: number;
  minScale: number;
  maxScale: number;
  alignToNormal: boolean;
  randomRotation: boolean;
  minSlope: number;
  maxSlope: number;
  minHeight: number;
  maxHeight: number;
  collisionEnabled: boolean;
}
export interface TerrainSettings {
  resolution: number;        // Heightmap resolution
  size: { x: number; y: number; z: number }; // World size
  maxHeight: number;
  lodLevels: number;
  streamingEnabled: boolean;
  tessellation: boolean;
  castShadows: boolean;
  receiveShadows: boolean;
}
export interface TerrainData {
  heightmap: Float32Array;
  splatmaps: Float32Array[]; // One per 4 layers
  holemask: Uint8Array;
  foliageInstances: FoliageInstance[];
  resolution: number;
}
export interface FoliageInstance {
  typeId: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: number;
}

export const toolCategories: Array<{ name: string; tools: Array<{ id: TerrainToolType; icon: string; label: string }> }> = [
  {
    name: 'Sculpt',
    tools: [
      { id: 'sculpt_raise', icon: '+', label: 'Raise' },
      { id: 'sculpt_lower', icon: '-', label: 'Lower' },
      { id: 'sculpt_smooth', icon: '~', label: 'Smooth' },
      { id: 'sculpt_flatten', icon: '=', label: 'Flatten' },
      { id: 'sculpt_noise', icon: 'N', label: 'Noise' },
      { id: 'sculpt_erosion', icon: 'W', label: 'Erosion' },
    ],
  },
  {
    name: 'Paint',
    tools: [
      { id: 'paint_layer', icon: 'P', label: 'Paint Layer' },
      { id: 'paint_hole', icon: 'H', label: 'Hole Tool' },
    ],
  },
  {
    name: 'Foliage',
    tools: [
      { id: 'foliage_paint', icon: 'F', label: 'Paint Foliage' },
      { id: 'foliage_erase', icon: 'E', label: 'Erase Foliage' },
    ],
  },
  {
    name: 'Selection',
    tools: [
      { id: 'select', icon: 'S', label: 'Select' },
      { id: 'region', icon: 'R', label: 'Region' },
    ],
  },
];
