/**
 * AAA Asset Pipeline - split runtime modules.
 *
 * Asset import, database, optimization, and streaming stay behind Studio/Local
 * runtime boundaries until capability and provenance evidence is available.
 */

// @aethel-heavy-async-boundary Studio/asset import runtime; do not import from public route shells.
import * as THREE from 'three';
import { DEFAULT_IMPORT_OPTIONS } from './types';
import type { AssetMetadata, GLTFLike, ImportOptions, MeshAsset, MeshLOD, TextureAsset } from './types';

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
  
  private async processGLTFScene(gltf: GLTFLike, options: ImportOptions): Promise<MeshAsset> {
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
        hasSkinning: (gltf.animations?.length ?? 0) > 0,
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
