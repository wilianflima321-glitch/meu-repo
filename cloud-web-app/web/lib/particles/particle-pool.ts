import * as THREE from 'three';
import type { Particle } from './advanced-particle-types';

export class ParticlePool {
  private particles: Particle[] = [];
  private activeCount = 0;
  private maxParticles: number;

  constructor(maxParticles: number) {
    this.maxParticles = maxParticles;

    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 0,
      lifetime: 1,
      size: 1,
      rotation: 0,
      color: new THREE.Color(1, 1, 1),
      alpha: 1,
      speed: 1,
      alive: false,
    };
  }

  acquire(): Particle | null {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.particles[i].alive) {
        this.particles[i].alive = true;
        this.particles[i].age = 0;
        this.activeCount += 1;
        return this.particles[i];
      }
    }
    return null;
  }

  release(particle: Particle): void {
    if (!particle.alive) return;
    particle.alive = false;
    this.activeCount -= 1;
  }

  forEach(callback: (particle: Particle, index: number) => void): void {
    let index = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particles[i].alive) {
        callback(this.particles[i], index++);
      }
    }
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  getAll(): Particle[] {
    return this.particles;
  }

  clear(): void {
    for (const particle of this.particles) {
      particle.alive = false;
    }
    this.activeCount = 0;
  }
}
