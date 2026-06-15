// @aethel-heavy-async-boundary

import { THREE } from './pbr-three-namespace';
import {
  BLOOM_BLUR_SHADER,
  BLOOM_THRESHOLD_SHADER,
  SSAO_SHADER,
  TONEMAP_SHADER,
} from './pbr-shader-sources';
import type { PostProcessConfig } from './pbr-shader-pipeline.contracts';

export class PostProcessPipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;
  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  private bloomTargets: THREE.WebGLRenderTarget[];
  private bloomThresholdMaterial: THREE.ShaderMaterial;
  private bloomBlurMaterial: THREE.ShaderMaterial;
  private ssaoMaterial: THREE.ShaderMaterial;
  private tonemapMaterial: THREE.ShaderMaterial;
  private config: PostProcessConfig;
  private ssaoSamples: THREE.Vector3[];
  private noiseTexture: THREE.DataTexture;
  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    config: Partial<PostProcessConfig> = {}
  ) {
    this.renderer = renderer;
    this.config = {
      bloom: {
        enabled: true,
        threshold: 0.8,
        intensity: 0.5,
        radius: 4,
        ...config.bloom,
      },
      ssao: {
        enabled: true,
        radius: 0.5,
        intensity: 1.0,
        bias: 0.025,
        samples: 64,
        ...config.ssao,
      },
      ssr: {
        enabled: false,
        maxSteps: 100,
        stepSize: 0.1,
        thickness: 0.5,
        ...config.ssr,
      },
      tonemap: {
        enabled: true,
        exposure: 1.0,
        gamma: 2.2,
        method: 'aces',
        ...config.tonemap,
      },
    };
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry);
    this.scene.add(this.quad);
    const targetParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };
    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, targetParams);
    this.renderTargetB = new THREE.WebGLRenderTarget(width, height, targetParams);
    this.bloomTargets = [];
    let w = Math.floor(width / 2);
    let h = Math.floor(height / 2);
    for (let i = 0; i < 5; i++) {
      this.bloomTargets.push(new THREE.WebGLRenderTarget(w, h, targetParams));
      w = Math.floor(w / 2);
      h = Math.floor(h / 2);
    }
    this.bloomThresholdMaterial = this.createBloomThresholdMaterial();
    this.bloomBlurMaterial = this.createBloomBlurMaterial();
    this.ssaoMaterial = this.createSSAOMaterial();
    this.tonemapMaterial = this.createTonemapMaterial();
    this.ssaoSamples = this.generateSSAOSamples(64);
    this.noiseTexture = this.generateNoiseTexture();
  }
  private createBloomThresholdMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: BLOOM_THRESHOLD_SHADER,
      uniforms: {
        uTexture: { value: null },
        uThreshold: { value: this.config.bloom.threshold },
      },
    });
  }
  private createBloomBlurMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: BLOOM_BLUR_SHADER,
      uniforms: {
        uTexture: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uResolution: { value: new THREE.Vector2() },
      },
    });
  }
  private createSSAOMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: SSAO_SHADER,
      uniforms: {
        uDepthTexture: { value: null },
        uNormalTexture: { value: null },
        uNoiseTexture: { value: this.noiseTexture },
        uProjection: { value: new THREE.Matrix4() },
        uInverseProjection: { value: new THREE.Matrix4() },
        uSamples: { value: [] },
        uRadius: { value: this.config.ssao.radius },
        uBias: { value: this.config.ssao.bias },
        uIntensity: { value: this.config.ssao.intensity },
        uNoiseScale: { value: new THREE.Vector2() },
      },
    });
  }
  private createTonemapMaterial(): THREE.ShaderMaterial {
    const methods: Record<string, number> = {
      'linear': 0,
      'reinhard': 1,
      'filmic': 2,
      'aces': 3,
    };
    return new THREE.ShaderMaterial({
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: TONEMAP_SHADER,
      uniforms: {
        uTexture: { value: null },
        uBloomTexture: { value: null },
        uExposure: { value: this.config.tonemap.exposure },
        uGamma: { value: this.config.tonemap.gamma },
        uTonemapMethod: { value: methods[this.config.tonemap.method] },
        uBloomIntensity: { value: this.config.bloom.intensity },
        uBloomEnabled: { value: this.config.bloom.enabled },
      },
    });
  }
  private getFullscreenVertexShader(): string {
    return /* glsl */ `
      #version 300 es
      in vec3 position;
      in vec2 uv;
      out vec2 vUV;
      void main() {
        vUV = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;
  }
  private generateSSAOSamples(count: number): THREE.Vector3[] {
    const samples: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const sample = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random()
      ).normalize();
      let scale = i / count;
      scale = 0.1 + scale * scale * 0.9; // Lerp between 0.1 and 1.0
      sample.multiplyScalar(scale);
      samples.push(sample);
    }
    return samples;
  }
  private generateNoiseTexture(): THREE.DataTexture {
    const size = 4;
    const data = new Float32Array(size * size * 4);
    for (let i = 0; i < size * size; i++) {
      data[i * 4] = Math.random() * 2 - 1;
      data[i * 4 + 1] = Math.random() * 2 - 1;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 1;
    }
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  }
  render(inputTexture: THREE.Texture, outputTarget: THREE.WebGLRenderTarget | null = null): void {
    let currentInput = inputTexture;
    if (this.config.bloom.enabled) {
      currentInput = this.renderBloom(currentInput);
    }
    this.tonemapMaterial.uniforms.uTexture.value = inputTexture;
    this.tonemapMaterial.uniforms.uBloomTexture.value = currentInput;
    this.quad.material = this.tonemapMaterial;
    this.renderer.setRenderTarget(outputTarget);
    this.renderer.render(this.scene, this.camera);
  }
  private renderBloom(input: THREE.Texture): THREE.Texture {
    this.bloomThresholdMaterial.uniforms.uTexture.value = input;
    this.quad.material = this.bloomThresholdMaterial;
    this.renderer.setRenderTarget(this.bloomTargets[0]);
    this.renderer.render(this.scene, this.camera);
    for (let i = 0; i < this.bloomTargets.length; i++) {
      const target = this.bloomTargets[i];
      this.bloomBlurMaterial.uniforms.uTexture.value = target.texture;
      this.bloomBlurMaterial.uniforms.uDirection.value.set(1, 0);
      this.bloomBlurMaterial.uniforms.uResolution.value.set(target.width, target.height);
      this.quad.material = this.bloomBlurMaterial;
      this.renderer.setRenderTarget(this.renderTargetA);
      this.renderer.render(this.scene, this.camera);
      this.bloomBlurMaterial.uniforms.uTexture.value = this.renderTargetA.texture;
      this.bloomBlurMaterial.uniforms.uDirection.value.set(0, 1);
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.scene, this.camera);
    }
    return this.bloomTargets[0].texture;
  }
  setConfig(config: Partial<PostProcessConfig>): void {
    Object.assign(this.config, config);
    this.bloomThresholdMaterial.uniforms.uThreshold.value = this.config.bloom.threshold;
    this.tonemapMaterial.uniforms.uExposure.value = this.config.tonemap.exposure;
    this.tonemapMaterial.uniforms.uGamma.value = this.config.tonemap.gamma;
    this.tonemapMaterial.uniforms.uBloomIntensity.value = this.config.bloom.intensity;
    this.tonemapMaterial.uniforms.uBloomEnabled.value = this.config.bloom.enabled;
  }
  resize(width: number, height: number): void {
    this.renderTargetA.setSize(width, height);
    this.renderTargetB.setSize(width, height);
    let w = Math.floor(width / 2);
    let h = Math.floor(height / 2);
    for (const target of this.bloomTargets) {
      target.setSize(w, h);
      w = Math.floor(w / 2);
      h = Math.floor(h / 2);
    }
  }
  dispose(): void {
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
    this.bloomTargets.forEach(t => t.dispose());
    this.bloomThresholdMaterial.dispose();
    this.bloomBlurMaterial.dispose();
    this.ssaoMaterial.dispose();
    this.tonemapMaterial.dispose();
    this.noiseTexture.dispose();
    this.quad.geometry.dispose();
  }
}

