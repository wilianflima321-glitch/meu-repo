// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
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
import { DEFAULT_VOLUMETRIC_CONFIG, DEFAULT_SHADOW_CONFIG } from '../aaa-render-system';
import type { GlobalIlluminationConfig, RenderPipelineConfig, ShadowConfig, VolumetricConfig } from '../aaa-render-system';
import { QUALITY_PRESETS } from './useRenderPipeline.presets';
import type { DynamicQualityConfig, GPUCapabilities, QualityPreset, RenderStats, UseRenderPipelineOptions, UseRenderPipelineReturn } from './useRenderPipeline.types';
import { AAARenderer } from '../aaa-renderer-impl';

// ============================================================================
// AAA RENDERER INTERFACE (quando disponível)
// ============================================================================

export { detectOptimalQuality } from './useRenderPipeline.quality';
export type {
  DynamicQualityConfig,
  GPUCapabilities,
  QualityPreset,
  RenderStats,
  UseRenderPipelineOptions,
  UseRenderPipelineReturn,
} from './useRenderPipeline.types';



// ============================================================================
// TYPES
// ============================================================================

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
  const eventsRef = useRef(events);

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

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

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

      // Instantiate real AAARenderer
      aaaRendererRef.current = new AAARenderer(canvas, canvas.clientWidth, canvas.clientHeight);

      setIsInitialized(true);
    } catch (error) {
      eventsRef.current.onError?.(error as Error);
    }

    return () => {
      rendererRef.current?.dispose();
      aaaRendererRef.current?.dispose();
      rendererRef.current = null;
      aaaRendererRef.current = null;
      setIsInitialized(false);
    };
  }, [
    canvas,
    pipelineConfig.multisampling,
    pipelineConfig.outputColorSpace,
    pipelineConfig.shadowMapEnabled,
    pipelineConfig.shadowMapType,
    pipelineConfig.toneMapping,
    pipelineConfig.toneMappingExposure,
  ]);

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
      eventsRef.current.onQualityChanged?.(preset);

    // Update renderer settings
    if (rendererRef.current) {
      const config = presetConfig.pipeline;
      rendererRef.current.toneMapping = config.toneMapping;
      rendererRef.current.toneMappingExposure = config.toneMappingExposure;
      rendererRef.current.shadowMap.enabled = config.shadowMapEnabled;
      rendererRef.current.shadowMap.type = config.shadowMapType;
    }
  }, [customPipeline]);

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
      eventsRef.current.onStatsUpdate?.(newStats);

      // Dynamic quality adjustment
      if (dynamicQuality?.enabled) {
        adjustQualityDynamically(newStats.fps);
      }
    }
  }, [adjustQualityDynamically, dynamicQuality]);

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
      eventsRef.current.onError?.(error as Error);
      return null;
    }
  }, []);

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
