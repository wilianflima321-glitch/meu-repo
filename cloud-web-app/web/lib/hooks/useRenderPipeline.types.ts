import type * as THREE from 'three';

import type { GlobalIlluminationConfig, RenderPipelineConfig, ShadowConfig, VolumetricConfig } from '../aaa-render-system';

export type QualityPreset = 'ultra' | 'high' | 'medium' | 'low' | 'mobile' | 'custom';

export interface RenderStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  points: number;
  lines: number;
  textures: number;
  programs: number;
  geometries: number;
  memory: {
    geometries: number;
    textures: number;
    total: number;
  };
}

export interface GPUCapabilities {
  webgl2: boolean;
  webgpu: boolean;
  maxTextureSize: number;
  maxCubeMapSize: number;
  maxAnisotropy: number;
  floatTextures: boolean;
  halfFloatTextures: boolean;
  depthTextures: boolean;
  logarithmicDepthBuffer: boolean;
  instancing: boolean;
  multiDrawIndirect: boolean;
  drawBuffers: number;
  computeShaders: boolean;
  rayTracing: boolean;
  vendor: string;
  renderer: string;
}

export interface DynamicQualityConfig {
  enabled: boolean;
  targetFPS: number;
  minQuality: QualityPreset;
  maxQuality: QualityPreset;
  adaptationSpeed: number;
  hysteresis: number;
}

export interface UseRenderPipelineOptions {
  /** Canvas element ou container */
  canvas?: HTMLCanvasElement | null;
  /** Preset de qualidade inicial */
  initialQuality?: QualityPreset;
  /** Habilitar Dynamic Quality Adjustment */
  dynamicQuality?: DynamicQualityConfig;
  /** Pipeline config customizado */
  customPipeline?: Partial<RenderPipelineConfig>;
  /** Callbacks de eventos */
  events?: {
    onQualityChanged?: (quality: QualityPreset) => void;
    onStatsUpdate?: (stats: RenderStats) => void;
    onError?: (error: Error) => void;
  };
}

export interface UseRenderPipelineReturn {
  // Estado
  quality: QualityPreset;
  stats: RenderStats;
  capabilities: GPUCapabilities;
  isInitialized: boolean;

  // Configurações
  pipelineConfig: RenderPipelineConfig;
  giConfig: GlobalIlluminationConfig;
  shadowConfig: ShadowConfig;
  volumetricConfig: VolumetricConfig;

  // Ações de qualidade
  setQuality: (preset: QualityPreset) => void;
  setCustomPipeline: (config: Partial<RenderPipelineConfig>) => void;
  setGIConfig: (config: Partial<GlobalIlluminationConfig>) => void;
  setShadowConfig: (config: Partial<ShadowConfig>) => void;
  setVolumetricConfig: (config: Partial<VolumetricConfig>) => void;

  // Post-processing
  setSSAO: (enabled: boolean, intensity?: number) => void;
  setSSR: (enabled: boolean, intensity?: number) => void;
  setBloom: (enabled: boolean, intensity?: number) => void;
  setDOF: (enabled: boolean, focusDistance?: number) => void;
  setMotionBlur: (enabled: boolean, intensity?: number) => void;
  setAntialiasing: (mode: 'none' | 'fxaa' | 'smaa' | 'taa' | 'msaa') => void;

  // Render control
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;

  // Utilities
  getRenderer: () => THREE.WebGLRenderer | null;
  screenshot: (format?: 'png' | 'jpeg', quality?: number) => string | null;
  exportGLTF: (scene: THREE.Scene) => Promise<Blob | null>;
}
