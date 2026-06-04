import { logger } from '@/lib/observability/logger';
/**
 * Asset Importer
 *
 * Runtime importer for 3D models, textures, HDRI files, audio, and related
 * creative assets. Keep this module behind heavy async boundaries.
 *
 * @module lib/assets/asset-importer
 */

// @aethel-heavy-async-boundary
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { LoadersManager } from './asset-importer.loaders';
import {
  detectAssetType,
  detectAudioFormat,
  detectHDRIFormat,
  detectModelFormat,
  detectTextureFormat,
  extractAssetName,
  getAssetDataSize,
} from './asset-importer-detection';
import {
  applyTransforms,
  calculateMeshStats,
  centerModel,
  computeNormals,
  countMeshes,
  extractMaterials,
  extractTextures,
  generateModelThumbnail,
  normalizeScale,
  optimizeMeshes,
} from './asset-importer-processing';
import type {
  AssetType,
  ImportOptions,
  ImportedAsset,
  ImportedAudio,
  ImportedHDRI,
  ImportedModel,
  ImportedTexture,
  ImportProgress,
  AudioFormat,
  HDRIFormat,
  ModelFormat,
  TextureFormat,
} from './asset-importer-contracts';
export type {
  AssetType,
  AudioFormat,
  HDRIFormat,
  ImportOptions,
  ImportedAsset,
  ImportedAudio,
  ImportedHDRI,
  ImportedModel,
  ImportedTexture,
  ImportProgress,
  ModelFormat,
  TextureFormat,
} from './asset-importer-contracts';

// ============================================================================
// ASSET IMPORTER
// ============================================================================

export class AssetImporter {
  private loaders = LoadersManager.getInstance();
  private progressCallback?: (progress: ImportProgress) => void;
  private cache = new Map<string, ImportedAsset>();

  constructor() {
    // Setup loading manager callbacks
    const manager = this.loaders.getLoadingManager();

    manager.onProgress = (url, loaded, total) => {
      this.emitProgress({
        loaded,
        total,
        percent: (loaded / total) * 100,
        phase: 'loading',
        message: `Loading ${url}...`,
      });
    };
  }

  private emitProgress(progress: ImportProgress): void {
    this.progressCallback?.(progress);
  }

  onProgress(callback: (progress: ImportProgress) => void): void {
    this.progressCallback = callback;
  }

  // Generate unique ID
  private generateId(): string {
    return `asset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ============================================================================
  // MODEL IMPORT
  // ============================================================================

  async importModel(
    source: string | File | ArrayBuffer,
    options: ImportOptions = {}
  ): Promise<ImportedModel> {
    const format = detectModelFormat(source);

    this.emitProgress({
      loaded: 0,
      total: 100,
      percent: 0,
      phase: 'loading',
      message: `Importing ${format.toUpperCase()} model...`,
    });

    let model: THREE.Object3D;
    let animations: THREE.AnimationClip[] = [];
    let gltfData: GLTF | null = null;

    switch (format) {
      case 'gltf':
      case 'glb':
        gltfData = await this.loadGLTF(source);
        model = gltfData.scene;
        animations = gltfData.animations;
        break;
      case 'fbx':
        model = await this.loadFBX(source);
        animations = (model as THREE.Group).animations || [];
        break;
      case 'obj':
        model = await this.loadOBJ(source);
        break;
      default:
        throw new Error(`Unsupported model format: ${format}`);
    }

    this.emitProgress({
      loaded: 50,
      total: 100,
      percent: 50,
      phase: 'processing',
      message: 'Processing model...',
    });

    // Apply optimizations
    if (options.optimizeMeshes) {
      optimizeMeshes(model);
    }

    if (options.computeNormals) {
      computeNormals(model);
    }

    if (options.centerModel) {
      centerModel(model);
    }

    if (options.normalizeScale && options.targetScale) {
      normalizeScale(model, options.targetScale);
    }

    if (options.applyTransforms) {
      applyTransforms(model);
    }

    // Extract materials and textures
    const materials = extractMaterials(model);
    const textures = extractTextures(materials);

    // Calculate stats
    const { triangleCount, vertexCount } = calculateMeshStats(model);
    const boundingBox = new THREE.Box3().setFromObject(model);

    // Generate thumbnail
    const thumbnail = await generateModelThumbnail(model);

    this.emitProgress({
      loaded: 100,
      total: 100,
      percent: 100,
      phase: 'complete',
      message: 'Import complete!',
    });

    const imported: ImportedModel = {
      id: this.generateId(),
      name: extractAssetName(source),
      type: 'model',
      format,
      size: getAssetDataSize(source),
      data: model,
      animations,
      materials,
      textures,
      boundingBox,
      triangleCount,
      vertexCount,
      metadata: {
        animations: animations.length,
        meshCount: countMeshes(model),
        materialCount: materials.length,
        textureCount: textures.length,
      },
      thumbnail,
      createdAt: new Date(),
    };

    this.cache.set(imported.id, imported);
    return imported;
  }

  private async loadGLTF(source: string | File | ArrayBuffer): Promise<GLTF> {
    const loader = this.loaders.getGLTFLoader();

    if (typeof source === 'string') {
      return new Promise((resolve, reject) => {
        loader.load(source, resolve, undefined, reject);
      });
    }

    if (source instanceof File) {
      const arrayBuffer = await source.arrayBuffer();
      return new Promise((resolve, reject) => {
        loader.parse(arrayBuffer, '', resolve, reject);
      });
    }

    return new Promise((resolve, reject) => {
      loader.parse(source, '', resolve, reject);
    });
  }

  private async loadFBX(source: string | File | ArrayBuffer): Promise<THREE.Group> {
    const loader = this.loaders.getFBXLoader();

    if (typeof source === 'string') {
      return new Promise((resolve, reject) => {
        loader.load(source, resolve, undefined, reject);
      });
    }

    if (source instanceof File) {
      const arrayBuffer = await source.arrayBuffer();
      return loader.parse(arrayBuffer, '');
    }

    return loader.parse(source, '');
  }

  private async loadOBJ(source: string | File | ArrayBuffer): Promise<THREE.Group> {
    const loader = this.loaders.getOBJLoader();

    if (typeof source === 'string') {
      return new Promise((resolve, reject) => {
        loader.load(source, resolve, undefined, reject);
      });
    }

    if (source instanceof File) {
      const text = await source.text();
      return loader.parse(text);
    }

    const decoder = new TextDecoder();
    const text = decoder.decode(source);
    return loader.parse(text);
  }

  // ============================================================================
  // TEXTURE IMPORT
  // ============================================================================

  async importTexture(
    source: string | File,
    options: ImportOptions = {}
  ): Promise<ImportedTexture> {
    const format = detectTextureFormat(source);
    const loader = this.loaders.getTextureLoader();

    this.emitProgress({
      loaded: 0,
      total: 100,
      percent: 0,
      phase: 'loading',
      message: 'Loading texture...',
    });

    let texture: THREE.Texture;

    if (typeof source === 'string') {
      texture = await new Promise((resolve, reject) => {
        loader.load(source, resolve, undefined, reject);
      });
    } else {
      const url = URL.createObjectURL(source);
      texture = await new Promise((resolve, reject) => {
        loader.load(url, (tex) => {
          URL.revokeObjectURL(url);
          resolve(tex);
        }, undefined, reject);
      });
    }

    // Apply options
    texture.generateMipmaps = options.generateMipmaps ?? true;
    texture.flipY = options.flipY ?? true;
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;

    const image = texture.image as HTMLImageElement;

    this.emitProgress({
      loaded: 100,
      total: 100,
      percent: 100,
      phase: 'complete',
      message: 'Texture loaded!',
    });

    const imported: ImportedTexture = {
      id: this.generateId(),
      name: extractAssetName(source),
      type: 'texture',
      format,
      size: getAssetDataSize(source),
      data: texture,
      width: image.width,
      height: image.height,
      isHDR: false,
      metadata: {
        hasAlpha: format === 'png' || format === 'webp',
      },
      createdAt: new Date(),
    };

    this.cache.set(imported.id, imported);
    return imported;
  }

  // ============================================================================
  // HDRI IMPORT
  // ============================================================================

  async importHDRI(source: string | File): Promise<ImportedHDRI> {
    const format = detectHDRIFormat(source);

    this.emitProgress({
      loaded: 0,
      total: 100,
      percent: 0,
      phase: 'loading',
      message: 'Loading HDRI environment...',
    });

    let texture: THREE.Texture;
    let url: string;
    let shouldRevoke = false;

    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
      shouldRevoke = true;
    }

    try {
      if (format === 'hdr') {
        const loader = this.loaders.getRGBELoader();
        texture = await new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });
      } else {
        const loader = this.loaders.getEXRLoader();
        texture = await new Promise((resolve, reject) => {
          loader.load(url, resolve, undefined, reject);
        });
      }
    } finally {
      if (shouldRevoke) {
        URL.revokeObjectURL(url);
      }
    }

    texture.mapping = THREE.EquirectangularReflectionMapping;

    const image = texture.image;

    this.emitProgress({
      loaded: 100,
      total: 100,
      percent: 100,
      phase: 'complete',
      message: 'HDRI loaded!',
    });

    const imported: ImportedHDRI = {
      id: this.generateId(),
      name: extractAssetName(source),
      type: 'hdri',
      format,
      size: getAssetDataSize(source),
      data: texture,
      width: image.width,
      height: image.height,
      metadata: {},
      createdAt: new Date(),
    };

    this.cache.set(imported.id, imported);
    return imported;
  }

  // ============================================================================
  // AUDIO IMPORT
  // ============================================================================

  async importAudio(source: string | File): Promise<ImportedAudio> {
    const format = detectAudioFormat(source);
    const loader = this.loaders.getAudioLoader();

    this.emitProgress({
      loaded: 0,
      total: 100,
      percent: 0,
      phase: 'loading',
      message: 'Loading audio...',
    });

    let audioBuffer: AudioBuffer;
    let url: string;
    let shouldRevoke = false;

    if (typeof source === 'string') {
      url = source;
    } else {
      url = URL.createObjectURL(source);
      shouldRevoke = true;
    }

    try {
      audioBuffer = await new Promise((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
    } finally {
      if (shouldRevoke) {
        URL.revokeObjectURL(url);
      }
    }

    this.emitProgress({
      loaded: 100,
      total: 100,
      percent: 100,
      phase: 'complete',
      message: 'Audio loaded!',
    });

    const imported: ImportedAudio = {
      id: this.generateId(),
      name: extractAssetName(source),
      type: 'audio',
      format,
      size: getAssetDataSize(source),
      data: audioBuffer,
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      numberOfChannels: audioBuffer.numberOfChannels,
      metadata: {},
      createdAt: new Date(),
    };

    this.cache.set(imported.id, imported);
    return imported;
  }

  // ============================================================================
  // BATCH IMPORT
  // ============================================================================

  async importFromFiles(files: FileList | File[]): Promise<ImportedAsset[]> {
    const fileArray = Array.from(files);
    const results: ImportedAsset[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];

      this.emitProgress({
        loaded: i,
        total: fileArray.length,
        percent: (i / fileArray.length) * 100,
        phase: 'loading',
        message: `Importing ${file.name} (${i + 1}/${fileArray.length})...`,
      });

      try {
        const type = detectAssetType(file);
        let asset: ImportedAsset;

        switch (type) {
          case 'model':
            asset = await this.importModel(file);
            break;
          case 'texture':
            asset = await this.importTexture(file);
            break;
          case 'hdri':
            asset = await this.importHDRI(file);
            break;
          case 'audio':
            asset = await this.importAudio(file);
            break;
          default:
            continue;
        }

        results.push(asset);
      } catch (error) {
        logger.error(`Failed to import ${file.name}:`, error);
        this.emitProgress({
          loaded: i,
          total: fileArray.length,
          percent: (i / fileArray.length) * 100,
          phase: 'error',
          message: `Failed to import ${file.name}`,
        });
      }
    }

    this.emitProgress({
      loaded: fileArray.length,
      total: fileArray.length,
      percent: 100,
      phase: 'complete',
      message: `Imported ${results.length} assets`,
    });

    return results;
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  getFromCache(id: string): ImportedAsset | undefined {
    return this.cache.get(id);
  }

  removeFromCache(id: string): boolean {
    return this.cache.delete(id);
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { count: number; types: Record<AssetType, number> } {
    const types: Record<AssetType, number> = {
      model: 0,
      texture: 0,
      hdri: 0,
      audio: 0,
      video: 0,
      font: 0,
      data: 0,
    };

    this.cache.forEach((asset) => {
      types[asset.type]++;
    });

    return { count: this.cache.size, types };
  }
}

export { useAssetImporter } from './asset-importer.react';

export default AssetImporter;
