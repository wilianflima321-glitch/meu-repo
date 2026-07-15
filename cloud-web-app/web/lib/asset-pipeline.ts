import { logger } from '@/lib/observability/logger';
/**
 * Asset Pipeline Manager - Gerenciador de Assets
 *
 * Sistema completo para importar, processar e gerenciar assets do projeto.
 * Suporta imagens, áudio, modelos 3D, fontes, vídeos e mais.
 */

// @aethel-heavy-async-boundary
import * as THREE from 'three';
import type { LODConfig } from '@aethel/engine/lod/auto-lod-pipeline';

// ============================================================================
// TIPOS
// ============================================================================

export type AssetType =
  | 'texture'     // Imagens/texturas
  | 'sprite'      // Sprites 2D
  | 'audio'       // Áudio
  | 'model'       // Modelos 3D
  | 'animation'   // Animações
  | 'material'    // Materiais
  | 'prefab'      // Prefabs
  | 'scene'       // Cenas
  | 'script'      // Scripts
  | 'font'        // Fontes
  | 'video'       // Vídeos
  | 'data'        // JSON/dados
  | 'shader'      // Shaders
  | 'tilemap'     // Tilemaps
  | 'atlas';      // Sprite Atlas

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  path: string;
  size: number;
  mimeType: string;
  metadata: AssetMetadata;
  thumbnail?: string;
  importSettings: ImportSettings;
  dependencies: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AssetMetadata {
  width?: number;
  height?: number;
  duration?: number;
  channels?: number;
  sampleRate?: number;
  bitrate?: number;
  vertexCount?: number;
  triangleCount?: number;
  hasBones?: boolean;
  frameCount?: number;
  format?: string;
  compression?: string;
  [key: string]: unknown;
}

export interface ImportSettings {
  // Texture settings
  textureType?: 'default' | 'normalMap' | 'sprite' | 'cursor' | 'lightmap';
  spriteMode?: 'single' | 'multiple' | 'polygon';
  pixelsPerUnit?: number;
  filterMode?: 'point' | 'bilinear' | 'trilinear';
  wrapMode?: 'repeat' | 'clamp' | 'mirror';
  generateMipmaps?: boolean;
  maxTextureSize?: number;
  compression?: 'none' | 'low' | 'medium' | 'high';

  // Audio settings
  loadType?: 'decompress' | 'compressed' | 'streaming';
  sampleRateOverride?: number;
  normalize?: boolean;

  // Model settings
  scaleFactor?: number;
  importMaterials?: boolean;
  importAnimations?: boolean;
  generateColliders?: boolean;
  optimizeMesh?: boolean;

  // General
  customData?: Record<string, unknown>;
}

export interface AssetImportResult {
  success: boolean;
  asset?: Asset;
  errors?: string[];
  warnings?: string[];
}

export interface AssetSearchQuery {
  type?: AssetType | AssetType[];
  name?: string;
  tags?: string[];
  folder?: string;
  extension?: string;
  minSize?: number;
  maxSize?: number;
  modifiedAfter?: Date;
  modifiedBefore?: Date;
}

// ============================================================================
// IMPORTERS
// ============================================================================

import {
  audioImporter,
  fontImporter,
  modelImporter,
  textureImporter,
  videoImporter,
} from './asset-pipeline.importers';
import type { AssetImporter } from './asset-pipeline.importers';

// ============================================================================
// ASSET PIPELINE
// ============================================================================

export class AssetPipeline {
  private assets: Map<string, Asset> = new Map();
  private importers: Map<string, AssetImporter> = new Map();
  private cache: Map<string, unknown> = new Map();
  private loadingPromises: Map<string, Promise<unknown>> = new Map();

  constructor() {
    // Registrar importers padrão
    this.registerImporter(textureImporter);
    this.registerImporter(audioImporter);
    this.registerImporter(modelImporter);
    this.registerImporter(fontImporter);
    this.registerImporter(videoImporter);
  }

  // ============================================================================
  // IMPORTERS
  // ============================================================================

  registerImporter(importer: AssetImporter): void {
    importer.extensions.forEach(ext => {
      this.importers.set(ext.toLowerCase(), importer);
    });
  }

  getImporterForFile(filename: string): AssetImporter | undefined {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    return this.importers.get(ext);
  }

  // ============================================================================
  // IMPORT
  // ============================================================================

  async import(file: File, settings?: ImportSettings): Promise<AssetImportResult> {
    const importer = this.getImporterForFile(file.name);
    if (!importer) {
      return {
        success: false,
        errors: [`No importer found for file type: ${file.name}`],
      };
    }

    const result = await importer.import(file, settings);

    if (result.success && result.asset) {
      this.assets.set(result.asset.id, result.asset);
    }

    return result;
  }

  async importMultiple(files: File[], settings?: ImportSettings): Promise<AssetImportResult[]> {
    return Promise.all(files.map(file => this.import(file, settings)));
  }

  async importFromUrl(url: string, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const filename = url.split('/').pop() || 'asset';
      const file = new File([blob], filename, { type: blob.type });
      return this.import(file, settings);
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to fetch asset from URL'],
      };
    }
  }

  // ============================================================================
  // ASSET MANAGEMENT
  // ============================================================================

  get(id: string): Asset | undefined {
    return this.assets.get(id);
  }

  getByPath(path: string): Asset | undefined {
    for (const asset of this.assets.values()) {
      if (asset.path === path) return asset;
    }
    return undefined;
  }

  getByName(name: string): Asset[] {
    return Array.from(this.assets.values()).filter(a =>
      a.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  getByType(type: AssetType): Asset[] {
    return Array.from(this.assets.values()).filter(a => a.type === type);
  }

  getAll(): Asset[] {
    return Array.from(this.assets.values());
  }

  search(query: AssetSearchQuery): Asset[] {
    let results = Array.from(this.assets.values());

    if (query.type) {
      const types = Array.isArray(query.type) ? query.type : [query.type];
      results = results.filter(a => types.includes(a.type));
    }

    if (query.name) {
      const nameLower = query.name.toLowerCase();
      results = results.filter(a => a.name.toLowerCase().includes(nameLower));
    }

    if (query.folder) {
      results = results.filter(a => a.path.startsWith(query.folder!));
    }

    if (query.extension) {
      const ext = query.extension.startsWith('.') ? query.extension : '.' + query.extension;
      results = results.filter(a => a.path.endsWith(ext));
    }

    if (query.minSize !== undefined) {
      results = results.filter(a => a.size >= query.minSize!);
    }

    if (query.maxSize !== undefined) {
      results = results.filter(a => a.size <= query.maxSize!);
    }

    if (query.modifiedAfter) {
      results = results.filter(a => a.updatedAt >= query.modifiedAfter!);
    }

    if (query.modifiedBefore) {
      results = results.filter(a => a.updatedAt <= query.modifiedBefore!);
    }

    return results;
  }

  update(id: string, updates: Partial<Asset>): Asset | undefined {
    const asset = this.assets.get(id);
    if (!asset) return undefined;

    const updated = {
      ...asset,
      ...updates,
      updatedAt: new Date(),
    };

    this.assets.set(id, updated);
    this.cache.delete(id); // Invalidar cache

    return updated;
  }

  /**
   * Letter bu — register IDE-authored data assets (items/abilities) without File import.
   * Primary Data-Asset UX path; JSON is cooked payload, not authoring chrome.
   */
  registerAuthoredDataAsset(asset: Asset, cookedPayload?: unknown): Asset {
    const stamped: Asset = {
      ...asset,
      updatedAt: new Date(),
      createdAt: asset.createdAt ?? new Date(),
    };
    this.assets.set(stamped.id, stamped);
    if (cookedPayload !== undefined) {
      this.cache.set(stamped.id, cookedPayload);
    }
    return stamped;
  }

  getCached<T = unknown>(id: string): T | undefined {
    return this.cache.get(id) as T | undefined;
  }

  delete(id: string): boolean {
    const asset = this.assets.get(id);
    if (!asset) return false;

    // Revogar URL se for blob
    if (asset.path.startsWith('blob:')) {
      URL.revokeObjectURL(asset.path);
    }
    if (asset.thumbnail?.startsWith('blob:')) {
      URL.revokeObjectURL(asset.thumbnail);
    }

    this.assets.delete(id);
    this.cache.delete(id);

    return true;
  }

  // ============================================================================
  // LOADING
  // ============================================================================

  async load<T>(id: string): Promise<T | undefined> {
    const asset = this.assets.get(id);
    if (!asset) return undefined;

    // Verificar cache
    if (this.cache.has(id)) {
      return this.cache.get(id) as T;
    }

    // Verificar se já está carregando
    if (this.loadingPromises.has(id)) {
      return this.loadingPromises.get(id) as Promise<T>;
    }

    // Carregar baseado no tipo
    const loadPromise = this.loadAsset(asset);
    this.loadingPromises.set(id, loadPromise);

    try {
      const loaded = await loadPromise;
      this.cache.set(id, loaded);
      return loaded as T;
    } finally {
      this.loadingPromises.delete(id);
    }
  }

  private async loadAsset(asset: Asset): Promise<unknown> {
    switch (asset.type) {
      case 'texture':
      case 'sprite':
        return this.loadTexture(asset);

      case 'audio':
        return this.loadAudio(asset);

      case 'model':
        return this.loadModel(asset);

      case 'video':
        return this.loadVideo(asset);

      case 'data':
        return this.loadData(asset);

      default:
        return asset;
    }
  }

  private async loadTexture(asset: Asset): Promise<THREE.Texture> {
    const loader = new THREE.TextureLoader();
    const texture = await loader.loadAsync(asset.path);

    // Aplicar settings
    const settings = asset.importSettings;
    if (settings.filterMode === 'point') {
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
    }
    if (settings.wrapMode === 'repeat') {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
    }
    if (!settings.generateMipmaps) {
      texture.generateMipmaps = false;
    }

    return texture;
  }

  private async loadAudio(asset: Asset): Promise<AudioBuffer> {
    const response = await fetch(asset.path);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new AudioContext();
    return audioContext.decodeAudioData(arrayBuffer);
  }

  private async loadModel(asset: Asset): Promise<THREE.Group> {
    // Aqui usaríamos GLTFLoader, OBJLoader, etc.
    // Por simplicidade, retornamos grupo vazio
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(asset.path);
    if (asset.importSettings?.optimizeMesh) {
      await this.applyAutoLOD(gltf.scene, {
        minTriangles: 5000,
        maxMeshes: 50,
      });
    }
    return gltf.scene;
  }

  private async applyAutoLOD(
    scene: THREE.Group,
    options: {
      minTriangles?: number;
      maxMeshes?: number;
      config?: Partial<LODConfig>;
    } = {}
  ): Promise<void> {
    const { AutoLODPipeline, DEFAULT_LOD_CONFIG } = await import('@aethel/engine/lod/auto-lod-pipeline');
    const pipeline = new AutoLODPipeline(options.config ?? DEFAULT_LOD_CONFIG);
    const minTriangles = options.minTriangles ?? 5000;
    const maxMeshes = options.maxMeshes ?? Infinity;

    const meshes: THREE.Mesh[] = [];
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      if ((mesh as any).isSkinnedMesh || (mesh as any).isInstancedMesh) return;
      meshes.push(mesh);
    });

    let processed = 0;

    for (const mesh of meshes) {
      if (processed >= maxMeshes) break;

      const geometry = mesh.geometry as THREE.BufferGeometry;
      const index = geometry.getIndex();
      const triangleCount = index ? index.count / 3 : geometry.getAttribute('position')?.count / 3;

      if (!triangleCount || triangleCount < minTriangles || !index) {
        continue;
      }

      try {
        const result = await pipeline.processAsset(geometry.clone());
        const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        const lod = pipeline.createLODObject(result, material as THREE.Material);
        lod.name = mesh.name ? `${mesh.name}_LOD` : 'LOD';
        lod.position.copy(mesh.position);
        lod.rotation.copy(mesh.rotation);
        lod.scale.copy(mesh.scale);
        lod.userData = { ...mesh.userData, lodGenerated: true };

        if (mesh.parent) {
          mesh.parent.add(lod);
          mesh.parent.remove(mesh);
        }

        processed += 1;
      } catch (error) {
        logger.warn('Auto-LOD generation failed:', error);
      }
    }
  }

  private async loadVideo(asset: Asset): Promise<HTMLVideoElement> {
    const video = document.createElement('video');
    video.src = asset.path;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    await video.play();
    return video;
  }

  private async loadData(asset: Asset): Promise<unknown> {
    const response = await fetch(asset.path);
    return response.json();
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  clearCache(): void {
    this.cache.clear();
  }

  getStats(): {
    totalAssets: number;
    totalSize: number;
    byType: Record<AssetType, number>;
  } {
    const stats = {
      totalAssets: this.assets.size,
      totalSize: 0,
      byType: {} as Record<AssetType, number>,
    };

    for (const asset of this.assets.values()) {
      stats.totalSize += asset.size;
      stats.byType[asset.type] = (stats.byType[asset.type] || 0) + 1;
    }

    return stats;
  }

  // ============================================================================
  // EXPORT
  // ============================================================================

  async exportAsset(id: string): Promise<Blob | undefined> {
    const asset = this.assets.get(id);
    if (!asset) return undefined;

    const response = await fetch(asset.path);
    return response.blob();
  }

  exportManifest(): string {
    const manifest = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      assets: Array.from(this.assets.values()).map(asset => ({
        id: asset.id,
        name: asset.name,
        type: asset.type,
        path: asset.path,
        size: asset.size,
        metadata: asset.metadata,
        importSettings: asset.importSettings,
      })),
    };

    return JSON.stringify(manifest, null, 2);
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let pipelineInstance: AssetPipeline | null = null;

export function getAssetPipeline(): AssetPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new AssetPipeline();
  }
  return pipelineInstance;
}

export default AssetPipeline;
