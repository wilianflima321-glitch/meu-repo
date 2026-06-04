// @aethel-heavy-async-boundary Studio/render material contracts and defaults.
import * as THREE from 'three';

export type MaterialType =
  | 'standard'
  | 'subsurface'
  | 'clearcoat'
  | 'cloth'
  | 'hair'
  | 'eye'
  | 'skin'
  | 'glass'
  | 'water'
  | 'terrain'
  | 'vegetation'
  | 'toon'
  | 'unlit'
  | 'custom';

// ============================================================================
// SHADER GRAPH NODES
// ============================================================================

export type NodeType =
  | 'input'
  | 'output'
  | 'texture'
  | 'value'
  | 'color'
  | 'math'
  | 'vector'
  | 'noise'
  | 'blend'
  | 'remap'
  | 'split'
  | 'combine'
  | 'fresnel'
  | 'normal'
  | 'uv'
  | 'time'
  | 'custom';

export interface ShaderNode {
  id: string;
  type: NodeType;
  name: string;
  position: [number, number];
  inputs: NodeSocket[];
  outputs: NodeSocket[];
  parameters: Record<string, unknown>;
}

export interface NodeSocket {
  id: string;
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D';
  value?: unknown;
  connected?: string; // Connected socket ID
}

export interface ShaderConnection {
  from: string; // Socket ID
  to: string;   // Socket ID
}

export interface ShaderGraph {
  id: string;
  name: string;
  nodes: ShaderNode[];
  connections: ShaderConnection[];
  parameters: Record<string, unknown>;
}

// ============================================================================
// ADVANCED PBR MATERIAL
// ============================================================================

export interface AdvancedPBRParams {
  // Base PBR
  albedo: THREE.Color;
  albedoMap?: THREE.Texture;
  metallic: number;
  metallicMap?: THREE.Texture;
  roughness: number;
  roughnessMap?: THREE.Texture;
  normalMap?: THREE.Texture;
  normalScale: number;
  aoMap?: THREE.Texture;
  aoIntensity: number;
  emissive: THREE.Color;
  emissiveMap?: THREE.Texture;
  emissiveIntensity: number;

  // Advanced features
  clearcoat: number;
  clearcoatRoughness: number;
  clearcoatMap?: THREE.Texture;
  clearcoatRoughnessMap?: THREE.Texture;
  clearcoatNormalMap?: THREE.Texture;
  clearcoatNormalScale: number;

  sheen: number;
  sheenRoughness: number;
  sheenColor: THREE.Color;
  sheenColorMap?: THREE.Texture;
  sheenRoughnessMap?: THREE.Texture;

  transmission: number;
  transmissionMap?: THREE.Texture;
  thickness: number;
  thicknessMap?: THREE.Texture;
  attenuationDistance: number;
  attenuationColor: THREE.Color;
  ior: number;

  anisotropy: number;
  anisotropyRotation: number;
  anisotropyMap?: THREE.Texture;

  // Detail maps
  detailAlbedoMap?: THREE.Texture;
  detailNormalMap?: THREE.Texture;
  detailRoughnessMap?: THREE.Texture;
  detailTiling: number;
  detailStrength: number;

  // Parallax
  heightMap?: THREE.Texture;
  heightScale: number;
  parallaxSteps: number;

  // Special
  alphaTest: number;
  alphaToCoverage: boolean;
  transparent: boolean;
  opacity: number;

  // Subsurface scattering
  subsurface: number;
  subsurfaceColor: THREE.Color;
  subsurfaceRadius: THREE.Vector3;
  subsurfaceMap?: THREE.Texture;

  // Iridescence
  iridescence: number;
  iridescenceIOR: number;
  iridescenceThicknessRange: [number, number];
  iridescenceMap?: THREE.Texture;
  iridescenceThicknessMap?: THREE.Texture;
}

export const DEFAULT_PBR_PARAMS: AdvancedPBRParams = {
  albedo: new THREE.Color(1, 1, 1),
  metallic: 0,
  roughness: 0.5,
  normalScale: 1,
  aoIntensity: 1,
  emissive: new THREE.Color(0, 0, 0),
  emissiveIntensity: 1,
  clearcoat: 0,
  clearcoatRoughness: 0,
  clearcoatNormalScale: 1,
  sheen: 0,
  sheenRoughness: 1,
  sheenColor: new THREE.Color(1, 1, 1),
  transmission: 0,
  thickness: 0,
  attenuationDistance: Infinity,
  attenuationColor: new THREE.Color(1, 1, 1),
  ior: 1.5,
  anisotropy: 0,
  anisotropyRotation: 0,
  detailTiling: 1,
  detailStrength: 1,
  heightScale: 0.1,
  parallaxSteps: 8,
  alphaTest: 0,
  alphaToCoverage: false,
  transparent: false,
  opacity: 1,
  subsurface: 0,
  subsurfaceColor: new THREE.Color(1, 1, 1),
  subsurfaceRadius: new THREE.Vector3(1, 1, 1),
  iridescence: 0,
  iridescenceIOR: 1.3,
  iridescenceThicknessRange: [100, 400],
};
