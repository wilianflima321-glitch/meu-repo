// @aethel-heavy-async-boundary render-gated post-processing runtime.
import * as THREE from 'three';
import { PostProcessingPass } from './pass';
import { type VignetteSettings } from './types';

export class VignettePass extends PostProcessingPass {
  name = 'vignette';

  private settings: VignetteSettings = {
    enabled: true,
    intensity: 0.5,
    smoothness: 0.5,
    roundness: 1,
    color: new THREE.Color(0x000000),
  };

  private fullscreenQuad: THREE.Mesh;

  constructor() {
    super();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        intensity: { value: 0.5 },
        smoothness: { value: 0.5 },
        roundness: { value: 1 },
        color: { value: new THREE.Color(0x000000) },
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
        uniform float smoothness;
        uniform float roundness;
        uniform vec3 color;

        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);

          vec2 coord = (vUv - 0.5) * 2.0;
          coord.x *= roundness;

          float dist = length(coord);
          float vignette = smoothstep(1.0 - smoothness, 1.0 - smoothness + smoothness, dist);
          vignette = 1.0 - vignette * intensity;

          vec3 result = mix(color, texel.rgb, vignette);

          gl_FragColor = vec4(result, texel.a);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(geometry, this.material);
  }

  getSettings(): VignetteSettings {
    return { ...this.settings, color: this.settings.color.clone() };
  }

  updateSettings(settings: Partial<VignetteSettings>): void {
    Object.assign(this.settings, settings);

    if (this.material) {
      this.material.uniforms.intensity.value = this.settings.intensity;
      this.material.uniforms.smoothness.value = this.settings.smoothness;
      this.material.uniforms.roundness.value = this.settings.roundness;
      this.material.uniforms.color.value = this.settings.color;
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
