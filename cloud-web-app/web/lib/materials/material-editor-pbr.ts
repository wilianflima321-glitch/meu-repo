// @aethel-heavy-async-boundary PBR material model used by the Studio material editor.
import * as THREE from 'three';

export class PBRMaterial {
  albedo: THREE.Color = new THREE.Color(1, 1, 1);
  albedoMap: THREE.Texture | null = null;
  metallic: number = 0;
  metallicMap: THREE.Texture | null = null;
  roughness: number = 0.5;
  roughnessMap: THREE.Texture | null = null;
  normal: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  normalMap: THREE.Texture | null = null;
  normalScale: number = 1;
  ao: number = 1;
  aoMap: THREE.Texture | null = null;
  emission: THREE.Color = new THREE.Color(0, 0, 0);
  emissionMap: THREE.Texture | null = null;
  emissionIntensity: number = 1;
  heightMap: THREE.Texture | null = null;
  heightScale: number = 0.05;
  opacity: number = 1;
  alphaMap: THREE.Texture | null = null;
  transparent: boolean = false;
  doubleSided: boolean = false;

  // Advanced
  clearcoat: number = 0;
  clearcoatRoughness: number = 0;
  sheen: number = 0;
  sheenColor: THREE.Color = new THREE.Color(1, 1, 1);
  transmission: number = 0;
  ior: number = 1.5;
  thickness: number = 0;

  toThreeMaterial(): THREE.MeshPhysicalMaterial {
    const material = new THREE.MeshPhysicalMaterial({
      color: this.albedo,
      map: this.albedoMap,
      metalness: this.metallic,
      metalnessMap: this.metallicMap,
      roughness: this.roughness,
      roughnessMap: this.roughnessMap,
      normalMap: this.normalMap,
      normalScale: new THREE.Vector2(this.normalScale, this.normalScale),
      aoMap: this.aoMap,
      aoMapIntensity: this.ao,
      emissive: this.emission,
      emissiveMap: this.emissionMap,
      emissiveIntensity: this.emissionIntensity,
      displacementMap: this.heightMap,
      displacementScale: this.heightScale,
      alphaMap: this.alphaMap,
      opacity: this.opacity,
      transparent: this.transparent,
      side: this.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
      clearcoat: this.clearcoat,
      clearcoatRoughness: this.clearcoatRoughness,
      sheen: this.sheen,
      sheenColor: this.sheenColor,
      transmission: this.transmission,
      ior: this.ior,
      thickness: this.thickness,
    });

    return material;
  }

  static fromThreeMaterial(mat: THREE.MeshPhysicalMaterial): PBRMaterial {
    const pbr = new PBRMaterial();
    pbr.albedo = mat.color.clone();
    pbr.albedoMap = mat.map;
    pbr.metallic = mat.metalness;
    pbr.metallicMap = mat.metalnessMap;
    pbr.roughness = mat.roughness;
    pbr.roughnessMap = mat.roughnessMap;
    pbr.normalMap = mat.normalMap;
    pbr.normalScale = mat.normalScale.x;
    pbr.aoMap = mat.aoMap;
    pbr.ao = mat.aoMapIntensity;
    pbr.emission = mat.emissive.clone();
    pbr.emissionMap = mat.emissiveMap;
    pbr.emissionIntensity = mat.emissiveIntensity;
    pbr.heightMap = mat.displacementMap;
    pbr.heightScale = mat.displacementScale;
    pbr.alphaMap = mat.alphaMap;
    pbr.opacity = mat.opacity;
    pbr.transparent = mat.transparent;
    pbr.doubleSided = mat.side === THREE.DoubleSide;
    pbr.clearcoat = mat.clearcoat;
    pbr.clearcoatRoughness = mat.clearcoatRoughness;
    pbr.sheen = mat.sheen;
    pbr.sheenColor = mat.sheenColor.clone();
    pbr.transmission = mat.transmission;
    pbr.ior = mat.ior;
    pbr.thickness = mat.thickness;
    return pbr;
  }
}
