// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import * as THREE from 'three';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, ToneMappingEffect } from 'postprocessing';
import { RadianceFrameWire, createRadianceFrameWire } from '@/lib/radiance/radiance-frame-wire';
import type { RadianceFrameTickResult } from '@/lib/radiance/radiance-frame-wire';
import {
  DualQuaternionViewportWire,
  createDualQuaternionViewportWire,
} from '@/lib/character/dq-viewport-wire';
import type { BonePoseSample } from '@/lib/character/dual-quaternion-skinning';
import type { DualQuaternionGpuDeviceLike } from '@/lib/character/dual-quaternion-skinning';
import {
  resolveFsrSrgExecutorPlan,
  resolveInternalPresentSize,
  type FsrSrgExecutorPlan,
} from '@aethel/engine/render/scalable-render-graph';
import {
  enableCosmosReversedZOnCamera,
  tickCosmosRender,
} from '@/lib/cosmos/cosmos-render-wire';
import { buildDualSpaceBvh, selectBvhSpaceForRay, type DualSpaceBvhPair } from '@/lib/cosmos/dual-bvh';
import { resolveCosmosCapabilityBudget } from '@/lib/cosmos/cosmos-capability-budget';
import {
  bindPbrSkyScene,
  tickPbrSkyViewport,
  type PbrSkySceneTarget,
} from '@/lib/cosmos/pbr-sky-viewport-wire';
import {
  createOceanRenderPass,
  OceanRenderPass,
  type DuckWaterParams,
  type OceanMaterialTarget,
  type OceanRenderPassTickResult,
} from '@/lib/ocean/ocean-render-pass';
import {
  createOceanViewportMockMesh,
  type OceanMeshTarget,
} from '@/lib/ocean/ocean-viewport-wire';
import {
  configureGpuOceanFftContext,
  ensureGpuOceanFftSoak,
  getLastGpuOceanFftSoak,
  type GpuOceanFftGpuDeviceLike,
} from '@/lib/ocean/gpu-fft-ocean';
import { recordPresentPathTick } from '@/lib/production/render-path-honesty';

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
  /** Letter bt — radiance participation (software path; HW RT never claimed). */
  radianceWired: boolean;
  radianceCapabilityScore: number | null;
  /** Letter ci — FSR SRG spatial upscale participation. */
  fsrWired: boolean;
  fsrCapabilityScore: number | null;
  fsrUpscaleActive: boolean;
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
  /** CW3 — which present path ticked (AAA WebGL off-canvas; not R3F IDE Canvas). */
  presentPathId: 'web-aaa-webgl-offcanvas';
  webgpuPresentClaimed: false;
  radiance?: {
    frameHooksReal: boolean;
    rtRendered: boolean;
    cloudsRendered: boolean;
    shadowsRendered: boolean;
    /** Letter cf — software RT blitted onto visible frame. */
    rtComposited?: boolean;
    cloudShipStatus: 'CLOSED' | 'HELD';
    depthBlendUsed?: boolean;
    godRaysUsed?: boolean;
    marketingFullVolumetricAaaAllowed: false;
    hwRayTracingClaimAllowed: false;
  };
  /** Letter ci — FSR SRG executor frame evidence. */
  fsr?: {
    wired: boolean;
    upscaleActive: boolean;
    mode: FsrSrgExecutorPlan['mode'];
    internalScale: number;
    dlssNativeAllowed: false;
  };
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

function buildCapabilityReport(
  renderer: THREE.WebGLRenderer,
  opts?: {
    radiance?: { wired: boolean; score: number | null };
    fsr?: { wired: boolean; score: number | null; upscaleActive: boolean };
  },
): AAARendererCapabilityReport {
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
    radianceWired: opts?.radiance?.wired === true,
    radianceCapabilityScore: opts?.radiance?.score ?? null,
    fsrWired: opts?.fsr?.wired === true,
    fsrCapabilityScore: opts?.fsr?.score ?? null,
    fsrUpscaleActive: opts?.fsr?.upscaleActive === true,
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
  /** Letter bt — BVH+RT+denoiser+VSM+clouds participate when capability allows. */
  private radianceWire: RadianceFrameWire | null = null;
  private lastRadianceTick: RadianceFrameTickResult | null = null;
  /** Letter bv — DQ compute skinning viewport wire when WebGPU present. */
  private dqViewportWire: DualQuaternionViewportWire | null = null;
  private dqBonePoses: BonePoseSample[] | null = null;
  /** Letter ci — CapScore FSR / spatial upscale plan for composer internal size. */
  private fsrPlan: FsrSrgExecutorPlan | null = null;
  private fsrCapabilityScore: number | null = null;
  /** Letter cn — Cosmos reverse-Z + dual BVH for Radiance scale. */
  private cosmosEnabled = false;
  private cosmosCapabilityScore: number | null = null;
  private cosmosDualBvh: DualSpaceBvhPair | null = null;
  /** Letter cp — Rayleigh/Mie scene background (visible frame; no painted skybox). */
  private cosmosPbrSkyTarget: PbrSkySceneTarget | null = null;
  private readonly cosmosViewDir = new THREE.Vector3(0, 1, 0);
  /** Letter cq — OceanRenderPass (WaterParams + PBR sky sun/clouds; not mock visual-only). */
  private oceanRenderPass: OceanRenderPass | null = null;
  private oceanCapabilityScore: number | null = null;
  private lastOceanTick: OceanRenderPassTickResult | null = null;
  private readonly oceanSunDir = new THREE.Vector3(0.25, 0.9, 0.15);

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
    this.capabilityReport = buildCapabilityReport(this.renderer, {
      radiance: { wired: false, score: null },
      fsr: { wired: false, score: null, upscaleActive: false },
    });

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

    // Letter bt — lazy radiance wire (fail-closed until enableRadiance)
  }

  /**
   * Wire Radiance into the live frame (Law XV Capability Score).
   * GT730 / low score: no RT; adaptive clouds; tiny cascades.
   */
  enableRadiance(capabilityScore: number, opts?: { rayTracingOptIn?: boolean }): RadianceFrameWire {
    this.radianceWire?.dispose();
    this.radianceWire = createRadianceFrameWire(this.renderer, this.scene, this.camera, {
      capabilityScore,
      rayTracingOptIn: opts?.rayTracingOptIn,
      cloudsOptIn: true,
      shadowsOptIn: true,
    });
    this.rebuildCapabilityReport(capabilityScore);
    return this.radianceWire;
  }

  getRadianceWire(): RadianceFrameWire | null {
    return this.radianceWire;
  }

  setRadianceCapabilityScore(score: number): void {
    this.radianceWire?.setCapabilityScore(score);
    if (this.radianceWire) {
      this.rebuildCapabilityReport(score);
    }
  }

  /**
   * Letter ci — wire CapScore FSR spatial upscale into composer → Present.
   * Internal composer size = present × internalScale; final blit stretches (spatial).
   * Native CapScore → Zero-UI (no upscale chrome). DLSS never enabled on web.
   */
  enableFsrUpscale(capabilityScore: number): FsrSrgExecutorPlan {
    this.fsrCapabilityScore = capabilityScore;
    this.fsrPlan = resolveFsrSrgExecutorPlan({ capabilityScore });
    this.applyFsrComposerSize();
    this.rebuildCapabilityReport(capabilityScore);
    return this.fsrPlan;
  }

  getFsrPlan(): FsrSrgExecutorPlan | null {
    return this.fsrPlan;
  }

  /**
   * Letter cn — enable Cosmos reverse-Z + dual-space BVH stubs for Radiance scale.
   * Letter cp — bind Rayleigh/Mie PBR sky into scene.background (visible frame).
   * GT730: reverse-Z still on; dual BVH fine radius + sky samples CapScore-degraded.
   */
  enableCosmos(capabilityScore: number): {
    reversedZ: boolean
    dualBvh: DualSpaceBvhPair
  } {
    this.cosmosEnabled = true;
    this.cosmosCapabilityScore = capabilityScore;
    const rz = enableCosmosReversedZOnCamera(this.camera, capabilityScore);
    this.cosmosDualBvh = buildDualSpaceBvh({
      solarBodies: [{ id: 'origin-star', x: 0, y: 0, z: 0, radiusM: 1e8 }],
      localMeshes: [],
      playerX: this.camera.position.x,
      playerY: this.camera.position.y,
      playerZ: this.camera.position.z,
      fineRadiusM: capabilityScore < 20 ? 250 : 1000,
    });
    // Letter cp — solid Color background from Rayleigh/Mie (never a painted cubemap).
    if (!(this.scene.background instanceof THREE.Color)) {
      this.scene.background = new THREE.Color(0.4, 0.6, 0.9);
    }
    this.cosmosPbrSkyTarget = {
      setBackgroundRgb: (r, g, b) => {
        const bg = this.scene.background;
        if (bg instanceof THREE.Color) {
          bg.setRGB(r, g, b);
        } else {
          this.scene.background = new THREE.Color(r, g, b);
        }
      },
    };
    bindPbrSkyScene(this.cosmosPbrSkyTarget);
    return { reversedZ: rz.reversed, dualBvh: this.cosmosDualBvh };
  }

  getCosmosDualBvh(): DualSpaceBvhPair | null {
    return this.cosmosDualBvh;
  }

  isCosmosEnabled(): boolean {
    return this.cosmosEnabled;
  }

  /**
   * Letter cq — OceanRenderPass: FFT mesh bind + WaterParams + sun/cloud from PBR/Radiance.
   * Letter cs — optional WebGPU compute FFT when adapter+device+soak; CPU Zero-UI fallback.
   * Zero-UI when userEnabled false. Fake visual-only water mock is not the shipped path.
   */
  enableOcean(
    capabilityScore: number,
    opts?: {
      userEnabled?: boolean
      waterParams?: DuckWaterParams | null
      mesh?: OceanMeshTarget | null
      material?: OceanMaterialTarget | null
      /** When true and no mesh provided, bind a CapScore plane for soak/IDE. */
      createDefaultMesh?: boolean
      /** Letter cs — WebGPU adapter present. */
      webgpuAvailable?: boolean
      webgpuComputeAvailable?: boolean
      device?: GpuOceanFftGpuDeviceLike | null
    },
  ): OceanRenderPass {
    this.oceanRenderPass?.dispose();
    this.oceanCapabilityScore = capabilityScore;
    this.oceanRenderPass = createOceanRenderPass(capabilityScore);
    let mesh = opts?.mesh ?? null;
    if (!mesh && opts?.createDefaultMesh !== false) {
      const segments =
        capabilityScore >= 75 ? 32 : capabilityScore >= 45 ? 24 : capabilityScore >= 20 ? 16 : 8;
      mesh = createOceanViewportMockMesh(segments).target;
    }
    const waterParams: DuckWaterParams = {
      fftOceanEnabled: true,
      capabilityScore,
      waveScale: 1,
      reflectionIntensity: 0.85,
      transparency: 0.8,
      ...(opts?.waterParams ?? {}),
    };
    this.oceanRenderPass.bind({
      mesh,
      material: opts?.material ?? null,
      waterParams,
      capabilityScore,
      userEnabled: opts?.userEnabled !== false,
    });
    // Letter cs — configure GPU FFT context; soak only when compute device present.
    if (opts?.webgpuAvailable === true && opts?.webgpuComputeAvailable === true && opts?.device) {
      ensureGpuOceanFftSoak({
        capabilityScore,
        webgpuAvailable: true,
        webgpuComputeAvailable: true,
        device: opts.device,
        frames: 8,
      });
    } else {
      configureGpuOceanFftContext({
        webgpuAvailable: opts?.webgpuAvailable === true,
        webgpuComputeAvailable: opts?.webgpuComputeAvailable === true,
        capabilityScore,
        soakPassed: false,
        soakFramesProven: 0,
        device: opts?.device ?? null,
      });
    }
    return this.oceanRenderPass;
  }

  getOceanPass(): OceanRenderPass | null {
    return this.oceanRenderPass;
  }

  setOceanWaterParams(params: DuckWaterParams | null): void {
    this.oceanRenderPass?.setWaterParams(params);
  }

  setOceanSunAndClouds(input: {
    sunDir?: { x: number; y: number; z: number }
    cloudCoverage?: number
  }): void {
    if (input.sunDir) {
      this.oceanSunDir.set(input.sunDir.x, input.sunDir.y, input.sunDir.z);
    }
    this.oceanRenderPass?.setSunAndClouds(input);
  }

  getLastOceanTick(): OceanRenderPassTickResult | null {
    return this.lastOceanTick;
  }

  setFsrCapabilityScore(score: number): void {
    if (!this.fsrPlan) return;
    this.enableFsrUpscale(score);
  }

  private rebuildCapabilityReport(scoreHint?: number): void {
    const radianceScore =
      scoreHint ?? this.fsrCapabilityScore ?? this.capabilityReport.radianceCapabilityScore;
    this.capabilityReport = buildCapabilityReport(this.renderer, {
      radiance: {
        wired: this.radianceWire !== null,
        score: this.radianceWire ? (radianceScore ?? null) : null,
      },
      fsr: {
        wired: this.fsrPlan !== null,
        score: this.fsrCapabilityScore,
        upscaleActive: this.fsrPlan?.upscaleActive === true,
      },
    });
  }

  private applyFsrComposerSize(): void {
    if (!this.fsrPlan) {
      this.composer.setSize(this.width, this.height);
      return;
    }
    if (!this.fsrPlan.upscaleActive) {
      // Zero-UI: native present size — no upscale path.
      this.composer.setSize(this.width, this.height);
      return;
    }
    const { internalWidth, internalHeight } = resolveInternalPresentSize(
      this.width,
      this.height,
      this.fsrPlan.internalScale,
    );
    this.composer.setSize(internalWidth, internalHeight);
  }

  /**
   * Letter bv — wire DQ compute skinning into viewport when WebGPU present.
   * `dqComputeSkinningReady` flips only after soak; WebGL2/CPU fallback honest.
   */
  enableDualQuaternionSkinning(opts?: {
    capabilityScore?: number;
    webgpuAvailable?: boolean;
    webgpuComputeAvailable?: boolean;
    device?: DualQuaternionGpuDeviceLike | null;
  }): DualQuaternionViewportWire {
    this.dqViewportWire?.dispose();
    this.dqViewportWire = createDualQuaternionViewportWire({
      capabilityScore: opts?.capabilityScore ?? 38,
      webgpuAvailable: opts?.webgpuAvailable === true,
      webgpuComputeAvailable: opts?.webgpuComputeAvailable === true,
      device: opts?.device ?? null,
    });
    if (opts?.webgpuAvailable && opts?.webgpuComputeAvailable && opts?.device) {
      this.dqViewportWire.ensureSoak();
    }
    return this.dqViewportWire;
  }

  getDualQuaternionViewportWire(): DualQuaternionViewportWire | null {
    return this.dqViewportWire;
  }

  /** Motion Matching bone poses for DQ viewport tick (SOA order). */
  setDualQuaternionBonePoses(poses: BonePoseSample[] | null): void {
    this.dqBonePoses = poses;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer.setSize(width, height);
    this.applyFsrComposerSize();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.radianceWire?.resize(width, height);
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

    // Letter bt — radiance pre (shadows/RT); letter by — clouds post-composer for depth blend
    const stepDt = typeof activeDt === 'number' && Number.isFinite(activeDt) ? activeDt : 1 / 60;
    if (this.radianceWire) {
      this.radianceWire.tickPre(stepDt);
    }

    // Letter bv — DQ compute skin participates when wired + MM bone poses present
    if (this.dqViewportWire && this.dqBonePoses && this.dqBonePoses.length > 0) {
      this.dqViewportWire.tick(this.dqBonePoses);
    }

    // Letter cp — apply Rayleigh/Mie to scene.background BEFORE present (visible frame).
    // Zero-UI when cosmos off. CapScore degrades sample count (GT730 = 4).
    if (this.cosmosEnabled) {
      const score = this.cosmosCapabilityScore ?? 38;
      this.camera.getWorldDirection(this.cosmosViewDir);
      tickPbrSkyViewport({
        capabilityScore: score,
        userEnabled: true,
        viewDir: {
          x: this.cosmosViewDir.x,
          y: this.cosmosViewDir.y,
          z: this.cosmosViewDir.z,
        },
        target: this.cosmosPbrSkyTarget,
      });
    }

    // Letter cq — OceanRenderPass FFT displace + sun/cloud coupling before present.
    // Couples to Radiance clouds when wired; else last setOceanSunAndClouds / default.
    if (this.oceanRenderPass) {
      const cloudsActive = this.radianceWire?.isCloudsActive() === true;
      this.oceanRenderPass.setSunAndClouds({
        sunDir: {
          x: this.oceanSunDir.x,
          y: this.oceanSunDir.y,
          z: this.oceanSunDir.z,
        },
        cloudCoverage: cloudsActive ? 0.45 : 0.15,
      });
      this.lastOceanTick = this.oceanRenderPass.tick(this.frameId);
    }

    this.composer.render(activeDt);

    // CW3 honesty hook — record off-canvas AAA WebGL present tick (not R3F IDE Canvas; never WebGPU).
    recordPresentPathTick('web-aaa-webgl-offcanvas', {
      frameId: this.frameId,
      note: 'AAARenderer WebGL composer present (playtest/off-canvas)',
    });

    if (this.radianceWire) {
      this.lastRadianceTick = this.radianceWire.tickPost(stepDt);
    }

    // Letter cn/co — floating-origin / dual BVH query smoke (Zero-UI when off).
    // Sky sample in tickCosmosRender remains interface smoke; cp owns visible apply above.
    if (this.cosmosEnabled) {
      const score = this.cosmosCapabilityScore ?? 38;
      const budget = resolveCosmosCapabilityBudget(score);
      tickCosmosRender({
        capabilityScore: score,
        targets: {
          camera: this.camera,
          objects: [],
        },
        cameraRelative: {
          x: this.camera.position.x,
          y: this.camera.position.y,
          z: this.camera.position.z,
        },
        enableSky: true,
      });
      // Letter co — dual BVH rebuild + query each frame (CapScore fine radius).
      this.cosmosDualBvh = buildDualSpaceBvh({
        solarBodies: [{ id: 'origin-star', x: 0, y: 0, z: 0, radiusM: 1e8 }],
        localMeshes: [
          {
            id: 'cam-near',
            x: this.camera.position.x + 5,
            y: this.camera.position.y,
            z: this.camera.position.z,
            halfExtentM: 2,
          },
        ],
        playerX: this.camera.position.x,
        playerY: this.camera.position.y,
        playerZ: this.camera.position.z,
        fineRadiusM: budget.fineBvhRadiusM,
      });
      void selectBvhSpaceForRay(
        this.cosmosDualBvh,
        this.camera.position.x,
        this.camera.position.y,
        this.camera.position.z,
      );
    }
  }

  setSSAO(_enabled: boolean, _intensity: number = 1.0) {}
  setSSR(_enabled: boolean, _intensity: number = 1.0) {}
  setBloom(enabled: boolean, intensity: number = 1.0) {
    this.config.bloom.enabled = enabled;
    this.config.bloom.intensity = intensity;
    if (this.bloomEffect) {
      this.bloomEffect.intensity = intensity;
      this.bloomEffect.blendMode.opacity.value = enabled ? 1.0 : 0.0;
    }
  }
  setDOF(_enabled: boolean, _focusDistance: number = 10) {}
  setMotionBlur(_enabled: boolean, _intensity: number = 0.5) {}
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
    const radianceTick = this.lastRadianceTick;
    const evidenceRefs = [
      'renderer:browser-preview-webgl2',
      'postprocess:smaa-bloom-tonemap',
      'blocker:requires-local-native-or-cloud-final-render',
    ];
    if (this.radianceWire) {
      evidenceRefs.push('radiance:frame-wire-bt');
      evidenceRefs.push('radiance:viewport-enable-cf');
      if (radianceTick?.frameHooksReal) evidenceRefs.push('radiance:hooks-proven');
      if (radianceTick?.rtComposited) evidenceRefs.push('radiance:rt-composite-cf');
      evidenceRefs.push(
        this.radianceWire.getCloudShipStatus() === 'CLOSED'
          ? 'radiance:cloud-ship-CLOSED'
          : 'radiance:cloud-ship-HELD',
      );
      evidenceRefs.push('radiance:hw-rt-claim-forbidden');
    }
    if (this.dqViewportWire) {
      evidenceRefs.push('character:dq-compute-skin-bv');
      if (this.dqViewportWire.getLastPlan()?.dqComputeSkinningReady) {
        evidenceRefs.push('character:dq-compute-ready');
      } else {
        evidenceRefs.push('character:dq-compute-HELD-fallback');
      }
      evidenceRefs.push('character:aaa-skinning-marketing-forbidden');
    }
    if (this.fsrPlan) {
      evidenceRefs.push('fsr:srg-executor-ci');
      if (this.fsrPlan.upscaleActive) {
        evidenceRefs.push('fsr:upscale-active');
      } else {
        evidenceRefs.push('fsr:native-zero-ui');
      }
      evidenceRefs.push('fsr:dlss-web-HELD');
    }
    if (this.oceanRenderPass) {
      evidenceRefs.push('ocean:render-pass-cq');
      if (this.lastOceanTick?.meshDisplaced) evidenceRefs.push('ocean:fft-mesh-displaced');
      if (this.lastOceanTick?.skyCoupled) evidenceRefs.push('ocean:sun-cloud-coupled');
      evidenceRefs.push('ocean:fake-visual-only-forbidden');
      evidenceRefs.push('ocean:ue-water-parity-HELD');
      if (getLastGpuOceanFftSoak()?.gpuFftOceanReady === true) {
        evidenceRefs.push('ocean:gpu-fft-cs-ready');
      } else {
        evidenceRefs.push('ocean:gpu-fft-HELD-cpu-fallback');
      }
      evidenceRefs.push('ocean:gpu-fft-marketing-HELD');
      evidenceRefs.push('ocean:coins-agones-nanite-dlss-HELD');
    }
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
      presentPathId: 'web-aaa-webgl-offcanvas',
      webgpuPresentClaimed: false,
      memory: {
        geometries: info.memory.geometries,
        textures: info.memory.textures,
      },
      finalRenderSafe: false,
      evidenceRefs,
      radiance: this.radianceWire
        ? {
            frameHooksReal: radianceTick?.frameHooksReal === true,
            rtRendered: radianceTick?.rtRendered === true,
            cloudsRendered: radianceTick?.cloudsRendered === true,
            shadowsRendered: radianceTick?.shadowsRendered === true,
            rtComposited: radianceTick?.rtComposited === true,
            cloudShipStatus: this.radianceWire.getCloudShipStatus(),
            depthBlendUsed: radianceTick?.depthBlendUsed === true,
            godRaysUsed: radianceTick?.godRaysUsed === true,
            marketingFullVolumetricAaaAllowed: false,
            hwRayTracingClaimAllowed: false,
          }
        : undefined,
      fsr: this.fsrPlan
        ? {
            wired: true,
            upscaleActive: this.fsrPlan.upscaleActive,
            mode: this.fsrPlan.mode,
            internalScale: this.fsrPlan.internalScale,
            dlssNativeAllowed: false,
          }
        : undefined,
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
    this.radianceWire?.dispose();
    this.radianceWire = null;
    this.dqViewportWire?.dispose();
    this.dqViewportWire = null;
    this.dqBonePoses = null;
    this.fsrPlan = null;
    this.fsrCapabilityScore = null;
    this.oceanRenderPass?.dispose();
    this.oceanRenderPass = null;
    this.oceanCapabilityScore = null;
    this.lastOceanTick = null;
    this.composer.dispose();
    this.renderer.dispose();
  }
}
