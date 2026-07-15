/** @aethel-heavy-async-boundary Shader source for Studio volumetric clouds. */
/** Extracted from volumetric-clouds.ts to keep runtime orchestration readable and testable. */

export const VOLUMETRIC_CLOUD_VERTEX_SHADER = `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `;

export const VOLUMETRIC_CLOUD_FRAGMENT_SHADER = `
        precision highp float;
        precision highp sampler3D;

        uniform sampler3D cloudNoise;
        uniform sampler2D weatherMap;

        uniform vec3 cameraPosition;
        uniform mat4 viewMatrixInverse;
        uniform mat4 projectionMatrixInverse;

        uniform float coverage;
        uniform float density;
        uniform float cloudScale;
        uniform float detailScale;

        uniform float cloudLayerBottom;
        uniform float cloudLayerTop;

        uniform float time;
        uniform vec2 windDirection;
        uniform float windSpeed;

        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform vec3 ambientColor;
        uniform vec3 cloudColor;

        uniform float lightAbsorption;
        uniform float scatteringCoefficient;

        uniform vec2 resolution;
        /** Law XV adaptive raymarch — set from Capability Score (letter bt). */
        uniform float uMaxSteps;
        uniform float uLightSteps;

        /** CLOUD-001 / letter by — scene depth for geometry occlusion. */
        uniform sampler2D tSceneDepth;
        uniform float uCameraNear;
        uniform float uCameraFar;
        uniform float uDepthBlendEnabled;

        varying vec2 vUv;

        // Compile-time ceiling; runtime uses uMaxSteps / uLightSteps with early break.
        #define MAX_STEPS 64
        #define LIGHT_STEPS 6
        #define PI 3.14159265359

        // Remap function
        float remap(float value, float low1, float high1, float low2, float high2) {
          return low2 + (value - low1) * (high2 - low2) / (high1 - low1);
        }

        // Height gradient for cloud shape
        float getHeightGradient(float height, float cloudType) {
          float stratus = 1.0 - smoothstep(0.0, 0.3, height);
          float cumulus = smoothstep(0.0, 0.2, height) * (1.0 - smoothstep(0.3, 0.7, height));
          float cumulonimbus = smoothstep(0.0, 0.1, height) * (1.0 - smoothstep(0.5, 1.0, height));

          return mix(mix(stratus, cumulus, cloudType * 2.0), cumulonimbus, max(0.0, cloudType * 2.0 - 1.0));
        }

        // Sample cloud density at position
        float sampleCloudDensity(vec3 pos) {
          // Normalize height
          float height = (pos.y - cloudLayerBottom) / (cloudLayerTop - cloudLayerBottom);
          if (height < 0.0 || height > 1.0) return 0.0;

          // Weather map sample
          vec2 weatherUV = pos.xz * 0.00005;
          vec4 weather = texture2D(weatherMap, weatherUV);
          float weatherCoverage = weather.r * coverage;
          float weatherDensity = weather.g;
          float cloudType = weather.b;

          // Wind animation
          vec3 windOffset = vec3(windDirection.x, 0.0, windDirection.y) * windSpeed * time;
          vec3 samplePos = pos + windOffset;

          // Sample base shape
          vec3 baseUV = samplePos * cloudScale;
          vec4 baseNoise = texture(cloudNoise, baseUV);

          float baseShape = baseNoise.r;

          // Height gradient
          float heightGradient = getHeightGradient(height, cloudType);

          // Apply coverage
          float cloudDensity = remap(baseShape * heightGradient, 1.0 - weatherCoverage, 1.0, 0.0, 1.0);
          cloudDensity = max(0.0, cloudDensity);

          // Apply detail noise (erode edges)
          if (cloudDensity > 0.0) {
            vec3 detailUV = samplePos * detailScale;
            vec4 detailNoise = texture(cloudNoise, detailUV);
            float detail = detailNoise.g * 0.625 + detailNoise.b * 0.25 + detailNoise.a * 0.125;

            float detailModifier = mix(detail, 1.0 - detail, height);
            cloudDensity = remap(cloudDensity, detailModifier * 0.2, 1.0, 0.0, 1.0);
          }

          return max(0.0, cloudDensity * density * weatherDensity);
        }

        // Henyey-Greenstein phase function
        float hgPhase(float cosTheta, float g) {
          float g2 = g * g;
          return (1.0 - g2) / (4.0 * PI * pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5));
        }

        // Light marching — adaptive light steps (Law XV)
        float lightMarch(vec3 pos) {
          float totalDensity = 0.0;
          int lightLimit = int(clamp(uLightSteps, 1.0, float(LIGHT_STEPS)));
          float stepSize = (cloudLayerTop - cloudLayerBottom) / float(lightLimit);

          vec3 rayPos = pos;
          for (int i = 0; i < LIGHT_STEPS; i++) {
            if (i >= lightLimit) break;
            rayPos += sunDirection * stepSize;
            totalDensity += sampleCloudDensity(rayPos) * stepSize;
          }

          return exp(-totalDensity * lightAbsorption);
        }

        // Ray-sphere intersection
        vec2 raySphereIntersect(vec3 ro, vec3 rd, float radius) {
          float b = dot(ro, rd);
          float c = dot(ro, ro) - radius * radius;
          float d = b * b - c;
          if (d < 0.0) return vec2(-1.0);
          d = sqrt(d);
          return vec2(-b - d, -b + d);
        }

        float linearizeDepth(float depth) {
          float z = depth * 2.0 - 1.0;
          return (2.0 * uCameraNear * uCameraFar) / (uCameraFar + uCameraNear - z * (uCameraFar - uCameraNear));
        }

        void main() {
          // Reconstruct ray from screen position
          vec4 clipPos = vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
          vec4 viewPos = projectionMatrixInverse * clipPos;
          viewPos /= viewPos.w;

          vec3 rayDir = normalize((viewMatrixInverse * vec4(viewPos.xyz, 0.0)).xyz);
          vec3 rayOrigin = cameraPosition;

          // Calculate entry/exit points in cloud layer
          float earthRadius = 6371000.0;
          vec3 earthCenter = vec3(0.0, -earthRadius, 0.0);

          vec2 innerHit = raySphereIntersect(rayOrigin - earthCenter, rayDir, earthRadius + cloudLayerBottom);
          vec2 outerHit = raySphereIntersect(rayOrigin - earthCenter, rayDir, earthRadius + cloudLayerTop);

          float tMin = innerHit.y > 0.0 ? innerHit.y : 0.0;
          float tMax = outerHit.y;

          // Depth-aware: clamp volume exit to scene geometry (letter by)
          if (uDepthBlendEnabled > 0.5) {
            float rawDepth = texture2D(tSceneDepth, vUv).r;
            if (rawDepth < 0.9999) {
              float sceneZ = linearizeDepth(rawDepth);
              vec3 viewDir = normalize(viewPos.xyz);
              float sceneT = sceneZ / max(abs(viewDir.z), 1e-4);
              tMax = min(tMax, sceneT);
            }
          }

          if (tMax < 0.0 || tMin > tMax) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
          }

          // Ray march through cloud volume (adaptive MAX_STEPS via uMaxSteps)
          int stepLimit = int(clamp(uMaxSteps, 1.0, float(MAX_STEPS)));
          float stepSize = (tMax - tMin) / float(stepLimit);
          float transmittance = 1.0;
          vec3 scatteredLight = vec3(0.0);

          float cosAngle = dot(rayDir, sunDirection);
          float phase = mix(hgPhase(cosAngle, 0.8), hgPhase(cosAngle, -0.5), 0.5);

          float t = tMin;
          for (int i = 0; i < MAX_STEPS; i++) {
            if (i >= stepLimit) break;
            if (transmittance < 0.01) break;

            vec3 pos = rayOrigin + rayDir * t;
            float cloudDensity = sampleCloudDensity(pos);

            if (cloudDensity > 0.0) {
              float lightTransmittance = lightMarch(pos);

              // In-scattering
              vec3 S = cloudColor * (sunColor * lightTransmittance * phase + ambientColor);
              float extinction = cloudDensity * scatteringCoefficient;
              float clampedExtinction = max(extinction, 0.0001);

              // Beer-Lambert
              vec3 Sint = S * (1.0 - exp(-extinction * stepSize)) / clampedExtinction;
              scatteredLight += transmittance * Sint;
              transmittance *= exp(-extinction * stepSize);
            }

            t += stepSize;
          }

          gl_FragColor = vec4(scatteredLight, 1.0 - transmittance);
        }
      `;

export const CLOUD_SHADOW_VERTEX_SHADER = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

export const CLOUD_SHADOW_FRAGMENT_SHADER = `
        precision highp float;
        precision highp sampler3D;

        uniform sampler3D cloudNoise;
        uniform sampler2D weatherMap;
        uniform float time;
        uniform float coverage;
        uniform float density;
        uniform float cloudScale;
        uniform vec2 windDirection;
        uniform float windSpeed;
        uniform vec3 sunDirection;
        uniform float cloudLayerBottom;
        uniform float cloudLayerTop;

        varying vec2 vUv;

        void main() {
          // Calculate world position from shadow UV
          vec3 worldPos = vec3((vUv.x - 0.5) * 10000.0, cloudLayerBottom, (vUv.y - 0.5) * 10000.0);

          // Sample cloud at multiple heights
          float shadow = 0.0;
          int samples = 8;
          float stepSize = (cloudLayerTop - cloudLayerBottom) / float(samples);

          for (int i = 0; i < samples; i++) {
            vec3 pos = worldPos + vec3(0.0, float(i) * stepSize, 0.0);
            vec3 windOffset = vec3(windDirection.x, 0.0, windDirection.y) * windSpeed * time;

            vec3 samplePos = (pos + windOffset) * cloudScale;
            float cloudSample = texture(cloudNoise, samplePos).r;

            vec2 weatherUV = pos.xz * 0.00005;
            float weatherCoverage = texture2D(weatherMap, weatherUV).r * coverage;

            float cloudDensity = smoothstep(1.0 - weatherCoverage, 1.0, cloudSample);
            shadow += cloudDensity * density;
          }

          shadow = 1.0 - exp(-shadow * 0.5);

          gl_FragColor = vec4(shadow, shadow, 0.0, 1.0);
        }
      `;

export const GOD_RAYS_VERTEX_SHADER = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `;

export const GOD_RAYS_FRAGMENT_SHADER = `
        uniform sampler2D tDiffuse;
        uniform sampler2D tCloud;
        uniform vec2 sunPosition;
        uniform float intensity;
        uniform float decay;
        uniform float weight;
        /** Law XV adaptive sample count (letter by) — ceiling 100. */
        uniform float uSamples;
        /** 1 = additive rays only (scene already on screen); 0 = composite over tDiffuse. */
        uniform float uAdditiveOnly;

        varying vec2 vUv;

        void main() {
          int sampleLimit = int(clamp(uSamples, 1.0, 100.0));
          vec2 deltaUV = (vUv - sunPosition) / float(sampleLimit);
          vec2 uv = vUv;
          float illuminationDecay = 1.0;
          vec3 color = vec3(0.0);

          for (int i = 0; i < 100; i++) {
            if (i >= sampleLimit) break;

            uv -= deltaUV;
            vec4 cloudSample = texture2D(tCloud, uv);
            float occlusion = 1.0 - cloudSample.a;

            color += occlusion * illuminationDecay * weight;
            illuminationDecay *= decay;
          }

          vec3 rays = color * intensity;
          if (uAdditiveOnly > 0.5) {
            gl_FragColor = vec4(rays, 0.0);
          } else {
            vec4 baseColor = texture2D(tDiffuse, vUv);
            gl_FragColor = baseColor + vec4(rays, 0.0);
          }
        }
      `;
