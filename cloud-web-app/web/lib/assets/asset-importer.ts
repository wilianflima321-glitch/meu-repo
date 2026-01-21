/**
 * Asset Importer - Sistema de Importação de Assets
 * 
 * Sistema completo para importar modelos 3D, texturas e outros assets.
 * Suporta GLTF, GLB, FBX, OBJ, HDR, e texturas comuns.
 * 
 * @module lib/assets/asset-importer
 */

import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

// ============================================================================
// TYPES
// ============================================================================

export type AssetType = 
  | 'model' 
  | 'texture' 
  | 'hdri' 
  | 'audio' 
  | 'video' 
  | 'font' 
  | 'data';

export type ModelFormat = 'gltf' | 'glb' | 'fbx' | 'obj';
export type TextureFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'tga';
export type HDRIFormat = 'hdr' | 'exr';
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'aac';

export interface ImportProgress {
  loaded: number;
  total: number;
  percent: number;
  phase: 'loading' | 'parsing' | 'processing' | 'complete' | 'error';
  message: string;
}

export interface ImportOptions {
  generateMipmaps?: boolean;
  flipY?: boolean;
  optimizeMeshes?: boolean;
  mergeMaterials?: boolean;
  computeNormals?: boolean;
  centerModel?: boolean;
  normalizeScale?: boolean;
  targetScale?: number;
  applyTransforms?: boolean;
}

export interface ImportedAsset {
  id: string;
  name: string;
  type: AssetType;
  format: string;
  size: number;
  data: unknown;
  metadata: Record<string, unknown>;
  thumbnail?: string;
  createdAt: Date;
}

export interface ImportedModel extends ImportedAsset {
  type: 'model';
  data: THREE.Object3D;
  animations: THREE.AnimationClip[];
  materials: THREE.Material[];
  textures: THREE.Texture[];
  boundingBox: THREE.Box3;
  triangleCount: number;
  vertexCount: number;
}

export interface ImportedTexture extends ImportedAsset {
  type: 'texture';
  data: THREE.Texture;
  width: number;
  height: number;
  format: string;
  isHDR: boolean;
}

export interface ImportedHDRI extends ImportedAsset {
  type: 'hdri';
  data: THREE.Texture;
  width: number;
  height: number;
}

export interface ImportedAudio extends ImportedAsset {
  type: 'audio';
  data: AudioBuffer;
  duration: number;
  sampleRate: number;
  numberOfChannels: number;
}

// ============================================================================
// LOADERS MANAGER
// ============================================================================

class LoadersManager {
  private static instance: LoadersManager;
  
  private gltfLoader: GLTFLoader;
  private dracoLoader: DRACOLoader;
  private rgbeLoader: RGBELoader;
  private exrLoader: EXRLoader;
  private fbxLoader: FBXLoader;
  private objLoader: OBJLoader;
  private mtlLoader: MTLLoader;
  private textureLoader: THREE.TextureLoader;
  private audioLoader: THREE.AudioLoader;
  private cubeTextureLoader: THREE.CubeTextureLoader;
  
  private loadingManager: THREE.LoadingManager;
  
  private constructor() {
    // Create loading manager with callbacks
    this.loadingManager = new THREE.LoadingManager();
    
    // Initialize Draco loader for compressed GLTF
    this.dracoLoader = new DRACOLoader(this.loadingManager);
    this.dracoLoader.setDecoderPath('/draco/');
    
    // Initialize GLTF loader with Draco
    this.gltfLoader = new GLTFLoader(this.loadingManager);
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
    
    // Initialize other loaders
    this.rgbeLoader = new RGBELoader(this.loadingManager);
    this.exrLoader = new EXRLoader(this.loadingManager);
    this.fbxLoader = new FBXLoader(this.loadingManager);
    this.objLoader = new OBJLoader(this.loadingManager);
    this.mtlLoader = new MTLLoader(this.loadingManager);
    this.textureLoader = new THREE.TextureLoader(this.loadingManager);
    this.audioLoader = new THREE.AudioLoader(this.loadingManager);
    this.cubeTextureLoader = new THREE.CubeTextureLoader(this.loadingManager);
  }
  
  static getInstance(): LoadersManager {
    if (!this.instance) {
      this.instance = new LoadersManager();
    }
    return this.instance;
  }
  
  getGLTFLoader(): GLTFLoader { return this.gltfLoader; }
  getRGBELoader(): RGBELoader { return this.rgbeLoader; }
  getEXRLoader(): EXRLoader { return this.exrLoader; }
  getFBXLoader(): FBXLoader { return this.fbxLoader; }
  getOBJLoader(): OBJLoader { return this.objLoader; }
  getMTLLoader(): MTLLoader { return this.mtlLoader; }
  getTextureLoader(): THREE.TextureLoader { return this.textureLoader; }
  getAudioLoader(): THREE.AudioLoader { return this.audioLoader; }
  getCubeTextureLoader(): THREE.CubeTextureLoader { return this.cubeTextureLoader; }
  getLoadingManager(): THREE.LoadingManager { return this.loadingManager; }
}

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
    const format = this.detectModelFormat(source);
    
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
      this.optimizeMeshes(model);
    }
    
    if (options.computeNormals) {
      this.computeNormals(model);
    }
    
    if (options.centerModel) {
      this.centerModel(model);
    }
    
    if (options.normalizeScale && options.targetScale) {
      this.normalizeScale(model, options.targetScale);
    }
    
    if (options.applyTransforms) {
      this.applyTransforms(model);
    }
    
    // Extract materials and textures
    const materials = this.extractMaterials(model);
    const textures = this.extractTextures(materials);
    
    // Calculate stats
    const { triangleCount, vertexCount } = this.calculateMeshStats(model);
    const boundingBox = new THREE.Box3().setFromObject(model);
    
    // Generate thumbnail
    const thumbnail = await this.generateModelThumbnail(model);
    
    this.emitProgress({
      loaded: 100,
      total: 100,
      percent: 100,
      phase: 'complete',
      message: 'Import complete!',
    });
    
    const imported: ImportedModel = {
      id: this.generateId(),
      name: this.extractName(source),
      type: 'model',
      format,
      size: this.getDataSize(source),
      data: model,
      animations,
      materials,
      textures,
      boundingBox,
      triangleCount,
      vertexCount,
      metadata: {
        animations: animations.length,
        meshCount: this.countMeshes(model),
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
    const format = this.detectTextureFormat(source);
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
      name: this.extractName(source),
      type: 'texture',
      format,
      size: this.getDataSize(source),
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
    const format = this.detectHDRIFormat(source);
    
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
      name: this.extractName(source),
      type: 'hdri',
      format,
      size: this.getDataSize(source),
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
    const format = this.detectAudioFormat(source);
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
      name: this.extractName(source),
      type: 'audio',
      format,
      size: this.getDataSize(source),
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
        const type = this.detectAssetType(file);
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
        console.error(`Failed to import ${file.name}:`, error);
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
  // FORMAT DETECTION
  // ============================================================================
  
  private detectAssetType(source: string | File): AssetType {
    const name = typeof source === 'string' ? source : source.name;
    const ext = this.getExtension(name);
    
    if (['gltf', 'glb', 'fbx', 'obj'].includes(ext)) return 'model';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tga'].includes(ext)) return 'texture';
    if (['hdr', 'exr'].includes(ext)) return 'hdri';
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(ext)) return 'audio';
    if (['mp4', 'webm', 'ogv'].includes(ext)) return 'video';
    if (['ttf', 'otf', 'woff', 'woff2'].includes(ext)) return 'font';
    
    return 'data';
  }
  
  private detectModelFormat(source: string | File | ArrayBuffer): ModelFormat {
    if (source instanceof ArrayBuffer) return 'glb';
    const name = typeof source === 'string' ? source : source.name;
    return this.getExtension(name) as ModelFormat;
  }
  
  private detectTextureFormat(source: string | File): TextureFormat {
    const name = typeof source === 'string' ? source : source.name;
    return this.getExtension(name) as TextureFormat;
  }
  
  private detectHDRIFormat(source: string | File): HDRIFormat {
    const name = typeof source === 'string' ? source : source.name;
    return this.getExtension(name) as HDRIFormat;
  }
  
  private detectAudioFormat(source: string | File): AudioFormat {
    const name = typeof source === 'string' ? source : source.name;
    return this.getExtension(name) as AudioFormat;
  }
  
  private getExtension(name: string): string {
    return name.split('.').pop()?.toLowerCase() || '';
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  private extractName(source: string | File | ArrayBuffer): string {
    if (source instanceof ArrayBuffer) return 'model';
    if (source instanceof File) return source.name.split('.')[0];
    return source.split('/').pop()?.split('.')[0] || 'asset';
  }
  
  private getDataSize(source: string | File | ArrayBuffer): number {
    if (source instanceof ArrayBuffer) return source.byteLength;
    if (source instanceof File) return source.size;
    return 0;
  }
  
  private optimizeMeshes(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        
        // Merge vertices
        geometry.deleteAttribute('tangent');
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
      }
    });
  }
  
  private computeNormals(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.computeVertexNormals();
      }
    });
  }
  
  private centerModel(object: THREE.Object3D): void {
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
  }
  
  private normalizeScale(object: THREE.Object3D, targetScale: number): void {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = targetScale / maxDim;
    object.scale.multiplyScalar(scale);
  }
  
  private applyTransforms(object: THREE.Object3D): void {
    object.updateMatrixWorld(true);
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.applyMatrix4(child.matrixWorld);
        child.position.set(0, 0, 0);
        child.rotation.set(0, 0, 0);
        child.scale.set(1, 1, 1);
        child.updateMatrix();
      }
    });
  }
  
  private extractMaterials(object: THREE.Object3D): THREE.Material[] {
    const materials = new Set<THREE.Material>();
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => materials.add(m));
      }
    });
    
    return Array.from(materials);
  }
  
  private extractTextures(materials: THREE.Material[]): THREE.Texture[] {
    const textures = new Set<THREE.Texture>();
    
    for (const material of materials) {
      if (material instanceof THREE.MeshStandardMaterial) {
        if (material.map) textures.add(material.map);
        if (material.normalMap) textures.add(material.normalMap);
        if (material.roughnessMap) textures.add(material.roughnessMap);
        if (material.metalnessMap) textures.add(material.metalnessMap);
        if (material.aoMap) textures.add(material.aoMap);
        if (material.emissiveMap) textures.add(material.emissiveMap);
        if (material.envMap) textures.add(material.envMap);
      }
    }
    
    return Array.from(textures);
  }
  
  private calculateMeshStats(object: THREE.Object3D): { triangleCount: number; vertexCount: number } {
    let triangleCount = 0;
    let vertexCount = 0;
    
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const geometry = child.geometry;
        const position = geometry.getAttribute('position');
        const index = geometry.getIndex();
        
        if (position) {
          vertexCount += position.count;
        }
        
        if (index) {
          triangleCount += index.count / 3;
        } else if (position) {
          triangleCount += position.count / 3;
        }
      }
    });
    
    return { triangleCount: Math.floor(triangleCount), vertexCount };
  }
  
  private countMeshes(object: THREE.Object3D): number {
    let count = 0;
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) count++;
    });
    return count;
  }
  
  private async generateModelThumbnail(model: THREE.Object3D): Promise<string> {
    // Create offscreen renderer
    const width = 256;
    const height = 256;
    
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(1);
    
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    
    // Add model
    const clone = model.clone();
    scene.add(clone);
    
    // Add lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);
    
    // Calculate camera position
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
    camera.position.set(
      center.x + maxDim * 1.5,
      center.y + maxDim * 0.5,
      center.z + maxDim * 1.5
    );
    camera.lookAt(center);
    
    // Render
    renderer.render(scene, camera);
    
    // Get data URL
    const dataURL = renderer.domElement.toDataURL('image/png');
    
    // Cleanup
    renderer.dispose();
    
    return dataURL;
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

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback, useRef } from 'react';

export function useAssetImporter() {
  const importerRef = useRef<AssetImporter>(new AssetImporter());
  const [progress, setProgress] = useState<ImportProgress | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [lastError, setLastError] = useState<Error | null>(null);
  
  // Setup progress callback
  importerRef.current.onProgress(setProgress);
  
  const importModel = useCallback(async (
    source: string | File | ArrayBuffer,
    options?: ImportOptions
  ): Promise<ImportedModel | null> => {
    setIsImporting(true);
    setLastError(null);
    
    try {
      return await importerRef.current.importModel(source, options);
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);
  
  const importTexture = useCallback(async (
    source: string | File,
    options?: ImportOptions
  ): Promise<ImportedTexture | null> => {
    setIsImporting(true);
    setLastError(null);
    
    try {
      return await importerRef.current.importTexture(source, options);
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);
  
  const importHDRI = useCallback(async (
    source: string | File
  ): Promise<ImportedHDRI | null> => {
    setIsImporting(true);
    setLastError(null);
    
    try {
      return await importerRef.current.importHDRI(source);
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);
  
  const importAudio = useCallback(async (
    source: string | File
  ): Promise<ImportedAudio | null> => {
    setIsImporting(true);
    setLastError(null);
    
    try {
      return await importerRef.current.importAudio(source);
    } catch (error) {
      setLastError(error as Error);
      return null;
    } finally {
      setIsImporting(false);
    }
  }, []);
  
  const importFiles = useCallback(async (
    files: FileList | File[]
  ): Promise<ImportedAsset[]> => {
    setIsImporting(true);
    setLastError(null);
    
    try {
      return await importerRef.current.importFromFiles(files);
    } catch (error) {
      setLastError(error as Error);
      return [];
    } finally {
      setIsImporting(false);
    }
  }, []);
  
  const openFilePicker = useCallback(async (
    accept?: string
  ): Promise<ImportedAsset[]> => {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.accept = accept || '.gltf,.glb,.fbx,.obj,.jpg,.png,.hdr,.exr,.mp3,.wav';
      
      input.onchange = async () => {
        if (input.files && input.files.length > 0) {
          const results = await importFiles(input.files);
          resolve(results);
        } else {
          resolve([]);
        }
      };
      
      input.oncancel = () => resolve([]);
      input.click();
    });
  }, [importFiles]);
  
  return {
    importModel,
    importTexture,
    importHDRI,
    importAudio,
    importFiles,
    openFilePicker,
    progress,
    isImporting,
    lastError,
    getFromCache: (id: string) => importerRef.current.getFromCache(id),
    clearCache: () => importerRef.current.clearCache(),
    getCacheStats: () => importerRef.current.getCacheStats(),
  };
}

export default AssetImporter;
