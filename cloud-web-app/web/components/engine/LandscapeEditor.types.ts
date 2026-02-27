export type BrushMode = 'sculpt' | 'smooth' | 'flatten' | 'paint' | 'foliage' | 'erosion';
export type SculptOperation = 'raise' | 'lower' | 'level' | 'noise';

export interface BrushSettings {
  size: number;
  strength: number;
  falloff: number;
  mode: BrushMode;
  operation: SculptOperation;
  targetHeight?: number;
}

export interface TerrainLayer {
  id: string;
  name: string;
  texture: string;
  normalMap?: string;
  tiling: number;
  color: string;
  blendWeight: number;
  minSlope: number;
  maxSlope: number;
  minHeight: number;
  maxHeight: number;
}

export interface FoliageType {
  id: string;
  name: string;
  mesh: string;
  density: number;
  minScale: number;
  maxScale: number;
  alignToNormal: boolean;
  randomYaw: boolean;
  color: string;
}

export interface TerrainConfig {
  width: number;
  height: number;
  resolution: number;
  maxHeight: number;
  layers: TerrainLayer[];
  foliage: FoliageType[];
}
