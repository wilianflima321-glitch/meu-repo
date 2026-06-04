/** @aethel-heavy-async-boundary Studio/render-gated lighting defaults; imports Three color values. */
import * as THREE from 'three';
import type { AdvancedLightConfig } from './cinematic-lighting.types';

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
