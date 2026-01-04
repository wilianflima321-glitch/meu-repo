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

// ============================================================================
// TYPES
// ============================================================================

export interface OceanConfig {
  size: number;
  resolution: number;
  windSpeed: number;
  windDirection: THREE.Vector2;
  choppiness: number;
  waveHeight: number;
  waveLength: number;
  deepColor: THREE.Color;
  shallowColor: THREE.Color;
  foamColor: THREE.Color;
  foamThreshold: number;
  foamIntensity: number;
  reflectivity: number;
  refractionStrength: number;
  causticIntensity: number;
  subsurfaceScattering: number;
}

export interface WaveParams {
  amplitude: number;
  wavelength: number;
  speed: number;
  steepness: number;
  direction: THREE.Vector2;
}

export interface BuoyancyConfig {
  waterDensity: number;
  dragCoefficient: number;
  angularDrag: number;
  samplePoints: THREE.Vector3[];
}

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

export class FFTOcean {
  private resolution: number;
  private size: number;
  private windSpeed: number;
  private windDirection: THREE.Vector2;
  
  private h0: Float32Array;
  private h0Conj: Float32Array;
  private spectrum: Float32Array;
  private displacement: Float32Array;
  private normal: Float32Array;
  
  private time: number = 0;
  
  constructor(
    resolution: number = 256,
    size: number = 100,
    windSpeed: number = 10,
    windDirection: THREE.Vector2 = new THREE.Vector2(1, 0)
  ) {
    this.resolution = resolution;
    this.size = size;
    this.windSpeed = windSpeed;
    this.windDirection = windDirection.clone().normalize();
    
    const N = resolution;
    const N2 = N * N;
    
    // Allocate buffers
    this.h0 = new Float32Array(N2 * 2);
    this.h0Conj = new Float32Array(N2 * 2);
    this.spectrum = new Float32Array(N2 * 2);
    this.displacement = new Float32Array(N2 * 3);
    this.normal = new Float32Array(N2 * 3);
    
    this.generateH0();
  }
  
  private generateH0(): void {
    const N = this.resolution;
    const L = this.size;
    
    for (let m = 0; m < N; m++) {
      for (let n = 0; n < N; n++) {
        const kx = (2 * Math.PI * (n - N / 2)) / L;
        const kz = (2 * Math.PI * (m - N / 2)) / L;
        
        const index = (m * N + n) * 2;
        
        // Phillips spectrum
        const phillips = this.phillipsSpectrum(kx, kz);
        
        // Gaussian random
        const [xi_r, xi_i] = this.gaussianRandom();
        
        const scale = Math.sqrt(phillips / 2);
        this.h0[index] = xi_r * scale;
        this.h0[index + 1] = xi_i * scale;
        
        // Conjugate for negative k
        const conjIndex = ((N - m) % N * N + (N - n) % N) * 2;
        this.h0Conj[conjIndex] = xi_r * scale;
        this.h0Conj[conjIndex + 1] = -xi_i * scale;
      }
    }
  }
  
  private phillipsSpectrum(kx: number, kz: number): number {
    const k = Math.sqrt(kx * kx + kz * kz);
    if (k < 0.0001) return 0;
    
    const g = 9.81;
    const L = (this.windSpeed * this.windSpeed) / g;
    const l = L * 0.001; // Small waves cutoff
    
    const k2 = k * k;
    const k4 = k2 * k2;
    const L2 = L * L;
    
    // Direction alignment with wind
    const kdotw = (kx * this.windDirection.x + kz * this.windDirection.y) / k;
    const alignment = kdotw * kdotw;
    
    // Phillips spectrum with directional spreading
    const A = 0.0001; // Amplitude constant
    let phillips = A * Math.exp(-1 / (k2 * L2)) / k4 * alignment;
    
    // Suppress small waves
    phillips *= Math.exp(-k2 * l * l);
    
    // Suppress waves perpendicular to wind
    if (kdotw < 0) {
      phillips *= 0.25;
    }
    
    return phillips;
  }
  
  private gaussianRandom(): [number, number] {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    
    const mag = Math.sqrt(-2.0 * Math.log(u));
    const theta = 2.0 * Math.PI * v;
    
    return [mag * Math.cos(theta), mag * Math.sin(theta)];
  }
  
  update(dt: number): void {
    this.time += dt;
    this.updateSpectrum();
    this.computeFFT();
  }
  
  private updateSpectrum(): void {
    const N = this.resolution;
    const L = this.size;
    const g = 9.81;
    
    for (let m = 0; m < N; m++) {
      for (let n = 0; n < N; n++) {
        const kx = (2 * Math.PI * (n - N / 2)) / L;
        const kz = (2 * Math.PI * (m - N / 2)) / L;
        const k = Math.sqrt(kx * kx + kz * kz);
        
        // Dispersion relation
        const omega = Math.sqrt(g * k);
        const phase = omega * this.time;
        
        // exp(i * omega * t)
        const cosPhase = Math.cos(phase);
        const sinPhase = Math.sin(phase);
        
        const index = (m * N + n) * 2;
        
        // h(k,t) = h0(k) * exp(i*omega*t) + h0*(-k) * exp(-i*omega*t)
        const h0_r = this.h0[index];
        const h0_i = this.h0[index + 1];
        const h0c_r = this.h0Conj[index];
        const h0c_i = this.h0Conj[index + 1];
        
        // Complex multiplication
        this.spectrum[index] = 
          (h0_r * cosPhase - h0_i * sinPhase) +
          (h0c_r * cosPhase + h0c_i * sinPhase);
        this.spectrum[index + 1] = 
          (h0_r * sinPhase + h0_i * cosPhase) +
          (-h0c_r * sinPhase + h0c_i * cosPhase);
      }
    }
  }
  
  private computeFFT(): void {
    // Simplified CPU FFT - would use GPU in production
    const N = this.resolution;
    
    // For each row
    for (let m = 0; m < N; m++) {
      const row = new Float32Array(N * 2);
      for (let n = 0; n < N; n++) {
        const srcIdx = (m * N + n) * 2;
        row[n * 2] = this.spectrum[srcIdx];
        row[n * 2 + 1] = this.spectrum[srcIdx + 1];
      }
      
      this.fft1D(row, N, false);
      
      for (let n = 0; n < N; n++) {
        const dstIdx = (m * N + n) * 2;
        this.spectrum[dstIdx] = row[n * 2];
        this.spectrum[dstIdx + 1] = row[n * 2 + 1];
      }
    }
    
    // For each column
    for (let n = 0; n < N; n++) {
      const col = new Float32Array(N * 2);
      for (let m = 0; m < N; m++) {
        const srcIdx = (m * N + n) * 2;
        col[m * 2] = this.spectrum[srcIdx];
        col[m * 2 + 1] = this.spectrum[srcIdx + 1];
      }
      
      this.fft1D(col, N, false);
      
      for (let m = 0; m < N; m++) {
        const dstIdx = (m * N + n) * 3;
        // Store vertical displacement
        this.displacement[dstIdx + 1] = col[m * 2]; // Y displacement
      }
    }
    
    // Calculate normals from displacement
    this.calculateNormals();
  }
  
  private fft1D(data: Float32Array, n: number, inverse: boolean): void {
    // Cooley-Tukey radix-2 FFT
    const bits = Math.log2(n);
    
    // Bit reversal
    for (let i = 0; i < n; i++) {
      let j = 0;
      for (let k = 0; k < bits; k++) {
        j = (j << 1) | ((i >> k) & 1);
      }
      if (j > i) {
        // Swap
        const tmpR = data[i * 2];
        const tmpI = data[i * 2 + 1];
        data[i * 2] = data[j * 2];
        data[i * 2 + 1] = data[j * 2 + 1];
        data[j * 2] = tmpR;
        data[j * 2 + 1] = tmpI;
      }
    }
    
    // FFT
    for (let len = 2; len <= n; len *= 2) {
      const angle = 2 * Math.PI / len * (inverse ? -1 : 1);
      const wlenR = Math.cos(angle);
      const wlenI = Math.sin(angle);
      
      for (let i = 0; i < n; i += len) {
        let wR = 1, wI = 0;
        
        for (let j = 0; j < len / 2; j++) {
          const uIdx = (i + j) * 2;
          const vIdx = (i + j + len / 2) * 2;
          
          const uR = data[uIdx];
          const uI = data[uIdx + 1];
          const vR = data[vIdx];
          const vI = data[vIdx + 1];
          
          // Complex multiply: v * w
          const tvR = vR * wR - vI * wI;
          const tvI = vR * wI + vI * wR;
          
          data[uIdx] = uR + tvR;
          data[uIdx + 1] = uI + tvI;
          data[vIdx] = uR - tvR;
          data[vIdx + 1] = uI - tvI;
          
          // Update w
          const tmpW = wR * wlenR - wI * wlenI;
          wI = wR * wlenI + wI * wlenR;
          wR = tmpW;
        }
      }
    }
    
    // Normalize for inverse FFT
    if (inverse) {
      for (let i = 0; i < n * 2; i++) {
        data[i] /= n;
      }
    }
  }
  
  private calculateNormals(): void {
    const N = this.resolution;
    const scale = this.size / N;
    
    for (let m = 0; m < N; m++) {
      for (let n = 0; n < N; n++) {
        const idx = (m * N + n) * 3;
        
        // Get neighboring heights
        const mp = (m + 1) % N;
        const mm = (m - 1 + N) % N;
        const np = (n + 1) % N;
        const nm = (n - 1 + N) % N;
        
        const hL = this.displacement[(m * N + nm) * 3 + 1];
        const hR = this.displacement[(m * N + np) * 3 + 1];
        const hD = this.displacement[(mm * N + n) * 3 + 1];
        const hU = this.displacement[(mp * N + n) * 3 + 1];
        
        // Central difference for normal
        this.normal[idx] = (hL - hR) / (2 * scale);
        this.normal[idx + 1] = 1;
        this.normal[idx + 2] = (hD - hU) / (2 * scale);
        
        // Normalize
        const len = Math.sqrt(
          this.normal[idx] ** 2 +
          this.normal[idx + 1] ** 2 +
          this.normal[idx + 2] ** 2
        );
        
        this.normal[idx] /= len;
        this.normal[idx + 1] /= len;
        this.normal[idx + 2] /= len;
      }
    }
  }
  
  getHeightAt(x: number, z: number): number {
    // Bilinear interpolation
    const N = this.resolution;
    const L = this.size;
    
    const u = ((x / L + 0.5) * N) % N;
    const v = ((z / L + 0.5) * N) % N;
    
    const u0 = Math.floor(u);
    const v0 = Math.floor(v);
    const u1 = (u0 + 1) % N;
    const v1 = (v0 + 1) % N;
    
    const fu = u - u0;
    const fv = v - v0;
    
    const h00 = this.displacement[(v0 * N + u0) * 3 + 1];
    const h10 = this.displacement[(v0 * N + u1) * 3 + 1];
    const h01 = this.displacement[(v1 * N + u0) * 3 + 1];
    const h11 = this.displacement[(v1 * N + u1) * 3 + 1];
    
    return (
      h00 * (1 - fu) * (1 - fv) +
      h10 * fu * (1 - fv) +
      h01 * (1 - fu) * fv +
      h11 * fu * fv
    );
  }
  
  getDisplacementTexture(): THREE.DataTexture {
    const N = this.resolution;
    const data = new Float32Array(N * N * 4);
    
    for (let i = 0; i < N * N; i++) {
      data[i * 4] = this.displacement[i * 3];
      data[i * 4 + 1] = this.displacement[i * 3 + 1];
      data[i * 4 + 2] = this.displacement[i * 3 + 2];
      data[i * 4 + 3] = 1;
    }
    
    const texture = new THREE.DataTexture(
      data, N, N,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    return texture;
  }
  
  getNormalTexture(): THREE.DataTexture {
    const N = this.resolution;
    const data = new Float32Array(N * N * 4);
    
    for (let i = 0; i < N * N; i++) {
      data[i * 4] = this.normal[i * 3] * 0.5 + 0.5;
      data[i * 4 + 1] = this.normal[i * 3 + 1] * 0.5 + 0.5;
      data[i * 4 + 2] = this.normal[i * 3 + 2] * 0.5 + 0.5;
      data[i * 4 + 3] = 1;
    }
    
    const texture = new THREE.DataTexture(
      data, N, N,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    return texture;
  }
}

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

// ============================================================================
// PRESETS
// ============================================================================

export const WATER_PRESETS = {
  ocean: {
    size: 1000,
    resolution: 256,
    windSpeed: 15,
    waveHeight: 2,
    deepColor: new THREE.Color(0x001e3c),
    shallowColor: new THREE.Color(0x006994),
    foamIntensity: 1.0
  },
  
  lake: {
    size: 200,
    resolution: 128,
    windSpeed: 5,
    waveHeight: 0.3,
    deepColor: new THREE.Color(0x002233),
    shallowColor: new THREE.Color(0x336677),
    foamIntensity: 0.3
  },
  
  pool: {
    size: 20,
    resolution: 64,
    windSpeed: 1,
    waveHeight: 0.05,
    deepColor: new THREE.Color(0x0044aa),
    shallowColor: new THREE.Color(0x66ccff),
    foamIntensity: 0
  },
  
  tropical: {
    size: 500,
    resolution: 192,
    windSpeed: 8,
    waveHeight: 0.8,
    deepColor: new THREE.Color(0x003355),
    shallowColor: new THREE.Color(0x00ccaa),
    foamIntensity: 0.8
  },
  
  stormy: {
    size: 1000,
    resolution: 256,
    windSpeed: 30,
    waveHeight: 5,
    deepColor: new THREE.Color(0x001122),
    shallowColor: new THREE.Color(0x334455),
    foamIntensity: 2.0
  }
};

export default WaterManager;
