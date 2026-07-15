/** Weather runtime controller for Studio environment systems. */

import { EventEmitter } from 'events';
import { DEFAULT_WEATHER_PRESETS } from './weather-system.presets';
import { WeatherProvider, useLightning, useWeather, useWeatherState, useWeatherTransition, useWind } from './weather-system-react';
import type {
  CloudLayer,
  LightningBolt,
  LightningBranch,
  WeatherConfig,
  WeatherPreset,
  WeatherState,
  WeatherTransition,
  WeatherType,
  WindZone,
} from './weather-system.contracts';
export { DEFAULT_WEATHER_PRESETS } from './weather-system.presets';
export type {
  CloudLayer,
  LightningBolt,
  LightningBranch,
  WeatherConfig,
  WeatherPreset,
  WeatherState,
  WeatherTransition,
  WeatherType,
  WindZone,
} from './weather-system.contracts';

export class WeatherSystem extends EventEmitter {
  private static instance: WeatherSystem | null = null;

  private config: WeatherConfig;
  private currentState: WeatherState;
  private targetState: WeatherState | null = null;
  private transition: WeatherTransition | null = null;
  private presets: Map<WeatherType, WeatherPreset> = new Map();
  private cloudLayers: CloudLayer[] = [];
  private windZones: WindZone[] = [];
  private activeLightning: LightningBolt[] = [];

  private isRunning = false;
  private lastUpdate = 0;
  private weatherTimer = 0;
  private lightningTimer = 0;

  constructor(config: Partial<WeatherConfig> = {}) {
    super();

    this.config = {
      enablePrecipitation: true,
      enableLightning: true,
      enableWetness: true,
      enableFog: true,
      enableWind: true,
      precipitationDensity: 1.0,
      maxCloudLayers: 3,
      updateInterval: 1 / 30, // 30 FPS
      ...config,
    };

    // Initialize with clear weather
    this.currentState = this.createStateFromPreset('clear');

    // Load default presets
    for (const [type, preset] of Object.entries(DEFAULT_WEATHER_PRESETS)) {
      this.presets.set(type as WeatherType, preset);
    }

    // Initialize cloud layers
    this.initializeCloudLayers();
  }

  static getInstance(): WeatherSystem {
    if (!WeatherSystem.instance) {
      WeatherSystem.instance = new WeatherSystem();
    }
    return WeatherSystem.instance;
  }

  start(): void {
    this.isRunning = true;
    this.lastUpdate = performance.now();
    this.emit('started');
  }

  stop(): void {
    this.isRunning = false;
    this.emit('stopped');
  }

  update(deltaTime: number): void {
    if (!this.isRunning) return;

    // Update transition
    if (this.transition) {
      this.updateTransition(deltaTime);
    }

    // Update weather timer
    this.weatherTimer += deltaTime;

    // Check for automatic weather change
    const preset = this.presets.get(this.currentState.type);
    if (preset?.duration && !this.transition) {
      const duration = preset.duration.min +
        Math.random() * (preset.duration.max - preset.duration.min);

      if (this.weatherTimer >= duration) {
        this.transitionToRandomWeather();
      }
    }

    // Update systems
    if (this.config.enableWind) {
      this.updateWind(deltaTime);
    }

    if (this.config.enableLightning && this.currentState.lightning) {
      this.updateLightning(deltaTime);
    }

    if (this.config.enableWetness) {
      this.updateWetness(deltaTime);
    }

    // Update cloud layers
    this.updateClouds(deltaTime);

    this.emit('update', this.currentState);
  }

  setWeather(type: WeatherType, immediate = false): void {
    if (immediate) {
      this.currentState = this.createStateFromPreset(type);
      this.transition = null;
      this.weatherTimer = 0;
      this.emit('weatherChanged', this.currentState);
    } else {
      this.transitionTo(type);
    }
  }

  transitionTo(type: WeatherType, duration = 60): void {
    const targetState = this.createStateFromPreset(type);

    this.transition = {
      from: this.currentState.type,
      to: type,
      duration,
      progress: 0,
      startState: { ...this.currentState },
      endState: targetState,
    };

    this.targetState = targetState;
    this.emit('transitionStarted', this.transition);
  }

  private transitionToRandomWeather(): void {
    const preset = this.presets.get(this.currentState.type);
    if (!preset?.transitions || preset.transitions.length === 0) return;

    const randomIndex = Math.floor(Math.random() * preset.transitions.length);
    const nextWeather = preset.transitions[randomIndex];

    // Random transition duration (30-120 seconds)
    const duration = 30 + Math.random() * 90;

    this.transitionTo(nextWeather, duration);
  }

  private updateTransition(deltaTime: number): void {
    if (!this.transition) return;

    this.transition.progress += deltaTime / this.transition.duration;

    if (this.transition.progress >= 1) {
      // Transition complete
      this.currentState = { ...this.transition.endState };
      this.emit('transitionComplete', this.transition);
      this.transition = null;
      this.targetState = null;
      this.weatherTimer = 0;
      this.emit('weatherChanged', this.currentState);
    } else {
      // Interpolate state
      this.currentState = this.interpolateState(
        this.transition.startState,
        this.transition.endState,
        this.easeInOutCubic(this.transition.progress)
      );

      this.emit('transitionProgress', this.transition.progress);
    }
  }

  private interpolateState(a: WeatherState, b: WeatherState, t: number): WeatherState {
    return {
      type: t < 0.5 ? a.type : b.type,
      intensity: this.lerp(a.intensity, b.intensity, t),
      temperature: this.lerp(a.temperature, b.temperature, t),
      humidity: this.lerp(a.humidity, b.humidity, t),
      windSpeed: this.lerp(a.windSpeed, b.windSpeed, t),
      windDirection: this.lerpAngle(a.windDirection, b.windDirection, t),
      cloudCover: this.lerp(a.cloudCover, b.cloudCover, t),
      visibility: this.lerp(a.visibility, b.visibility, t),
      precipitation: this.lerp(a.precipitation, b.precipitation, t),
      wetness: this.lerp(a.wetness, b.wetness, t),
      lightning: t < 0.5 ? a.lightning : b.lightning,
      fogDensity: this.lerp(a.fogDensity, b.fogDensity, t),
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    let diff = b - a;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return a + diff * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private createStateFromPreset(type: WeatherType): WeatherState {
    const preset = this.presets.get(type) || DEFAULT_WEATHER_PRESETS.clear;

    return {
      type,
      intensity: preset.intensity ?? 0,
      temperature: preset.temperature ?? 20,
      humidity: preset.humidity ?? 0.5,
      windSpeed: preset.windSpeed ?? 5,
      windDirection: Math.random() * 360,
      cloudCover: preset.cloudCover ?? 0.5,
      visibility: preset.visibility ?? 10000,
      precipitation: preset.precipitation ?? 0,
      wetness: preset.wetness ?? 0,
      lightning: preset.lightning ?? false,
      fogDensity: preset.fogDensity ?? 0,
    };
  }

  private initializeCloudLayers(): void {
    this.cloudLayers = [
      { altitude: 1000, coverage: 0.3, speed: 5, direction: 0, type: 'cumulus' },
      { altitude: 2500, coverage: 0.2, speed: 10, direction: 45, type: 'stratus' },
      { altitude: 5000, coverage: 0.1, speed: 20, direction: 90, type: 'cirrus' },
    ];
  }

  private updateClouds(deltaTime: number): void {
    for (const layer of this.cloudLayers) {
      // Update coverage based on weather
      const targetCoverage = this.currentState.cloudCover *
        (layer.type === 'nimbus' ? 1.0 :
         layer.type === 'stratus' ? 0.8 :
         layer.type === 'cumulus' ? 0.6 : 0.3);

      layer.coverage = this.lerp(layer.coverage, targetCoverage, deltaTime * 0.1);

      // Update direction based on wind
      const targetDirection = this.currentState.windDirection + (layer.altitude / 1000) * 10;
      layer.direction = this.lerpAngle(layer.direction, targetDirection, deltaTime * 0.05);

      // Update speed based on wind
      const targetSpeed = this.currentState.windSpeed * (1 + layer.altitude / 5000);
      layer.speed = this.lerp(layer.speed, targetSpeed, deltaTime * 0.1);
    }

    this.emit('cloudsUpdated', this.cloudLayers);
  }

  getCloudLayers(): CloudLayer[] {
    return [...this.cloudLayers];
  }

  private updateWind(deltaTime: number): void {
    // Add random gusts
    if (Math.random() < 0.01) {
      const gustStrength = this.currentState.windSpeed * (0.5 + Math.random() * 0.5);
      this.emit('windGust', {
        strength: gustStrength,
        direction: this.currentState.windDirection + (Math.random() - 0.5) * 30,
      });
    }

    // Slowly shift wind direction
    this.currentState.windDirection += (Math.random() - 0.5) * deltaTime * 2;
    this.currentState.windDirection = ((this.currentState.windDirection % 360) + 360) % 360;
  }

  addWindZone(zone: WindZone): void {
    this.windZones.push(zone);
    this.emit('windZoneAdded', zone);
  }

  removeWindZone(id: string): void {
    const index = this.windZones.findIndex(z => z.id === id);
    if (index !== -1) {
      this.windZones.splice(index, 1);
      this.emit('windZoneRemoved', id);
    }
  }

  getWindAtPosition(x: number, y: number, z: number): { x: number; y: number; z: number } {
    // Base wind from weather
    const baseWind = {
      x: Math.sin(this.currentState.windDirection * Math.PI / 180) * this.currentState.windSpeed,
      y: 0,
      z: Math.cos(this.currentState.windDirection * Math.PI / 180) * this.currentState.windSpeed,
    };

    // Add wind zone influences
    for (const zone of this.windZones) {
      const dx = x - zone.position.x;
      const dy = y - zone.position.y;
      const dz = z - zone.position.z;
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (distance < zone.radius) {
        const influence = 1 - (distance / zone.radius);
        const turbulence = zone.turbulence * Math.sin(performance.now() / 500);

        baseWind.x += (Math.random() - 0.5) * turbulence * influence;
        baseWind.y += zone.strength * influence;
        baseWind.z += (Math.random() - 0.5) * turbulence * influence;
      }
    }

    return baseWind;
  }

  private updateLightning(deltaTime: number): void {
    this.lightningTimer += deltaTime;

    // Random lightning strike
    const lightningChance = this.currentState.intensity * 0.02;

    if (this.lightningTimer > 0.5 && Math.random() < lightningChance) {
      this.createLightningStrike();
      this.lightningTimer = 0;
    }

    // Update active lightning
    this.activeLightning = this.activeLightning.filter(bolt => {
      bolt.duration -= deltaTime;
      return bolt.duration > 0;
    });
  }

  private createLightningStrike(): void {
    const x = (Math.random() - 0.5) * 2000;
    const z = (Math.random() - 0.5) * 2000;

    const bolt: LightningBolt = {
      startPoint: { x, y: 1000, z },
      endPoint: { x: x + (Math.random() - 0.5) * 200, y: 0, z: z + (Math.random() - 0.5) * 200 },
      intensity: 0.5 + Math.random() * 0.5,
      duration: 0.1 + Math.random() * 0.15,
      branches: this.generateLightningBranches(5),
    };

    this.activeLightning.push(bolt);
    this.emit('lightning', bolt);

    // Thunder after delay based on distance
    const distance = Math.sqrt(x * x + z * z);
    const thunderDelay = distance / 343; // Speed of sound

    setTimeout(() => {
      this.emit('thunder', { distance, intensity: bolt.intensity });
    }, thunderDelay * 1000);
  }

  private generateLightningBranches(count: number): LightningBranch[] {
    const branches: LightningBranch[] = [];

    for (let i = 0; i < count; i++) {
      branches.push({
        startOffset: Math.random(),
        direction: {
          x: (Math.random() - 0.5) * 2,
          y: -Math.random() * 0.5,
          z: (Math.random() - 0.5) * 2,
        },
        length: 50 + Math.random() * 150,
      });
    }

    return branches;
  }

  getActiveLightning(): LightningBolt[] {
    return [...this.activeLightning];
  }

  private updateWetness(deltaTime: number): void {
    if (this.currentState.precipitation > 0) {
      // Increase wetness when raining
      const targetWetness = Math.min(1, this.currentState.precipitation / 10);
      this.currentState.wetness = this.lerp(
        this.currentState.wetness,
        targetWetness,
        deltaTime * 0.1
      );
    } else {
      // Dry out when not raining
      const dryRate = Math.max(0.01, this.currentState.temperature / 100);
      this.currentState.wetness = Math.max(0, this.currentState.wetness - dryRate * deltaTime);
    }
  }

  getState(): WeatherState {
    return { ...this.currentState };
  }

  getType(): WeatherType {
    return this.currentState.type;
  }

  getTemperature(): number {
    return this.currentState.temperature;
  }

  getWindSpeed(): number {
    return this.currentState.windSpeed;
  }

  getWindDirection(): number {
    return this.currentState.windDirection;
  }

  getVisibility(): number {
    return this.currentState.visibility;
  }

  isRaining(): boolean {
    return this.currentState.precipitation > 0 && this.currentState.temperature > 0;
  }

  isSnowing(): boolean {
    return this.currentState.precipitation > 0 && this.currentState.temperature <= 0;
  }

  isTransitioning(): boolean {
    return this.transition !== null;
  }

  getTransitionProgress(): number {
    return this.transition?.progress ?? 0;
  }

  addPreset(type: WeatherType, preset: WeatherPreset): void {
    this.presets.set(type, preset);
  }

  getPreset(type: WeatherType): WeatherPreset | undefined {
    return this.presets.get(type);
  }

  getPresets(): WeatherPreset[] {
    return Array.from(this.presets.values());
  }

  dispose(): void {
    this.stop();
    this.presets.clear();
    this.cloudLayers = [];
    this.windZones = [];
    this.activeLightning = [];
    this.removeAllListeners();
  }
}

export { WeatherProvider, useLightning, useWeather, useWeatherState, useWeatherTransition, useWind } from './weather-system-react';

const __defaultExport = {
  WeatherSystem,
  DEFAULT_WEATHER_PRESETS,
  WeatherProvider,
  useWeather,
  useWeatherState,
  useWeatherTransition,
  useWind,
  useLightning,
};

export default __defaultExport;
