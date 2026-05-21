// @aethel-heavy-async-boundary render-gated post-processing runtime.
import * as THREE from 'three';
import { PostProcessingPass } from './pass';
import { COMMON_SHADER, TONEMAPPING_FUNCTIONS } from './shader-chunks';
import { type PostProcessingSettings } from './types';

export class TonemappingPass extends PostProcessingPass {
  name = 'tonemapping';

  private mode: TonemappingMode = 'aces';
  private exposure = 1;
  private fullscreenQuad: THREE.Mesh;

  constructor() {
    super();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        exposure: { value: 1 },
        mode: { value: 4 }, // ACES
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        ${COMMON_SHADER}
        ${TONEMAPPING_FUNCTIONS}

        uniform sampler2D tDiffuse;
        uniform float exposure;
        uniform int mode;

        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec3 color = texel.rgb * exposure;

          if (mode == 0) {
          } else if (mode == 1) {
            color = saturate3(color);
          } else if (mode == 2) {
            color = tonemapReinhard(color);
          } else if (mode == 3) {
            color = tonemapCineon(color);
          } else if (mode == 4) {
            color = tonemapACES(color);
          } else if (mode == 5) {
            color = tonemapFilmic(color);
          }

          color = pow(color, vec3(1.0 / 2.2));

          gl_FragColor = vec4(color, texel.a);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(geometry, this.material);
  }

  getSettings(): { mode: TonemappingMode; exposure: number; enabled: boolean } {
    return { mode: this.mode, exposure: this.exposure, enabled: this.enabled };
  }

  updateSettings(settings: { mode?: TonemappingMode; exposure?: number; enabled?: boolean }): void {
    if (settings.mode !== undefined) this.mode = settings.mode;
    if (settings.exposure !== undefined) this.exposure = settings.exposure;
    if (settings.enabled !== undefined) this.enabled = settings.enabled;

    if (this.material) {
      const modeMap: Record<TonemappingMode, number> = {
        none: 0,
        linear: 1,
        reinhard: 2,
        cineon: 3,
        aces: 4,
        filmic: 5,
      };
      this.material.uniforms.mode.value = modeMap[this.mode];
      this.material.uniforms.exposure.value = this.exposure;
    }
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
