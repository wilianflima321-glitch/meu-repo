// @aethel-heavy-async-boundary Studio/viewport camera defaults; keep behind runtime-only imports.
import * as THREE from 'three';

import type { CameraConfig, FollowSettings, OrbitSettings } from './camera-system.contracts';

export function createDefaultCameraConfig(config: Partial<CameraConfig> = {}): CameraConfig {
  const aspect = typeof window === 'undefined' ? 16 / 9 : window.innerWidth / window.innerHeight;

  return {
    fov: 60,
    near: 0.1,
    far: 1000,
    aspect,
    ...config,
  };
}

export function createDefaultFollowSettings(): FollowSettings {
  return {
    target: null,
    offset: new THREE.Vector3(0, 5, 10),
    lookAtOffset: new THREE.Vector3(0, 1, 0),
    smoothing: 0.1,
    lookAhead: 0,
  };
}

export function createDefaultOrbitSettings(): OrbitSettings {
  return {
    target: new THREE.Vector3(0, 0, 0),
    distance: 10,
    minDistance: 2,
    maxDistance: 50,
    azimuthAngle: 0,
    polarAngle: Math.PI / 4,
    minPolarAngle: 0.1,
    maxPolarAngle: Math.PI - 0.1,
    rotationSpeed: 0.005,
    zoomSpeed: 0.1,
    enableDamping: true,
    dampingFactor: 0.05,
  };
}
