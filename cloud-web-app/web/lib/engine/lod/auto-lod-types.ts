import type * as THREE from 'three';

export interface LODLevel {
  level: number;
  distance: number;
  triangleRatio: number;
  textureScale: number;
}

export interface LODConfig {
  levels: LODLevel[];
  algorithm: 'quadric' | 'vertex-cluster' | 'edge-collapse';
  preserveUVSeams: boolean;
  preserveNormals: boolean;
  targetErrorThreshold: number;
  generateAtlas: boolean;
  atlasSize: number;
}

export interface MeshAnalysis {
  triangleCount: number;
  vertexCount: number;
  boundingBox: THREE.Box3;
  boundingSphere: THREE.Sphere;
  surfaceArea: number;
  volume: number;
  complexity: 'low' | 'medium' | 'high' | 'ultra';
  materialCount: number;
  hasUVs: boolean;
  hasNormals: boolean;
  hasTangents: boolean;
}

export interface LODResult {
  originalMesh: THREE.BufferGeometry;
  lodMeshes: Map<number, THREE.BufferGeometry>;
  analysis: MeshAnalysis;
  processingTime: number;
  memoryReduction: number;
}

export interface AssetLODEntry {
  assetId: string;
  assetPath: string;
  config: LODConfig;
  result?: LODResult;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}
