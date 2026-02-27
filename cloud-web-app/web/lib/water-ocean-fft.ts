/**
 * FFT ocean simulation extracted from water-ocean-system.
 */

import * as THREE from 'three';

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
