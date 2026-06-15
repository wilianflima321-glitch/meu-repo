// @aethel-heavy-async-boundary Three.js runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';

import type { EmitterConfig, Particle } from '@/lib/engine/NiagaraVFX.types';

export class ParticleEmitter {
  private particles: Particle[] = [];
  private timeSinceLastSpawn: number = 0;
  private burstIndex: number = 0;
  private systemTime: number = 0;
  constructor(public config: EmitterConfig) {}
  update(deltaTime: number): Particle[] {
    if (!this.config.enabled) return this.particles;
    this.systemTime += deltaTime;
    this.timeSinceLastSpawn += deltaTime;
    const spawnInterval = 1 / this.config.spawnRate;
    while (this.timeSinceLastSpawn >= spawnInterval && this.particles.length < this.config.maxParticles) {
      this.spawnParticle();
      this.timeSinceLastSpawn -= spawnInterval;
    }
    while (this.burstIndex < this.config.spawnBurst.length) {
      const burst = this.config.spawnBurst[this.burstIndex];
      if (this.systemTime >= burst.time) {
        for (let i = 0; i < burst.count && this.particles.length < this.config.maxParticles; i++) {
          this.spawnParticle();
        }
        this.burstIndex++;
      } else {
        break;
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.age += deltaTime;
      if (p.age >= p.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }
      const normalizedAge = p.age / p.lifetime;
      p.velocity.add(this.config.gravity.clone().multiplyScalar(deltaTime));
      p.velocity.multiplyScalar(1 - this.config.drag * deltaTime);
      if (this.config.turbulence.strength > 0) {
        const turb = new THREE.Vector3(
          Math.sin(this.systemTime * this.config.turbulence.frequency + p.position.x),
          Math.cos(this.systemTime * this.config.turbulence.frequency + p.position.y),
          Math.sin(this.systemTime * this.config.turbulence.frequency + p.position.z)
        ).multiplyScalar(this.config.turbulence.strength * deltaTime);
        p.velocity.add(turb);
      }
      let velocityMult = 1;
      for (let j = 0; j < this.config.velocityOverLife.length - 1; j++) {
        const curr = this.config.velocityOverLife[j];
        const next = this.config.velocityOverLife[j + 1];
        if (normalizedAge >= curr.time && normalizedAge <= next.time) {
          const t = (normalizedAge - curr.time) / (next.time - curr.time);
          velocityMult = curr.multiplier + (next.multiplier - curr.multiplier) * t;
          break;
        }
      }
      p.position.add(p.velocity.clone().multiplyScalar(deltaTime * velocityMult));
      for (let j = 0; j < this.config.sizeOverLife.length - 1; j++) {
        const curr = this.config.sizeOverLife[j];
        const next = this.config.sizeOverLife[j + 1];
        if (normalizedAge >= curr.time && normalizedAge <= next.time) {
          const t = (normalizedAge - curr.time) / (next.time - curr.time);
          p.size = curr.size + (next.size - curr.size) * t;
          break;
        }
      }
      for (let j = 0; j < this.config.colorOverLife.length - 1; j++) {
        const curr = this.config.colorOverLife[j];
        const next = this.config.colorOverLife[j + 1];
        if (normalizedAge >= curr.time && normalizedAge <= next.time) {
          const t = (normalizedAge - curr.time) / (next.time - curr.time);
          p.color.lerpColors(curr.color, next.color, t);
          p.alpha = curr.alpha + (next.alpha - curr.alpha) * t;
          break;
        }
      }
      p.rotation += p.rotationRate * deltaTime;
    }
    return this.particles;
  }
  private spawnParticle(): void {
    const position = this.getSpawnPosition();
    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.x, this.config.initialVelocity.max.x),
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.y, this.config.initialVelocity.max.y),
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.z, this.config.initialVelocity.max.z)
    );
    const particle: Particle = {
      position,
      velocity,
      age: 0,
      lifetime: THREE.MathUtils.randFloat(this.config.lifetime.min, this.config.lifetime.max),
      size: THREE.MathUtils.randFloat(this.config.initialSize.min, this.config.initialSize.max),
      color: this.config.initialColor.clone(),
      alpha: 1,
      rotation: THREE.MathUtils.randFloat(this.config.initialRotation.min, this.config.initialRotation.max),
      rotationRate: THREE.MathUtils.randFloat(this.config.rotationRate.min, this.config.rotationRate.max),
    };
    this.particles.push(particle);
  }
  private getSpawnPosition(): THREE.Vector3 {
    const params = this.config.spawnShapeParams;
    switch (this.config.spawnShape) {
      case 'point':
        return new THREE.Vector3(0, 0, 0);
      case 'sphere': {
        const radius = params.radius || 1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        return new THREE.Vector3(
          radius * Math.sin(phi) * Math.cos(theta),
          radius * Math.sin(phi) * Math.sin(theta),
          radius * Math.cos(phi)
        );
      }
      case 'box': {
        const width = params.width || 1;
        const height = params.height || 1;
        const depth = params.depth || 1;
        return new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(width),
          THREE.MathUtils.randFloatSpread(height),
          THREE.MathUtils.randFloatSpread(depth)
        );
      }
      case 'cone': {
        const angle = params.angle || 45;
        const radius = params.radius || 1;
        const r = Math.random() * radius;
        const theta = Math.random() * Math.PI * 2;
        const y = Math.random() * Math.tan(angle * Math.PI / 180) * r;
        return new THREE.Vector3(
          r * Math.cos(theta),
          y,
          r * Math.sin(theta)
        );
      }
      case 'cylinder': {
        const cylinderRadius = params.radius || 1;
        const cylinderHeight = params.height || 2;
        const cylinderTheta = Math.random() * Math.PI * 2;
        return new THREE.Vector3(
          cylinderRadius * Math.cos(cylinderTheta),
          THREE.MathUtils.randFloatSpread(cylinderHeight),
          cylinderRadius * Math.sin(cylinderTheta)
        );
      }
      default:
        return new THREE.Vector3(0, 0, 0);
    }
  }
  reset(): void {
    this.particles = [];
    this.timeSinceLastSpawn = 0;
    this.burstIndex = 0;
    this.systemTime = 0;
  }
  getParticleCount(): number {
    return this.particles.length;
  }
}
