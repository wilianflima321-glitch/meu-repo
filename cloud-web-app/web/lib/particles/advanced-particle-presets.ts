// @aethel-heavy-async-boundary Advanced particle simulation is a Studio/runtime module, not a public shell dependency.
/**
 * Preset particle effect settings for common runtime effects.
 */

import type { ParticleSystemSettings } from './advanced-particle-system-types';

type Vec3Like = { x: number; y: number; z: number };

export function createFireParticleSettings(position: Vec3Like): ParticleSystemSettings {
  return {
      id: `fire_${Date.now()}`,
      name: 'Fire',
      duration: 2,
      looping: true,
      prewarm: true,
      maxParticles: 500,
      emitter: {
        shape: 'cone',
        position,
        rotation: { x: 0, y: 0, z: 0 },
        coneAngle: 15,
        coneRadius: 0.5,
        rate: 100,
        simulationSpace: 'world',
      },
      particle: {
        lifetime: { min: 0.5, max: 1.5 },
        startSpeed: { min: 2, max: 4 },
        startSize: { min: 0.3, max: 0.6 },
        startRotation: { min: 0, max: 360 },
        startColor: [{ time: 0, color: { r: 1, g: 0.8, b: 0.3, a: 1 } }],
        colorOverLifetime: [
          { time: 0, color: { r: 1, g: 0.9, b: 0.3, a: 1 } },
          { time: 0.3, color: { r: 1, g: 0.5, b: 0.1, a: 0.8 } },
          { time: 0.7, color: { r: 0.5, g: 0.1, b: 0.05, a: 0.5 } },
          { time: 1, color: { r: 0.1, g: 0.1, b: 0.1, a: 0 } },
        ],
        sizeOverLifetime: [
          { time: 0, value: 0.5 },
          { time: 0.3, value: 1 },
          { time: 1, value: 0.2 },
        ],
        inheritVelocity: 0,
        velocityRandomness: { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 0, z: 0.5 } },
        blendMode: 'additive',
        renderOrder: 10,
        billboard: true,
        stretchedBillboard: false,
        stretchFactor: 0,
        sortByDistance: true,
      },
      modifiers: {
        gravity: { x: 0, y: 0.5, z: 0 },
        drag: 0.1,
        turbulenceStrength: 2,
        turbulenceFrequency: 2,
        turbulenceScrollSpeed: 1,
      },
      collision: { enabled: false, bounce: 0, dampen: 0, lifetime: 1, world: false },
      subEmitters: [],
    };
}

export function createSmokeParticleSettings(position: Vec3Like): ParticleSystemSettings {
  return {
      id: `smoke_${Date.now()}`,
      name: 'Smoke',
      duration: 3,
      looping: true,
      prewarm: true,
      maxParticles: 200,
      emitter: {
        shape: 'cone',
        position,
        rotation: { x: 0, y: 0, z: 0 },
        coneAngle: 20,
        coneRadius: 0.3,
        rate: 30,
        simulationSpace: 'world',
      },
      particle: {
        lifetime: { min: 2, max: 4 },
        startSpeed: { min: 0.5, max: 1 },
        startSize: { min: 0.5, max: 1 },
        startRotation: { min: 0, max: 360 },
        startColor: [{ time: 0, color: { r: 0.3, g: 0.3, b: 0.3, a: 0.5 } }],
        colorOverLifetime: [
          { time: 0, color: { r: 0.4, g: 0.4, b: 0.4, a: 0.4 } },
          { time: 0.5, color: { r: 0.5, g: 0.5, b: 0.5, a: 0.2 } },
          { time: 1, color: { r: 0.6, g: 0.6, b: 0.6, a: 0 } },
        ],
        sizeOverLifetime: [
          { time: 0, value: 0.5 },
          { time: 1, value: 3 },
        ],
        rotationOverLifetime: 20,
        inheritVelocity: 0,
        velocityRandomness: { min: { x: -0.2, y: 0, z: -0.2 }, max: { x: 0.2, y: 0, z: 0.2 } },
        blendMode: 'normal',
        renderOrder: 5,
        billboard: true,
        stretchedBillboard: false,
        stretchFactor: 0,
        sortByDistance: true,
      },
      modifiers: {
        gravity: { x: 0, y: 0.2, z: 0 },
        drag: 0.2,
        turbulenceStrength: 1,
        turbulenceFrequency: 0.5,
        turbulenceScrollSpeed: 0.5,
      },
      collision: { enabled: false, bounce: 0, dampen: 0, lifetime: 1, world: false },
      subEmitters: [],
    };
}

export function createSparkParticleSettings(position: Vec3Like): ParticleSystemSettings {
  return {
      id: `spark_${Date.now()}`,
      name: 'Sparks',
      duration: 0.5,
      looping: false,
      prewarm: false,
      maxParticles: 100,
      emitter: {
        shape: 'point',
        position,
        rotation: { x: 0, y: 0, z: 0 },
        rate: 0,
        bursts: [{ time: 0, count: 50, probability: 1 }],
        simulationSpace: 'world',
      },
      particle: {
        lifetime: { min: 0.3, max: 0.8 },
        startSpeed: { min: 5, max: 10 },
        startSize: { min: 0.05, max: 0.15 },
        startRotation: { min: 0, max: 0 },
        startColor: [
          { time: 0, color: { r: 1, g: 1, b: 0.5, a: 1 } },
          { time: 0, color: { r: 1, g: 0.8, b: 0.3, a: 1 } },
        ],
        colorOverLifetime: [
          { time: 0, color: { r: 1, g: 1, b: 0.8, a: 1 } },
          { time: 0.5, color: { r: 1, g: 0.5, b: 0.2, a: 1 } },
          { time: 1, color: { r: 0.5, g: 0.1, b: 0.05, a: 0 } },
        ],
        inheritVelocity: 0,
        velocityRandomness: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
        blendMode: 'additive',
        renderOrder: 15,
        billboard: true,
        stretchedBillboard: true,
        stretchFactor: 0.5,
        sortByDistance: false,
      },
      modifiers: {
        gravity: { x: 0, y: -10, z: 0 },
        drag: 0.5,
        turbulenceStrength: 0,
        turbulenceFrequency: 0,
        turbulenceScrollSpeed: 0,
      },
      collision: { enabled: true, bounce: 0.3, dampen: 0.5, lifetime: 0.5, world: true },
      subEmitters: [],
    };
}
