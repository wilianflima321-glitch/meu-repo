import * as THREE from 'three';
import type { EmitterConfig } from './NiagaraVFX.types';

/**
 * Preset factories consumed by `EffectPresetsPanel` (NiagaraVFXPanels.runtime.tsx).
 * Extracted from NiagaraVFX.runtime.tsx to keep that component under the
 * ≤500 LoC component guideline — pure data, no React/graph logic.
 *
 * Every preset id offered by EffectPresetsPanel MUST have a matching entry here;
 * missing entries silently fell back to a renamed "Default Emitter" with no user
 * feedback (DEBT-NIAGARA-004, fixed 2026-08-08).
 */
export const NIAGARA_PRESET_FACTORIES: Record<string, (base: EmitterConfig) => EmitterConfig> = {
  fire: (base) => ({
    ...base,
    name: 'Fire Effect',
    spawnRate: 100,
    lifetime: { min: 0.5, max: 1.5 },
    initialVelocity: {
      min: new THREE.Vector3(-0.5, 3, -0.5),
      max: new THREE.Vector3(0.5, 6, 0.5),
    },
    initialSize: { min: 0.2, max: 0.5 },
    gravity: new THREE.Vector3(0, -0.5, 0),
    colorOverLife: [
      { time: 0, color: new THREE.Color(1, 1, 0.5), alpha: 1 },
      { time: 0.3, color: new THREE.Color(1, 0.6, 0), alpha: 1 },
      { time: 0.7, color: new THREE.Color(1, 0.2, 0), alpha: 0.6 },
      { time: 1, color: new THREE.Color(0.2, 0, 0), alpha: 0 },
    ],
  }),
  smoke: (base) => ({
    ...base,
    name: 'Smoke Effect',
    spawnRate: 30,
    lifetime: { min: 2, max: 4 },
    initialVelocity: {
      min: new THREE.Vector3(-0.5, 1, -0.5),
      max: new THREE.Vector3(0.5, 2, 0.5),
    },
    initialSize: { min: 0.3, max: 0.6 },
    sizeOverLife: [
      { time: 0, size: 0.3 },
      { time: 1, size: 1.5 },
    ],
    gravity: new THREE.Vector3(0, 0.5, 0),
    drag: 0.3,
    colorOverLife: [
      { time: 0, color: new THREE.Color(0.3, 0.3, 0.3), alpha: 0.8 },
      { time: 1, color: new THREE.Color(0.5, 0.5, 0.5), alpha: 0 },
    ],
    turbulence: { strength: 1, frequency: 0.5 },
  }),
  sparks: (base) => ({
    ...base,
    name: 'Sparks Effect',
    spawnRate: 200,
    spawnBurst: [{ time: 0, count: 50 }],
    lifetime: { min: 0.3, max: 0.8 },
    initialVelocity: {
      min: new THREE.Vector3(-5, 3, -5),
      max: new THREE.Vector3(5, 8, 5),
    },
    initialSize: { min: 0.05, max: 0.15 },
    gravity: new THREE.Vector3(0, -15, 0),
    drag: 0.05,
    colorOverLife: [
      { time: 0, color: new THREE.Color(1, 1, 0.8), alpha: 1 },
      { time: 0.5, color: new THREE.Color(1, 0.5, 0), alpha: 1 },
      { time: 1, color: new THREE.Color(1, 0, 0), alpha: 0 },
    ],
  }),
  explosion: (base) => ({
    ...base,
    name: 'Explosion Effect',
    spawnRate: 0,
    spawnBurst: [{ time: 0, count: 200 }],
    lifetime: { min: 0.5, max: 1.5 },
    spawnShape: 'sphere',
    spawnShapeParams: { radius: 0.1 },
    initialVelocity: {
      min: new THREE.Vector3(-10, -10, -10),
      max: new THREE.Vector3(10, 10, 10),
    },
    initialSize: { min: 0.2, max: 0.8 },
    gravity: new THREE.Vector3(0, -5, 0),
    drag: 0.2,
    colorOverLife: [
      { time: 0, color: new THREE.Color(1, 1, 1), alpha: 1 },
      { time: 0.1, color: new THREE.Color(1, 0.8, 0), alpha: 1 },
      { time: 0.4, color: new THREE.Color(1, 0.3, 0), alpha: 0.8 },
      { time: 1, color: new THREE.Color(0.2, 0, 0), alpha: 0 },
    ],
  }),
  rain: (base) => ({
    ...base,
    name: 'Rain Effect',
    spawnRate: 300,
    spawnShape: 'box',
    spawnShapeParams: { width: 10, height: 0, depth: 10 },
    lifetime: { min: 0.6, max: 1 },
    initialVelocity: {
      min: new THREE.Vector3(-0.1, -14, -0.1),
      max: new THREE.Vector3(0.1, -18, 0.1),
    },
    initialSize: { min: 0.02, max: 0.05 },
    gravity: new THREE.Vector3(0, -2, 0),
    drag: 0.02,
    colorOverLife: [
      { time: 0, color: new THREE.Color(0.6, 0.75, 0.9), alpha: 0.6 },
      { time: 1, color: new THREE.Color(0.6, 0.75, 0.9), alpha: 0.2 },
    ],
  }),
  dust: (base) => ({
    ...base,
    name: 'Dust Effect',
    spawnRate: 15,
    spawnShape: 'sphere',
    spawnShapeParams: { radius: 2 },
    lifetime: { min: 3, max: 6 },
    initialVelocity: {
      min: new THREE.Vector3(-0.1, 0, -0.1),
      max: new THREE.Vector3(0.1, 0.15, 0.1),
    },
    initialSize: { min: 0.02, max: 0.08 },
    gravity: new THREE.Vector3(0, 0.02, 0),
    drag: 0.5,
    turbulence: { strength: 0.4, frequency: 0.2 },
    colorOverLife: [
      { time: 0, color: new THREE.Color(0.55, 0.48, 0.38), alpha: 0.35 },
      { time: 1, color: new THREE.Color(0.55, 0.48, 0.38), alpha: 0 },
    ],
  }),
  blood: (base) => ({
    ...base,
    name: 'Blood Effect',
    spawnRate: 0,
    spawnBurst: [{ time: 0, count: 40 }],
    lifetime: { min: 0.4, max: 0.9 },
    spawnShape: 'sphere',
    spawnShapeParams: { radius: 0.05 },
    initialVelocity: {
      min: new THREE.Vector3(-3, 1, -3),
      max: new THREE.Vector3(3, 5, 3),
    },
    initialSize: { min: 0.05, max: 0.15 },
    gravity: new THREE.Vector3(0, -9, 0),
    drag: 0.15,
    colorOverLife: [
      { time: 0, color: new THREE.Color(0.6, 0, 0), alpha: 1 },
      { time: 0.6, color: new THREE.Color(0.4, 0, 0), alpha: 1 },
      { time: 1, color: new THREE.Color(0.2, 0, 0), alpha: 0 },
    ],
  }),
  water: (base) => ({
    ...base,
    name: 'Water Splash Effect',
    spawnRate: 0,
    spawnBurst: [{ time: 0, count: 60 }],
    lifetime: { min: 0.5, max: 1.1 },
    spawnShape: 'sphere',
    spawnShapeParams: { radius: 0.1 },
    initialVelocity: {
      min: new THREE.Vector3(-2, 2, -2),
      max: new THREE.Vector3(2, 6, 2),
    },
    initialSize: { min: 0.05, max: 0.12 },
    gravity: new THREE.Vector3(0, -12, 0),
    drag: 0.1,
    colorOverLife: [
      { time: 0, color: new THREE.Color(0.4, 0.7, 1), alpha: 0.9 },
      { time: 1, color: new THREE.Color(0.4, 0.7, 1), alpha: 0 },
    ],
  }),
  electricity: (base) => ({
    ...base,
    name: 'Electricity Effect',
    spawnRate: 150,
    lifetime: { min: 0.08, max: 0.2 },
    spawnShape: 'sphere',
    spawnShapeParams: { radius: 0.3 },
    initialVelocity: {
      min: new THREE.Vector3(-1, -1, -1),
      max: new THREE.Vector3(1, 1, 1),
    },
    initialSize: { min: 0.03, max: 0.08 },
    gravity: new THREE.Vector3(0, 0, 0),
    drag: 0,
    turbulence: { strength: 4, frequency: 8 },
    colorOverLife: [
      { time: 0, color: new THREE.Color(0.7, 0.9, 1), alpha: 1 },
      { time: 0.5, color: new THREE.Color(0.5, 0.7, 1), alpha: 1 },
      { time: 1, color: new THREE.Color(0.3, 0.5, 1), alpha: 0 },
    ],
  }),
  leaves: (base) => ({
    ...base,
    name: 'Falling Leaves Effect',
    spawnRate: 8,
    spawnShape: 'box',
    spawnShapeParams: { width: 8, height: 0, depth: 8 },
    lifetime: { min: 4, max: 7 },
    initialVelocity: {
      min: new THREE.Vector3(-0.4, -0.6, -0.4),
      max: new THREE.Vector3(0.4, -0.3, 0.4),
    },
    initialSize: { min: 0.1, max: 0.2 },
    gravity: new THREE.Vector3(0, -0.3, 0),
    drag: 0.4,
    turbulence: { strength: 0.6, frequency: 0.4 },
    colorOverLife: [
      { time: 0, color: new THREE.Color(0.65, 0.45, 0.15), alpha: 0.9 },
      { time: 1, color: new THREE.Color(0.45, 0.3, 0.1), alpha: 0 },
    ],
  }),
  snow: (base) => ({
    ...base,
    name: 'Snow Effect',
    spawnRate: 50,
    spawnShape: 'box',
    spawnShapeParams: { width: 10, height: 0, depth: 10 },
    lifetime: { min: 4, max: 6 },
    initialVelocity: {
      min: new THREE.Vector3(-0.2, -1, -0.2),
      max: new THREE.Vector3(0.2, -0.5, 0.2),
    },
    initialSize: { min: 0.05, max: 0.15 },
    gravity: new THREE.Vector3(0, -0.5, 0),
    turbulence: { strength: 0.3, frequency: 0.3 },
    colorOverLife: [
      { time: 0, color: new THREE.Color(1, 1, 1), alpha: 0.8 },
      { time: 1, color: new THREE.Color(1, 1, 1), alpha: 0 },
    ],
  }),
  magic: (base) => ({
    ...base,
    name: 'Magic Effect',
    spawnRate: 60,
    spawnShape: 'sphere',
    spawnShapeParams: { radius: 1 },
    lifetime: { min: 1, max: 2 },
    initialVelocity: {
      min: new THREE.Vector3(-0.5, 0.5, -0.5),
      max: new THREE.Vector3(0.5, 1.5, 0.5),
    },
    initialSize: { min: 0.1, max: 0.25 },
    sizeOverLife: [
      { time: 0, size: 0 },
      { time: 0.2, size: 0.25 },
      { time: 0.8, size: 0.15 },
      { time: 1, size: 0 },
    ],
    gravity: new THREE.Vector3(0, 0, 0),
    turbulence: { strength: 0.8, frequency: 2 },
    colorOverLife: [
      { time: 0, color: new THREE.Color(0.5, 0, 1), alpha: 1 },
      { time: 0.3, color: new THREE.Color(0, 0.5, 1), alpha: 1 },
      { time: 0.6, color: new THREE.Color(1, 0, 1), alpha: 1 },
      { time: 1, color: new THREE.Color(0, 1, 1), alpha: 0 },
    ],
  }),
};
