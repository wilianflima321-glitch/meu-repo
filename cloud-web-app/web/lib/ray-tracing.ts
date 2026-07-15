/**
 * @aethel-heavy-async-boundary Studio/ray-tracing runtime; do not import from public route shells.
 *
 * RAY TRACING SUPPORT - Aethel Engine
 *
 * Sistema de Ray Tracing usando WebGPU quando disponível.
 * Fallback para path tracing em fragment shader quando não.
 *
 * FEATURES:
 * - Real-time ray traced reflections
 * - Ray traced ambient occlusion
 * - Ray traced global illumination
 * - Ray traced shadows (soft)
 * - Denoising
 * - BVH acceleration
 * - Material PBR support
 */

import * as THREE from 'three';
import type {
  BVHNode,
  RayTracingConfig,
  RTMaterial,
  Triangle,
} from './ray-tracing-contracts';
export type { BVHNode, RayTracingConfig, RTMaterial, Triangle } from './ray-tracing-contracts';
import { BVHBuilder } from './ray-tracing-bvh';
import { Denoiser } from './ray-tracing-denoiser';
import { createRayTracingMaterial } from './ray-tracing-material';
import { createComponentLogger } from '@/lib/observability/logger';
export { BVHBuilder } from './ray-tracing-bvh';
export { Denoiser } from './ray-tracing-denoiser';

// ============================================================================
// BVH BUILDER
// ============================================================================

// ============================================================================
// RAY TRACING PASS
// ============================================================================

export class RayTracingPass {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private renderTarget: THREE.WebGLRenderTarget;
  private accumulationTarget: THREE.WebGLRenderTarget;
  private material: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.Camera;

  private bvh: BVHBuilder;
  private frameCount: number = 0;
  private config: RayTracingConfig;

  private lastCameraMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<RayTracingConfig> = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.config = {
      enabled: config.enabled ?? true,
      maxBounces: config.maxBounces ?? 3,
      samplesPerPixel: config.samplesPerPixel ?? 1,
      enableReflections: config.enableReflections ?? true,
      enableShadows: config.enableShadows ?? true,
      enableGI: config.enableGI ?? false,
      enableAO: config.enableAO ?? true,
      aoRadius: config.aoRadius ?? 1.0,
      aoSamples: config.aoSamples ?? 8,
      denoiseEnabled: config.denoiseEnabled ?? true,
      denoiseStrength: config.denoiseStrength ?? 0.5,
      resolution: config.resolution ?? 0.5
    };

    const width = Math.floor(window.innerWidth * this.config.resolution);
    const height = Math.floor(window.innerHeight * this.config.resolution);

    // Create render targets
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });

    this.accumulationTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });

    // Build BVH asynchronously
    this.bvh = new BVHBuilder();
    this.rebuildBVH().catch(e => {
      const log = createComponentLogger('ray-tracing');
      log.error('Initial BVH build failed:', e);
    });

    // Create ray tracing material
    this.material = this.createMaterial();

    // Create fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, this.material);

    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  async rebuildBVH(): Promise<void> {
    const meshes: THREE.Mesh[] = [];

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        meshes.push(obj);
      }
    });

    await this.bvh.build(meshes);

    // Update textures
    const textures = this.bvh.createDataTextures();
    this.material.uniforms.bvhTexture.value = textures.bvhTexture;
    this.material.uniforms.triangleTexture.value = textures.triangleTexture;
    this.material.uniforms.materialTexture.value = textures.materialTexture;
  }

  private createMaterial(): THREE.ShaderMaterial {
    return createRayTracingMaterial();
  }

  render(): THREE.Texture {
    if (!this.config.enabled) {
      return this.renderTarget.texture;
    }

    // Check if camera moved
    const currentMatrix = this.camera.matrixWorld.clone();
    if (!currentMatrix.equals(this.lastCameraMatrix)) {
      this.frameCount = 0;
      this.lastCameraMatrix.copy(currentMatrix);
    }

    // Update uniforms
    this.material.uniforms.cameraPosition.value.copy(this.camera.position);
    this.material.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld);
    this.material.uniforms.projectionMatrixInverse.value.copy(
      (this.camera as THREE.PerspectiveCamera).projectionMatrixInverse
    );

    this.material.uniforms.previousFrame.value = this.accumulationTarget.texture;
    this.material.uniforms.frameCount.value = this.frameCount;
    this.material.uniforms.randomSeed.value = Math.random();
    this.material.uniforms.resolution.value.set(
      this.renderTarget.width,
      this.renderTarget.height
    );

    // Render
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.quadScene, this.quadCamera);

    // Swap targets for accumulation
    [this.renderTarget, this.accumulationTarget] = [this.accumulationTarget, this.renderTarget];

    this.renderer.setRenderTarget(currentTarget);
    this.frameCount++;

    return this.accumulationTarget.texture;
  }

  getTexture(): THREE.Texture {
    return this.accumulationTarget.texture;
  }

  resize(width: number, height: number): void {
    const w = Math.floor(width * this.config.resolution);
    const h = Math.floor(height * this.config.resolution);

    this.renderTarget.setSize(w, h);
    this.accumulationTarget.setSize(w, h);
    this.frameCount = 0;
  }

  setConfig(config: Partial<RayTracingConfig>): void {
    Object.assign(this.config, config);

    this.material.uniforms.maxBounces.value = this.config.maxBounces;
    this.material.uniforms.samplesPerPixel.value = this.config.samplesPerPixel;
    this.material.uniforms.enableReflections.value = this.config.enableReflections;
    this.material.uniforms.enableShadows.value = this.config.enableShadows;
    this.material.uniforms.enableAO.value = this.config.enableAO;
    this.material.uniforms.aoRadius.value = this.config.aoRadius;
    this.material.uniforms.aoSamples.value = this.config.aoSamples;
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.material.uniforms.sunDirection.value.copy(direction).normalize();
    this.frameCount = 0;
  }

  invalidate(): void {
    this.frameCount = 0;
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.accumulationTarget.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

// ============================================================================
// RAY TRACING MANAGER
// ============================================================================

export class RayTracingManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;

  private rayTracingPass: RayTracingPass;
  private denoiser: Denoiser;

  private config: RayTracingConfig;
  private enabled: boolean = true;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<RayTracingConfig> = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.config = {
      enabled: config.enabled ?? true,
      maxBounces: config.maxBounces ?? 3,
      samplesPerPixel: config.samplesPerPixel ?? 1,
      enableReflections: config.enableReflections ?? true,
      enableShadows: config.enableShadows ?? true,
      enableGI: config.enableGI ?? false,
      enableAO: config.enableAO ?? true,
      aoRadius: config.aoRadius ?? 1.0,
      aoSamples: config.aoSamples ?? 8,
      denoiseEnabled: config.denoiseEnabled ?? true,
      denoiseStrength: config.denoiseStrength ?? 0.5,
      resolution: config.resolution ?? 0.5
    };

    this.rayTracingPass = new RayTracingPass(renderer, scene, camera, this.config);
    this.denoiser = new Denoiser(
      renderer,
      Math.floor(window.innerWidth * this.config.resolution),
      Math.floor(window.innerHeight * this.config.resolution)
    );
  }

  render(): THREE.Texture {
    if (!this.enabled) {
      return this.rayTracingPass.getTexture();
    }

    // Ray trace
    let result = this.rayTracingPass.render();

    // Denoise
    if (this.config.denoiseEnabled) {
      result = this.denoiser.denoise(result, this.config.denoiseStrength);
    }

    return result;
  }

  async rebuildAccelerationStructure(): Promise<void> {
    await this.rayTracingPass.rebuildBVH();
    this.rayTracingPass.invalidate();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.config.enabled = enabled;
  }

  setConfig(config: Partial<RayTracingConfig>): void {
    Object.assign(this.config, config);
    this.rayTracingPass.setConfig(config);
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.rayTracingPass.setSunDirection(direction);
  }

  resize(width: number, height: number): void {
    this.rayTracingPass.resize(width, height);
    this.denoiser.resize(
      Math.floor(width * this.config.resolution),
      Math.floor(height * this.config.resolution)
    );
  }

  invalidate(): void {
    this.rayTracingPass.invalidate();
  }

  dispose(): void {
    this.rayTracingPass.dispose();
    this.denoiser.dispose();
  }
}

export default RayTracingManager;
