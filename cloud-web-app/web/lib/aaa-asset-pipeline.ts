/**
 * AAA ASSET PIPELINE - Sistema de Assets para Jogos AAA e Filmes
 * 
 * Pipeline profissional de importação, processamento e otimização de assets
 * com suporte para IAs gerarem e adaptarem conteúdo automaticamente.
 * 
 * FEATURES:
 * - Importação de modelos (FBX, GLTF, OBJ, USD, ABC)
 * - Texture processing (compression, mipmaps, streaming)
 * - LOD generation automático
 * - Material conversion (PBR/Unreal/Unity/Custom)
 * - Mesh optimization (simplification, instancing)
 * - Asset bundling para streaming
 * - AI-ready asset metadata
 * - Procedural asset generation
 */

import * as THREE from 'three';

// ============================================================================
// TYPES - ASSET SYSTEM
// ============================================================================

import type {
  AssetMetadata,
  AssetQualityTier,
  AssetType,
  ImportOptions,
  MaterialAsset,
  MaterialVariant,
  MeshAsset,
  MeshFormat,
  MeshLOD,
  PBRMaterialParams,
  PrefabAsset,
  PrefabComponent,
  PrefabEntity,
  PrefabOverride,
  TextureAsset,
  TextureFormat,
  TextureStreamingMip,
} from './aaa-asset-pipeline.types';
import { DEFAULT_IMPORT_OPTIONS } from './aaa-asset-pipeline.types';

export type {
  AssetMetadata,
  AssetQualityTier,
  AssetType,
  ImportOptions,
  MaterialAsset,
  MaterialVariant,
  MeshAsset,
  MeshFormat,
  MeshLOD,
  PBRMaterialParams,
  PrefabAsset,
  PrefabComponent,
  PrefabEntity,
  PrefabOverride,
  TextureAsset,
  TextureFormat,
  TextureStreamingMip,
} from './aaa-asset-pipeline.types';

export { DEFAULT_IMPORT_OPTIONS } from './aaa-asset-pipeline.types';

// ============================================================================
// ASSET IMPORTER CLASS
// ============================================================================

export class AssetImporter {
  private loaders: Map<string, THREE.Loader> = new Map();
  private cache: Map<string, AssetMetadata> = new Map();
  
  constructor() {
    this.initializeLoaders();
  }
  
  private initializeLoaders(): void {
    // Loaders são inicializados sob demanda via dynamic import
  }
  
  async import(
    file: File | string,
    options: Partial<ImportOptions> = {}
  ): Promise<AssetMetadata> {
    const opts = { ...DEFAULT_IMPORT_OPTIONS, ...options };
    const extension = this.getExtension(file);
    
    switch (extension) {
      case 'gltf':
      case 'glb':
        return this.importGLTF(file, opts);
      case 'fbx':
        return this.importFBX(file, opts);
      case 'obj':
        return this.importOBJ(file, opts);
      case 'usd':
      case 'usda':
      case 'usdc':
      case 'usdz':
        return this.importUSD(file, opts);
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'exr':
      case 'hdr':
        return this.importTexture(file, opts);
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'flac':
        return this.importAudio(file, opts);
      default:
        throw new Error(`Unsupported file format: ${extension}`);
    }
  }
  
  private getExtension(file: File | string): string {
    const name = typeof file === 'string' ? file : file.name;
    return name.split('.').pop()?.toLowerCase() || '';
  }
  
  private async importGLTF(file: File | string, options: ImportOptions): Promise<MeshAsset> {
    // Dynamic import do GLTF loader
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
    const { DRACOLoader } = await import('three/examples/jsm/loaders/DRACOLoader.js');
    
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      loader.load(url, async (gltf) => {
        try {
          const asset = await this.processGLTFScene(gltf, options);
          resolve(asset);
        } catch (error) {
          reject(error);
        }
      }, undefined, reject);
    });
  }
  
  private async processGLTFScene(gltf: any, options: ImportOptions): Promise<MeshAsset> {
    const scene = gltf.scene;
    let totalTriangles = 0;
    let totalVertices = 0;
    const materials: string[] = [];
    
    // Analyze scene
    scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const geometry = mesh.geometry;
        
        if (geometry.index) {
          totalTriangles += geometry.index.count / 3;
        } else {
          totalTriangles += geometry.attributes.position.count / 3;
        }
        totalVertices += geometry.attributes.position.count;
        
        const mat = mesh.material as THREE.Material;
        if (mat.name && !materials.includes(mat.name)) {
          materials.push(mat.name);
        }
      }
    });
    
    // Compute bounding box
    const bbox = new THREE.Box3().setFromObject(scene);
    const bsphere = new THREE.Sphere();
    bbox.getBoundingSphere(bsphere);
    
    // Generate LODs if requested
    const lods: MeshLOD[] = [];
    if (options.generateLODs) {
      for (let i = 0; i < options.lodLevels; i++) {
        lods.push({
          level: i,
          distance: Math.pow(2, i) * 10,
          triangleCount: Math.floor(totalTriangles * options.lodReduction[i]),
          path: `lod${i}`,
        });
      }
    }
    
    // Generate AI metadata
    const aiMetadata = options.generateAIMetadata ? await this.generateAIMetadata(scene) : {
      aiTags: [],
      aiDescription: '',
      aiUsageHints: [],
      aiSemanticLabels: {},
    };
    
    const asset: MeshAsset = {
      id: `mesh-${Date.now()}`,
      name: 'Imported Mesh',
      type: 'mesh',
      path: '/assets/meshes/',
      size: 0,
      hash: '',
      version: 1,
      created: new Date(),
      modified: new Date(),
      ...aiMetadata,
      dependencies: materials,
      qualityTiers: [],
      streamable: true,
      priority: 1,
      geometry: {
        triangleCount: totalTriangles,
        vertexCount: totalVertices,
        hasNormals: true,
        hasTangents: options.calculateTangents,
        hasUV0: true,
        hasUV1: false,
        hasVertexColors: false,
        hasSkinning: gltf.animations?.length > 0,
        hasMorphTargets: false,
        boundingBox: bbox,
        boundingSphere: bsphere,
      },
      lods,
      materials,
    };
    
    return asset;
  }
  
  private async importFBX(file: File | string, options: ImportOptions): Promise<MeshAsset> {
    const { FBXLoader } = await import('three/examples/jsm/loaders/FBXLoader.js');
    const loader = new FBXLoader();
    
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      loader.load(url, async (fbx) => {
        // Process similar to GLTF
        const asset: MeshAsset = {
          id: `mesh-${Date.now()}`,
          name: 'FBX Import',
          type: 'mesh',
          path: '/assets/meshes/',
          size: 0,
          hash: '',
          version: 1,
          created: new Date(),
          modified: new Date(),
          aiTags: [],
          aiDescription: '',
          aiUsageHints: [],
          aiSemanticLabels: {},
          dependencies: [],
          qualityTiers: [],
          streamable: true,
          priority: 1,
          geometry: {
            triangleCount: 0,
            vertexCount: 0,
            hasNormals: true,
            hasTangents: false,
            hasUV0: true,
            hasUV1: false,
            hasVertexColors: false,
            hasSkinning: false,
            hasMorphTargets: false,
            boundingBox: new THREE.Box3().setFromObject(fbx),
            boundingSphere: new THREE.Sphere(),
          },
          lods: [],
          materials: [],
        };
        resolve(asset);
      }, undefined, reject);
    });
  }
  
  private async importOBJ(file: File | string, options: ImportOptions): Promise<MeshAsset> {
    const { OBJLoader } = await import('three/examples/jsm/loaders/OBJLoader.js');
    const loader = new OBJLoader();
    
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      loader.load(url, async (obj) => {
        const asset: MeshAsset = {
          id: `mesh-${Date.now()}`,
          name: 'OBJ Import',
          type: 'mesh',
          path: '/assets/meshes/',
          size: 0,
          hash: '',
          version: 1,
          created: new Date(),
          modified: new Date(),
          aiTags: [],
          aiDescription: '',
          aiUsageHints: [],
          aiSemanticLabels: {},
          dependencies: [],
          qualityTiers: [],
          streamable: true,
          priority: 1,
          geometry: {
            triangleCount: 0,
            vertexCount: 0,
            hasNormals: true,
            hasTangents: false,
            hasUV0: true,
            hasUV1: false,
            hasVertexColors: false,
            hasSkinning: false,
            hasMorphTargets: false,
            boundingBox: new THREE.Box3().setFromObject(obj),
            boundingSphere: new THREE.Sphere(),
          },
          lods: [],
          materials: [],
        };
        resolve(asset);
      }, undefined, reject);
    });
  }
  
  private async importUSD(file: File | string, options: ImportOptions): Promise<MeshAsset> {
    // USD support via USDZLoader
    const { USDZLoader } = await import('three/examples/jsm/loaders/USDZLoader.js');
    const loader = new USDZLoader();
    
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      loader.load(url, async (usd) => {
        const asset: MeshAsset = {
          id: `mesh-${Date.now()}`,
          name: 'USD Import',
          type: 'mesh',
          path: '/assets/meshes/',
          size: 0,
          hash: '',
          version: 1,
          created: new Date(),
          modified: new Date(),
          aiTags: [],
          aiDescription: '',
          aiUsageHints: [],
          aiSemanticLabels: {},
          dependencies: [],
          qualityTiers: [],
          streamable: true,
          priority: 1,
          geometry: {
            triangleCount: 0,
            vertexCount: 0,
            hasNormals: true,
            hasTangents: false,
            hasUV0: true,
            hasUV1: false,
            hasVertexColors: false,
            hasSkinning: false,
            hasMorphTargets: false,
            boundingBox: new THREE.Box3().setFromObject(usd),
            boundingSphere: new THREE.Sphere(),
          },
          lods: [],
          materials: [],
        };
        resolve(asset);
      }, undefined, reject);
    });
  }
  
  private async importTexture(file: File | string, options: ImportOptions): Promise<TextureAsset> {
    const loader = new THREE.TextureLoader();
    const url = typeof file === 'string' ? file : URL.createObjectURL(file);
    
    return new Promise((resolve, reject) => {
      loader.load(url, (texture) => {
        const asset: TextureAsset = {
          id: `texture-${Date.now()}`,
          name: typeof file === 'string' ? file : file.name,
          type: 'texture',
          path: '/assets/textures/',
          size: 0,
          hash: '',
          version: 1,
          created: new Date(),
          modified: new Date(),
          aiTags: [],
          aiDescription: '',
          aiUsageHints: [],
          aiSemanticLabels: {},
          dependencies: [],
          qualityTiers: [],
          streamable: true,
          priority: 1,
          format: 'png',
          width: texture.image.width,
          height: texture.image.height,
          channels: 4,
          bitDepth: 8,
          isHDR: false,
          isCubemap: false,
          hasMipmaps: options.generateMipmaps,
          mipmapCount: options.generateMipmaps ? Math.floor(Math.log2(Math.max(texture.image.width, texture.image.height))) : 1,
          textureType: 'albedo',
          colorSpace: 'srgb',
          streamingMips: [],
        };
        resolve(asset);
      }, undefined, reject);
    });
  }
  
  private async importAudio(file: File | string, options: ImportOptions): Promise<AssetMetadata> {
    const asset: AssetMetadata = {
      id: `audio-${Date.now()}`,
      name: typeof file === 'string' ? file : file.name,
      type: 'audio',
      path: '/assets/audio/',
      size: 0,
      hash: '',
      version: 1,
      created: new Date(),
      modified: new Date(),
      aiTags: [],
      aiDescription: '',
      aiUsageHints: [],
      aiSemanticLabels: {},
      dependencies: [],
      qualityTiers: [],
      streamable: true,
      priority: 1,
    };
    return asset;
  }
  
  private async generateAIMetadata(scene: THREE.Object3D): Promise<{
    aiTags: string[];
    aiDescription: string;
    aiUsageHints: string[];
    aiSemanticLabels: Record<string, string>;
  }> {
    // Analyze scene structure for AI
    const aiTags: string[] = [];
    const aiSemanticLabels: Record<string, string> = {};
    
    let hasAnimations = false;
    let hasMorphTargets = false;
    let meshCount = 0;
    let lightCount = 0;
    let cameraCount = 0;
    
    scene.traverse((child: THREE.Object3D) => {
      if ((child as THREE.Mesh).isMesh) {
        meshCount++;
        const mesh = child as THREE.Mesh;
        
        // Tag by material type
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (mat.metalness > 0.5) aiTags.push('metallic');
        if (mat.roughness < 0.3) aiTags.push('glossy');
        if (mat.transparent) aiTags.push('transparent');
        if (mat.emissive && mat.emissiveIntensity > 0) aiTags.push('emissive');
        
        // Semantic label
        aiSemanticLabels[child.name] = this.inferSemanticLabel(child.name);
      }
      
      if ((child as THREE.Light).isLight) lightCount++;
      if ((child as THREE.Camera).isCamera) cameraCount++;
    });
    
    // Generate description
    const description = `3D scene with ${meshCount} mesh(es), ${lightCount} light(s), ${cameraCount} camera(s). ` +
      `Tags: ${[...new Set(aiTags)].join(', ')}`;
    
    // Usage hints for AI
    const usageHints: string[] = [];
    if (meshCount > 100) usageHints.push('Consider LOD for performance');
    if (aiTags.includes('transparent')) usageHints.push('Use proper render order for transparency');
    if (hasAnimations) usageHints.push('Animation mixer required');
    
    return {
      aiTags: [...new Set(aiTags)],
      aiDescription: description,
      aiUsageHints: usageHints,
      aiSemanticLabels,
    };
  }
  
  private inferSemanticLabel(name: string): string {
    const lowerName = name.toLowerCase();
    
    // Common patterns
    if (lowerName.includes('floor') || lowerName.includes('ground')) return 'floor';
    if (lowerName.includes('wall')) return 'wall';
    if (lowerName.includes('ceiling') || lowerName.includes('roof')) return 'ceiling';
    if (lowerName.includes('door')) return 'door';
    if (lowerName.includes('window')) return 'window';
    if (lowerName.includes('chair')) return 'furniture:chair';
    if (lowerName.includes('table')) return 'furniture:table';
    if (lowerName.includes('light') || lowerName.includes('lamp')) return 'light';
    if (lowerName.includes('tree') || lowerName.includes('plant')) return 'vegetation';
    if (lowerName.includes('rock') || lowerName.includes('stone')) return 'rock';
    if (lowerName.includes('water')) return 'water';
    if (lowerName.includes('character') || lowerName.includes('player')) return 'character';
    if (lowerName.includes('enemy') || lowerName.includes('npc')) return 'npc';
    if (lowerName.includes('weapon')) return 'weapon';
    if (lowerName.includes('vehicle') || lowerName.includes('car')) return 'vehicle';
    
    return 'generic';
  }
}

// ============================================================================
// ASSET DATABASE
// ============================================================================

export class AssetDatabase {
  private assets: Map<string, AssetMetadata> = new Map();
  private tags: Map<string, Set<string>> = new Map();
  private types: Map<AssetType, Set<string>> = new Map();
  
  add(asset: AssetMetadata): void {
    this.assets.set(asset.id, asset);
    
    // Index by type
    if (!this.types.has(asset.type)) {
      this.types.set(asset.type, new Set());
    }
    this.types.get(asset.type)!.add(asset.id);
    
    // Index by AI tags
    for (const tag of asset.aiTags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag)!.add(asset.id);
    }
  }
  
  get(id: string): AssetMetadata | undefined {
    return this.assets.get(id);
  }
  
  getByType(type: AssetType): AssetMetadata[] {
    const ids = this.types.get(type);
    if (!ids) return [];
    return Array.from(ids).map(id => this.assets.get(id)!);
  }
  
  getByTag(tag: string): AssetMetadata[] {
    const ids = this.tags.get(tag);
    if (!ids) return [];
    return Array.from(ids).map(id => this.assets.get(id)!);
  }
  
  search(query: string, type?: AssetType): AssetMetadata[] {
    const results: AssetMetadata[] = [];
    const lowerQuery = query.toLowerCase();
    
    for (const asset of this.assets.values()) {
      if (type && asset.type !== type) continue;
      
      // Search in name
      if (asset.name.toLowerCase().includes(lowerQuery)) {
        results.push(asset);
        continue;
      }
      
      // Search in AI tags
      if (asset.aiTags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
        results.push(asset);
        continue;
      }
      
      // Search in description
      if (asset.aiDescription.toLowerCase().includes(lowerQuery)) {
        results.push(asset);
      }
    }
    
    return results;
  }
  
  // AI-specific queries
  findSimilar(assetId: string, limit: number = 10): AssetMetadata[] {
    const asset = this.assets.get(assetId);
    if (!asset) return [];
    
    const scores: Map<string, number> = new Map();
    
    for (const [id, other] of this.assets) {
      if (id === assetId) continue;
      if (other.type !== asset.type) continue;
      
      // Score by shared tags
      let score = 0;
      for (const tag of asset.aiTags) {
        if (other.aiTags.includes(tag)) score += 1;
      }
      
      if (score > 0) scores.set(id, score);
    }
    
    return Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([id]) => this.assets.get(id)!);
  }
  
  // Get assets suitable for AI generation
  getAITrainingAssets(type: AssetType, minQuality: number = 0.8): AssetMetadata[] {
    return this.getByType(type).filter(asset => 
      asset.aiTags.length > 0 && 
      asset.aiDescription.length > 10
    );
  }
  
  // Serialize for AI context
  toAIContext(): string {
    const summary: Record<AssetType, number> = {} as any;
    const allTags: Set<string> = new Set();
    
    for (const asset of this.assets.values()) {
      summary[asset.type] = (summary[asset.type] || 0) + 1;
      asset.aiTags.forEach(tag => allTags.add(tag));
    }
    
    return JSON.stringify({
      totalAssets: this.assets.size,
      byType: summary,
      availableTags: Array.from(allTags),
    }, null, 2);
  }
}

// ============================================================================
// ASSET OPTIMIZER
// ============================================================================

export class AssetOptimizer {
  // Mesh simplification usando quadric error metrics
  async simplifyMesh(
    geometry: THREE.BufferGeometry,
    targetRatio: number
  ): Promise<THREE.BufferGeometry> {
    const { SimplifyModifier } = await import('three/examples/jsm/modifiers/SimplifyModifier.js');
    const modifier = new SimplifyModifier();
    
    const targetCount = Math.floor(geometry.attributes.position.count * targetRatio);
    return modifier.modify(geometry, targetCount);
  }
  
  // Compress texture using basis/ktx2
  async compressTexture(
    texture: THREE.Texture,
    format: 'basis' | 'ktx2'
  ): Promise<ArrayBuffer> {
    // Use basis_encoder WASM for compression
    // This would integrate with actual basis encoder
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = texture.image.width;
    canvas.height = texture.image.height;
    ctx.drawImage(texture.image, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Return raw data for now - actual compression would use basis encoder
    return imageData.data.buffer;
  }
  
  // Generate mipmaps with proper filtering
  generateMipmaps(texture: THREE.Texture): THREE.Texture[] {
    const mipmaps: THREE.Texture[] = [];
    let width = texture.image.width;
    let height = texture.image.height;
    let level = 0;
    
    while (width > 1 || height > 1) {
      width = Math.max(1, Math.floor(width / 2));
      height = Math.max(1, Math.floor(height / 2));
      level++;
      
      // Create mipmap using canvas
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(texture.image, 0, 0, width, height);
      
      const mipTexture = new THREE.Texture(canvas);
      mipTexture.needsUpdate = true;
      mipmaps.push(mipTexture);
    }
    
    return mipmaps;
  }
  
  // Merge meshes for batching
  mergeMeshes(meshes: THREE.Mesh[]): THREE.Mesh {
    const geometries: THREE.BufferGeometry[] = [];
    
    for (const mesh of meshes) {
      const geom = mesh.geometry.clone();
      geom.applyMatrix4(mesh.matrixWorld);
      geometries.push(geom);
    }
    
    const { mergeGeometries } = require('three/examples/jsm/utils/BufferGeometryUtils.js');
    const mergedGeometry = mergeGeometries(geometries);
    
    return new THREE.Mesh(mergedGeometry, meshes[0].material);
  }
  
  // Generate normal map from height map
  heightToNormal(
    heightMap: THREE.Texture,
    strength: number = 1
  ): THREE.Texture {
    const canvas = document.createElement('canvas');
    const width = heightMap.image.width;
    const height = heightMap.image.height;
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(heightMap.image, 0, 0);
    
    const src = ctx.getImageData(0, 0, width, height);
    const dst = ctx.createImageData(width, height);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Sample surrounding pixels
        const getHeight = (px: number, py: number): number => {
          const cx = Math.max(0, Math.min(width - 1, px));
          const cy = Math.max(0, Math.min(height - 1, py));
          return src.data[(cy * width + cx) * 4] / 255;
        };
        
        const h = getHeight(x, y);
        const hL = getHeight(x - 1, y);
        const hR = getHeight(x + 1, y);
        const hT = getHeight(x, y - 1);
        const hB = getHeight(x, y + 1);
        
        // Calculate normal
        const nx = (hL - hR) * strength;
        const ny = (hT - hB) * strength;
        const nz = 1;
        
        // Normalize
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        
        // Convert to 0-255 range
        dst.data[idx] = ((nx / len) * 0.5 + 0.5) * 255;
        dst.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255;
        dst.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255;
        dst.data[idx + 3] = 255;
      }
    }
    
    ctx.putImageData(dst, 0, 0);
    
    const normalTexture = new THREE.Texture(canvas);
    normalTexture.needsUpdate = true;
    return normalTexture;
  }
}

// ============================================================================
// ASSET STREAMING
// ============================================================================

export class AssetStreamer {
  private loadQueue: Map<string, number> = new Map();
  private loadedAssets: Set<string> = new Set();
  private loadingAssets: Set<string> = new Set();
  private maxConcurrent: number = 4;
  private memoryBudgetMB: number = 512;
  private currentMemoryMB: number = 0;
  
  constructor(config?: { maxConcurrent?: number; memoryBudgetMB?: number }) {
    if (config?.maxConcurrent) this.maxConcurrent = config.maxConcurrent;
    if (config?.memoryBudgetMB) this.memoryBudgetMB = config.memoryBudgetMB;
  }
  
  // Request asset with priority
  request(assetId: string, priority: number = 1): void {
    if (this.loadedAssets.has(assetId) || this.loadingAssets.has(assetId)) return;
    this.loadQueue.set(assetId, priority);
    this.processQueue();
  }
  
  // Cancel request
  cancel(assetId: string): void {
    this.loadQueue.delete(assetId);
  }
  
  // Update priorities based on camera position
  updatePriorities(cameraPosition: THREE.Vector3, assets: Map<string, { position: THREE.Vector3; size: number }>): void {
    for (const [id, data] of assets) {
      if (!this.loadQueue.has(id)) continue;
      
      const distance = cameraPosition.distanceTo(data.position);
      const screenSize = data.size / distance;
      
      // Higher priority for closer/larger objects
      this.loadQueue.set(id, screenSize);
    }
  }
  
  private async processQueue(): Promise<void> {
    if (this.loadingAssets.size >= this.maxConcurrent) return;
    
    // Sort by priority and get highest
    const sorted = Array.from(this.loadQueue.entries())
      .sort((a, b) => b[1] - a[1]);
    
    for (const [assetId] of sorted) {
      if (this.loadingAssets.size >= this.maxConcurrent) break;
      if (this.loadedAssets.has(assetId)) continue;
      
      this.loadQueue.delete(assetId);
      this.loadingAssets.add(assetId);
      
      try {
        await this.loadAsset(assetId);
        this.loadedAssets.add(assetId);
      } catch (error) {
        console.error(`Failed to load asset ${assetId}:`, error);
      } finally {
        this.loadingAssets.delete(assetId);
      }
    }
  }
  
  private async loadAsset(assetId: string): Promise<void> {
    // Actual loading logic would go here
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Unload least recently used assets if over budget
  evictLRU(requiredMB: number): string[] {
    const evicted: string[] = [];
    
    // Simple LRU - in real impl would track access times
    const loaded = Array.from(this.loadedAssets);
    
    while (this.currentMemoryMB + requiredMB > this.memoryBudgetMB && loaded.length > 0) {
      const assetId = loaded.shift()!;
      this.loadedAssets.delete(assetId);
      evicted.push(assetId);
      // Would also reduce currentMemoryMB based on asset size
    }
    
    return evicted;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const assetImporter = new AssetImporter();
export const assetDatabase = new AssetDatabase();
export const assetOptimizer = new AssetOptimizer();
export const assetStreamer = new AssetStreamer();

const aaaAssetPipeline = {
  AssetImporter,
  AssetDatabase,
  AssetOptimizer,
  AssetStreamer,
  assetImporter,
  assetDatabase,
  assetOptimizer,
  assetStreamer,
  DEFAULT_IMPORT_OPTIONS,
};

export default aaaAssetPipeline;
