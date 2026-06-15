import type * as ThreeTypes from 'three';
import type { AdvancedPBRParams } from './aaa-material-system.contracts';

export function createMaterialPresetMap(three: typeof ThreeTypes): Map<string, Partial<AdvancedPBRParams>> {
  return new Map<string, Partial<AdvancedPBRParams>>([
    ['metal/iron', { albedo: new three.Color(0.56, 0.57, 0.58), metallic: 1.0, roughness: 0.5 }],
    ['metal/gold', { albedo: new three.Color(1.0, 0.766, 0.336), metallic: 1.0, roughness: 0.3 }],
    ['metal/copper', { albedo: new three.Color(0.955, 0.637, 0.538), metallic: 1.0, roughness: 0.35 }],
    ['metal/aluminum', { albedo: new three.Color(0.913, 0.921, 0.925), metallic: 1.0, roughness: 0.2 }],
    ['plastic/glossy', { albedo: new three.Color(1, 1, 1), metallic: 0.0, roughness: 0.1 }],
    ['plastic/matte', { albedo: new three.Color(1, 1, 1), metallic: 0.0, roughness: 0.8 }],
    ['glass/clear', { albedo: new three.Color(1, 1, 1), metallic: 0.0, roughness: 0.0, transmission: 1.0, ior: 1.5, thickness: 1.0 }],
    ['glass/frosted', { albedo: new three.Color(1, 1, 1), metallic: 0.0, roughness: 0.3, transmission: 0.9, ior: 1.5, thickness: 1.0 }],
    ['fabric/velvet', { albedo: new three.Color(0.5, 0.2, 0.2), metallic: 0.0, roughness: 0.9, sheen: 1.0, sheenRoughness: 0.5, sheenColor: new three.Color(0.9, 0.5, 0.5) }],
    ['fabric/silk', { albedo: new three.Color(1, 1, 1), metallic: 0.0, roughness: 0.3, sheen: 0.8, sheenRoughness: 0.2 }],
    ['car-paint', { albedo: new three.Color(0.8, 0, 0), metallic: 0.1, roughness: 0.5, clearcoat: 1.0, clearcoatRoughness: 0.03 }],
    ['skin/caucasian', { albedo: new three.Color(0.95, 0.8, 0.7), metallic: 0.0, roughness: 0.5, subsurface: 0.8, subsurfaceColor: new three.Color(0.95, 0.7, 0.6), subsurfaceRadius: new three.Vector3(4.0, 2.3, 1.7) }],
    ['wax', { albedo: new three.Color(0.9, 0.85, 0.7), metallic: 0.0, roughness: 0.3, subsurface: 0.5, subsurfaceColor: new three.Color(0.9, 0.8, 0.6), subsurfaceRadius: new three.Vector3(2.0, 2.0, 2.0) }],
  ]);
}
