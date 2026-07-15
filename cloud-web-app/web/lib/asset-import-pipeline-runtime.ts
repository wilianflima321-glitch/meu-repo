import type { AssetType, ImportOptions } from './asset-import-pipeline-contracts';

export const DEFAULT_IMPORT_OPTIONS: ImportOptions = {
  generateNormals: true,
  generateTangents: false,
  optimizeMesh: true,
  mergeMeshes: false,
  calculateBounds: true,
  flipYZ: false,
  scale: 1,
  generateMipmaps: true,
  maxTextureSize: 4096,
  textureFormat: 'rgba',
  flipY: true,
  premultiplyAlpha: false,
  normalize: false,
  convertToMono: false,
  bakeAnimations: false,
  animationFPS: 30,
  createThumbnail: true,
  thumbnailSize: 256,
};

export const TEXT_LIKE_ASSET_EXTENSIONS = new Set([
  '.json',
  '.xml',
  '.csv',
  '.yaml',
  '.toml',
  '.glsl',
  '.vert',
  '.frag',
  '.hlsl',
  '.shader',
]);

export function getImportFileName(file: File | string): string {
  return typeof file === 'string' ? file : file.name;
}

export function getImportExtension(filename: string): string {
  return filename.toLowerCase().substring(filename.lastIndexOf('.'));
}

export function getImportDisplayName(filename: string): string {
  return filename.replace(/\.[^/.]+$/, '');
}

export function createAssetImportId(type: AssetType | 'asset' | 'texture' | 'audio'): string {
  return `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function resolveImportOptions(options: ImportOptions): ImportOptions {
  return {
    ...DEFAULT_IMPORT_OPTIONS,
    ...options,
  };
}

export function shouldReadGenericAssetAsText(extension: string): boolean {
  return TEXT_LIKE_ASSET_EXTENSIONS.has(extension);
}
