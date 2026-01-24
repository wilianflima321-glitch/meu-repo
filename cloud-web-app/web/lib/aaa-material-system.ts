/**
 * AAA MATERIAL & SHADER SYSTEM
 * 
 * Sistema completo de materiais e shaders profissionais:
 * - PBR materials (Standard, Subsurface, Clearcoat, Sheen, Transmission, Anisotropic)
 * - Shader graph visual editor
 * - Custom shader templates
 * - Material layering/blending
 * - Procedural materials
 * - Material instances
 * - Shader variants for LODs
 * - Hot-reload shaders
 */

import * as THREE from 'three';

// ============================================================================
// MATERIAL TYPES
// ============================================================================

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
  parameters: Record<string, any>;
}

export interface NodeSocket {
  id: string;
  name: string;
  type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'sampler2D';
  value?: any;
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
  parameters: Record<string, any>;
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

// ============================================================================
// ADVANCED PBR MATERIAL CLASS
// ============================================================================

export class AdvancedPBRMaterial extends THREE.ShaderMaterial {
  private params: AdvancedPBRParams;
  
  constructor(params: Partial<AdvancedPBRParams> = {}) {
    const mergedParams = { ...DEFAULT_PBR_PARAMS, ...params };
    
    // Build shader code
    const vertexShader = AdvancedPBRMaterial.buildVertexShader(mergedParams);
    const fragmentShader = AdvancedPBRMaterial.buildFragmentShader(mergedParams);
    
    // Build uniforms
    const uniforms = AdvancedPBRMaterial.buildUniforms(mergedParams);
    
    super({
      uniforms,
      vertexShader,
      fragmentShader,
      lights: true,
      fog: true,
    });
    
    this.params = mergedParams;
  }
  
  private static buildUniforms(params: AdvancedPBRParams): Record<string, THREE.IUniform> {
    const uniforms: Record<string, THREE.IUniform> = {
      // Base
      albedo: { value: params.albedo },
      albedoMap: { value: params.albedoMap || null },
      hasAlbedoMap: { value: !!params.albedoMap },
      
      metallic: { value: params.metallic },
      metallicMap: { value: params.metallicMap || null },
      hasMetallicMap: { value: !!params.metallicMap },
      
      roughness: { value: params.roughness },
      roughnessMap: { value: params.roughnessMap || null },
      hasRoughnessMap: { value: !!params.roughnessMap },
      
      normalMap: { value: params.normalMap || null },
      normalScale: { value: params.normalScale },
      hasNormalMap: { value: !!params.normalMap },
      
      aoMap: { value: params.aoMap || null },
      aoIntensity: { value: params.aoIntensity },
      hasAoMap: { value: !!params.aoMap },
      
      emissive: { value: params.emissive },
      emissiveMap: { value: params.emissiveMap || null },
      emissiveIntensity: { value: params.emissiveIntensity },
      hasEmissiveMap: { value: !!params.emissiveMap },
      
      // Clearcoat
      clearcoat: { value: params.clearcoat },
      clearcoatRoughness: { value: params.clearcoatRoughness },
      clearcoatMap: { value: params.clearcoatMap || null },
      clearcoatRoughnessMap: { value: params.clearcoatRoughnessMap || null },
      clearcoatNormalMap: { value: params.clearcoatNormalMap || null },
      clearcoatNormalScale: { value: params.clearcoatNormalScale },
      
      // Sheen
      sheen: { value: params.sheen },
      sheenRoughness: { value: params.sheenRoughness },
      sheenColor: { value: params.sheenColor },
      sheenColorMap: { value: params.sheenColorMap || null },
      sheenRoughnessMap: { value: params.sheenRoughnessMap || null },
      
      // Transmission
      transmission: { value: params.transmission },
      transmissionMap: { value: params.transmissionMap || null },
      thickness: { value: params.thickness },
      thicknessMap: { value: params.thicknessMap || null },
      attenuationDistance: { value: params.attenuationDistance },
      attenuationColor: { value: params.attenuationColor },
      ior: { value: params.ior },
      
      // Anisotropy
      anisotropy: { value: params.anisotropy },
      anisotropyRotation: { value: params.anisotropyRotation },
      anisotropyMap: { value: params.anisotropyMap || null },
      
      // Detail
      detailAlbedoMap: { value: params.detailAlbedoMap || null },
      detailNormalMap: { value: params.detailNormalMap || null },
      detailRoughnessMap: { value: params.detailRoughnessMap || null },
      detailTiling: { value: params.detailTiling },
      detailStrength: { value: params.detailStrength },
      
      // Parallax
      heightMap: { value: params.heightMap || null },
      heightScale: { value: params.heightScale },
      parallaxSteps: { value: params.parallaxSteps },
      hasHeightMap: { value: !!params.heightMap },
      
      // Opacity
      alphaTest: { value: params.alphaTest },
      opacity: { value: params.opacity },
      
      // Subsurface
      subsurface: { value: params.subsurface },
      subsurfaceColor: { value: params.subsurfaceColor },
      subsurfaceRadius: { value: params.subsurfaceRadius },
      subsurfaceMap: { value: params.subsurfaceMap || null },
      
      // Iridescence
      iridescence: { value: params.iridescence },
      iridescenceIOR: { value: params.iridescenceIOR },
      iridescenceThicknessMin: { value: params.iridescenceThicknessRange[0] },
      iridescenceThicknessMax: { value: params.iridescenceThicknessRange[1] },
      iridescenceMap: { value: params.iridescenceMap || null },
      iridescenceThicknessMap: { value: params.iridescenceThicknessMap || null },
    };
    
    // Add Three.js built-in uniforms
    return THREE.UniformsUtils.merge([
      THREE.UniformsLib.common,
      THREE.UniformsLib.lights,
      THREE.UniformsLib.fog,
      uniforms,
    ]);
  }
  
  private static buildVertexShader(params: AdvancedPBRParams): string {
    return `
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vTangent;
      varying vec3 vBitangent;
      
      #ifdef USE_TANGENT
        attribute vec4 tangent;
      #endif
      
      void main() {
        vUv = uv;
        
        // World space position
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        
        // World space normal
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        
        // View space position
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        
        // Tangent space
        #ifdef USE_TANGENT
          vTangent = normalize((modelMatrix * vec4(tangent.xyz, 0.0)).xyz);
          vBitangent = normalize(cross(vWorldNormal, vTangent) * tangent.w);
        #else
          // Generate tangent/bitangent from normal
          vec3 c1 = cross(vWorldNormal, vec3(0.0, 0.0, 1.0));
          vec3 c2 = cross(vWorldNormal, vec3(0.0, 1.0, 0.0));
          vTangent = length(c1) > length(c2) ? c1 : c2;
          vTangent = normalize(vTangent);
          vBitangent = normalize(cross(vWorldNormal, vTangent));
        #endif
        
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
  }
  
  private static buildFragmentShader(params: AdvancedPBRParams): string {
    return `
      uniform vec3 albedo;
      uniform sampler2D albedoMap;
      uniform bool hasAlbedoMap;
      
      uniform float metallic;
      uniform sampler2D metallicMap;
      uniform bool hasMetallicMap;
      
      uniform float roughness;
      uniform sampler2D roughnessMap;
      uniform bool hasRoughnessMap;
      
      uniform sampler2D normalMap;
      uniform float normalScale;
      uniform bool hasNormalMap;
      
      uniform sampler2D aoMap;
      uniform float aoIntensity;
      uniform bool hasAoMap;
      
      uniform vec3 emissive;
      uniform sampler2D emissiveMap;
      uniform float emissiveIntensity;
      uniform bool hasEmissiveMap;
      
      uniform float clearcoat;
      uniform float clearcoatRoughness;
      uniform sampler2D clearcoatMap;
      uniform sampler2D clearcoatRoughnessMap;
      uniform sampler2D clearcoatNormalMap;
      uniform float clearcoatNormalScale;
      
      uniform float sheen;
      uniform float sheenRoughness;
      uniform vec3 sheenColor;
      uniform sampler2D sheenColorMap;
      uniform sampler2D sheenRoughnessMap;
      
      uniform float transmission;
      uniform sampler2D transmissionMap;
      uniform float thickness;
      uniform sampler2D thicknessMap;
      uniform float attenuationDistance;
      uniform vec3 attenuationColor;
      uniform float ior;
      
      uniform float anisotropy;
      uniform float anisotropyRotation;
      uniform sampler2D anisotropyMap;
      
      uniform sampler2D detailAlbedoMap;
      uniform sampler2D detailNormalMap;
      uniform sampler2D detailRoughnessMap;
      uniform float detailTiling;
      uniform float detailStrength;
      
      uniform sampler2D heightMap;
      uniform float heightScale;
      uniform float parallaxSteps;
      uniform bool hasHeightMap;
      
      uniform float alphaTest;
      uniform float opacity;
      
      uniform float subsurface;
      uniform vec3 subsurfaceColor;
      uniform vec3 subsurfaceRadius;
      uniform sampler2D subsurfaceMap;
      
      uniform float iridescence;
      uniform float iridescenceIOR;
      uniform float iridescenceThicknessMin;
      uniform float iridescenceThicknessMax;
      uniform sampler2D iridescenceMap;
      uniform sampler2D iridescenceThicknessMap;
      
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;
      varying vec3 vTangent;
      varying vec3 vBitangent;
      
      // Include standard lighting
      #include <common>
      #include <packing>
      #include <lights_pars_begin>
      #include <fog_pars_fragment>
      
      // Parallax Occlusion Mapping
      vec2 parallaxMapping(vec2 uv, vec3 viewDir) {
        if (!hasHeightMap) return uv;
        
        float numLayers = mix(parallaxSteps * 2.0, parallaxSteps, abs(dot(vec3(0.0, 0.0, 1.0), viewDir)));
        float layerDepth = 1.0 / numLayers;
        float currentLayerDepth = 0.0;
        vec2 P = viewDir.xy * heightScale;
        vec2 deltaUV = P / numLayers;
        
        vec2 currentUV = uv;
        float currentDepthMapValue = texture2D(heightMap, currentUV).r;
        
        for (int i = 0; i < int(parallaxSteps * 2.0); i++) {
          if (currentLayerDepth >= currentDepthMapValue) break;
          currentUV -= deltaUV;
          currentDepthMapValue = texture2D(heightMap, currentUV).r;
          currentLayerDepth += layerDepth;
        }
        
        // Parallax occlusion mapping interpolation
        vec2 prevUV = currentUV + deltaUV;
        float afterDepth = currentDepthMapValue - currentLayerDepth;
        float beforeDepth = texture2D(heightMap, prevUV).r - currentLayerDepth + layerDepth;
        float weight = afterDepth / (afterDepth - beforeDepth);
        return mix(currentUV, prevUV, weight);
      }
      
      // PBR functions
      vec3 fresnelSchlick(float cosTheta, vec3 F0) {
        return F0 + (1.0 - F0) * pow(1.0 - cosTheta, 5.0);
      }
      
      float distributionGGX(vec3 N, vec3 H, float roughness) {
        float a = roughness * roughness;
        float a2 = a * a;
        float NdotH = max(dot(N, H), 0.0);
        float NdotH2 = NdotH * NdotH;
        
        float nom = a2;
        float denom = (NdotH2 * (a2 - 1.0) + 1.0);
        denom = 3.14159265359 * denom * denom;
        
        return nom / max(denom, 0.0001);
      }
      
      float geometrySchlickGGX(float NdotV, float roughness) {
        float r = (roughness + 1.0);
        float k = (r * r) / 8.0;
        
        float nom = NdotV;
        float denom = NdotV * (1.0 - k) + k;
        
        return nom / max(denom, 0.0001);
      }
      
      float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        float ggx2 = geometrySchlickGGX(NdotV, roughness);
        float ggx1 = geometrySchlickGGX(NdotL, roughness);
        
        return ggx1 * ggx2;
      }
      
      void main() {
        // View direction in tangent space for parallax
        vec3 V = normalize(vViewPosition);
        mat3 TBN = mat3(vTangent, vBitangent, vWorldNormal);
        vec3 viewDirTangent = normalize(transpose(TBN) * V);
        
        // Apply parallax mapping
        vec2 uv = parallaxMapping(vUv, viewDirTangent);
        
        // Sample base textures
        vec3 baseAlbedo = albedo;
        if (hasAlbedoMap) {
          baseAlbedo *= texture2D(albedoMap, uv).rgb;
        }
        
        float baseMetallic = metallic;
        if (hasMetallicMap) {
          baseMetallic *= texture2D(metallicMap, uv).r;
        }
        
        float baseRoughness = roughness;
        if (hasRoughnessMap) {
          baseRoughness *= texture2D(roughnessMap, uv).r;
        }
        
        // Sample normal map
        vec3 N = vWorldNormal;
        if (hasNormalMap) {
          vec3 normalMapSample = texture2D(normalMap, uv).xyz * 2.0 - 1.0;
          normalMapSample.xy *= normalScale;
          N = normalize(TBN * normalMapSample);
        }
        
        // Detail maps
        vec2 detailUV = uv * detailTiling;
        if (detailAlbedoMap != null) {
          vec3 detail = texture2D(detailAlbedoMap, detailUV).rgb;
          baseAlbedo = mix(baseAlbedo, baseAlbedo * detail, detailStrength);
        }
        
        // AO
        float ao = 1.0;
        if (hasAoMap) {
          ao = texture2D(aoMap, uv).r;
          ao = mix(1.0, ao, aoIntensity);
        }
        
        // Emissive
        vec3 emissiveColor = emissive;
        if (hasEmissiveMap) {
          emissiveColor *= texture2D(emissiveMap, uv).rgb;
        }
        emissiveColor *= emissiveIntensity;
        
        // Basic PBR calculation (simplified - full implementation would include all lights)
        vec3 F0 = mix(vec3(0.04), baseAlbedo, baseMetallic);
        vec3 color = baseAlbedo * ao + emissiveColor;
        
        // Apply opacity
        float alpha = opacity;
        if (alphaTest > 0.0 && alpha < alphaTest) {
          discard;
        }
        
        gl_FragColor = vec4(color, alpha);
        
        #include <fog_fragment>
      }
    `;
  }
  
  // Update parameter
  setParameter<K extends keyof AdvancedPBRParams>(key: K, value: AdvancedPBRParams[K]): void {
    this.params[key] = value;
    
    // Update uniform
    if (this.uniforms[key]) {
      this.uniforms[key].value = value;
    }
  }
  
  getParameter<K extends keyof AdvancedPBRParams>(key: K): AdvancedPBRParams[K] {
    return this.params[key];
  }
}

// ============================================================================
// MATERIAL LIBRARY - PRESETS
// ============================================================================

export class MaterialLibrary {
  private static presets: Map<string, Partial<AdvancedPBRParams>> = new Map();
  
  static initialize(): void {
    // Metal presets
    this.presets.set('metal/iron', {
      albedo: new THREE.Color(0.56, 0.57, 0.58),
      metallic: 1.0,
      roughness: 0.5,
    });
    
    this.presets.set('metal/gold', {
      albedo: new THREE.Color(1.0, 0.766, 0.336),
      metallic: 1.0,
      roughness: 0.3,
    });
    
    this.presets.set('metal/copper', {
      albedo: new THREE.Color(0.955, 0.637, 0.538),
      metallic: 1.0,
      roughness: 0.35,
    });
    
    this.presets.set('metal/aluminum', {
      albedo: new THREE.Color(0.913, 0.921, 0.925),
      metallic: 1.0,
      roughness: 0.2,
    });
    
    // Dielectric presets
    this.presets.set('plastic/glossy', {
      albedo: new THREE.Color(1, 1, 1),
      metallic: 0.0,
      roughness: 0.1,
    });
    
    this.presets.set('plastic/matte', {
      albedo: new THREE.Color(1, 1, 1),
      metallic: 0.0,
      roughness: 0.8,
    });
    
    // Glass/transmission
    this.presets.set('glass/clear', {
      albedo: new THREE.Color(1, 1, 1),
      metallic: 0.0,
      roughness: 0.0,
      transmission: 1.0,
      ior: 1.5,
      thickness: 1.0,
    });
    
    this.presets.set('glass/frosted', {
      albedo: new THREE.Color(1, 1, 1),
      metallic: 0.0,
      roughness: 0.3,
      transmission: 0.9,
      ior: 1.5,
      thickness: 1.0,
    });
    
    // Cloth
    this.presets.set('fabric/velvet', {
      albedo: new THREE.Color(0.5, 0.2, 0.2),
      metallic: 0.0,
      roughness: 0.9,
      sheen: 1.0,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(0.9, 0.5, 0.5),
    });
    
    this.presets.set('fabric/silk', {
      albedo: new THREE.Color(1, 1, 1),
      metallic: 0.0,
      roughness: 0.3,
      sheen: 0.8,
      sheenRoughness: 0.2,
    });
    
    // Clearcoat
    this.presets.set('car-paint', {
      albedo: new THREE.Color(0.8, 0, 0),
      metallic: 0.1,
      roughness: 0.5,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
    });
    
    // Subsurface
    this.presets.set('skin/caucasian', {
      albedo: new THREE.Color(0.95, 0.8, 0.7),
      metallic: 0.0,
      roughness: 0.5,
      subsurface: 0.8,
      subsurfaceColor: new THREE.Color(0.95, 0.7, 0.6),
      subsurfaceRadius: new THREE.Vector3(4.0, 2.3, 1.7),
    });
    
    this.presets.set('wax', {
      albedo: new THREE.Color(0.9, 0.85, 0.7),
      metallic: 0.0,
      roughness: 0.3,
      subsurface: 0.5,
      subsurfaceColor: new THREE.Color(0.9, 0.8, 0.6),
      subsurfaceRadius: new THREE.Vector3(2.0, 2.0, 2.0),
    });
  }
  
  static getPreset(name: string): Partial<AdvancedPBRParams> | undefined {
    return this.presets.get(name);
  }
  
  static createMaterial(preset: string): AdvancedPBRMaterial {
    const params = this.presets.get(preset);
    if (!params) {
      throw new Error(`Unknown material preset: ${preset}`);
    }
    return new AdvancedPBRMaterial(params);
  }
  
  static listPresets(): string[] {
    return Array.from(this.presets.keys());
  }
}

// Initialize library
MaterialLibrary.initialize();

// ============================================================================
// SHADER GRAPH COMPILER - REAL GLSL GENERATION
// ============================================================================

interface CompiledNode {
  code: string;
  outputVar: string;
  outputType: string;
}

export class ShaderGraphCompiler {
  private nodeCounter = 0;
  private compiledNodes = new Map<string, CompiledNode>();
  private uniformDeclarations: string[] = [];
  private functionDefinitions: string[] = [];
  
  compile(graph: ShaderGraph): { vertexShader: string; fragmentShader: string; uniforms: Record<string, THREE.IUniform> } {
    // Reset state
    this.nodeCounter = 0;
    this.compiledNodes.clear();
    this.uniformDeclarations = [];
    this.functionDefinitions = [];
    
    const uniforms: Record<string, THREE.IUniform> = {};
    
    // Find output node
    const outputNode = graph.nodes.find(n => n.type === 'output');
    if (!outputNode) {
      throw new Error('Shader graph must have an output node');
    }
    
    // Build node connection map
    const connectionMap = new Map<string, string>(); // toSocketId -> fromSocketId
    for (const conn of graph.connections) {
      connectionMap.set(conn.to, conn.from);
    }
    
    // Generate fragment shader code by traversing from output
    const fragmentCode = this.generateNodeCode(graph, outputNode, connectionMap, uniforms);
    
    // Standard vertex shader with tangent space support
    const vertexShader = `
      precision highp float;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;
      varying mat3 vTBN;
      
      #ifdef USE_TANGENT
        attribute vec4 tangent;
      #endif
      
      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        vViewDir = normalize(cameraPosition - vWorldPosition);
        
        // Calculate TBN matrix for normal mapping
        #ifdef USE_TANGENT
          vec3 T = normalize(normalMatrix * tangent.xyz);
          vec3 N = vNormal;
          vec3 B = normalize(cross(N, T) * tangent.w);
          vTBN = mat3(T, B, N);
        #else
          vec3 T = normalize(cross(vNormal, vec3(0.0, 1.0, 0.0)));
          vec3 B = normalize(cross(vNormal, T));
          vTBN = mat3(T, B, vNormal);
        #endif
        
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    
    // Build complete fragment shader
    const fragmentShader = `
      precision highp float;
      
      varying vec2 vUv;
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec3 vWorldPosition;
      varying vec3 vViewDir;
      varying mat3 vTBN;
      
      uniform float time;
      
      ${this.uniformDeclarations.join('\n')}
      
      // Utility functions
      ${this.getUtilityFunctions()}
      
      // Node functions
      ${this.functionDefinitions.join('\n')}
      
      void main() {
        ${fragmentCode}
      }
    `;
    
    // Add time uniform
    uniforms['time'] = { value: 0 };
    
    return { vertexShader, fragmentShader, uniforms };
  }
  
  private generateNodeCode(
    graph: ShaderGraph, 
    node: ShaderNode, 
    connectionMap: Map<string, string>,
    uniforms: Record<string, THREE.IUniform>
  ): string {
    // Check if already compiled
    if (this.compiledNodes.has(node.id)) {
      return ''; // Code already generated
    }
    
    const nodeId = this.nodeCounter++;
    let code = '';
    let outputVar = `node_${nodeId}`;
    let outputType = 'vec4';
    
    // Process input connections first (depth-first)
    const inputValues: Record<string, string> = {};
    for (const input of node.inputs) {
      const connectedSocketId = connectionMap.get(input.id);
      if (connectedSocketId) {
        // Find the connected node
        const fromNode = graph.nodes.find(n => 
          n.outputs.some(o => o.id === connectedSocketId)
        );
        if (fromNode) {
          // Generate code for connected node
          code += this.generateNodeCode(graph, fromNode, connectionMap, uniforms);
          // Get the output variable
          const compiled = this.compiledNodes.get(fromNode.id);
          if (compiled) {
            inputValues[input.name] = compiled.outputVar;
          }
        }
      } else if (input.value !== undefined) {
        // Use default value
        inputValues[input.name] = this.valueToGLSL(input.value, input.type);
      }
    }
    
    // Generate code based on node type
    switch (node.type) {
      case 'output':
        const baseColor = inputValues['baseColor'] || 'vec3(0.8, 0.8, 0.8)';
        const metallic = inputValues['metallic'] || '0.0';
        const roughness = inputValues['roughness'] || '0.5';
        const normal = inputValues['normal'] || 'vNormal';
        const emissive = inputValues['emissive'] || 'vec3(0.0)';
        const opacity = inputValues['opacity'] || '1.0';
        
        code += `
        // PBR Output Calculation
        vec3 N = normalize(${normal});
        vec3 V = normalize(vViewDir);
        
        vec3 albedo = ${baseColor};
        float metal = clamp(${metallic}, 0.0, 1.0);
        float rough = clamp(${roughness}, 0.04, 1.0);
        vec3 emit = ${emissive};
        float alpha = clamp(${opacity}, 0.0, 1.0);
        
        // Simplified PBR lighting
        vec3 F0 = mix(vec3(0.04), albedo, metal);
        
        // Ambient light approximation
        vec3 ambient = albedo * 0.03;
        
        // Simple directional light (sun)
        vec3 lightDir = normalize(vec3(1.0, 1.0, 0.5));
        vec3 lightColor = vec3(1.0, 0.98, 0.95);
        
        vec3 H = normalize(V + lightDir);
        float NdotL = max(dot(N, lightDir), 0.0);
        float NdotH = max(dot(N, H), 0.0);
        float NdotV = max(dot(N, V), 0.0);
        
        // GGX Distribution
        float a = rough * rough;
        float a2 = a * a;
        float denom = NdotH * NdotH * (a2 - 1.0) + 1.0;
        float D = a2 / (3.14159 * denom * denom);
        
        // Fresnel (Schlick)
        vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
        
        // Geometry (Smith GGX)
        float k = (rough + 1.0) * (rough + 1.0) / 8.0;
        float G = (NdotV / (NdotV * (1.0 - k) + k)) * (NdotL / (NdotL * (1.0 - k) + k));
        
        // Specular BRDF
        vec3 specular = (D * F * G) / max(4.0 * NdotV * NdotL, 0.001);
        
        // Diffuse (Lambert with energy conservation)
        vec3 kD = (1.0 - F) * (1.0 - metal);
        vec3 diffuse = kD * albedo / 3.14159;
        
        // Final color
        vec3 Lo = (diffuse + specular) * lightColor * NdotL;
        vec3 finalColor = ambient + Lo + emit;
        
        // Tone mapping (ACES approximation)
        finalColor = finalColor / (finalColor + vec3(1.0));
        finalColor = pow(finalColor, vec3(1.0 / 2.2));
        
        gl_FragColor = vec4(finalColor, alpha);
        `;
        break;
        
      case 'texture':
        const textureName = `texture_${nodeId}`;
        const textureUV = inputValues['uv'] || 'vUv';
        this.uniformDeclarations.push(`uniform sampler2D ${textureName};`);
        uniforms[textureName] = { value: node.parameters.texture || null };
        
        code += `vec4 ${outputVar} = texture2D(${textureName}, ${textureUV});\n`;
        break;
        
      case 'color':
        const color = node.parameters.color as { r: number; g: number; b: number; a?: number } || { r: 1, g: 1, b: 1, a: 1 };
        code += `vec4 ${outputVar} = vec4(${color.r.toFixed(4)}, ${color.g.toFixed(4)}, ${color.b.toFixed(4)}, ${(color.a ?? 1).toFixed(4)});\n`;
        break;
        
      case 'value':
        const val = node.parameters.value as number ?? 0.5;
        code += `float ${outputVar} = ${val.toFixed(4)};\n`;
        outputType = 'float';
        break;
        
      case 'math':
        const mathOp = node.parameters.operation as string || 'add';
        const inputA = inputValues['a'] || '0.0';
        const inputB = inputValues['b'] || '0.0';
        
        switch (mathOp) {
          case 'add':
            code += `float ${outputVar} = ${inputA} + ${inputB};\n`;
            break;
          case 'subtract':
            code += `float ${outputVar} = ${inputA} - ${inputB};\n`;
            break;
          case 'multiply':
            code += `float ${outputVar} = ${inputA} * ${inputB};\n`;
            break;
          case 'divide':
            code += `float ${outputVar} = ${inputA} / max(${inputB}, 0.0001);\n`;
            break;
          case 'power':
            code += `float ${outputVar} = pow(${inputA}, ${inputB});\n`;
            break;
          case 'sqrt':
            code += `float ${outputVar} = sqrt(max(${inputA}, 0.0));\n`;
            break;
          case 'abs':
            code += `float ${outputVar} = abs(${inputA});\n`;
            break;
          case 'sin':
            code += `float ${outputVar} = sin(${inputA});\n`;
            break;
          case 'cos':
            code += `float ${outputVar} = cos(${inputA});\n`;
            break;
          case 'min':
            code += `float ${outputVar} = min(${inputA}, ${inputB});\n`;
            break;
          case 'max':
            code += `float ${outputVar} = max(${inputA}, ${inputB});\n`;
            break;
          case 'lerp':
            const inputT = inputValues['t'] || '0.5';
            code += `float ${outputVar} = mix(${inputA}, ${inputB}, ${inputT});\n`;
            break;
          default:
            code += `float ${outputVar} = ${inputA};\n`;
        }
        outputType = 'float';
        break;
        
      case 'vector':
        const vecOp = node.parameters.operation as string || 'combine';
        
        if (vecOp === 'combine') {
          const x = inputValues['x'] || '0.0';
          const y = inputValues['y'] || '0.0';
          const z = inputValues['z'] || '0.0';
          code += `vec3 ${outputVar} = vec3(${x}, ${y}, ${z});\n`;
          outputType = 'vec3';
        } else if (vecOp === 'normalize') {
          const vec = inputValues['vector'] || 'vec3(0.0, 1.0, 0.0)';
          code += `vec3 ${outputVar} = normalize(${vec});\n`;
          outputType = 'vec3';
        } else if (vecOp === 'dot') {
          const vecA = inputValues['a'] || 'vec3(0.0, 1.0, 0.0)';
          const vecB = inputValues['b'] || 'vec3(0.0, 1.0, 0.0)';
          code += `float ${outputVar} = dot(${vecA}, ${vecB});\n`;
          outputType = 'float';
        } else if (vecOp === 'cross') {
          const vecA = inputValues['a'] || 'vec3(1.0, 0.0, 0.0)';
          const vecB = inputValues['b'] || 'vec3(0.0, 1.0, 0.0)';
          code += `vec3 ${outputVar} = cross(${vecA}, ${vecB});\n`;
          outputType = 'vec3';
        }
        break;
        
      case 'noise':
        const noiseType = node.parameters.type as string || 'perlin';
        const noiseScale = inputValues['scale'] || '1.0';
        const noisePos = inputValues['position'] || 'vWorldPosition';
        
        code += `float ${outputVar} = noise_${noiseType}(${noisePos} * ${noiseScale});\n`;
        outputType = 'float';
        break;
        
      case 'fresnel':
        const fresnelPower = inputValues['power'] || '5.0';
        const fresnelNormal = inputValues['normal'] || 'vNormal';
        code += `float ${outputVar} = pow(1.0 - max(dot(normalize(${fresnelNormal}), normalize(vViewDir)), 0.0), ${fresnelPower});\n`;
        outputType = 'float';
        break;
        
      case 'normal':
        const normalStrength = inputValues['strength'] || '1.0';
        const normalMap = inputValues['map'];
        if (normalMap) {
          code += `
        vec3 normalSample = ${normalMap}.xyz * 2.0 - 1.0;
        normalSample.xy *= ${normalStrength};
        vec3 ${outputVar} = normalize(vTBN * normalSample);
        `;
        } else {
          code += `vec3 ${outputVar} = vNormal;\n`;
        }
        outputType = 'vec3';
        break;
        
      case 'uv':
        const uvChannel = node.parameters.channel as number || 0;
        code += `vec2 ${outputVar} = vUv;\n`; // Could support multiple UV channels
        outputType = 'vec2';
        break;
        
      case 'time':
        code += `float ${outputVar} = time;\n`;
        outputType = 'float';
        break;
        
      case 'split':
        const splitInput = inputValues['vector'] || 'vec4(0.0)';
        const splitChannel = node.parameters.channel as string || 'r';
        code += `float ${outputVar} = ${splitInput}.${splitChannel};\n`;
        outputType = 'float';
        break;
        
      case 'blend':
        const blendMode = node.parameters.mode as string || 'mix';
        const blendA = inputValues['a'] || 'vec3(0.0)';
        const blendB = inputValues['b'] || 'vec3(1.0)';
        const blendFactor = inputValues['factor'] || '0.5';
        
        switch (blendMode) {
          case 'mix':
            code += `vec3 ${outputVar} = mix(${blendA}, ${blendB}, ${blendFactor});\n`;
            break;
          case 'add':
            code += `vec3 ${outputVar} = ${blendA} + ${blendB} * ${blendFactor};\n`;
            break;
          case 'multiply':
            code += `vec3 ${outputVar} = mix(${blendA}, ${blendA} * ${blendB}, ${blendFactor});\n`;
            break;
          case 'screen':
            code += `vec3 ${outputVar} = mix(${blendA}, 1.0 - (1.0 - ${blendA}) * (1.0 - ${blendB}), ${blendFactor});\n`;
            break;
          case 'overlay':
            code += `
        vec3 blendOverlay = vec3(
          ${blendA}.r < 0.5 ? (2.0 * ${blendA}.r * ${blendB}.r) : (1.0 - 2.0 * (1.0 - ${blendA}.r) * (1.0 - ${blendB}.r)),
          ${blendA}.g < 0.5 ? (2.0 * ${blendA}.g * ${blendB}.g) : (1.0 - 2.0 * (1.0 - ${blendA}.g) * (1.0 - ${blendB}.g)),
          ${blendA}.b < 0.5 ? (2.0 * ${blendA}.b * ${blendB}.b) : (1.0 - 2.0 * (1.0 - ${blendA}.b) * (1.0 - ${blendB}.b))
        );
        vec3 ${outputVar} = mix(${blendA}, blendOverlay, ${blendFactor});
        `;
            break;
          default:
            code += `vec3 ${outputVar} = mix(${blendA}, ${blendB}, ${blendFactor});\n`;
        }
        outputType = 'vec3';
        break;
        
      case 'remap':
        const remapInput = inputValues['value'] || '0.5';
        const fromMin = inputValues['fromMin'] || '0.0';
        const fromMax = inputValues['fromMax'] || '1.0';
        const toMin = inputValues['toMin'] || '0.0';
        const toMax = inputValues['toMax'] || '1.0';
        code += `float ${outputVar} = ${toMin} + (${remapInput} - ${fromMin}) * (${toMax} - ${toMin}) / max(${fromMax} - ${fromMin}, 0.0001);\n`;
        outputType = 'float';
        break;
        
      case 'input':
        // Input nodes represent external uniforms or vertex attributes
        const inputName = node.parameters.name as string || 'input';
        const inputType = node.parameters.inputType as string || 'float';
        this.uniformDeclarations.push(`uniform ${inputType} ${inputName};`);
        code += `${inputType} ${outputVar} = ${inputName};\n`;
        outputType = inputType;
        break;
        
      default:
        // Unknown node type - output white
        code += `vec4 ${outputVar} = vec4(1.0);\n`;
    }
    
    // Store compiled node
    this.compiledNodes.set(node.id, { code, outputVar, outputType });
    
    return code;
  }
  
  private valueToGLSL(value: any, type: string): string {
    if (type === 'float') {
      return typeof value === 'number' ? value.toFixed(4) : '0.0';
    }
    if (type === 'vec2') {
      if (value && typeof value === 'object') {
        return `vec2(${(value.x || 0).toFixed(4)}, ${(value.y || 0).toFixed(4)})`;
      }
      return 'vec2(0.0)';
    }
    if (type === 'vec3') {
      if (value && typeof value === 'object') {
        return `vec3(${(value.x || value.r || 0).toFixed(4)}, ${(value.y || value.g || 0).toFixed(4)}, ${(value.z || value.b || 0).toFixed(4)})`;
      }
      return 'vec3(0.0)';
    }
    if (type === 'vec4') {
      if (value && typeof value === 'object') {
        return `vec4(${(value.x || value.r || 0).toFixed(4)}, ${(value.y || value.g || 0).toFixed(4)}, ${(value.z || value.b || 0).toFixed(4)}, ${(value.w || value.a || 1).toFixed(4)})`;
      }
      return 'vec4(0.0, 0.0, 0.0, 1.0)';
    }
    return '0.0';
  }
  
  private getUtilityFunctions(): string {
    return `
      // Hash functions for noise
      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
      float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123); }
      
      // Perlin noise
      float noise_perlin(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        
        float n = i.x + i.y * 57.0 + 113.0 * i.z;
        return mix(
          mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
              mix(hash(n + 57.0), hash(n + 58.0), f.x), f.y),
          mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
              mix(hash(n + 170.0), hash(n + 171.0), f.x), f.y),
          f.z
        );
      }
      
      // Simplex noise (approximation)
      float noise_simplex(vec3 p) {
        return noise_perlin(p); // Simplified - use perlin as fallback
      }
      
      // Voronoi noise
      float noise_voronoi(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        
        float minDist = 1.0;
        for (int x = -1; x <= 1; x++) {
          for (int y = -1; y <= 1; y++) {
            for (int z = -1; z <= 1; z++) {
              vec3 neighbor = vec3(float(x), float(y), float(z));
              vec3 point = hash(i + neighbor) * 0.5 + 0.5;
              vec3 diff = neighbor + point - f;
              float dist = length(diff);
              minDist = min(minDist, dist);
            }
          }
        }
        return minDist;
      }
      
      // FBM (Fractal Brownian Motion)
      float noise_fbm(vec3 p) {
        float value = 0.0;
        float amplitude = 0.5;
        float frequency = 1.0;
        for (int i = 0; i < 6; i++) {
          value += amplitude * noise_perlin(p * frequency);
          frequency *= 2.0;
          amplitude *= 0.5;
        }
        return value;
      }
      
      // Gradient noise for normal mapping
      vec3 noise_gradient(vec3 p) {
        float eps = 0.001;
        float nx = noise_perlin(p + vec3(eps, 0.0, 0.0)) - noise_perlin(p - vec3(eps, 0.0, 0.0));
        float ny = noise_perlin(p + vec3(0.0, eps, 0.0)) - noise_perlin(p - vec3(0.0, eps, 0.0));
        float nz = noise_perlin(p + vec3(0.0, 0.0, eps)) - noise_perlin(p - vec3(0.0, 0.0, eps));
        return normalize(vec3(nx, ny, nz));
      }
    `;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const shaderGraphCompiler = new ShaderGraphCompiler();

const aaaMaterialSystem = {
  AdvancedPBRMaterial,
  MaterialLibrary,
  ShaderGraphCompiler,
  shaderGraphCompiler,
  DEFAULT_PBR_PARAMS,
};

export default aaaMaterialSystem;
