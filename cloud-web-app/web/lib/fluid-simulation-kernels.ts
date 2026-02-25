import * as THREE from 'three';

export class SPHKernels {
  private h: number; // Smoothing radius
  private h2: number;
  private h3: number;
  private h6: number;
  private h9: number;
  
  private poly6Const: number;
  private spikyGradConst: number;
  private viscLaplConst: number;
  
  constructor(smoothingRadius: number) {
    this.h = smoothingRadius;
    this.h2 = this.h * this.h;
    this.h3 = this.h2 * this.h;
    this.h6 = this.h3 * this.h3;
    this.h9 = this.h6 * this.h3;
    
    this.poly6Const = 315 / (64 * Math.PI * this.h9);
    
    this.spikyGradConst = -45 / (Math.PI * this.h6);
    
    this.viscLaplConst = 45 / (Math.PI * this.h6);
  }
  
  poly6(r: number): number {
    if (r >= this.h) return 0;
    const diff = this.h2 - r * r;
    return this.poly6Const * diff * diff * diff;
  }
  
  spikyGradient(r: THREE.Vector3, dist: number): THREE.Vector3 {
    if (dist >= this.h || dist < 0.0001) {
      return new THREE.Vector3();
    }
    
    const diff = this.h - dist;
    const coeff = this.spikyGradConst * diff * diff / dist;
    
    return r.clone().multiplyScalar(coeff);
  }
  
  viscosityLaplacian(dist: number): number {
    if (dist >= this.h) return 0;
    return this.viscLaplConst * (this.h - dist);
  }
  
  cubicSpline(r: number): number {
    const q = r / this.h;
    const sigma = 8 / (Math.PI * this.h3);
    
    if (q >= 1) return 0;
    if (q >= 0.5) {
      const term = 1 - q;
      return sigma * 2 * term * term * term;
    }
    
    return sigma * (6 * q * q * q - 6 * q * q + 1);
  }
  
  cubicSplineGradient(r: THREE.Vector3, dist: number): THREE.Vector3 {
    if (dist >= this.h || dist < 0.0001) {
      return new THREE.Vector3();
    }
    
    const q = dist / this.h;
    const sigma = 48 / (Math.PI * this.h3);
    
    let grad: number;
    if (q >= 0.5) {
      const term = 1 - q;
      grad = -sigma * 6 * term * term / this.h;
    } else {
      grad = sigma * (18 * q * q - 12 * q) / this.h;
    }
    
    return r.clone().normalize().multiplyScalar(grad);
  }
  
  getSmoothingRadius(): number {
    return this.h;
  }
}
