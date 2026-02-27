import * as THREE from 'three';
import type { FluidParams, FluidParticle } from './fluid-simulation.types';

export class SPHFluidSimulation {
  particles: FluidParticle[] = [];
  params: FluidParams;

  private kernelPoly6Coeff: number = 0;
  private kernelSpikyCoeff: number = 0;
  private kernelViscosityCoeff: number = 0;

  constructor(params: FluidParams) {
    this.params = params;
    this.updateKernelCoefficients();
    this.initializeParticles();
  }

  private updateKernelCoefficients(): void {
    const h = this.params.smoothingRadius;
    const h2 = h * h;
    const h3 = h2 * h;
    const h6 = h3 * h3;
    const h9 = h6 * h3;

    this.kernelPoly6Coeff = 315 / (64 * Math.PI * h9);
    this.kernelSpikyCoeff = -45 / (Math.PI * h6);
    this.kernelViscosityCoeff = 45 / (Math.PI * h6);
  }

  initializeParticles(): void {
    this.particles = [];
    const { particleCount, boundarySize, boundaryPosition } = this.params;

    const volume = boundarySize.x * boundarySize.y * boundarySize.z;
    const particleVolume = volume / particleCount;
    const spacing = Math.pow(particleVolume, 1 / 3) * 0.8;

    const startX = boundaryPosition.x - boundarySize.x / 2 + spacing;
    const startY = boundaryPosition.y - boundarySize.y / 2 + spacing;
    const startZ = boundaryPosition.z - boundarySize.z / 2 + spacing;

    let id = 0;
    for (
      let x = startX;
      x < boundaryPosition.x + boundarySize.x / 2 - spacing && id < particleCount;
      x += spacing
    ) {
      for (
        let y = startY;
        y < boundaryPosition.y + boundarySize.y / 2 - spacing && id < particleCount;
        y += spacing
      ) {
        for (
          let z = startZ;
          z < boundaryPosition.z + boundarySize.z / 2 - spacing && id < particleCount;
          z += spacing
        ) {
          const jitter = spacing * 0.1;
          const particle: FluidParticle = {
            id: id++,
            position: new THREE.Vector3(
              x + (Math.random() - 0.5) * jitter,
              y + (Math.random() - 0.5) * jitter,
              z + (Math.random() - 0.5) * jitter
            ),
            velocity: new THREE.Vector3(0, 0, 0),
            acceleration: new THREE.Vector3(0, 0, 0),
            density: this.params.restDensity,
            pressure: 0,
            mass: 1,
          };
          this.particles.push(particle);
        }
      }
    }

    while (this.particles.length < particleCount) {
      const particle: FluidParticle = {
        id: this.particles.length,
        position: new THREE.Vector3(
          boundaryPosition.x + (Math.random() - 0.5) * boundarySize.x * 0.8,
          boundaryPosition.y + (Math.random() - 0.5) * boundarySize.y * 0.8,
          boundaryPosition.z + (Math.random() - 0.5) * boundarySize.z * 0.8
        ),
        velocity: new THREE.Vector3(0, 0, 0),
        acceleration: new THREE.Vector3(0, 0, 0),
        density: this.params.restDensity,
        pressure: 0,
        mass: 1,
      };
      this.particles.push(particle);
    }
  }

  private kernelPoly6(r: number): number {
    const h = this.params.smoothingRadius;
    if (r > h) return 0;
    const diff = h * h - r * r;
    return this.kernelPoly6Coeff * diff * diff * diff;
  }

  private kernelSpikyGradient(r: THREE.Vector3, dist: number): THREE.Vector3 {
    const h = this.params.smoothingRadius;
    if (dist > h || dist < 0.0001) return new THREE.Vector3(0, 0, 0);
    const diff = h - dist;
    const coeff = (this.kernelSpikyCoeff * diff * diff) / dist;
    return r.clone().multiplyScalar(coeff);
  }

  private kernelViscosityLaplacian(r: number): number {
    const h = this.params.smoothingRadius;
    if (r > h) return 0;
    return this.kernelViscosityCoeff * (h - r);
  }

  private computeDensity(): void {
    for (const pi of this.particles) {
      pi.density = 0;

      for (const pj of this.particles) {
        const r = pi.position.distanceTo(pj.position);
        pi.density += pj.mass * this.kernelPoly6(r);
      }

      pi.pressure = this.params.stiffness * (pi.density - this.params.restDensity);
    }
  }

  private computeForces(): void {
    const { gravity, viscosity, surfaceTension, flowDirection, flowStrength } = this.params;

    for (const pi of this.particles) {
      pi.acceleration.set(0, 0, 0);
      pi.acceleration.add(new THREE.Vector3(gravity.x, gravity.y, gravity.z));

      if (flowStrength > 0) {
        pi.acceleration.add(
          new THREE.Vector3(
            flowDirection.x * flowStrength,
            flowDirection.y * flowStrength,
            flowDirection.z * flowStrength
          )
        );
      }

      const pressureForce = new THREE.Vector3(0, 0, 0);
      const viscosityForce = new THREE.Vector3(0, 0, 0);
      const surfaceTensionForce = new THREE.Vector3(0, 0, 0);

      for (const pj of this.particles) {
        if (pi.id === pj.id) continue;

        const r = new THREE.Vector3().subVectors(pi.position, pj.position);
        const dist = r.length();

        if (dist < this.params.smoothingRadius) {
          const pressureGrad = this.kernelSpikyGradient(r, dist);
          const pressureTerm = (pi.pressure + pj.pressure) / (2 * pj.density + 0.0001);
          pressureForce.add(pressureGrad.multiplyScalar(-pj.mass * pressureTerm));

          const velDiff = new THREE.Vector3().subVectors(pj.velocity, pi.velocity);
          const viscLaplacian = this.kernelViscosityLaplacian(dist);
          viscosityForce.add(
            velDiff.multiplyScalar((viscosity * pj.mass * viscLaplacian) / (pj.density + 0.0001))
          );

          if (surfaceTension > 0 && dist > 0.0001) {
            const cohesion = r
              .clone()
              .normalize()
              .multiplyScalar(-surfaceTension * pj.mass * this.kernelPoly6(dist));
            surfaceTensionForce.add(cohesion);
          }
        }
      }

      if (pi.density > 0.0001) {
        pi.acceleration.add(pressureForce.divideScalar(pi.density));
        pi.acceleration.add(viscosityForce);
        pi.acceleration.add(surfaceTensionForce.divideScalar(pi.density));
      }
    }
  }

  private integrate(dt: number): void {
    for (const p of this.particles) {
      p.velocity.add(p.acceleration.clone().multiplyScalar(dt));
      p.velocity.multiplyScalar(0.998);

      const maxVel = 10;
      if (p.velocity.length() > maxVel) {
        p.velocity.normalize().multiplyScalar(maxVel);
      }

      p.position.add(p.velocity.clone().multiplyScalar(dt));
    }
  }

  private handleBoundaryCollisions(): void {
    const { boundarySize, boundaryPosition, particleRadius } = this.params;
    const dampingFactor = 0.3;

    const minX = boundaryPosition.x - boundarySize.x / 2 + particleRadius;
    const maxX = boundaryPosition.x + boundarySize.x / 2 - particleRadius;
    const minY = boundaryPosition.y - boundarySize.y / 2 + particleRadius;
    const maxY = boundaryPosition.y + boundarySize.y / 2 - particleRadius;
    const minZ = boundaryPosition.z - boundarySize.z / 2 + particleRadius;
    const maxZ = boundaryPosition.z + boundarySize.z / 2 - particleRadius;

    for (const p of this.particles) {
      if (p.position.x < minX) {
        p.position.x = minX;
        p.velocity.x *= -dampingFactor;
      } else if (p.position.x > maxX) {
        p.position.x = maxX;
        p.velocity.x *= -dampingFactor;
      }

      if (p.position.y < minY) {
        p.position.y = minY;
        p.velocity.y *= -dampingFactor;
      } else if (p.position.y > maxY) {
        p.position.y = maxY;
        p.velocity.y *= -dampingFactor;
      }

      if (p.position.z < minZ) {
        p.position.z = minZ;
        p.velocity.z *= -dampingFactor;
      } else if (p.position.z > maxZ) {
        p.position.z = maxZ;
        p.velocity.z *= -dampingFactor;
      }
    }
  }

  update(dt: number): void {
    const substeps = 2;
    const subDt = dt / substeps;

    for (let i = 0; i < substeps; i++) {
      this.computeDensity();
      this.computeForces();
      this.integrate(subDt);
      this.handleBoundaryCollisions();
    }
  }

  updateParams(newParams: Partial<FluidParams>): void {
    const oldParticleCount = this.params.particleCount;
    this.params = { ...this.params, ...newParams };

    if (newParams.smoothingRadius !== undefined) {
      this.updateKernelCoefficients();
    }

    if (newParams.particleCount !== undefined && newParams.particleCount !== oldParticleCount) {
      this.initializeParticles();
    }
  }

  reset(): void {
    this.initializeParticles();
  }
}
