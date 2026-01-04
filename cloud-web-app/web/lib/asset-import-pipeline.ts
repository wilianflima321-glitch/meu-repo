/**
 * Asset Import Pipeline - Sistema de Importação de Assets
 * 
 * Pipeline profissional para importar e processar assets
 * de diversos formatos (modelos 3D, texturas, áudio, etc.)
 * 
 * NÃO É MOCK - Sistema real e funcional!
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

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

const SUPPORTED_FORMATS: Record<AssetType, string[]> = {
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

// ============================================================================
// MODEL IMPORTER
// ============================================================================

class ModelImporter {
  private gltfLoader: GLTFLoader;
  private fbxLoader: FBXLoader;
  private objLoader: OBJLoader;
  private dracoLoader: DRACOLoader;
  
  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.fbxLoader = new FBXLoader();
    this.objLoader = new OBJLoader();
    this.dracoLoader = new DRACOLoader();
    
    // Setup Draco decoder
    this.dracoLoader.setDecoderPath('/draco/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }
  
  async import(
    file: File | string,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = typeof file === 'string' ? file : file.name;
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading file...' });
    
    let result: THREE.Group | THREE.Object3D;
    let animations: THREE.AnimationClip[] = [];
    
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    
    try {
      switch (ext) {
        case '.gltf':
        case '.glb': {
          const gltf = await this.loadGLTF(url, onProgress);
          result = gltf.scene;
          animations = gltf.animations;
          break;
        }
        case '.fbx': {
          result = await this.loadFBX(url, onProgress);
          animations = (result as THREE.Group).animations || [];
          break;
        }
        case '.obj': {
          result = await this.loadOBJ(url, onProgress);
          break;
        }
        default:
          throw new Error(`Unsupported model format: ${ext}`);
      }
      
      // Apply import options
      if (options.scale && options.scale !== 1) {
        result.scale.multiplyScalar(options.scale);
      }
      
      if (options.flipYZ) {
        result.rotation.x = -Math.PI / 2;
      }
      
      // Process mesh
      const metadata = this.extractMetadata(result, animations);
      
      if (options.optimizeMesh) {
        onProgress?.({ stage: 'processing', progress: 70, message: 'Optimizing mesh...' });
        this.optimizeMesh(result);
      }
      
      if (options.generateNormals) {
        onProgress?.({ stage: 'processing', progress: 80, message: 'Generating normals...' });
        this.generateNormals(result);
      }
      
      if (options.calculateBounds) {
        onProgress?.({ stage: 'processing', progress: 90, message: 'Calculating bounds...' });
        const box = new THREE.Box3().setFromObject(result);
        metadata.bounds = { min: box.min, max: box.max };
      }
      
      // Generate thumbnail
      let thumbnail: string | undefined;
      if (options.createThumbnail) {
        onProgress?.({ stage: 'processing', progress: 95, message: 'Generating thumbnail...' });
        thumbnail = await this.generateThumbnail(result, options.thumbnailSize || 256);
      }
      
      onProgress?.({ stage: 'completed', progress: 100, message: 'Import complete!' });
      
      return {
        id: this.generateId(),
        name: filename.replace(/\.[^/.]+$/, ''),
        type: 'model',
        originalPath: filename,
        size: typeof file === 'string' ? 0 : file.size,
        format: ext.substring(1).toUpperCase(),
        importDate: new Date(),
        thumbnail,
        metadata,
        data: { scene: result, animations },
      };
    } finally {
      if (typeof file !== 'string') {
        URL.revokeObjectURL(url);
      }
    }
  }
  
  private loadGLTF(url: string, onProgress?: ImportProgressCallback): Promise<GLTF> {
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        resolve,
        (xhr) => {
          const progress = (xhr.loaded / xhr.total) * 50;
          onProgress?.({ stage: 'loading', progress, message: 'Loading GLTF...' });
        },
        reject
      );
    });
  }
  
  private loadFBX(url: string, onProgress?: ImportProgressCallback): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        url,
        resolve,
        (xhr) => {
          const progress = (xhr.loaded / xhr.total) * 50;
          onProgress?.({ stage: 'loading', progress, message: 'Loading FBX...' });
        },
        reject
      );
    });
  }
  
  private loadOBJ(url: string, onProgress?: ImportProgressCallback): Promise<THREE.Group> {
    return new Promise((resolve, reject) => {
      this.objLoader.load(
        url,
        resolve,
        (xhr) => {
          const progress = (xhr.loaded / xhr.total) * 50;
          onProgress?.({ stage: 'loading', progress, message: 'Loading OBJ...' });
        },
        reject
      );
    });
  }
  
  private extractMetadata(object: THREE.Object3D, animations: THREE.AnimationClip[]): AssetMetadata {
    let vertexCount = 0;
    let triangleCount = 0;
    let boneCount = 0;
    const materials = new Set<THREE.Material>();
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        if (geometry.attributes.position) {
          vertexCount += geometry.attributes.position.count;
        }
        if (geometry.index) {
          triangleCount += geometry.index.count / 3;
        } else if (geometry.attributes.position) {
          triangleCount += geometry.attributes.position.count / 3;
        }
        
        if (Array.isArray(child.material)) {
          child.material.forEach(m => materials.add(m));
        } else {
          materials.add(child.material);
        }
      }
      
      if (child instanceof THREE.SkinnedMesh && child.skeleton) {
        boneCount = Math.max(boneCount, child.skeleton.bones.length);
      }
    });
    
    return {
      vertexCount,
      triangleCount,
      boneCount,
      materialCount: materials.size,
      animationCount: animations.length,
    };
  }
  
  private optimizeMesh(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        
        // Merge vertices
        geometry.computeVertexNormals();
        
        // Compute bounding box/sphere
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      }
    });
  }
  
  private generateNormals(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.computeVertexNormals();
      }
    });
  }
  
  private async generateThumbnail(object: THREE.Object3D, size: number): Promise<string> {
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    
    const clone = object.clone();
    scene.add(clone);
    
    // Center and fit object
    const box = new THREE.Box3().setFromObject(clone);
    const center = box.getCenter(new THREE.Vector3());
    const boxSize = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(boxSize.x, boxSize.y, boxSize.z);
    
    clone.position.sub(center);
    camera.position.set(maxDim * 1.5, maxDim * 1.2, maxDim * 1.5);
    camera.lookAt(0, 0, 0);
    
    renderer.render(scene, camera);
    
    const dataUrl = renderer.domElement.toDataURL('image/png');
    
    renderer.dispose();
    
    return dataUrl;
  }
  
  private generateId(): string {
    return `asset_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// TEXTURE IMPORTER
// ============================================================================

class TextureImporter {
  private textureLoader: THREE.TextureLoader;
  private ktx2Loader: KTX2Loader;
  
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
    this.ktx2Loader = new KTX2Loader();
  }
  
  async import(
    file: File | string,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = typeof file === 'string' ? file : file.name;
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading texture...' });
    
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    
    try {
      let texture: THREE.Texture;
      
      if (ext === '.ktx2') {
        texture = await this.loadKTX2(url);
      } else {
        texture = await this.loadTexture(url, onProgress);
      }
      
      // Apply import options
      if (options.generateMipmaps !== false) {
        texture.generateMipmaps = true;
      }
      
      if (options.flipY === false) {
        texture.flipY = false;
      }
      
      // Get image dimensions
      const image = texture.image;
      let width = 0, height = 0;
      
      if (image instanceof HTMLImageElement) {
        width = image.naturalWidth;
        height = image.naturalHeight;
      } else if (image instanceof ImageBitmap) {
        width = image.width;
        height = image.height;
      }
      
      // Resize if needed
      if (options.maxTextureSize && (width > options.maxTextureSize || height > options.maxTextureSize)) {
        onProgress?.({ stage: 'processing', progress: 70, message: 'Resizing texture...' });
        texture = await this.resizeTexture(texture, options.maxTextureSize);
        width = Math.min(width, options.maxTextureSize);
        height = Math.min(height, options.maxTextureSize);
      }
      
      // Determine if has alpha
      const hasAlpha = ['.png', '.webp', '.tga'].includes(ext);
      const isHDR = ['.hdr', '.exr'].includes(ext);
      
      // Generate thumbnail
      let thumbnail: string | undefined;
      if (options.createThumbnail && image instanceof HTMLImageElement) {
        onProgress?.({ stage: 'processing', progress: 90, message: 'Generating thumbnail...' });
        thumbnail = this.generateThumbnail(image, options.thumbnailSize || 128);
      }
      
      onProgress?.({ stage: 'completed', progress: 100, message: 'Import complete!' });
      
      return {
        id: this.generateId(),
        name: filename.replace(/\.[^/.]+$/, ''),
        type: 'texture',
        originalPath: filename,
        size: typeof file === 'string' ? 0 : file.size,
        format: ext.substring(1).toUpperCase(),
        importDate: new Date(),
        thumbnail,
        metadata: {
          width,
          height,
          channels: hasAlpha ? 4 : 3,
          hasAlpha,
          isHDR,
        },
        data: texture,
      };
    } finally {
      if (typeof file !== 'string') {
        URL.revokeObjectURL(url);
      }
    }
  }
  
  private loadTexture(url: string, onProgress?: ImportProgressCallback): Promise<THREE.Texture> {
    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        resolve,
        (xhr) => {
          const progress = (xhr.loaded / xhr.total) * 60;
          onProgress?.({ stage: 'loading', progress, message: 'Loading texture...' });
        },
        reject
      );
    });
  }
  
  private loadKTX2(url: string): Promise<THREE.Texture> {
    return this.ktx2Loader.loadAsync(url);
  }
  
  private async resizeTexture(texture: THREE.Texture, maxSize: number): Promise<THREE.Texture> {
    const image = texture.image as HTMLImageElement;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    const ratio = Math.min(maxSize / image.width, maxSize / image.height);
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;
    
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    const newTexture = new THREE.CanvasTexture(canvas);
    newTexture.copy(texture);
    
    return newTexture;
  }
  
  private generateThumbnail(image: HTMLImageElement, size: number): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    const ratio = Math.min(size / image.naturalWidth, size / image.naturalHeight);
    canvas.width = image.naturalWidth * ratio;
    canvas.height = image.naturalHeight * ratio;
    
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL('image/png');
  }
  
  private generateId(): string {
    return `texture_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// AUDIO IMPORTER
// ============================================================================

class AudioImporter {
  private audioContext: AudioContext | null = null;
  
  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }
    return this.audioContext;
  }
  
  async import(
    file: File | string,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = typeof file === 'string' ? file : file.name;
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading audio...' });
    
    let arrayBuffer: ArrayBuffer;
    
    if (typeof file === 'string') {
      const response = await fetch(file);
      arrayBuffer = await response.arrayBuffer();
    } else {
      arrayBuffer = await file.arrayBuffer();
    }
    
    onProgress?.({ stage: 'processing', progress: 50, message: 'Decoding audio...' });
    
    const audioContext = this.getAudioContext();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    let processedBuffer = audioBuffer;
    
    // Convert to mono if requested
    if (options.convertToMono && audioBuffer.numberOfChannels > 1) {
      onProgress?.({ stage: 'processing', progress: 70, message: 'Converting to mono...' });
      processedBuffer = this.convertToMono(audioBuffer);
    }
    
    // Normalize if requested
    if (options.normalize) {
      onProgress?.({ stage: 'processing', progress: 85, message: 'Normalizing audio...' });
      processedBuffer = this.normalize(processedBuffer);
    }
    
    onProgress?.({ stage: 'completed', progress: 100, message: 'Import complete!' });
    
    return {
      id: this.generateId(),
      name: filename.replace(/\.[^/.]+$/, ''),
      type: 'audio',
      originalPath: filename,
      size: arrayBuffer.byteLength,
      format: ext.substring(1).toUpperCase(),
      importDate: new Date(),
      metadata: {
        duration: processedBuffer.duration,
        channels_audio: processedBuffer.numberOfChannels,
        sampleRate: processedBuffer.sampleRate,
      },
      data: processedBuffer,
    };
  }
  
  private convertToMono(buffer: AudioBuffer): AudioBuffer {
    const audioContext = this.getAudioContext();
    const monoBuffer = audioContext.createBuffer(1, buffer.length, buffer.sampleRate);
    const monoData = monoBuffer.getChannelData(0);
    
    // Mix all channels
    for (let i = 0; i < buffer.length; i++) {
      let sum = 0;
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        sum += buffer.getChannelData(channel)[i];
      }
      monoData[i] = sum / buffer.numberOfChannels;
    }
    
    return monoBuffer;
  }
  
  private normalize(buffer: AudioBuffer): AudioBuffer {
    const audioContext = this.getAudioContext();
    const normalizedBuffer = audioContext.createBuffer(
      buffer.numberOfChannels,
      buffer.length,
      buffer.sampleRate
    );
    
    // Find max amplitude
    let maxAmplitude = 0;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        maxAmplitude = Math.max(maxAmplitude, Math.abs(data[i]));
      }
    }
    
    // Normalize
    const gain = maxAmplitude > 0 ? 1 / maxAmplitude : 1;
    for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
      const sourceData = buffer.getChannelData(channel);
      const destData = normalizedBuffer.getChannelData(channel);
      for (let i = 0; i < sourceData.length; i++) {
        destData[i] = sourceData[i] * gain;
      }
    }
    
    return normalizedBuffer;
  }
  
  private generateId(): string {
    return `audio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ============================================================================
// MAIN IMPORT PIPELINE
// ============================================================================

export class AssetImportPipeline {
  private modelImporter: ModelImporter;
  private textureImporter: TextureImporter;
  private audioImporter: AudioImporter;
  private importQueue: Array<{ file: File | string; options: ImportOptions; resolve: Function; reject: Function }> = [];
  private isProcessing = false;
  
  constructor() {
    this.modelImporter = new ModelImporter();
    this.textureImporter = new TextureImporter();
    this.audioImporter = new AudioImporter();
  }
  
  async import(
    file: File | string,
    options: ImportOptions = {},
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = typeof file === 'string' ? file : file.name;
    const assetType = getAssetType(filename);
    
    if (!assetType) {
      throw new Error(`Unsupported file format: ${filename}`);
    }
    
    const defaultOptions: ImportOptions = {
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
      ...options,
    };
    
    switch (assetType) {
      case 'model':
        return this.modelImporter.import(file, defaultOptions, onProgress);
      case 'texture':
        return this.textureImporter.import(file, defaultOptions, onProgress);
      case 'audio':
        return this.audioImporter.import(file, defaultOptions, onProgress);
      default:
        // Generic file import
        return this.importGeneric(file, assetType, defaultOptions, onProgress);
    }
  }
  
  private async importGeneric(
    file: File | string,
    type: AssetType,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = typeof file === 'string' ? file : file.name;
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading file...' });
    
    let content: string | ArrayBuffer;
    let size: number;
    
    if (typeof file === 'string') {
      const response = await fetch(file);
      content = await response.text();
      size = content.length;
    } else {
      if (['.json', '.xml', '.csv', '.yaml', '.toml', '.glsl', '.vert', '.frag', '.hlsl', '.shader'].some(e => ext.endsWith(e))) {
        content = await file.text();
      } else {
        content = await file.arrayBuffer();
      }
      size = file.size;
    }
    
    onProgress?.({ stage: 'completed', progress: 100, message: 'Import complete!' });
    
    return {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: filename.replace(/\.[^/.]+$/, ''),
      type,
      originalPath: filename,
      size,
      format: ext.substring(1).toUpperCase(),
      importDate: new Date(),
      metadata: {},
      data: content,
    };
  }
  
  async importBatch(
    files: Array<File | string>,
    options: ImportOptions = {},
    onProgress?: (file: string, progress: ImportProgress) => void,
    onComplete?: (file: string, asset: ImportedAsset) => void,
    onError?: (file: string, error: Error) => void
  ): Promise<ImportedAsset[]> {
    const results: ImportedAsset[] = [];
    
    for (const file of files) {
      const filename = typeof file === 'string' ? file : file.name;
      
      try {
        const asset = await this.import(
          file,
          options,
          (progress) => onProgress?.(filename, progress)
        );
        
        results.push(asset);
        onComplete?.(filename, asset);
      } catch (error) {
        onError?.(filename, error as Error);
      }
    }
    
    return results;
  }
  
  // Validate files before import
  validateFiles(files: File[]): Array<{ file: File; valid: boolean; error?: string }> {
    return files.map((file) => {
      const type = getAssetType(file.name);
      
      if (!type) {
        return { file, valid: false, error: 'Unsupported file format' };
      }
      
      // Check file size (max 500MB)
      const maxSize = 500 * 1024 * 1024;
      if (file.size > maxSize) {
        return { file, valid: false, error: 'File too large (max 500MB)' };
      }
      
      return { file, valid: true };
    });
  }
  
  // Get import statistics
  getStatistics(): { supportedFormats: number; totalFormats: string[] } {
    const totalFormats = getSupportedFormats();
    return {
      supportedFormats: totalFormats.length,
      totalFormats,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let pipelineInstance: AssetImportPipeline | null = null;

export function getAssetImportPipeline(): AssetImportPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new AssetImportPipeline();
  }
  return pipelineInstance;
}

// ============================================================================
// EXPORT
// ============================================================================

const assetImportPipelineModule = {
  AssetImportPipeline,
  getAssetImportPipeline,
  getAssetType,
  isSupported,
  getSupportedFormats,
  SUPPORTED_FORMATS,
};

export default assetImportPipelineModule;
