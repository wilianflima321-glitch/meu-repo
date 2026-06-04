// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
/**
 * Quality configuration contracts for the AAA render system.
 */

import * as THREE from 'three';

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
