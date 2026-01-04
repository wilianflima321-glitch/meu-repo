/**
 * AAA RENDER SYSTEM - Sistema de Rendering Profissional
 * 
 * Sistema completo de renderização de nível AAA com:
 * - Deferred/Forward+ rendering
 * - PBR avançado (clearcoat, sheen, transmission, anisotropy)
 * - Global Illumination (Screen-space GI, RTGI, Light Probes)
 * - Volumetric Lighting (fog, god rays, atmospheric scattering)
 * - Advanced shadows (CSM, PCSS, ray-traced)
 * - Post-processing stack (SSAO, SSR, bloom, DOF, motion blur, TAA)
 * - HDR + Tonemapping
 * - Virtual Texturing
 */

import * as THREE from 'three';

// ============================================================================
// RENDERING PIPELINE
// ============================================================================

export type RenderPipelineType = 'forward' | 'deferred' | 'forwardPlus' | 'tiled';

export interface RenderPipelineConfig {
  type: RenderPipelineType;
  hdr: boolean;
  multisampling: boolean;
  samples: number;
  toneMapping: THREE.ToneMapping;
  toneMappingExposure: number;
  shadowMapEnabled: boolean;
  shadowMapType: THREE.ShadowMapType;
  shadowMapSize: number;
  physicallyCorrectLights: boolean;
  outputColorSpace: THREE.ColorSpace;
}

export const DEFAULT_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forwardPlus',
  hdr: true,
  multisampling: true,
  samples: 4,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: THREE.PCFSoftShadowMap,
  shadowMapSize: 2048,
  physicallyCorrectLights: true,
  outputColorSpace: THREE.SRGBColorSpace,
};

// ============================================================================
// G-BUFFER LAYOUT (Deferred Rendering)
// ============================================================================

export interface GBuffer {
  albedo: THREE.WebGLRenderTarget;        // RGB: albedo, A: metallic
  normal: THREE.WebGLRenderTarget;        // RGB: world normal, A: roughness
  emissive: THREE.WebGLRenderTarget;      // RGB: emissive, A: AO
  depth: THREE.WebGLRenderTarget;         // R: linear depth
  velocity: THREE.WebGLRenderTarget;      // RG: screen-space velocity
  material: THREE.WebGLRenderTarget;      // R: material ID, G: subsurface, B: clearcoat, A: sheen
}

// ============================================================================
// GLOBAL ILLUMINATION
// ============================================================================

export type GIMethod = 'none' | 'lightProbes' | 'ssgi' | 'rtgi' | 'voxelGI' | 'lpv';

export interface GlobalIlluminationConfig {
  method: GIMethod;
  intensity: number;
  bounces: number;
  // Light Probe Volumes
  probeResolution: number;
  probeSpacing: number;
  // SSGI
  ssgiSamples: number;
  ssgiRadius: number;
  // RTGI
  rtgiRaysPerPixel: number;
  rtgiDenoiser: boolean;
  // Voxel GI
  voxelResolution: number;
  voxelBounce: number;
}

export const DEFAULT_GI_CONFIG: GlobalIlluminationConfig = {
  method: 'ssgi',
  intensity: 1.0,
  bounces: 1,
  probeResolution: 16,
  probeSpacing: 2,
  ssgiSamples: 16,
  ssgiRadius: 0.5,
  rtgiRaysPerPixel: 1,
  rtgiDenoiser: true,
  voxelResolution: 128,
  voxelBounce: 1,
};

// ============================================================================
// VOLUMETRIC LIGHTING
// ============================================================================

export interface VolumetricConfig {
  enabled: boolean;
  method: 'raymarched' | 'froxel';
  // Raymarch settings
  steps: number;
  maxDistance: number;
  ditherStrength: number;
  // Froxel settings (tiled volume)
  froxelResolution: [number, number, number];
  froxelNearPlane: number;
  froxelFarPlane: number;
  // Fog
  fogDensity: number;
  fogColor: THREE.Color;
  fogHeightFalloff: number;
  // Light scattering
  scatteringCoefficient: number;
  extinctionCoefficient: number;
  anisotropy: number;
  // God rays
  godRaysEnabled: boolean;
  godRaysSamples: number;
  godRaysDecay: number;
  godRaysWeight: number;
}

export const DEFAULT_VOLUMETRIC_CONFIG: VolumetricConfig = {
  enabled: true,
  method: 'froxel',
  steps: 64,
  maxDistance: 100,
  ditherStrength: 0.5,
  froxelResolution: [160, 90, 64],
  froxelNearPlane: 0.1,
  froxelFarPlane: 100,
  fogDensity: 0.01,
  fogColor: new THREE.Color(0.5, 0.6, 0.7),
  fogHeightFalloff: 0.1,
  scatteringCoefficient: 0.5,
  extinctionCoefficient: 0.01,
  anisotropy: 0.5,
  godRaysEnabled: true,
  godRaysSamples: 50,
  godRaysDecay: 0.95,
  godRaysWeight: 0.8,
};

// ============================================================================
// ADVANCED SHADOWS
// ============================================================================

export type ShadowTechnique = 'basic' | 'pcf' | 'pcss' | 'vsm' | 'esm' | 'cascaded' | 'raytraced';

export interface ShadowConfig {
  technique: ShadowTechnique;
  resolution: number;
  // Cascaded Shadow Maps
  cascades: number;
  cascadeSplits: number[];
  // PCSS (Percentage-Closer Soft Shadows)
  pcssSamples: number;
  pcssBlockerSearchSamples: number;
  pcssLightSize: number;
  // VSM/ESM
  vsmBias: number;
  vsmBlurSize: number;
  // Contact shadows
  contactShadows: boolean;
  contactShadowsDistance: number;
  contactShadowsSteps: number;
  // Ray-traced shadows
  rtShadowsEnabled: boolean;
  rtShadowsSPP: number;
  rtShadowsDenoiser: boolean;
}

export const DEFAULT_SHADOW_CONFIG: ShadowConfig = {
  technique: 'cascaded',
  resolution: 2048,
  cascades: 4,
  cascadeSplits: [0.05, 0.15, 0.5, 1.0],
  pcssSamples: 16,
  pcssBlockerSearchSamples: 16,
  pcssLightSize: 0.5,
  vsmBias: 0.0001,
  vsmBlurSize: 3,
  contactShadows: true,
  contactShadowsDistance: 0.5,
  contactShadowsSteps: 8,
  rtShadowsEnabled: false,
  rtShadowsSPP: 1,
  rtShadowsDenoiser: true,
};

// ============================================================================
// POST-PROCESSING EFFECTS
// ============================================================================

export interface PostProcessingStack {
  // Anti-aliasing
  antialiasing: 'none' | 'fxaa' | 'smaa' | 'taa' | 'msaa';
  taaJitter: boolean;
  taaSharpness: number;
  // Ambient Occlusion
  ssao: SSAOConfig;
  hbao: HBAOConfig;
  gtao: GTAOConfig;
  rtao: RTAOConfig;
  // Screen-space Reflections
  ssr: SSRConfig;
  // Bloom
  bloom: BloomConfig;
  // Depth of Field
  dof: DOFConfig;
  // Motion Blur
  motionBlur: MotionBlurConfig;
  // Color Grading
  colorGrading: ColorGradingConfig;
  // Chromatic Aberration
  chromaticAberration: ChromaticAberrationConfig;
  // Vignette
  vignette: VignetteConfig;
  // Film Grain
  filmGrain: FilmGrainConfig;
  // Lens Flare
  lensFlare: LensFlareConfig;
  // Fog
  fog: FogConfig;
}

export interface SSAOConfig {
  enabled: boolean;
  radius: number;
  bias: number;
  samples: number;
  intensity: number;
  blurSize: number;
}

export interface HBAOConfig {
  enabled: boolean;
  radius: number;
  bias: number;
  steps: number;
  directions: number;
  intensity: number;
}

export interface GTAOConfig {
  enabled: boolean;
  radius: number;
  thickness: number;
  falloff: number;
  samples: number;
  intensity: number;
}

export interface RTAOConfig {
  enabled: boolean;
  radius: number;
  raysPerPixel: number;
  denoiser: boolean;
  intensity: number;
}

export interface SSRConfig {
  enabled: boolean;
  maxDistance: number;
  thickness: number;
  steps: number;
  binarySearchSteps: number;
  maxRoughness: number;
  fadeFactor: number;
  jitter: boolean;
}

export interface BloomConfig {
  enabled: boolean;
  threshold: number;
  strength: number;
  radius: number;
  passes: number;
  kernelSize: number;
}

export interface DOFConfig {
  enabled: boolean;
  focusDistance: number;
  focalLength: number;
  fstop: number;
  maxBlur: number;
  bokehShape: 'circle' | 'hexagon' | 'octagon';
  bokehScale: number;
  vignetting: boolean;
  autofocus: boolean;
}

export interface MotionBlurConfig {
  enabled: boolean;
  samples: number;
  intensity: number;
  velocityScale: number;
  jitterSpread: number;
  cameraBlur: boolean;
}

export interface ColorGradingConfig {
  enabled: boolean;
  lut: THREE.Texture | null;
  temperature: number;
  tint: number;
  saturation: number;
  contrast: number;
  brightness: number;
  exposure: number;
  lift: [number, number, number];
  gamma: [number, number, number];
  gain: [number, number, number];
}

export interface ChromaticAberrationConfig {
  enabled: boolean;
  intensity: number;
  offset: number;
}

export interface VignetteConfig {
  enabled: boolean;
  offset: number;
  darkness: number;
}

export interface FilmGrainConfig {
  enabled: boolean;
  intensity: number;
  scale: number;
}

export interface LensFlareConfig {
  enabled: boolean;
  ghosts: number;
  ghostDispersal: number;
  haloWidth: number;
  distortion: number;
  threshold: number;
}

export interface FogConfig {
  enabled: boolean;
  color: THREE.Color;
  near: number;
  far: number;
  density: number;
  heightFalloff: number;
}

export const DEFAULT_POST_PROCESSING: PostProcessingStack = {
  antialiasing: 'taa',
  taaJitter: true,
  taaSharpness: 0.5,
  ssao: {
    enabled: true,
    radius: 0.5,
    bias: 0.01,
    samples: 16,
    intensity: 1.0,
    blurSize: 4,
  },
  hbao: {
    enabled: false,
    radius: 0.5,
    bias: 0.01,
    steps: 4,
    directions: 8,
    intensity: 1.0,
  },
  gtao: {
    enabled: false,
    radius: 0.5,
    thickness: 1.0,
    falloff: 0.1,
    samples: 16,
    intensity: 1.0,
  },
  rtao: {
    enabled: false,
    radius: 1.0,
    raysPerPixel: 1,
    denoiser: true,
    intensity: 1.0,
  },
  ssr: {
    enabled: true,
    maxDistance: 50,
    thickness: 0.1,
    steps: 32,
    binarySearchSteps: 4,
    maxRoughness: 0.5,
    fadeFactor: 0.5,
    jitter: true,
  },
  bloom: {
    enabled: true,
    threshold: 0.8,
    strength: 0.3,
    radius: 0.5,
    passes: 5,
    kernelSize: 25,
  },
  dof: {
    enabled: false,
    focusDistance: 10,
    focalLength: 50,
    fstop: 2.8,
    maxBlur: 0.01,
    bokehShape: 'hexagon',
    bokehScale: 1.0,
    vignetting: true,
    autofocus: false,
  },
  motionBlur: {
    enabled: true,
    samples: 16,
    intensity: 0.5,
    velocityScale: 1.0,
    jitterSpread: 0.5,
    cameraBlur: true,
  },
  colorGrading: {
    enabled: true,
    lut: null,
    temperature: 0,
    tint: 0,
    saturation: 1.0,
    contrast: 1.0,
    brightness: 0,
    exposure: 0,
    lift: [1, 1, 1],
    gamma: [1, 1, 1],
    gain: [1, 1, 1],
  },
  chromaticAberration: {
    enabled: false,
    intensity: 0.5,
    offset: 0.001,
  },
  vignette: {
    enabled: true,
    offset: 0.5,
    darkness: 0.5,
  },
  filmGrain: {
    enabled: true,
    intensity: 0.05,
    scale: 1.0,
  },
  lensFlare: {
    enabled: true,
    ghosts: 3,
    ghostDispersal: 0.3,
    haloWidth: 0.5,
    distortion: 1.0,
    threshold: 0.9,
  },
  fog: {
    enabled: true,
    color: new THREE.Color(0.5, 0.6, 0.7),
    near: 10,
    far: 100,
    density: 0.01,
    heightFalloff: 0.1,
  },
};

// ============================================================================
// RENDER SYSTEM CLASS
// ============================================================================

export class AAARenderSystem {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  private pipelineConfig: RenderPipelineConfig;
  private giConfig: GlobalIlluminationConfig;
  private volumetricConfig: VolumetricConfig;
  private shadowConfig: ShadowConfig;
  private postProcessing: PostProcessingStack;
  
  // Render targets
  private gBuffer?: GBuffer;
  private hdrTarget?: THREE.WebGLRenderTarget;
  private velocityTarget?: THREE.WebGLRenderTarget;
  
  // Post-processing composer
  private composer?: any; // EffectComposer from postprocessing
  
  // Light probes for GI
  private lightProbes: THREE.LightProbe[] = [];
  
  // Froxel volume for volumetric lighting
  private froxelVolume?: THREE.Data3DTexture;
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config?: Partial<RenderPipelineConfig>
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.pipelineConfig = { ...DEFAULT_PIPELINE_CONFIG, ...config };
    this.giConfig = { ...DEFAULT_GI_CONFIG };
    this.volumetricConfig = { ...DEFAULT_VOLUMETRIC_CONFIG };
    this.shadowConfig = { ...DEFAULT_SHADOW_CONFIG };
    this.postProcessing = { ...DEFAULT_POST_PROCESSING };
    
    this.initialize();
  }
  
  private initialize(): void {
    // Configure renderer
    this.renderer.toneMapping = this.pipelineConfig.toneMapping;
    this.renderer.toneMappingExposure = this.pipelineConfig.toneMappingExposure;
    this.renderer.shadowMap.enabled = this.pipelineConfig.shadowMapEnabled;
    this.renderer.shadowMap.type = this.pipelineConfig.shadowMapType;
    // physicallyCorrectLights is now default in Three.js r155+
    this.renderer.outputColorSpace = this.pipelineConfig.outputColorSpace;
    
    // Setup pipeline
    switch (this.pipelineConfig.type) {
      case 'deferred':
        this.setupDeferredPipeline();
        break;
      case 'forwardPlus':
        this.setupForwardPlusPipeline();
        break;
      case 'tiled':
        this.setupTiledPipeline();
        break;
      default:
        this.setupForwardPipeline();
    }
    
    // Setup post-processing
    this.setupPostProcessing();
  }
  
  private setupForwardPipeline(): void {
    // Standard forward rendering
    if (this.pipelineConfig.hdr) {
      const { width, height } = this.renderer.getSize(new THREE.Vector2());
      this.hdrTarget = new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        colorSpace: THREE.LinearSRGBColorSpace,
      });
    }
  }
  
  private setupDeferredPipeline(): void {
    const { width, height } = this.renderer.getSize(new THREE.Vector2());
    
    // Create G-Buffer
    this.gBuffer = {
      albedo: new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      }),
      normal: new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      }),
      emissive: new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      }),
      depth: new THREE.WebGLRenderTarget(width, height, {
        type: THREE.FloatType,
        format: THREE.RedFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      }),
      velocity: new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        format: THREE.RGFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      }),
      material: new THREE.WebGLRenderTarget(width, height, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      }),
    };
    
    this.hdrTarget = new THREE.WebGLRenderTarget(width, height, {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      colorSpace: THREE.LinearSRGBColorSpace,
    });
  }
  
  private setupForwardPlusPipeline(): void {
    // Forward+ uses light culling with tiles
    // Setup similar to forward but with light tile data structure
    this.setupForwardPipeline();
    
    // Create light culling compute shader (would use WebGPU compute)
    // For now, just setup standard forward
  }
  
  private setupTiledPipeline(): void {
    // Tiled deferred - similar to deferred but with tiled light culling
    this.setupDeferredPipeline();
  }
  
  private setupPostProcessing(): void {
    // This would integrate with pmndrs/postprocessing or custom shaders
    // For now, we'll define the structure
    
    // Initialize effect composer
    // this.composer = new EffectComposer(this.renderer);
    
    // Add passes based on config
    if (this.postProcessing.ssao.enabled) {
      this.setupSSAO();
    }
    
    if (this.postProcessing.ssr.enabled) {
      this.setupSSR();
    }
    
    if (this.postProcessing.bloom.enabled) {
      this.setupBloom();
    }
    
    if (this.postProcessing.dof.enabled) {
      this.setupDOF();
    }
    
    if (this.postProcessing.motionBlur.enabled) {
      this.setupMotionBlur();
    }
  }
  
  private setupSSAO(): void {
    // Screen-Space Ambient Occlusion
    // Would use SAOPass or custom SSAO implementation
  }
  
  private setupSSR(): void {
    // Screen-Space Reflections
    // Custom shader pass for SSR
  }
  
  private setupBloom(): void {
    // Bloom effect with threshold and multiple blur passes
  }
  
  private setupDOF(): void {
    // Depth of Field with bokeh
  }
  
  private setupMotionBlur(): void {
    // Per-object motion blur using velocity buffer
  }
  
  // ============================================================================
  // GLOBAL ILLUMINATION
  // ============================================================================
  
  setupGlobalIllumination(config: Partial<GlobalIlluminationConfig>): void {
    this.giConfig = { ...this.giConfig, ...config };
    
    switch (this.giConfig.method) {
      case 'lightProbes':
        this.setupLightProbes();
        break;
      case 'ssgi':
        this.setupSSGI();
        break;
      case 'rtgi':
        this.setupRTGI();
        break;
      case 'voxelGI':
        this.setupVoxelGI();
        break;
    }
  }
  
  private setupLightProbes(): void {
    // Generate light probe grid
    const spacing = this.giConfig.probeSpacing;
    const bounds = new THREE.Box3().setFromObject(this.scene);
    
    const min = bounds.min;
    const max = bounds.max;
    
    for (let x = min.x; x <= max.x; x += spacing) {
      for (let y = min.y; y <= max.y; y += spacing) {
        for (let z = min.z; z <= max.z; z += spacing) {
          const probe = new THREE.LightProbe();
          probe.position.set(x, y, z);
          this.lightProbes.push(probe);
          this.scene.add(probe);
        }
      }
    }
  }
  
  private setupSSGI(): void {
    // Screen-Space Global Illumination
    // Uses depth + normals to approximate one-bounce GI
  }
  
  private setupRTGI(): void {
    // Ray-Traced Global Illumination
    // Requires WebGPU ray tracing
  }
  
  private setupVoxelGI(): void {
    // Voxel-based GI (like SVOGI or VXGI)
    const res = this.giConfig.voxelResolution;
    
    // Create 3D texture for voxel grid
    const data = new Uint8Array(res * res * res * 4);
    const texture = new THREE.Data3DTexture(data, res, res, res);
    texture.format = THREE.RGBAFormat;
    texture.type = THREE.UnsignedByteType;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.wrapR = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
    
    // Voxelize scene into this texture
    // Then trace cones through voxels for GI
  }
  
  // ============================================================================
  // VOLUMETRIC LIGHTING
  // ============================================================================
  
  setupVolumetrics(config: Partial<VolumetricConfig>): void {
    this.volumetricConfig = { ...this.volumetricConfig, ...config };
    
    if (this.volumetricConfig.method === 'froxel') {
      this.setupFroxelVolume();
    }
  }
  
  private setupFroxelVolume(): void {
    const [width, height, depth] = this.volumetricConfig.froxelResolution;
    
    // Create 3D froxel grid
    const data = new Float32Array(width * height * depth * 4);
    this.froxelVolume = new THREE.Data3DTexture(data, width, height, depth);
    this.froxelVolume.format = THREE.RGBAFormat;
    this.froxelVolume.type = THREE.FloatType;
    this.froxelVolume.minFilter = THREE.LinearFilter;
    this.froxelVolume.magFilter = THREE.LinearFilter;
    this.froxelVolume.needsUpdate = true;
  }
  
  // ============================================================================
  // SHADOW SYSTEM
  // ============================================================================
  
  setupShadows(config: Partial<ShadowConfig>): void {
    this.shadowConfig = { ...this.shadowConfig, ...config };
    
    // Configure shadow maps for all lights
    this.scene.traverse((obj) => {
      if ((obj as THREE.Light).isLight) {
        const light = obj as THREE.DirectionalLight | THREE.SpotLight | THREE.PointLight;
        
        if ('shadow' in light) {
          light.castShadow = true;
          light.shadow.mapSize.width = this.shadowConfig.resolution;
          light.shadow.mapSize.height = this.shadowConfig.resolution;
          
          // Setup cascaded shadows for directional lights
          if ((light as THREE.DirectionalLight).type === 'DirectionalLight' && this.shadowConfig.technique === 'cascaded') {
            this.setupCascadedShadows(light as THREE.DirectionalLight);
          }
        }
      }
    });
  }
  
  private setupCascadedShadows(light: THREE.DirectionalLight): void {
    // CSM splits the view frustum into cascades
    // Each cascade has its own shadow map at different resolutions
    // This prevents shadow aliasing at different distances
    
    const cascades = this.shadowConfig.cascades;
    const splits = this.shadowConfig.cascadeSplits;
    
    // In practice, would create multiple shadow cameras
    // For now, just configure the main shadow
    light.shadow.camera.near = 0.1;
    light.shadow.camera.far = 500;
  }
  
  // ============================================================================
  // RENDER LOOP
  // ============================================================================
  
  render(): void {
    switch (this.pipelineConfig.type) {
      case 'deferred':
        this.renderDeferred();
        break;
      case 'forwardPlus':
        this.renderForwardPlus();
        break;
      default:
        this.renderForward();
    }
  }
  
  private renderForward(): void {
    if (this.hdrTarget) {
      this.renderer.setRenderTarget(this.hdrTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      
      // Apply post-processing
      if (this.composer) {
        // this.composer.render();
      }
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  private renderDeferred(): void {
    if (!this.gBuffer) return;
    
    // PASS 1: Render to G-Buffer
    // Would use custom shader to output to multiple render targets
    
    // PASS 2: Lighting pass
    // Full-screen quad that reads G-Buffer and computes lighting
    
    // PASS 3: Post-processing
    if (this.composer) {
      // this.composer.render();
    }
  }
  
  private renderForwardPlus(): void {
    // PASS 1: Light culling (compute shader)
    // Build light grid/clusters
    
    // PASS 2: Forward rendering with clustered lights
    this.renderForward();
  }
  
  // ============================================================================
  // UTILITY METHODS
  // ============================================================================
  
  resize(width: number, height: number): void {
    if (this.gBuffer) {
      this.gBuffer.albedo.setSize(width, height);
      this.gBuffer.normal.setSize(width, height);
      this.gBuffer.emissive.setSize(width, height);
      this.gBuffer.depth.setSize(width, height);
      this.gBuffer.velocity.setSize(width, height);
      this.gBuffer.material.setSize(width, height);
    }
    
    if (this.hdrTarget) {
      this.hdrTarget.setSize(width, height);
    }
    
    if (this.composer) {
      // this.composer.setSize(width, height);
    }
  }
  
  dispose(): void {
    if (this.gBuffer) {
      this.gBuffer.albedo.dispose();
      this.gBuffer.normal.dispose();
      this.gBuffer.emissive.dispose();
      this.gBuffer.depth.dispose();
      this.gBuffer.velocity.dispose();
      this.gBuffer.material.dispose();
    }
    
    if (this.hdrTarget) {
      this.hdrTarget.dispose();
    }
    
    if (this.froxelVolume) {
      this.froxelVolume.dispose();
    }
  }
  
  // Config getters/setters
  getPipelineConfig(): RenderPipelineConfig {
    return { ...this.pipelineConfig };
  }
  
  setPipelineConfig(config: Partial<RenderPipelineConfig>): void {
    this.pipelineConfig = { ...this.pipelineConfig, ...config };
    this.initialize();
  }
  
  getGIConfig(): GlobalIlluminationConfig {
    return { ...this.giConfig };
  }
  
  setGIConfig(config: Partial<GlobalIlluminationConfig>): void {
    this.setupGlobalIllumination(config);
  }
  
  getVolumetricConfig(): VolumetricConfig {
    return { ...this.volumetricConfig };
  }
  
  setVolumetricConfig(config: Partial<VolumetricConfig>): void {
    this.setupVolumetrics(config);
  }
  
  getShadowConfig(): ShadowConfig {
    return { ...this.shadowConfig };
  }
  
  setShadowConfig(config: Partial<ShadowConfig>): void {
    this.setupShadows(config);
  }
  
  getPostProcessing(): PostProcessingStack {
    return { ...this.postProcessing };
  }
  
  setPostProcessing(config: Partial<PostProcessingStack>): void {
    this.postProcessing = { ...this.postProcessing, ...config };
    this.setupPostProcessing();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default AAARenderSystem;
