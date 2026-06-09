// Studio/render material contracts. Keep this module type-only so it never pulls
// Three.js into non-render import graphs.
import type * as THREE from 'three';

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
