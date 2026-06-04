// @aethel-heavy-async-boundary Particle presets instantiate Three runtime values and must stay behind Studio/runtime imports.
import * as THREE from 'three';
import type { ParticleEmitterConfig } from './particle-system-real';

// ============================================================================
// PRESET EFFECTS
// ============================================================================

export const ParticlePresets = {
  fire: (): Partial<ParticleEmitterConfig> => ({
    maxParticles: 5000,
    emissionRate: 200,
    lifetime: { min: 0.5, max: 1.5 },
    startSize: { min: 20, max: 40 },
    endSize: { min: 5, max: 10 },
    startColor: new THREE.Color(1, 0.6, 0.1),
    endColor: new THREE.Color(1, 0.1, 0),
    startOpacity: 1,
    endOpacity: 0,
    velocity: {
      min: new THREE.Vector3(-0.5, 2, -0.5),
      max: new THREE.Vector3(0.5, 4, 0.5),
    },
    acceleration: new THREE.Vector3(0, 2, 0),
    blendMode: 'additive',
    shape: { type: 'circle', radius: 0.5 },
  }),

  smoke: (): Partial<ParticleEmitterConfig> => ({
    maxParticles: 3000,
    emissionRate: 50,
    lifetime: { min: 3, max: 5 },
    startSize: { min: 30, max: 50 },
    endSize: { min: 80, max: 120 },
    startColor: new THREE.Color(0.3, 0.3, 0.3),
    endColor: new THREE.Color(0.5, 0.5, 0.5),
    startOpacity: 0.8,
    endOpacity: 0,
    velocity: {
      min: new THREE.Vector3(-0.2, 0.5, -0.2),
      max: new THREE.Vector3(0.2, 1, 0.2),
    },
    acceleration: new THREE.Vector3(0, 0.2, 0),
    blendMode: 'normal',
    shape: { type: 'circle', radius: 0.3 },
  }),

  sparks: (): Partial<ParticleEmitterConfig> => ({
    maxParticles: 2000,
    emissionRate: 500,
    lifetime: { min: 0.2, max: 0.8 },
    startSize: { min: 3, max: 6 },
    endSize: { min: 1, max: 2 },
    startColor: new THREE.Color(1, 0.9, 0.5),
    endColor: new THREE.Color(1, 0.5, 0.1),
    startOpacity: 1,
    endOpacity: 0,
    velocity: {
      min: new THREE.Vector3(-5, 5, -5),
      max: new THREE.Vector3(5, 15, 5),
    },
    acceleration: new THREE.Vector3(0, -20, 0),
    blendMode: 'additive',
    shape: { type: 'point' },
  }),

  snow: (): Partial<ParticleEmitterConfig> => ({
    maxParticles: 10000,
    emissionRate: 100,
    lifetime: { min: 5, max: 10 },
    startSize: { min: 5, max: 15 },
    endSize: { min: 5, max: 15 },
    startColor: new THREE.Color(1, 1, 1),
    endColor: new THREE.Color(1, 1, 1),
    startOpacity: 0.8,
    endOpacity: 0.8,
    velocity: {
      min: new THREE.Vector3(-0.5, -1, -0.5),
      max: new THREE.Vector3(0.5, -2, 0.5),
    },
    acceleration: new THREE.Vector3(0, 0, 0),
    blendMode: 'normal',
    shape: { type: 'box', size: new THREE.Vector3(50, 0, 50) },
  }),

  rain: (): Partial<ParticleEmitterConfig> => ({
    maxParticles: 10000,
    emissionRate: 500,
    lifetime: { min: 0.5, max: 1 },
    startSize: { min: 2, max: 4 },
    endSize: { min: 2, max: 4 },
    startColor: new THREE.Color(0.7, 0.7, 1),
    endColor: new THREE.Color(0.7, 0.7, 1),
    startOpacity: 0.6,
    endOpacity: 0.3,
    velocity: {
      min: new THREE.Vector3(-0.1, -20, -0.1),
      max: new THREE.Vector3(0.1, -30, 0.1),
    },
    acceleration: new THREE.Vector3(0, -10, 0),
    blendMode: 'normal',
    shape: { type: 'box', size: new THREE.Vector3(50, 0, 50) },
  }),

  explosion: (): Partial<ParticleEmitterConfig> => ({
    maxParticles: 1000,
    emissionRate: 0, // Burst only
    lifetime: { min: 0.5, max: 2 },
    startSize: { min: 20, max: 50 },
    endSize: { min: 5, max: 10 },
    startColor: new THREE.Color(1, 0.8, 0.3),
    endColor: new THREE.Color(0.5, 0.1, 0),
    startOpacity: 1,
    endOpacity: 0,
    velocity: {
      min: new THREE.Vector3(-10, -10, -10),
      max: new THREE.Vector3(10, 10, 10),
    },
    acceleration: new THREE.Vector3(0, -5, 0),
    blendMode: 'additive',
    shape: { type: 'sphere', radius: 0.1 },
  }),

  magic: (): Partial<ParticleEmitterConfig> => ({
    maxParticles: 3000,
    emissionRate: 100,
    lifetime: { min: 1, max: 3 },
    startSize: { min: 10, max: 20 },
    endSize: { min: 2, max: 5 },
    startColor: new THREE.Color(0.5, 0.2, 1),
    endColor: new THREE.Color(0.2, 0.8, 1),
    startOpacity: 1,
    endOpacity: 0,
    velocity: {
      min: new THREE.Vector3(-1, 0, -1),
      max: new THREE.Vector3(1, 2, 1),
    },
    acceleration: new THREE.Vector3(0, 0.5, 0),
    angularVelocity: { min: -5, max: 5 },
    blendMode: 'additive',
    shape: { type: 'sphere', radius: 0.5 },
  }),

  confetti: (): Partial<ParticleEmitterConfig> => ({
    maxParticles: 5000,
    emissionRate: 200,
    lifetime: { min: 3, max: 5 },
    startSize: { min: 10, max: 20 },
    endSize: { min: 10, max: 20 },
    startColor: new THREE.Color(1, 0, 0),
    endColor: new THREE.Color(0, 1, 0),
    startOpacity: 1,
    endOpacity: 0.5,
    velocity: {
      min: new THREE.Vector3(-5, 10, -5),
      max: new THREE.Vector3(5, 20, 5),
    },
    acceleration: new THREE.Vector3(0, -5, 0),
    angularVelocity: { min: -10, max: 10 },
    blendMode: 'normal',
    shape: { type: 'cone', angle: 30, radius: 0.5, height: 1 },
  }),
};
