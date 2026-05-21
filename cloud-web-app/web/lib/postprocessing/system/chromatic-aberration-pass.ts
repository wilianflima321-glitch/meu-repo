// @aethel-heavy-async-boundary render-gated post-processing runtime.
import * as THREE from 'three';
import { PostProcessingPass } from './pass';
import { type ChromaticAberrationSettings } from './types';

export class ChromaticAberrationPass extends PostProcessingPass {
  name = 'chromaticAberration';

  private settings: ChromaticAberrationSettings = {
    enabled: false,
    intensity: 0.02,
    radialModulation: true,
  };

  private fullscreenQuad: THREE.Mesh;

  constructor() {
    super();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        intensity: { value: 0.02 },
        radialModulation: { value: true },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float intensity;
        uniform bool radialModulation;

        void main() {
          vec2 center = vec2(0.5);
          vec2 direction = vUv - center;

          float dist = radialModulation ? length(direction) : 1.0;
          vec2 offset = direction * intensity * dist;

          float r = texture2D(tDiffuse, vUv + offset).r;
          float g = texture2D(tDiffuse, vUv).g;
          float b = texture2D(tDiffuse, vUv - offset).b;

          gl_FragColor = vec4(r, g, b, 1.0);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(geometry, this.material);
  }

  getSettings(): ChromaticAberrationSettings {
    return { ...this.settings };
  }

  updateSettings(settings: Partial<ChromaticAberrationSettings>): void {
    Object.assign(this.settings, settings);

    if (this.material) {
      this.material.uniforms.intensity.value = this.settings.intensity;
      this.material.uniforms.radialModulation.value = this.settings.radialModulation;
    }

    this.enabled = this.settings.enabled;
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    outputTarget: THREE.WebGLRenderTarget | null,
    _scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    if (!this.enabled || !this.material) return;

    this.material.uniforms.tDiffuse.value = inputTexture;
    renderer.setRenderTarget(outputTarget);
    renderer.render(this.fullscreenQuad, camera);
  }

  dispose(): void {
    super.dispose();
    this.fullscreenQuad.geometry.dispose();
  }
}
