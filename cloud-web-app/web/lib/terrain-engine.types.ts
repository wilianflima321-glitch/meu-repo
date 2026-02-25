import * as THREE from 'three';

export interface TerrainConfig {
  width: number;
  depth: number;
  heightScale: number;
  resolution: number;
  chunkSize: number;
  lodLevels: number;
  lodDistances: number[];
}

export interface TerrainLayer {
  name: string;
  diffuseMap: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  heightBlend: number;
  slopeBlend: number;
  tiling: THREE.Vector2;
  minHeight: number;
  maxHeight: number;
  minSlope: number;
  maxSlope: number;
}

export interface TerrainChunk {
  id: string;
  x: number;
  z: number;
  mesh: THREE.Mesh;
  lodLevel: number;
  heightData: Float32Array;
  bounds: THREE.Box3;
  loaded: boolean;
}

export interface SculptBrush {
  type: 'raise' | 'lower' | 'smooth' | 'flatten' | 'noise';
  size: number;
  strength: number;
  falloff: 'linear' | 'smooth' | 'sharp';
}

