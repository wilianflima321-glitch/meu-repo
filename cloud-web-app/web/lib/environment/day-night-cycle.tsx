/** Day/night runtime controller for creative preview and Studio environments. */

import { EventEmitter } from 'events';
import {
  getDayMonth,
  getMoonIllumination,
  getMoonPhase,
  getMoonPhaseOffset,
  getNextTimeOfDay,
  getSeasonForDay,
  getSolarDeclination,
  getTimeOfDay,
  getTimeOfDayBlend,
  lerp,
  lerpColor,
} from './day-night-calculations';
import type { CelestialBody, DayNightConfig, SkyState, TimeState } from './day-night-contracts';
import { SKY_PRESETS } from './day-night-presets';
import {
  DayNightProvider,
  useDayNightCycle,
  useSeason,
  useSkyState,
  useSunDirection,
  useTimeControl,
  useTimeState,
} from './day-night-react';

export type { CelestialBody, DayNightConfig, MoonPhase, Season, SkyState, TimeOfDay, TimeState } from './day-night-contracts';
export { SKY_PRESETS } from './day-night-presets';
export type { SkyColorPreset } from './day-night-presets';

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
    const oldSeason = getSeasonForDay(this.currentDay - 1, this.config.enableSeasons);
    const newSeason = getSeasonForDay(this.currentDay, this.config.enableSeasons);
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

  private updateCelestialPositions(): void {
    const lat = this.config.latitude * Math.PI / 180;
    const declination = getSolarDeclination(this.currentDay);
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
    const moonOffset = getMoonPhaseOffset(this.currentDay, this.currentYear) * Math.PI;
    const moonAltitude = altitude - Math.PI + moonOffset * 0.3;
    const moonAzimuth = azimuth + Math.PI + moonOffset;

    this.moonPosition = {
      x: Math.cos(moonAltitude) * Math.sin(moonAzimuth),
      y: Math.sin(moonAltitude),
      z: Math.cos(moonAltitude) * Math.cos(moonAzimuth),
    };
  }

  getTimeState(): TimeState {
    if (this.cachedTimeState) return this.cachedTimeState;

    const timeOfDay = getTimeOfDay(this.currentTime);
    const sunAlt = Math.asin(this.sunPosition.y) * 180 / Math.PI;
    const sunAz = Math.atan2(this.sunPosition.x, this.sunPosition.z) * 180 / Math.PI;
    const moonAlt = Math.asin(this.moonPosition.y) * 180 / Math.PI;
    const moonAz = Math.atan2(this.moonPosition.x, this.moonPosition.z) * 180 / Math.PI;

    const moonPhaseOffset = getMoonPhaseOffset(this.currentDay, this.currentYear);

    this.cachedTimeState = {
      time: this.currentTime,
      normalized: this.currentTime / 24,
      timeOfDay,
      dayOfYear: this.currentDay,
      month: getDayMonth(this.currentDay)[0],
      dayOfMonth: getDayMonth(this.currentDay)[1],
      year: this.currentYear,
      season: getSeasonForDay(this.currentDay, this.config.enableSeasons),
      isDaytime: sunAlt > -6, // Civil twilight
      sunAltitude: sunAlt,
      sunAzimuth: ((sunAz + 360) % 360),
      moonAltitude: moonAlt,
      moonAzimuth: ((moonAz + 360) % 360),
      moonPhase: getMoonPhase(moonPhaseOffset, this.config.enableMoonPhases),
      moonIllumination: getMoonIllumination(moonPhaseOffset),
    };

    return this.cachedTimeState;
  }

  getSkyState(): SkyState {
    if (this.cachedSkyState) return this.cachedSkyState;

    const timeOfDay = getTimeOfDay(this.currentTime);
    const nextTimeOfDay = getNextTimeOfDay(timeOfDay);

    const preset = SKY_PRESETS[timeOfDay];
    const nextPreset = SKY_PRESETS[nextTimeOfDay];

    // Calculate blend factor
    const blendFactor = getTimeOfDayBlend(timeOfDay, this.currentTime);

    // Interpolate colors
    const zenith = lerpColor(preset.zenith, nextPreset.zenith, blendFactor);
    const horizon = lerpColor(preset.horizon, nextPreset.horizon, blendFactor);
    const ground = lerpColor(preset.ground, nextPreset.ground, blendFactor);
    const sun = lerpColor(preset.sun, nextPreset.sun, blendFactor);
    const fog = lerpColor(preset.fog, nextPreset.fog, blendFactor);

    const sunIntensity = lerp(preset.sunIntensity, nextPreset.sunIntensity, blendFactor);
    const ambient = lerp(preset.ambient, nextPreset.ambient, blendFactor);
    const shadow = lerp(preset.shadow, nextPreset.shadow, blendFactor);

    // Calculate star visibility
    const timeState = this.getTimeState();
    const starVisibility = timeState.isDaytime ? 0 : Math.max(0, 1 - (timeState.sunAltitude + 12) / 12);

    // Moon lighting
    const moonIllum = this.getMoonIllumination(getMoonPhaseOffset(this.currentDay, this.currentYear));
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
      cloudTint: lerpColor(sun, { r: 1, g: 1, b: 1 }, 0.5),
    };

    return this.cachedSkyState;
  }


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
    return getSeasonForDay(this.currentDay, this.config.enableSeasons);
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

  dispose(): void {
    this.stop();
    this.removeAllListeners();
  }
}

export {
  DayNightProvider,
  useDayNightCycle,
  useSeason,
  useSkyState,
  useSunDirection,
  useTimeControl,
  useTimeState,
} from './day-night-react';

const __defaultExport = {
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

export default __defaultExport;
