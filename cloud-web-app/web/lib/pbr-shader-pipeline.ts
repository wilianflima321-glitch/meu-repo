/**
 * PBR Shader Pipeline - Pipeline de Shaders PBR Completo
 * 
 * Sistema profissional de renderização Physically Based Rendering:
 * - PBR metallic-roughness workflow
 * - Image-Based Lighting (IBL) com HDR
 * - Normal mapping, parallax mapping
 * - Screen Space Reflections (SSR)
 * - Screen Space Ambient Occlusion (SSAO)
 * - Bloom e tone mapping
 * - Shadow mapping com PCF
 * - Shader hot reload
 * - Material presets
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface PBRMaterialParams {
  // Base
  albedo: THREE.Color | THREE.Texture;
  metallic: number | THREE.Texture;
  roughness: number | THREE.Texture;
  
  // Maps
  normalMap?: THREE.Texture;
  normalScale?: THREE.Vector2;
  aoMap?: THREE.Texture;
  aoIntensity?: number;
  emissiveMap?: THREE.Texture;
  emissiveColor?: THREE.Color;
  emissiveIntensity?: number;
  heightMap?: THREE.Texture;
  heightScale?: number;
  
  // Options
  transparent?: boolean;
  opacity?: number;
  alphaTest?: number;
  doubleSided?: boolean;
  wireframe?: boolean;
}

export interface IBLEnvironment {
  diffuseEnvMap: THREE.CubeTexture;
  specularEnvMap: THREE.CubeTexture;
  brdfLUT: THREE.Texture;
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

// ============================================================================
// GLSL SHADERS
// ============================================================================

const PBR_VERTEX_SHADER = /* glsl */ `
#version 300 es
precision highp float;

// Attributes
in vec3 position;
in vec3 normal;
in vec2 uv;
in vec4 tangent;

// Uniforms
uniform mat4 modelMatrix;
uniform mat4 viewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
uniform vec3 cameraPosition;

// Varyings
out vec3 vWorldPosition;
out vec3 vWorldNormal;
out vec2 vUV;
out vec3 vViewDirection;
out mat3 vTBN;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  
  vWorldNormal = normalize(normalMatrix * normal);
  vUV = uv;
  
  vViewDirection = normalize(cameraPosition - worldPosition.xyz);
  
  // TBN matrix for normal mapping
  vec3 T = normalize(normalMatrix * tangent.xyz);
  vec3 N = vWorldNormal;
  vec3 B = normalize(cross(N, T) * tangent.w);
  vTBN = mat3(T, B, N);
  
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`;

const PBR_FRAGMENT_SHADER = /* glsl */ `
#version 300 es
precision highp float;

// Constants
const float PI = 3.14159265359;
const float EPSILON = 0.0001;

// Varyings
in vec3 vWorldPosition;
in vec3 vWorldNormal;
in vec2 vUV;
in vec3 vViewDirection;
in mat3 vTBN;

// Material uniforms
uniform vec3 uAlbedo;
uniform float uMetallic;
uniform float uRoughness;
uniform vec3 uEmissive;
uniform float uEmissiveIntensity;
uniform float uAOIntensity;

// Texture flags
uniform bool uUseAlbedoMap;
uniform bool uUseMetallicMap;
uniform bool uUseRoughnessMap;
uniform bool uUseNormalMap;
uniform bool uUseAOMap;
uniform bool uUseEmissiveMap;
uniform bool uUseHeightMap;

// Textures
uniform sampler2D uAlbedoMap;
uniform sampler2D uMetallicMap;
uniform sampler2D uRoughnessMap;
uniform sampler2D uNormalMap;
uniform sampler2D uAOMap;
uniform sampler2D uEmissiveMap;
uniform sampler2D uHeightMap;
uniform vec2 uNormalScale;
uniform float uHeightScale;

// IBL
uniform samplerCube uDiffuseEnvMap;
uniform samplerCube uSpecularEnvMap;
uniform sampler2D uBRDFLUT;
uniform float uEnvMapIntensity;
uniform float uMaxEnvMapMipLevel;

// Lights (support up to 8 lights)
#define MAX_LIGHTS 8
uniform int uNumLights;
uniform vec3 uLightPositions[MAX_LIGHTS];
uniform vec3 uLightColors[MAX_LIGHTS];
uniform float uLightIntensities[MAX_LIGHTS];
uniform int uLightTypes[MAX_LIGHTS]; // 0=directional, 1=point, 2=spot
uniform vec3 uLightDirections[MAX_LIGHTS];
uniform float uLightRanges[MAX_LIGHTS];
uniform float uLightInnerAngles[MAX_LIGHTS];
uniform float uLightOuterAngles[MAX_LIGHTS];

// Shadow mapping
uniform bool uReceiveShadows;
uniform sampler2D uShadowMap;
uniform mat4 uShadowMatrix;
uniform float uShadowBias;
uniform float uShadowRadius;

// Output
out vec4 fragColor;

// ============================================================================
// PBR FUNCTIONS
// ============================================================================

// Fresnel-Schlick approximation
vec3 fresnelSchlick(float cosTheta, vec3 F0) {
  return F0 + (1.0 - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// Fresnel with roughness for IBL
vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(clamp(1.0 - cosTheta, 0.0, 1.0), 5.0);
}

// GGX/Trowbridge-Reitz normal distribution function
float distributionGGX(vec3 N, vec3 H, float roughness) {
  float a = roughness * roughness;
  float a2 = a * a;
  float NdotH = max(dot(N, H), 0.0);
  float NdotH2 = NdotH * NdotH;
  
  float num = a2;
  float denom = (NdotH2 * (a2 - 1.0) + 1.0);
  denom = PI * denom * denom;
  
  return num / denom;
}

// Schlick-GGX geometry function
float geometrySchlickGGX(float NdotV, float roughness) {
  float r = (roughness + 1.0);
  float k = (r * r) / 8.0;
  
  float num = NdotV;
  float denom = NdotV * (1.0 - k) + k;
  
  return num / denom;
}

// Smith geometry function
float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
  float NdotV = max(dot(N, V), 0.0);
  float NdotL = max(dot(N, L), 0.0);
  float ggx2 = geometrySchlickGGX(NdotV, roughness);
  float ggx1 = geometrySchlickGGX(NdotL, roughness);
  
  return ggx1 * ggx2;
}

// ============================================================================
// PARALLAX MAPPING
// ============================================================================

vec2 parallaxMapping(vec2 texCoords, vec3 viewDir) {
  if (!uUseHeightMap) return texCoords;
  
  float height = texture(uHeightMap, texCoords).r;
  vec2 p = viewDir.xy / viewDir.z * (height * uHeightScale);
  return texCoords - p;
}

// ============================================================================
// SHADOW CALCULATION
// ============================================================================

float calculateShadow(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir) {
  if (!uReceiveShadows) return 1.0;
  
  // Perspective divide
  vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
  projCoords = projCoords * 0.5 + 0.5;
  
  if (projCoords.z > 1.0) return 1.0;
  
  float currentDepth = projCoords.z;
  
  // Bias based on surface angle
  float bias = max(uShadowBias * (1.0 - dot(normal, lightDir)), uShadowBias * 0.1);
  
  // PCF filtering
  float shadow = 0.0;
  vec2 texelSize = 1.0 / vec2(textureSize(uShadowMap, 0));
  
  for (int x = -2; x <= 2; x++) {
    for (int y = -2; y <= 2; y++) {
      float pcfDepth = texture(uShadowMap, projCoords.xy + vec2(x, y) * texelSize * uShadowRadius).r;
      shadow += currentDepth - bias > pcfDepth ? 1.0 : 0.0;
    }
  }
  shadow /= 25.0;
  
  return 1.0 - shadow;
}

// ============================================================================
// LIGHT ATTENUATION
// ============================================================================

float getDistanceAttenuation(float distance, float range) {
  float att = clamp(1.0 - pow(distance / range, 4.0), 0.0, 1.0);
  return att * att / (distance * distance + 1.0);
}

float getSpotAttenuation(vec3 lightDir, vec3 spotDir, float innerAngle, float outerAngle) {
  float theta = dot(lightDir, normalize(-spotDir));
  float epsilon = innerAngle - outerAngle;
  return clamp((theta - outerAngle) / epsilon, 0.0, 1.0);
}

// ============================================================================
// MAIN
// ============================================================================

void main() {
  // Parallax mapping
  vec3 viewDirTangent = normalize(transpose(vTBN) * vViewDirection);
  vec2 texCoords = parallaxMapping(vUV, viewDirTangent);
  
  // Sample textures
  vec3 albedo = uUseAlbedoMap ? texture(uAlbedoMap, texCoords).rgb : uAlbedo;
  albedo = pow(albedo, vec3(2.2)); // sRGB to linear
  
  float metallic = uUseMetallicMap ? texture(uMetallicMap, texCoords).r : uMetallic;
  float roughness = uUseRoughnessMap ? texture(uRoughnessMap, texCoords).r : uRoughness;
  roughness = clamp(roughness, 0.04, 1.0);
  
  float ao = uUseAOMap ? texture(uAOMap, texCoords).r : 1.0;
  ao = mix(1.0, ao, uAOIntensity);
  
  vec3 emissive = uUseEmissiveMap ? texture(uEmissiveMap, texCoords).rgb : uEmissive;
  emissive *= uEmissiveIntensity;
  
  // Normal mapping
  vec3 N;
  if (uUseNormalMap) {
    vec3 normalMapValue = texture(uNormalMap, texCoords).rgb * 2.0 - 1.0;
    normalMapValue.xy *= uNormalScale;
    N = normalize(vTBN * normalMapValue);
  } else {
    N = normalize(vWorldNormal);
  }
  
  vec3 V = normalize(vViewDirection);
  vec3 R = reflect(-V, N);
  
  // F0 for Fresnel
  vec3 F0 = vec3(0.04);
  F0 = mix(F0, albedo, metallic);
  
  // Direct lighting
  vec3 Lo = vec3(0.0);
  
  for (int i = 0; i < uNumLights && i < MAX_LIGHTS; i++) {
    vec3 L;
    float attenuation = 1.0;
    
    if (uLightTypes[i] == 0) {
      // Directional light
      L = normalize(-uLightDirections[i]);
    } else {
      // Point or spot light
      vec3 toLight = uLightPositions[i] - vWorldPosition;
      float distance = length(toLight);
      L = normalize(toLight);
      attenuation = getDistanceAttenuation(distance, uLightRanges[i]);
      
      if (uLightTypes[i] == 2) {
        // Spot light
        attenuation *= getSpotAttenuation(L, uLightDirections[i], 
                                          uLightInnerAngles[i], uLightOuterAngles[i]);
      }
    }
    
    vec3 H = normalize(V + L);
    
    // Cook-Torrance BRDF
    float NDF = distributionGGX(N, H, roughness);
    float G = geometrySmith(N, V, L, roughness);
    vec3 F = fresnelSchlick(max(dot(H, V), 0.0), F0);
    
    vec3 numerator = NDF * G * F;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0) + EPSILON;
    vec3 specular = numerator / denominator;
    
    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;
    
    float NdotL = max(dot(N, L), 0.0);
    vec3 radiance = uLightColors[i] * uLightIntensities[i] * attenuation;
    
    // Shadow for first light
    float shadow = 1.0;
    if (i == 0) {
      vec4 fragPosLightSpace = uShadowMatrix * vec4(vWorldPosition, 1.0);
      shadow = calculateShadow(fragPosLightSpace, N, L);
    }
    
    Lo += (kD * albedo / PI + specular) * radiance * NdotL * shadow;
  }
  
  // IBL ambient
  vec3 F = fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, roughness);
  
  vec3 kS = F;
  vec3 kD = 1.0 - kS;
  kD *= 1.0 - metallic;
  
  vec3 irradiance = texture(uDiffuseEnvMap, N).rgb;
  vec3 diffuse = irradiance * albedo;
  
  // Sample specular env map at mip level based on roughness
  float lod = roughness * uMaxEnvMapMipLevel;
  vec3 prefilteredColor = textureLod(uSpecularEnvMap, R, lod).rgb;
  
  vec2 brdf = texture(uBRDFLUT, vec2(max(dot(N, V), 0.0), roughness)).rg;
  vec3 specularIBL = prefilteredColor * (F * brdf.x + brdf.y);
  
  vec3 ambient = (kD * diffuse + specularIBL) * ao * uEnvMapIntensity;
  
  // Final color
  vec3 color = ambient + Lo + emissive;
  
  fragColor = vec4(color, 1.0);
}
`;

// ============================================================================
// POST PROCESSING SHADERS
// ============================================================================

const BLOOM_THRESHOLD_SHADER = /* glsl */ `
#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform float uThreshold;

void main() {
  vec3 color = texture(uTexture, vUV).rgb;
  float brightness = dot(color, vec3(0.2126, 0.7152, 0.0722));
  if (brightness > uThreshold) {
    fragColor = vec4(color, 1.0);
  } else {
    fragColor = vec4(0.0);
  }
}
`;

const BLOOM_BLUR_SHADER = /* glsl */ `
#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform vec2 uDirection;
uniform vec2 uResolution;

const float weights[5] = float[](0.227027, 0.1945946, 0.1216216, 0.054054, 0.016216);

void main() {
  vec2 texelSize = 1.0 / uResolution;
  vec3 result = texture(uTexture, vUV).rgb * weights[0];
  
  for (int i = 1; i < 5; i++) {
    result += texture(uTexture, vUV + uDirection * texelSize * float(i)).rgb * weights[i];
    result += texture(uTexture, vUV - uDirection * texelSize * float(i)).rgb * weights[i];
  }
  
  fragColor = vec4(result, 1.0);
}
`;

const SSAO_SHADER = /* glsl */ `
#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uDepthTexture;
uniform sampler2D uNormalTexture;
uniform sampler2D uNoiseTexture;
uniform mat4 uProjection;
uniform mat4 uInverseProjection;
uniform vec3 uSamples[64];
uniform float uRadius;
uniform float uBias;
uniform float uIntensity;
uniform vec2 uNoiseScale;

const int KERNEL_SIZE = 64;

vec3 getViewPosition(vec2 uv) {
  float depth = texture(uDepthTexture, uv).r;
  vec4 clipPos = vec4(uv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  vec4 viewPos = uInverseProjection * clipPos;
  return viewPos.xyz / viewPos.w;
}

void main() {
  vec3 fragPos = getViewPosition(vUV);
  vec3 normal = texture(uNormalTexture, vUV).rgb * 2.0 - 1.0;
  vec3 randomVec = texture(uNoiseTexture, vUV * uNoiseScale).rgb;
  
  vec3 tangent = normalize(randomVec - normal * dot(randomVec, normal));
  vec3 bitangent = cross(normal, tangent);
  mat3 TBN = mat3(tangent, bitangent, normal);
  
  float occlusion = 0.0;
  
  for (int i = 0; i < KERNEL_SIZE; i++) {
    vec3 samplePos = TBN * uSamples[i];
    samplePos = fragPos + samplePos * uRadius;
    
    vec4 offset = uProjection * vec4(samplePos, 1.0);
    offset.xyz /= offset.w;
    offset.xyz = offset.xyz * 0.5 + 0.5;
    
    float sampleDepth = getViewPosition(offset.xy).z;
    float rangeCheck = smoothstep(0.0, 1.0, uRadius / abs(fragPos.z - sampleDepth));
    occlusion += (sampleDepth >= samplePos.z + uBias ? 1.0 : 0.0) * rangeCheck;
  }
  
  occlusion = 1.0 - (occlusion / float(KERNEL_SIZE)) * uIntensity;
  fragColor = vec4(vec3(occlusion), 1.0);
}
`;

const TONEMAP_SHADER = /* glsl */ `
#version 300 es
precision highp float;

in vec2 vUV;
out vec4 fragColor;

uniform sampler2D uTexture;
uniform sampler2D uBloomTexture;
uniform float uExposure;
uniform float uGamma;
uniform int uTonemapMethod;
uniform float uBloomIntensity;
uniform bool uBloomEnabled;

// Reinhard tonemapping
vec3 reinhardTonemap(vec3 color) {
  return color / (color + vec3(1.0));
}

// Filmic tonemapping (Uncharted 2)
vec3 filmicTonemap(vec3 color) {
  float A = 0.15;
  float B = 0.50;
  float C = 0.10;
  float D = 0.20;
  float E = 0.02;
  float F = 0.30;
  return ((color * (A * color + C * B) + D * E) / (color * (A * color + B) + D * F)) - E / F;
}

// ACES filmic tonemapping
vec3 acesTonemap(vec3 color) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((color * (a * color + b)) / (color * (c * color + d) + e), 0.0, 1.0);
}

void main() {
  vec3 color = texture(uTexture, vUV).rgb;
  
  // Add bloom
  if (uBloomEnabled) {
    vec3 bloom = texture(uBloomTexture, vUV).rgb;
    color += bloom * uBloomIntensity;
  }
  
  // Exposure
  color *= uExposure;
  
  // Tonemapping
  if (uTonemapMethod == 0) {
    // Linear (no tonemapping)
  } else if (uTonemapMethod == 1) {
    color = reinhardTonemap(color);
  } else if (uTonemapMethod == 2) {
    color = filmicTonemap(color);
  } else {
    color = acesTonemap(color);
  }
  
  // Gamma correction
  color = pow(color, vec3(1.0 / uGamma));
  
  fragColor = vec4(color, 1.0);
}
`;

// ============================================================================
// PBR MATERIAL CLASS
// ============================================================================

export class PBRMaterial {
  private uniforms: Record<string, THREE.IUniform>;
  private material: THREE.ShaderMaterial;
  
  constructor(params: Partial<PBRMaterialParams> = {}) {
    this.uniforms = {
      // Material properties
      uAlbedo: { value: params.albedo instanceof THREE.Color ? params.albedo : new THREE.Color(0xffffff) },
      uMetallic: { value: typeof params.metallic === 'number' ? params.metallic : 0.0 },
      uRoughness: { value: typeof params.roughness === 'number' ? params.roughness : 0.5 },
      uEmissive: { value: params.emissiveColor || new THREE.Color(0x000000) },
      uEmissiveIntensity: { value: params.emissiveIntensity || 0.0 },
      uAOIntensity: { value: params.aoIntensity || 1.0 },
      
      // Texture flags
      uUseAlbedoMap: { value: params.albedo instanceof THREE.Texture },
      uUseMetallicMap: { value: params.metallic instanceof THREE.Texture },
      uUseRoughnessMap: { value: params.roughness instanceof THREE.Texture },
      uUseNormalMap: { value: !!params.normalMap },
      uUseAOMap: { value: !!params.aoMap },
      uUseEmissiveMap: { value: !!params.emissiveMap },
      uUseHeightMap: { value: !!params.heightMap },
      
      // Textures
      uAlbedoMap: { value: params.albedo instanceof THREE.Texture ? params.albedo : null },
      uMetallicMap: { value: params.metallic instanceof THREE.Texture ? params.metallic : null },
      uRoughnessMap: { value: params.roughness instanceof THREE.Texture ? params.roughness : null },
      uNormalMap: { value: params.normalMap || null },
      uAOMap: { value: params.aoMap || null },
      uEmissiveMap: { value: params.emissiveMap || null },
      uHeightMap: { value: params.heightMap || null },
      uNormalScale: { value: params.normalScale || new THREE.Vector2(1, 1) },
      uHeightScale: { value: params.heightScale || 0.05 },
      
      // IBL
      uDiffuseEnvMap: { value: null },
      uSpecularEnvMap: { value: null },
      uBRDFLUT: { value: null },
      uEnvMapIntensity: { value: 1.0 },
      uMaxEnvMapMipLevel: { value: 6.0 },
      
      // Lights
      uNumLights: { value: 0 },
      uLightPositions: { value: new Array(8).fill(new THREE.Vector3()) },
      uLightColors: { value: new Array(8).fill(new THREE.Vector3(1, 1, 1)) },
      uLightIntensities: { value: new Array(8).fill(1) },
      uLightTypes: { value: new Array(8).fill(0) },
      uLightDirections: { value: new Array(8).fill(new THREE.Vector3(0, -1, 0)) },
      uLightRanges: { value: new Array(8).fill(10) },
      uLightInnerAngles: { value: new Array(8).fill(Math.cos(Math.PI / 6)) },
      uLightOuterAngles: { value: new Array(8).fill(Math.cos(Math.PI / 4)) },
      
      // Shadows
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
  
  // Setters
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

// ============================================================================
// SHADOW MAP RENDERER
// ============================================================================

export class ShadowMapRenderer {
  private shadowMap: THREE.WebGLRenderTarget;
  private shadowCamera: THREE.OrthographicCamera;
  private depthMaterial: THREE.MeshDepthMaterial;
  private shadowMatrix: THREE.Matrix4;
  
  constructor(
    private renderer: THREE.WebGLRenderer,
    size: number = 2048
  ) {
    this.shadowMap = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
    });
    
    this.shadowCamera = new THREE.OrthographicCamera(-50, 50, 50, -50, 0.1, 500);
    this.depthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
    });
    
    this.shadowMatrix = new THREE.Matrix4();
  }
  
  render(scene: THREE.Scene, light: THREE.DirectionalLight): void {
    // Setup shadow camera
    this.shadowCamera.position.copy(light.position);
    this.shadowCamera.lookAt(light.target.position);
    this.shadowCamera.updateMatrixWorld();
    
    // Calculate shadow matrix
    this.shadowMatrix.set(
      0.5, 0.0, 0.0, 0.5,
      0.0, 0.5, 0.0, 0.5,
      0.0, 0.0, 0.5, 0.5,
      0.0, 0.0, 0.0, 1.0
    );
    this.shadowMatrix.multiply(this.shadowCamera.projectionMatrix);
    this.shadowMatrix.multiply(this.shadowCamera.matrixWorldInverse);
    
    // Render to shadow map
    const currentRenderTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.shadowMap);
    this.renderer.clear();
    
    scene.overrideMaterial = this.depthMaterial;
    this.renderer.render(scene, this.shadowCamera);
    scene.overrideMaterial = null;
    
    this.renderer.setRenderTarget(currentRenderTarget);
  }
  
  getShadowMap(): THREE.Texture {
    return this.shadowMap.texture;
  }
  
  getShadowMatrix(): THREE.Matrix4 {
    return this.shadowMatrix;
  }
  
  dispose(): void {
    this.shadowMap.dispose();
    this.depthMaterial.dispose();
  }
}

// ============================================================================
// POST PROCESS PIPELINE
// ============================================================================

export class PostProcessPipeline {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private quad: THREE.Mesh;
  
  private renderTargetA: THREE.WebGLRenderTarget;
  private renderTargetB: THREE.WebGLRenderTarget;
  private bloomTargets: THREE.WebGLRenderTarget[];
  
  private bloomThresholdMaterial: THREE.ShaderMaterial;
  private bloomBlurMaterial: THREE.ShaderMaterial;
  private ssaoMaterial: THREE.ShaderMaterial;
  private tonemapMaterial: THREE.ShaderMaterial;
  
  private config: PostProcessConfig;
  private ssaoSamples: THREE.Vector3[];
  private noiseTexture: THREE.DataTexture;
  
  constructor(
    renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    config: Partial<PostProcessConfig> = {}
  ) {
    this.renderer = renderer;
    this.config = {
      bloom: {
        enabled: true,
        threshold: 0.8,
        intensity: 0.5,
        radius: 4,
        ...config.bloom,
      },
      ssao: {
        enabled: true,
        radius: 0.5,
        intensity: 1.0,
        bias: 0.025,
        samples: 64,
        ...config.ssao,
      },
      ssr: {
        enabled: false,
        maxSteps: 100,
        stepSize: 0.1,
        thickness: 0.5,
        ...config.ssr,
      },
      tonemap: {
        enabled: true,
        exposure: 1.0,
        gamma: 2.2,
        method: 'aces',
        ...config.tonemap,
      },
    };
    
    // Setup fullscreen quad
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry);
    this.scene.add(this.quad);
    
    // Create render targets
    const targetParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    };
    
    this.renderTargetA = new THREE.WebGLRenderTarget(width, height, targetParams);
    this.renderTargetB = new THREE.WebGLRenderTarget(width, height, targetParams);
    
    // Create bloom targets at decreasing resolutions
    this.bloomTargets = [];
    let w = Math.floor(width / 2);
    let h = Math.floor(height / 2);
    for (let i = 0; i < 5; i++) {
      this.bloomTargets.push(new THREE.WebGLRenderTarget(w, h, targetParams));
      w = Math.floor(w / 2);
      h = Math.floor(h / 2);
    }
    
    // Create materials
    this.bloomThresholdMaterial = this.createBloomThresholdMaterial();
    this.bloomBlurMaterial = this.createBloomBlurMaterial();
    this.ssaoMaterial = this.createSSAOMaterial();
    this.tonemapMaterial = this.createTonemapMaterial();
    
    // Generate SSAO samples and noise
    this.ssaoSamples = this.generateSSAOSamples(64);
    this.noiseTexture = this.generateNoiseTexture();
  }
  
  private createBloomThresholdMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: BLOOM_THRESHOLD_SHADER,
      uniforms: {
        uTexture: { value: null },
        uThreshold: { value: this.config.bloom.threshold },
      },
    });
  }
  
  private createBloomBlurMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: BLOOM_BLUR_SHADER,
      uniforms: {
        uTexture: { value: null },
        uDirection: { value: new THREE.Vector2(1, 0) },
        uResolution: { value: new THREE.Vector2() },
      },
    });
  }
  
  private createSSAOMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: SSAO_SHADER,
      uniforms: {
        uDepthTexture: { value: null },
        uNormalTexture: { value: null },
        uNoiseTexture: { value: this.noiseTexture },
        uProjection: { value: new THREE.Matrix4() },
        uInverseProjection: { value: new THREE.Matrix4() },
        uSamples: { value: [] },
        uRadius: { value: this.config.ssao.radius },
        uBias: { value: this.config.ssao.bias },
        uIntensity: { value: this.config.ssao.intensity },
        uNoiseScale: { value: new THREE.Vector2() },
      },
    });
  }
  
  private createTonemapMaterial(): THREE.ShaderMaterial {
    const methods: Record<string, number> = {
      'linear': 0,
      'reinhard': 1,
      'filmic': 2,
      'aces': 3,
    };
    
    return new THREE.ShaderMaterial({
      vertexShader: this.getFullscreenVertexShader(),
      fragmentShader: TONEMAP_SHADER,
      uniforms: {
        uTexture: { value: null },
        uBloomTexture: { value: null },
        uExposure: { value: this.config.tonemap.exposure },
        uGamma: { value: this.config.tonemap.gamma },
        uTonemapMethod: { value: methods[this.config.tonemap.method] },
        uBloomIntensity: { value: this.config.bloom.intensity },
        uBloomEnabled: { value: this.config.bloom.enabled },
      },
    });
  }
  
  private getFullscreenVertexShader(): string {
    return /* glsl */ `
      #version 300 es
      in vec3 position;
      in vec2 uv;
      out vec2 vUV;
      void main() {
        vUV = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;
  }
  
  private generateSSAOSamples(count: number): THREE.Vector3[] {
    const samples: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      const sample = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random()
      ).normalize();
      
      let scale = i / count;
      scale = 0.1 + scale * scale * 0.9; // Lerp between 0.1 and 1.0
      sample.multiplyScalar(scale);
      
      samples.push(sample);
    }
    return samples;
  }
  
  private generateNoiseTexture(): THREE.DataTexture {
    const size = 4;
    const data = new Float32Array(size * size * 4);
    
    for (let i = 0; i < size * size; i++) {
      data[i * 4] = Math.random() * 2 - 1;
      data[i * 4 + 1] = Math.random() * 2 - 1;
      data[i * 4 + 2] = 0;
      data[i * 4 + 3] = 1;
    }
    
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    
    return texture;
  }
  
  render(inputTexture: THREE.Texture, outputTarget: THREE.WebGLRenderTarget | null = null): void {
    let currentInput = inputTexture;
    
    // Bloom pass
    if (this.config.bloom.enabled) {
      currentInput = this.renderBloom(currentInput);
    }
    
    // Final tonemap pass
    this.tonemapMaterial.uniforms.uTexture.value = inputTexture;
    this.tonemapMaterial.uniforms.uBloomTexture.value = currentInput;
    this.quad.material = this.tonemapMaterial;
    
    this.renderer.setRenderTarget(outputTarget);
    this.renderer.render(this.scene, this.camera);
  }
  
  private renderBloom(input: THREE.Texture): THREE.Texture {
    // Threshold pass
    this.bloomThresholdMaterial.uniforms.uTexture.value = input;
    this.quad.material = this.bloomThresholdMaterial;
    this.renderer.setRenderTarget(this.bloomTargets[0]);
    this.renderer.render(this.scene, this.camera);
    
    // Blur passes
    for (let i = 0; i < this.bloomTargets.length; i++) {
      const target = this.bloomTargets[i];
      
      // Horizontal blur
      this.bloomBlurMaterial.uniforms.uTexture.value = target.texture;
      this.bloomBlurMaterial.uniforms.uDirection.value.set(1, 0);
      this.bloomBlurMaterial.uniforms.uResolution.value.set(target.width, target.height);
      this.quad.material = this.bloomBlurMaterial;
      
      this.renderer.setRenderTarget(this.renderTargetA);
      this.renderer.render(this.scene, this.camera);
      
      // Vertical blur
      this.bloomBlurMaterial.uniforms.uTexture.value = this.renderTargetA.texture;
      this.bloomBlurMaterial.uniforms.uDirection.value.set(0, 1);
      
      this.renderer.setRenderTarget(target);
      this.renderer.render(this.scene, this.camera);
    }
    
    // Return the highest resolution bloom
    return this.bloomTargets[0].texture;
  }
  
  setConfig(config: Partial<PostProcessConfig>): void {
    Object.assign(this.config, config);
    
    // Update materials
    this.bloomThresholdMaterial.uniforms.uThreshold.value = this.config.bloom.threshold;
    this.tonemapMaterial.uniforms.uExposure.value = this.config.tonemap.exposure;
    this.tonemapMaterial.uniforms.uGamma.value = this.config.tonemap.gamma;
    this.tonemapMaterial.uniforms.uBloomIntensity.value = this.config.bloom.intensity;
    this.tonemapMaterial.uniforms.uBloomEnabled.value = this.config.bloom.enabled;
  }
  
  resize(width: number, height: number): void {
    this.renderTargetA.setSize(width, height);
    this.renderTargetB.setSize(width, height);
    
    let w = Math.floor(width / 2);
    let h = Math.floor(height / 2);
    for (const target of this.bloomTargets) {
      target.setSize(w, h);
      w = Math.floor(w / 2);
      h = Math.floor(h / 2);
    }
  }
  
  dispose(): void {
    this.renderTargetA.dispose();
    this.renderTargetB.dispose();
    this.bloomTargets.forEach(t => t.dispose());
    this.bloomThresholdMaterial.dispose();
    this.bloomBlurMaterial.dispose();
    this.ssaoMaterial.dispose();
    this.tonemapMaterial.dispose();
    this.noiseTexture.dispose();
    this.quad.geometry.dispose();
  }
}

// ============================================================================
// BRDF LUT GENERATOR
// ============================================================================

export class BRDFLUTGenerator {
  static generate(renderer: THREE.WebGLRenderer, size: number = 512): THREE.Texture {
    const fragmentShader = /* glsl */ `
      #version 300 es
      precision highp float;
      
      in vec2 vUV;
      out vec4 fragColor;
      
      const float PI = 3.14159265359;
      const uint SAMPLE_COUNT = 1024u;
      
      float radicalInverse_VdC(uint bits) {
        bits = (bits << 16u) | (bits >> 16u);
        bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
        bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
        bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
        bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
        return float(bits) * 2.3283064365386963e-10;
      }
      
      vec2 hammersley(uint i, uint N) {
        return vec2(float(i) / float(N), radicalInverse_VdC(i));
      }
      
      vec3 importanceSampleGGX(vec2 Xi, vec3 N, float roughness) {
        float a = roughness * roughness;
        float phi = 2.0 * PI * Xi.x;
        float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
        float sinTheta = sqrt(1.0 - cosTheta * cosTheta);
        
        vec3 H;
        H.x = cos(phi) * sinTheta;
        H.y = sin(phi) * sinTheta;
        H.z = cosTheta;
        
        vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
        vec3 tangent = normalize(cross(up, N));
        vec3 bitangent = cross(N, tangent);
        
        return normalize(tangent * H.x + bitangent * H.y + N * H.z);
      }
      
      float geometrySchlickGGX(float NdotV, float roughness) {
        float a = roughness;
        float k = (a * a) / 2.0;
        return NdotV / (NdotV * (1.0 - k) + k);
      }
      
      float geometrySmith(vec3 N, vec3 V, vec3 L, float roughness) {
        float NdotV = max(dot(N, V), 0.0);
        float NdotL = max(dot(N, L), 0.0);
        return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
      }
      
      vec2 integrateBRDF(float NdotV, float roughness) {
        vec3 V;
        V.x = sqrt(1.0 - NdotV * NdotV);
        V.y = 0.0;
        V.z = NdotV;
        
        float A = 0.0;
        float B = 0.0;
        
        vec3 N = vec3(0.0, 0.0, 1.0);
        
        for (uint i = 0u; i < SAMPLE_COUNT; i++) {
          vec2 Xi = hammersley(i, SAMPLE_COUNT);
          vec3 H = importanceSampleGGX(Xi, N, roughness);
          vec3 L = normalize(2.0 * dot(V, H) * H - V);
          
          float NdotL = max(L.z, 0.0);
          float NdotH = max(H.z, 0.0);
          float VdotH = max(dot(V, H), 0.0);
          
          if (NdotL > 0.0) {
            float G = geometrySmith(N, V, L, roughness);
            float G_Vis = (G * VdotH) / (NdotH * NdotV);
            float Fc = pow(1.0 - VdotH, 5.0);
            
            A += (1.0 - Fc) * G_Vis;
            B += Fc * G_Vis;
          }
        }
        
        A /= float(SAMPLE_COUNT);
        B /= float(SAMPLE_COUNT);
        
        return vec2(A, B);
      }
      
      void main() {
        vec2 brdf = integrateBRDF(vUV.x, vUV.y);
        fragColor = vec4(brdf, 0.0, 1.0);
      }
    `;
    
    const vertexShader = /* glsl */ `
      #version 300 es
      in vec3 position;
      in vec2 uv;
      out vec2 vUV;
      void main() {
        vUV = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;
    
    const target = new THREE.WebGLRenderTarget(size, size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
    });
    
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
    });
    
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);
    
    const currentTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.setRenderTarget(currentTarget);
    
    material.dispose();
    quad.geometry.dispose();
    
    return target.texture;
  }
}

// ============================================================================
// MATERIAL PRESETS
// ============================================================================

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

// ============================================================================
// SHADER HOT RELOAD
// ============================================================================

export class ShaderHotReload {
  private materials: Set<THREE.ShaderMaterial> = new Set();
  private shaderSources: Map<string, { vertex: string; fragment: string }> = new Map();
  private watchers: Map<string, () => void> = new Map();
  
  register(name: string, material: THREE.ShaderMaterial): void {
    this.materials.add(material);
    this.shaderSources.set(name, {
      vertex: material.vertexShader,
      fragment: material.fragmentShader,
    });
  }
  
  update(name: string, vertex?: string, fragment?: string): void {
    const source = this.shaderSources.get(name);
    if (!source) return;
    
    if (vertex) source.vertex = vertex;
    if (fragment) source.fragment = fragment;
    
    // Find and update material
    for (const material of this.materials) {
      if (material.vertexShader === source.vertex || material.fragmentShader === source.fragment) {
        if (vertex) material.vertexShader = vertex;
        if (fragment) material.fragmentShader = fragment;
        material.needsUpdate = true;
      }
    }
    
    // Notify watchers
    const watcher = this.watchers.get(name);
    if (watcher) watcher();
  }
  
  onUpdate(name: string, callback: () => void): void {
    this.watchers.set(name, callback);
  }
  
  dispose(): void {
    this.materials.clear();
    this.shaderSources.clear();
    this.watchers.clear();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PBR_VERTEX_SHADER,
  PBR_FRAGMENT_SHADER,
  BLOOM_THRESHOLD_SHADER,
  BLOOM_BLUR_SHADER,
  SSAO_SHADER,
  TONEMAP_SHADER,
};
