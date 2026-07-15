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
