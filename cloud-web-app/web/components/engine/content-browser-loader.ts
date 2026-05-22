// @aethel-heavy-async-boundary: Studio-only asset loading path for mesh/audio/texture previews.
import { logger } from '@/lib/observability/logger';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import type { Asset } from './content-browser-core';

// ============================================================================
// ASSET THUMBNAIL GENERATOR
// ============================================================================
class ThumbnailGenerator {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 256;
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(2, 2, 2);
    this.camera.lookAt(0, 0, 0);
    
    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);
    
    const directional = new THREE.DirectionalLight(0xffffff, 1);
    directional.position.set(5, 5, 5);
    this.scene.add(directional);
  }
  
  private getRenderer(): THREE.WebGLRenderer {
    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({ 
        canvas: this.canvas, 
        antialias: true,
        alpha: true 
      });
      this.renderer.setSize(256, 256);
    }
    return this.renderer;
  }
  
  async generateMeshThumbnail(mesh: THREE.Object3D): Promise<string> {
    // Clear previous objects
    while (this.scene.children.length > 2) {
      this.scene.remove(this.scene.children[this.scene.children.length - 1]);
    }
    
    // Center and scale mesh
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    
    mesh.position.sub(center);
    mesh.scale.multiplyScalar(2 / maxDim);
    
    this.scene.add(mesh);
    
    // Render
    const renderer = this.getRenderer();
    renderer.render(this.scene, this.camera);
    
    return this.canvas.toDataURL('image/png');
  }
  
  async generateTextureThumbnail(texture: THREE.Texture): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    
    if (texture.image) {
      ctx.drawImage(texture.image, 0, 0, 256, 256);
    }
    
    return canvas.toDataURL('image/png');
  }
  
  dispose(): void {
    this.renderer?.dispose();
  }
}

// ============================================================================
// ASSET LOADER
// ============================================================================

export class AssetLoader {
  private gltfLoader = new GLTFLoader();
  private fbxLoader = new FBXLoader();
  private objLoader = new OBJLoader();
  private textureLoader = new THREE.TextureLoader();
  private audioLoader = new THREE.AudioLoader();
  private thumbnailGenerator = new ThumbnailGenerator();
  
  private loadingAssets: Map<string, Promise<unknown>> = new Map();
  private cache: Map<string, unknown> = new Map();
  
  async loadAsset(asset: Asset): Promise<unknown> {
    // Check cache
    if (this.cache.has(asset.id)) {
      return this.cache.get(asset.id);
    }
    
    // Check if already loading
    if (this.loadingAssets.has(asset.id)) {
      return this.loadingAssets.get(asset.id);
    }
    
    const loadPromise = this.doLoadAsset(asset);
    this.loadingAssets.set(asset.id, loadPromise);
    
    try {
      const result = await loadPromise;
      this.cache.set(asset.id, result);
      return result;
    } finally {
      this.loadingAssets.delete(asset.id);
    }
  }
  
  private async doLoadAsset(asset: Asset): Promise<unknown> {
    const ext = asset.path.toLowerCase().substring(asset.path.lastIndexOf('.'));
    
    switch (ext) {
      case '.gltf':
      case '.glb':
        return new Promise((resolve, reject) => {
          this.gltfLoader.load(asset.path, resolve, undefined, reject);
        });
        
      case '.fbx':
        return new Promise((resolve, reject) => {
          this.fbxLoader.load(asset.path, resolve, undefined, reject);
        });
        
      case '.obj':
        return new Promise((resolve, reject) => {
          this.objLoader.load(asset.path, resolve, undefined, reject);
        });
        
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.webp':
        return new Promise((resolve, reject) => {
          this.textureLoader.load(asset.path, resolve, undefined, reject);
        });
        
      case '.mp3':
      case '.wav':
      case '.ogg':
        return new Promise((resolve, reject) => {
          this.audioLoader.load(asset.path, resolve, undefined, reject);
        });
        
      default:
        throw new Error(`Unsupported asset type: ${ext}`);
    }
  }
  
  async generateThumbnail(asset: Asset): Promise<string | undefined> {
    try {
      const loaded = await this.loadAsset(asset);
      
      if (asset.type === 'mesh' && loaded) {
        const object = (loaded as { scene?: THREE.Object3D }).scene || loaded as THREE.Object3D;
        return await this.thumbnailGenerator.generateMeshThumbnail(object.clone());
      }
      
      if (asset.type === 'texture' && loaded) {
        return await this.thumbnailGenerator.generateTextureThumbnail(loaded as THREE.Texture);
      }
    } catch (e) {
      logger.error('Failed to generate thumbnail:', e);
    }
    
    return undefined;
  }
  
  clearCache(): void {
    this.cache.clear();
  }
  
  dispose(): void {
    this.cache.clear();
    this.thumbnailGenerator.dispose();
  }
}
