/** Fluid simulation runtime core (SPH, PBF, FLIP). */

import * as THREE from 'three';

export interface FluidConfig {
  particleCount: number;
  particleRadius: number;
  smoothingRadius: number;
  restDensity: number;
  viscosity: number;
  surfaceTension: number;
  stiffness: number;
  gravity: THREE.Vector3;
  timeStep: number;
  iterations: number;
  boundaryDamping: number;
}

export interface FluidParticle {
  id: number;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  acceleration: THREE.Vector3;
  density: number;
  pressure: number;
  mass: number;
  color: THREE.Color;
  neighbors: number[];
  affineMatrix?: THREE.Matrix3;
}

export interface FluidBoundary {
  type: 'box' | 'sphere' | 'plane' | 'mesh';
  position: THREE.Vector3;
  size?: THREE.Vector3;
  radius?: number;
  normal?: THREE.Vector3;
  friction: number;
}

export interface GridCell {
  particles: number[];
  velocity: THREE.Vector3;
  pressure: number;
  marker: 'air' | 'fluid' | 'solid';
}

export interface SurfaceVertex {
  position: THREE.Vector3;
  normal: THREE.Vector3;
}

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

export class SpatialHashGrid {
  private cellSize: number;
  private cells: Map<string, number[]> = new Map();
  
  constructor(cellSize: number) {
    this.cellSize = cellSize;
  }
  
  clear(): void {
    this.cells.clear();
  }
  
  insert(particleId: number, position: THREE.Vector3): void {
    const key = this.getKey(position);
    
    if (!this.cells.has(key)) {
      this.cells.set(key, []);
    }
    
    this.cells.get(key)!.push(particleId);
  }
  
  getNeighbors(position: THREE.Vector3, radius: number): number[] {
    const neighbors: number[] = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    
    for (let dx = -cellRadius; dx <= cellRadius; dx++) {
      for (let dy = -cellRadius; dy <= cellRadius; dy++) {
        for (let dz = -cellRadius; dz <= cellRadius; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.cells.get(key);
          
          if (cell) {
            neighbors.push(...cell);
          }
        }
      }
    }
    
    return neighbors;
  }
  
  private getKey(position: THREE.Vector3): string {
    const cx = Math.floor(position.x / this.cellSize);
    const cy = Math.floor(position.y / this.cellSize);
    const cz = Math.floor(position.z / this.cellSize);
    return `${cx},${cy},${cz}`;
  }
}

export class SPHFluidSimulation {
  private config: FluidConfig;
  private particles: FluidParticle[] = [];
  private boundaries: FluidBoundary[] = [];
  private spatialGrid: SpatialHashGrid;
  private kernels: SPHKernels;
  
  constructor(config: Partial<FluidConfig> = {}) {
    this.config = {
      particleCount: 5000,
      particleRadius: 0.02,
      smoothingRadius: 0.08,
      restDensity: 1000, // Water density kg/m³
      viscosity: 0.001,
      surfaceTension: 0.0728, // Water surface tension
      stiffness: 50,
      gravity: new THREE.Vector3(0, -9.81, 0),
      timeStep: 0.001,
      iterations: 2,
      boundaryDamping: 0.3,
      ...config,
    };
    
    this.spatialGrid = new SpatialHashGrid(this.config.smoothingRadius);
    this.kernels = new SPHKernels(this.config.smoothingRadius);
  }
  
  initializeBox(
    min: THREE.Vector3,
    max: THREE.Vector3,
    color: THREE.Color = new THREE.Color(0.2, 0.5, 1)
  ): void {
    const spacing = this.config.particleRadius * 2;
    const volume = (max.x - min.x) * (max.y - min.y) * (max.z - min.z);
    const particleMass = (this.config.restDensity * volume) / this.config.particleCount;
    
    for (let x = min.x; x < max.x; x += spacing) {
      for (let y = min.y; y < max.y; y += spacing) {
        for (let z = min.z; z < max.z; z += spacing) {
          if (this.particles.length >= this.config.particleCount) break;
          
          const jitter = spacing * 0.1;
          
          this.particles.push({
            id: this.particles.length,
            position: new THREE.Vector3(
              x + (Math.random() - 0.5) * jitter,
              y + (Math.random() - 0.5) * jitter,
              z + (Math.random() - 0.5) * jitter
            ),
            velocity: new THREE.Vector3(),
            acceleration: new THREE.Vector3(),
            density: this.config.restDensity,
            pressure: 0,
            mass: particleMass,
            color: color.clone(),
            neighbors: [],
          });
        }
      }
    }
  }
  
  addBoundary(boundary: FluidBoundary): void {
    this.boundaries.push(boundary);
  }
  
  simulate(deltaTime: number): void {
    const steps = Math.ceil(deltaTime / this.config.timeStep);
    const dt = deltaTime / steps;
    
    for (let step = 0; step < steps; step++) {
      this.simulateStep(dt);
    }
  }
  
  private simulateStep(dt: number): void {
    this.spatialGrid.clear();
    for (const particle of this.particles) {
      this.spatialGrid.insert(particle.id, particle.position);
    }
    
    this.findNeighbors();
    
    this.computeDensityPressure();
    
    this.computeForces();
    
    this.integrate(dt);
    
    this.handleBoundaries();
  }
  
  private findNeighbors(): void {
    const radius = this.config.smoothingRadius;
    
    for (const particle of this.particles) {
      const candidateIds = this.spatialGrid.getNeighbors(particle.position, radius);
      particle.neighbors = [];
      
      for (const neighborId of candidateIds) {
        if (neighborId === particle.id) continue;
        
        const neighbor = this.particles[neighborId];
        const dist = particle.position.distanceTo(neighbor.position);
        
        if (dist < radius) {
          particle.neighbors.push(neighborId);
        }
      }
    }
  }
  
  private computeDensityPressure(): void {
    for (const particle of this.particles) {
      particle.density = particle.mass * this.kernels.poly6(0);
      
      for (const neighborId of particle.neighbors) {
        const neighbor = this.particles[neighborId];
        const dist = particle.position.distanceTo(neighbor.position);
        particle.density += neighbor.mass * this.kernels.poly6(dist);
      }
      
      const gamma = 7; // Stiffness parameter for water
      const B = this.config.stiffness * this.config.restDensity / gamma;
      
      particle.pressure = B * (
        Math.pow(particle.density / this.config.restDensity, gamma) - 1
      );
      
      if (particle.pressure < 0) {
        particle.pressure = 0;
      }
    }
  }
  
  private computeForces(): void {
    for (const particle of this.particles) {
      particle.acceleration.copy(this.config.gravity);
      
      const pressureForce = new THREE.Vector3();
      const viscosityForce = new THREE.Vector3();
      const surfaceTensionForce = new THREE.Vector3();
      
      const surfaceNormal = new THREE.Vector3();
      let colorFieldLaplacian = 0;
      
      for (const neighborId of particle.neighbors) {
        const neighbor = this.particles[neighborId];
        const r = particle.position.clone().sub(neighbor.position);
        const dist = r.length();
        
        if (dist < 0.0001) continue;
        
        const pressureTerm = (particle.pressure / (particle.density * particle.density) +
                             neighbor.pressure / (neighbor.density * neighbor.density));
        const spikyGrad = this.kernels.spikyGradient(r, dist);
        pressureForce.add(spikyGrad.multiplyScalar(-neighbor.mass * pressureTerm));
        
        const relVel = neighbor.velocity.clone().sub(particle.velocity);
        const viscLapl = this.kernels.viscosityLaplacian(dist);
        viscosityForce.add(
          relVel.multiplyScalar(this.config.viscosity * neighbor.mass * viscLapl / neighbor.density)
        );
        
        const poly6Grad = this.kernels.cubicSplineGradient(r, dist);
        surfaceNormal.add(poly6Grad.multiplyScalar(neighbor.mass / neighbor.density));
        colorFieldLaplacian += neighbor.mass * this.kernels.cubicSpline(dist) / neighbor.density;
      }
      
      particle.acceleration.add(pressureForce.multiplyScalar(particle.mass));
      particle.acceleration.add(viscosityForce);
      
      const surfaceNormalLength = surfaceNormal.length();
      if (surfaceNormalLength > 0.001) {
        surfaceTensionForce.copy(surfaceNormal.normalize())
          .multiplyScalar(-this.config.surfaceTension * colorFieldLaplacian / particle.mass);
        particle.acceleration.add(surfaceTensionForce);
      }
    }
  }
  
  private integrate(dt: number): void {
    for (const particle of this.particles) {
      particle.velocity.add(particle.acceleration.clone().multiplyScalar(dt));
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));
    }
  }
  
  private handleBoundaries(): void {
    for (const particle of this.particles) {
      for (const boundary of this.boundaries) {
        this.resolveBoundaryCollision(particle, boundary);
      }
    }
  }
  
  private resolveBoundaryCollision(particle: FluidParticle, boundary: FluidBoundary): void {
    const damping = this.config.boundaryDamping;
    
    if (boundary.type === 'box' && boundary.size) {
      const min = boundary.position.clone().sub(boundary.size.clone().multiplyScalar(0.5));
      const max = boundary.position.clone().add(boundary.size.clone().multiplyScalar(0.5));
      
      if (particle.position.x < min.x) {
        particle.position.x = min.x;
        particle.velocity.x *= -damping;
      } else if (particle.position.x > max.x) {
        particle.position.x = max.x;
        particle.velocity.x *= -damping;
      }
      
      if (particle.position.y < min.y) {
        particle.position.y = min.y;
        particle.velocity.y *= -damping;
      } else if (particle.position.y > max.y) {
        particle.position.y = max.y;
        particle.velocity.y *= -damping;
      }
      
      if (particle.position.z < min.z) {
        particle.position.z = min.z;
        particle.velocity.z *= -damping;
      } else if (particle.position.z > max.z) {
        particle.position.z = max.z;
        particle.velocity.z *= -damping;
      }
    } else if (boundary.type === 'sphere' && boundary.radius) {
      const diff = particle.position.clone().sub(boundary.position);
      const dist = diff.length();
      
      if (dist < boundary.radius) {
        const normal = diff.normalize();
        particle.position.copy(boundary.position.clone().add(
          normal.clone().multiplyScalar(boundary.radius)
        ));
        
        const vn = particle.velocity.dot(normal);
        if (vn < 0) {
          particle.velocity.sub(normal.clone().multiplyScalar(2 * vn));
          particle.velocity.multiplyScalar(damping);
        }
      }
    } else if (boundary.type === 'plane' && boundary.normal) {
      const normal = boundary.normal.clone().normalize();
      const d = particle.position.clone().sub(boundary.position).dot(normal);
      
      if (d < 0) {
        particle.position.sub(normal.clone().multiplyScalar(d));
        
        const vn = particle.velocity.dot(normal);
        if (vn < 0) {
          particle.velocity.sub(normal.clone().multiplyScalar(2 * vn));
          particle.velocity.multiplyScalar(damping);
        }
      }
    }
  }
  
  getParticles(): FluidParticle[] {
    return this.particles;
  }
  
  getParticlePositions(): Float32Array {
    const positions = new Float32Array(this.particles.length * 3);
    
    for (let i = 0; i < this.particles.length; i++) {
      positions[i * 3] = this.particles[i].position.x;
      positions[i * 3 + 1] = this.particles[i].position.y;
      positions[i * 3 + 2] = this.particles[i].position.z;
    }
    
    return positions;
  }
  
  getParticleVelocities(): Float32Array {
    const velocities = new Float32Array(this.particles.length * 3);
    
    for (let i = 0; i < this.particles.length; i++) {
      velocities[i * 3] = this.particles[i].velocity.x;
      velocities[i * 3 + 1] = this.particles[i].velocity.y;
      velocities[i * 3 + 2] = this.particles[i].velocity.z;
    }
    
    return velocities;
  }
  
  clear(): void {
    this.particles = [];
    this.boundaries = [];
    this.spatialGrid.clear();
  }
}

export class PBFFluidSimulation {
  private config: FluidConfig;
  private particles: FluidParticle[] = [];
  private boundaries: FluidBoundary[] = [];
  private spatialGrid: SpatialHashGrid;
  private kernels: SPHKernels;
  
  private lambdas: number[] = [];
  private deltaPositions: THREE.Vector3[] = [];
  private vorticityOmega: THREE.Vector3[] = [];
  
  constructor(config: Partial<FluidConfig> = {}) {
    this.config = {
      particleCount: 8000,
      particleRadius: 0.02,
      smoothingRadius: 0.1,
      restDensity: 1000,
      viscosity: 0.01,
      surfaceTension: 0.0728,
      stiffness: 0.0001, // Relaxation parameter (epsilon)
      gravity: new THREE.Vector3(0, -9.81, 0),
      timeStep: 0.0083, // 120 fps
      iterations: 4,
      boundaryDamping: 0.3,
      ...config,
    };
    
    this.spatialGrid = new SpatialHashGrid(this.config.smoothingRadius);
    this.kernels = new SPHKernels(this.config.smoothingRadius);
  }
  
  initializeParticles(positions: THREE.Vector3[], mass: number = 0.02): void {
    this.particles = positions.map((pos, i) => ({
      id: i,
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      acceleration: new THREE.Vector3(),
      density: this.config.restDensity,
      pressure: 0,
      mass,
      color: new THREE.Color(0.2, 0.5, 1),
      neighbors: [],
    }));
    
    this.lambdas = new Array(this.particles.length).fill(0);
    this.deltaPositions = this.particles.map(() => new THREE.Vector3());
    this.vorticityOmega = this.particles.map(() => new THREE.Vector3());
  }
  
  addBoundary(boundary: FluidBoundary): void {
    this.boundaries.push(boundary);
  }
  
  simulate(deltaTime: number): void {
    const dt = this.config.timeStep;
    const steps = Math.ceil(deltaTime / dt);
    
    for (let step = 0; step < steps; step++) {
      this.simulateStep(dt);
    }
  }
  
  private simulateStep(dt: number): void {
    for (const particle of this.particles) {
      particle.velocity.add(this.config.gravity.clone().multiplyScalar(dt));
    }
    
    for (const particle of this.particles) {
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));
    }
    
    this.spatialGrid.clear();
    for (const particle of this.particles) {
      this.spatialGrid.insert(particle.id, particle.position);
    }
    
    this.findNeighbors();
    
    for (let iter = 0; iter < this.config.iterations; iter++) {
      this.computeLambdas();
      this.computePositionCorrections();
      this.applyPositionCorrections();
    }
    
    for (const particle of this.particles) {
      particle.velocity.copy(
        particle.position.clone().sub(
          particle.position.clone().sub(particle.velocity.clone().multiplyScalar(dt))
        ).divideScalar(dt)
      );
    }
    
    this.applyVorticityConfinement(dt);
    
    this.applyXSPHViscosity();
    
    this.handleBoundaries();
  }
  
  private findNeighbors(): void {
    const radius = this.config.smoothingRadius;
    
    for (const particle of this.particles) {
      const candidateIds = this.spatialGrid.getNeighbors(particle.position, radius);
      particle.neighbors = [];
      
      for (const neighborId of candidateIds) {
        if (neighborId === particle.id) continue;
        
        const neighbor = this.particles[neighborId];
        const dist = particle.position.distanceTo(neighbor.position);
        
        if (dist < radius) {
          particle.neighbors.push(neighborId);
        }
      }
    }
  }
  
  private computeLambdas(): void {
    const epsilon = this.config.stiffness;
    
    for (const particle of this.particles) {
      particle.density = this.kernels.poly6(0);
      
      for (const neighborId of particle.neighbors) {
        const neighbor = this.particles[neighborId];
        const dist = particle.position.distanceTo(neighbor.position);
        particle.density += this.kernels.poly6(dist);
      }
      
      const C = particle.density / this.config.restDensity - 1;
      
      let gradientSum = 0;
      const gradientI = new THREE.Vector3();
      
      for (const neighborId of particle.neighbors) {
        const neighbor = this.particles[neighborId];
        const r = particle.position.clone().sub(neighbor.position);
        const dist = r.length();
        
        const gradientJ = this.kernels.spikyGradient(r, dist)
          .multiplyScalar(-1 / this.config.restDensity);
        
        gradientSum += gradientJ.lengthSq();
        gradientI.add(gradientJ.clone().negate());
      }
      
      gradientSum += gradientI.lengthSq();
      
      this.lambdas[particle.id] = -C / (gradientSum + epsilon);
    }
  }
  
  private computePositionCorrections(): void {
    const k = 0.0001; // Artificial pressure strength
    const n = 4; // Artificial pressure exponent
    const deltaQ = 0.1 * this.config.smoothingRadius;
    const wDeltaQ = this.kernels.poly6(deltaQ);
    
    for (const particle of this.particles) {
      this.deltaPositions[particle.id].set(0, 0, 0);
      
      for (const neighborId of particle.neighbors) {
        const neighbor = this.particles[neighborId];
        const r = particle.position.clone().sub(neighbor.position);
        const dist = r.length();
        
        const wij = this.kernels.poly6(dist);
        const scorr = -k * Math.pow(wij / wDeltaQ, n);
        
        const lambdaSum = this.lambdas[particle.id] + this.lambdas[neighborId] + scorr;
        const gradient = this.kernels.spikyGradient(r, dist);
        
        this.deltaPositions[particle.id].add(
          gradient.multiplyScalar(lambdaSum / this.config.restDensity)
        );
      }
    }
  }
  
  private applyPositionCorrections(): void {
    for (const particle of this.particles) {
      particle.position.add(this.deltaPositions[particle.id]);
    }
  }
  
  private applyVorticityConfinement(dt: number): void {
    const epsilon = 0.01; // Vorticity strength
    
    for (const particle of this.particles) {
      this.vorticityOmega[particle.id].set(0, 0, 0);
      
      for (const neighborId of particle.neighbors) {
        const neighbor = this.particles[neighborId];
        const r = particle.position.clone().sub(neighbor.position);
        const dist = r.length();
        
        const velDiff = neighbor.velocity.clone().sub(particle.velocity);
        const gradient = this.kernels.spikyGradient(r, dist);
        
        this.vorticityOmega[particle.id].add(
          velDiff.cross(gradient)
        );
      }
    }
    
    for (const particle of this.particles) {
      const omega = this.vorticityOmega[particle.id];
      const omegaMag = omega.length();
      
      if (omegaMag < 0.0001) continue;
      
      const gradOmega = new THREE.Vector3();
      
      for (const neighborId of particle.neighbors) {
        const neighbor = this.particles[neighborId];
        const r = particle.position.clone().sub(neighbor.position);
        const dist = r.length();
        
        const gradient = this.kernels.spikyGradient(r, dist);
        const neighborOmegaMag = this.vorticityOmega[neighborId].length();
        
        gradOmega.add(gradient.multiplyScalar(neighborOmegaMag));
      }
      
      if (gradOmega.length() < 0.0001) continue;
      
      const N = gradOmega.normalize();
      const vorticityForce = N.cross(omega).multiplyScalar(epsilon);
      
      particle.velocity.add(vorticityForce.multiplyScalar(dt));
    }
  }
  
  private applyXSPHViscosity(): void {
    const c = this.config.viscosity;
    
    for (const particle of this.particles) {
      const viscosityDelta = new THREE.Vector3();
      
      for (const neighborId of particle.neighbors) {
        const neighbor = this.particles[neighborId];
        const dist = particle.position.distanceTo(neighbor.position);
        
        const velDiff = neighbor.velocity.clone().sub(particle.velocity);
        const w = this.kernels.poly6(dist);
        
        viscosityDelta.add(velDiff.multiplyScalar(w / (particle.density + neighbor.density) * 2));
      }
      
      particle.velocity.add(viscosityDelta.multiplyScalar(c));
    }
  }
  
  private handleBoundaries(): void {
    for (const particle of this.particles) {
      for (const boundary of this.boundaries) {
        this.resolveBoundary(particle, boundary);
      }
    }
  }
  
  private resolveBoundary(particle: FluidParticle, boundary: FluidBoundary): void {
    const damping = this.config.boundaryDamping;
    
    if (boundary.type === 'box' && boundary.size) {
      const min = boundary.position.clone().sub(boundary.size.clone().multiplyScalar(0.5));
      const max = boundary.position.clone().add(boundary.size.clone().multiplyScalar(0.5));
      
      if (particle.position.x < min.x) {
        particle.position.x = min.x;
        particle.velocity.x *= -damping;
      } else if (particle.position.x > max.x) {
        particle.position.x = max.x;
        particle.velocity.x *= -damping;
      }
      
      if (particle.position.y < min.y) {
        particle.position.y = min.y;
        particle.velocity.y *= -damping;
      } else if (particle.position.y > max.y) {
        particle.position.y = max.y;
        particle.velocity.y *= -damping;
      }
      
      if (particle.position.z < min.z) {
        particle.position.z = min.z;
        particle.velocity.z *= -damping;
      } else if (particle.position.z > max.z) {
        particle.position.z = max.z;
        particle.velocity.z *= -damping;
      }
    }
  }
  
  getParticles(): FluidParticle[] {
    return this.particles;
  }
}

export class FLIPFluidSimulation {
  private config: FluidConfig;
  private particles: FluidParticle[] = [];
  private boundaries: FluidBoundary[] = [];
  
  private gridResolution: THREE.Vector3;
  private gridOrigin: THREE.Vector3;
  private cellSize: number;
  private grid: Map<string, GridCell>;
  
  private flipRatio: number = 0.95;
  
  constructor(config: Partial<FluidConfig> = {}, gridResolution: THREE.Vector3 = new THREE.Vector3(64, 64, 64)) {
    this.config = {
      particleCount: 10000,
      particleRadius: 0.01,
      smoothingRadius: 0.04,
      restDensity: 1000,
      viscosity: 0.001,
      surfaceTension: 0,
      stiffness: 1,
      gravity: new THREE.Vector3(0, -9.81, 0),
      timeStep: 0.005,
      iterations: 50, // Pressure solver iterations
      boundaryDamping: 0.5,
      ...config,
    };
    
    this.gridResolution = gridResolution;
    this.gridOrigin = new THREE.Vector3(-1, -1, -1);
    this.cellSize = 2 / gridResolution.x;
    this.grid = new Map();
  }
  
  initializeBox(min: THREE.Vector3, max: THREE.Vector3): void {
    const spacing = this.config.particleRadius * 1.5;
    
    for (let x = min.x; x < max.x; x += spacing) {
      for (let y = min.y; y < max.y; y += spacing) {
        for (let z = min.z; z < max.z; z += spacing) {
          if (this.particles.length >= this.config.particleCount) break;
          
          const jitter = spacing * 0.1;
          
          const particle: FluidParticle = {
            id: this.particles.length,
            position: new THREE.Vector3(
              x + (Math.random() - 0.5) * jitter,
              y + (Math.random() - 0.5) * jitter,
              z + (Math.random() - 0.5) * jitter
            ),
            velocity: new THREE.Vector3(),
            acceleration: new THREE.Vector3(),
            density: this.config.restDensity,
            pressure: 0,
            mass: 0.01,
            color: new THREE.Color(0.2, 0.5, 1),
            neighbors: [],
            affineMatrix: new THREE.Matrix3(),
          };
          
          this.particles.push(particle);
        }
      }
    }
  }
  
  addBoundary(boundary: FluidBoundary): void {
    this.boundaries.push(boundary);
  }
  
  simulate(deltaTime: number): void {
    const dt = this.config.timeStep;
    
    this.particleToGrid();
    
    this.applyExternalForces(dt);
    
    this.solvePressure();
    
    this.gridToParticle();
    
    this.advectParticles(dt);
    
    this.handleBoundaries();
  }
  
  private particleToGrid(): void {
    this.grid.clear();
    
    for (const particle of this.particles) {
      const cellI = this.worldToGrid(particle.position);
      
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          for (let dk = -1; dk <= 1; dk++) {
            const i = cellI.x + di;
            const j = cellI.y + dj;
            const k = cellI.z + dk;
            
            if (!this.isValidCell(i, j, k)) continue;
            
            const cellPos = this.gridToWorld(new THREE.Vector3(i, j, k));
            const weight = this.trilinearWeight(particle.position, cellPos);
            
            if (weight < 0.0001) continue;
            
            const key = this.cellKey(i, j, k);
            let cell = this.grid.get(key);
            
            if (!cell) {
              cell = {
                particles: [],
                velocity: new THREE.Vector3(),
                pressure: 0,
                marker: 'air',
              };
              this.grid.set(key, cell);
            }
            
            cell.particles.push(particle.id);
            
            cell.velocity.add(particle.velocity.clone().multiplyScalar(weight));
            cell.marker = 'fluid';
          }
        }
      }
    }
    
    for (const [, cell] of this.grid) {
      if (cell.particles.length > 0) {
        cell.velocity.divideScalar(cell.particles.length);
      }
    }
  }
  
  private applyExternalForces(dt: number): void {
    for (const [, cell] of this.grid) {
      if (cell.marker === 'fluid') {
        cell.velocity.add(this.config.gravity.clone().multiplyScalar(dt));
      }
    }
  }
  
  private solvePressure(): void {
    const invDx2 = 1 / (this.cellSize * this.cellSize);
    
    for (let iter = 0; iter < this.config.iterations; iter++) {
      for (const [key, cell] of this.grid) {
        if (cell.marker !== 'fluid') continue;
        
        const [i, j, k] = key.split(',').map(Number);
        
        const velRight = this.getGridVelocity(i + 1, j, k).x;
        const velLeft = this.getGridVelocity(i - 1, j, k).x;
        const velTop = this.getGridVelocity(i, j + 1, k).y;
        const velBottom = this.getGridVelocity(i, j - 1, k).y;
        const velFront = this.getGridVelocity(i, j, k + 1).z;
        const velBack = this.getGridVelocity(i, j, k - 1).z;
        
        const divergence = (velRight - velLeft + velTop - velBottom + velFront - velBack) / (2 * this.cellSize);
        
        const neighbors = this.countFluidNeighbors(i, j, k);
        if (neighbors > 0) {
          cell.pressure = -divergence * this.config.restDensity * this.cellSize / neighbors;
        }
      }
      
      for (const [key, cell] of this.grid) {
        if (cell.marker !== 'fluid') continue;
        
        const [i, j, k] = key.split(',').map(Number);
        
        const pRight = this.getGridPressure(i + 1, j, k);
        const pLeft = this.getGridPressure(i - 1, j, k);
        const pTop = this.getGridPressure(i, j + 1, k);
        const pBottom = this.getGridPressure(i, j - 1, k);
        const pFront = this.getGridPressure(i, j, k + 1);
        const pBack = this.getGridPressure(i, j, k - 1);
        
        const gradP = new THREE.Vector3(
          (pRight - pLeft) / (2 * this.cellSize),
          (pTop - pBottom) / (2 * this.cellSize),
          (pFront - pBack) / (2 * this.cellSize)
        );
        
        cell.velocity.sub(gradP.multiplyScalar(this.config.timeStep / this.config.restDensity));
      }
    }
  }
  
  private gridToParticle(): void {
    for (const particle of this.particles) {
      const cellI = this.worldToGrid(particle.position);
      
      const picVelocity = new THREE.Vector3();
      const flipVelocity = particle.velocity.clone();
      
      let totalWeight = 0;
      
      for (let di = -1; di <= 1; di++) {
        for (let dj = -1; dj <= 1; dj++) {
          for (let dk = -1; dk <= 1; dk++) {
            const i = cellI.x + di;
            const j = cellI.y + dj;
            const k = cellI.z + dk;
            
            const key = this.cellKey(i, j, k);
            const cell = this.grid.get(key);
            
            if (!cell || cell.marker !== 'fluid') continue;
            
            const cellPos = this.gridToWorld(new THREE.Vector3(i, j, k));
            const weight = this.trilinearWeight(particle.position, cellPos);
            
            picVelocity.add(cell.velocity.clone().multiplyScalar(weight));
            totalWeight += weight;
          }
        }
      }
      
      if (totalWeight > 0) {
        picVelocity.divideScalar(totalWeight);
        
        particle.velocity.lerp(picVelocity, 1 - this.flipRatio);
      }
    }
  }
  
  private advectParticles(dt: number): void {
    for (const particle of this.particles) {
      particle.position.add(particle.velocity.clone().multiplyScalar(dt));
    }
  }
  
  private handleBoundaries(): void {
    for (const particle of this.particles) {
      for (const boundary of this.boundaries) {
        if (boundary.type === 'box' && boundary.size) {
          const min = boundary.position.clone().sub(boundary.size.clone().multiplyScalar(0.5));
          const max = boundary.position.clone().add(boundary.size.clone().multiplyScalar(0.5));
          
          if (particle.position.x < min.x) {
            particle.position.x = min.x;
            particle.velocity.x *= -this.config.boundaryDamping;
          } else if (particle.position.x > max.x) {
            particle.position.x = max.x;
            particle.velocity.x *= -this.config.boundaryDamping;
          }
          
          if (particle.position.y < min.y) {
            particle.position.y = min.y;
            particle.velocity.y *= -this.config.boundaryDamping;
          } else if (particle.position.y > max.y) {
            particle.position.y = max.y;
            particle.velocity.y *= -this.config.boundaryDamping;
          }
          
          if (particle.position.z < min.z) {
            particle.position.z = min.z;
            particle.velocity.z *= -this.config.boundaryDamping;
          } else if (particle.position.z > max.z) {
            particle.position.z = max.z;
            particle.velocity.z *= -this.config.boundaryDamping;
          }
        }
      }
    }
  }
  
  private worldToGrid(pos: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      Math.floor((pos.x - this.gridOrigin.x) / this.cellSize),
      Math.floor((pos.y - this.gridOrigin.y) / this.cellSize),
      Math.floor((pos.z - this.gridOrigin.z) / this.cellSize)
    );
  }
  
  private gridToWorld(cell: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      this.gridOrigin.x + (cell.x + 0.5) * this.cellSize,
      this.gridOrigin.y + (cell.y + 0.5) * this.cellSize,
      this.gridOrigin.z + (cell.z + 0.5) * this.cellSize
    );
  }
  
  private isValidCell(i: number, j: number, k: number): boolean {
    return i >= 0 && i < this.gridResolution.x &&
           j >= 0 && j < this.gridResolution.y &&
           k >= 0 && k < this.gridResolution.z;
  }
  
  private cellKey(i: number, j: number, k: number): string {
    return `${i},${j},${k}`;
  }
  
  private trilinearWeight(pos: THREE.Vector3, cellPos: THREE.Vector3): number {
    const dx = Math.abs(pos.x - cellPos.x) / this.cellSize;
    const dy = Math.abs(pos.y - cellPos.y) / this.cellSize;
    const dz = Math.abs(pos.z - cellPos.z) / this.cellSize;
    
    if (dx > 1 || dy > 1 || dz > 1) return 0;
    
    return (1 - dx) * (1 - dy) * (1 - dz);
  }
  
  private getGridVelocity(i: number, j: number, k: number): THREE.Vector3 {
    const cell = this.grid.get(this.cellKey(i, j, k));
    return cell ? cell.velocity.clone() : new THREE.Vector3();
  }
  
  private getGridPressure(i: number, j: number, k: number): number {
    const cell = this.grid.get(this.cellKey(i, j, k));
    return cell ? cell.pressure : 0;
  }
  
  private countFluidNeighbors(i: number, j: number, k: number): number {
    let count = 0;
    const neighbors = [
      [i + 1, j, k], [i - 1, j, k],
      [i, j + 1, k], [i, j - 1, k],
      [i, j, k + 1], [i, j, k - 1],
    ];
    
    for (const [ni, nj, nk] of neighbors) {
      const cell = this.grid.get(this.cellKey(ni, nj, nk));
      if (cell && cell.marker === 'fluid') count++;
    }
    
    return count;
  }
  
  getParticles(): FluidParticle[] {
    return this.particles;
  }
  
  setFLIPRatio(ratio: number): void {
    this.flipRatio = Math.max(0, Math.min(1, ratio));
  }
}

export { FluidSurfaceReconstructor } from './fluid-surface-reconstructor';

export const createSPHFluid = (config?: Partial<FluidConfig>): SPHFluidSimulation => {
  return new SPHFluidSimulation(config);
};

export const createPBFFluid = (config?: Partial<FluidConfig>): PBFFluidSimulation => {
  return new PBFFluidSimulation(config);
};

export const createFLIPFluid = (config?: Partial<FluidConfig>, gridRes?: THREE.Vector3): FLIPFluidSimulation => {
  return new FLIPFluidSimulation(config, gridRes);
};
