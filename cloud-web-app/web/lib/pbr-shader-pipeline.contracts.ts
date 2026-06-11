import type { Color, CubeTexture, Texture, Vector2 } from '@/lib/three';

export interface PBRMaterialParams {
  albedo: Color | Texture;
  metallic: number | Texture;
  roughness: number | Texture;
  normalMap?: Texture;
  normalScale?: Vector2;
  aoMap?: Texture;
  aoIntensity?: number;
  emissiveMap?: Texture;
  emissiveColor?: Color;
  emissiveIntensity?: number;
  heightMap?: Texture;
  heightScale?: number;
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
  doubleSided?: boolean;
  wireframe?: boolean;
}

export interface IBLEnvironment {
  diffuseEnvMap: CubeTexture;
  specularEnvMap: CubeTexture;
  brdfLUT: Texture;
  intensity: number;
}

export interface PostProcessConfig {
  bloom: {
    enabled: boolean;
    threshold: number;
    intensity: number;
    radius: number;
  };
  ssao: {
    enabled: boolean;
    radius: number;
    intensity: number;
    bias: number;
    samples: number;
  };
  ssr: {
    enabled: boolean;
    maxSteps: number;
    stepSize: number;
    thickness: number;
  };
  tonemap: {
    enabled: boolean;
    exposure: number;
    gamma: number;
    method: 'linear' | 'reinhard' | 'filmic' | 'aces';
  };
}
