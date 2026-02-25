/**
 * Post-processing pass implementations.
 */

import * as THREE from 'three';
import type {
  BloomSettings,
  ChromaticAberrationSettings,
  ColorGradingSettings,
  FilmGrainSettings,
  TonemappingMode,
  VignetteSettings,
} from './post-processing-types';
import { COMMON_SHADER, TONEMAPPING_FUNCTIONS } from './post-processing-shader-chunks';

export abstract class PostProcessingPass {
  abstract name: string;
  enabled = true;
  needsDepth = false;
  needsNormal = false;
  
  protected material: THREE.ShaderMaterial | null = null;
  protected renderTarget: THREE.WebGLRenderTarget | null = null;
  
  abstract getSettings(): Record<string, unknown>;
  abstract updateSettings(settings: Record<string, unknown>): void;
  abstract render(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    outputTarget: THREE.WebGLRenderTarget | null,
    scene: THREE.Scene,
    camera: THREE.Camera,
    deltaTime: number
  ): void;
  
  dispose(): void {
    this.material?.dispose();
    this.renderTarget?.dispose();
  }
}

// ============================================================================
// BLOOM PASS
// ============================================================================

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
    
    // Bright pass shader
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
    
    // Gaussian blur shader
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
    
    // Composite shader
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
    
    // Create mip targets
    this.createMipTargets(width, height);
    
    // Fullscreen quad
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
    
    // 1. Bright pass
    this.brightPassMaterial.uniforms.tDiffuse.value = inputTexture;
    this.fullscreenQuad.material = this.brightPassMaterial;
    renderer.setRenderTarget(this.mipTargets[0]);
    renderer.render(this.fullscreenQuad, currentCamera);
    
    // 2. Downsample + blur
    for (let i = 0; i < this.settings.mipLevels - 1; i++) {
      const srcIdx = i * 2;
      const dstIdx = srcIdx + 1;
      const downIdx = srcIdx + 2;
      
      if (dstIdx >= this.mipTargets.length || downIdx >= this.mipTargets.length) break;
      
      // Horizontal blur
      this.blurMaterial.uniforms.tDiffuse.value = this.mipTargets[srcIdx].texture;
      this.blurMaterial.uniforms.direction.value.set(1, 0);
      this.blurMaterial.uniforms.resolution.value.set(
        this.mipTargets[srcIdx].width,
        this.mipTargets[srcIdx].height
      );
      this.fullscreenQuad.material = this.blurMaterial;
      renderer.setRenderTarget(this.mipTargets[dstIdx]);
      renderer.render(this.fullscreenQuad, currentCamera);
      
      // Vertical blur
      this.blurMaterial.uniforms.tDiffuse.value = this.mipTargets[dstIdx].texture;
      this.blurMaterial.uniforms.direction.value.set(0, 1);
      renderer.setRenderTarget(this.mipTargets[downIdx]);
      renderer.render(this.fullscreenQuad, currentCamera);
    }
    
    // 3. Composite
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

// ============================================================================
// COLOR GRADING PASS
// ============================================================================

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
          
          // Shadow, midtone, highlight weights
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
          
          // Brightness
          color += brightness;
          
          // Contrast
          color = (color - 0.5) * contrast + 0.5;
          
          // Saturation
          float gray = luminance(color);
          color = mix(vec3(gray), color, saturation);
          
          // Hue shift
          if (hueShift != 0.0) {
            vec3 hsv = rgb2hsv(color);
            hsv.x = fract(hsv.x + hueShift);
            color = hsv2rgb(hsv);
          }
          
          // Temperature/Tint (simplified)
          color.r += temperature * 0.1;
          color.b -= temperature * 0.1;
          color.g += tint * 0.1;
          
          // Color balance
          color = applyColorBalance(color);
          
          // LUT
          if (useLUT) {
            // Simplified 2D LUT sampling
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

// ============================================================================
// VIGNETTE PASS
// ============================================================================

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

// ============================================================================
// FILM GRAIN PASS
// ============================================================================

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

// ============================================================================
// CHROMATIC ABERRATION PASS
// ============================================================================

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

// ============================================================================
// TONEMAPPING PASS
// ============================================================================

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
            // None
          } else if (mode == 1) {
            // Linear
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
          
          // Gamma correction
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
