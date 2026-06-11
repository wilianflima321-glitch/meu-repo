// @aethel-heavy-async-boundary

import { THREE } from './pbr-three-namespace';
import type { Camera, Mesh, OrthographicCamera, Scene, ShaderMaterial, WebGLRenderTarget, WebGLRenderer } from '@/lib/three';
import { COMPOSITE_FRAGMENT_SHADER } from './post-process-shaders';
import type { PostProcessSettings } from './post-process-volume.contracts';
import { DEFAULT_POST_PROCESS_SETTINGS } from './post-process-volume.presets';

export class PostProcessPass {
  private renderer: WebGLRenderer;
  private scene: Scene;
  private camera: Camera;
  private settings: PostProcessSettings;

  private renderTarget1: WebGLRenderTarget;
  private renderTarget2: WebGLRenderTarget;

  private quadScene: Scene;
  private quadCamera: OrthographicCamera;
  private quadMesh: Mesh;

  private compositeShader: ShaderMaterial;

  constructor(
    renderer: WebGLRenderer,
    scene: Scene,
    camera: Camera,
    width: number,
    height: number
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.settings = { ...DEFAULT_POST_PROCESS_SETTINGS };

    // Create render targets
    this.renderTarget1 = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });

    this.renderTarget2 = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });

    // Create fullscreen quad
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.compositeShader = this.createCompositeShader();

    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeometry, this.compositeShader);
    this.quadScene.add(this.quadMesh);
  }

  private createCompositeShader(): ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: null },
        uTime: { value: 0 },

        // Color grading
        uExposure: { value: 1 },
        uContrast: { value: 1 },
        uSaturation: { value: 1 },
        uTemperature: { value: 0 },
        uTint: { value: 0 },

        // Vignette
        uVignetteEnabled: { value: false },
        uVignetteIntensity: { value: 0.3 },
        uVignetteSmoothness: { value: 0.5 },
        uVignetteColor: { value: new THREE.Color(0, 0, 0) },

        // Film grain
        uFilmGrainEnabled: { value: false },
        uFilmGrainIntensity: { value: 0.1 },

        // Chromatic aberration
        uChromaticAberrationEnabled: { value: false },
        uChromaticAberrationIntensity: { value: 0.005 },

        // Tonemapping
        uTonemappingMode: { value: 2 }, // 0=none, 1=reinhard, 2=aces, 3=filmic
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: COMPOSITE_FRAGMENT_SHADER,
    });
  }

  setSettings(settings: PostProcessSettings): void {
    this.settings = settings;
    this.updateUniforms();
  }

  private updateUniforms(): void {
    const u = this.compositeShader.uniforms;

    u.uExposure.value = this.settings.exposure;
    u.uContrast.value = this.settings.contrast;
    u.uSaturation.value = this.settings.saturation;
    u.uTemperature.value = this.settings.temperature;
    u.uTint.value = this.settings.tint;

    u.uVignetteEnabled.value = this.settings.vignetteEnabled;
    u.uVignetteIntensity.value = this.settings.vignetteIntensity;
    u.uVignetteSmoothness.value = this.settings.vignetteSmoothness;
    u.uVignetteColor.value = this.settings.vignetteColor;

    u.uFilmGrainEnabled.value = this.settings.filmGrainEnabled;
    u.uFilmGrainIntensity.value = this.settings.filmGrainIntensity;

    u.uChromaticAberrationEnabled.value = this.settings.chromaticAberrationEnabled;
    u.uChromaticAberrationIntensity.value = this.settings.chromaticAberrationIntensity;

    const modeMap: Record<string, number> = {
      'none': 0,
      'reinhard': 1,
      'aces': 2,
      'filmic': 3,
      'uncharted2': 4,
    };
    u.uTonemappingMode.value = this.settings.tonemappingEnabled
      ? (modeMap[this.settings.tonemappingMode] ?? 2)
      : 0;
  }

  render(): void {
    // Render scene to target
    this.renderer.setRenderTarget(this.renderTarget1);
    this.renderer.render(this.scene, this.camera);

    // Apply post-processing
    this.compositeShader.uniforms.uTexture.value = this.renderTarget1.texture;
    this.compositeShader.uniforms.uTime.value = performance.now() / 1000;

    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  resize(width: number, height: number): void {
    this.renderTarget1.setSize(width, height);
    this.renderTarget2.setSize(width, height);
  }

  dispose(): void {
    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.compositeShader.dispose();
    this.quadMesh.geometry.dispose();
  }
}
