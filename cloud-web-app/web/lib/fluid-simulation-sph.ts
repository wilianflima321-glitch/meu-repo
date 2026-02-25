/** SPH fluid runtime. */
import * as THREE from 'three';
import { SPHKernels } from './fluid-simulation-kernels';
import { SpatialHashGrid } from './fluid-simulation-spatial-hash';
import type { FluidBoundary, FluidConfig, FluidParticle } from './fluid-simulation-system.types';

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
      restDensity: 1000, // Water density kg/mÂ³
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

