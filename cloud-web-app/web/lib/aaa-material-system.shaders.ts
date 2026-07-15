import type * as ThreeTypes from 'three';
import type { AdvancedPBRParams } from './aaa-material-system.contracts';

export function createDefaultPBRParams(three: typeof ThreeTypes): AdvancedPBRParams {
  return {
    albedo: new three.Color(1, 1, 1),
    metallic: 0,
    roughness: 0.5,
    normalScale: 1,
    aoIntensity: 1,
    emissive: new three.Color(0, 0, 0),
    emissiveIntensity: 1,
    clearcoat: 0,
    clearcoatRoughness: 0,
    clearcoatNormalScale: 1,
    sheen: 0,
    sheenRoughness: 1,
    sheenColor: new three.Color(1, 1, 1),
    transmission: 0,
    thickness: 0,
    attenuationDistance: Infinity,
    attenuationColor: new three.Color(1, 1, 1),
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
    subsurfaceColor: new three.Color(1, 1, 1),
    subsurfaceRadius: new three.Vector3(1, 1, 1),
    iridescence: 0,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [100, 400],
  };
}

export function buildAdvancedPBRUniforms(
  params: AdvancedPBRParams,
  three: typeof ThreeTypes,
): Record<string, ThreeTypes.IUniform> {
  const uniforms: Record<string, ThreeTypes.IUniform> = {
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
    clearcoat: { value: params.clearcoat },
    clearcoatRoughness: { value: params.clearcoatRoughness },
    clearcoatMap: { value: params.clearcoatMap || null },
    clearcoatRoughnessMap: { value: params.clearcoatRoughnessMap || null },
    clearcoatNormalMap: { value: params.clearcoatNormalMap || null },
    clearcoatNormalScale: { value: params.clearcoatNormalScale },
    sheen: { value: params.sheen },
    sheenRoughness: { value: params.sheenRoughness },
    sheenColor: { value: params.sheenColor },
    sheenColorMap: { value: params.sheenColorMap || null },
    sheenRoughnessMap: { value: params.sheenRoughnessMap || null },
    transmission: { value: params.transmission },
    transmissionMap: { value: params.transmissionMap || null },
    thickness: { value: params.thickness },
    thicknessMap: { value: params.thicknessMap || null },
    attenuationDistance: { value: params.attenuationDistance },
    attenuationColor: { value: params.attenuationColor },
    ior: { value: params.ior },
    anisotropy: { value: params.anisotropy },
    anisotropyRotation: { value: params.anisotropyRotation },
    anisotropyMap: { value: params.anisotropyMap || null },
    detailAlbedoMap: { value: params.detailAlbedoMap || null },
    detailNormalMap: { value: params.detailNormalMap || null },
    detailRoughnessMap: { value: params.detailRoughnessMap || null },
    detailTiling: { value: params.detailTiling },
    detailStrength: { value: params.detailStrength },
    heightMap: { value: params.heightMap || null },
    heightScale: { value: params.heightScale },
    parallaxSteps: { value: params.parallaxSteps },
    hasHeightMap: { value: !!params.heightMap },
    alphaTest: { value: params.alphaTest },
    opacity: { value: params.opacity },
    subsurface: { value: params.subsurface },
    subsurfaceColor: { value: params.subsurfaceColor },
    subsurfaceRadius: { value: params.subsurfaceRadius },
    subsurfaceMap: { value: params.subsurfaceMap || null },
    iridescence: { value: params.iridescence },
    iridescenceIOR: { value: params.iridescenceIOR },
    iridescenceThicknessMin: { value: params.iridescenceThicknessRange[0] },
    iridescenceThicknessMax: { value: params.iridescenceThicknessRange[1] },
    iridescenceMap: { value: params.iridescenceMap || null },
    iridescenceThicknessMap: { value: params.iridescenceThicknessMap || null },
  };

  return three.UniformsUtils.merge([
    three.UniformsLib.common,
    three.UniformsLib.lights,
    three.UniformsLib.fog,
    uniforms,
  ]);
}

export function buildAdvancedPBRVertexShader(): string {
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
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;

        #ifdef USE_TANGENT
          vTangent = normalize((modelMatrix * vec4(tangent.xyz, 0.0)).xyz);
          vBitangent = normalize(cross(vWorldNormal, vTangent) * tangent.w);
        #else
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

export function buildAdvancedPBRFragmentShader(): string {
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

      #include <common>
      #include <packing>
      #include <lights_pars_begin>
      #include <fog_pars_fragment>

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

        vec2 prevUV = currentUV + deltaUV;
        float afterDepth = currentDepthMapValue - currentLayerDepth;
        float beforeDepth = texture2D(heightMap, prevUV).r - currentLayerDepth + layerDepth;
        float weight = afterDepth / (afterDepth - beforeDepth);
        return mix(currentUV, prevUV, weight);
      }

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
        vec3 V = normalize(vViewPosition);
        mat3 TBN = mat3(vTangent, vBitangent, vWorldNormal);
        vec3 viewDirTangent = normalize(transpose(TBN) * V);
        vec2 uv = parallaxMapping(vUv, viewDirTangent);
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
        vec3 N = vWorldNormal;
        if (hasNormalMap) {
          vec3 normalMapSample = texture2D(normalMap, uv).xyz * 2.0 - 1.0;
          normalMapSample.xy *= normalScale;
          N = normalize(TBN * normalMapSample);
        }
        vec2 detailUV = uv * detailTiling;
        if (detailAlbedoMap != null) {
          vec3 detail = texture2D(detailAlbedoMap, detailUV).rgb;
          baseAlbedo = mix(baseAlbedo, baseAlbedo * detail, detailStrength);
        }
        float ao = 1.0;
        if (hasAoMap) {
          ao = texture2D(aoMap, uv).r;
          ao = mix(1.0, ao, aoIntensity);
        }
        vec3 emissiveColor = emissive;
        if (hasEmissiveMap) {
          emissiveColor *= texture2D(emissiveMap, uv).rgb;
        }
        emissiveColor *= emissiveIntensity;
        vec3 F0 = mix(vec3(0.04), baseAlbedo, baseMetallic);
        vec3 color = baseAlbedo * ao + emissiveColor;
        float alpha = opacity;
        if (alphaTest > 0.0 && alpha < alphaTest) {
          discard;
        }
        gl_FragColor = vec4(color, alpha);
        #include <fog_fragment>
      }
    `;
}
