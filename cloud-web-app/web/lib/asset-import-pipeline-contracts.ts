import type * as THREE from 'three';

// ============================================================================
// TYPES
// ============================================================================

export type AssetType =
  | 'model'
  | 'texture'
  | 'material'
  | 'audio'
  | 'animation'
  | 'blueprint'
  | 'particle'
  | 'font'
  | 'shader'
  | 'data';

export type ImportStatus = 'pending' | 'loading' | 'processing' | 'completed' | 'error';

export interface ImportOptions {
  // Model options
  generateNormals?: boolean;
  generateTangents?: boolean;
  optimizeMesh?: boolean;
  mergeMeshes?: boolean;
  calculateBounds?: boolean;
  flipYZ?: boolean;
  scale?: number;

  // Texture options
  generateMipmaps?: boolean;
  maxTextureSize?: number;
  textureFormat?: 'rgba' | 'rgb' | 'compressed';
  flipY?: boolean;
  premultiplyAlpha?: boolean;

  // Audio options
  normalize?: boolean;
  convertToMono?: boolean;
  sampleRate?: number;

  // Animation options
  bakeAnimations?: boolean;
  animationFPS?: number;

  // General
  createThumbnail?: boolean;
  thumbnailSize?: number;
}

export interface ImportedAsset {
  id: string;
  name: string;
  type: AssetType;
  originalPath: string;
  size: number;
  format: string;
  importDate: Date;
  thumbnail?: string;
  metadata: AssetMetadata;
  data: unknown;
}

export interface AssetMetadata {
  // Model metadata
  vertexCount?: number;
  triangleCount?: number;
  boneCount?: number;
  materialCount?: number;
  animationCount?: number;
  bounds?: { min: THREE.Vector3; max: THREE.Vector3 };

  // Texture metadata
  width?: number;
  height?: number;
  channels?: number;
  hasAlpha?: boolean;
  isHDR?: boolean;

  // Audio metadata
  duration?: number;
  channels_audio?: number;
  sampleRate?: number;
  bitDepth?: number;

  // General
  dependencies?: string[];
  tags?: string[];
}

export interface ImportProgress {
  stage: string;
  progress: number;
  message: string;
}

export type ImportProgressCallback = (progress: ImportProgress) => void;

// ============================================================================
// ASSET VALIDATORS
// ============================================================================

export const SUPPORTED_FORMATS: Record<AssetType, string[]> = {
  model: ['.gltf', '.glb', '.fbx', '.obj', '.dae', '.3ds', '.ply', '.stl'],
  texture: ['.png', '.jpg', '.jpeg', '.webp', '.tga', '.bmp', '.hdr', '.exr', '.ktx2'],
  material: ['.mat', '.json'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
  animation: ['.anim', '.fbx', '.gltf', '.glb'],
  blueprint: ['.bp', '.json'],
  particle: ['.vfx', '.json'],
  font: ['.ttf', '.otf', '.woff', '.woff2'],
  shader: ['.glsl', '.vert', '.frag', '.hlsl', '.shader'],
  data: ['.json', '.xml', '.csv', '.yaml', '.toml'],
};

export function getAssetType(filename: string): AssetType | null {
  const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));

  for (const [type, formats] of Object.entries(SUPPORTED_FORMATS)) {
    if (formats.includes(ext)) {
      return type as AssetType;
    }
  }

  return null;
}

export function isSupported(filename: string): boolean {
  return getAssetType(filename) !== null;
}

export function getSupportedFormats(type?: AssetType): string[] {
  if (type) {
    return SUPPORTED_FORMATS[type] || [];
  }
  return Object.values(SUPPORTED_FORMATS).flat();
}
