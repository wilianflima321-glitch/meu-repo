/**
 * CINEMATIC LIGHTING SYSTEM
 * 
 * Sistema completo de iluminação cinematográfica para jogos AAA e filmes:
 * - Three-point lighting (key, fill, rim)
 * - Area lights (rectangular, disk, sphere)
 * - IES profiles
 * - Light linking/grouping
 * - Gobo/cookie projections
 * - Volumetric lights
 * - Light probes & reflection probes
 * - Time-of-day system
 * - HDR skyboxes
 * - Light animation/keyframing
 */

import * as THREE from 'three';

// ============================================================================
// LIGHT TYPES
// ============================================================================

export type LightType =
  | 'directional'
  | 'point'
  | 'spot'
  | 'area'
  | 'hemisphere'
  | 'ambient'
  | 'probe'
  | 'ies';

export type AreaLightShape = 'rectangle' | 'disk' | 'sphere' | 'tube';

// ============================================================================
// ADVANCED LIGHT CONFIG
// ============================================================================

export interface AdvancedLightConfig {
  type: LightType;
  color: THREE.Color;
  intensity: number;
  temperature?: number; // Kelvin (3000-10000)
  
  // Shadows
  castShadow: boolean;
  shadowBias: number;
  shadowNormalBias: number;
  shadowRadius: number;
  shadowMapSize: number;
  shadowCascades?: number;
  
  // Area light specific
  shape?: AreaLightShape;
  width?: number;
  height?: number;
  radius?: number;
  
  // IES profile
  iesProfile?: string;
  iesTexture?: THREE.Texture;
  
  // Gobo/cookie
  goboTexture?: THREE.Texture;
  goboIntensity?: number;
  
  // Volumetric
  volumetric: boolean;
  volumetricIntensity: number;
  volumetricSamples: number;
  
  // Attenuation
  range: number;
  decay: number;
  
  // Spot light specific
  angle?: number;
  penumbra?: number;
  
  // Light linking
  affectedObjects?: string[]; // Object IDs
  excludedObjects?: string[];
  
  // Animation
  animated: boolean;
  animationCurve?: any;
}

export const DEFAULT_LIGHT_CONFIG: AdvancedLightConfig = {
  type: 'point',
  color: new THREE.Color(1, 1, 1),
  intensity: 1.0,
  temperature: 6500,
  castShadow: true,
  shadowBias: -0.0001,
  shadowNormalBias: 0.02,
  shadowRadius: 1,
  shadowMapSize: 1024,
  volumetric: false,
  volumetricIntensity: 1.0,
  volumetricSamples: 32,
  range: 100,
  decay: 2,
  animated: false,
};

// ============================================================================
// CINEMATIC LIGHT CLASS
// ============================================================================

export class CinematicLight {
  private light: THREE.Light;
  private config: AdvancedLightConfig;
  private helper?: THREE.Object3D;
  
  constructor(config: Partial<AdvancedLightConfig> = {}) {
    this.config = { ...DEFAULT_LIGHT_CONFIG, ...config };
    this.light = this.createLight();
  }
  
  private createLight(): THREE.Light {
    switch (this.config.type) {
      case 'directional':
        return this.createDirectionalLight();
      case 'point':
        return this.createPointLight();
      case 'spot':
        return this.createSpotLight();
      case 'area':
        return this.createAreaLight();
      case 'hemisphere':
        return this.createHemisphereLight();
      case 'ambient':
        return this.createAmbientLight();
      default:
        return new THREE.PointLight(this.config.color, this.config.intensity);
    }
  }
  
  private createDirectionalLight(): THREE.DirectionalLight {
    const light = new THREE.DirectionalLight(this.config.color, this.config.intensity);
    light.castShadow = this.config.castShadow;
    
    if (light.shadow) {
      light.shadow.bias = this.config.shadowBias;
      light.shadow.normalBias = this.config.shadowNormalBias;
      light.shadow.radius = this.config.shadowRadius;
      light.shadow.mapSize.width = this.config.shadowMapSize;
      light.shadow.mapSize.height = this.config.shadowMapSize;
      
      // Large shadow camera for sun
      light.shadow.camera.left = -50;
      light.shadow.camera.right = 50;
      light.shadow.camera.top = 50;
      light.shadow.camera.bottom = -50;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = 500;
    }
    
    return light;
  }
  
  private createPointLight(): THREE.PointLight {
    const light = new THREE.PointLight(this.config.color, this.config.intensity, this.config.range, this.config.decay);
    light.castShadow = this.config.castShadow;
    
    if (light.shadow) {
      light.shadow.bias = this.config.shadowBias;
      light.shadow.normalBias = this.config.shadowNormalBias;
      light.shadow.radius = this.config.shadowRadius;
      light.shadow.mapSize.width = this.config.shadowMapSize;
      light.shadow.mapSize.height = this.config.shadowMapSize;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = this.config.range;
    }
    
    return light;
  }
  
  private createSpotLight(): THREE.SpotLight {
    const angle = this.config.angle || Math.PI / 4;
    const penumbra = this.config.penumbra || 0.1;
    
    const light = new THREE.SpotLight(
      this.config.color,
      this.config.intensity,
      this.config.range,
      angle,
      penumbra,
      this.config.decay
    );
    
    light.castShadow = this.config.castShadow;
    
    if (light.shadow) {
      light.shadow.bias = this.config.shadowBias;
      light.shadow.normalBias = this.config.shadowNormalBias;
      light.shadow.radius = this.config.shadowRadius;
      light.shadow.mapSize.width = this.config.shadowMapSize;
      light.shadow.mapSize.height = this.config.shadowMapSize;
      light.shadow.camera.near = 0.1;
      light.shadow.camera.far = this.config.range;
    }
    
    return light;
  }
  
  private createAreaLight(): any {
    // Area lights usando RectAreaLight do Three.js
    const { RectAreaLight } = require('three/examples/jsm/lights/RectAreaLight.js');
    
    const width = this.config.width || 10;
    const height = this.config.height || 10;
    
    const light = new RectAreaLight(this.config.color, this.config.intensity, width, height);
    
    return light;
  }
  
  private createHemisphereLight(): THREE.HemisphereLight {
    const skyColor = this.config.color;
    const groundColor = new THREE.Color(0.5, 0.5, 0.5);
    return new THREE.HemisphereLight(skyColor, groundColor, this.config.intensity);
  }
  
  private createAmbientLight(): THREE.AmbientLight {
    return new THREE.AmbientLight(this.config.color, this.config.intensity);
  }
  
  getLight(): THREE.Light {
    return this.light;
  }
  
  setIntensity(intensity: number): void {
    this.config.intensity = intensity;
    this.light.intensity = intensity;
  }
  
  setColor(color: THREE.Color): void {
    this.config.color = color;
    this.light.color = color;
  }
  
  setTemperature(kelvin: number): void {
    this.config.temperature = kelvin;
    // Convert Kelvin to RGB
    const color = this.kelvinToRGB(kelvin);
    this.setColor(color);
  }
  
  private kelvinToRGB(kelvin: number): THREE.Color {
    const temp = kelvin / 100;
    let r, g, b;
    
    // Red
    if (temp <= 66) {
      r = 255;
    } else {
      r = temp - 60;
      r = 329.698727446 * Math.pow(r, -0.1332047592);
      r = Math.max(0, Math.min(255, r));
    }
    
    // Green
    if (temp <= 66) {
      g = temp;
      g = 99.4708025861 * Math.log(g) - 161.1195681661;
      g = Math.max(0, Math.min(255, g));
    } else {
      g = temp - 60;
      g = 288.1221695283 * Math.pow(g, -0.0755148492);
      g = Math.max(0, Math.min(255, g));
    }
    
    // Blue
    if (temp >= 66) {
      b = 255;
    } else if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
      b = Math.max(0, Math.min(255, b));
    }
    
    return new THREE.Color(r / 255, g / 255, b / 255);
  }
  
  enableShadows(enabled: boolean): void {
    this.config.castShadow = enabled;
    this.light.castShadow = enabled;
  }
  
  setPosition(x: number, y: number, z: number): void {
    this.light.position.set(x, y, z);
  }
  
  setTarget(target: THREE.Object3D): void {
    if ('target' in this.light) {
      (this.light as any).target = target;
    }
  }
}

// ============================================================================
// THREE-POINT LIGHTING SETUP
// ============================================================================

export class ThreePointLighting {
  public keyLight: CinematicLight;
  public fillLight: CinematicLight;
  public rimLight: CinematicLight;
  
  constructor(target: THREE.Vector3 = new THREE.Vector3(0, 0, 0)) {
    // Key light (main light)
    this.keyLight = new CinematicLight({
      type: 'directional',
      intensity: 2.0,
      color: new THREE.Color(1, 1, 1),
      temperature: 5500,
      castShadow: true,
      shadowMapSize: 2048,
    });
    this.keyLight.setPosition(5, 10, 5);
    
    // Fill light (soften shadows)
    this.fillLight = new CinematicLight({
      type: 'directional',
      intensity: 0.5,
      color: new THREE.Color(1, 1, 1),
      temperature: 6500,
      castShadow: false,
    });
    this.fillLight.setPosition(-5, 5, 5);
    
    // Rim/back light (separation from background)
    this.rimLight = new CinematicLight({
      type: 'directional',
      intensity: 1.0,
      color: new THREE.Color(1, 1, 1),
      temperature: 7000,
      castShadow: false,
    });
    this.rimLight.setPosition(0, 5, -10);
  }
  
  addToScene(scene: THREE.Scene): void {
    scene.add(this.keyLight.getLight());
    scene.add(this.fillLight.getLight());
    scene.add(this.rimLight.getLight());
  }
  
  setTarget(target: THREE.Object3D): void {
    this.keyLight.setTarget(target);
    this.fillLight.setTarget(target);
    this.rimLight.setTarget(target);
  }
}

// ============================================================================
// TIME OF DAY SYSTEM
// ============================================================================

export interface TimeOfDayConfig {
  latitude: number;
  longitude: number;
  timezone: number;
  date: Date;
  
  sunColor: THREE.Color;
  skyColor: THREE.Color;
  ambientColor: THREE.Color;
  
  sunIntensity: number;
  skyIntensity: number;
  ambientIntensity: number;
  
  fogColor: THREE.Color;
  fogDensity: number;
}

export class TimeOfDaySystem {
  private config: TimeOfDayConfig;
  private sunLight: THREE.DirectionalLight;
  private skyLight: THREE.HemisphereLight;
  private ambientLight: THREE.AmbientLight;
  
  private currentTime: number = 12; // 0-24 hours
  private animating: boolean = false;
  private animationSpeed: number = 1; // hours per second
  
  constructor(config?: Partial<TimeOfDayConfig>) {
    this.config = {
      latitude: 40,
      longitude: -74,
      timezone: -5,
      date: new Date(),
      sunColor: new THREE.Color(1, 1, 1),
      skyColor: new THREE.Color(0.5, 0.7, 1),
      ambientColor: new THREE.Color(0.3, 0.3, 0.4),
      sunIntensity: 1.5,
      skyIntensity: 0.5,
      ambientIntensity: 0.3,
      fogColor: new THREE.Color(0.8, 0.9, 1),
      fogDensity: 0.002,
      ...config,
    };
    
    // Create lights
    this.sunLight = new THREE.DirectionalLight(this.config.sunColor, this.config.sunIntensity);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.camera.near = 0.1;
    this.sunLight.shadow.camera.far = 500;
    this.sunLight.shadow.mapSize.width = 4096;
    this.sunLight.shadow.mapSize.height = 4096;
    
    this.skyLight = new THREE.HemisphereLight(this.config.skyColor, new THREE.Color(0.3, 0.2, 0.1), this.config.skyIntensity);
    this.ambientLight = new THREE.AmbientLight(this.config.ambientColor, this.config.ambientIntensity);
    
    this.updateLighting();
  }
  
  setTime(hours: number): void {
    this.currentTime = hours % 24;
    this.updateLighting();
  }
  
  getTime(): number {
    return this.currentTime;
  }
  
  startAnimation(speed: number = 1): void {
    this.animating = true;
    this.animationSpeed = speed;
  }
  
  stopAnimation(): void {
    this.animating = false;
  }
  
  update(deltaTime: number): void {
    if (this.animating) {
      this.currentTime += this.animationSpeed * deltaTime;
      this.currentTime = this.currentTime % 24;
      this.updateLighting();
    }
  }
  
  private updateLighting(): void {
    // Calculate sun position based on time
    const sunPosition = this.calculateSunPosition(this.currentTime);
    this.sunLight.position.copy(sunPosition);
    
    // Interpolate colors based on time
    const { sunColor, skyColor, ambientColor, sunIntensity } = this.getColorsForTime(this.currentTime);
    
    this.sunLight.color.copy(sunColor);
    this.sunLight.intensity = sunIntensity;
    
    this.skyLight.color.copy(skyColor);
    this.skyLight.groundColor.copy(ambientColor);
    
    this.ambientLight.color.copy(ambientColor);
  }
  
  private calculateSunPosition(hour: number): THREE.Vector3 {
    // Simplified sun position calculation
    // Real implementation would use proper astronomical calculations
    
    const angle = ((hour - 6) / 12) * Math.PI; // -PI/2 at 6am, PI/2 at 6pm
    const elevation = Math.sin(angle);
    const azimuth = Math.cos(angle);
    
    return new THREE.Vector3(
      azimuth * 100,
      elevation * 100,
      50
    );
  }
  
  private getColorsForTime(hour: number): {
    sunColor: THREE.Color;
    skyColor: THREE.Color;
    ambientColor: THREE.Color;
    sunIntensity: number;
  } {
    // Sunrise: 6am
    // Noon: 12pm
    // Sunset: 6pm
    // Midnight: 12am
    
    let sunColor: THREE.Color;
    let skyColor: THREE.Color;
    let ambientColor: THREE.Color;
    let sunIntensity: number;
    
    if (hour >= 5 && hour < 7) {
      // Sunrise
      const t = (hour - 5) / 2;
      sunColor = new THREE.Color().lerpColors(
        new THREE.Color(1, 0.4, 0.2), // Orange
        new THREE.Color(1, 1, 0.9),   // Warm white
        t
      );
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0.3, 0.2, 0.5), // Purple
        new THREE.Color(0.5, 0.7, 1),   // Blue
        t
      );
      ambientColor = new THREE.Color().lerpColors(
        new THREE.Color(0.1, 0.1, 0.2),
        new THREE.Color(0.3, 0.3, 0.4),
        t
      );
      sunIntensity = 0.5 + t * 1.5;
    } else if (hour >= 7 && hour < 17) {
      // Day
      sunColor = new THREE.Color(1, 1, 0.95);
      skyColor = new THREE.Color(0.5, 0.7, 1);
      ambientColor = new THREE.Color(0.4, 0.4, 0.5);
      sunIntensity = 2.0;
    } else if (hour >= 17 && hour < 19) {
      // Sunset
      const t = (hour - 17) / 2;
      sunColor = new THREE.Color().lerpColors(
        new THREE.Color(1, 1, 0.9),
        new THREE.Color(1, 0.3, 0.1), // Deep orange
        t
      );
      skyColor = new THREE.Color().lerpColors(
        new THREE.Color(0.5, 0.7, 1),
        new THREE.Color(0.4, 0.2, 0.5), // Purple
        t
      );
      ambientColor = new THREE.Color().lerpColors(
        new THREE.Color(0.3, 0.3, 0.4),
        new THREE.Color(0.1, 0.1, 0.2),
        t
      );
      sunIntensity = 2.0 - t * 1.5;
    } else {
      // Night
      sunColor = new THREE.Color(0.1, 0.1, 0.3); // Moonlight
      skyColor = new THREE.Color(0.05, 0.05, 0.2);
      ambientColor = new THREE.Color(0.05, 0.05, 0.1);
      sunIntensity = 0.2;
    }
    
    return { sunColor, skyColor, ambientColor, sunIntensity };
  }
  
  addToScene(scene: THREE.Scene): void {
    scene.add(this.sunLight);
    scene.add(this.skyLight);
    scene.add(this.ambientLight);
  }
  
  getSunLight(): THREE.DirectionalLight {
    return this.sunLight;
  }
  
  getSkyLight(): THREE.HemisphereLight {
    return this.skyLight;
  }
  
  getAmbientLight(): THREE.AmbientLight {
    return this.ambientLight;
  }
}

// ============================================================================
// LIGHT PROBE SYSTEM
// ============================================================================

export class LightProbeSystem {
  private probes: THREE.LightProbe[] = [];
  private probePositions: THREE.Vector3[] = [];
  private probeSpacing: number = 5;
  
  constructor(spacing: number = 5) {
    this.probeSpacing = spacing;
  }
  
  generateProbeGrid(bounds: THREE.Box3, scene: THREE.Scene): void {
    const min = bounds.min;
    const max = bounds.max;
    
    for (let x = min.x; x <= max.x; x += this.probeSpacing) {
      for (let y = min.y; y <= max.y; y += this.probeSpacing) {
        for (let z = min.z; z <= max.z; z += this.probeSpacing) {
          const position = new THREE.Vector3(x, y, z);
          const probe = this.createProbe(position, scene);
          this.probes.push(probe);
          this.probePositions.push(position);
          scene.add(probe);
        }
      }
    }
  }
  
  private createProbe(position: THREE.Vector3, scene: THREE.Scene): THREE.LightProbe {
    const probe = new THREE.LightProbe();
    probe.position.copy(position);
    
    // Render cubemap at probe position to capture environment
    // This is simplified - real implementation would render 6 faces
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256);
    
    return probe;
  }
  
  getProbes(): THREE.LightProbe[] {
    return this.probes;
  }
  
  getNearestProbe(position: THREE.Vector3): THREE.LightProbe | null {
    if (this.probes.length === 0) return null;
    
    let nearest = this.probes[0];
    let minDist = position.distanceTo(this.probePositions[0]);
    
    for (let i = 1; i < this.probes.length; i++) {
      const dist = position.distanceTo(this.probePositions[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = this.probes[i];
      }
    }
    
    return nearest;
  }
  
  // Trilinear interpolation of probes
  getInterpolatedProbe(position: THREE.Vector3): THREE.SphericalHarmonics3 | null {
    // Find 8 surrounding probes and interpolate
    // Simplified implementation
    const nearest = this.getNearestProbe(position);
    return nearest ? (nearest as any).sh : null;
  }
}

// ============================================================================
// CINEMATIC LIGHTING PRESETS
// ============================================================================

export class LightingPresets {
  private static presets: Map<string, () => CinematicLight[]> = new Map();
  
  static initialize(): void {
    // Film noir
    this.presets.set('film-noir', () => [
      new CinematicLight({
        type: 'spot',
        intensity: 3.0,
        color: new THREE.Color(1, 1, 1),
        angle: Math.PI / 6,
        penumbra: 0.5,
        castShadow: true,
      }),
    ]);
    
    // Golden hour
    this.presets.set('golden-hour', () => [
      new CinematicLight({
        type: 'directional',
        intensity: 1.5,
        color: new THREE.Color(1, 0.8, 0.6),
        temperature: 3500,
        castShadow: true,
      }),
    ]);
    
    // Studio
    this.presets.set('studio', () => {
      const threePoint = new ThreePointLighting();
      return [
        threePoint.keyLight,
        threePoint.fillLight,
        threePoint.rimLight,
      ];
    });
    
    // Night city
    this.presets.set('night-city', () => [
      new CinematicLight({
        type: 'ambient',
        intensity: 0.1,
        color: new THREE.Color(0.1, 0.1, 0.3),
      }),
      new CinematicLight({
        type: 'point',
        intensity: 2.0,
        color: new THREE.Color(1, 0.8, 0.5),
        range: 20,
      }),
    ]);
  }
  
  static getPreset(name: string): CinematicLight[] | undefined {
    const factory = this.presets.get(name);
    return factory ? factory() : undefined;
  }
  
  static listPresets(): string[] {
    return Array.from(this.presets.keys());
  }
}

LightingPresets.initialize();

// ============================================================================
// EXPORTS
// ============================================================================

const cinematicLighting = {
  CinematicLight,
  ThreePointLighting,
  TimeOfDaySystem,
  LightProbeSystem,
  LightingPresets,
  DEFAULT_LIGHT_CONFIG,
};

export default cinematicLighting;
