/**
 * Shared GLSL shader sources used by the PBR shader pipeline.
 * Split from the runtime pipeline to keep orchestration code focused.
 */

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

export {
  BLOOM_BLUR_SHADER,
  BLOOM_THRESHOLD_SHADER,
  PBR_FRAGMENT_SHADER,
  PBR_VERTEX_SHADER,
  SSAO_SHADER,
  TONEMAP_SHADER,
};
