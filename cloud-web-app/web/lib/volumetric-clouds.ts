/** @aethel-heavy-async-boundary Studio/volumetric-cloud runtime; do not import from public route shells. */
/** Volumetric cloud runtime using ray marching, weather maps, scattering and wind layers. */

import * as THREE from 'three';
import { CloudNoiseGenerator } from './volumetric-clouds.noise';

// ============================================================================
// TYPES
// ============================================================================

export interface CloudConfig {
  coverage: number;           // 0-1
  density: number;            // Cloud density multiplier
  cloudScale: number;         // Base scale of cloud shapes
  detailScale: number;        // Scale of detail noise
  cloudSpeed: number;         // Wind speed
  windDirection: THREE.Vector2;

  cloudLayerBottom: number;   // Lower bound of cloud layer
  cloudLayerTop: number;      // Upper bound of cloud layer

  lightAbsorption: number;    // How much light is absorbed
  scatteringCoefficient: number;

  sunColor: THREE.Color;
  ambientColor: THREE.Color;
  cloudColor: THREE.Color;

  godRaysEnabled: boolean;
  godRaysIntensity: number;

  shadowsEnabled: boolean;
  shadowIntensity: number;
}

// ============================================================================
// NOISE GENERATION
// ============================================================================

export { CloudNoiseGenerator, PerlinNoise3D, WorleyNoise3D } from './volumetric-clouds.noise';

// ============================================================================
// VOLUMETRIC CLOUD MATERIAL
// ============================================================================

export class VolumetricCloudMaterial extends THREE.ShaderMaterial {
  constructor(
    cloudNoiseTexture: THREE.Data3DTexture,
    weatherMapTexture: THREE.DataTexture,
    config: Partial<CloudConfig> = {}
  ) {
    super({
      uniforms: {
        // Textures
        cloudNoise: { value: cloudNoiseTexture },
        weatherMap: { value: weatherMapTexture },
        blueNoise: { value: null },

        // Camera
        cameraPosition: { value: new THREE.Vector3() },
        viewMatrix: { value: new THREE.Matrix4() },
        projectionMatrixInverse: { value: new THREE.Matrix4() },
        viewMatrixInverse: { value: new THREE.Matrix4() },

        // Cloud params
        coverage: { value: config.coverage ?? 0.5 },
        density: { value: config.density ?? 1.0 },
        cloudScale: { value: config.cloudScale ?? 0.001 },
        detailScale: { value: config.detailScale ?? 0.005 },

        cloudLayerBottom: { value: config.cloudLayerBottom ?? 1500 },
        cloudLayerTop: { value: config.cloudLayerTop ?? 4000 },

        // Animation
        time: { value: 0 },
        windDirection: { value: config.windDirection ?? new THREE.Vector2(1, 0) },
        windSpeed: { value: config.cloudSpeed ?? 10 },

        // Lighting
        sunDirection: { value: new THREE.Vector3(0.5, 0.7, 0.3).normalize() },
        sunColor: { value: config.sunColor ?? new THREE.Color(1.0, 0.95, 0.8) },
        ambientColor: { value: config.ambientColor ?? new THREE.Color(0.4, 0.5, 0.7) },
        cloudColor: { value: config.cloudColor ?? new THREE.Color(1, 1, 1) },

        lightAbsorption: { value: config.lightAbsorption ?? 0.5 },
        scatteringCoefficient: { value: config.scatteringCoefficient ?? 0.2 },

        // Resolution
        resolution: { value: new THREE.Vector2() }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
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

        varying vec2 vUv;

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

        // Light marching
        float lightMarch(vec3 pos) {
          float totalDensity = 0.0;
          float stepSize = (cloudLayerTop - cloudLayerBottom) / float(LIGHT_STEPS);

          vec3 rayPos = pos;
          for (int i = 0; i < LIGHT_STEPS; i++) {
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

          if (tMax < 0.0 || tMin > tMax) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
            return;
          }

          // Ray march through cloud volume
          float stepSize = (tMax - tMin) / float(MAX_STEPS);
          float transmittance = 1.0;
          vec3 scatteredLight = vec3(0.0);

          float cosAngle = dot(rayDir, sunDirection);
          float phase = mix(hgPhase(cosAngle, 0.8), hgPhase(cosAngle, -0.5), 0.5);

          float t = tMin;
          for (int i = 0; i < MAX_STEPS; i++) {
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
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide
    });
  }

  update(camera: THREE.Camera, dt: number): void {
    this.uniforms.time.value += dt;
    this.uniforms.cameraPosition.value.copy(camera.position);
    this.uniforms.viewMatrix.value.copy(camera.matrixWorldInverse);
    this.uniforms.projectionMatrixInverse.value.copy(
      (camera as THREE.PerspectiveCamera).projectionMatrixInverse
    );
    this.uniforms.viewMatrixInverse.value.copy(camera.matrixWorld);

    const canvas = document.querySelector('canvas');
    if (canvas) {
      this.uniforms.resolution.value.set(canvas.width, canvas.height);
    }
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.uniforms.sunDirection.value.copy(direction).normalize();
  }

  setCoverage(coverage: number): void {
    this.uniforms.coverage.value = Math.max(0, Math.min(1, coverage));
  }

  setDensity(density: number): void {
    this.uniforms.density.value = Math.max(0, density);
  }
}

// ============================================================================
// CLOUD SHADOW MAP
// ============================================================================

export class CloudShadowMap {
  private renderTarget: THREE.WebGLRenderTarget;
  private camera: THREE.OrthographicCamera;
  private scene: THREE.Scene;
  private material: THREE.ShaderMaterial;

  readonly texture: THREE.Texture;
  readonly size: number;

  constructor(size: number = 2048, cloudNoise: THREE.Data3DTexture, weatherMap: THREE.DataTexture) {
    this.size = size;

    this.renderTarget = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });

    this.texture = this.renderTarget.texture;

    // Orthographic camera for shadow projection
    const extent = 5000;
    this.camera = new THREE.OrthographicCamera(-extent, extent, extent, -extent, 1, 10000);

    this.scene = new THREE.Scene();

    // Create fullscreen quad with shadow material
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        cloudNoise: { value: cloudNoise },
        weatherMap: { value: weatherMap },
        time: { value: 0 },
        coverage: { value: 0.5 },
        density: { value: 1.0 },
        cloudScale: { value: 0.001 },
        windDirection: { value: new THREE.Vector2(1, 0) },
        windSpeed: { value: 10 },
        sunDirection: { value: new THREE.Vector3(0.5, 0.7, 0.3).normalize() },
        cloudLayerBottom: { value: 1500 },
        cloudLayerTop: { value: 4000 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
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
      `
    });

    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.material
    );
    this.scene.add(plane);
  }

  update(renderer: THREE.WebGLRenderer, sunDirection: THREE.Vector3, time: number): void {
    this.material.uniforms.time.value = time;
    this.material.uniforms.sunDirection.value.copy(sunDirection);

    const currentTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(this.renderTarget);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(currentTarget);
  }

  dispose(): void {
    this.renderTarget.dispose();
    this.material.dispose();
  }
}

// ============================================================================
// GOD RAYS
// ============================================================================

export class GodRaysPass {
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tCloud: { value: null },
        sunPosition: { value: new THREE.Vector2(0.5, 0.5) },
        intensity: { value: 1.0 },
        decay: { value: 0.96 },
        weight: { value: 0.4 },
        samples: { value: 100 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tCloud;
        uniform vec2 sunPosition;
        uniform float intensity;
        uniform float decay;
        uniform float weight;
        uniform int samples;

        varying vec2 vUv;

        void main() {
          vec2 deltaUV = (vUv - sunPosition) / float(samples);
          vec2 uv = vUv;
          float illuminationDecay = 1.0;
          vec3 color = vec3(0.0);

          for (int i = 0; i < 100; i++) {
            if (i >= samples) break;

            uv -= deltaUV;
            vec4 cloudSample = texture2D(tCloud, uv);
            float occlusion = 1.0 - cloudSample.a;

            color += occlusion * illuminationDecay * weight;
            illuminationDecay *= decay;
          }

          vec4 baseColor = texture2D(tDiffuse, vUv);
          gl_FragColor = baseColor + vec4(color * intensity, 0.0);
        }
      `
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  render(
    renderer: THREE.WebGLRenderer,
    inputTexture: THREE.Texture,
    cloudTexture: THREE.Texture,
    camera: THREE.Camera,
    sunDirection: THREE.Vector3,
    target: THREE.WebGLRenderTarget
  ): void {
    // Calculate sun screen position
    const sunPos = sunDirection.clone().multiplyScalar(10000);
    sunPos.project(camera);

    this.material.uniforms.tDiffuse.value = inputTexture;
    this.material.uniforms.tCloud.value = cloudTexture;
    this.material.uniforms.sunPosition.value.set(
      sunPos.x * 0.5 + 0.5,
      sunPos.y * 0.5 + 0.5
    );

    const currentTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(target);
    renderer.render(this.mesh, camera);
    renderer.setRenderTarget(currentTarget);
  }

  setIntensity(intensity: number): void {
    this.material.uniforms.intensity.value = intensity;
  }

  dispose(): void {
    this.material.dispose();
    this.mesh.geometry.dispose();
  }
}

// ============================================================================
// VOLUMETRIC CLOUD RENDERER
// ============================================================================

export class VolumetricCloudRenderer {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.WebGLRenderer;

  private cloudMaterial: VolumetricCloudMaterial;
  private cloudMesh: THREE.Mesh;
  private cloudNoiseTexture: THREE.Data3DTexture;
  private weatherMapTexture: THREE.DataTexture;

  private shadowMap: CloudShadowMap | null = null;
  private godRays: GodRaysPass | null = null;

  private config: CloudConfig;
  private time: number = 0;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<CloudConfig> = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.config = {
      coverage: config.coverage ?? 0.5,
      density: config.density ?? 1.0,
      cloudScale: config.cloudScale ?? 0.001,
      detailScale: config.detailScale ?? 0.005,
      cloudSpeed: config.cloudSpeed ?? 10,
      windDirection: config.windDirection ?? new THREE.Vector2(1, 0),
      cloudLayerBottom: config.cloudLayerBottom ?? 1500,
      cloudLayerTop: config.cloudLayerTop ?? 4000,
      lightAbsorption: config.lightAbsorption ?? 0.5,
      scatteringCoefficient: config.scatteringCoefficient ?? 0.2,
      sunColor: config.sunColor ?? new THREE.Color(1.0, 0.95, 0.8),
      ambientColor: config.ambientColor ?? new THREE.Color(0.4, 0.5, 0.7),
      cloudColor: config.cloudColor ?? new THREE.Color(1, 1, 1),
      godRaysEnabled: config.godRaysEnabled ?? true,
      godRaysIntensity: config.godRaysIntensity ?? 0.5,
      shadowsEnabled: config.shadowsEnabled ?? true,
      shadowIntensity: config.shadowIntensity ?? 0.5
    };

    // Generate noise textures
    const noiseGen = new CloudNoiseGenerator();
    this.cloudNoiseTexture = noiseGen.generate3DTexture(128);
    this.weatherMapTexture = noiseGen.generateWeatherMap(512);

    // Create cloud material
    this.cloudMaterial = new VolumetricCloudMaterial(
      this.cloudNoiseTexture,
      this.weatherMapTexture,
      this.config
    );

    // Create fullscreen quad for cloud rendering
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.cloudMesh = new THREE.Mesh(geometry, this.cloudMaterial);
    this.cloudMesh.frustumCulled = false;

    // Initialize shadow map
    if (this.config.shadowsEnabled) {
      this.shadowMap = new CloudShadowMap(2048, this.cloudNoiseTexture, this.weatherMapTexture);
    }

    // Initialize god rays
    if (this.config.godRaysEnabled) {
      this.godRays = new GodRaysPass();
      this.godRays.setIntensity(this.config.godRaysIntensity);
    }
  }

  update(dt: number): void {
    this.time += dt;
    this.cloudMaterial.update(this.camera, dt);

    // Update shadow map
    if (this.shadowMap) {
      const sunDir = this.cloudMaterial.uniforms.sunDirection.value;
      this.shadowMap.update(this.renderer, sunDir, this.time);
    }
  }

  render(): void {
    // Render clouds
    // In production, this would be integrated into the main render pipeline
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.render(this.cloudMesh, this.camera);
    this.renderer.setRenderTarget(currentTarget);
  }

  getMesh(): THREE.Mesh {
    return this.cloudMesh;
  }

  getShadowTexture(): THREE.Texture | null {
    return this.shadowMap?.texture ?? null;
  }

  setCoverage(coverage: number): void {
    this.config.coverage = Math.max(0, Math.min(1, coverage));
    this.cloudMaterial.setCoverage(this.config.coverage);
  }

  setDensity(density: number): void {
    this.config.density = Math.max(0, density);
    this.cloudMaterial.setDensity(this.config.density);
  }

  setSunDirection(direction: THREE.Vector3): void {
    this.cloudMaterial.setSunDirection(direction);
  }

  setSunColor(color: THREE.Color): void {
    this.cloudMaterial.uniforms.sunColor.value.copy(color);
  }

  setWindDirection(direction: THREE.Vector2): void {
    this.config.windDirection.copy(direction).normalize();
    this.cloudMaterial.uniforms.windDirection.value.copy(this.config.windDirection);
  }

  setWindSpeed(speed: number): void {
    this.config.cloudSpeed = Math.max(0, speed);
    this.cloudMaterial.uniforms.windSpeed.value = this.config.cloudSpeed;
  }

  dispose(): void {
    this.cloudNoiseTexture.dispose();
    this.weatherMapTexture.dispose();
    this.cloudMaterial.dispose();
    this.cloudMesh.geometry.dispose();
    this.shadowMap?.dispose();
    this.godRays?.dispose();
  }
}

// ============================================================================
// PRESETS
// ============================================================================

export const CLOUD_PRESETS = {
  clear: {
    coverage: 0.1,
    density: 0.5
  },

  partlyCloudy: {
    coverage: 0.4,
    density: 0.8
  },

  cloudy: {
    coverage: 0.7,
    density: 1.0
  },

  overcast: {
    coverage: 0.95,
    density: 1.2
  },

  stormy: {
    coverage: 0.9,
    density: 2.0,
    cloudColor: new THREE.Color(0.4, 0.4, 0.45)
  },

  sunset: {
    coverage: 0.5,
    density: 0.8,
    sunColor: new THREE.Color(1.0, 0.6, 0.3),
    cloudColor: new THREE.Color(1.0, 0.8, 0.6)
  },

  dramatic: {
    coverage: 0.6,
    density: 1.5,
    lightAbsorption: 0.7,
    godRaysIntensity: 1.0
  }
};

export default VolumetricCloudRenderer;
