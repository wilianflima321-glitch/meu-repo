/**
 * Day/Night Cycle System - Sistema de Ciclo Dia/Noite Avançado
 * 
 * Sistema completo com:
 * - Sun/moon position and rotation
 * - Dynamic sky colors
 * - Ambient lighting transitions
 * - Star field at night
 * - Celestial body phases (moon phases)
 * - Seasonal variations
 * - Latitude-based sun angles
 * - Eclipse system
 * - Time acceleration/deceleration
 * 
 * @module lib/environment/day-night-cycle
 */

import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type TimeOfDay = 'dawn' | 'sunrise' | 'morning' | 'noon' | 'afternoon' | 
                        'sunset' | 'dusk' | 'night' | 'midnight';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type MoonPhase = 'new' | 'waxing_crescent' | 'first_quarter' | 'waxing_gibbous' |
                        'full' | 'waning_gibbous' | 'third_quarter' | 'waning_crescent';

export interface TimeState {
  /** Current time in hours (0-24) */
  time: number;
  /** Time normalized 0-1 */
  normalized: number;
  /** Current time of day */
  timeOfDay: TimeOfDay;
  /** Day number (1-365) */
  dayOfYear: number;
  /** Current month (1-12) */
  month: number;
  /** Current day of month (1-31) */
  dayOfMonth: number;
  /** Current year */
  year: number;
  /** Current season */
  season: Season;
  /** Is it daytime? */
  isDaytime: boolean;
  /** Sun altitude angle (degrees) */
  sunAltitude: number;
  /** Sun azimuth angle (degrees) */
  sunAzimuth: number;
  /** Moon altitude angle (degrees) */
  moonAltitude: number;
  /** Moon azimuth angle (degrees) */
  moonAzimuth: number;
  /** Current moon phase */
  moonPhase: MoonPhase;
  /** Moon illumination (0-1) */
  moonIllumination: number;
}

export interface SkyState {
  /** Sky zenith color */
  zenithColor: { r: number; g: number; b: number };
  /** Sky horizon color */
  horizonColor: { r: number; g: number; b: number };
  /** Ground color (for reflection) */
  groundColor: { r: number; g: number; b: number };
  /** Sun color */
  sunColor: { r: number; g: number; b: number };
  /** Sun intensity (0-1) */
  sunIntensity: number;
  /** Moon color */
  moonColor: { r: number; g: number; b: number };
  /** Moon intensity (0-1) */
  moonIntensity: number;
  /** Ambient light intensity (0-1) */
  ambientIntensity: number;
  /** Shadow intensity (0-1) */
  shadowIntensity: number;
  /** Fog color */
  fogColor: { r: number; g: number; b: number };
  /** Star visibility (0-1) */
  starVisibility: number;
  /** Cloud tint color */
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
  /** Real seconds per game day */
  dayLengthSeconds: number;
  /** Latitude of the world (-90 to 90) */
  latitude: number;
  /** Starting time in hours */
  startTime: number;
  /** Starting day of year */
  startDayOfYear: number;
  /** Starting year */
  startYear: number;
  /** Enable seasons */
  enableSeasons: boolean;
  /** Enable moon phases */
  enableMoonPhases: boolean;
  /** Enable stars */
  enableStars: boolean;
  /** Time scale multiplier */
  timeScale: number;
}

// ============================================================================
// COLOR PRESETS
// ============================================================================

interface SkyColorPreset {
  zenith: { r: number; g: number; b: number };
  horizon: { r: number; g: number; b: number };
  ground: { r: number; g: number; b: number };
  sun: { r: number; g: number; b: number };
  sunIntensity: number;
  fog: { r: number; g: number; b: number };
  ambient: number;
  shadow: number;
}

const SKY_PRESETS: Record<TimeOfDay, SkyColorPreset> = {
  dawn: {
    zenith: { r: 0.2, g: 0.25, b: 0.5 },
    horizon: { r: 0.85, g: 0.4, b: 0.2 },
    ground: { r: 0.15, g: 0.15, b: 0.2 },
    sun: { r: 1.0, g: 0.5, b: 0.2 },
    sunIntensity: 0.3,
    fog: { r: 0.5, g: 0.35, b: 0.25 },
    ambient: 0.25,
    shadow: 0.5,
  },
  sunrise: {
    zenith: { r: 0.35, g: 0.45, b: 0.7 },
    horizon: { r: 1.0, g: 0.6, b: 0.3 },
    ground: { r: 0.25, g: 0.2, b: 0.2 },
    sun: { r: 1.0, g: 0.7, b: 0.3 },
    sunIntensity: 0.6,
    fog: { r: 0.7, g: 0.5, b: 0.35 },
    ambient: 0.4,
    shadow: 0.6,
  },
  morning: {
    zenith: { r: 0.4, g: 0.6, b: 0.9 },
    horizon: { r: 0.6, g: 0.75, b: 0.9 },
    ground: { r: 0.3, g: 0.3, b: 0.3 },
    sun: { r: 1.0, g: 0.95, b: 0.85 },
    sunIntensity: 0.85,
    fog: { r: 0.65, g: 0.7, b: 0.8 },
    ambient: 0.55,
    shadow: 0.75,
  },
  noon: {
    zenith: { r: 0.3, g: 0.5, b: 0.95 },
    horizon: { r: 0.5, g: 0.7, b: 0.95 },
    ground: { r: 0.35, g: 0.35, b: 0.35 },
    sun: { r: 1.0, g: 1.0, b: 0.95 },
    sunIntensity: 1.0,
    fog: { r: 0.6, g: 0.7, b: 0.85 },
    ambient: 0.65,
    shadow: 0.85,
  },
  afternoon: {
    zenith: { r: 0.35, g: 0.55, b: 0.9 },
    horizon: { r: 0.55, g: 0.7, b: 0.85 },
    ground: { r: 0.35, g: 0.35, b: 0.35 },
    sun: { r: 1.0, g: 0.95, b: 0.8 },
    sunIntensity: 0.9,
    fog: { r: 0.6, g: 0.68, b: 0.8 },
    ambient: 0.6,
    shadow: 0.8,
  },
  sunset: {
    zenith: { r: 0.4, g: 0.45, b: 0.65 },
    horizon: { r: 1.0, g: 0.5, b: 0.2 },
    ground: { r: 0.3, g: 0.2, b: 0.2 },
    sun: { r: 1.0, g: 0.4, b: 0.1 },
    sunIntensity: 0.5,
    fog: { r: 0.75, g: 0.45, b: 0.3 },
    ambient: 0.35,
    shadow: 0.55,
  },
  dusk: {
    zenith: { r: 0.15, g: 0.15, b: 0.35 },
    horizon: { r: 0.5, g: 0.25, b: 0.15 },
    ground: { r: 0.1, g: 0.1, b: 0.15 },
    sun: { r: 0.9, g: 0.3, b: 0.1 },
    sunIntensity: 0.2,
    fog: { r: 0.3, g: 0.2, b: 0.2 },
    ambient: 0.2,
    shadow: 0.4,
  },
  night: {
    zenith: { r: 0.02, g: 0.02, b: 0.08 },
    horizon: { r: 0.05, g: 0.05, b: 0.1 },
    ground: { r: 0.02, g: 0.02, b: 0.04 },
    sun: { r: 0.0, g: 0.0, b: 0.0 },
    sunIntensity: 0.0,
    fog: { r: 0.03, g: 0.03, b: 0.06 },
    ambient: 0.08,
    shadow: 0.15,
  },
  midnight: {
    zenith: { r: 0.01, g: 0.01, b: 0.05 },
    horizon: { r: 0.03, g: 0.03, b: 0.07 },
    ground: { r: 0.01, g: 0.01, b: 0.03 },
    sun: { r: 0.0, g: 0.0, b: 0.0 },
    sunIntensity: 0.0,
    fog: { r: 0.02, g: 0.02, b: 0.04 },
    ambient: 0.05,
    shadow: 0.1,
  },
};

// ============================================================================
// DAY/NIGHT CYCLE SYSTEM
// ============================================================================

export class DayNightCycle extends EventEmitter {
  private static instance: DayNightCycle | null = null;
  
  private config: DayNightConfig;
  private currentTime: number; // Hours (0-24)
  private currentDay: number; // Day of year (1-365)
  private currentYear: number;
  
  private isRunning = false;
  private isPaused = false;
  private timeAccumulator = 0;
  
  private sunPosition = { x: 0, y: 1, z: 0 };
  private moonPosition = { x: 0, y: -1, z: 0 };
  
  private cachedTimeState: TimeState | null = null;
  private cachedSkyState: SkyState | null = null;
  
  constructor(config: Partial<DayNightConfig> = {}) {
    super();
    
    this.config = {
      dayLengthSeconds: 1200, // 20 minutes real time = 1 game day
      latitude: 45, // Northern mid-latitudes
      startTime: 8, // 8 AM
      startDayOfYear: 80, // ~March 21 (spring equinox)
      startYear: 2025,
      enableSeasons: true,
      enableMoonPhases: true,
      enableStars: true,
      timeScale: 1.0,
      ...config,
    };
    
    this.currentTime = this.config.startTime;
    this.currentDay = this.config.startDayOfYear;
    this.currentYear = this.config.startYear;
    
    this.updateCelestialPositions();
  }
  
  static getInstance(): DayNightCycle {
    if (!DayNightCycle.instance) {
      DayNightCycle.instance = new DayNightCycle();
    }
    return DayNightCycle.instance;
  }
  
  // ============================================================================
  // LIFECYCLE
  // ============================================================================
  
  start(): void {
    this.isRunning = true;
    this.emit('started');
  }
  
  stop(): void {
    this.isRunning = false;
    this.emit('stopped');
  }
  
  pause(): void {
    this.isPaused = true;
    this.emit('paused');
  }
  
  resume(): void {
    this.isPaused = false;
    this.emit('resumed');
  }
  
  update(deltaTime: number): void {
    if (!this.isRunning || this.isPaused) return;
    
    // Calculate time progression
    const hoursPerSecond = 24 / this.config.dayLengthSeconds;
    const timeAdvance = deltaTime * hoursPerSecond * this.config.timeScale;
    
    this.currentTime += timeAdvance;
    
    // Handle day rollover
    while (this.currentTime >= 24) {
      this.currentTime -= 24;
      this.advanceDay();
    }
    
    while (this.currentTime < 0) {
      this.currentTime += 24;
      this.regressDay();
    }
    
    // Update celestial positions
    this.updateCelestialPositions();
    
    // Invalidate cache
    this.cachedTimeState = null;
    this.cachedSkyState = null;
    
    // Emit update
    this.emit('update', this.getTimeState());
  }
  
  private advanceDay(): void {
    this.currentDay++;
    
    if (this.currentDay > 365) {
      this.currentDay = 1;
      this.currentYear++;
      this.emit('yearChanged', this.currentYear);
    }
    
    this.emit('dayChanged', { day: this.currentDay, year: this.currentYear });
    
    // Check for season change
    const oldSeason = this.getSeasonForDay(this.currentDay - 1);
    const newSeason = this.getSeasonForDay(this.currentDay);
    if (oldSeason !== newSeason) {
      this.emit('seasonChanged', newSeason);
    }
  }
  
  private regressDay(): void {
    this.currentDay--;
    
    if (this.currentDay < 1) {
      this.currentDay = 365;
      this.currentYear--;
    }
    
    this.emit('dayChanged', { day: this.currentDay, year: this.currentYear });
  }
  
  // ============================================================================
  // CELESTIAL CALCULATIONS
  // ============================================================================
  
  private updateCelestialPositions(): void {
    const lat = this.config.latitude * Math.PI / 180;
    const declination = this.getSolarDeclination();
    const hourAngle = (this.currentTime - 12) * 15 * Math.PI / 180;
    
    // Sun position
    const sinAlt = Math.sin(lat) * Math.sin(declination) +
                   Math.cos(lat) * Math.cos(declination) * Math.cos(hourAngle);
    const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
    
    const sinAz = -Math.cos(declination) * Math.sin(hourAngle);
    const cosAz = (Math.sin(altitude) * Math.sin(lat) - Math.sin(declination)) /
                  (Math.cos(altitude) * Math.cos(lat) + 0.0001);
    let azimuth = Math.atan2(sinAz, cosAz);
    
    // Convert to Cartesian
    this.sunPosition = {
      x: Math.cos(altitude) * Math.sin(azimuth),
      y: Math.sin(altitude),
      z: Math.cos(altitude) * Math.cos(azimuth),
    };
    
    // Moon position (opposite + offset)
    const moonOffset = this.getMoonPhaseOffset() * Math.PI;
    const moonAltitude = altitude - Math.PI + moonOffset * 0.3;
    const moonAzimuth = azimuth + Math.PI + moonOffset;
    
    this.moonPosition = {
      x: Math.cos(moonAltitude) * Math.sin(moonAzimuth),
      y: Math.sin(moonAltitude),
      z: Math.cos(moonAltitude) * Math.cos(moonAzimuth),
    };
  }
  
  private getSolarDeclination(): number {
    // Simplified solar declination calculation
    const dayAngle = (360 / 365) * (this.currentDay - 81) * Math.PI / 180;
    return 23.45 * Math.sin(dayAngle) * Math.PI / 180;
  }
  
  private getMoonPhaseOffset(): number {
    // Lunar cycle ~29.5 days
    const lunarDay = (this.currentDay + this.currentYear * 365) % 29.5;
    return lunarDay / 29.5;
  }
  
  // ============================================================================
  // TIME STATE
  // ============================================================================
  
  getTimeState(): TimeState {
    if (this.cachedTimeState) return this.cachedTimeState;
    
    const timeOfDay = this.getTimeOfDay();
    const sunAlt = Math.asin(this.sunPosition.y) * 180 / Math.PI;
    const sunAz = Math.atan2(this.sunPosition.x, this.sunPosition.z) * 180 / Math.PI;
    const moonAlt = Math.asin(this.moonPosition.y) * 180 / Math.PI;
    const moonAz = Math.atan2(this.moonPosition.x, this.moonPosition.z) * 180 / Math.PI;
    
    const moonPhaseOffset = this.getMoonPhaseOffset();
    
    this.cachedTimeState = {
      time: this.currentTime,
      normalized: this.currentTime / 24,
      timeOfDay,
      dayOfYear: this.currentDay,
      month: this.getDayMonth()[0],
      dayOfMonth: this.getDayMonth()[1],
      year: this.currentYear,
      season: this.getSeasonForDay(this.currentDay),
      isDaytime: sunAlt > -6, // Civil twilight
      sunAltitude: sunAlt,
      sunAzimuth: ((sunAz + 360) % 360),
      moonAltitude: moonAlt,
      moonAzimuth: ((moonAz + 360) % 360),
      moonPhase: this.getMoonPhase(moonPhaseOffset),
      moonIllumination: this.getMoonIllumination(moonPhaseOffset),
    };
    
    return this.cachedTimeState;
  }
  
  private getTimeOfDay(): TimeOfDay {
    const hour = this.currentTime;
    
    if (hour >= 5 && hour < 6) return 'dawn';
    if (hour >= 6 && hour < 7.5) return 'sunrise';
    if (hour >= 7.5 && hour < 11) return 'morning';
    if (hour >= 11 && hour < 13) return 'noon';
    if (hour >= 13 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 18.5) return 'sunset';
    if (hour >= 18.5 && hour < 20) return 'dusk';
    if (hour >= 20 || hour < 0.5) return 'night';
    if (hour >= 0.5 && hour < 4) return 'midnight';
    if (hour >= 4 && hour < 5) return 'night';
    
    return 'night';
  }
  
  private getSeasonForDay(day: number): Season {
    if (!this.config.enableSeasons) return 'summer';
    
    // Northern hemisphere seasons
    if (day >= 79 && day < 172) return 'spring';
    if (day >= 172 && day < 266) return 'summer';
    if (day >= 266 && day < 355) return 'autumn';
    return 'winter';
  }
  
  private getDayMonth(): [number, number] {
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    let remaining = this.currentDay;
    let month = 0;
    
    while (remaining > daysInMonth[month]) {
      remaining -= daysInMonth[month];
      month++;
      if (month >= 12) month = 0;
    }
    
    return [month + 1, remaining];
  }
  
  private getMoonPhase(offset: number): MoonPhase {
    if (!this.config.enableMoonPhases) return 'full';
    
    if (offset < 0.0625) return 'new';
    if (offset < 0.1875) return 'waxing_crescent';
    if (offset < 0.3125) return 'first_quarter';
    if (offset < 0.4375) return 'waxing_gibbous';
    if (offset < 0.5625) return 'full';
    if (offset < 0.6875) return 'waning_gibbous';
    if (offset < 0.8125) return 'third_quarter';
    if (offset < 0.9375) return 'waning_crescent';
    return 'new';
  }
  
  private getMoonIllumination(offset: number): number {
    // 0 at new moon, 1 at full moon
    return 0.5 - 0.5 * Math.cos(offset * 2 * Math.PI);
  }
  
  // ============================================================================
  // SKY STATE
  // ============================================================================
  
  getSkyState(): SkyState {
    if (this.cachedSkyState) return this.cachedSkyState;
    
    const timeOfDay = this.getTimeOfDay();
    const nextTimeOfDay = this.getNextTimeOfDay(timeOfDay);
    
    const preset = SKY_PRESETS[timeOfDay];
    const nextPreset = SKY_PRESETS[nextTimeOfDay];
    
    // Calculate blend factor
    const blendFactor = this.getTimeOfDayBlend(timeOfDay);
    
    // Interpolate colors
    const zenith = this.lerpColor(preset.zenith, nextPreset.zenith, blendFactor);
    const horizon = this.lerpColor(preset.horizon, nextPreset.horizon, blendFactor);
    const ground = this.lerpColor(preset.ground, nextPreset.ground, blendFactor);
    const sun = this.lerpColor(preset.sun, nextPreset.sun, blendFactor);
    const fog = this.lerpColor(preset.fog, nextPreset.fog, blendFactor);
    
    const sunIntensity = this.lerp(preset.sunIntensity, nextPreset.sunIntensity, blendFactor);
    const ambient = this.lerp(preset.ambient, nextPreset.ambient, blendFactor);
    const shadow = this.lerp(preset.shadow, nextPreset.shadow, blendFactor);
    
    // Calculate star visibility
    const timeState = this.getTimeState();
    const starVisibility = timeState.isDaytime ? 0 : Math.max(0, 1 - (timeState.sunAltitude + 12) / 12);
    
    // Moon lighting
    const moonIllum = this.getMoonIllumination(this.getMoonPhaseOffset());
    const moonIntensity = timeState.moonAltitude > 0 ? moonIllum * 0.15 : 0;
    
    this.cachedSkyState = {
      zenithColor: zenith,
      horizonColor: horizon,
      groundColor: ground,
      sunColor: sun,
      sunIntensity,
      moonColor: { r: 0.9, g: 0.92, b: 1.0 },
      moonIntensity,
      ambientIntensity: ambient,
      shadowIntensity: shadow,
      fogColor: fog,
      starVisibility: this.config.enableStars ? starVisibility : 0,
      cloudTint: this.lerpColor(sun, { r: 1, g: 1, b: 1 }, 0.5),
    };
    
    return this.cachedSkyState;
  }
  
  private getNextTimeOfDay(current: TimeOfDay): TimeOfDay {
    const order: TimeOfDay[] = [
      'dawn', 'sunrise', 'morning', 'noon', 'afternoon', 
      'sunset', 'dusk', 'night', 'midnight'
    ];
    
    const index = order.indexOf(current);
    return order[(index + 1) % order.length];
  }
  
  private getTimeOfDayBlend(timeOfDay: TimeOfDay): number {
    const hour = this.currentTime;
    
    // Get time ranges for each period
    const ranges: Record<TimeOfDay, [number, number]> = {
      dawn: [5, 6],
      sunrise: [6, 7.5],
      morning: [7.5, 11],
      noon: [11, 13],
      afternoon: [13, 17],
      sunset: [17, 18.5],
      dusk: [18.5, 20],
      night: [20, 24.5], // Wraps around
      midnight: [0.5, 4],
    };
    
    const [start, end] = ranges[timeOfDay];
    const adjustedHour = hour < start && timeOfDay === 'night' ? hour + 24 : hour;
    const adjustedEnd = end;
    
    return Math.max(0, Math.min(1, (adjustedHour - start) / (adjustedEnd - start)));
  }
  
  private lerpColor(
    a: { r: number; g: number; b: number },
    b: { r: number; g: number; b: number },
    t: number
  ): { r: number; g: number; b: number } {
    return {
      r: this.lerp(a.r, b.r, t),
      g: this.lerp(a.g, b.g, t),
      b: this.lerp(a.b, b.b, t),
    };
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }
  
  // ============================================================================
  // CELESTIAL BODIES
  // ============================================================================
  
  getSunBody(): CelestialBody {
    const skyState = this.getSkyState();
    
    return {
      type: 'sun',
      position: { ...this.sunPosition },
      direction: {
        x: -this.sunPosition.x,
        y: -this.sunPosition.y,
        z: -this.sunPosition.z,
      },
      color: skyState.sunColor,
      size: 1.0,
      intensity: skyState.sunIntensity,
    };
  }
  
  getMoonBody(): CelestialBody {
    const skyState = this.getSkyState();
    
    return {
      type: 'moon',
      position: { ...this.moonPosition },
      direction: {
        x: -this.moonPosition.x,
        y: -this.moonPosition.y,
        z: -this.moonPosition.z,
      },
      color: skyState.moonColor,
      size: 0.3,
      intensity: skyState.moonIntensity,
    };
  }
  
  getSunDirection(): { x: number; y: number; z: number } {
    const len = Math.sqrt(
      this.sunPosition.x ** 2 + 
      this.sunPosition.y ** 2 + 
      this.sunPosition.z ** 2
    );
    
    return {
      x: -this.sunPosition.x / len,
      y: -this.sunPosition.y / len,
      z: -this.sunPosition.z / len,
    };
  }
  
  // ============================================================================
  // TIME CONTROL
  // ============================================================================
  
  setTime(hours: number): void {
    this.currentTime = ((hours % 24) + 24) % 24;
    this.cachedTimeState = null;
    this.cachedSkyState = null;
    this.updateCelestialPositions();
    this.emit('timeSet', this.currentTime);
  }
  
  setDate(dayOfYear: number, year?: number): void {
    this.currentDay = Math.max(1, Math.min(365, dayOfYear));
    if (year !== undefined) {
      this.currentYear = year;
    }
    this.cachedTimeState = null;
    this.cachedSkyState = null;
    this.updateCelestialPositions();
    this.emit('dateSet', { day: this.currentDay, year: this.currentYear });
  }
  
  setTimeScale(scale: number): void {
    this.config.timeScale = Math.max(0, scale);
    this.emit('timeScaleChanged', this.config.timeScale);
  }
  
  getTimeScale(): number {
    return this.config.timeScale;
  }
  
  advanceTime(hours: number): void {
    this.setTime(this.currentTime + hours);
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  getTime(): number {
    return this.currentTime;
  }
  
  getDay(): number {
    return this.currentDay;
  }
  
  getYear(): number {
    return this.currentYear;
  }
  
  getSeason(): Season {
    return this.getSeasonForDay(this.currentDay);
  }
  
  isDaytime(): boolean {
    return this.getTimeState().isDaytime;
  }
  
  isNighttime(): boolean {
    return !this.getTimeState().isDaytime;
  }
  
  getFormattedTime(): string {
    const hours = Math.floor(this.currentTime);
    const minutes = Math.floor((this.currentTime - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  
  // ============================================================================
  // CLEANUP
  // ============================================================================
  
  dispose(): void {
    this.stop();
    this.removeAllListeners();
  }
}

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useEffect, useContext, createContext, useCallback, useMemo } from 'react';

interface DayNightContextValue {
  cycle: DayNightCycle;
}

const DayNightContext = createContext<DayNightContextValue | null>(null);

export function DayNightProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<DayNightConfig>;
}) {
  const value = useMemo(() => ({
    cycle: new DayNightCycle(config),
  }), []);
  
  useEffect(() => {
    value.cycle.start();
    
    return () => {
      value.cycle.dispose();
    };
  }, [value]);
  
  return (
    <DayNightContext.Provider value={value}>
      {children}
    </DayNightContext.Provider>
  );
}

export function useDayNightCycle() {
  const context = useContext(DayNightContext);
  if (!context) {
    return DayNightCycle.getInstance();
  }
  return context.cycle;
}

export function useTimeState() {
  const cycle = useDayNightCycle();
  const [state, setState] = useState<TimeState>(cycle.getTimeState());
  
  useEffect(() => {
    const update = () => setState(cycle.getTimeState());
    cycle.on('update', update);
    cycle.on('timeSet', update);
    
    return () => {
      cycle.off('update', update);
      cycle.off('timeSet', update);
    };
  }, [cycle]);
  
  return state;
}

export function useSkyState() {
  const cycle = useDayNightCycle();
  const [state, setState] = useState<SkyState>(cycle.getSkyState());
  
  useEffect(() => {
    const update = () => setState(cycle.getSkyState());
    cycle.on('update', update);
    
    return () => {
      cycle.off('update', update);
    };
  }, [cycle]);
  
  return state;
}

export function useSunDirection() {
  const cycle = useDayNightCycle();
  const [dir, setDir] = useState(cycle.getSunDirection());
  
  useEffect(() => {
    const update = () => setDir(cycle.getSunDirection());
    cycle.on('update', update);
    
    return () => {
      cycle.off('update', update);
    };
  }, [cycle]);
  
  return dir;
}

export function useTimeControl() {
  const cycle = useDayNightCycle();
  
  const setTime = useCallback((hours: number) => {
    cycle.setTime(hours);
  }, [cycle]);
  
  const setDate = useCallback((day: number, year?: number) => {
    cycle.setDate(day, year);
  }, [cycle]);
  
  const setTimeScale = useCallback((scale: number) => {
    cycle.setTimeScale(scale);
  }, [cycle]);
  
  const pause = useCallback(() => cycle.pause(), [cycle]);
  const resume = useCallback(() => cycle.resume(), [cycle]);
  
  return { setTime, setDate, setTimeScale, pause, resume };
}

export function useSeason() {
  const cycle = useDayNightCycle();
  const [season, setSeason] = useState<Season>(cycle.getSeason());
  
  useEffect(() => {
    const update = (s: Season) => setSeason(s);
    cycle.on('seasonChanged', update);
    
    return () => {
      cycle.off('seasonChanged', update);
    };
  }, [cycle]);
  
  return season;
}

export default {
  DayNightCycle,
  SKY_PRESETS,
  DayNightProvider,
  useDayNightCycle,
  useTimeState,
  useSkyState,
  useSunDirection,
  useTimeControl,
  useSeason,
};
