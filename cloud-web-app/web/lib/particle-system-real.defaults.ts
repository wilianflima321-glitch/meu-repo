import THREE from './particle-system-real-runtime';
import type { ParticleEmitterConfig } from './particle-system-real.types';

export function createDefaultParticleEmitterConfig(
  config: Partial<ParticleEmitterConfig> = {},
): ParticleEmitterConfig {
  return {
    maxParticles: 10000,
    emissionRate: 100,
    lifetime: { min: 1, max: 3 },
    startSize: { min: 10, max: 20 },
    endSize: { min: 5, max: 10 },
    startColor: new THREE.Color(1, 1, 1),
    endColor: new THREE.Color(1, 1, 1),
    startOpacity: 1,
    endOpacity: 0,
    velocity: {
      min: new THREE.Vector3(-1, 2, -1),
      max: new THREE.Vector3(1, 5, 1),
    },
    acceleration: new THREE.Vector3(0, -9.8, 0),
    angularVelocity: { min: -1, max: 1 },
    blendMode: 'additive',
    shape: { type: 'point' },
    worldSpace: true,
    ...config,
  };
}
