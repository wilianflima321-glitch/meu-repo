/**
 * @aethel-heavy-async-boundary
 * GPU particle runtime for emitters, forces, collisions and shader-driven effects.
 */

import * as THREE from 'three';
import type {
  ParticleCollider,
  ParticleData,
  ParticleEmitterConfig,
  ParticleForce,
} from './particle-system-real.types';
import { PARTICLE_FRAGMENT_SHADER, PARTICLE_VERTEX_SHADER } from './particle-system-real-shaders';
export { ParticlePresets } from './particle-system-real-presets';
export type {
  EmitterShape,
  ParticleCollider,
  ParticleEmitterConfig,
  ParticleForce,
} from './particle-system-real.types';

// ============================================================================
// GPU PARTICLE SHADER
// ============================================================================

// ============================================================================
// PARTICLE EMITTER
// ============================================================================

export class ParticleEmitter extends THREE.Object3D {
  private config: ParticleEmitterConfig;
  private particleData!: ParticleData;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.ShaderMaterial;
  private points: THREE.Points;
  private emissionAccumulator: number = 0;
  private forces: ParticleForce[] = [];
  private colliders: ParticleCollider[] = [];
  private isPlaying: boolean = true;
  private firstFreeParticle: number = 0;

  constructor(config: Partial<ParticleEmitterConfig> = {}) {
    super();

    this.config = {
      maxParticles: 10000,
      emissionRate: 100,
      lifetime: { min: 1, max: 3 },
      startSize: { min: 10, max: 20 },
      endSize: { min: 5, max: 10 },
      startColor: new THREE.Color(1, 1, 1),
      endColor: new THREE.Color(1, 1, 1),
      startOpacity: 1,
      endOpacity: 0,
      velocity: {
        min: new THREE.Vector3(-1, 2, -1),
        max: new THREE.Vector3(1, 5, 1),
      },
      acceleration: new THREE.Vector3(0, -9.8, 0),
      angularVelocity: { min: -1, max: 1 },
      blendMode: 'additive',
      shape: { type: 'point' },
      worldSpace: true,
      ...config,
    };

    this.initParticleData();
    this.initGeometry();
    this.initMaterial();

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.add(this.points);
  }

  private initParticleData(): void {
    const n = this.config.maxParticles;

    this.particleData = {
      position: new Float32Array(n * 3),
      velocity: new Float32Array(n * 3),
      color: new Float32Array(n * 4),
      size: new Float32Array(n),
      age: new Float32Array(n),
      lifetime: new Float32Array(n),
      rotation: new Float32Array(n),
      angularVelocity: new Float32Array(n),
      alive: new Uint8Array(n),
    };

    // Initialize all particles as dead
    this.particleData.alive.fill(0);
  }

  private initGeometry(): void {
    this.geometry = new THREE.BufferGeometry();

    const n = this.config.maxParticles;

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.particleData.position, 3));
    this.geometry.setAttribute('velocity', new THREE.BufferAttribute(this.particleData.velocity, 3));
    this.geometry.setAttribute('particleColor', new THREE.BufferAttribute(this.particleData.color, 4));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.particleData.size, 1));
    this.geometry.setAttribute('age', new THREE.BufferAttribute(this.particleData.age, 1));
    this.geometry.setAttribute('lifetime', new THREE.BufferAttribute(this.particleData.lifetime, 1));
    this.geometry.setAttribute('rotation', new THREE.BufferAttribute(this.particleData.rotation, 1));
    this.geometry.setAttribute('alive', new THREE.BufferAttribute(new Float32Array(this.particleData.alive), 1));
  }

  private initMaterial(): void {
    let blending: THREE.Blending = THREE.AdditiveBlending;
    if (this.config.blendMode === 'normal') blending = THREE.NormalBlending;
    if (this.config.blendMode === 'multiply') blending = THREE.MultiplyBlending;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        particleTexture: { value: this.config.texture || null },
        useTexture: { value: !!this.config.texture },
      },
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      blending,
      depthWrite: false,
      transparent: true,
    });
  }

  update(deltaTime: number): void {
    if (!this.isPlaying) return;

    // Emit new particles
    this.emissionAccumulator += deltaTime * this.config.emissionRate;

    while (this.emissionAccumulator >= 1) {
      this.emitParticle();
      this.emissionAccumulator -= 1;
    }

    // Update existing particles
    this.updateParticles(deltaTime);

    // Update GPU buffers
    this.updateBuffers();
  }

  private emitParticle(): void {
    // Find a dead particle slot
    let index = -1;
    for (let i = 0; i < this.config.maxParticles; i++) {
      const checkIndex = (this.firstFreeParticle + i) % this.config.maxParticles;
      if (this.particleData.alive[checkIndex] === 0) {
        index = checkIndex;
        this.firstFreeParticle = (checkIndex + 1) % this.config.maxParticles;
        break;
      }
    }

    if (index === -1) return; // No free slots

    // Set position based on shape
    const pos = this.getEmissionPosition();
    const i3 = index * 3;
    const i4 = index * 4;

    if (this.config.worldSpace) {
      const worldPos = this.localToWorld(pos);
      this.particleData.position[i3] = worldPos.x;
      this.particleData.position[i3 + 1] = worldPos.y;
      this.particleData.position[i3 + 2] = worldPos.z;
    } else {
      this.particleData.position[i3] = pos.x;
      this.particleData.position[i3 + 1] = pos.y;
      this.particleData.position[i3 + 2] = pos.z;
    }

    // Set velocity
    const vel = this.randomBetweenVectors(this.config.velocity.min, this.config.velocity.max);
    this.particleData.velocity[i3] = vel.x;
    this.particleData.velocity[i3 + 1] = vel.y;
    this.particleData.velocity[i3 + 2] = vel.z;

    // Set color
    this.particleData.color[i4] = this.config.startColor.r;
    this.particleData.color[i4 + 1] = this.config.startColor.g;
    this.particleData.color[i4 + 2] = this.config.startColor.b;
    this.particleData.color[i4 + 3] = this.config.startOpacity;

    // Set size
    this.particleData.size[index] = this.randomBetween(
      this.config.startSize.min,
      this.config.startSize.max
    );

    // Set lifetime
    this.particleData.lifetime[index] = this.randomBetween(
      this.config.lifetime.min,
      this.config.lifetime.max
    );

    // Reset age
    this.particleData.age[index] = 0;

    // Set rotation
    this.particleData.rotation[index] = Math.random() * Math.PI * 2;
    this.particleData.angularVelocity[index] = this.randomBetween(
      this.config.angularVelocity.min,
      this.config.angularVelocity.max
    );

    // Activate particle
    this.particleData.alive[index] = 1;
  }

  private getEmissionPosition(): THREE.Vector3 {
    const shape = this.config.shape;

    switch (shape.type) {
      case 'point':
        return new THREE.Vector3(0, 0, 0);

      case 'sphere': {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = Math.cbrt(Math.random()) * shape.radius;
        return new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.sin(phi) * Math.sin(theta),
          r * Math.cos(phi)
        );
      }

      case 'box':
        return new THREE.Vector3(
          (Math.random() - 0.5) * shape.size.x,
          (Math.random() - 0.5) * shape.size.y,
          (Math.random() - 0.5) * shape.size.z
        );

      case 'cone': {
        const t = Math.random();
        const r = t * shape.radius;
        const theta = Math.random() * Math.PI * 2;
        return new THREE.Vector3(
          r * Math.cos(theta),
          t * shape.height,
          r * Math.sin(theta)
        );
      }

      case 'circle': {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * shape.radius;
        return new THREE.Vector3(r * Math.cos(theta), 0, r * Math.sin(theta));
      }

      case 'mesh': {
        // Pick random triangle and random point on it
        const positions = shape.geometry.getAttribute('position');
        const count = positions.count / 3;
        const triIndex = Math.floor(Math.random() * count) * 3;

        const a = new THREE.Vector3().fromBufferAttribute(positions, triIndex);
        const b = new THREE.Vector3().fromBufferAttribute(positions, triIndex + 1);
        const c = new THREE.Vector3().fromBufferAttribute(positions, triIndex + 2);

        const r1 = Math.random();
        const r2 = Math.random();
        const sqrtR1 = Math.sqrt(r1);

        return a.multiplyScalar(1 - sqrtR1)
          .add(b.multiplyScalar(sqrtR1 * (1 - r2)))
          .add(c.multiplyScalar(sqrtR1 * r2));
      }

      default:
        return new THREE.Vector3();
    }
  }

  private updateParticles(deltaTime: number): void {
    const acc = this.config.acceleration;

    for (let i = 0; i < this.config.maxParticles; i++) {
      if (this.particleData.alive[i] === 0) continue;

      const i3 = i * 3;
      const i4 = i * 4;

      // Update age
      this.particleData.age[i] += deltaTime;

      // Check if particle died
      if (this.particleData.age[i] >= this.particleData.lifetime[i]) {
        this.particleData.alive[i] = 0;
        continue;
      }

      // Apply forces
      let fx = acc.x;
      let fy = acc.y;
      let fz = acc.z;

      const px = this.particleData.position[i3];
      const py = this.particleData.position[i3 + 1];
      const pz = this.particleData.position[i3 + 2];

      for (const force of this.forces) {
        const { fx: dfx, fy: dfy, fz: dfz } = this.applyForce(force, px, py, pz, deltaTime);
        fx += dfx;
        fy += dfy;
        fz += dfz;
      }

      // Update velocity
      this.particleData.velocity[i3] += fx * deltaTime;
      this.particleData.velocity[i3 + 1] += fy * deltaTime;
      this.particleData.velocity[i3 + 2] += fz * deltaTime;

      // Update position
      this.particleData.position[i3] += this.particleData.velocity[i3] * deltaTime;
      this.particleData.position[i3 + 1] += this.particleData.velocity[i3 + 1] * deltaTime;
      this.particleData.position[i3 + 2] += this.particleData.velocity[i3 + 2] * deltaTime;

      // Check collisions
      this.checkCollisions(i);

      // Update rotation
      this.particleData.rotation[i] += this.particleData.angularVelocity[i] * deltaTime;

      // Interpolate color
      const ageRatio = this.particleData.age[i] / this.particleData.lifetime[i];
      this.particleData.color[i4] = THREE.MathUtils.lerp(
        this.config.startColor.r,
        this.config.endColor.r,
        ageRatio
      );
      this.particleData.color[i4 + 1] = THREE.MathUtils.lerp(
        this.config.startColor.g,
        this.config.endColor.g,
        ageRatio
      );
      this.particleData.color[i4 + 2] = THREE.MathUtils.lerp(
        this.config.startColor.b,
        this.config.endColor.b,
        ageRatio
      );
      this.particleData.color[i4 + 3] = THREE.MathUtils.lerp(
        this.config.startOpacity,
        this.config.endOpacity,
        ageRatio
      );

      // Interpolate size
      const startSize = this.particleData.size[i];
      const endSize = startSize * (this.config.endSize.min / this.config.startSize.min);
      this.particleData.size[i] = THREE.MathUtils.lerp(startSize, endSize, ageRatio);
    }
  }

  private applyForce(
    force: ParticleForce,
    px: number,
    py: number,
    pz: number,
    _deltaTime: number
  ): { fx: number; fy: number; fz: number } {
    switch (force.type) {
      case 'gravity':
        return {
          fx: (force.direction?.x || 0) * force.strength,
          fy: (force.direction?.y || -1) * force.strength,
          fz: (force.direction?.z || 0) * force.strength,
        };

      case 'wind':
        return {
          fx: (force.direction?.x || 1) * force.strength,
          fy: (force.direction?.y || 0) * force.strength,
          fz: (force.direction?.z || 0) * force.strength,
        };

      case 'vortex': {
        if (!force.position) return { fx: 0, fy: 0, fz: 0 };
        const dx = px - force.position.x;
        const dz = pz - force.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const strength = force.strength / Math.max(dist, 0.1);
        return {
          fx: -dz * strength,
          fy: 0,
          fz: dx * strength,
        };
      }

      case 'turbulence': {
        const freq = force.frequency || 1;
        return {
          fx: (Math.sin(px * freq + py * freq) * 2 - 1) * force.strength,
          fy: (Math.sin(py * freq + pz * freq) * 2 - 1) * force.strength,
          fz: (Math.sin(pz * freq + px * freq) * 2 - 1) * force.strength,
        };
      }

      case 'attractor': {
        if (!force.position) return { fx: 0, fy: 0, fz: 0 };
        const dx = force.position.x - px;
        const dy = force.position.y - py;
        const dz = force.position.z - pz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const strength = force.strength / Math.max(dist * dist, 0.01);
        return {
          fx: dx * strength,
          fy: dy * strength,
          fz: dz * strength,
        };
      }

      case 'repulsor': {
        if (!force.position) return { fx: 0, fy: 0, fz: 0 };
        const dx = px - force.position.x;
        const dy = py - force.position.y;
        const dz = pz - force.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const strength = force.strength / Math.max(dist * dist, 0.01);
        return {
          fx: dx * strength,
          fy: dy * strength,
          fz: dz * strength,
        };
      }

      default:
        return { fx: 0, fy: 0, fz: 0 };
    }
  }

  private checkCollisions(index: number): void {
    const i3 = index * 3;

    const px = this.particleData.position[i3];
    const py = this.particleData.position[i3 + 1];
    const pz = this.particleData.position[i3 + 2];

    for (const collider of this.colliders) {
      switch (collider.type) {
        case 'plane': {
          const normal = collider.normal || new THREE.Vector3(0, 1, 0);
          const d = (px - collider.position.x) * normal.x +
                    (py - collider.position.y) * normal.y +
                    (pz - collider.position.z) * normal.z;

          if (d < 0) {
            // Move particle back to surface
            this.particleData.position[i3] -= d * normal.x;
            this.particleData.position[i3 + 1] -= d * normal.y;
            this.particleData.position[i3 + 2] -= d * normal.z;

            // Reflect velocity
            const vn = this.particleData.velocity[i3] * normal.x +
                       this.particleData.velocity[i3 + 1] * normal.y +
                       this.particleData.velocity[i3 + 2] * normal.z;

            this.particleData.velocity[i3] -= (1 + collider.bounce) * vn * normal.x;
            this.particleData.velocity[i3 + 1] -= (1 + collider.bounce) * vn * normal.y;
            this.particleData.velocity[i3 + 2] -= (1 + collider.bounce) * vn * normal.z;

            // Apply friction
            this.particleData.velocity[i3] *= (1 - collider.friction);
            this.particleData.velocity[i3 + 1] *= (1 - collider.friction);
            this.particleData.velocity[i3 + 2] *= (1 - collider.friction);
          }
          break;
        }

        case 'sphere': {
          const dx = px - collider.position.x;
          const dy = py - collider.position.y;
          const dz = pz - collider.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < (collider.radius || 1)) {
            // Push particle out
            const nx = dx / dist;
            const ny = dy / dist;
            const nz = dz / dist;

            this.particleData.position[i3] = collider.position.x + nx * (collider.radius || 1);
            this.particleData.position[i3 + 1] = collider.position.y + ny * (collider.radius || 1);
            this.particleData.position[i3 + 2] = collider.position.z + nz * (collider.radius || 1);

            // Reflect velocity
            const vn = this.particleData.velocity[i3] * nx +
                       this.particleData.velocity[i3 + 1] * ny +
                       this.particleData.velocity[i3 + 2] * nz;

            this.particleData.velocity[i3] -= (1 + collider.bounce) * vn * nx;
            this.particleData.velocity[i3 + 1] -= (1 + collider.bounce) * vn * ny;
            this.particleData.velocity[i3 + 2] -= (1 + collider.bounce) * vn * nz;
          }
          break;
        }

        case 'box': {
          const size = collider.size || new THREE.Vector3(1, 1, 1);
          const halfSize = size.clone().multiplyScalar(0.5);

          const local = new THREE.Vector3(
            px - collider.position.x,
            py - collider.position.y,
            pz - collider.position.z
          );

          if (Math.abs(local.x) < halfSize.x &&
              Math.abs(local.y) < halfSize.y &&
              Math.abs(local.z) < halfSize.z) {
            // Inside box - find closest face and push out
            const distX = halfSize.x - Math.abs(local.x);
            const distY = halfSize.y - Math.abs(local.y);
            const distZ = halfSize.z - Math.abs(local.z);

            if (distX < distY && distX < distZ) {
              const sign = Math.sign(local.x);
              this.particleData.position[i3] = collider.position.x + sign * halfSize.x;
              this.particleData.velocity[i3] *= -collider.bounce;
            } else if (distY < distZ) {
              const sign = Math.sign(local.y);
              this.particleData.position[i3 + 1] = collider.position.y + sign * halfSize.y;
              this.particleData.velocity[i3 + 1] *= -collider.bounce;
            } else {
              const sign = Math.sign(local.z);
              this.particleData.position[i3 + 2] = collider.position.z + sign * halfSize.z;
              this.particleData.velocity[i3 + 2] *= -collider.bounce;
            }
          }
          break;
        }
      }
    }
  }

  private updateBuffers(): void {
    const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const velAttr = this.geometry.getAttribute('velocity') as THREE.BufferAttribute;
    const colorAttr = this.geometry.getAttribute('particleColor') as THREE.BufferAttribute;
    const sizeAttr = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const ageAttr = this.geometry.getAttribute('age') as THREE.BufferAttribute;
    const lifetimeAttr = this.geometry.getAttribute('lifetime') as THREE.BufferAttribute;
    const rotationAttr = this.geometry.getAttribute('rotation') as THREE.BufferAttribute;
    const aliveAttr = this.geometry.getAttribute('alive') as THREE.BufferAttribute;

    posAttr.array = this.particleData.position;
    velAttr.array = this.particleData.velocity;
    colorAttr.array = this.particleData.color;
    sizeAttr.array = this.particleData.size;
    ageAttr.array = this.particleData.age;
    lifetimeAttr.array = this.particleData.lifetime;
    rotationAttr.array = this.particleData.rotation;
    (aliveAttr.array as Float32Array).set(Array.from(this.particleData.alive).map(v => v));

    posAttr.needsUpdate = true;
    velAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    ageAttr.needsUpdate = true;
    lifetimeAttr.needsUpdate = true;
    rotationAttr.needsUpdate = true;
    aliveAttr.needsUpdate = true;
  }

  // Public API

  addForce(force: ParticleForce): void {
    this.forces.push(force);
  }

  removeForce(force: ParticleForce): void {
    const index = this.forces.indexOf(force);
    if (index !== -1) {
      this.forces.splice(index, 1);
    }
  }

  addCollider(collider: ParticleCollider): void {
    this.colliders.push(collider);
  }

  removeCollider(collider: ParticleCollider): void {
    const index = this.colliders.indexOf(collider);
    if (index !== -1) {
      this.colliders.splice(index, 1);
    }
  }

  play(): void {
    this.isPlaying = true;
  }

  pause(): void {
    this.isPlaying = false;
  }

  stop(): void {
    this.isPlaying = false;
    this.particleData.alive.fill(0);
    this.updateBuffers();
  }

  emit(count: number): void {
    for (let i = 0; i < count; i++) {
      this.emitParticle();
    }
    this.updateBuffers();
  }

  setTexture(texture: THREE.Texture): void {
    this.config.texture = texture;
    this.material.uniforms.particleTexture.value = texture;
    this.material.uniforms.useTexture.value = true;
  }

  getActiveParticleCount(): number {
    let count = 0;
    for (let i = 0; i < this.config.maxParticles; i++) {
      if (this.particleData.alive[i] === 1) count++;
    }
    return count;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    if (this.config.texture) {
      this.config.texture.dispose();
    }
  }

  // Helper methods

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  private randomBetweenVectors(min: THREE.Vector3, max: THREE.Vector3): THREE.Vector3 {
    return new THREE.Vector3(
      this.randomBetween(min.x, max.x),
      this.randomBetween(min.y, max.y),
      this.randomBetween(min.z, max.z)
    );
  }
}

// ============================================================================
// PARTICLE SYSTEM MANAGER
// ============================================================================

export class ParticleSystemManager {
  private emitters: Map<string, ParticleEmitter> = new Map();
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createEmitter(id: string, config?: Partial<ParticleEmitterConfig>): ParticleEmitter {
    const emitter = new ParticleEmitter(config);
    this.emitters.set(id, emitter);
    this.scene.add(emitter);
    return emitter;
  }

  getEmitter(id: string): ParticleEmitter | undefined {
    return this.emitters.get(id);
  }

  removeEmitter(id: string): void {
    const emitter = this.emitters.get(id);
    if (emitter) {
      this.scene.remove(emitter);
      emitter.dispose();
      this.emitters.delete(id);
    }
  }

  update(deltaTime: number): void {
    for (const emitter of this.emitters.values()) {
      emitter.update(deltaTime);
    }
  }

  dispose(): void {
    for (const [id, _emitter] of this.emitters) {
      this.removeEmitter(id);
    }
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export function createParticleEmitter(config?: Partial<ParticleEmitterConfig>): ParticleEmitter {
  return new ParticleEmitter(config);
}

export function createParticleSystem(scene: THREE.Scene): ParticleSystemManager {
  return new ParticleSystemManager(scene);
}
