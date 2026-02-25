/**
 * Shared type contracts for Nanite-like virtualized geometry.
 */
import * as THREE from 'three';

export interface Meshlet {
  id: number;
  vertexOffset: number;
  vertexCount: number;
  triangleOffset: number;
  triangleCount: number;
  boundingSphere: THREE.Sphere;
  boundingCone: { apex: THREE.Vector3; axis: THREE.Vector3; cutoff: number };
  lodLevel: number;
  parentCluster: number;
  childClusters: number[];
  error: number; // Screen-space error
}

export interface MeshletCluster {
  id: number;
  meshlets: Meshlet[];
  boundingSphere: THREE.Sphere;
  lodLevel: number;
  parentCluster: number | null;
  childClusters: number[];
  screenSpaceError: number;
  isLoaded: boolean;
  isVisible: boolean;
}

export interface VirtualizedMesh {
  id: string;
  name: string;
  totalVertices: number;
  totalTriangles: number;
  clusters: MeshletCluster[];
  lodLevels: number;
  vertexBuffer: Float32Array;
  indexBuffer: Uint32Array;
  normalBuffer: Float32Array;
  uvBuffer: Float32Array;
}

export interface CullingStats {
  totalMeshlets: number;
  visibleMeshlets: number;
  culledByFrustum: number;
  culledByOcclusion: number;
  culledByLOD: number;
  trianglesRendered: number;
  trianglesCulled: number;
}

export interface NaniteConfig {
  maxMeshletsPerCluster: number;
  targetTrianglesPerMeshlet: number;
  lodBias: number;
  screenSpaceErrorThreshold: number;
  enableOcclusionCulling: boolean;
  enableSoftwareRasterization: boolean;
  maxConcurrentStreams: number;
  memoryBudgetMB: number;
}

