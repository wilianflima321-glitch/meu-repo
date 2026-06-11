export type TimeOfDay = 'dawn' | 'sunrise' | 'morning' | 'noon' | 'afternoon' |
                        'sunset' | 'dusk' | 'night' | 'midnight';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type MoonPhase = 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' |
                        'full' | 'waning_gibbous' | 'third_quarter' | 'waning_crescent';

export interface TimeState {
  time: number;
  normalized: number;
  timeOfDay: TimeOfDay;
  dayOfYear: number;
  month: number;
  dayOfMonth: number;
  year: number;
  season: Season;
  isDaytime: boolean;
  sunAltitude: number;
  sunAzimuth: number;
  moonAltitude: number;
  moonAzimuth: number;
  moonPhase: MoonPhase;
  moonIllumination: number;
}

export interface SkyState {
  zenithColor: { r: number; g: number; b: number };
  horizonColor: { r: number; g: number; b: number };
  groundColor: { r: number; g: number; b: number };
  sunColor: { r: number; g: number; b: number };
  sunIntensity: number;
  moonColor: { r: number; g: number; b: number };
  moonIntensity: number;
  ambientIntensity: number;
  shadowIntensity: number;
  fogColor: { r: number; g: number; b: number };
  starVisibility: number;
  cloudTint: { r: number; g: number; b: number };
}

export interface CelestialBody {
  type: 'sun' | 'moon';
  position: { x: number; y: number; z: number };
  direction: { x: number; y: number; z: number };
  color: { r: number; g: number; b: number };
  size: number;
  intensity: number;
}

export interface DayNightConfig {
  dayLengthSeconds: number;
  latitude: number;
  startTime: number;
  startDayOfYear: number;
  startYear: number;
  enableSeasons: boolean;
  enableMoonPhases: boolean;
  enableStars: boolean;
  timeScale: number;
}
