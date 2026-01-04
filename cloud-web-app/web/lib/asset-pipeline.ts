/**
 * Asset Pipeline Manager - Gerenciador de Assets
 * 
 * Sistema completo para importar, processar e gerenciar assets do projeto.
 * Suporta imagens, áudio, modelos 3D, fontes, vídeos e mais.
 */

import * as THREE from 'three';

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

interface AssetImporter {
  extensions: string[];
  import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult>;
}

const textureImporter: AssetImporter = {
  extensions: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.svg'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;
      
      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'texture';
      }

      // Criar URL temporária
      const url = URL.createObjectURL(blob);
      
      // Carregar imagem para obter dimensões
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url;
      });

      const asset: Asset = {
        id: `texture_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: settings?.textureType === 'sprite' ? 'sprite' : 'texture',
        path: url,
        size: blob.size,
        mimeType: blob.type,
        metadata: {
          width: img.width,
          height: img.height,
          format: blob.type.split('/')[1],
        },
        importSettings: settings || {
          filterMode: 'bilinear',
          wrapMode: 'clamp',
          generateMipmaps: true,
        },
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Gerar thumbnail
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, 128, 128);
      asset.thumbnail = canvas.toDataURL('image/png');

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import texture'],
      };
    }
  },
};

const audioImporter: AssetImporter = {
  extensions: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;
      
      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'audio';
      }

      const url = URL.createObjectURL(blob);
      
      // Carregar áudio para obter duração
      const audio = new Audio();
      await new Promise((resolve, reject) => {
        audio.onloadedmetadata = resolve;
        audio.onerror = reject;
        audio.src = url;
      });

      const asset: Asset = {
        id: `audio_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: 'audio',
        path: url,
        size: blob.size,
        mimeType: blob.type,
        metadata: {
          duration: audio.duration,
          format: blob.type.split('/')[1],
        },
        importSettings: settings || {
          loadType: 'decompress',
          normalize: true,
        },
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import audio'],
      };
    }
  },
};

const modelImporter: AssetImporter = {
  extensions: ['.gltf', '.glb', '.obj', '.fbx', '.dae'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;
      
      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'model';
      }

      const url = URL.createObjectURL(blob);

      // Para modelos, precisaríamos de GLTFLoader ou outros loaders
      // Por enquanto, retornamos asset básico
      const asset: Asset = {
        id: `model_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: 'model',
        path: url,
        size: blob.size,
        mimeType: 'model/gltf-binary',
        metadata: {
          format: fileName.split('.').pop(),
        },
        importSettings: settings || {
          scaleFactor: 1,
          importMaterials: true,
          importAnimations: true,
          optimizeMesh: true,
        },
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import model'],
      };
    }
  },
};

const fontImporter: AssetImporter = {
  extensions: ['.ttf', '.otf', '.woff', '.woff2'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;
      
      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'font';
      }

      const url = URL.createObjectURL(blob);

      const asset: Asset = {
        id: `font_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: 'font',
        path: url,
        size: blob.size,
        mimeType: 'font/' + (fileName.split('.').pop() || 'ttf'),
        metadata: {
          format: fileName.split('.').pop(),
        },
        importSettings: settings || {},
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import font'],
      };
    }
  },
};

const videoImporter: AssetImporter = {
  extensions: ['.mp4', '.webm', '.mov', '.avi'],
  async import(file: File | ArrayBuffer, settings?: ImportSettings): Promise<AssetImportResult> {
    try {
      let blob: Blob;
      let fileName: string;
      
      if (file instanceof File) {
        blob = file;
        fileName = file.name;
      } else {
        blob = new Blob([file]);
        fileName = 'video';
      }

      const url = URL.createObjectURL(blob);
      
      // Carregar vídeo para obter metadados
      const video = document.createElement('video');
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
        video.src = url;
      });

      const asset: Asset = {
        id: `video_${Date.now()}`,
        name: fileName.replace(/\.[^.]+$/, ''),
        type: 'video',
        path: url,
        size: blob.size,
        mimeType: blob.type,
        metadata: {
          width: video.videoWidth,
          height: video.videoHeight,
          duration: video.duration,
          format: blob.type.split('/')[1],
        },
        importSettings: settings || {},
        dependencies: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Gerar thumbnail do primeiro frame
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 72;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, 128, 72);
      asset.thumbnail = canvas.toDataURL('image/png');

      return { success: true, asset };

    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Failed to import video'],
      };
    }
  },
};

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
    return gltf.scene;
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
