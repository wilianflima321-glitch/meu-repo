/**
 * useRenderPipeline Hook
 * 
 * Hook React profissional para integrar o AAA Render System
 * com componentes React. Fornece uma API completa para:
 * - Configuração de pipeline (Forward/Deferred)
 * - Post-processing stack
 * - Quality presets (Ultra/High/Medium/Low/Mobile)
 * - Performance monitoring
 * - Dynamic quality adjustment
 * 
 * @module hooks/useRenderPipeline
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import {
  RenderPipelineConfig,
  GlobalIlluminationConfig,
  VolumetricConfig,
  ShadowConfig,
  PostProcessingStack,
  DEFAULT_PIPELINE_CONFIG,
  LITE_PIPELINE_CONFIG,
  MOBILE_PIPELINE_CONFIG,
  DEFAULT_GI_CONFIG,
  LITE_GI_CONFIG,
  MOBILE_GI_CONFIG,
  DEFAULT_VOLUMETRIC_CONFIG,
  DEFAULT_SHADOW_CONFIG,
} from '../aaa-render-system';

// ============================================================================
// AAA RENDERER INTERFACE (quando disponível)
// ============================================================================

interface AAARenderer {
  render: (scene: THREE.Scene, camera: THREE.Camera) => void;
  resize: (width: number, height: number) => void;
  dispose: () => void;
  setSSAO: (enabled: boolean, intensity: number) => void;
  setSSR: (enabled: boolean, intensity: number) => void;
  setBloom: (enabled: boolean, intensity: number) => void;
  setDOF: (enabled: boolean, focusDistance: number) => void;
  setMotionBlur: (enabled: boolean, intensity: number) => void;
  setAntialiasing: (mode: 'none' | 'fxaa' | 'smaa' | 'taa' | 'msaa') => void;
}

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// QUALITY PRESETS
// ============================================================================

const QUALITY_PRESETS: Record<QualityPreset, {
  pipeline: RenderPipelineConfig;
  gi: GlobalIlluminationConfig;
  shadow: Partial<ShadowConfig>;
  postProcess: Partial<PostProcessingStack>;
}> = {
  ultra: {
    pipeline: DEFAULT_PIPELINE_CONFIG,
    gi: DEFAULT_GI_CONFIG,
    shadow: {
      technique: 'cascaded',
      resolution: 4096,
      cascades: 4,
      contactShadows: true,
    },
    postProcess: {
      antialiasing: 'taa',
    },
  },
  high: {
    pipeline: {
      ...DEFAULT_PIPELINE_CONFIG,
      shadowMapSize: 2048,
      samples: 4,
    },
    gi: {
      ...DEFAULT_GI_CONFIG,
      ssgiSamples: 12,
    },
    shadow: {
      technique: 'cascaded',
      resolution: 2048,
      cascades: 4,
      contactShadows: true,
    },
    postProcess: {
      antialiasing: 'taa',
    },
  },
  medium: {
    pipeline: LITE_PIPELINE_CONFIG,
    gi: LITE_GI_CONFIG,
    shadow: {
      technique: 'pcf',
      resolution: 1024,
      cascades: 2,
      contactShadows: false,
    },
    postProcess: {
      antialiasing: 'fxaa',
    },
  },
  low: {
    pipeline: {
      ...LITE_PIPELINE_CONFIG,
      shadowMapSize: 512,
      hdr: false,
    },
    gi: {
      ...LITE_GI_CONFIG,
      method: 'none',
    },
    shadow: {
      technique: 'basic',
      resolution: 512,
      cascades: 1,
      contactShadows: false,
    },
    postProcess: {
      antialiasing: 'fxaa',
    },
  },
  mobile: {
    pipeline: MOBILE_PIPELINE_CONFIG,
    gi: MOBILE_GI_CONFIG,
    shadow: {
      technique: 'basic',
      resolution: 256,
      cascades: 1,
      contactShadows: false,
    },
    postProcess: {
      antialiasing: 'none',
    },
  },
  custom: {
    pipeline: DEFAULT_PIPELINE_CONFIG,
    gi: DEFAULT_GI_CONFIG,
    shadow: DEFAULT_SHADOW_CONFIG,
    postProcess: {},
  },
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export function useRenderPipeline(options: UseRenderPipelineOptions = {}): UseRenderPipelineReturn {
  const {
    canvas,
    initialQuality = 'high',
    dynamicQuality,
    customPipeline,
    events = {},
  } = options;

  // Refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const aaaRendererRef = useRef<AAARenderer | null>(null);
  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // State
  const [quality, setQualityState] = useState<QualityPreset>(initialQuality);
  const [isInitialized, setIsInitialized] = useState(false);
  const [stats, setStats] = useState<RenderStats>({
    fps: 0,
    frameTime: 0,
    drawCalls: 0,
    triangles: 0,
    points: 0,
    lines: 0,
    textures: 0,
    programs: 0,
    geometries: 0,
    memory: { geometries: 0, textures: 0, total: 0 },
  });
  const [capabilities, setCapabilities] = useState<GPUCapabilities>({
    webgl2: false,
    webgpu: false,
    maxTextureSize: 0,
    maxCubeMapSize: 0,
    maxAnisotropy: 0,
    floatTextures: false,
    halfFloatTextures: false,
    depthTextures: false,
    logarithmicDepthBuffer: false,
    instancing: false,
    multiDrawIndirect: false,
    drawBuffers: 0,
    computeShaders: false,
    rayTracing: false,
    vendor: '',
    renderer: '',
  });

  // Configs
  const [pipelineConfig, setPipelineConfig] = useState<RenderPipelineConfig>(
    customPipeline 
      ? { ...QUALITY_PRESETS[initialQuality].pipeline, ...customPipeline }
      : QUALITY_PRESETS[initialQuality].pipeline
  );
  const [giConfig, setGIConfigState] = useState<GlobalIlluminationConfig>(
    QUALITY_PRESETS[initialQuality].gi
  );
  const [shadowConfig, setShadowConfigState] = useState<ShadowConfig>(
    { ...DEFAULT_SHADOW_CONFIG, ...QUALITY_PRESETS[initialQuality].shadow }
  );
  const [volumetricConfig, setVolumetricConfigState] = useState<VolumetricConfig>(
    DEFAULT_VOLUMETRIC_CONFIG
  );

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  useEffect(() => {
    if (!canvas) return;

    try {
      // Create WebGL renderer
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: pipelineConfig.multisampling,
        powerPreference: 'high-performance',
        alpha: true,
      });

      // Configure renderer
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.toneMapping = pipelineConfig.toneMapping;
      renderer.toneMappingExposure = pipelineConfig.toneMappingExposure;
      renderer.shadowMap.enabled = pipelineConfig.shadowMapEnabled;
      renderer.shadowMap.type = pipelineConfig.shadowMapType;
      renderer.outputColorSpace = pipelineConfig.outputColorSpace;

      rendererRef.current = renderer;

      // Detect capabilities
      const gl = renderer.getContext();
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const drawBuffersExt = gl.getExtension('WEBGL_draw_buffers');
      
      setCapabilities({
        webgl2: renderer.capabilities.isWebGL2,
        webgpu: 'gpu' in navigator,
        maxTextureSize: renderer.capabilities.maxTextureSize,
        maxCubeMapSize: renderer.capabilities.maxCubemapSize,
        maxAnisotropy: renderer.capabilities.getMaxAnisotropy(),
        floatTextures: !!gl.getExtension('OES_texture_float'),
        halfFloatTextures: !!gl.getExtension('OES_texture_half_float'),
        depthTextures: !!gl.getExtension('WEBGL_depth_texture'),
        logarithmicDepthBuffer: renderer.capabilities.logarithmicDepthBuffer,
        instancing: renderer.capabilities.isWebGL2,
        multiDrawIndirect: !!gl.getExtension('WEBGL_multi_draw'),
        drawBuffers: drawBuffersExt ? (gl.getParameter(drawBuffersExt.MAX_DRAW_BUFFERS_WEBGL) as number) : 1,
        computeShaders: false, // WebGL2 doesn't have compute
        rayTracing: false, // Would need WebGPU
        vendor: debugInfo ? (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) as string) : 'Unknown',
        renderer: debugInfo ? (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) as string) : 'Unknown',
      });

      // Note: AAA renderer would be created here if fully implemented
      // For now, use basic Three.js renderer
      aaaRendererRef.current = null;

      setIsInitialized(true);
    } catch (error) {
      events.onError?.(error as Error);
    }

    return () => {
      rendererRef.current?.dispose();
      aaaRendererRef.current?.dispose();
      rendererRef.current = null;
      aaaRendererRef.current = null;
      setIsInitialized(false);
    };
  }, [canvas]);

  // ============================================================================
  // QUALITY MANAGEMENT
  // ============================================================================

  const setQuality = useCallback((preset: QualityPreset) => {
    const presetConfig = QUALITY_PRESETS[preset];
    
    setPipelineConfig(prev => ({
      ...prev,
      ...presetConfig.pipeline,
      ...(customPipeline || {}),
    }));
    setGIConfigState(presetConfig.gi);
    setShadowConfigState(prev => ({
      ...prev,
      ...presetConfig.shadow,
    }));
    
    setQualityState(preset);
    events.onQualityChanged?.(preset);

    // Update renderer settings
    if (rendererRef.current) {
      const config = presetConfig.pipeline;
      rendererRef.current.toneMapping = config.toneMapping;
      rendererRef.current.toneMappingExposure = config.toneMappingExposure;
      rendererRef.current.shadowMap.enabled = config.shadowMapEnabled;
      rendererRef.current.shadowMap.type = config.shadowMapType;
    }
  }, [customPipeline, events]);

  const setCustomPipeline = useCallback((config: Partial<RenderPipelineConfig>) => {
    setPipelineConfig(prev => ({ ...prev, ...config }));
    setQualityState('custom');
  }, []);

  const setGIConfig = useCallback((config: Partial<GlobalIlluminationConfig>) => {
    setGIConfigState(prev => ({ ...prev, ...config }));
  }, []);

  const setShadowConfig = useCallback((config: Partial<ShadowConfig>) => {
    setShadowConfigState(prev => ({ ...prev, ...config }));
  }, []);

  const setVolumetricConfig = useCallback((config: Partial<VolumetricConfig>) => {
    setVolumetricConfigState(prev => ({ ...prev, ...config }));
  }, []);

  // ============================================================================
  // POST-PROCESSING CONTROLS
  // ============================================================================

  const setSSAO = useCallback((enabled: boolean, intensity: number = 1.0) => {
    if (aaaRendererRef.current) {
      aaaRendererRef.current.setSSAO(enabled, intensity);
    }
  }, []);

  const setSSR = useCallback((enabled: boolean, intensity: number = 1.0) => {
    if (aaaRendererRef.current) {
      aaaRendererRef.current.setSSR(enabled, intensity);
    }
  }, []);

  const setBloom = useCallback((enabled: boolean, intensity: number = 1.0) => {
    if (aaaRendererRef.current) {
      aaaRendererRef.current.setBloom(enabled, intensity);
    }
  }, []);

  const setDOF = useCallback((enabled: boolean, focusDistance: number = 10) => {
    if (aaaRendererRef.current) {
      aaaRendererRef.current.setDOF(enabled, focusDistance);
    }
  }, []);

  const setMotionBlur = useCallback((enabled: boolean, intensity: number = 0.5) => {
    if (aaaRendererRef.current) {
      aaaRendererRef.current.setMotionBlur(enabled, intensity);
    }
  }, []);

  const setAntialiasing = useCallback((mode: 'none' | 'fxaa' | 'smaa' | 'taa' | 'msaa') => {
    if (aaaRendererRef.current) {
      aaaRendererRef.current.setAntialiasing(mode);
    }
  }, []);

  // ============================================================================
  // RENDER CONTROL
  // ============================================================================

  const render = useCallback((scene: THREE.Scene, camera: THREE.Camera) => {
    if (!rendererRef.current) return;

    const startTime = performance.now();

    // Render
    if (aaaRendererRef.current) {
      aaaRendererRef.current.render(scene, camera);
    } else {
      rendererRef.current.render(scene, camera);
    }

    // Calculate stats
    const frameTime = performance.now() - startTime;
    frameTimesRef.current.push(frameTime);
    
    // Keep last 60 frames for averaging
    if (frameTimesRef.current.length > 60) {
      frameTimesRef.current.shift();
    }

    // Update stats every 10 frames
    if (frameTimesRef.current.length % 10 === 0) {
      const avgFrameTime = frameTimesRef.current.reduce((a, b) => a + b, 0) / frameTimesRef.current.length;
      const renderer = rendererRef.current;
      const info = renderer.info;

      const newStats: RenderStats = {
        fps: Math.round(1000 / avgFrameTime),
        frameTime: avgFrameTime,
        drawCalls: info.render.calls,
        triangles: info.render.triangles,
        points: info.render.points,
        lines: info.render.lines,
        textures: info.memory.textures,
        programs: info.programs?.length ?? 0,
        geometries: info.memory.geometries,
        memory: {
          geometries: info.memory.geometries,
          textures: info.memory.textures,
          total: (performance as any).memory?.usedJSHeapSize ?? 0,
        },
      };

      setStats(newStats);
      events.onStatsUpdate?.(newStats);

      // Dynamic quality adjustment
      if (dynamicQuality?.enabled) {
        adjustQualityDynamically(newStats.fps);
      }
    }
  }, [events, dynamicQuality]);

  const adjustQualityDynamically = useCallback((currentFPS: number) => {
    if (!dynamicQuality?.enabled) return;

    const { targetFPS, minQuality, maxQuality, hysteresis } = dynamicQuality;
    const qualityOrder: QualityPreset[] = ['mobile', 'low', 'medium', 'high', 'ultra'];
    
    const currentIndex = qualityOrder.indexOf(quality);
    const minIndex = qualityOrder.indexOf(minQuality);
    const maxIndex = qualityOrder.indexOf(maxQuality);

    if (currentFPS < targetFPS - hysteresis && currentIndex > minIndex) {
      // Lower quality
      setQuality(qualityOrder[currentIndex - 1]);
    } else if (currentFPS > targetFPS + hysteresis && currentIndex < maxIndex) {
      // Raise quality
      setQuality(qualityOrder[currentIndex + 1]);
    }
  }, [dynamicQuality, quality, setQuality]);

  const resize = useCallback((width: number, height: number) => {
    if (rendererRef.current) {
      rendererRef.current.setSize(width, height);
    }
    if (aaaRendererRef.current) {
      aaaRendererRef.current.resize(width, height);
    }
  }, []);

  const dispose = useCallback(() => {
    rendererRef.current?.dispose();
    aaaRendererRef.current?.dispose();
    rendererRef.current = null;
    aaaRendererRef.current = null;
    setIsInitialized(false);
  }, []);

  // ============================================================================
  // UTILITIES
  // ============================================================================

  const getRenderer = useCallback(() => {
    return rendererRef.current;
  }, []);

  const screenshot = useCallback((format: 'png' | 'jpeg' = 'png', quality: number = 0.9): string | null => {
    if (!rendererRef.current) return null;
    
    const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
    return rendererRef.current.domElement.toDataURL(mimeType, quality);
  }, []);

  const exportGLTF = useCallback(async (scene: THREE.Scene): Promise<Blob | null> => {
    try {
      const { GLTFExporter } = await import('three/examples/jsm/exporters/GLTFExporter.js');
      const exporter = new GLTFExporter();
      
      return new Promise((resolve, reject) => {
        exporter.parse(
          scene,
          (result) => {
            const output = JSON.stringify(result, null, 2);
            const blob = new Blob([output], { type: 'application/json' });
            resolve(blob);
          },
          (error) => {
            reject(error);
          },
          { binary: false }
        );
      });
    } catch (error) {
      events.onError?.(error as Error);
      return null;
    }
  }, [events]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return useMemo(() => ({
    // Estado
    quality,
    stats,
    capabilities,
    isInitialized,
    
    // Configurações
    pipelineConfig,
    giConfig,
    shadowConfig,
    volumetricConfig,
    
    // Ações de qualidade
    setQuality,
    setCustomPipeline,
    setGIConfig,
    setShadowConfig,
    setVolumetricConfig,
    
    // Post-processing
    setSSAO,
    setSSR,
    setBloom,
    setDOF,
    setMotionBlur,
    setAntialiasing,
    
    // Render control
    render,
    resize,
    dispose,
    
    // Utilities
    getRenderer,
    screenshot,
    exportGLTF,
  }), [
    quality,
    stats,
    capabilities,
    isInitialized,
    pipelineConfig,
    giConfig,
    shadowConfig,
    volumetricConfig,
    setQuality,
    setCustomPipeline,
    setGIConfig,
    setShadowConfig,
    setVolumetricConfig,
    setSSAO,
    setSSR,
    setBloom,
    setDOF,
    setMotionBlur,
    setAntialiasing,
    render,
    resize,
    dispose,
    getRenderer,
    screenshot,
    exportGLTF,
  ]);
}

// ============================================================================
// QUALITY DETECTOR
// ============================================================================

/**
 * Detecta automaticamente a melhor qualidade baseada no hardware
 */
export function detectOptimalQuality(): QualityPreset {
  // Check if mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
  
  if (isMobile) return 'mobile';

  // Check memory
  const memory = (navigator as any).deviceMemory;
  if (memory && memory < 4) return 'low';
  if (memory && memory < 8) return 'medium';

  // Check GPU via WebGL
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
  
  if (!gl) return 'low';

  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  if (debugInfo) {
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
    
    // High-end GPUs
    if (renderer.includes('rtx 40') || renderer.includes('rtx 30') ||
        renderer.includes('rx 7') || renderer.includes('rx 6')) {
      return 'ultra';
    }
    
    // Mid-range GPUs
    if (renderer.includes('rtx 20') || renderer.includes('gtx 16') ||
        renderer.includes('rx 5') || renderer.includes('gtx 1080') ||
        renderer.includes('gtx 1070')) {
      return 'high';
    }
    
    // Entry GPUs
    if (renderer.includes('gtx 1060') || renderer.includes('gtx 1050') ||
        renderer.includes('rx 580') || renderer.includes('rx 570')) {
      return 'medium';
    }
    
    // Integrated GPUs
    if (renderer.includes('intel') || renderer.includes('integrated')) {
      return 'low';
    }
  }

  // Default to medium
  return 'medium';
}

export default useRenderPipeline;
