'use client';

import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { EmitterConfig, Particle } from './niagara-vfx-types';

export class ParticleEmitter {
  private particles: Particle[] = [];
  private timeSinceLastSpawn = 0;
  private burstIndex = 0;
  private systemTime = 0;

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
      const particle = this.particles[i];
      particle.age += deltaTime;

      if (particle.age >= particle.lifetime) {
        this.particles.splice(i, 1);
        continue;
      }

      const normalizedAge = particle.age / particle.lifetime;
      particle.velocity.add(this.config.gravity.clone().multiplyScalar(deltaTime));
      particle.velocity.multiplyScalar(1 - this.config.drag * deltaTime);

      if (this.config.turbulence.strength > 0) {
        const turbulence = new THREE.Vector3(
          Math.sin(this.systemTime * this.config.turbulence.frequency + particle.position.x),
          Math.cos(this.systemTime * this.config.turbulence.frequency + particle.position.y),
          Math.sin(this.systemTime * this.config.turbulence.frequency + particle.position.z)
        ).multiplyScalar(this.config.turbulence.strength * deltaTime);
        particle.velocity.add(turbulence);
      }

      let velocityMultiplier = 1;
      for (let j = 0; j < this.config.velocityOverLife.length - 1; j++) {
        const currentPoint = this.config.velocityOverLife[j];
        const nextPoint = this.config.velocityOverLife[j + 1];
        if (normalizedAge >= currentPoint.time && normalizedAge <= nextPoint.time) {
          const interpolation = (normalizedAge - currentPoint.time) / (nextPoint.time - currentPoint.time);
          velocityMultiplier =
            currentPoint.multiplier + (nextPoint.multiplier - currentPoint.multiplier) * interpolation;
          break;
        }
      }

      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime * velocityMultiplier));

      for (let j = 0; j < this.config.sizeOverLife.length - 1; j++) {
        const currentPoint = this.config.sizeOverLife[j];
        const nextPoint = this.config.sizeOverLife[j + 1];
        if (normalizedAge >= currentPoint.time && normalizedAge <= nextPoint.time) {
          const interpolation = (normalizedAge - currentPoint.time) / (nextPoint.time - currentPoint.time);
          particle.size = currentPoint.size + (nextPoint.size - currentPoint.size) * interpolation;
          break;
        }
      }

      for (let j = 0; j < this.config.colorOverLife.length - 1; j++) {
        const currentPoint = this.config.colorOverLife[j];
        const nextPoint = this.config.colorOverLife[j + 1];
        if (normalizedAge >= currentPoint.time && normalizedAge <= nextPoint.time) {
          const interpolation = (normalizedAge - currentPoint.time) / (nextPoint.time - currentPoint.time);
          particle.color.lerpColors(currentPoint.color, nextPoint.color, interpolation);
          particle.alpha = currentPoint.alpha + (nextPoint.alpha - currentPoint.alpha) * interpolation;
          break;
        }
      }

      particle.rotation += particle.rotationRate * deltaTime;
    }

    return this.particles;
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

  private spawnParticle(): void {
    const position = this.getSpawnPosition();

    const velocity = new THREE.Vector3(
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.x, this.config.initialVelocity.max.x),
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.y, this.config.initialVelocity.max.y),
      THREE.MathUtils.randFloat(this.config.initialVelocity.min.z, this.config.initialVelocity.max.z)
    );

    this.particles.push({
      position,
      velocity,
      age: 0,
      lifetime: THREE.MathUtils.randFloat(this.config.lifetime.min, this.config.lifetime.max),
      size: THREE.MathUtils.randFloat(this.config.initialSize.min, this.config.initialSize.max),
      color: this.config.initialColor.clone(),
      alpha: 1,
      rotation: THREE.MathUtils.randFloat(this.config.initialRotation.min, this.config.initialRotation.max),
      rotationRate: THREE.MathUtils.randFloat(this.config.rotationRate.min, this.config.rotationRate.max),
    });
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
        const radial = Math.random() * radius;
        const theta = Math.random() * Math.PI * 2;
        const y = Math.random() * Math.tan((angle * Math.PI) / 180) * radial;
        return new THREE.Vector3(radial * Math.cos(theta), y, radial * Math.sin(theta));
      }
      case 'cylinder': {
        const radius = params.radius || 1;
        const height = params.height || 2;
        const theta = Math.random() * Math.PI * 2;
        return new THREE.Vector3(
          radius * Math.cos(theta),
          THREE.MathUtils.randFloatSpread(height),
          radius * Math.sin(theta)
        );
      }
      default:
        return new THREE.Vector3(0, 0, 0);
    }
  }
}

export type ParticleRendererProps = {
  emitters: ParticleEmitter[];
  isPlaying: boolean;
};

export function ParticleRenderer({ emitters, isPlaying }: ParticleRendererProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const [particles, setParticles] = useState<Particle[]>([]);

  useFrame((_, delta) => {
    if (!isPlaying) return;
    const allParticles: Particle[] = [];
    for (const emitter of emitters) allParticles.push(...emitter.update(delta));
    setParticles(allParticles);
  });

  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particles.length * 3);
    const colors = new Float32Array(particles.length * 4);
    const sizes = new Float32Array(particles.length);

    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index];
      positions[index * 3] = particle.position.x;
      positions[index * 3 + 1] = particle.position.y;
      positions[index * 3 + 2] = particle.position.z;

      colors[index * 4] = particle.color.r;
      colors[index * 4 + 1] = particle.color.g;
      colors[index * 4 + 2] = particle.color.b;
      colors[index * 4 + 3] = particle.alpha;
      sizes[index] = particle.size;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    return geometry;
  }, [particles]);

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation
      />
    </points>
  );
}
