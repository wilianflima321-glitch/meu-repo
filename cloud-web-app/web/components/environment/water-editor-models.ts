// ============================================================================
// TYPES
// ============================================================================

export type WaterType = 'ocean' | 'lake' | 'river' | 'pond' | 'pool';

export interface WaveParams {
  amplitude: number;
  frequency: number;
  speed: number;
  steepness: number;
  direction: number;
}

export interface WaterParams {
  type: WaterType;

  // Appearance
  shallowColor: string;
  deepColor: string;
  colorDepthFade: number;
  transparency: number;

  // Waves
  waves: WaveParams[];
  waveScale: number;

  // Foam
  foamEnabled: boolean;
  foamColor: string;
  foamIntensity: number;
  foamScale: number;
  shorelineFoam: number;

  // Caustics
  causticsEnabled: boolean;
  causticsIntensity: number;
  causticsScale: number;
  causticsVelocidade: number;

  // Refracao
  refractionEnabled: boolean;
  refractionStrength: number;

  // Reflexao
  reflectionEnabled: boolean;
  reflectionIntensity: number;

  // Flow (for rivers)
  flowEnabled: boolean;
  flowVelocidade: number;
  flowDirecao: number;

  // Underwater
  underwaterFogColor: string;
  underwaterFogDensity: number;

  // Buoyancy
  buoyancyEnabled: boolean;
  buoyancyStrength: number;
  waterDensity: number;

  /**
   * Letter cm — opt-in FFT ocean surface (lib/ocean). Default false → Gerstner Zero-UI.
   * When true, WaterSurface displaces from CapScore FFT height field.
   */
  fftOceanEnabled: boolean;
  /** Law XV CapScore for FFT resolution degrade (cm). */
  capabilityScore: number;
}

export interface WaterPreset {
  id: string;
  name: string;
  type: WaterType;
  params: Partial<WaterParams>;
}

// ============================================================================
// PRESETS
// ============================================================================

export const WATER_PRESETS: WaterPreset[] = [
  {
    id: 'ocean_tropical',
    name: 'Tropical Ocean',
    type: 'ocean',
    params: {
      shallowColor: 'var(--aethel-info-light)',
      deepColor: 'var(--aethel-info-dark)',
      transparency: 0.8,
      waveScale: 1.5,
      foamIntensity: 0.6,
      causticsEnabled: true,
    },
  },
  {
    id: 'ocean_stormy',
    name: 'Stormy Ocean',
    type: 'ocean',
    params: {
      shallowColor: 'var(--aethel-text-tertiary)',
      deepColor: 'var(--aethel-surface-tertiary)',
      transparency: 0.5,
      waveScale: 3.0,
      foamIntensity: 1.0,
      causticsEnabled: false,
    },
  },
  {
    id: 'lake_calm',
    name: 'Calm Lake',
    type: 'lake',
    params: {
      shallowColor: 'var(--aethel-info)',
      deepColor: 'var(--aethel-surface-quaternary)',
      transparency: 0.7,
      waveScale: 0.3,
      foamIntensity: 0.1,
      causticsEnabled: true,
      reflectionIntensity: 0.9,
    },
  },
  {
    id: 'river_clear',
    name: 'Clear River',
    type: 'river',
    params: {
      shallowColor: 'var(--aethel-info-light)',
      deepColor: 'var(--aethel-accent)',
      transparency: 0.85,
      waveScale: 0.5,
      flowEnabled: true,
      flowVelocidade: 2.0,
      foamIntensity: 0.4,
    },
  },
  {
    id: 'pond_murky',
    name: 'Murky Pond',
    type: 'pond',
    params: {
      shallowColor: 'var(--aethel-success-dark)',
      deepColor: 'var(--aethel-success-dark)',
      transparency: 0.4,
      waveScale: 0.1,
      foamEnabled: false,
      causticsEnabled: false,
    },
  },
  {
    id: 'pool_crystal',
    name: 'Crystal Pool',
    type: 'pool',
    params: {
      shallowColor: 'var(--aethel-info-light)',
      deepColor: 'var(--aethel-primary-dark)',
      transparency: 0.95,
      waveScale: 0.2,
      causticsEnabled: true,
      causticsIntensity: 0.8,
      reflectionIntensity: 0.7,
    },
  },
];

export const DEFAULT_PARAMS: WaterParams = {
  type: 'ocean',
  shallowColor: 'var(--aethel-info-light)',
  deepColor: 'var(--aethel-info-dark)',
  colorDepthFade: 10,
  transparency: 0.75,
  waves: [
    { amplitude: 0.5, frequency: 0.5, speed: 1.0, steepness: 0.5, direction: 0 },
    { amplitude: 0.25, frequency: 1.0, speed: 1.5, steepness: 0.3, direction: 45 },
    { amplitude: 0.1, frequency: 2.0, speed: 2.0, steepness: 0.2, direction: -30 },
  ],
  waveScale: 1.0,
  foamEnabled: true,
  foamColor: 'var(--aethel-text-primary)',
  foamIntensity: 0.5,
  foamScale: 1.0,
  shorelineFoam: 0.5,
  causticsEnabled: true,
  causticsIntensity: 0.5,
  causticsScale: 1.0,
  causticsVelocidade: 1.0,
  refractionEnabled: true,
  refractionStrength: 0.3,
  reflectionEnabled: true,
  reflectionIntensity: 0.5,
  flowEnabled: false,
  flowVelocidade: 1.0,
  flowDirecao: 0,
  underwaterFogColor: 'var(--aethel-info-dark)',
  underwaterFogDensity: 0.1,
  buoyancyEnabled: true,
  buoyancyStrength: 1.0,
  waterDensity: 1000,
  fftOceanEnabled: false,
  capabilityScore: 38,
};

