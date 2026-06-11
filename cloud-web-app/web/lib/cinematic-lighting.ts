// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
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

import { LightProbeSystem } from './cinematic-lighting-probes';
import { TimeOfDaySystem } from './cinematic-lighting-time-of-day';
import type { AdvancedLightConfig, AreaLightShape, LightType } from './cinematic-lighting.types';
export type { AdvancedLightConfig, AreaLightShape, LightType } from './cinematic-lighting.types';
export { LightProbeSystem } from './cinematic-lighting-probes';
export { TimeOfDaySystem } from './cinematic-lighting-time-of-day';

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

  private createAreaLight(): THREE.Light {
    // Area lights usando RectAreaLight do Three.js
    const { RectAreaLight } = require('three/examples/jsm/lights/RectAreaLight.js') as {
      RectAreaLight: new (color: THREE.Color, intensity: number, width: number, height: number) => THREE.Light;
    };

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
