// @aethel-heavy-async-boundary

import { THREE } from './pbr-three-namespace';
import { PBR_FRAGMENT_SHADER, PBR_VERTEX_SHADER } from './pbr-shader-sources';
import type { IBLEnvironment, PBRMaterialParams } from './pbr-shader-pipeline.contracts';

export class PBRMaterial {
  private uniforms: Record<string, THREE.IUniform>;
  private material: THREE.ShaderMaterial;
  constructor(params: Partial<PBRMaterialParams> = {}) {
    this.uniforms = {
      uAlbedo: { value: params.albedo instanceof THREE.Color ? params.albedo : new THREE.Color(0xffffff) },
      uMetallic: { value: typeof params.metallic === 'number' ? params.metallic : 0.0 },
      uRoughness: { value: typeof params.roughness === 'number' ? params.roughness : 0.5 },
      uEmissive: { value: params.emissiveColor || new THREE.Color(0x000000) },
      uEmissiveIntensity: { value: params.emissiveIntensity || 0.0 },
      uAOIntensity: { value: params.aoIntensity || 1.0 },
      uUseAlbedoMap: { value: params.albedo instanceof THREE.Texture },
      uUseMetallicMap: { value: params.metallic instanceof THREE.Texture },
      uUseRoughnessMap: { value: params.roughness instanceof THREE.Texture },
      uUseNormalMap: { value: !!params.normalMap },
      uUseAOMap: { value: !!params.aoMap },
      uUseEmissiveMap: { value: !!params.emissiveMap },
      uUseHeightMap: { value: !!params.heightMap },
      uAlbedoMap: { value: params.albedo instanceof THREE.Texture ? params.albedo : null },
      uMetallicMap: { value: params.metallic instanceof THREE.Texture ? params.metallic : null },
      uRoughnessMap: { value: params.roughness instanceof THREE.Texture ? params.roughness : null },
      uNormalMap: { value: params.normalMap || null },
      uAOMap: { value: params.aoMap || null },
      uEmissiveMap: { value: params.emissiveMap || null },
      uHeightMap: { value: params.heightMap || null },
      uNormalScale: { value: params.normalScale || new THREE.Vector2(1, 1) },
      uHeightScale: { value: params.heightScale || 0.05 },
      uDiffuseEnvMap: { value: null },
      uSpecularEnvMap: { value: null },
      uBRDFLUT: { value: null },
      uEnvMapIntensity: { value: 1.0 },
      uMaxEnvMapMipLevel: { value: 6.0 },
      uNumLights: { value: 0 },
      uLightPositions: { value: new Array(8).fill(new THREE.Vector3()) },
      uLightColors: { value: new Array(8).fill(new THREE.Vector3(1, 1, 1)) },
      uLightIntensities: { value: new Array(8).fill(1) },
      uLightTypes: { value: new Array(8).fill(0) },
      uLightDirections: { value: new Array(8).fill(new THREE.Vector3(0, -1, 0)) },
      uLightRanges: { value: new Array(8).fill(10) },
      uLightInnerAngles: { value: new Array(8).fill(Math.cos(Math.PI / 6)) },
      uLightOuterAngles: { value: new Array(8).fill(Math.cos(Math.PI / 4)) },
      uReceiveShadows: { value: true },
      uShadowMap: { value: null },
      uShadowMatrix: { value: new THREE.Matrix4() },
      uShadowBias: { value: 0.005 },
      uShadowRadius: { value: 1.0 },
    };
    this.material = new THREE.ShaderMaterial({
      vertexShader: PBR_VERTEX_SHADER,
      fragmentShader: PBR_FRAGMENT_SHADER,
      uniforms: this.uniforms,
      transparent: params.transparent || false,
      side: params.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      wireframe: params.wireframe || false,
    });
    if (params.transparent) {
      this.material.depthWrite = false;
      this.material.blending = THREE.NormalBlending;
    }
  }
  setAlbedo(value: THREE.Color | THREE.Texture): void {
    if (value instanceof THREE.Texture) {
      this.uniforms.uAlbedoMap.value = value;
      this.uniforms.uUseAlbedoMap.value = true;
    } else {
      this.uniforms.uAlbedo.value = value;
      this.uniforms.uUseAlbedoMap.value = false;
    }
  }
  setMetallic(value: number | THREE.Texture): void {
    if (value instanceof THREE.Texture) {
      this.uniforms.uMetallicMap.value = value;
      this.uniforms.uUseMetallicMap.value = true;
    } else {
      this.uniforms.uMetallic.value = value;
      this.uniforms.uUseMetallicMap.value = false;
    }
  }
  setRoughness(value: number | THREE.Texture): void {
    if (value instanceof THREE.Texture) {
      this.uniforms.uRoughnessMap.value = value;
      this.uniforms.uUseRoughnessMap.value = true;
    } else {
      this.uniforms.uRoughness.value = value;
      this.uniforms.uUseRoughnessMap.value = false;
    }
  }
  setNormalMap(texture: THREE.Texture | null, scale?: THREE.Vector2): void {
    this.uniforms.uNormalMap.value = texture;
    this.uniforms.uUseNormalMap.value = !!texture;
    if (scale) this.uniforms.uNormalScale.value = scale;
  }
  setEmissive(color: THREE.Color, intensity: number, texture?: THREE.Texture): void {
    this.uniforms.uEmissive.value = color;
    this.uniforms.uEmissiveIntensity.value = intensity;
    if (texture) {
      this.uniforms.uEmissiveMap.value = texture;
      this.uniforms.uUseEmissiveMap.value = true;
    }
  }
  setEnvironment(env: IBLEnvironment): void {
    this.uniforms.uDiffuseEnvMap.value = env.diffuseEnvMap;
    this.uniforms.uSpecularEnvMap.value = env.specularEnvMap;
    this.uniforms.uBRDFLUT.value = env.brdfLUT;
    this.uniforms.uEnvMapIntensity.value = env.intensity;
  }
  getMaterial(): THREE.ShaderMaterial {
    return this.material;
  }
  dispose(): void {
    this.material.dispose();
  }
}

