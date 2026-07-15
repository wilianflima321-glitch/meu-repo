/** @aethel-heavy-async-boundary Studio/volumetric-cloud runtime; do not import from public route shells. */
/** Volumetric cloud runtime using ray marching, weather maps, scattering and wind layers. */

import * as THREE from 'three';
import { CloudNoiseGenerator } from './volumetric-clouds.noise';
import {
  CLOUD_SHADOW_FRAGMENT_SHADER,
  CLOUD_SHADOW_VERTEX_SHADER,
  GOD_RAYS_FRAGMENT_SHADER,
  GOD_RAYS_VERTEX_SHADER,
  VOLUMETRIC_CLOUD_FRAGMENT_SHADER,
  VOLUMETRIC_CLOUD_VERTEX_SHADER,
} from './volumetric-clouds.shaders';

/** CLOUD-001 — depth-aware composite + god rays wired in render path (letter by).
 * Not a claim of Unreal-class full volumetric AAA — see marketingFullVolumetricAaaAllowed.
 */
export const VOLUMETRIC_CLOUDS_SHIP_STATUS = 'CLOSED' as const;

/** Always false — humble marketing (letter by). */
export const MARKETING_FULL_VOLUMETRIC_AAA_ALLOWED = false as const;

export const CLOUD_001_LETTER = 'by' as const;

// ============================================================================
// TYPES
// ============================================================================

export interface CloudConfig {
  coverage: number;           // 0-1
  density: number;            // Cloud density multiplier
  cloudScale: number;         // Base scale of cloud shapes
  detailScale: number;        // Scale of detail noise
  cloudSpeed: number;         // Wind speed
  windDirection: THREE.Vector2;

  cloudLayerBottom: number;   // Lower bound of cloud layer
  cloudLayerTop: number;      // Upper bound of cloud layer

  lightAbsorption: number;    // How much light is absorbed
  scatteringCoefficient: number;

  sunColor: THREE.Color;
  ambientColor: THREE.Color;
  cloudColor: THREE.Color;

  godRaysEnabled: boolean;
  godRaysIntensity: number;

  shadowsEnabled: boolean;
  shadowIntensity: number;
}

// ============================================================================
// NOISE GENERATION
// ============================================================================

export { CloudNoiseGenerator, PerlinNoise3D, WorleyNoise3D } from './volumetric-clouds.noise';

// ============================================================================
// VOLUMETRIC CLOUD MATERIAL
// ============================================================================

export class VolumetricCloudMaterial extends THREE.ShaderMaterial {
  constructor(
    cloudNoiseTexture: THREE.Data3DTexture,
    weatherMapTexture: THREE.DataTexture,
    config: Partial<CloudConfig> = {}
  ) {
    super({
      uniforms: {
        // Textures
        cloudNoise: { value: cloudNoiseTexture },
        weatherMap: { value: weatherMapTexture },
        blueNoise: { value: null },

        // Camera
        cameraPosition: { value: new THREE.Vector3() },
        viewMatrix: { value: new THREE.Matrix4() },
        projectionMatrixInverse: { value: new THREE.Matrix4() },
        viewMatrixInverse: { value: new THREE.Matrix4() },

        // Cloud params
        coverage: { value: config.coverage ?? 0.5 },
        density: { value: config.density ?? 1.0 },
        cloudScale: { value: config.cloudScale ?? 0.001 },
        detailScale: { value: config.detailScale ?? 0.005 },

        cloudLayerBottom: { value: config.cloudLayerBottom ?? 1500 },
        cloudLayerTop: { value: config.cloudLayerTop ?? 4000 },

        // Animation
        time: { value: 0 },
        windDirection: { value: config.windDirection ?? new THREE.Vector2(1, 0) },
        windSpeed: { value: config.cloudSpeed ?? 10 },

        // Lighting
        sunDirection: { value: new THREE.Vector3(0.5, 0.7, 0.3).normalize() },
        sunColor: { value: config.sunColor ?? new THREE.Color(1.0, 0.95, 0.8) },
        ambientColor: { value: config.ambientColor ?? new THREE.Color(0.4, 0.5, 0.7) },
        cloudColor: { value: config.cloudColor ?? new THREE.Color(1, 1, 1) },

        lightAbsorption: { value: config.lightAbsorption ?? 0.5 },
        scatteringCoefficient: { value: config.scatteringCoefficient ?? 0.2 },

        // Resolution + Law XV adaptive march (letter bt)
        resolution: { value: new THREE.Vector2() },
        uMaxSteps: { value: 64 },
        uLightSteps: { value: 6 },

        // CLOUD-001 / letter by — depth blend
        tSceneDepth: { value: null as THREE.Texture | null },
        uCameraNear: { value: 0.1 },
        uCameraFar: { value: 100000 },
        uDepthBlendEnabled: { value: 0 },
      },
      vertexShader: VOLUMETRIC_CLOUD_VERTEX_SHADER,
      fragmentShader: VOLUMETRIC_CLOUD_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  update(camera: THREE.Camera, dt: number, resolution?: { width: number; height: number }): void {
    this.uniforms.time.value += dt;
    this.uniforms.cameraPosition.value.copy(camera.position);
    this.uniforms.viewMatrix.value.copy(camera.matrixWorldInverse);
    this.uniforms.projectionMatrixInverse.value.copy(
      (camera as THREE.PerspectiveCamera).projectionMatrixInverse
    );
    this.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld);

    const persp = camera as THREE.PerspectiveCamera;
    if (typeof persp.near === 'number') this.uniforms.uCameraNear.value = persp.near;
    if (typeof persp.far === 'number') this.uniforms.uCameraFar.value = persp.far;

    // Prefer explicit renderer size — never DOM querySelector per frame (CLOUD-001 honesty).
    if (resolution && resolution.width > 0 && resolution.height > 0) {
      this.uniforms.resolution.value.set(resolution.width, resolution.height);
    } else if (typeof this.uniforms.resolution.value.x === 'number' && this.uniforms.resolution.value.x <= 0) {
      this.uniforms.resolution.value.set(1, 1);
    }
  }

  setSceneDepthTexture(texture: THREE.Texture | null, enabled: boolean): void {
    this.uniforms.tSceneDepth.value = texture;
    this.uniforms.uDepthBlendEnabled.value = enabled && texture ? 1 : 0;
  }

  isDepthBlendEnabled(): boolean {
    return (this.uniforms.uDepthBlendEnabled.value as number) > 0.5;
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.uniforms.sunDirection.value.copy(direction).normalize();
  }

  setCoverage(coverage: number): void {
    this.uniforms.coverage.value = Math.max(0, Math.min(1, coverage));
  }

  setDensity(density: number): void {
    this.uniforms.density.value = Math.max(0, density);
  }

  /** Law XV adaptive raymarch — Capability Score drives step count (letter bt). */
  setAdaptiveSteps(maxSteps: number, lightSteps: number): void {
    this.uniforms.uMaxSteps.value = Math.max(1, Math.min(64, Math.round(maxSteps)));
    this.uniforms.uLightSteps.value = Math.max(1, Math.min(6, Math.round(lightSteps)));
  }

  getAdaptiveSteps(): { maxSteps: number; lightSteps: number } {
    return {
      maxSteps: this.uniforms.uMaxSteps.value as number,
      lightSteps: this.uniforms.uLightSteps.value as number,
    };
  }
}

// ============================================================================
// CLOUD SHADOW MAP
// ============================================================================

export class CloudShadowMap {
  private renderTarget: THREE.WebGLRenderTarget;
  private camera: THREE.OrthographicCamera;
  private scene: THREE.Scene;
  private material: THREE.ShaderMaterial;

  readonly texture: THREE.Texture;
  readonly size: number;

  constructor(size: number = 2048, cloudNoise: THREE.Data3DTexture, weatherMap: THREE.DataTexture) {
    this.size = size;

    this.renderTarget = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });

    this.texture = this.renderTarget.texture;

    // Orthographic camera for shadow projection
    const extent = 5000;
    this.camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 1, 10000);

    this.scene = new THREE.Scene();

    // Create fullscreen quad with shadow material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        cloudNoise: { value: cloudNoise },
        weatherMap: { value: weatherMap },
        time: { value: 0 },
        coverage: { value: 0.5 },
        density: { value: 1.0 },
        cloudScale: { value: 0.001 },
        windDirection: { value: new THREE.Vector2(1, 0) },
        windSpeed: { value: 10 },
        sunDirection: { value: new THREE.Vector3(0.5, 0.7, 0.3).normalize() },
        cloudLayerBottom: { value: 1500 },
        cloudLayerTop: { value: 4000 }
      },
      vertexShader: CLOUD_SHADOW_VERTEX_SHADER,
      fragmentShader: CLOUD_SHADOW_FRAGMENT_SHADER
    });

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.material
    );
    this.scene.add(plane);
  }

  update(renderer: THREE.WebGLRenderer, sunDirection: THREE.Vector3, time: number): void {
    this.material.uniforms.time.value = time;
    this.material.uniforms.sunDirection.value.copy(sunDirection);

    const currentTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(currentTarget);
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.material.dispose();
  }
}

// ============================================================================
// GOD RAYS
// ============================================================================

export class GodRaysPass {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private scene: THREE.Scene;
  private ortho: THREE.OrthographicCamera;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tCloud: { value: null },
        sunPosition: { value: new THREE.Vector2(0.5, 0.5) },
        intensity: { value: 1.0 },
        decay: { value: 0.96 },
        weight: { value: 0.4 },
        uSamples: { value: 48 },
        uAdditiveOnly: { value: 1 },
      },
      vertexShader: GOD_RAYS_VERTEX_SHADER,
      fragmentShader: GOD_RAYS_FRAGMENT_SHADER,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene = new THREE.Scene();
    this.scene.add(this.mesh);
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture | null,
    cloudTexture: THREE.Texture,
    camera: THREE.Camera,
    sunDirection: THREE.Vector3,
    target: THREE.WebGLRenderTarget | null
  ): void {
    // Calculate sun screen position
    const sunPos = sunDirection.clone().multiplyScalar(10000);
    sunPos.project(camera);

    this.material.uniforms.tDiffuse.value = inputTexture;
    this.material.uniforms.tCloud.value = cloudTexture;
    this.material.uniforms.uAdditiveOnly.value = inputTexture ? 0 : 1;
    this.material.uniforms.sunPosition.value.set(
      sunPos.x * 0.5 + 0.5,
      sunPos.y * 0.5 + 0.5
    );

    const currentTarget = renderer.getRenderTarget();
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.ortho);
    renderer.autoClear = autoClear;
    renderer.setRenderTarget(currentTarget);
  }

  setIntensity(intensity: number): void {
    this.material.uniforms.intensity.value = intensity;
  }

  getIntensity(): number {
    return this.material.uniforms.intensity.value as number;
  }

  setSamples(samples: number): void {
    this.material.uniforms.uSamples.value = Math.max(1, Math.min(100, Math.round(samples)));
  }

  getSamples(): number {
    return this.material.uniforms.uSamples.value as number;
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}

// ============================================================================
// VOLUMETRIC CLOUD RENDERER
// ============================================================================

export interface VolumetricCloudRenderResult {
  depthBlendUsed: boolean
  godRaysUsed: boolean
  cloudsDrawn: boolean
}

export class VolumetricCloudRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;

  private cloudMaterial: VolumetricCloudMaterial;
  private cloudMesh: THREE.Mesh;
  private cloudNoiseTexture: THREE.Data3DTexture;
  private weatherMapTexture: THREE.DataTexture;
  private cloudScene: THREE.Scene;
  private ortho: THREE.OrthographicCamera;

  private shadowMap: CloudShadowMap | null = null;
  private godRays: GodRaysPass | null = null;

  private depthTarget: THREE.WebGLRenderTarget | null = null;
  private cloudTarget: THREE.WebGLRenderTarget | null = null;

  private config: CloudConfig;
  private time: number = 0;

  private depthBlendAllowed = true;
  private godRaysAllowed = false;
  private lastDepthBlendUsed = false;
  private lastGodRaysUsed = false;
  private framesComposited = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<CloudConfig> = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.config = {
      coverage: config.coverage ?? 0.5,
      density: config.density ?? 1.0,
      cloudScale: config.cloudScale ?? 0.001,
      detailScale: config.detailScale ?? 0.005,
      cloudSpeed: config.cloudSpeed ?? 10,
      windDirection: config.windDirection ?? new THREE.Vector2(1, 0),
      cloudLayerBottom: config.cloudLayerBottom ?? 1500,
      cloudLayerTop: config.cloudLayerTop ?? 4000,
      lightAbsorption: config.lightAbsorption ?? 0.5,
      scatteringCoefficient: config.scatteringCoefficient ?? 0.2,
      sunColor: config.sunColor ?? new THREE.Color(1.0, 0.95, 0.8),
      ambientColor: config.ambientColor ?? new THREE.Color(0.4, 0.5, 0.7),
      cloudColor: config.cloudColor ?? new THREE.Color(1, 1, 1),
      godRaysEnabled: config.godRaysEnabled ?? true,
      godRaysIntensity: config.godRaysIntensity ?? 0.5,
      shadowsEnabled: config.shadowsEnabled ?? true,
      shadowIntensity: config.shadowIntensity ?? 0.5
    };

    // Generate noise textures
    const noiseGen = new CloudNoiseGenerator();
    this.cloudNoiseTexture = noiseGen.generate3DTexture(128);
    this.weatherMapTexture = noiseGen.generateWeatherMap(512);

    // Create cloud material
    this.cloudMaterial = new VolumetricCloudMaterial(
      this.cloudNoiseTexture,
      this.weatherMapTexture,
      this.config
    );

    // Create fullscreen quad for cloud rendering
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.cloudMesh = new THREE.Mesh(geometry, this.cloudMaterial);
    this.cloudMesh.frustumCulled = false;
    this.cloudScene = new THREE.Scene();
    this.cloudScene.add(this.cloudMesh);
    this.ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Initialize shadow map
    if (this.config.shadowsEnabled) {
      this.shadowMap = new CloudShadowMap(2048, this.cloudNoiseTexture, this.weatherMapTexture);
    }

    // Initialize god rays (may stay dormant until Law XV allows)
    if (this.config.godRaysEnabled) {
      this.godRays = new GodRaysPass();
      this.godRays.setIntensity(this.config.godRaysIntensity);
    }
  }

  update(dt: number): void {
    this.time += dt;
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    this.cloudMaterial.update(this.camera, dt, {
      width: Math.max(1, Math.floor(size.x * this.renderer.getPixelRatio())),
      height: Math.max(1, Math.floor(size.y * this.renderer.getPixelRatio())),
    });

    // Update shadow map
    if (this.shadowMap) {
      const sunDir = this.cloudMaterial.uniforms.sunDirection.value;
      this.shadowMap.update(this.renderer, sunDir, this.time);
    }
  }

  /** Law XV — Capability Score adaptive raymarch (letter bt). */
  setAdaptiveSteps(maxSteps: number, lightSteps: number): void {
    this.cloudMaterial.setAdaptiveSteps(maxSteps, lightSteps);
  }

  getAdaptiveSteps(): { maxSteps: number; lightSteps: number } {
    return this.cloudMaterial.getAdaptiveSteps();
  }

  /**
   * Law XV — depth blend + god-ray beauty knobs (letter by).
   * GT730 / webgl2: godRaysAllowed false (fail-closed beauty).
   */
  setAdaptiveBeauty(opts: {
    depthBlendAllowed?: boolean
    godRaysAllowed?: boolean
    godRaySamples?: number
    godRayIntensity?: number
  }): void {
    if (typeof opts.depthBlendAllowed === 'boolean') {
      this.depthBlendAllowed = opts.depthBlendAllowed;
    }
    if (typeof opts.godRaysAllowed === 'boolean') {
      this.godRaysAllowed = opts.godRaysAllowed;
    }
    if (this.godRays) {
      if (typeof opts.godRaySamples === 'number') this.godRays.setSamples(opts.godRaySamples);
      if (typeof opts.godRayIntensity === 'number') {
        this.godRays.setIntensity(opts.godRayIntensity * this.config.godRaysIntensity);
      }
    }
  }

  getAdaptiveBeauty(): {
    depthBlendAllowed: boolean
    godRaysAllowed: boolean
    godRaySamples: number
    godRayIntensity: number
  } {
    return {
      depthBlendAllowed: this.depthBlendAllowed,
      godRaysAllowed: this.godRaysAllowed,
      godRaySamples: this.godRays?.getSamples() ?? 0,
      godRayIntensity: this.godRays?.getIntensity() ?? 0,
    };
  }

  private ensureTargets(width: number, height: number): void {
    const w = Math.max(1, Math.floor(width));
    const h = Math.max(1, Math.floor(height));
    if (
      this.depthTarget &&
      this.cloudTarget &&
      this.depthTarget.width === w &&
      this.depthTarget.height === h
    ) {
      return;
    }
    this.depthTarget?.dispose();
    this.cloudTarget?.dispose();

    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedShortType;

    this.depthTarget = new THREE.WebGLRenderTarget(w, h, {
      depthTexture,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });

    this.cloudTarget = new THREE.WebGLRenderTarget(w, h, {
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
  }

  private captureSceneDepth(): THREE.DepthTexture | null {
    if (!this.depthBlendAllowed || !this.depthTarget?.depthTexture) return null;
    const currentTarget = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(this.depthTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = autoClear;
    this.renderer.setRenderTarget(currentTarget);
    return this.depthTarget.depthTexture;
  }

  /**
   * Depth-aware volumetric composite + optional GodRaysPass (CLOUD-001 / letter by).
   * Call after main scene / composer so overlay lands on the final frame.
   */
  render(): VolumetricCloudRenderResult {
    const size = new THREE.Vector2();
    this.renderer.getDrawingBufferSize(size);
    this.ensureTargets(size.x, size.y);

    const depthTex = this.captureSceneDepth();
    const depthBlendUsed = !!depthTex;
    this.cloudMaterial.setSceneDepthTexture(depthTex, depthBlendUsed);

    const currentTarget = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;

    // Cloud raymarch → offscreen (feeds god-rays occlusion)
    this.renderer.autoClear = true;
    this.renderer.setRenderTarget(this.cloudTarget);
    this.renderer.clear();
    this.renderer.render(this.cloudScene, this.ortho);

    // Transparent cloud overlay onto current frame
    this.renderer.setRenderTarget(currentTarget);
    this.renderer.autoClear = false;
    this.renderer.render(this.cloudScene, this.ortho);

    let godRaysUsed = false;
    if (this.godRays && this.godRaysAllowed && this.config.godRaysEnabled && this.cloudTarget) {
      const sunDir = this.cloudMaterial.uniforms.sunDirection.value as THREE.Vector3;
      this.godRays.render(
        this.renderer,
        null,
        this.cloudTarget.texture,
        this.camera,
        sunDir,
        currentTarget
      );
      godRaysUsed = true;
    }

    this.renderer.autoClear = autoClear;
    this.renderer.setRenderTarget(currentTarget);

    this.lastDepthBlendUsed = depthBlendUsed;
    this.lastGodRaysUsed = godRaysUsed;
    this.framesComposited += 1;

    return {
      depthBlendUsed,
      godRaysUsed,
      cloudsDrawn: true,
    };
  }

  getLastComposite(): { depthBlendUsed: boolean; godRaysUsed: boolean; framesComposited: number } {
    return {
      depthBlendUsed: this.lastDepthBlendUsed,
      godRaysUsed: this.lastGodRaysUsed,
      framesComposited: this.framesComposited,
    };
  }

  getMesh(): THREE.Mesh {
    return this.cloudMesh;
  }

  getShadowTexture(): THREE.Texture | null {
    return this.shadowMap?.texture ?? null;
  }

  setCoverage(coverage: number): void {
    this.config.coverage = Math.max(0, Math.min(1, coverage));
    this.cloudMaterial.setCoverage(this.config.coverage);
  }

  setDensity(density: number): void {
    this.config.density = Math.max(0, density);
    this.cloudMaterial.setDensity(this.config.density);
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.cloudMaterial.setSunDirection(direction);
  }

  setSunColor(color: THREE.Color): void {
    this.cloudMaterial.uniforms.sunColor.value.copy(color);
  }

  setWindDirection(direction: THREE.Vector2): void {
    this.config.windDirection.copy(direction).normalize();
    this.cloudMaterial.uniforms.windDirection.value.copy(this.config.windDirection);
  }

  setWindSpeed(speed: number): void {
    this.config.cloudSpeed = Math.max(0, speed);
    this.cloudMaterial.uniforms.windSpeed.value = this.config.cloudSpeed;
  }

  dispose(): void {
    this.cloudNoiseTexture.dispose();
    this.weatherMapTexture.dispose();
    this.cloudMaterial.dispose();
    this.cloudMesh.geometry.dispose();
    this.shadowMap?.dispose();
    this.godRays?.dispose();
    this.depthTarget?.dispose();
    this.cloudTarget?.dispose();
  }
}

// ============================================================================
// PRESETS
// ============================================================================

export const CLOUD_PRESETS = {
  clear: {
    coverage: 0.1,
    density: 0.5
  },

  partlyCloudy: {
    coverage: 0.4,
    density: 0.8
  },

  cloudy: {
    coverage: 0.7,
    density: 1.0
  },

  overcast: {
    coverage: 0.95,
    density: 1.2
  },

  stormy: {
    coverage: 0.9,
    density: 2.0,
    cloudColor: new THREE.Color(0.4, 0.4, 0.45)
  },

  sunset: {
    coverage: 0.5,
    density: 0.8,
    sunColor: new THREE.Color(1.0, 0.6, 0.3),
    cloudColor: new THREE.Color(1.0, 0.8, 0.6)
  },

  dramatic: {
    coverage: 0.6,
    density: 1.5,
    lightAbsorption: 0.7,
    godRaysIntensity: 1.0
  }
};

export default VolumetricCloudRenderer;
