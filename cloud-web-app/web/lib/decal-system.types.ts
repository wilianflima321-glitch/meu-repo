import type * as THREE from 'three';

export interface DecalConfig {
  texture: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  size: THREE.Vector3;
  depth: number;
  opacity: number;
  fadeIn: number;
  fadeOut: number;
  lifetime: number;
  blending: THREE.Blending;
  depthTest: boolean;
  depthWrite: boolean;
  polygonOffsetFactor: number;
  polygonOffsetUnits: number;
}

export interface DecalInstance {
  id: string;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  size: THREE.Vector3;
  rotation: number;
  mesh: THREE.Mesh;
  config: DecalConfig;
  spawnTime: number;
  opacity: number;
  active: boolean;
}

export interface DecalPool {
  type: string;
  config: DecalConfig;
  maxInstances: number;
  instances: DecalInstance[];
  activeCount: number;
}
