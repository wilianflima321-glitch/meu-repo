/**
 * PBR Shader Pipeline - Pipeline de Shaders PBR Completo
 * 
 * Sistema profissional de renderização Physically Based Rendering:
 * - PBR metallic-roughness workflow
 * - Image-Based Lighting (IBL) com HDR
 * - Normal mapping, parallax mapping
 * - Screen Space Reflections (SSR)
 * - Screen Space Ambient Occlusion (SSAO)
 * - Bloom e tone mapping
 * - Shadow mapping com PCF
 * - Shader hot reload
 * - Material presets
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface PBRMaterialParams {
  // Base
  albedo: THREE.Color | THREE.Texture;
  metallic: number | THREE.Texture;
  roughness: number | THREE.Texture;
  
  // Maps
  normalMap?: THREE.Texture;
  normalScale?: THREE.Vector2;
  aoMap?: THREE.Texture;
  aoIntensity?: number;
  emissiveMap?: THREE.Texture;
  emissiveColor?: THREE.Color;
  emissiveIntensity?: number;
  heightMap?: THREE.Texture;
  heightScale?: number;
  
  // Options
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
  doubleSided?: boolean;
  wireframe?: boolean;
}

export interface IBLEnvironment {
  diffuseEnvMap: THREE.CubeTexture;
  specularEnvMap: THREE.CubeTexture;
  brdfLUT: THREE.Texture;
  intensity: number;
}

export interface PostProcessConfig {
  bloom: {
    enabled: boolean;
    threshold: number;
    intensity: number;
    radius: number;
  };
  ssao: {
    enabled: boolean;
    radius: number;
    intensity: number;
    bias: number;
    samples: number;
  };
  ssr: {
    enabled: boolean;
    maxSteps: number;
    stepSize: number;
    thickness: number;
  };
  tonemap: {
    enabled: boolean;
    exposure: number;
    gamma: number;
    method: 'linear' | 'reinhard' | 'filmic' | 'aces';
  };
}

import { BLOOM_BLUR_SHADER, BLOOM_THRESHOLD_SHADER, PBR_FRAGMENT_SHADER, PBR_VERTEX_SHADER, SSAO_SHADER, TONEMAP_SHADER } from './pbr-shader-sources';

// ============================================================================
// PBR MATERIAL CLASS
// ============================================================================

export class PBRMaterial {
  private uniforms: Record<string, THREE.IUniform>;
  private material: THREE.ShaderMaterial;
  
  constructor(params: Partial<PBRMaterialParams> = {}) {
    this.uniforms = {
      // Material properties
      uAlbedo: { value: params.albedo instanceof THREE.Color ? params.albedo : new THREE.Color(0xffffff) },
      uMetallic: { value: typeof params.metallic === 'number' ? params.metallic : 0.0 },
      uRoughness: { value: typeof params.roughness === 'number' ? params.roughness : 0.5 },
      uEmissive: { value: params.emissiveColor || new THREE.Color(0x000000) },
      uEmissiveIntensity: { value: params.emissiveIntensity || 0.0 },
      uAOIntensity: { value: params.aoIntensity || 1.0 },
      
      // Texture flags
      uUseAlbedoMap: { value: params.albedo instanceof THREE.Texture },
      uUseMetallicMap: { value: params.metallic instanceof THREE.Texture },
      uUseRoughnessMap: { value: params.roughness instanceof THREE.Texture },
      uUseNormalMap: { value: !!params.normalMap },
      uUseAOMap: { value: !!params.aoMap },
      uUseEmissiveMap: { value: !!params.emissiveMap },
      uUseHeightMap: { value: !!params.heightMap },
      
      // Textures
      uAlbedoMap: { value: params.albedo instanceof THREE.Texture ? params.albedo : null },
      uMetallicMap: { value: params.metallic instanceof THREE.Texture ? params.metallic : null },
      uRoughnessMap: { value: params.roughness instanceof THREE.Texture ? params.roughness : null },
      uNormalMap: { value: params.normalMap || null },
      uAOMap: { value: params.aoMap || null },
      uEmissiveMap: { value: params.emissiveMap || null },
      uHeightMap: { value: params.heightMap || null },
      uNormalScale: { value: params.normalScale || new THREE.Vector2(1, 1) },
      uHeightScale: { value: params.heightScale || 0.05 },
      
      // IBL
      uDiffuseEnvMap: { value: null },
      uSpecularEnvMap: { value: null },
      uBRDFLUT: { value: null },
      uEnvMapIntensity: { value: 1.0 },
      uMaxEnvMapMipLevel: { value: 6.0 },
      
      // Lights
      uNumLights: { value: 0 },
      uLightPositions: { value: new Array(8).fill(new THREE.Vector3()) },
      uLightColors: { value: new Array(8).fill(new THREE.Vector3(1, 1, 1)) },
      uLightIntensities: { value: new Array(8).fill(1) },
      uLightTypes: { value: new Array(8).fill(0) },
      uLightDirections: { value: new Array(8).fill(new THREE.Vector3(0, -1, 0)) },
      uLightRanges: { value: new Array(8).fill(10) },
      uLightInnerAngles: { value: new Array(8).fill(Math.cos(Math.PI / 6)) },
      uLightOuterAngles: { value: new Array(8).fill(Math.cos(Math.PI / 4)) },
      
      // Shadows
      uReceiveShadows: { value: true },
      uShadowMap: { value: null },
      uShadowMatrix: { value: new THREE.Matrix4() },
      uShadowBias: { value: 0.005 },
      uShadowRadius: { value: 1.0 },
    };
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: PBR_VERTEX_SHADER,
      fragmentShader: PBR_FRAGMENT_SHADER,
      uniforms: this.uniforms,
      transparent: params.transparent || false,
      side: params.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      wireframe: params.wireframe || false,
    });
    
    if (params.transparent) {
      this.material.depthWrite = false;
      this.material.blending = THREE.NormalBlending;
    }
  }
  
  // Setters
  setAlbedo(value: THREE.Color | THREE.Texture): void {
    if (value instanceof THREE.Texture) {
      this.uniforms.uAlbedoMap.value = value;
      this.uniforms.uUseAlbedoMap.value = true;
    } else {
      this.uniforms.uAlbedo.value = value;
      this.uniforms.uUseAlbedoMap.value = false;
    }
  }
  
  setMetallic(value: number | THREE.Texture): void {
    if (value instanceof THREE.Texture) {
      this.uniforms.uMetallicMap.value = value;
      this.uniforms.uUseMetallicMap.value = true;
    } else {
      this.uniforms.uMetallic.value = value;
      this.uniforms.uUseMetallicMap.value = false;
    }
  }
  
  setRoughness(value: number | THREE.Texture): void {
    if (value instanceof THREE.Texture) {
      this.uniforms.uRoughnessMap.value = value;
      this.uniforms.uUseRoughnessMap.value = true;
    } else {
      this.uniforms.uRoughness.value = value;
      this.uniforms.uUseRoughnessMap.value = false;
    }
  }
  
  setNormalMap(texture: THREE.Texture | null, scale?: THREE.Vector2): void {
    this.uniforms.uNormalMap.value = texture;
    this.uniforms.uUseNormalMap.value = !!texture;
    if (scale) this.uniforms.uNormalScale.value = scale;
  }
  
  setEmissive(color: THREE.Color, intensity: number, texture?: THREE.Texture): void {
    this.uniforms.uEmissive.value = color;
    this.uniforms.uEmissiveIntensity.value = intensity;
    if (texture) {
      this.uniforms.uEmissiveMap.value = texture;
      this.uniforms.uUseEmissiveMap.value = true;
    }
  }
  
  setEnvironment(env: IBLEnvironment): void {
    this.uniforms.uDiffuseEnvMap.value = env.diffuseEnvMap;
    this.uniforms.uSpecularEnvMap.value = env.specularEnvMap;
    this.uniforms.uBRDFLUT.value = env.brdfLUT;
    this.uniforms.uEnvMapIntensity.value = env.intensity;
  }
  
  getMaterial(): THREE.ShaderMaterial {
    return this.material;
  }
  
  dispose(): void {
    this.material.dispose();
  }
}

// ============================================================================
// SHADOW MAP RENDERER
// ============================================================================

export class ShadowMapRenderer {
  private shadowMap: THREE.WebGLRenderTarget;
  private shadowCamera: THREE.OrthographicCamera;
  private depthMaterial: THREE.MeshDepthMaterial;
  private shadowMatrix: THREE.Matrix4;
  
  constructor(
    private renderer: THREE.WebGLRenderer,
    size: number = 2048
  ) {
    this.shadowMap = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    
    this.shadowCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 500);
    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    
    this.shadowMatrix = new THREE.Matrix4();
  }
  
  render(scene: THREE.Scene, light: THREE.DirectionalLight): void {
    // Setup shadow camera
    this.shadowCamera.position.copy(light.position);
    this.shadowCamera.lookAt(light.target.position);
    this.shadowCamera.updateMatrixWorld();
    
    // Calculate shadow matrix
    this.shadowMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    this.shadowMatrix.multiply(this.shadowCamera.projectionMatrix);
    this.shadowMatrix.multiply(this.shadowCamera.matrixWorldInverse);
    
    // Render to shadow map
    const currentRenderTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.shadowMap);
    this.renderer.clear();
    
    scene.overrideMaterial = this.depthMaterial;
    this.renderer.render(scene, this.shadowCamera);
    scene.overrideMaterial = null;
    
    this.renderer.setRenderTarget(currentRenderTarget);
  }
  
  getShadowMap(): THREE.Texture {
    return this.shadowMap.texture;
  }
  
  getShadowMatrix(): THREE.Matrix4 {
    return this.shadowMatrix;
  }
  
  dispose(): void {
    this.shadowMap.dispose();
    this.depthMaterial.dispose();
  }
}

// ============================================================================
// POST PROCESS PIPELINE
// ============================================================================

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
    
    // Setup fullscreen quad
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry);
    this.scene.add(this.quad);
    
    // Create render targets
    const targetParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };
    
    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, targetParams);
    this.renderTargetB = new THREE.WebGLRenderTarget(width, height, targetParams);
    
    // Create bloom targets at decreasing resolutions
    this.bloomTargets = [];
    let w = Math.floor(width / 2);
    let h = Math.floor(height / 2);
    for (let i = 0; i < 5; i++) {
      this.bloomTargets.push(new THREE.WebGLRenderTarget(w, h, targetParams));
      w = Math.floor(w / 2);
      h = Math.floor(h / 2);
    }
    
    // Create materials
    this.bloomThresholdMaterial = this.createBloomThresholdMaterial();
    this.bloomBlurMaterial = this.createBloomBlurMaterial();
    this.ssaoMaterial = this.createSSAOMaterial();
    this.tonemapMaterial = this.createTonemapMaterial();
    
    // Generate SSAO samples and noise
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
    
    // Bloom pass
    if (this.config.bloom.enabled) {
      currentInput = this.renderBloom(currentInput);
    }
    
    // Final tonemap pass
    this.tonemapMaterial.uniforms.uTexture.value = inputTexture;
    this.tonemapMaterial.uniforms.uBloomTexture.value = currentInput;
    this.quad.material = this.tonemapMaterial;
    
    this.renderer.setRenderTarget(outputTarget);
    this.renderer.render(this.scene, this.camera);
  }
  
  private renderBloom(input: THREE.Texture): THREE.Texture {
    // Threshold pass
    this.bloomThresholdMaterial.uniforms.uTexture.value = input;
    this.quad.material = this.bloomThresholdMaterial;
    this.renderer.setRenderTarget(this.bloomTargets[0]);
    this.renderer.render(this.scene, this.camera);
    
    // Blur passes
    for (let i = 0; i < this.bloomTargets.length; i++) {
      const target = this.bloomTargets[i];
      
      // Horizontal blur
      this.bloomBlurMaterial.uniforms.uTexture.value = target.texture;
      this.bloomBlurMaterial.uniforms.uDirection.value.set(1, 0);
      this.bloomBlurMaterial.uniforms.uResolution.value.set(target.width, target.height);
      this.quad.material = this.bloomBlurMaterial;
      
      this.renderer.setRenderTarget(this.renderTargetA);
      this.renderer.render(this.scene, this.camera);
      
      // Vertical blur
      this.bloomBlurMaterial.uniforms.uTexture.value = this.renderTargetA.texture;
      this.bloomBlurMaterial.uniforms.uDirection.value.set(0, 1);
      
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.scene, this.camera);
    }
    
    // Return the highest resolution bloom
    return this.bloomTargets[0].texture;
  }
  
  setConfig(config: Partial<PostProcessConfig>): void {
    Object.assign(this.config, config);
    
    // Update materials
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

// ============================================================================
// BRDF LUT GENERATOR
// ============================================================================

export class BRDFLUTGenerator {
  static generate(renderer: THREE.WebGLRenderer, size: number = 512): THREE.Texture {
    const fragmentShader = /* glsl */ `
      #version 300 es
      precision highp float;
      
      in vec2 vUV;
      out vec4 fragColor;
      
      const float PI = 3.14159265359;
      const uint SAMPLE_COUNT = 1024u;
      
      float radicalInverse_VdC(uint bits) {
        bits = (bits << 16u) | (bits >> 16u);
        bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
        bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
        bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
        bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
        return float(bits) * 2.3283064365386963e-10;
      }
      
      vec2 hammersley(uint i, uint N) {
        return vec2(float(i) / float(N), radicalInverse_VdC(i));
      }
      
      vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
        float a = roughness * roughness;
        float phi = 2.0 * PI * Xi.x;
        float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
        float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
        
        vec3 H;
        H.x = cos(phi) * sinTheta;
        H.y = sin(phi) * sinTheta;
        H.z = cosTheta;
        
        vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
        vec3 tangent = normalize(cross(up, N));
        vec3 bitangent = cross(N, tangent);
        
        return normalize(tangent * H.x + bitangent * H.y + N * H.z);
      }
      
      float geometrySchlickGGX(float NdotV, float roughness) {
        float a = roughness;
        float k = (a * a) / 2.0;
        return NdotV / (NdotV * (1.0 - k) + k);
      }
      
      float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
      }
      
      vec2 integrateBRDF(float NdotV, float roughness) {
        vec3 V;
        V.x = sqrt(1.0 - NdotV * NdotV);
        V.y = 0.0;
        V.z = NdotV;
        
        float A = 0.0;
        float B = 0.0;
        
        vec3 N = vec3(0.0, 0.0, 1.0);
        
        for (uint i = 0u; i < SAMPLE_COUNT; i++) {
          vec2 Xi = hammersley(i, SAMPLE_COUNT);
          vec3 H = importanceSampleGGX(Xi, N, roughness);
          vec3 L = normalize(2.0 * dot(V, H) * H - V);
          
          float NdotL = max(L.z, 0.0);
          float NdotH = max(H.z, 0.0);
          float VdotH = max(dot(V, H), 0.0);
          
          if (NdotL > 0.0) {
            float G = geometrySmith(N, V, L, roughness);
            float G_Vis = (G * VdotH) / (NdotH * NdotV);
            float Fc = pow(1.0 - VdotH, 5.0);
            
            A += (1.0 - Fc) * G_Vis;
            B += Fc * G_Vis;
          }
        }
        
        A /= float(SAMPLE_COUNT);
        B /= float(SAMPLE_COUNT);
        
        return vec2(A, B);
      }
      
      void main() {
        vec2 brdf = integrateBRDF(vUV.x, vUV.y);
        fragColor = vec4(brdf, 0.0, 1.0);
      }
    `;
    
    const vertexShader = /* glsl */ `
      #version 300 es
      in vec3 position;
      in vec2 uv;
      out vec2 vUV;
      void main() {
        vUV = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;
    
    const target = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
    });
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);
    
    const currentTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(currentTarget);
    
    material.dispose();
    quad.geometry.dispose();
    
    return target.texture;
  }
}

// ============================================================================
// MATERIAL PRESETS
// ============================================================================

export const MaterialPresets = {
  gold: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(1.0, 0.766, 0.336),
    metallic: 1.0,
    roughness: 0.3,
  }),
  
  silver: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.972, 0.960, 0.915),
    metallic: 1.0,
    roughness: 0.2,
  }),
  
  copper: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.955, 0.637, 0.538),
    metallic: 1.0,
    roughness: 0.4,
  }),
  
  iron: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.560, 0.570, 0.580),
    metallic: 1.0,
    roughness: 0.5,
  }),
  
  plastic: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.2, 0.2, 0.8),
    metallic: 0.0,
    roughness: 0.3,
  }),
  
  rubber: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.1, 0.1, 0.1),
    metallic: 0.0,
    roughness: 0.9,
  }),
  
  wood: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.5, 0.35, 0.2),
    metallic: 0.0,
    roughness: 0.7,
  }),
  
  marble: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.95, 0.95, 0.95),
    metallic: 0.0,
    roughness: 0.2,
  }),
  
  glass: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.95, 0.95, 1.0),
    metallic: 0.0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.3,
  }),
  
  emissive: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.0, 0.0, 0.0),
    metallic: 0.0,
    roughness: 0.5,
    emissiveColor: new THREE.Color(1.0, 0.5, 0.0),
    emissiveIntensity: 2.0,
  }),
};

// ============================================================================
// SHADER HOT RELOAD
// ============================================================================

export class ShaderHotReload {
  private materials: Set<THREE.ShaderMaterial> = new Set();
  private shaderSources: Map<string, { vertex: string; fragment: string }> = new Map();
  private watchers: Map<string, () => void> = new Map();
  
  register(name: string, material: THREE.ShaderMaterial): void {
    this.materials.add(material);
    this.shaderSources.set(name, {
      vertex: material.vertexShader,
      fragment: material.fragmentShader,
    });
  }
  
  update(name: string, vertex?: string, fragment?: string): void {
    const source = this.shaderSources.get(name);
    if (!source) return;
    
    if (vertex) source.vertex = vertex;
    if (fragment) source.fragment = fragment;
    
    // Find and update material
    for (const material of this.materials) {
      if (material.vertexShader === source.vertex || material.fragmentShader === source.fragment) {
        if (vertex) material.vertexShader = vertex;
        if (fragment) material.fragmentShader = fragment;
        material.needsUpdate = true;
      }
    }
    
    // Notify watchers
    const watcher = this.watchers.get(name);
    if (watcher) watcher();
  }
  
  onUpdate(name: string, callback: () => void): void {
    this.watchers.set(name, callback);
  }
  
  dispose(): void {
    this.materials.clear();
    this.shaderSources.clear();
    this.watchers.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PBR_VERTEX_SHADER,
  PBR_FRAGMENT_SHADER,
  BLOOM_THRESHOLD_SHADER,
  BLOOM_BLUR_SHADER,
  SSAO_SHADER,
  TONEMAP_SHADER,
};
