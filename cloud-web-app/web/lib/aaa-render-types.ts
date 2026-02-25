/**
 * AAA render configuration contracts and defaults.
 */
import * as THREE from 'three';

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

/**
 * LITE MODE PIPELINE CONFIG
 * 
 * Optimized for mid-range GPUs (GTX 1060, RX 580, etc.)
 * Reduces VRAM usage from ~200MB to ~50MB for G-Buffer
 * Maintains visual quality with forward rendering
 */
export const LITE_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forward', // Skip deferred, lower VRAM
  hdr: true, // Keep HDR for quality
  multisampling: false, // No MSAA, use FXAA instead
  samples: 1,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: THREE.BasicShadowMap, // Fastest shadow type
  shadowMapSize: 1024, // Half resolution
  physicallyCorrectLights: true,
  outputColorSpace: THREE.SRGBColorSpace,
};

/**
 * MOBILE PIPELINE CONFIG
 * 
 * For WebGL on mobile devices and integrated GPUs
 * Minimal VRAM footprint, battery-friendly
 */
export const MOBILE_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forward',
  hdr: false, // Disable HDR
  multisampling: false,
  samples: 1,
  toneMapping: THREE.LinearToneMapping,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: THREE.BasicShadowMap,
  shadowMapSize: 512, // Very low resolution
  physicallyCorrectLights: false, // Faster lighting
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

/**
 * LITE GI CONFIG
 * 
 * Light probes instead of SSGI for better performance
 * Suitable for GTX 1060 / RX 580 class GPUs
 */
export const LITE_GI_CONFIG: GlobalIlluminationConfig = {
  method: 'lightProbes', // Pre-baked, no real-time cost
  intensity: 0.85,
  bounces: 0,
  probeResolution: 8, // Lower resolution probes
  probeSpacing: 4, // Fewer probes
  ssgiSamples: 0, // Disabled
  ssgiRadius: 0,
  rtgiRaysPerPixel: 0,
  rtgiDenoiser: false,
  voxelResolution: 64,
  voxelBounce: 0,
};

/**
 * MOBILE GI CONFIG
 * 
 * Minimal GI for mobile/low-end devices
 */
export const MOBILE_GI_CONFIG: GlobalIlluminationConfig = {
  method: 'none',
  intensity: 0,
  bounces: 0,
  probeResolution: 4,
  probeSpacing: 8,
  ssgiSamples: 0,
  ssgiRadius: 0,
  rtgiRaysPerPixel: 0,
  rtgiDenoiser: false,
  voxelResolution: 32,
  voxelBounce: 0,
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

