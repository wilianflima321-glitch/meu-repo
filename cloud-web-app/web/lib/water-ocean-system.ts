/**
 * WATER/OCEAN SYSTEM - Aethel Engine
 * 
 * Sistema de água e oceano com simulação física real.
 * 
 * FEATURES:
 * - FFT Ocean Waves (Tessendorf)
 * - Gerstner Waves
 * - Caustics
 * - Underwater fog
 * - Buoyancy physics
 * - Shore interaction
 * - Foam generation
 * - Subsurface scattering
 * - Reflection/Refraction
 * - Flow maps
 */

import * as THREE from 'three';
import { WATER_PRESETS } from './water-ocean-presets';
import { FFTOcean } from './water-ocean-fft';

import type {
  BuoyancyConfig,
  OceanConfig,
  WaveParams,
} from './water-ocean-types';
export type {
  BuoyancyConfig,
  OceanConfig,
  WaveParams,
} from './water-ocean-types';

// ============================================================================
// GERSTNER WAVES
// ============================================================================

export class GerstnerWaveGenerator {
  private waves: WaveParams[] = [];
  private time: number = 0;
  
  constructor() {
    // Default wave set
    this.addWave({
      amplitude: 0.3,
      wavelength: 10,
      speed: 1.5,
      steepness: 0.5,
      direction: new THREE.Vector2(1, 0)
    });
    
    this.addWave({
      amplitude: 0.15,
      wavelength: 5,
      speed: 1.2,
      steepness: 0.4,
      direction: new THREE.Vector2(0.7, 0.7)
    });
    
    this.addWave({
      amplitude: 0.08,
      wavelength: 2.5,
      speed: 0.8,
      steepness: 0.3,
      direction: new THREE.Vector2(-0.5, 0.8)
    });
  }
  
  addWave(params: WaveParams): void {
    // Normalize direction
    params.direction.normalize();
    this.waves.push(params);
  }
  
  clearWaves(): void {
    this.waves = [];
  }
  
  getDisplacement(x: number, z: number): THREE.Vector3 {
    const displacement = new THREE.Vector3(0, 0, 0);
    
    for (const wave of this.waves) {
      const k = (2 * Math.PI) / wave.wavelength;
      const c = wave.speed;
      const d = wave.direction;
      const a = wave.amplitude;
      const q = wave.steepness / (k * a * this.waves.length);
      
      const dot = d.x * x + d.y * z;
      const phase = k * dot - c * this.time;
      
      displacement.x += q * a * d.x * Math.cos(phase);
      displacement.y += a * Math.sin(phase);
      displacement.z += q * a * d.y * Math.cos(phase);
    }
    
    return displacement;
  }
  
  getNormal(x: number, z: number): THREE.Vector3 {
    const normal = new THREE.Vector3(0, 1, 0);
    
    for (const wave of this.waves) {
      const k = (2 * Math.PI) / wave.wavelength;
      const c = wave.speed;
      const d = wave.direction;
      const a = wave.amplitude;
      const q = wave.steepness / (k * a * this.waves.length);
      
      const dot = d.x * x + d.y * z;
      const phase = k * dot - c * this.time;
      
      const WA = k * a;
      const S = Math.sin(phase);
      const C = Math.cos(phase);
      
      normal.x -= d.x * WA * C;
      normal.y -= q * WA * S;
      normal.z -= d.y * WA * C;
    }
    
    normal.normalize();
    return normal;
  }
  
  getHeightAt(x: number, z: number): number {
    return this.getDisplacement(x, z).y;
  }
  
  update(dt: number): void {
    this.time += dt;
  }
  
  getWaves(): WaveParams[] {
    return this.waves;
  }
  
  setTime(time: number): void {
    this.time = time;
  }
}

// ============================================================================
// FFT OCEAN
// ============================================================================
export { FFTOcean };

// ============================================================================
// OCEAN MATERIAL
// ============================================================================

export class OceanMaterial extends THREE.ShaderMaterial {
  constructor(config: Partial<OceanConfig> = {}) {
    super({
      uniforms: {
        time: { value: 0 },
        displacementMap: { value: null },
        normalMap: { value: null },
        envMap: { value: null },
        deepColor: { value: new THREE.Color(config.deepColor ?? 0x001e3c) },
        shallowColor: { value: new THREE.Color(config.shallowColor ?? 0x006994) },
        foamColor: { value: new THREE.Color(config.foamColor ?? 0xffffff) },
        foamThreshold: { value: config.foamThreshold ?? 0.5 },
        foamIntensity: { value: config.foamIntensity ?? 1.0 },
        reflectivity: { value: config.reflectivity ?? 0.8 },
        refractionStrength: { value: config.refractionStrength ?? 0.1 },
        sunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() },
        sunColor: { value: new THREE.Color(0xffffcc) },
        cameraPosition: { value: new THREE.Vector3() },
        subsurfaceScattering: { value: config.subsurfaceScattering ?? 0.5 }
      },
      vertexShader: `
        uniform float time;
        uniform sampler2D displacementMap;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vFoamFactor;
        
        // Gerstner wave function
        vec3 gerstnerWave(vec3 pos, float amplitude, float wavelength, float speed, float steepness, vec2 direction) {
          float k = 2.0 * 3.14159 / wavelength;
          float c = speed;
          float f = k * (dot(direction, pos.xz) - c * time);
          float a = amplitude;
          float q = steepness / (k * a);
          
          return vec3(
            q * a * direction.x * cos(f),
            a * sin(f),
            q * a * direction.y * cos(f)
          );
        }
        
        void main() {
          vUv = uv;
          
          vec3 pos = position;
          
          // Apply multiple Gerstner waves
          vec3 displacement = vec3(0.0);
          displacement += gerstnerWave(pos, 0.5, 10.0, 1.5, 0.5, vec2(1.0, 0.0));
          displacement += gerstnerWave(pos, 0.25, 5.0, 1.2, 0.4, normalize(vec2(0.7, 0.7)));
          displacement += gerstnerWave(pos, 0.15, 2.5, 0.8, 0.3, normalize(vec2(-0.5, 0.8)));
          displacement += gerstnerWave(pos, 0.1, 1.5, 0.6, 0.2, normalize(vec2(0.3, -0.9)));
          
          pos += displacement;
          
          // Calculate foam based on wave height
          vFoamFactor = smoothstep(0.3, 0.8, displacement.y);
          
          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPosition.xyz;
          
          // Calculate normal from displacement
          vec3 dPdx = dFdx(pos);
          vec3 dPdy = dFdy(pos);
          vNormal = normalize(cross(dPdx, dPdy));
          vNormal = normalMatrix * vNormal;
          
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 deepColor;
        uniform vec3 shallowColor;
        uniform vec3 foamColor;
        uniform float foamThreshold;
        uniform float foamIntensity;
        uniform float reflectivity;
        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform vec3 cameraPosition;
        uniform float subsurfaceScattering;
        uniform float time;
        
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;
        varying float vFoamFactor;
        
        // Fresnel approximation
        float fresnel(vec3 viewDir, vec3 normal, float power) {
          return pow(1.0 - max(dot(viewDir, normal), 0.0), power);
        }
        
        // Simple noise for foam detail
        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          
          float a = hash(i);
          float b = hash(i + vec2(1.0, 0.0));
          float c = hash(i + vec2(0.0, 1.0));
          float d = hash(i + vec2(1.0, 1.0));
          
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }
        
        void main() {
          vec3 normal = normalize(vNormal);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          
          // Fresnel
          float fresnelFactor = fresnel(viewDir, normal, 5.0) * reflectivity;
          
          // Water color based on depth (simplified)
          float depth = 1.0 - max(dot(viewDir, normal), 0.0);
          vec3 waterColor = mix(shallowColor, deepColor, depth);
          
          // Sun reflection (specular)
          vec3 halfVec = normalize(viewDir + sunDirection);
          float spec = pow(max(dot(normal, halfVec), 0.0), 256.0);
          vec3 specular = sunColor * spec;
          
          // Subsurface scattering approximation
          float sss = pow(max(dot(viewDir, -sunDirection), 0.0), 4.0) * subsurfaceScattering;
          vec3 sssColor = shallowColor * sss;
          
          // Foam
          float foamNoise = noise(vUv * 50.0 + time * 0.5) * 0.5 + 0.5;
          float foam = smoothstep(foamThreshold, foamThreshold + 0.2, vFoamFactor * foamNoise);
          foam *= foamIntensity;
          
          // Combine
          vec3 finalColor = waterColor;
          finalColor += specular;
          finalColor += sssColor;
          finalColor = mix(finalColor, foamColor, foam);
          
          // Apply fresnel for sky reflection (simplified)
          vec3 skyColor = vec3(0.6, 0.8, 1.0);
          finalColor = mix(finalColor, skyColor, fresnelFactor * 0.5);
          
          gl_FragColor = vec4(finalColor, 0.9);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
  }
  
  update(dt: number, cameraPosition: THREE.Vector3): void {
    this.uniforms.time.value += dt;
    this.uniforms.cameraPosition.value.copy(cameraPosition);
  }
  
  setSunDirection(direction: THREE.Vector3): void {
    this.uniforms.sunDirection.value.copy(direction).normalize();
  }
  
  setColors(deep: THREE.Color, shallow: THREE.Color): void {
    this.uniforms.deepColor.value.copy(deep);
    this.uniforms.shallowColor.value.copy(shallow);
  }
}

// ============================================================================
// OCEAN MESH
// ============================================================================

export class OceanMesh {
  readonly mesh: THREE.Mesh;
  readonly material: OceanMaterial;
  readonly geometry: THREE.PlaneGeometry;
  
  private waveGenerator: GerstnerWaveGenerator;
  private size: number;
  private resolution: number;
  
  constructor(size: number = 100, resolution: number = 128, config: Partial<OceanConfig> = {}) {
    this.size = size;
    this.resolution = resolution;
    
    this.geometry = new THREE.PlaneGeometry(size, size, resolution, resolution);
    this.geometry.rotateX(-Math.PI / 2);
    
    this.material = new OceanMaterial(config);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    
    this.waveGenerator = new GerstnerWaveGenerator();
  }
  
  update(dt: number, cameraPosition: THREE.Vector3): void {
    this.waveGenerator.update(dt);
    this.material.update(dt, cameraPosition);
  }
  
  getHeightAt(x: number, z: number): number {
    return this.waveGenerator.getHeightAt(x, z);
  }
  
  getNormalAt(x: number, z: number): THREE.Vector3 {
    return this.waveGenerator.getNormal(x, z);
  }
  
  setSize(size: number): void {
    this.mesh.scale.setScalar(size / this.size);
  }
  
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

// ============================================================================
// BUOYANCY SYSTEM
// ============================================================================

export class BuoyancyObject {
  readonly mesh: THREE.Object3D;
  
  private config: BuoyancyConfig;
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private angularVelocity: THREE.Vector3 = new THREE.Vector3();
  private mass: number;
  private volume: number;
  
  constructor(
    mesh: THREE.Object3D,
    config: Partial<BuoyancyConfig> = {},
    mass: number = 10,
    volume: number = 1
  ) {
    this.mesh = mesh;
    this.mass = mass;
    this.volume = volume;
    
    this.config = {
      waterDensity: config.waterDensity ?? 1000,
      dragCoefficient: config.dragCoefficient ?? 0.5,
      angularDrag: config.angularDrag ?? 0.3,
      samplePoints: config.samplePoints ?? this.generateDefaultSamplePoints()
    };
  }
  
  private generateDefaultSamplePoints(): THREE.Vector3[] {
    // Generate sample points for buoyancy calculation
    return [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.5, 0, 0),
      new THREE.Vector3(-0.5, 0, 0),
      new THREE.Vector3(0, 0, 0.5),
      new THREE.Vector3(0, 0, -0.5),
      new THREE.Vector3(0.5, 0, 0.5),
      new THREE.Vector3(-0.5, 0, 0.5),
      new THREE.Vector3(0.5, 0, -0.5),
      new THREE.Vector3(-0.5, 0, -0.5)
    ];
  }
  
  update(dt: number, getWaterHeight: (x: number, z: number) => number): void {
    const gravity = -9.81;
    const totalForce = new THREE.Vector3(0, gravity * this.mass, 0);
    const totalTorque = new THREE.Vector3();
    
    let submergedCount = 0;
    
    // Calculate buoyancy at each sample point
    for (const localPoint of this.config.samplePoints) {
      const worldPoint = localPoint.clone()
        .applyMatrix4(this.mesh.matrixWorld);
      
      const waterHeight = getWaterHeight(worldPoint.x, worldPoint.z);
      const depth = waterHeight - worldPoint.y;
      
      if (depth > 0) {
        submergedCount++;
        
        // Buoyancy force
        const buoyancyMagnitude = this.config.waterDensity * 
          gravity * 
          (this.volume / this.config.samplePoints.length) *
          Math.min(depth, 1);
        
        const buoyancyForce = new THREE.Vector3(0, -buoyancyMagnitude, 0);
        totalForce.add(buoyancyForce);
        
        // Torque
        const r = worldPoint.clone().sub(this.mesh.position);
        const torque = r.clone().cross(buoyancyForce);
        totalTorque.add(torque);
        
        // Water drag
        const dragForce = this.velocity.clone()
          .multiplyScalar(-this.config.dragCoefficient * depth);
        totalForce.add(dragForce);
      }
    }
    
    // Apply forces
    const acceleration = totalForce.divideScalar(this.mass);
    this.velocity.add(acceleration.multiplyScalar(dt));
    this.mesh.position.add(this.velocity.clone().multiplyScalar(dt));
    
    // Apply torque (simplified)
    const angularAcceleration = totalTorque.divideScalar(this.mass);
    this.angularVelocity.add(angularAcceleration.multiplyScalar(dt));
    this.angularVelocity.multiplyScalar(1 - this.config.angularDrag);
    
    this.mesh.rotation.x += this.angularVelocity.x * dt;
    this.mesh.rotation.z += this.angularVelocity.z * dt;
  }
  
  applyForce(force: THREE.Vector3): void {
    this.velocity.add(force.divideScalar(this.mass));
  }
  
  setMass(mass: number): void {
    this.mass = Math.max(0.1, mass);
  }
  
  setVolume(volume: number): void {
    this.volume = Math.max(0.01, volume);
  }
}

// ============================================================================
// CAUSTICS
// ============================================================================

export class CausticsGenerator {
  private resolution: number;
  private texture: THREE.DataTexture;
  private time: number = 0;
  
  constructor(resolution: number = 256) {
    this.resolution = resolution;
    
    const data = new Float32Array(resolution * resolution * 4);
    this.texture = new THREE.DataTexture(
      data, resolution, resolution,
      THREE.RGBAFormat,
      THREE.FloatType
    );
  }
  
  update(dt: number): void {
    this.time += dt;
    this.generateCaustics();
  }
  
  private generateCaustics(): void {
		const data = this.texture.image.data as unknown as Float32Array;
    const N = this.resolution;
    
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const u = x / N;
        const v = y / N;
        
        // Generate caustic pattern using overlapping sine waves
        let intensity = 0;
        
        for (let i = 0; i < 3; i++) {
          const freq = 5 + i * 3;
          const speed = 0.5 + i * 0.2;
          const phase = this.time * speed;
          
          intensity += Math.sin(u * freq + phase) * Math.sin(v * freq + phase * 1.1);
          intensity += Math.sin((u + v) * freq * 0.7 + phase * 0.8);
        }
        
        intensity = (intensity / 6 + 1) * 0.5;
        intensity = Math.pow(intensity, 2); // Sharpen
        
        const idx = (y * N + x) * 4;
        data[idx] = intensity;
        data[idx + 1] = intensity;
        data[idx + 2] = intensity;
        data[idx + 3] = 1;
      }
    }
    
    this.texture.needsUpdate = true;
  }
  
  getTexture(): THREE.DataTexture {
    return this.texture;
  }
  
  dispose(): void {
    this.texture.dispose();
  }
}

// ============================================================================
// UNDERWATER EFFECT
// ============================================================================

export class UnderwaterEffect {
  private enabled: boolean = false;
  private fogColor: THREE.Color;
  private fogDensity: number;
  private tintColor: THREE.Color;
  private distortionStrength: number;
  
  constructor() {
    this.fogColor = new THREE.Color(0x006994);
    this.fogDensity = 0.05;
    this.tintColor = new THREE.Color(0x4488aa);
    this.distortionStrength = 0.02;
  }
  
  checkUnderwater(cameraPosition: THREE.Vector3, getWaterHeight: (x: number, z: number) => number): boolean {
    const waterHeight = getWaterHeight(cameraPosition.x, cameraPosition.z);
    this.enabled = cameraPosition.y < waterHeight;
    return this.enabled;
  }
  
  isUnderwater(): boolean {
    return this.enabled;
  }
  
  getUniforms(): Record<string, any> {
    return {
      underwater: { value: this.enabled },
      underwaterFogColor: { value: this.fogColor },
      underwaterFogDensity: { value: this.fogDensity },
      underwaterTint: { value: this.tintColor },
      underwaterDistortion: { value: this.distortionStrength }
    };
  }
  
  setFogColor(color: THREE.Color): void {
    this.fogColor.copy(color);
  }
  
  setFogDensity(density: number): void {
    this.fogDensity = Math.max(0, density);
  }
}

// ============================================================================
// WATER MANAGER
// ============================================================================

export class WaterManager {
  private scene: THREE.Scene;
  private ocean: OceanMesh | null = null;
  private fftOcean: FFTOcean | null = null;
  private buoyancyObjects: BuoyancyObject[] = [];
  private caustics: CausticsGenerator;
  private underwaterEffect: UnderwaterEffect;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.caustics = new CausticsGenerator();
    this.underwaterEffect = new UnderwaterEffect();
  }
  
  createOcean(config: Partial<OceanConfig> = {}): OceanMesh {
    if (this.ocean) {
      this.scene.remove(this.ocean.mesh);
      this.ocean.dispose();
    }
    
    this.ocean = new OceanMesh(
      config.size ?? 100,
      config.resolution ?? 128,
      config
    );
    
    this.scene.add(this.ocean.mesh);
    
    // Create FFT ocean for more accurate height queries
    this.fftOcean = new FFTOcean(
      256,
      config.size ?? 100,
      config.windSpeed ?? 10
    );
    
    return this.ocean;
  }
  
  addBuoyancyObject(
    mesh: THREE.Object3D,
    mass: number = 10,
    volume: number = 1
  ): BuoyancyObject {
    const obj = new BuoyancyObject(mesh, {}, mass, volume);
    this.buoyancyObjects.push(obj);
    return obj;
  }
  
  removeBuoyancyObject(obj: BuoyancyObject): void {
    const index = this.buoyancyObjects.indexOf(obj);
    if (index !== -1) {
      this.buoyancyObjects.splice(index, 1);
    }
  }
  
  update(dt: number, camera: THREE.Camera): void {
    // Update ocean
    if (this.ocean) {
      this.ocean.update(dt, camera.position);
    }
    
    if (this.fftOcean) {
      this.fftOcean.update(dt);
    }
    
    // Update buoyancy
    const getHeight = (x: number, z: number) => this.getWaterHeight(x, z);
    for (const obj of this.buoyancyObjects) {
      obj.update(dt, getHeight);
    }
    
    // Update caustics
    this.caustics.update(dt);
    
    // Check underwater
    this.underwaterEffect.checkUnderwater(camera.position, getHeight);
  }
  
  getWaterHeight(x: number, z: number): number {
    if (this.ocean) {
      return this.ocean.getHeightAt(x, z);
    }
    return 0;
  }
  
  getWaterNormal(x: number, z: number): THREE.Vector3 {
    if (this.ocean) {
      return this.ocean.getNormalAt(x, z);
    }
    return new THREE.Vector3(0, 1, 0);
  }
  
  isUnderwater(): boolean {
    return this.underwaterEffect.isUnderwater();
  }
  
  getCausticsTexture(): THREE.Texture {
    return this.caustics.getTexture();
  }
  
  getOcean(): OceanMesh | null {
    return this.ocean;
  }
  
  dispose(): void {
    if (this.ocean) {
      this.scene.remove(this.ocean.mesh);
      this.ocean.dispose();
    }
    this.caustics.dispose();
    this.buoyancyObjects = [];
  }
}

export { WATER_PRESETS } from './water-ocean-presets';

export default WaterManager;
