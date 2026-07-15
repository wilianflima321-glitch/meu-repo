/**
 * Material Editor - split runtime modules.
 *
 * Three.js material factory and editor state stay behind Studio/material routes
 * instead of public route imports.
 */

// @aethel-heavy-async-boundary Studio/material factory runtime; do not import from public route shells.
import * as THREE from 'three';
import type { MaterialPreset, MaterialSettings, TextureSettings, TextureSlot } from './types';

export class MaterialFactory {
  private textureLoader: THREE.TextureLoader;
  private textureCache: Map<string, THREE.Texture> = new Map();
  
  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }
  
  createDefaultSettings(): MaterialSettings {
    return {
      id: this.generateId(),
      name: 'New Material',
      type: 'standard',
      
      color: { r: 0.8, g: 0.8, b: 0.8 },
      opacity: 1,
      transparent: false,
      
      metalness: 0,
      roughness: 0.5,
      
      emissive: { r: 0, g: 0, b: 0 },
      emissiveIntensity: 1,
      
      clearcoat: 0,
      clearcoatRoughness: 0,
      sheen: 0,
      sheenRoughness: 1,
      sheenColor: { r: 1, g: 1, b: 1 },
      transmission: 0,
      thickness: 0,
      ior: 1.5,
      reflectivity: 0.5,
      
      normalScale: { x: 1, y: 1 },
      displacementScale: 1,
      displacementBias: 0,
      bumpScale: 1,
      
      aoMapIntensity: 1,
      lightMapIntensity: 1,
      envMapIntensity: 1,
      
      side: 'front',
      wireframe: false,
      flatShading: false,
      depthTest: true,
      depthWrite: true,
      alphaTest: 0,
      alphaToCoverage: false,
      
      textures: {},
    };
  }
  
  private generateId(): string {
    return `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async createMaterial(settings: MaterialSettings): Promise<THREE.Material> {
    const side = settings.side === 'front' ? THREE.FrontSide
      : settings.side === 'back' ? THREE.BackSide
      : THREE.DoubleSide;
    
    // Load textures
    const textures: Partial<Record<TextureSlot, THREE.Texture>> = {};
    for (const [slot, texSettings] of Object.entries(settings.textures)) {
      if (texSettings) {
        textures[slot as TextureSlot] = await this.loadTexture(texSettings);
      }
    }
    
    let material: THREE.Material;
    
    switch (settings.type) {
      case 'physical':
        material = new THREE.MeshPhysicalMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          metalness: settings.metalness,
          roughness: settings.roughness,
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          clearcoat: settings.clearcoat,
          clearcoatRoughness: settings.clearcoatRoughness,
          sheen: settings.sheen,
          sheenRoughness: settings.sheenRoughness,
          sheenColor: new THREE.Color(settings.sheenColor.r, settings.sheenColor.g, settings.sheenColor.b),
          transmission: settings.transmission,
          thickness: settings.thickness,
          ior: settings.ior,
          reflectivity: settings.reflectivity,
          envMapIntensity: settings.envMapIntensity,
          side,
          wireframe: settings.wireframe,
          flatShading: settings.flatShading,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          normalMap: textures.normalMap,
          roughnessMap: textures.roughnessMap,
          metalnessMap: textures.metalnessMap,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          displacementMap: textures.displacementMap,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
          lightMap: textures.lightMap,
          clearcoatMap: textures.clearcoatMap,
          clearcoatNormalMap: textures.clearcoatNormalMap,
          clearcoatRoughnessMap: textures.clearcoatRoughnessMap,
          sheenColorMap: textures.sheenColorMap,
          sheenRoughnessMap: textures.sheenRoughnessMap,
          transmissionMap: textures.transmissionMap,
          thicknessMap: textures.thicknessMap,
        });
        break;
        
      case 'standard':
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          metalness: settings.metalness,
          roughness: settings.roughness,
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          envMapIntensity: settings.envMapIntensity,
          side,
          wireframe: settings.wireframe,
          flatShading: settings.flatShading,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          normalMap: textures.normalMap,
          roughnessMap: textures.roughnessMap,
          metalnessMap: textures.metalnessMap,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          displacementMap: textures.displacementMap,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
          lightMap: textures.lightMap,
          bumpMap: textures.bumpMap,
        });
        break;
        
      case 'basic':
        material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          opacity: settings.opacity,
          transparent: settings.transparent,
          side,
          wireframe: settings.wireframe,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
        });
        break;
        
      case 'phong':
        material = new THREE.MeshPhongMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          side,
          wireframe: settings.wireframe,
          flatShading: settings.flatShading,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          normalMap: textures.normalMap,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          displacementMap: textures.displacementMap,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
          lightMap: textures.lightMap,
          bumpMap: textures.bumpMap,
          specularMap: textures.specularMap,
        });
        break;
        
      case 'lambert':
        material = new THREE.MeshLambertMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          side,
          wireframe: settings.wireframe,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          alphaMap: textures.alphaMap,
          envMap: textures.envMap,
          lightMap: textures.lightMap,
          bumpMap: textures.bumpMap,
          specularMap: textures.specularMap,
        });
        break;
        
      case 'toon':
        material = new THREE.MeshToonMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
          opacity: settings.opacity,
          transparent: settings.transparent,
          emissive: new THREE.Color(settings.emissive.r, settings.emissive.g, settings.emissive.b),
          emissiveIntensity: settings.emissiveIntensity,
          side,
          wireframe: settings.wireframe,
          depthTest: settings.depthTest,
          depthWrite: settings.depthWrite,
          alphaTest: settings.alphaTest,
          alphaToCoverage: settings.alphaToCoverage,
          map: textures.map,
          normalMap: textures.normalMap,
          aoMap: textures.aoMap,
          emissiveMap: textures.emissiveMap,
          displacementMap: textures.displacementMap,
          alphaMap: textures.alphaMap,
          lightMap: textures.lightMap,
          bumpMap: textures.bumpMap,
        });
        break;
        
      case 'custom':
        if (settings.customShader) {
          material = new THREE.ShaderMaterial({
            vertexShader: settings.customShader.vertexShader,
            fragmentShader: settings.customShader.fragmentShader,
            uniforms: settings.customShader.uniforms as Record<string, THREE.IUniform>,
            transparent: settings.transparent,
            side,
            wireframe: settings.wireframe,
            depthTest: settings.depthTest,
            depthWrite: settings.depthWrite,
          });
        } else {
          material = new THREE.MeshStandardMaterial();
        }
        break;
        
      default:
        material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(settings.color.r, settings.color.g, settings.color.b),
        });
    }
    
    // Apply normal scale
    if ('normalScale' in material && settings.normalScale) {
      (material as THREE.MeshStandardMaterial).normalScale.set(
        settings.normalScale.x,
        settings.normalScale.y
      );
    }
    
    // Apply displacement settings
    if ('displacementScale' in material) {
      (material as THREE.MeshStandardMaterial).displacementScale = settings.displacementScale;
      (material as THREE.MeshStandardMaterial).displacementBias = settings.displacementBias;
    }
    
    // Apply AO intensity
    if ('aoMapIntensity' in material) {
      (material as THREE.MeshStandardMaterial).aoMapIntensity = settings.aoMapIntensity;
    }
    
    // Store settings on material userData
    material.userData.settings = settings;
    
    return material;
  }
  
  private async loadTexture(settings: TextureSettings): Promise<THREE.Texture> {
    // Check cache
    const cacheKey = `${settings.uri}_${JSON.stringify(settings)}`;
    if (this.textureCache.has(cacheKey)) {
      return this.textureCache.get(cacheKey)!;
    }
    
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(settings.uri, resolve, undefined, reject);
    });
    
    // Apply settings
    texture.repeat.set(settings.repeat.x, settings.repeat.y);
    texture.offset.set(settings.offset.x, settings.offset.y);
    texture.rotation = settings.rotation;
    texture.flipY = settings.flipY;
    texture.anisotropy = settings.anisotropy;
    
    const wrapMap = {
      repeat: THREE.RepeatWrapping,
      clamp: THREE.ClampToEdgeWrapping,
      mirror: THREE.MirroredRepeatWrapping,
    };
    texture.wrapS = wrapMap[settings.wrapS];
    texture.wrapT = wrapMap[settings.wrapT];
    
    if (settings.encoding === 'sRGB') {
      texture.colorSpace = THREE.SRGBColorSpace;
    } else {
      texture.colorSpace = THREE.LinearSRGBColorSpace;
    }
    
    texture.needsUpdate = true;
    
    // Cache
    this.textureCache.set(cacheKey, texture);
    
    return texture;
  }
  
  applyPreset(settings: MaterialSettings, preset: MaterialPreset): MaterialSettings {
    return {
      ...settings,
      ...preset.settings,
      id: settings.id,
      name: settings.name,
    };
  }
  
  clearTextureCache(): void {
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
  }
}

// ============================================================================
// MATERIAL EDITOR
// ============================================================================
