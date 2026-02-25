/**
 * Water/Ocean shared contracts.
 */

import * as THREE from 'three';

export interface OceanConfig {
  size: number;
  resolution: number;
  windSpeed: number;
  windDirection: THREE.Vector2;
  choppiness: number;
  waveHeight: number;
  waveLength: number;
  deepColor: THREE.Color;
  shallowColor: THREE.Color;
  foamColor: THREE.Color;
  foamThreshold: number;
  foamIntensity: number;
  reflectivity: number;
  refractionStrength: number;
  causticIntensity: number;
  subsurfaceScattering: number;
}

export interface WaveParams {
  amplitude: number;
  wavelength: number;
  speed: number;
  steepness: number;
  direction: THREE.Vector2;
}

export interface BuoyancyConfig {
  waterDensity: number;
  dragCoefficient: number;
  angularDrag: number;
  samplePoints: THREE.Vector3[];
}
