// @aethel-heavy-async-boundary render-gated post-processing runtime.
import * as THREE from 'three';
import { PostProcessingPass } from './pass';
import { COMMON_SHADER } from './shader-chunks';
import { type BloomSettings } from './types';

export class BloomPass extends PostProcessingPass {
  name = 'bloom';

  private settings: BloomSettings = {
    enabled: true,
    intensity: 1,
    threshold: 0.8,
    radius: 0.4,
    softKnee: 0.5,
    mipLevels: 5,
  };

  private brightPassMaterial: THREE.ShaderMaterial;
  private blurMaterial: THREE.ShaderMaterial;
  private compositeMaterial: THREE.ShaderMaterial;
  private mipTargets: THREE.WebGLRenderTarget[] = [];
  private fullscreenQuad: THREE.Mesh;

  constructor(width: number, height: number) {
    super();

    this.brightPassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        threshold: { value: this.settings.threshold },
        softKnee: { value: this.settings.softKnee },
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
        uniform float threshold;
        uniform float softKnee;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          float brightness = luminance(color.rgb);

          float knee = threshold * softKnee;
          float soft = brightness - threshold + knee;
          soft = clamp(soft, 0.0, 2.0 * knee);
          soft = soft * soft / (4.0 * knee + 0.00001);

          float contribution = max(soft, brightness - threshold);
          contribution /= max(brightness, 0.00001);

          gl_FragColor = vec4(color.rgb * contribution, 1.0);
        }
      `,
    });

    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        direction: { value: new THREE.Vector2(1, 0) },
        resolution: { value: new THREE.Vector2(width, height) },
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
        uniform vec2 direction;
        uniform vec2 resolution;

        void main() {
          vec2 texelSize = 1.0 / resolution;
          vec3 result = vec3(0.0);

          float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

          result += texture2D(tDiffuse, vUv).rgb * weights[0];

          for (int i = 1; i < 5; i++) {
            vec2 offset = direction * texelSize * float(i);
            result += texture2D(tDiffuse, vUv + offset).rgb * weights[i];
            result += texture2D(tDiffuse, vUv - offset).rgb * weights[i];
          }

          gl_FragColor = vec4(result, 1.0);
        }
      `,
    });

    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        intensity: { value: this.settings.intensity },
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
        uniform sampler2D tBloom;
        uniform float intensity;

        void main() {
          vec4 color = texture2D(tDiffuse, vUv);
          vec4 bloom = texture2D(tBloom, vUv);

          gl_FragColor = color + bloom * intensity;
        }
      `,
    });

    this.createMipTargets(width, height);

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.fullscreenQuad = new THREE.Mesh(geometry, this.brightPassMaterial);
  }

  private createMipTargets(width: number, height: number): void {
    this.mipTargets.forEach((t) => t.dispose());
    this.mipTargets = [];

    for (let i = 0; i < this.settings.mipLevels * 2; i++) {
      const mipWidth = Math.max(1, Math.floor(width / Math.pow(2, Math.floor(i / 2) + 1)));
      const mipHeight = Math.max(1, Math.floor(height / Math.pow(2, Math.floor(i / 2) + 1)));

      this.mipTargets.push(
        new THREE.WebGLRenderTarget(mipWidth, mipHeight, {
          minFilter: THREE.LinearFilter,
          magFilter: THREE.LinearFilter,
          format: THREE.RGBAFormat,
          type: THREE.HalfFloatType,
        })
      );
    }
  }

  getSettings(): BloomSettings {
    return { ...this.settings };
  }

  updateSettings(settings: Partial<BloomSettings>): void {
    Object.assign(this.settings, settings);

    this.brightPassMaterial.uniforms.threshold.value = this.settings.threshold;
    this.brightPassMaterial.uniforms.softKnee.value = this.settings.softKnee;
    this.compositeMaterial.uniforms.intensity.value = this.settings.intensity;
    this.enabled = this.settings.enabled;
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    outputTarget: THREE.WebGLRenderTarget | null,
    _scene: THREE.Scene,
    camera: THREE.Camera
  ): void {
    if (!this.enabled || this.mipTargets.length < 2) return;

    const currentCamera = camera;

    this.brightPassMaterial.uniforms.tDiffuse.value = inputTexture;
    this.fullscreenQuad.material = this.brightPassMaterial;
    renderer.setRenderTarget(this.mipTargets[0]);
    renderer.render(this.fullscreenQuad, currentCamera);

    for (let i = 0; i < this.settings.mipLevels - 1; i++) {
      const srcIdx = i * 2;
      const dstIdx = srcIdx + 1;
      const downIdx = srcIdx + 2;

      if (dstIdx >= this.mipTargets.length || downIdx >= this.mipTargets.length) break;

      this.blurMaterial.uniforms.tDiffuse.value = this.mipTargets[srcIdx].texture;
      this.blurMaterial.uniforms.direction.value.set(1, 0);
      this.blurMaterial.uniforms.resolution.value.set(
        this.mipTargets[srcIdx].width,
        this.mipTargets[srcIdx].height
      );
      this.fullscreenQuad.material = this.blurMaterial;
      renderer.setRenderTarget(this.mipTargets[dstIdx]);
      renderer.render(this.fullscreenQuad, currentCamera);

      this.blurMaterial.uniforms.tDiffuse.value = this.mipTargets[dstIdx].texture;
      this.blurMaterial.uniforms.direction.value.set(0, 1);
      renderer.setRenderTarget(this.mipTargets[downIdx]);
      renderer.render(this.fullscreenQuad, currentCamera);
    }

    this.compositeMaterial.uniforms.tDiffuse.value = inputTexture;
    this.compositeMaterial.uniforms.tBloom.value = this.mipTargets[this.mipTargets.length - 1].texture;
    this.fullscreenQuad.material = this.compositeMaterial;
    renderer.setRenderTarget(outputTarget);
    renderer.render(this.fullscreenQuad, currentCamera);
  }

  dispose(): void {
    super.dispose();
    this.brightPassMaterial.dispose();
    this.blurMaterial.dispose();
    this.compositeMaterial.dispose();
    this.mipTargets.forEach((t) => t.dispose());
    this.fullscreenQuad.geometry.dispose();
  }
}
