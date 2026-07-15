// @aethel-heavy-async-boundary
import * as THREE from 'three';
import { GLTFLoader, GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { AudioImporter } from './asset-import-pipeline-audio';
import { getAssetType, getSupportedFormats, isSupported, SUPPORTED_FORMATS } from './asset-import-pipeline-contracts';
import { TextureImporter } from './asset-import-pipeline-texture';
import {
  createAssetImportId,
  getImportDisplayName,
  getImportExtension,
  getImportFileName,
  resolveImportOptions,
  shouldReadGenericAssetAsText,
} from './asset-import-pipeline-runtime';
import { getImportStatistics, validateImportFiles } from './asset-import-pipeline-validation';
import type { AssetMetadata, AssetType, ImportOptions, ImportProgress, ImportProgressCallback, ImportedAsset } from './asset-import-pipeline-contracts';
export { getAssetType, getSupportedFormats, isSupported, SUPPORTED_FORMATS } from './asset-import-pipeline-contracts';
export type { AssetMetadata, AssetType, ImportOptions, ImportProgress, ImportProgressCallback, ImportedAsset, ImportStatus } from './asset-import-pipeline-contracts';

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

    this.dracoLoader.setDecoderPath('/draco/');
    this.gltfLoader.setDRACOLoader(this.dracoLoader);
  }

  async import(
    file: File | string,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = getImportFileName(file);
    const ext = getImportExtension(filename);

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

      if (options.scale && options.scale !== 1) {
        result.scale.multiplyScalar(options.scale);
      }

      if (options.flipYZ) {
        result.rotation.x = -Math.PI / 2;
      }

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

      let thumbnail: string | undefined;
      if (options.createThumbnail) {
        onProgress?.({ stage: 'processing', progress: 95, message: 'Generating thumbnail...' });
        thumbnail = await this.generateThumbnail(result, options.thumbnailSize || 256);
      }

      onProgress?.({ stage: 'completed', progress: 100, message: 'Import complete!' });

      return {
        id: createAssetImportId('asset'),
        name: getImportDisplayName(filename),
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

        geometry.computeVertexNormals();

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

}

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
    const filename = getImportFileName(file);
    const assetType = getAssetType(filename);

    if (!assetType) {
      throw new Error(`Unsupported file format: ${filename}`);
    }

    const defaultOptions = resolveImportOptions(options);

    switch (assetType) {
      case 'model':
        return this.modelImporter.import(file, defaultOptions, onProgress);
      case 'texture':
        return this.textureImporter.import(file, defaultOptions, onProgress);
      case 'audio':
        return this.audioImporter.import(file, defaultOptions, onProgress);
      default:
        return this.importGeneric(file, assetType, defaultOptions, onProgress);
    }
  }

  private async importGeneric(
    file: File | string,
    type: AssetType,
    options: ImportOptions,
    onProgress?: ImportProgressCallback
  ): Promise<ImportedAsset> {
    const filename = getImportFileName(file);
    const ext = getImportExtension(filename);

    onProgress?.({ stage: 'loading', progress: 0, message: 'Loading file...' });

    let content: string | ArrayBuffer;
    let size: number;

    if (typeof file === 'string') {
      const response = await fetch(file);
      content = await response.text();
      size = content.length;
    } else {
      if (shouldReadGenericAssetAsText(ext)) {
        content = await file.text();
      } else {
        content = await file.arrayBuffer();
      }
      size = file.size;
    }

    onProgress?.({ stage: 'completed', progress: 100, message: 'Import complete!' });

    return {
      id: createAssetImportId(type),
      name: getImportDisplayName(filename),
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
      const filename = getImportFileName(file);

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

  validateFiles(files: File[]): Array<{ file: File; valid: boolean; error?: string }> {
    return validateImportFiles(files);
  }

  getStatistics(): { supportedFormats: number; totalFormats: string[] } {
    return getImportStatistics();
  }
}

let pipelineInstance: AssetImportPipeline | null = null;

export function getAssetImportPipeline(): AssetImportPipeline {
  if (!pipelineInstance) {
    pipelineInstance = new AssetImportPipeline();
  }
  return pipelineInstance;
}

const assetImportPipelineModule = {
  AssetImportPipeline,
  getAssetImportPipeline,
  getAssetType,
  isSupported,
  getSupportedFormats,
  SUPPORTED_FORMATS,
};

export default assetImportPipelineModule;
