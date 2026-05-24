import * as THREE from 'three';
import type { PBRMaterialParams } from './pbr-shader-pipeline';

// @aethel-heavy-async-boundary Material presets allocate THREE.Color and are only loaded by the PBR runtime.
export const MaterialPresets = {
  gold: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(1.0, 0.766, 0.336),
    metallic: 1.0,
    roughness: 0.3,
  }),
  silver: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.972, 0.960, 0.915),
    metallic: 1.0,
    roughness: 0.2,
  }),
  copper: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.955, 0.637, 0.538),
    metallic: 1.0,
    roughness: 0.4,
  }),
  iron: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.560, 0.570, 0.580),
    metallic: 1.0,
    roughness: 0.5,
  }),
  plastic: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.2, 0.2, 0.8),
    metallic: 0.0,
    roughness: 0.3,
  }),
  rubber: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.1, 0.1, 0.1),
    metallic: 0.0,
    roughness: 0.9,
  }),
  wood: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.5, 0.35, 0.2),
    metallic: 0.0,
    roughness: 0.7,
  }),
  marble: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.95, 0.95, 0.95),
    metallic: 0.0,
    roughness: 0.2,
  }),
  glass: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.95, 0.95, 1.0),
    metallic: 0.0,
    roughness: 0.05,
    transparent: true,
    opacity: 0.3,
  }),
  emissive: (): Partial<PBRMaterialParams> => ({
    albedo: new THREE.Color(0.0, 0.0, 0.0),
    metallic: 0.0,
    roughness: 0.5,
    emissiveColor: new THREE.Color(1.0, 0.5, 0.0),
    emissiveIntensity: 2.0,
  }),
};
