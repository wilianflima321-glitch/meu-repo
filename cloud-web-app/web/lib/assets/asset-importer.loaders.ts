// @aethel-heavy-async-boundary
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { MTLLoader } from 'three/examples/jsm/loaders/MTLLoader.js';

export class LoadersManager {
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
