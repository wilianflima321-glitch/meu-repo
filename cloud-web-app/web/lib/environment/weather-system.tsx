/**
 * Weather System - Sistema de Clima Avançado
 * 
 * Sistema completo com:
 * - Weather types (rain, snow, fog, storm)
 * - Transitions between weather states
 * - Procedural cloud generation
 * - Wind simulation
 * - Precipitation particles
 * - Puddle/wetness effects
 * - Thunder & lightning
 * - Temperature system
 * - Biome integration
 * 
 * @module lib/environment/weather-system
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type WeatherType = 
  | 'clear'
  | 'partly_cloudy'
  | 'cloudy'
  | 'overcast'
  | 'light_rain'
  | 'rain'
  | 'heavy_rain'
  | 'thunderstorm'
  | 'light_snow'
  | 'snow'
  | 'blizzard'
  | 'fog'
  | 'dense_fog'
  | 'sandstorm'
  | 'hail';

export interface WeatherState {
  type: WeatherType;
  intensity: number; // 0-1
  temperature: number; // Celsius
  humidity: number; // 0-1
  windSpeed: number; // m/s
  windDirection: number; // degrees (0 = north)
  cloudCover: number; // 0-1
  visibility: number; // meters
  precipitation: number; // mm/h
  wetness: number; // 0-1 (ground wetness)
  lightning: boolean;
  fogDensity: number; // 0-1
}

export interface WeatherPreset extends Partial<WeatherState> {
  name: string;
  duration?: { min: number; max: number };
  transitions?: WeatherType[];
  ambientSound?: string;
  skyboxMaterial?: string;
}

export interface WeatherTransition {
  from: WeatherType;
  to: WeatherType;
  duration: number;
  progress: number;
  startState: WeatherState;
  endState: WeatherState;
}

export interface CloudLayer {
  altitude: number;
  coverage: number;
  speed: number;
  direction: number;
  type: 'cumulus' | 'stratus' | 'cirrus' | 'nimbus';
}

export interface WindZone {
  id: string;
  position: { x: number; y: number; z: number };
  radius: number;
  strength: number;
  turbulence: number;
}

export interface LightningBolt {
  startPoint: { x: number; y: number; z: number };
  endPoint: { x: number; y: number; z: number };
  intensity: number;
  duration: number;
  branches: LightningBranch[];
}

export interface LightningBranch {
  startOffset: number;
  direction: { x: number; y: number; z: number };
  length: number;
}

export interface WeatherConfig {
  enablePrecipitation: boolean;
  enableLightning: boolean;
  enableWetness: boolean;
  enableFog: boolean;
  enableWind: boolean;
  precipitationDensity: number;
  maxCloudLayers: number;
  updateInterval: number;
}

// ============================================================================
// WEATHER PRESETS
// ============================================================================

export const DEFAULT_WEATHER_PRESETS: Record<WeatherType, WeatherPreset> = {
  clear: {
    name: 'Clear Sky',
    type: 'clear',
    intensity: 0,
    temperature: 22,
    humidity: 0.3,
    windSpeed: 2,
    cloudCover: 0.1,
    visibility: 20000,
    precipitation: 0,
    fogDensity: 0,
    transitions: ['partly_cloudy', 'fog'],
    duration: { min: 1800, max: 7200 },
  },
  partly_cloudy: {
    name: 'Partly Cloudy',
    type: 'partly_cloudy',
    intensity: 0.2,
    temperature: 20,
    humidity: 0.4,
    windSpeed: 5,
    cloudCover: 0.3,
    visibility: 15000,
    precipitation: 0,
    fogDensity: 0,
    transitions: ['clear', 'cloudy', 'light_rain'],
    duration: { min: 900, max: 3600 },
  },
  cloudy: {
    name: 'Cloudy',
    type: 'cloudy',
    intensity: 0.4,
    temperature: 18,
    humidity: 0.5,
    windSpeed: 8,
    cloudCover: 0.6,
    visibility: 10000,
    precipitation: 0,
    fogDensity: 0.1,
    transitions: ['partly_cloudy', 'overcast', 'light_rain'],
    duration: { min: 600, max: 2400 },
  },
  overcast: {
    name: 'Overcast',
    type: 'overcast',
    intensity: 0.6,
    temperature: 15,
    humidity: 0.7,
    windSpeed: 10,
    cloudCover: 0.9,
    visibility: 5000,
    precipitation: 0,
    fogDensity: 0.2,
    transitions: ['cloudy', 'rain', 'fog'],
    duration: { min: 600, max: 1800 },
  },
  light_rain: {
    name: 'Light Rain',
    type: 'light_rain',
    intensity: 0.3,
    temperature: 16,
    humidity: 0.8,
    windSpeed: 8,
    cloudCover: 0.7,
    visibility: 8000,
    precipitation: 2.5,
    fogDensity: 0.15,
    wetness: 0.3,
    transitions: ['cloudy', 'rain', 'clear'],
    duration: { min: 300, max: 1200 },
  },
  rain: {
    name: 'Rain',
    type: 'rain',
    intensity: 0.6,
    temperature: 14,
    humidity: 0.9,
    windSpeed: 12,
    cloudCover: 0.85,
    visibility: 4000,
    precipitation: 7.5,
    fogDensity: 0.25,
    wetness: 0.6,
    transitions: ['light_rain', 'heavy_rain', 'thunderstorm'],
    duration: { min: 300, max: 900 },
  },
  heavy_rain: {
    name: 'Heavy Rain',
    type: 'heavy_rain',
    intensity: 0.9,
    temperature: 13,
    humidity: 0.95,
    windSpeed: 18,
    cloudCover: 0.95,
    visibility: 1500,
    precipitation: 25,
    fogDensity: 0.4,
    wetness: 0.9,
    transitions: ['rain', 'thunderstorm'],
    duration: { min: 180, max: 600 },
  },
  thunderstorm: {
    name: 'Thunderstorm',
    type: 'thunderstorm',
    intensity: 1.0,
    temperature: 12,
    humidity: 0.98,
    windSpeed: 25,
    cloudCover: 1.0,
    visibility: 1000,
    precipitation: 30,
    fogDensity: 0.3,
    wetness: 1.0,
    lightning: true,
    transitions: ['heavy_rain', 'rain'],
    duration: { min: 120, max: 480 },
  },
  light_snow: {
    name: 'Light Snow',
    type: 'light_snow',
    intensity: 0.3,
    temperature: -2,
    humidity: 0.6,
    windSpeed: 5,
    cloudCover: 0.7,
    visibility: 6000,
    precipitation: 1,
    fogDensity: 0.1,
    transitions: ['cloudy', 'snow'],
    duration: { min: 600, max: 2400 },
  },
  snow: {
    name: 'Snow',
    type: 'snow',
    intensity: 0.6,
    temperature: -5,
    humidity: 0.75,
    windSpeed: 10,
    cloudCover: 0.85,
    visibility: 3000,
    precipitation: 5,
    fogDensity: 0.2,
    transitions: ['light_snow', 'blizzard'],
    duration: { min: 300, max: 1200 },
  },
  blizzard: {
    name: 'Blizzard',
    type: 'blizzard',
    intensity: 1.0,
    temperature: -10,
    humidity: 0.9,
    windSpeed: 35,
    cloudCover: 1.0,
    visibility: 200,
    precipitation: 15,
    fogDensity: 0.8,
    transitions: ['snow'],
    duration: { min: 120, max: 600 },
  },
  fog: {
    name: 'Fog',
    type: 'fog',
    intensity: 0.5,
    temperature: 12,
    humidity: 0.95,
    windSpeed: 2,
    cloudCover: 0.4,
    visibility: 500,
    precipitation: 0,
    fogDensity: 0.7,
    transitions: ['clear', 'dense_fog', 'light_rain'],
    duration: { min: 600, max: 3600 },
  },
  dense_fog: {
    name: 'Dense Fog',
    type: 'dense_fog',
    intensity: 0.8,
    temperature: 10,
    humidity: 0.98,
    windSpeed: 1,
    cloudCover: 0.5,
    visibility: 100,
    precipitation: 0,
    fogDensity: 0.95,
    transitions: ['fog'],
    duration: { min: 300, max: 1200 },
  },
  sandstorm: {
    name: 'Sandstorm',
    type: 'sandstorm',
    intensity: 0.9,
    temperature: 35,
    humidity: 0.1,
    windSpeed: 40,
    cloudCover: 0.2,
    visibility: 50,
    precipitation: 0,
    fogDensity: 0.9,
    transitions: ['clear'],
    duration: { min: 180, max: 900 },
  },
  hail: {
    name: 'Hail',
    type: 'hail',
    intensity: 0.8,
    temperature: 5,
    humidity: 0.85,
    windSpeed: 20,
    cloudCover: 0.9,
    visibility: 2000,
    precipitation: 10,
    fogDensity: 0.2,
    wetness: 0.7,
    transitions: ['thunderstorm', 'rain'],
    duration: { min: 60, max: 300 },
  },
};

// ============================================================================
// WEATHER SYSTEM
// ============================================================================

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
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
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
  
  // ============================================================================
  // WEATHER TRANSITIONS
  // ============================================================================
  
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
  
  // ============================================================================
  // STATE CREATION
  // ============================================================================
  
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
  
  // ============================================================================
  // CLOUD SYSTEM
  // ============================================================================
  
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
  
  // ============================================================================
  // WIND SYSTEM
  // ============================================================================
  
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
  
  // ============================================================================
  // LIGHTNING SYSTEM
  // ============================================================================
  
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
  
  // ============================================================================
  // WETNESS SYSTEM
  // ============================================================================
  
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
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
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
  
  // ============================================================================
  // PRESETS
  // ============================================================================
  
  addPreset(type: WeatherType, preset: WeatherPreset): void {
    this.presets.set(type, preset);
  }
  
  getPreset(type: WeatherType): WeatherPreset | undefined {
    return this.presets.get(type);
  }
  
  getPresets(): WeatherPreset[] {
    return Array.from(this.presets.values());
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stop();
    this.presets.clear();
    this.cloudLayers = [];
    this.windZones = [];
    this.activeLightning = [];
    this.removeAllListeners();
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

interface WeatherContextValue {
  system: WeatherSystem;
}

const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<WeatherConfig>;
}) {
  const value = useMemo(() => ({
    system: new WeatherSystem(config),
  }), []);
  
  useEffect(() => {
    value.system.start();
    
    return () => {
      value.system.dispose();
    };
  }, [value]);
  
  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
}

export function useWeather() {
  const context = useContext(WeatherContext);
  if (!context) {
    return WeatherSystem.getInstance();
  }
  return context.system;
}

export function useWeatherState() {
  const weather = useWeather();
  const [state, setState] = useState<WeatherState>(weather.getState());
  
  useEffect(() => {
    const update = (s: WeatherState) => setState({ ...s });
    weather.on('update', update);
    weather.on('weatherChanged', update);
    
    return () => {
      weather.off('update', update);
      weather.off('weatherChanged', update);
    };
  }, [weather]);
  
  return state;
}

export function useWeatherTransition() {
  const weather = useWeather();
  const [progress, setProgress] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    const onStart = () => setIsTransitioning(true);
    const onProgress = (p: number) => setProgress(p);
    const onComplete = () => {
      setIsTransitioning(false);
      setProgress(0);
    };
    
    weather.on('transitionStarted', onStart);
    weather.on('transitionProgress', onProgress);
    weather.on('transitionComplete', onComplete);
    
    return () => {
      weather.off('transitionStarted', onStart);
      weather.off('transitionProgress', onProgress);
      weather.off('transitionComplete', onComplete);
    };
  }, [weather]);
  
  const setWeather = useCallback((type: WeatherType, immediate = false) => {
    weather.setWeather(type, immediate);
  }, [weather]);
  
  return { progress, isTransitioning, setWeather };
}

export function useWind() {
  const weather = useWeather();
  
  const getWindAt = useCallback((x: number, y: number, z: number) => {
    return weather.getWindAtPosition(x, y, z);
  }, [weather]);
  
  return { getWindAt };
}

export function useLightning() {
  const weather = useWeather();
  const [lastBolt, setLastBolt] = useState<LightningBolt | null>(null);
  const [lastThunder, setLastThunder] = useState<{ distance: number; intensity: number } | null>(null);
  
  useEffect(() => {
    const onLightning = (bolt: LightningBolt) => setLastBolt(bolt);
    const onThunder = (data: { distance: number; intensity: number }) => setLastThunder(data);
    
    weather.on('lightning', onLightning);
    weather.on('thunder', onThunder);
    
    return () => {
      weather.off('lightning', onLightning);
      weather.off('thunder', onThunder);
    };
  }, [weather]);
  
  return { lastBolt, lastThunder };
}

export default {
  WeatherSystem,
  DEFAULT_WEATHER_PRESETS,
  WeatherProvider,
  useWeather,
  useWeatherState,
  useWeatherTransition,
  useWind,
  useLightning,
};
