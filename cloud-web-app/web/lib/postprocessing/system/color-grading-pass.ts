// @aethel-heavy-async-boundary render-gated post-processing runtime.
import * as THREE from 'three';
import { PostProcessingPass } from './pass';
import { COMMON_SHADER } from './shader-chunks';
import { type ColorGradingSettings } from './types';

export class ColorGradingPass extends PostProcessingPass {
  name = 'colorGrading';

  private settings: ColorGradingSettings = {
    enabled: true,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    hueShift: 0,
    temperature: 0,
    tint: 0,
    shadows: new THREE.Color(0x000000),
    midtones: new THREE.Color(0x808080),
    highlights: new THREE.Color(0xffffff),
    shadowsWeight: 0,
    midtonesWeight: 0,
    highlightsWeight: 0,
    lutIntensity: 1,
  };

  private fullscreenQuad: THREE.Mesh;

  constructor() {
    super();

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        brightness: { value: 0 },
        contrast: { value: 1 },
        saturation: { value: 1 },
        hueShift: { value: 0 },
        temperature: { value: 0 },
        tint: { value: 0 },
        shadows: { value: new THREE.Color(0x000000) },
        midtones: { value: new THREE.Color(0x808080) },
        highlights: { value: new THREE.Color(0xffffff) },
        shadowsWeight: { value: 0 },
        midtonesWeight: { value: 0 },
        highlightsWeight: { value: 0 },
        useLUT: { value: false },
        tLUT: { value: null },
        lutIntensity: { value: 1 },
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

        uniform sampler2D tDiffuse;
        uniform float brightness;
        uniform float contrast;
        uniform float saturation;
        uniform float hueShift;
        uniform float temperature;
        uniform float tint;
        uniform vec3 shadows;
        uniform vec3 midtones;
        uniform vec3 highlights;
        uniform float shadowsWeight;
        uniform float midtonesWeight;
        uniform float highlightsWeight;
        uniform bool useLUT;
        uniform sampler2D tLUT;
        uniform float lutIntensity;

        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec3 applyColorBalance(vec3 color) {
          float lum = luminance(color);

          float shadowMask = 1.0 - smoothstep(0.0, 0.33, lum);
          float highlightMask = smoothstep(0.55, 1.0, lum);
          float midtoneMask = 1.0 - shadowMask - highlightMask;

          vec3 result = color;
          result = mix(result, result * shadows, shadowMask * shadowsWeight);
          result = mix(result, result * midtones * 2.0, midtoneMask * midtonesWeight);
          result = mix(result, result * highlights, highlightMask * highlightsWeight);

          return result;
        }

        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec3 color = texel.rgb;

          color += brightness;

          color = (color - 0.5) * contrast + 0.5;

          float gray = luminance(color);
          color = mix(vec3(gray), color, saturation);

          if (hueShift != 0.0) {
            vec3 hsv = rgb2hsv(color);
            hsv.x = fract(hsv.x + hueShift);
            color = hsv2rgb(hsv);
          }

          color.r += temperature * 0.1;
          color.b -= temperature * 0.1;
          color.g += tint * 0.1;

          color = applyColorBalance(color);

          if (useLUT) {
            vec3 lutColor = texture2D(tLUT, vUv).rgb;
            color = mix(color, lutColor, lutIntensity);
          }

          gl_FragColor = vec4(saturate3(color), texel.a);
        }
      `,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(geometry, this.material);
  }

  getSettings(): ColorGradingSettings {
    return {
      ...this.settings,
      shadows: this.settings.shadows.clone(),
      midtones: this.settings.midtones.clone(),
      highlights: this.settings.highlights.clone(),
    };
  }

  updateSettings(settings: Partial<ColorGradingSettings>): void {
    Object.assign(this.settings, settings);

    if (this.material) {
      this.material.uniforms.brightness.value = this.settings.brightness;
      this.material.uniforms.contrast.value = this.settings.contrast;
      this.material.uniforms.saturation.value = this.settings.saturation;
      this.material.uniforms.hueShift.value = this.settings.hueShift;
      this.material.uniforms.temperature.value = this.settings.temperature;
      this.material.uniforms.tint.value = this.settings.tint;
      this.material.uniforms.shadows.value = this.settings.shadows;
      this.material.uniforms.midtones.value = this.settings.midtones;
      this.material.uniforms.highlights.value = this.settings.highlights;
      this.material.uniforms.shadowsWeight.value = this.settings.shadowsWeight;
      this.material.uniforms.midtonesWeight.value = this.settings.midtonesWeight;
      this.material.uniforms.highlightsWeight.value = this.settings.highlightsWeight;
      this.material.uniforms.useLUT.value = !!this.settings.lutTexture;
      this.material.uniforms.tLUT.value = this.settings.lutTexture || null;
      this.material.uniforms.lutIntensity.value = this.settings.lutIntensity;
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
