import type * as THREE from 'three';

export interface FoliageType {
  id: string;
  name: string;
  mesh: THREE.BufferGeometry;
  material: THREE.Material;
  density: number;
  minScale: number;
  maxScale: number;
  minHeight: number;
  maxHeight: number;
  minSlope: number;
  maxSlope: number;
  alignToNormal: boolean;
  randomRotation: boolean;
  windStrength: number;
  lodDistances: number[];
  lodMeshes: THREE.BufferGeometry[];
  castShadow: boolean;
  receiveShadow: boolean;
}

export interface FoliageInstance {
  position: THREE.Vector3;
  rotation: THREE.Euler;
  scale: THREE.Vector3;
  typeId: string;
}

export interface FoliageCluster {
  id: string;
  typeId: string;
  bounds: THREE.Box3;
  instances: FoliageInstance[];
  instancedMesh: THREE.InstancedMesh | null;
  lodLevel: number;
  visible: boolean;
}

export interface FoliageBrush {
  type: 'paint' | 'erase' | 'scale' | 'rotate';
  size: number;
  density: number;
  falloff: number;
  foliageTypes: string[];
}

export interface FoliageConfig {
  maxInstancesPerCluster: number;
  clusterSize: number;
  lodDistances: number[];
  windSpeed: number;
  windDirection: THREE.Vector2;
  shadowsEnabled: boolean;
}

// ============================================================================
// WIND SHADER
// ============================================================================

// ============================================================================
// FOLIAGE MATERIAL
// ============================================================================
