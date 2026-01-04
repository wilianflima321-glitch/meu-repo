/**
 * Post-Process Volume System
 * 
 * Sistema profissional de volumes de pós-processamento:
 * - Volume-based post-processing
 * - Blend between volumes
 * - Global/local effects
 * - Effect presets
 * - Real-time parameter interpolation
 * - Priority-based layering
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface PostProcessSettings {
  // Bloom
  bloomEnabled: boolean;
  bloomIntensity: number;
  bloomThreshold: number;
  bloomRadius: number;
  
  // Color Grading
  colorGradingEnabled: boolean;
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  tint: number;
  shadows: THREE.Color;
  midtones: THREE.Color;
  highlights: THREE.Color;
  
  // Tonemapping
  tonemappingEnabled: boolean;
  tonemappingMode: 'none' | 'reinhard' | 'aces' | 'filmic' | 'uncharted2';
  
  // Vignette
  vignetteEnabled: boolean;
  vignetteIntensity: number;
  vignetteSmoothness: number;
  vignetteColor: THREE.Color;
  
  // Chromatic Aberration
  chromaticAberrationEnabled: boolean;
  chromaticAberrationIntensity: number;
  
  // Film Grain
  filmGrainEnabled: boolean;
  filmGrainIntensity: number;
  filmGrainResponse: number;
  
  // Depth of Field
  dofEnabled: boolean;
  dofFocusDistance: number;
  dofFocusRange: number;
  dofBokehScale: number;
  
  // Motion Blur
  motionBlurEnabled: boolean;
  motionBlurIntensity: number;
  motionBlurSamples: number;
  
  // Ambient Occlusion
  aoEnabled: boolean;
  aoIntensity: number;
  aoRadius: number;
  aoBias: number;
  
  // Fog
  fogEnabled: boolean;
  fogColor: THREE.Color;
  fogDensity: number;
  fogStart: number;
  fogEnd: number;
  fogHeightFalloff: number;
}

export interface PostProcessVolume {
  id: string;
  bounds: THREE.Box3 | null; // null = global
  priority: number;
  weight: number;
  blendDistance: number;
  settings: Partial<PostProcessSettings>;
  enabled: boolean;
}

// ============================================================================
// DEFAULT SETTINGS
// ============================================================================

export const DEFAULT_POST_PROCESS_SETTINGS: PostProcessSettings = {
  // Bloom
  bloomEnabled: true,
  bloomIntensity: 0.5,
  bloomThreshold: 0.8,
  bloomRadius: 0.4,
  
  // Color Grading
  colorGradingEnabled: true,
  exposure: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  temperature: 0,
  tint: 0,
  shadows: new THREE.Color(1, 1, 1),
  midtones: new THREE.Color(1, 1, 1),
  highlights: new THREE.Color(1, 1, 1),
  
  // Tonemapping
  tonemappingEnabled: true,
  tonemappingMode: 'aces',
  
  // Vignette
  vignetteEnabled: false,
  vignetteIntensity: 0.3,
  vignetteSmoothness: 0.5,
  vignetteColor: new THREE.Color(0, 0, 0),
  
  // Chromatic Aberration
  chromaticAberrationEnabled: false,
  chromaticAberrationIntensity: 0.005,
  
  // Film Grain
  filmGrainEnabled: false,
  filmGrainIntensity: 0.1,
  filmGrainResponse: 0.8,
  
  // Depth of Field
  dofEnabled: false,
  dofFocusDistance: 10,
  dofFocusRange: 3,
  dofBokehScale: 2,
  
  // Motion Blur
  motionBlurEnabled: false,
  motionBlurIntensity: 0.5,
  motionBlurSamples: 8,
  
  // Ambient Occlusion
  aoEnabled: true,
  aoIntensity: 1.0,
  aoRadius: 0.5,
  aoBias: 0.025,
  
  // Fog
  fogEnabled: false,
  fogColor: new THREE.Color(0.5, 0.6, 0.7),
  fogDensity: 0.01,
  fogStart: 10,
  fogEnd: 100,
  fogHeightFalloff: 0.1,
};

// ============================================================================
// PRESET VOLUMES
// ============================================================================

export const POST_PROCESS_PRESETS: Record<string, Partial<PostProcessSettings>> = {
  cinematic: {
    bloomEnabled: true,
    bloomIntensity: 0.6,
    bloomThreshold: 0.7,
    colorGradingEnabled: true,
    exposure: 0.9,
    contrast: 1.1,
    saturation: 0.9,
    vignetteEnabled: true,
    vignetteIntensity: 0.4,
    filmGrainEnabled: true,
    filmGrainIntensity: 0.05,
    tonemappingMode: 'filmic',
  },
  
  horror: {
    colorGradingEnabled: true,
    exposure: 0.7,
    contrast: 1.3,
    saturation: 0.6,
    temperature: -0.1,
    vignetteEnabled: true,
    vignetteIntensity: 0.6,
    chromaticAberrationEnabled: true,
    chromaticAberrationIntensity: 0.01,
    filmGrainEnabled: true,
    filmGrainIntensity: 0.15,
    fogEnabled: true,
    fogDensity: 0.05,
  },
  
  vibrant: {
    bloomEnabled: true,
    bloomIntensity: 0.8,
    colorGradingEnabled: true,
    exposure: 1.1,
    saturation: 1.3,
    contrast: 1.1,
    tonemappingMode: 'aces',
  },
  
  noir: {
    colorGradingEnabled: true,
    saturation: 0,
    contrast: 1.4,
    vignetteEnabled: true,
    vignetteIntensity: 0.5,
    filmGrainEnabled: true,
    filmGrainIntensity: 0.2,
  },
  
  underwater: {
    colorGradingEnabled: true,
    temperature: -0.2,
    tint: 0.1,
    saturation: 0.8,
    fogEnabled: true,
    fogColor: new THREE.Color(0.1, 0.3, 0.4),
    fogDensity: 0.03,
    chromaticAberrationEnabled: true,
    chromaticAberrationIntensity: 0.008,
  },
  
  sunset: {
    bloomEnabled: true,
    bloomIntensity: 0.7,
    colorGradingEnabled: true,
    temperature: 0.3,
    exposure: 1.1,
    highlights: new THREE.Color(1.2, 0.9, 0.7),
    shadows: new THREE.Color(0.8, 0.7, 1.0),
  },
  
  dream: {
    bloomEnabled: true,
    bloomIntensity: 1.0,
    bloomThreshold: 0.5,
    bloomRadius: 0.6,
    colorGradingEnabled: true,
    saturation: 1.1,
    dofEnabled: true,
    dofFocusDistance: 5,
    dofFocusRange: 2,
    vignetteEnabled: true,
    vignetteIntensity: 0.3,
  },
};

// ============================================================================
// POST PROCESS VOLUME MANAGER
// ============================================================================

export class PostProcessVolumeManager {
  private volumes: Map<string, PostProcessVolume> = new Map();
  private globalSettings: PostProcessSettings;
  private currentSettings: PostProcessSettings;
  private viewerPosition: THREE.Vector3 = new THREE.Vector3();
  
  private onSettingsChange: ((settings: PostProcessSettings) => void)[] = [];
  
  constructor() {
    this.globalSettings = { ...DEFAULT_POST_PROCESS_SETTINGS };
    this.currentSettings = { ...DEFAULT_POST_PROCESS_SETTINGS };
  }
  
  // ============================================================================
  // VOLUME MANAGEMENT
  // ============================================================================
  
  addVolume(
    id: string,
    settings: Partial<PostProcessSettings>,
    options: {
      bounds?: THREE.Box3;
      priority?: number;
      weight?: number;
      blendDistance?: number;
    } = {}
  ): PostProcessVolume {
    const volume: PostProcessVolume = {
      id,
      bounds: options.bounds || null,
      priority: options.priority ?? 0,
      weight: options.weight ?? 1,
      blendDistance: options.blendDistance ?? 5,
      settings,
      enabled: true,
    };
    
    this.volumes.set(id, volume);
    this.updateSettings();
    
    return volume;
  }
  
  addGlobalVolume(id: string, settings: Partial<PostProcessSettings>, priority: number = 0): PostProcessVolume {
    return this.addVolume(id, settings, { priority, bounds: undefined });
  }
  
  addLocalVolume(
    id: string,
    bounds: THREE.Box3,
    settings: Partial<PostProcessSettings>,
    blendDistance: number = 5,
    priority: number = 10
  ): PostProcessVolume {
    return this.addVolume(id, settings, { bounds, blendDistance, priority });
  }
  
  removeVolume(id: string): void {
    this.volumes.delete(id);
    this.updateSettings();
  }
  
  setVolumeEnabled(id: string, enabled: boolean): void {
    const volume = this.volumes.get(id);
    if (volume) {
      volume.enabled = enabled;
      this.updateSettings();
    }
  }
  
  setVolumeWeight(id: string, weight: number): void {
    const volume = this.volumes.get(id);
    if (volume) {
      volume.weight = weight;
      this.updateSettings();
    }
  }
  
  updateVolumeSettings(id: string, settings: Partial<PostProcessSettings>): void {
    const volume = this.volumes.get(id);
    if (volume) {
      Object.assign(volume.settings, settings);
      this.updateSettings();
    }
  }
  
  // ============================================================================
  // PRESETS
  // ============================================================================
  
  applyPreset(presetName: string, volumeId?: string): void {
    const preset = POST_PROCESS_PRESETS[presetName];
    if (!preset) {
      console.warn(`Unknown preset: ${presetName}`);
      return;
    }
    
    if (volumeId) {
      this.updateVolumeSettings(volumeId, preset);
    } else {
      // Apply to global
      Object.assign(this.globalSettings, preset);
      this.updateSettings();
    }
  }
  
  // ============================================================================
  // UPDATE
  // ============================================================================
  
  update(viewerPosition: THREE.Vector3): void {
    this.viewerPosition.copy(viewerPosition);
    this.updateSettings();
  }
  
  private updateSettings(): void {
    // Start with global settings
    const result = this.cloneSettings(this.globalSettings);
    
    // Collect and sort active volumes
    const activeVolumes: { volume: PostProcessVolume; influence: number }[] = [];
    
    for (const volume of this.volumes.values()) {
      if (!volume.enabled) continue;
      
      const influence = this.calculateVolumeInfluence(volume);
      if (influence > 0) {
        activeVolumes.push({ volume, influence });
      }
    }
    
    // Sort by priority
    activeVolumes.sort((a, b) => a.volume.priority - b.volume.priority);
    
    // Blend settings
    for (const { volume, influence } of activeVolumes) {
      const blendWeight = influence * volume.weight;
      this.blendSettings(result, volume.settings, blendWeight);
    }
    
    // Check if settings changed
    if (!this.settingsEqual(this.currentSettings, result)) {
      this.currentSettings = result;
      this.notifySettingsChange();
    }
  }
  
  private calculateVolumeInfluence(volume: PostProcessVolume): number {
    // Global volumes always have full influence
    if (!volume.bounds) return 1;
    
    // Check if viewer is inside bounds
    if (volume.bounds.containsPoint(this.viewerPosition)) {
      return 1;
    }
    
    // Calculate distance to bounds
    const closestPoint = volume.bounds.clampPoint(this.viewerPosition, new THREE.Vector3());
    const distance = this.viewerPosition.distanceTo(closestPoint);
    
    if (distance >= volume.blendDistance) return 0;
    
    // Smooth blend based on distance
    return 1 - (distance / volume.blendDistance);
  }
  
  private blendSettings(
    target: PostProcessSettings,
    source: Partial<PostProcessSettings>,
    weight: number
  ): void {
    for (const key of Object.keys(source) as (keyof PostProcessSettings)[]) {
      const sourceValue = source[key];
      if (sourceValue === undefined) continue;
      
      const targetValue = target[key];
      
      if (typeof sourceValue === 'boolean') {
        // Boolean: use source if weight > 0.5
        (target as any)[key] = weight > 0.5 ? sourceValue : targetValue;
      } else if (typeof sourceValue === 'number') {
        // Number: lerp
        (target as any)[key] = THREE.MathUtils.lerp(targetValue as number, sourceValue, weight);
      } else if (sourceValue instanceof THREE.Color) {
        // Color: lerp
        const targetColor = (targetValue as THREE.Color).clone();
        (target as any)[key] = targetColor.lerp(sourceValue, weight);
      } else if (typeof sourceValue === 'string') {
        // String (enum): use source if weight > 0.5
        (target as any)[key] = weight > 0.5 ? sourceValue : targetValue;
      }
    }
  }
  
  private cloneSettings(settings: PostProcessSettings): PostProcessSettings {
    return {
      ...settings,
      shadows: settings.shadows.clone(),
      midtones: settings.midtones.clone(),
      highlights: settings.highlights.clone(),
      vignetteColor: settings.vignetteColor.clone(),
      fogColor: settings.fogColor.clone(),
    };
  }
  
  private settingsEqual(a: PostProcessSettings, b: PostProcessSettings): boolean {
    for (const key of Object.keys(a) as (keyof PostProcessSettings)[]) {
      const aVal = a[key];
      const bVal = b[key];
      
      if (aVal instanceof THREE.Color) {
        if (!aVal.equals(bVal as THREE.Color)) return false;
      } else if (aVal !== bVal) {
        return false;
      }
    }
    return true;
  }
  
  // ============================================================================
  // EVENTS
  // ============================================================================
  
  onSettingsChanged(callback: (settings: PostProcessSettings) => void): () => void {
    this.onSettingsChange.push(callback);
    return () => {
      const idx = this.onSettingsChange.indexOf(callback);
      if (idx !== -1) this.onSettingsChange.splice(idx, 1);
    };
  }
  
  private notifySettingsChange(): void {
    for (const callback of this.onSettingsChange) {
      callback(this.currentSettings);
    }
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getCurrentSettings(): PostProcessSettings {
    return this.cloneSettings(this.currentSettings);
  }
  
  getGlobalSettings(): PostProcessSettings {
    return this.cloneSettings(this.globalSettings);
  }
  
  setGlobalSettings(settings: Partial<PostProcessSettings>): void {
    Object.assign(this.globalSettings, settings);
    this.updateSettings();
  }
  
  getVolume(id: string): PostProcessVolume | undefined {
    return this.volumes.get(id);
  }
  
  getAllVolumes(): PostProcessVolume[] {
    return Array.from(this.volumes.values());
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.volumes.clear();
    this.onSettingsChange = [];
  }
}

// ============================================================================
// POST PROCESS PASS
// ============================================================================

export class PostProcessPass {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private settings: PostProcessSettings;
  
  private renderTarget1: THREE.WebGLRenderTarget;
  private renderTarget2: THREE.WebGLRenderTarget;
  
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private quadMesh: THREE.Mesh;
  
  private compositeShader: THREE.ShaderMaterial;
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
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
  
  private createCompositeShader(): THREE.ShaderMaterial {
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

const COMPOSITE_FRAGMENT_SHADER = `
  uniform sampler2D uTexture;
  uniform float uTime;
  
  // Color grading
  uniform float uExposure;
  uniform float uContrast;
  uniform float uSaturation;
  uniform float uTemperature;
  uniform float uTint;
  
  // Vignette
  uniform bool uVignetteEnabled;
  uniform float uVignetteIntensity;
  uniform float uVignetteSmoothness;
  uniform vec3 uVignetteColor;
  
  // Film grain
  uniform bool uFilmGrainEnabled;
  uniform float uFilmGrainIntensity;
  
  // Chromatic aberration
  uniform bool uChromaticAberrationEnabled;
  uniform float uChromaticAberrationIntensity;
  
  // Tonemapping
  uniform int uTonemappingMode;
  
  varying vec2 vUv;
  
  // ACES tonemapping
  vec3 ACESFilm(vec3 x) {
    float a = 2.51;
    float b = 0.03;
    float c = 2.43;
    float d = 0.59;
    float e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }
  
  // Reinhard tonemapping
  vec3 Reinhard(vec3 x) {
    return x / (1.0 + x);
  }
  
  // Filmic tonemapping
  vec3 Filmic(vec3 x) {
    vec3 X = max(vec3(0.0), x - 0.004);
    return (X * (6.2 * X + 0.5)) / (X * (6.2 * X + 1.7) + 0.06);
  }
  
  // Uncharted 2 tonemapping
  vec3 Uncharted2Tonemap(vec3 x) {
    float A = 0.15;
    float B = 0.50;
    float C = 0.10;
    float D = 0.20;
    float E = 0.02;
    float F = 0.30;
    return ((x * (A * x + C * B) + D * E) / (x * (A * x + B) + D * F)) - E / F;
  }
  
  // Temperature/tint adjustment
  vec3 adjustTemperature(vec3 color, float temp, float tint) {
    float t = temp * 0.1;
    color.r += t;
    color.b -= t;
    
    float ti = tint * 0.1;
    color.g += ti;
    
    return color;
  }
  
  // Saturation adjustment
  vec3 adjustSaturation(vec3 color, float saturation) {
    float luma = dot(color, vec3(0.299, 0.587, 0.114));
    return mix(vec3(luma), color, saturation);
  }
  
  // Contrast adjustment
  vec3 adjustContrast(vec3 color, float contrast) {
    return (color - 0.5) * contrast + 0.5;
  }
  
  // Film grain
  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    vec2 uv = vUv;
    vec3 color;
    
    // Chromatic aberration
    if (uChromaticAberrationEnabled) {
      vec2 direction = uv - 0.5;
      float dist = length(direction);
      vec2 offset = direction * dist * uChromaticAberrationIntensity;
      
      color.r = texture2D(uTexture, uv + offset).r;
      color.g = texture2D(uTexture, uv).g;
      color.b = texture2D(uTexture, uv - offset).b;
    } else {
      color = texture2D(uTexture, uv).rgb;
    }
    
    // Exposure
    color *= uExposure;
    
    // Temperature/tint
    color = adjustTemperature(color, uTemperature, uTint);
    
    // Contrast
    color = adjustContrast(color, uContrast);
    
    // Saturation
    color = adjustSaturation(color, uSaturation);
    
    // Tonemapping
    if (uTonemappingMode == 1) {
      color = Reinhard(color);
    } else if (uTonemappingMode == 2) {
      color = ACESFilm(color);
    } else if (uTonemappingMode == 3) {
      color = Filmic(color);
    } else if (uTonemappingMode == 4) {
      color = Uncharted2Tonemap(color * 2.0) / Uncharted2Tonemap(vec3(11.2));
    }
    
    // Film grain
    if (uFilmGrainEnabled) {
      float grain = (rand(uv + uTime) - 0.5) * uFilmGrainIntensity;
      color += grain;
    }
    
    // Vignette
    if (uVignetteEnabled) {
      vec2 center = uv - 0.5;
      float dist = length(center);
      float vignette = smoothstep(0.5 - uVignetteSmoothness, 0.5, dist * uVignetteIntensity);
      color = mix(color, uVignetteColor, vignette);
    }
    
    // Gamma correction
    color = pow(color, vec3(1.0 / 2.2));
    
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ============================================================================
// EXPORTS
// ============================================================================

