// @aethel-heavy-async-boundary render-gated post-processing runtime.
import * as THREE from 'three';
import { PostProcessingPass } from './pass';
import { type FilmGrainSettings } from './types';

export class FilmGrainPass extends PostProcessingPass {
  name = 'filmGrain';

  private settings: FilmGrainSettings = {
    enabled: true,
    intensity: 0.3,
    size: 1,
    animated: true,
  };

  private fullscreenQuad: THREE.Mesh;
  private time = 0;

  constructor() {
    super();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        intensity: { value: 0.3 },
        size: { value: 1 },
        time: { value: 0 },
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
        uniform float size;
        uniform float time;

        float random(vec2 co) {
          return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
        }

        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);

          vec2 grainUV = vUv * size + time;
          float grain = random(grainUV) * 2.0 - 1.0;

          vec3 result = texel.rgb + grain * intensity;

          gl_FragColor = vec4(result, texel.a);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(geometry, this.material);
  }

  getSettings(): FilmGrainSettings {
    return { ...this.settings };
  }

  updateSettings(settings: Partial<FilmGrainSettings>): void {
    Object.assign(this.settings, settings);

    if (this.material) {
      this.material.uniforms.intensity.value = this.settings.intensity;
      this.material.uniforms.size.value = this.settings.size;
    }

    this.enabled = this.settings.enabled;
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    outputTarget: THREE.WebGLRenderTarget | null,
    _scene: THREE.Scene,
    camera: THREE.Camera,
    deltaTime: number
  ): void {
    if (!this.enabled || !this.material) return;

    if (this.settings.animated) {
      this.time += deltaTime;
    }

    this.material.uniforms.tDiffuse.value = inputTexture;
    this.material.uniforms.time.value = this.time;
    renderer.setRenderTarget(outputTarget);
    renderer.render(this.fullscreenQuad, camera);
  }

  dispose(): void {
    super.dispose();
    this.fullscreenQuad.geometry.dispose();
  }
}
