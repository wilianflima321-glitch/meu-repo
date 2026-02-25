/** PBF fluid runtime. */
import * as THREE from 'three';
import { SPHKernels } from './fluid-simulation-kernels';
import { SpatialHashGrid } from './fluid-simulation-spatial-hash';
import type { FluidBoundary, FluidConfig, FluidParticle } from './fluid-simulation-system.types';

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

