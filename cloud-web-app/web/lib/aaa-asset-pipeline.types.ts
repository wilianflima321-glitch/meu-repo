import * as THREE from 'three';

export type AssetType = 
  | 'mesh'
  | 'texture'
  | 'material'
  | 'audio'
  | 'animation'
  | 'skeleton'
  | 'prefab'
  | 'scene'
  | 'shader'
  | 'vfx'
  | 'hdri'
  | 'lightmap'
  | 'navmesh'
  | 'terrain'
  | 'script';

export type TextureFormat = 
  | 'png'
  | 'jpg'
  | 'webp'
  | 'ktx2'
  | 'basis'
  | 'dds'
  | 'exr'
  | 'hdr';

export type MeshFormat =
  | 'gltf'
  | 'glb'
  | 'fbx'
  | 'obj'
  | 'usd'
  | 'usda'
  | 'usdc'
  | 'usdz'
  | 'abc'
  | 'ply'
  | 'stl';

export interface AssetMetadata {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  size: number;
  hash: string;
  version: number;
  created: Date;
  modified: Date;
  // AI-specific metadata
  aiTags: string[];
  aiDescription: string;
  aiUsageHints: string[];
  aiSemanticLabels: Record<string, string>;
  // Dependencies
  dependencies: string[];
  // Quality tiers
  qualityTiers: AssetQualityTier[];
  // Streaming
  streamable: boolean;
  priority: number;
}

export interface AssetQualityTier {
  name: 'ultra' | 'high' | 'medium' | 'low' | 'mobile';
  path: string;
  size: number;
  // Mesh specific
  triangleCount?: number;
  vertexCount?: number;
  // Texture specific
  resolution?: { width: number; height: number };
  format?: TextureFormat;
  compression?: string;
}

// ============================================================================
// MESH ASSET
// ============================================================================

export interface MeshAsset extends AssetMetadata {
  type: 'mesh';
  geometry: {
    triangleCount: number;
    vertexCount: number;
    hasNormals: boolean;
    hasTangents: boolean;
    hasUV0: boolean;
    hasUV1: boolean;
    hasVertexColors: boolean;
    hasSkinning: boolean;
    hasMorphTargets: boolean;
    boundingBox: THREE.Box3;
    boundingSphere: THREE.Sphere;
  };
  lods: MeshLOD[];
  materials: string[];
  skeleton?: string;
  animations?: string[];
}

export interface MeshLOD {
  level: number;
  distance: number;
  triangleCount: number;
  path: string;
  screenSize?: number;
}

// ============================================================================
// TEXTURE ASSET
// ============================================================================

export interface TextureAsset extends AssetMetadata {
  type: 'texture';
  format: TextureFormat;
  width: number;
  height: number;
  depth?: number;
  channels: 1 | 2 | 3 | 4;
  bitDepth: 8 | 16 | 32;
  isHDR: boolean;
  isCubemap: boolean;
  hasMipmaps: boolean;
  mipmapCount: number;
  textureType: 'albedo' | 'normal' | 'roughness' | 'metallic' | 'ao' | 'emissive' | 'height' | 'mask' | 'cubemap' | 'lightmap';
  colorSpace: 'srgb' | 'linear';
  // Streaming
  streamingMips: TextureStreamingMip[];
}

export interface TextureStreamingMip {
  level: number;
  width: number;
  height: number;
  size: number;
  path: string;
}

// ============================================================================
// MATERIAL ASSET
// ============================================================================

export interface MaterialAsset extends AssetMetadata {
  type: 'material';
  shaderType: 'standard' | 'unlit' | 'subsurface' | 'hair' | 'eye' | 'cloth' | 'glass' | 'water' | 'terrain' | 'custom';
  parameters: PBRMaterialParams;
  textures: Record<string, string>;
  customShader?: string;
  variants: MaterialVariant[];
}

export interface PBRMaterialParams {
  // Base
  albedo: [number, number, number];
  albedoMap?: string;
  // Metallic/Roughness
  metallic: number;
  metallicMap?: string;
  roughness: number;
  roughnessMap?: string;
  // Normal
  normalMap?: string;
  normalScale: number;
  // Ambient Occlusion
  aoMap?: string;
  aoIntensity: number;
  // Emissive
  emissive: [number, number, number];
  emissiveMap?: string;
  emissiveIntensity: number;
  // Height/Parallax
  heightMap?: string;
  heightScale: number;
  // Subsurface (SSS)
  subsurfaceColor?: [number, number, number];
  subsurfaceRadius?: number;
  subsurfaceMap?: string;
  // Clearcoat
  clearcoat?: number;
  clearcoatRoughness?: number;
  // Sheen
  sheen?: number;
  sheenColor?: [number, number, number];
  // Transmission
  transmission?: number;
  thickness?: number;
  ior?: number;
  // Anisotropy
  anisotropy?: number;
  anisotropyRotation?: number;
  // Detail maps
  detailAlbedoMap?: string;
  detailNormalMap?: string;
  detailTiling?: [number, number];
}

export interface MaterialVariant {
  name: string;
  overrides: Partial<PBRMaterialParams>;
}

// ============================================================================
// PREFAB ASSET
// ============================================================================

export interface PrefabAsset extends AssetMetadata {
  type: 'prefab';
  rootEntity: PrefabEntity;
  isVariant: boolean;
  basePrefab?: string;
  overrides?: PrefabOverride[];
}

export interface PrefabEntity {
  id: string;
  name: string;
  transform: {
    position: [number, number, number];
    rotation: [number, number, number, number];
    scale: [number, number, number];
  };
  components: PrefabComponent[];
  children: PrefabEntity[];
}

export interface PrefabComponent {
  type: string;
  data: Record<string, unknown>;
  enabled: boolean;
}

export interface PrefabOverride {
  path: string;
  property: string;
  value: unknown;
}

// ============================================================================
// ASSET IMPORTER
// ============================================================================

export interface ImportOptions {
  // General
  generateLODs: boolean;
  lodLevels: number;
  lodReduction: number[];
  // Mesh
  calculateNormals: boolean;
  calculateTangents: boolean;
  optimizeMesh: boolean;
  mergeMeshes: boolean;
  // Texture
  generateMipmaps: boolean;
  compressTextures: boolean;
  textureFormat: TextureFormat;
  maxTextureSize: number;
  // Material
  convertMaterials: boolean;
  materialPreset: 'standard' | 'unreal' | 'unity';
  // Animation
  importAnimations: boolean;
  bakeAnimations: boolean;
  animationSampleRate: number;
  // AI
  generateAIMetadata: boolean;
  aiAnalyzeContent: boolean;
}

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  generateLODs: true,
  lodLevels: 4,
  lodReduction: [1, 0.5, 0.25, 0.125],
  calculateNormals: true,
  calculateTangents: true,
  optimizeMesh: true,
  mergeMeshes: false,
  generateMipmaps: true,
  compressTextures: true,
  textureFormat: 'ktx2',
  maxTextureSize: 4096,
  convertMaterials: true,
  materialPreset: 'standard',
  importAnimations: true,
  bakeAnimations: false,
  animationSampleRate: 30,
  generateAIMetadata: true,
  aiAnalyzeContent: true,
};
