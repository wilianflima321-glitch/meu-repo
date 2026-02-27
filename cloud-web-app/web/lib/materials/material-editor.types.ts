/**
 * Material editor shared contracts.
 */

export type MaterialType =
  | 'standard'
  | 'physical'
  | 'basic'
  | 'phong'
  | 'lambert'
  | 'toon'
  | 'matcap'
  | 'custom';

export type TextureSlot =
  | 'map' // Albedo/Diffuse
  | 'normalMap'
  | 'roughnessMap'
  | 'metalnessMap'
  | 'aoMap'
  | 'emissiveMap'
  | 'displacementMap'
  | 'alphaMap'
  | 'envMap'
  | 'lightMap'
  | 'bumpMap'
  | 'specularMap'
  | 'clearcoatMap'
  | 'clearcoatNormalMap'
  | 'clearcoatRoughnessMap'
  | 'sheenColorMap'
  | 'sheenRoughnessMap'
  | 'transmissionMap'
  | 'thicknessMap';

export interface TextureSettings {
  uri: string;
  repeat: { x: number; y: number };
  offset: { x: number; y: number };
  rotation: number;
  wrapS: 'repeat' | 'clamp' | 'mirror';
  wrapT: 'repeat' | 'clamp' | 'mirror';
  flipY: boolean;
  encoding: 'sRGB' | 'linear';
  anisotropy: number;
}

export interface MaterialSettings {
  id: string;
  name: string;
  type: MaterialType;

  // Color properties
  color: { r: number; g: number; b: number };
  opacity: number;
  transparent: boolean;

  // PBR properties
  metalness: number;
  roughness: number;

  // Emissive
  emissive: { r: number; g: number; b: number };
  emissiveIntensity: number;

  // Physical properties
  clearcoat: number;
  clearcoatRoughness: number;
  sheen: number;
  sheenRoughness: number;
  sheenColor: { r: number; g: number; b: number };
  transmission: number;
  thickness: number;
  ior: number;
  reflectivity: number;

  // Normal/Displacement
  normalScale: { x: number; y: number };
  displacementScale: number;
  displacementBias: number;
  bumpScale: number;

  // AO
  aoMapIntensity: number;

  // Light
  lightMapIntensity: number;
  envMapIntensity: number;

  // Rendering
  side: 'front' | 'back' | 'double';
  wireframe: boolean;
  flatShading: boolean;
  depthTest: boolean;
  depthWrite: boolean;
  alphaTest: number;
  alphaToCoverage: boolean;

  // Textures
  textures: Partial<Record<TextureSlot, TextureSettings>>;

  // Custom shader
  customShader?: {
    vertexShader: string;
    fragmentShader: string;
    uniforms: Record<string, unknown>;
  };
}

export interface MaterialPreset {
  id: string;
  name: string;
  category: string;
  thumbnail?: string;
  settings: Partial<MaterialSettings>;
}

export interface NodeConnection {
  id: string;
  fromNodeId: string;
  fromOutput: string;
  toNodeId: string;
  toInput: string;
}

export interface MaterialNode {
  id: string;
  type: string;
  name: string;
  position: { x: number; y: number };
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
}
