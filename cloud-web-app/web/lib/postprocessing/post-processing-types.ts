import * as THREE from 'three';

export interface PostProcessingSettings {
  enabled: boolean;
  antialiasing: 'none' | 'fxaa' | 'smaa' | 'taa';
  tonemapping: TonemappingMode;
  exposure: number;
}

export type TonemappingMode =
  | 'none'
  | 'linear'
  | 'reinhard'
  | 'cineon'
  | 'aces'
  | 'filmic';

export interface BloomSettings {
  [key: string]: unknown;
  enabled: boolean;
  intensity: number;
  threshold: number;
  radius: number;
  softKnee: number;
  mipLevels: number;
}

export interface DOFSettings {
  enabled: boolean;
  focusDistance: number;
  focalLength: number;
  aperture: number;
  maxBlur: number;
  bokehShape: 'circle' | 'hexagon' | 'octagon';
  samples: number;
}

export interface SSAOSettings {
  enabled: boolean;
  radius: number;
  intensity: number;
  bias: number;
  samples: number;
  minDistance: number;
  maxDistance: number;
}

export interface SSRSettings {
  enabled: boolean;
  intensity: number;
  maxRoughness: number;
  thickness: number;
  stride: number;
  maxSteps: number;
  fresnel: boolean;
}

export interface MotionBlurSettings {
  enabled: boolean;
  intensity: number;
  samples: number;
  maxVelocity: number;
}

export interface ColorGradingSettings {
  [key: string]: unknown;
  enabled: boolean;
  brightness: number;
  contrast: number;
  saturation: number;
  hueShift: number;
  temperature: number;
  tint: number;
  shadows: THREE.Color;
  midtones: THREE.Color;
  highlights: THREE.Color;
  shadowsWeight: number;
  midtonesWeight: number;
  highlightsWeight: number;
  lutTexture?: THREE.Texture;
  lutIntensity: number;
}

export interface VignetteSettings {
  [key: string]: unknown;
  enabled: boolean;
  intensity: number;
  smoothness: number;
  roundness: number;
  color: THREE.Color;
}

export interface FilmGrainSettings {
  [key: string]: unknown;
  enabled: boolean;
  intensity: number;
  size: number;
  animated: boolean;
}

export interface ChromaticAberrationSettings {
  [key: string]: unknown;
  enabled: boolean;
  intensity: number;
  radialModulation: boolean;
}

export interface LensDistortionSettings {
  enabled: boolean;
  intensity: number;
  cubicDistortion: number;
  scale: number;
}
