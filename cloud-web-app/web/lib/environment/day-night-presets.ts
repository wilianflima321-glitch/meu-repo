/**
 * Sky color presets for the day/night cycle runtime.
 */

import type { TimeOfDay } from './day-night-cycle';

// ============================================================================
// COLOR PRESETS
// ============================================================================

export interface SkyColorPreset {
  zenith: { r: number; g: number; b: number };
  horizon: { r: number; g: number; b: number };
  ground: { r: number; g: number; b: number };
  sun: { r: number; g: number; b: number };
  sunIntensity: number;
  fog: { r: number; g: number; b: number };
  ambient: number;
  shadow: number;
}

export const SKY_PRESETS: Record<TimeOfDay, SkyColorPreset> = {
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
