import type { Box3, Color } from '@/lib/three';

export interface PostProcessSettings {
  bloomEnabled: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomRadius: number;
  colorGradingEnabled: boolean;
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  shadows: Color;
  midtones: Color;
  highlights: Color;
  tonemappingEnabled: boolean;
  tonemappingMode: 'none' | 'reinhard' | 'aces' | 'filmic' | 'uncharted2';
  vignetteEnabled: boolean;
  vignetteIntensity: number;
  vignetteSmoothness: number;
  vignetteColor: Color;
  chromaticAberrationEnabled: boolean;
  chromaticAberrationIntensity: number;
  filmGrainEnabled: boolean;
  filmGrainIntensity: number;
  filmGrainResponse: number;
  dofEnabled: boolean;
  dofFocusDistance: number;
  dofFocusRange: number;
  dofBokehScale: number;
  motionBlurEnabled: boolean;
  motionBlurIntensity: number;
  motionBlurSamples: number;
  aoEnabled: boolean;
  aoIntensity: number;
  aoRadius: number;
  aoBias: number;
  fogEnabled: boolean;
  fogColor: Color;
  fogDensity: number;
  fogStart: number;
  fogEnd: number;
  fogHeightFalloff: number;
}

export interface PostProcessVolume {
  id: string;
  bounds: Box3 | null;
  priority: number;
  weight: number;
  blendDistance: number;
  settings: Partial<PostProcessSettings>;
  enabled: boolean;
}
