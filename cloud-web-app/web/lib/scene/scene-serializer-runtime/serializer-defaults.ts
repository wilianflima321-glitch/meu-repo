import type { PhysicsSettingsSerialized, SceneSettingsSerialized } from './types';

export function getDefaultSceneSettings(): SceneSettingsSerialized {
  return {
    name: 'Untitled Scene',
    renderer: {
      antialias: true,
      shadowMap: true,
      shadowMapType: 'pcfSoft',
      toneMapping: 'aces',
      toneMappingExposure: 1,
      outputColorSpace: 'srgb',
    },
  };
}

export function getDefaultPhysicsSettings(): PhysicsSettingsSerialized {
  return {
    enabled: true,
    gravity: { x: 0, y: -9.81, z: 0 },
    defaultFriction: 0.5,
    defaultRestitution: 0.3,
    solver: 'sequential',
    iterations: 10,
  };
}
