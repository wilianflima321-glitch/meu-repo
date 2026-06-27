// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, ToneMappingEffect } from 'postprocessing';

export interface PostProcessConfig {
  enabled: boolean;
  bloom: {
    enabled: boolean;
    intensity: number;
    luminanceThreshold: number;
    luminanceSmoothing: number;
  };
  smaa: {
    enabled: boolean;
  };
  tonemapping: {
    enabled: boolean;
    mode: THREE.ToneMapping;
    exposure: number;
  };
}

export interface AAARendererCapabilityReport {
  rendererKind: 'browser-preview-webgl2';
  backend: 'browser-preview';
  colorPipeline: 'srgb-hdr-postprocess';
  antiAliasing: 'smaa';
  postProcessing: Array<'bloom' | 'smaa' | 'tone-mapping'>;
  maxTextureSize: number;
  maxSamples: number;
  supportsFloatRenderTargets: boolean;
  supportsInstancing: boolean;
  supportsFinalOfflineRender: false;
  finalRenderBlockers: string[];
}

export interface AAARendererFrameEvidence {
  backend: 'browser-preview';
  frameId: number;
  frameTimeMs: number;
  pixelRatio: number;
  width: number;
  height: number;
  renderCalls: number;
  triangles: number;
  points: number;
  lines: number;
  memory: {
    geometries: number;
    textures: number;
  };
  finalRenderSafe: false;
  evidenceRefs: string[];
}

const DEFAULT_POST_PROCESS_CONFIG: PostProcessConfig = {
  enabled: true,
  bloom: {
    enabled: true,
    intensity: 1.5,
    luminanceThreshold: 0.9,
    luminanceSmoothing: 0.025,
  },
  smaa: {
    enabled: true,
  },
  tonemapping: {
    enabled: true,
    mode: THREE.ACESFilmicToneMapping,
    exposure: 1,
  },
};

function buildCapabilityReport(renderer: THREE.WebGLRenderer): AAARendererCapabilityReport {
  const gl = renderer.getContext();
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
  const isWebGl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const maxSamples = isWebGl2 ? (gl as WebGL2RenderingContext).getParameter((gl as WebGL2RenderingContext).MAX_SAMPLES) as number : 0;
  const floatExt =
    gl.getExtension('EXT_color_buffer_float') ||
    gl.getExtension('EXT_color_buffer_half_float') ||
    gl.getExtension('OES_texture_float');
  const instancingExt = isWebGl2 || Boolean(gl.getExtension('ANGLE_instanced_arrays'));

  return {
    rendererKind: 'browser-preview-webgl2',
    backend: 'browser-preview',
    colorPipeline: 'srgb-hdr-postprocess',
    antiAliasing: 'smaa',
    postProcessing: ['bloom', 'smaa', 'tone-mapping'],
    maxTextureSize,
    maxSamples: Number.isFinite(maxSamples) ? maxSamples : 0,
    supportsFloatRenderTargets: Boolean(floatExt),
    supportsInstancing: instancingExt,
    supportsFinalOfflineRender: false,
    finalRenderBlockers: [
      'Browser WebGL preview is not a native/cloud final render backend.',
      'Large cinematic/game final output must use runtime-engine-spine local-native or cloud-sandbox evidence.',
      'Do not market this path as Nanite/Lumen-equivalent without render validation reports.',
    ],
  };
}

export class AAARenderer {
  renderer: THREE.WebGLRenderer;
  composer: EffectComposer;
  camera: THREE.PerspectiveCamera;
  scene: THREE.Scene;
  
  private bloomEffect: BloomEffect;
  private smaaEffect: SMAAEffect;
  private toneMappingEffect: ToneMappingEffect;
  private frameId = 0;
  private width: number;
  private height: number;
  private config: PostProcessConfig = DEFAULT_POST_PROCESS_CONFIG;
  private capabilityReport: AAARendererCapabilityReport;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    // 1. High-Precision Renderer Setup
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      powerPreference: "high-performance",
      antialias: false, // We use SMAA instead
      stencil: false,
      depth: true
    });
    
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping; // Handled by post-processing
    this.renderer.toneMappingExposure = DEFAULT_POST_PROCESS_CONFIG.tonemapping.exposure;
    this.capabilityReport = buildCapabilityReport(this.renderer);

    // 2. Initial Scene Setup
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);

    // 3. Post-Processing Stack (Professional Grade)
    this.composer = new EffectComposer(this.renderer, {
      frameBufferType: THREE.HalfFloatType // HDR Support
    });

    // Pass 1: Render Scene
    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    // Pass 2: SMAA (Superior AA)
    this.smaaEffect = new SMAAEffect();
    
    // Pass 3: Bloom (Cinematic Glow)
    this.bloomEffect = new BloomEffect({
      intensity: 1.5,
      luminanceThreshold: 0.9,
      luminanceSmoothing: 0.025
    });

    // Pass 4: Tone Mapping (ACES Filmic - Industry Standard)
    this.toneMappingEffect = new ToneMappingEffect({
      mode: THREE.ACESFilmicToneMapping
    });

    // Combine Effects into optimized passes
    const effectPass = new EffectPass(
      this.camera,
      this.smaaEffect,
      this.bloomEffect,
      this.toneMappingEffect
    );
    
    this.composer.addPass(effectPass);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  render(dt?: number): void;
  render(scene: THREE.Scene, camera: THREE.Camera, dt?: number): void;
  render(sceneOrDt?: THREE.Scene | number, camera?: THREE.Camera, dt?: number) {
    this.frameId += 1;
    const renderPass = this.composer.passes[0] as any;
    
    let activeScene: THREE.Scene = this.scene;
    let activeCamera: THREE.Camera = this.camera;
    let activeDt = dt;

    if (sceneOrDt instanceof THREE.Scene) {
      activeScene = sceneOrDt;
      if (camera) {
        activeCamera = camera;
      }
    } else if (typeof sceneOrDt === 'number') {
      activeDt = sceneOrDt;
    }

    if (renderPass) {
      if (activeScene) renderPass.scene = activeScene;
      if (activeCamera) renderPass.camera = activeCamera;
    }
    this.composer.render(activeDt);
  }

  setSSAO(enabled: boolean, intensity: number = 1.0) {}
  setSSR(enabled: boolean, intensity: number = 1.0) {}
  setBloom(enabled: boolean, intensity: number = 1.0) {
    this.config.bloom.enabled = enabled;
    this.config.bloom.intensity = intensity;
    if (this.bloomEffect) {
      this.bloomEffect.intensity = intensity;
      this.bloomEffect.blendMode.opacity.value = enabled ? 1.0 : 0.0;
    }
  }
  setDOF(enabled: boolean, focusDistance: number = 10) {}
  setMotionBlur(enabled: boolean, intensity: number = 0.5) {}
  setAntialiasing(mode: 'none' | 'fxaa' | 'smaa' | 'taa' | 'msaa') {
    if (this.smaaEffect) {
      this.smaaEffect.blendMode.opacity.value = (mode === 'smaa') ? 1.0 : 0.0;
    }
  }

  setConfig(config: PostProcessConfig) {
    this.config = config;
    if (this.bloomEffect) {
      this.bloomEffect.intensity = config.bloom.intensity;
      this.bloomEffect.luminanceMaterial.threshold = config.bloom.luminanceThreshold;
      this.bloomEffect.luminanceMaterial.smoothing = config.bloom.luminanceSmoothing;
    }
    this.renderer.toneMappingExposure = config.tonemapping.exposure;
  }

  getConfig() {
    return this.config;
  }

  getCapabilityReport(): AAARendererCapabilityReport {
    return this.capabilityReport;
  }

  captureFrameEvidence(frameTimeMs = 0): AAARendererFrameEvidence {
    const info = this.renderer.info;
    return {
      backend: 'browser-preview',
      frameId: this.frameId,
      frameTimeMs,
      pixelRatio: this.renderer.getPixelRatio(),
      width: this.width,
      height: this.height,
      renderCalls: info.render.calls,
      triangles: info.render.triangles,
      points: info.render.points,
      lines: info.render.lines,
      memory: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      finalRenderSafe: false,
      evidenceRefs: [
        'renderer:browser-preview-webgl2',
        'postprocess:smaa-bloom-tonemap',
        'blocker:requires-local-native-or-cloud-final-render',
      ],
    };
  }

  isReadyForFinalRender() {
    return {
      ready: false,
      backend: 'browser-preview' as const,
      blockers: this.capabilityReport.finalRenderBlockers,
    };
  }

  dispose() {
    this.composer.dispose();
    this.renderer.dispose();
  }
}
