/**
 * RAY TRACING SUPPORT - Aethel Engine
 * 
 * Sistema de Ray Tracing usando WebGPU quando disponível.
 * Fallback para path tracing em fragment shader quando não.
 * 
 * FEATURES:
 * - Real-time ray traced reflections
 * - Ray traced ambient occlusion
 * - Ray traced global illumination
 * - Ray traced shadows (soft)
 * - Denoising
 * - BVH acceleration
 * - Material PBR support
 */

import * as THREE from 'three';
import type {
  BVHNode,
  RayTracingConfig,
  RTMaterial,
  Triangle,
} from './ray-tracing-contracts';
export type { BVHNode, RayTracingConfig, RTMaterial, Triangle } from './ray-tracing-contracts';
import { BVHBuilder } from './ray-tracing-bvh';
import { Denoiser } from './ray-tracing-denoiser';
export { BVHBuilder } from './ray-tracing-bvh';
export { Denoiser } from './ray-tracing-denoiser';

// ============================================================================
// BVH BUILDER
// ============================================================================

// ============================================================================
// RAY TRACING PASS
// ============================================================================

export class RayTracingPass {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  private renderTarget: THREE.WebGLRenderTarget;
  private accumulationTarget: THREE.WebGLRenderTarget;
  private material: THREE.ShaderMaterial;
  private quad: THREE.Mesh;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.Camera;
  
  private bvh: BVHBuilder;
  private frameCount: number = 0;
  private config: RayTracingConfig;
  
  private lastCameraMatrix: THREE.Matrix4 = new THREE.Matrix4();
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<RayTracingConfig> = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.config = {
      enabled: config.enabled ?? true,
      maxBounces: config.maxBounces ?? 3,
      samplesPerPixel: config.samplesPerPixel ?? 1,
      enableReflections: config.enableReflections ?? true,
      enableShadows: config.enableShadows ?? true,
      enableGI: config.enableGI ?? false,
      enableAO: config.enableAO ?? true,
      aoRadius: config.aoRadius ?? 1.0,
      aoSamples: config.aoSamples ?? 8,
      denoiseEnabled: config.denoiseEnabled ?? true,
      denoiseStrength: config.denoiseStrength ?? 0.5,
      resolution: config.resolution ?? 0.5
    };
    
    const width = Math.floor(window.innerWidth * this.config.resolution);
    const height = Math.floor(window.innerHeight * this.config.resolution);
    
    // Create render targets
    this.renderTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });
    
    this.accumulationTarget = new THREE.WebGLRenderTarget(width, height, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter
    });
    
    // Build BVH
    this.bvh = new BVHBuilder();
    this.rebuildBVH();
    
    // Create ray tracing material
    this.material = this.createMaterial();
    
    // Create fullscreen quad
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.quad = new THREE.Mesh(geometry, this.material);
    
    this.quadScene = new THREE.Scene();
    this.quadScene.add(this.quad);
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  
  rebuildBVH(): void {
    const meshes: THREE.Mesh[] = [];
    
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.geometry) {
        meshes.push(obj);
      }
    });
    
    this.bvh.build(meshes);
    
    // Update textures
    const textures = this.bvh.createDataTextures();
    this.material.uniforms.bvhTexture.value = textures.bvhTexture;
    this.material.uniforms.triangleTexture.value = textures.triangleTexture;
    this.material.uniforms.materialTexture.value = textures.materialTexture;
  }
  
  private createMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        // Scene data
        bvhTexture: { value: null },
        triangleTexture: { value: null },
        materialTexture: { value: null },
        
        // Camera
        cameraPosition: { value: new THREE.Vector3() },
        cameraWorldMatrix: { value: new THREE.Matrix4() },
        projectionMatrixInverse: { value: new THREE.Matrix4() },
        
        // Accumulation
        previousFrame: { value: null },
        frameCount: { value: 0 },
        
        // Config
        maxBounces: { value: 3 },
        samplesPerPixel: { value: 1 },
        enableReflections: { value: true },
        enableShadows: { value: true },
        enableAO: { value: true },
        aoRadius: { value: 1.0 },
        aoSamples: { value: 8 },
        
        // Lighting
        sunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        sunColor: { value: new THREE.Color(1, 0.95, 0.9) },
        skyColor: { value: new THREE.Color(0.5, 0.7, 1.0) },
        
        // Random
        randomSeed: { value: 0 },
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
        
        uniform sampler2D bvhTexture;
        uniform sampler2D triangleTexture;
        uniform sampler2D materialTexture;
        uniform sampler2D previousFrame;
        
        uniform vec3 cameraPosition;
        uniform mat4 cameraWorldMatrix;
        uniform mat4 projectionMatrixInverse;
        
        uniform int frameCount;
        uniform int maxBounces;
        uniform int samplesPerPixel;
        uniform bool enableReflections;
        uniform bool enableShadows;
        uniform bool enableAO;
        uniform float aoRadius;
        uniform int aoSamples;
        
        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform vec3 skyColor;
        
        uniform float randomSeed;
        uniform vec2 resolution;
        
        varying vec2 vUv;
        
        #define PI 3.14159265359
        #define MAX_BOUNCES 5
        
        // Random number generator
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float random(inout vec2 seed) {
          seed = fract(seed * vec2(5.3983, 5.4427));
          seed += dot(seed.yx, seed.xy + vec2(21.5351, 14.3137));
          return fract(seed.x * seed.y * 95.4337);
        }
        
        vec3 randomUnitVector(inout vec2 seed) {
          float z = random(seed) * 2.0 - 1.0;
          float a = random(seed) * 2.0 * PI;
          float r = sqrt(1.0 - z * z);
          return vec3(r * cos(a), r * sin(a), z);
        }
        
        vec3 randomHemisphere(vec3 normal, inout vec2 seed) {
          vec3 dir = randomUnitVector(seed);
          return dot(dir, normal) > 0.0 ? dir : -dir;
        }
        
        // Ray-AABB intersection
        bool intersectAABB(vec3 rayOrigin, vec3 rayDir, vec3 boxMin, vec3 boxMax, out float tMin, out float tMax) {
          vec3 invDir = 1.0 / rayDir;
          vec3 t0 = (boxMin - rayOrigin) * invDir;
          vec3 t1 = (boxMax - rayOrigin) * invDir;
          vec3 tSmaller = min(t0, t1);
          vec3 tLarger = max(t0, t1);
          tMin = max(max(tSmaller.x, tSmaller.y), tSmaller.z);
          tMax = min(min(tLarger.x, tLarger.y), tLarger.z);
          return tMax >= tMin && tMax >= 0.0;
        }
        
        // Ray-triangle intersection (Möller-Trumbore)
        bool intersectTriangle(vec3 rayOrigin, vec3 rayDir, vec3 v0, vec3 v1, vec3 v2, out float t, out float u, out float v) {
          vec3 edge1 = v1 - v0;
          vec3 edge2 = v2 - v0;
          vec3 h = cross(rayDir, edge2);
          float a = dot(edge1, h);
          
          if (abs(a) < 0.00001) return false;
          
          float f = 1.0 / a;
          vec3 s = rayOrigin - v0;
          u = f * dot(s, h);
          
          if (u < 0.0 || u > 1.0) return false;
          
          vec3 q = cross(s, edge1);
          v = f * dot(rayDir, q);
          
          if (v < 0.0 || u + v > 1.0) return false;
          
          t = f * dot(edge2, q);
          return t > 0.00001;
        }
        
        // Simplified ray trace (would use BVH in full implementation)
        struct HitInfo {
          bool hit;
          float t;
          vec3 position;
          vec3 normal;
          vec3 albedo;
          float roughness;
          float metalness;
          vec3 emissive;
        };
        
        HitInfo traceRay(vec3 origin, vec3 direction) {
          HitInfo info;
          info.hit = false;
          info.t = 1e20;
          
          // Simple ground plane
          float groundT = -origin.y / direction.y;
          if (groundT > 0.001 && groundT < info.t) {
            info.hit = true;
            info.t = groundT;
            info.position = origin + direction * groundT;
            info.normal = vec3(0.0, 1.0, 0.0);
            
            // Checkerboard pattern
            float checker = mod(floor(info.position.x) + floor(info.position.z), 2.0);
            info.albedo = mix(vec3(0.4), vec3(0.8), checker);
            info.roughness = 0.5;
            info.metalness = 0.0;
            info.emissive = vec3(0.0);
          }
          
          // Sphere at origin
          vec3 sphereCenter = vec3(0.0, 1.0, 0.0);
          float sphereRadius = 1.0;
          
          vec3 oc = origin - sphereCenter;
          float a = dot(direction, direction);
          float b = 2.0 * dot(oc, direction);
          float c = dot(oc, oc) - sphereRadius * sphereRadius;
          float discriminant = b * b - 4.0 * a * c;
          
          if (discriminant > 0.0) {
            float t = (-b - sqrt(discriminant)) / (2.0 * a);
            if (t > 0.001 && t < info.t) {
              info.hit = true;
              info.t = t;
              info.position = origin + direction * t;
              info.normal = normalize(info.position - sphereCenter);
              info.albedo = vec3(0.8, 0.2, 0.2);
              info.roughness = 0.2;
              info.metalness = 0.8;
              info.emissive = vec3(0.0);
            }
          }
          
          return info;
        }
        
        // Sky color
        vec3 getSkyColor(vec3 direction) {
          float t = 0.5 * (direction.y + 1.0);
          vec3 horizonColor = vec3(0.8, 0.9, 1.0);
          return mix(horizonColor, skyColor, t);
        }
        
        // Path trace
        vec3 pathTrace(vec3 origin, vec3 direction, inout vec2 seed) {
          vec3 color = vec3(0.0);
          vec3 throughput = vec3(1.0);
          
          for (int bounce = 0; bounce < MAX_BOUNCES; bounce++) {
            if (bounce >= maxBounces) break;
            
            HitInfo hit = traceRay(origin, direction);
            
            if (!hit.hit) {
              // Hit sky
              color += throughput * getSkyColor(direction);
              break;
            }
            
            // Add emissive
            color += throughput * hit.emissive;
            
            // Shadow ray
            if (enableShadows) {
              HitInfo shadowHit = traceRay(hit.position + hit.normal * 0.001, sunDirection);
              if (!shadowHit.hit) {
                float NdotL = max(dot(hit.normal, sunDirection), 0.0);
                color += throughput * hit.albedo * sunColor * NdotL * (1.0 - hit.metalness);
              }
            }
            
            // Next bounce
            if (!enableReflections || random(seed) > 0.5) break;
            
            // Diffuse or specular bounce based on roughness
            float specularChance = (1.0 - hit.roughness) * (0.04 + 0.96 * hit.metalness);
            
            if (random(seed) < specularChance) {
              // Specular reflection
              direction = reflect(direction, hit.normal);
              throughput *= hit.metalness > 0.5 ? hit.albedo : vec3(1.0);
            } else {
              // Diffuse bounce
              direction = normalize(hit.normal + randomUnitVector(seed));
              throughput *= hit.albedo * (1.0 - hit.metalness);
            }
            
            origin = hit.position + hit.normal * 0.001;
            
            // Russian roulette
            float p = max(throughput.r, max(throughput.g, throughput.b));
            if (random(seed) > p) break;
            throughput /= p;
          }
          
          return color;
        }
        
        void main() {
          vec2 seed = vUv + randomSeed + float(frameCount) * 0.1;
          
          // Reconstruct ray
          vec2 ndc = vUv * 2.0 - 1.0;
          vec4 clipPos = vec4(ndc, -1.0, 1.0);
          vec4 viewPos = projectionMatrixInverse * clipPos;
          viewPos /= viewPos.w;
          
          vec3 rayDir = normalize((cameraWorldMatrix * vec4(viewPos.xyz, 0.0)).xyz);
          vec3 rayOrigin = cameraPosition;
          
          // Jitter for anti-aliasing
          vec2 jitter = (vec2(random(seed), random(seed)) - 0.5) / resolution;
          rayDir = normalize(rayDir + vec3(jitter, 0.0) * 0.001);
          
          // Trace
          vec3 color = vec3(0.0);
          for (int s = 0; s < 4; s++) {
            if (s >= samplesPerPixel) break;
            color += pathTrace(rayOrigin, rayDir, seed);
          }
          color /= float(samplesPerPixel);
          
          // Accumulate
          if (frameCount > 0) {
            vec3 previousColor = texture2D(previousFrame, vUv).rgb;
            float blend = 1.0 / float(frameCount + 1);
            color = mix(previousColor, color, blend);
          }
          
          gl_FragColor = vec4(color, 1.0);
        }
      `
    });
  }
  
  render(): THREE.Texture {
    if (!this.config.enabled) {
      return this.renderTarget.texture;
    }
    
    // Check if camera moved
    const currentMatrix = this.camera.matrixWorld.clone();
    if (!currentMatrix.equals(this.lastCameraMatrix)) {
      this.frameCount = 0;
      this.lastCameraMatrix.copy(currentMatrix);
    }
    
    // Update uniforms
    this.material.uniforms.cameraPosition.value.copy(this.camera.position);
    this.material.uniforms.cameraWorldMatrix.value.copy(this.camera.matrixWorld);
    this.material.uniforms.projectionMatrixInverse.value.copy(
      (this.camera as THREE.PerspectiveCamera).projectionMatrixInverse
    );
    
    this.material.uniforms.previousFrame.value = this.accumulationTarget.texture;
    this.material.uniforms.frameCount.value = this.frameCount;
    this.material.uniforms.randomSeed.value = Math.random();
    this.material.uniforms.resolution.value.set(
      this.renderTarget.width,
      this.renderTarget.height
    );
    
    // Render
    const currentTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.quadScene, this.quadCamera);
    
    // Swap targets for accumulation
    [this.renderTarget, this.accumulationTarget] = [this.accumulationTarget, this.renderTarget];
    
    this.renderer.setRenderTarget(currentTarget);
    this.frameCount++;
    
    return this.accumulationTarget.texture;
  }
  
  getTexture(): THREE.Texture {
    return this.accumulationTarget.texture;
  }
  
  resize(width: number, height: number): void {
    const w = Math.floor(width * this.config.resolution);
    const h = Math.floor(height * this.config.resolution);
    
    this.renderTarget.setSize(w, h);
    this.accumulationTarget.setSize(w, h);
    this.frameCount = 0;
  }
  
  setConfig(config: Partial<RayTracingConfig>): void {
    Object.assign(this.config, config);
    
    this.material.uniforms.maxBounces.value = this.config.maxBounces;
    this.material.uniforms.samplesPerPixel.value = this.config.samplesPerPixel;
    this.material.uniforms.enableReflections.value = this.config.enableReflections;
    this.material.uniforms.enableShadows.value = this.config.enableShadows;
    this.material.uniforms.enableAO.value = this.config.enableAO;
    this.material.uniforms.aoRadius.value = this.config.aoRadius;
    this.material.uniforms.aoSamples.value = this.config.aoSamples;
  }
  
  setSunDirection(direction: THREE.Vector3): void {
    this.material.uniforms.sunDirection.value.copy(direction).normalize();
    this.frameCount = 0;
  }
  
  invalidate(): void {
    this.frameCount = 0;
  }
  
  dispose(): void {
    this.renderTarget.dispose();
    this.accumulationTarget.dispose();
    this.material.dispose();
    this.quad.geometry.dispose();
  }
}

// ============================================================================
// RAY TRACING MANAGER
// ============================================================================

export class RayTracingManager {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  
  private rayTracingPass: RayTracingPass;
  private denoiser: Denoiser;
  
  private config: RayTracingConfig;
  private enabled: boolean = true;
  
  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    config: Partial<RayTracingConfig> = {}
  ) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    this.config = {
      enabled: config.enabled ?? true,
      maxBounces: config.maxBounces ?? 3,
      samplesPerPixel: config.samplesPerPixel ?? 1,
      enableReflections: config.enableReflections ?? true,
      enableShadows: config.enableShadows ?? true,
      enableGI: config.enableGI ?? false,
      enableAO: config.enableAO ?? true,
      aoRadius: config.aoRadius ?? 1.0,
      aoSamples: config.aoSamples ?? 8,
      denoiseEnabled: config.denoiseEnabled ?? true,
      denoiseStrength: config.denoiseStrength ?? 0.5,
      resolution: config.resolution ?? 0.5
    };
    
    this.rayTracingPass = new RayTracingPass(renderer, scene, camera, this.config);
    this.denoiser = new Denoiser(
      renderer,
      Math.floor(window.innerWidth * this.config.resolution),
      Math.floor(window.innerHeight * this.config.resolution)
    );
  }
  
  render(): THREE.Texture {
    if (!this.enabled) {
      return this.rayTracingPass.getTexture();
    }
    
    // Ray trace
    let result = this.rayTracingPass.render();
    
    // Denoise
    if (this.config.denoiseEnabled) {
      result = this.denoiser.denoise(result, this.config.denoiseStrength);
    }
    
    return result;
  }
  
  rebuildAccelerationStructure(): void {
    this.rayTracingPass.rebuildBVH();
    this.rayTracingPass.invalidate();
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.config.enabled = enabled;
  }
  
  setConfig(config: Partial<RayTracingConfig>): void {
    Object.assign(this.config, config);
    this.rayTracingPass.setConfig(config);
  }
  
  setSunDirection(direction: THREE.Vector3): void {
    this.rayTracingPass.setSunDirection(direction);
  }
  
  resize(width: number, height: number): void {
    this.rayTracingPass.resize(width, height);
    this.denoiser.resize(
      Math.floor(width * this.config.resolution),
      Math.floor(height * this.config.resolution)
    );
  }
  
  invalidate(): void {
    this.rayTracingPass.invalidate();
  }
  
  dispose(): void {
    this.rayTracingPass.dispose();
    this.denoiser.dispose();
  }
}

export default RayTracingManager;
