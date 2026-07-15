import type * as THREE from 'three';

export type LightType =
  | 'directional'
  | 'point'
  | 'spot'
  | 'area'
  | 'hemisphere'
  | 'ambient'
  | 'probe'
  | 'ies';

export type AreaLightShape = 'rectangle' | 'disk' | 'sphere' | 'tube';

export interface AdvancedLightConfig {
  type: LightType;
  color: THREE.Color;
  intensity: number;
  temperature?: number; // Kelvin (3000-10000)

  // Shadows
  castShadow: boolean;
  shadowBias: number;
  shadowNormalBias: number;
  shadowRadius: number;
  shadowMapSize: number;
  shadowCascades?: number;

  // Area light specific
  shape?: AreaLightShape;
  width?: number;
  height?: number;
  radius?: number;

  // IES profile
  iesProfile?: string;
  iesTexture?: THREE.Texture;

  // Gobo/cookie
  goboTexture?: THREE.Texture;
  goboIntensity?: number;

  // Volumetric
  volumetric: boolean;
  volumetricIntensity: number;
  volumetricSamples: number;

  // Attenuation
  range: number;
  decay: number;

  // Spot light specific
  angle?: number;
  penumbra?: number;

  // Light linking
  affectedObjects?: string[]; // Object IDs
  excludedObjects?: string[];

  // Animation
  animated: boolean;
  animationCurve?: unknown;
}
