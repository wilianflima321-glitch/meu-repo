/**
 * AI 3D generation shared contracts.
 */

import * as THREE from 'three';

export interface NeRFConfig {
  resolution: number;
  samples: number;
  bounces: number;
  nearPlane: number;
  farPlane: number;
  coarseNetworkSize: number;
  fineNetworkSize: number;
  positionEncoding: number;
  directionEncoding: number;
}

export interface GaussianSplattingConfig {
  maxGaussians: number;
  shDegree: number; // Spherical harmonics degree
  opacityThreshold: number;
  scaleMultiplier: number;
  densificationInterval: number;
  pruneInterval: number;
  learningRate: number;
}

export interface Gaussian3D {
  position: THREE.Vector3;
  scale: THREE.Vector3;
  rotation: THREE.Quaternion;
  opacity: number;
  sphericalHarmonics: number[]; // Color as SH coefficients
}

export interface PointCloudData {
  positions: Float32Array;
  colors?: Float32Array;
  normals?: Float32Array;
  count: number;
}

export interface TextTo3DRequest {
  prompt: string;
  negativePrompt?: string;
  style?: 'realistic' | 'stylized' | 'lowpoly' | 'anime';
  detailLevel?: 'low' | 'medium' | 'high';
  seed?: number;
}

export interface ImageTo3DRequest {
  images: ImageData[];
  cameraPositions?: THREE.Matrix4[];
  method?: 'nerf' | 'gaussian' | 'photogrammetry';
  quality?: 'draft' | 'medium' | 'high';
}

export interface Generated3DResult {
  mesh?: THREE.BufferGeometry;
  pointCloud?: PointCloudData;
  gaussians?: Gaussian3D[];
  textures?: {
    albedo?: THREE.Texture;
    normal?: THREE.Texture;
    roughness?: THREE.Texture;
    metalness?: THREE.Texture;
  };
  confidence: number;
}
