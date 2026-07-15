// @aethel-heavy-async-boundary Particle manager is a Studio/runtime module, not a public shell dependency.
import { EventEmitter } from 'events';

import { createFireParticleSettings, createSmokeParticleSettings, createSparkParticleSettings } from './advanced-particle-presets';
import { createParticleGroup, ParticleEmitter } from './advanced-particle-system';
import type { Group } from '@/lib/three';
import type { ParticleSystemSettings } from './advanced-particle-system-types';

export class ParticleSystemManager extends EventEmitter {
  private emitters: Map<string, ParticleEmitter> = new Map();
  private group: Group = createParticleGroup();

  constructor() {
    super();
  }

  createEmitter(settings: ParticleSystemSettings): ParticleEmitter {
    const emitter = new ParticleEmitter(settings);
    this.emitters.set(settings.id, emitter);

    const mesh = emitter.getMesh();
    if (mesh) {
      this.group.add(mesh);
    }

    this.emit('emitterCreated', { emitter, settings });
    return emitter;
  }

  removeEmitter(id: string): void {
    const emitter = this.emitters.get(id);
    if (!emitter) return;

    const mesh = emitter.getMesh();
    if (mesh) {
      this.group.remove(mesh);
    }

    emitter.dispose();
    this.emitters.delete(id);

    this.emit('emitterRemoved', { id });
  }

  getEmitter(id: string): ParticleEmitter | undefined {
    return this.emitters.get(id);
  }

  getAllEmitters(): ParticleEmitter[] {
    return Array.from(this.emitters.values());
  }

  getGroup(): Group {
    return this.group;
  }

  playAll(): void {
    for (const emitter of this.emitters.values()) {
      emitter.play();
    }
  }

  stopAll(): void {
    for (const emitter of this.emitters.values()) {
      emitter.stop();
    }
  }

  pauseAll(): void {
    for (const emitter of this.emitters.values()) {
      emitter.pause();
    }
  }

  update(deltaTime: number): void {
    for (const emitter of this.emitters.values()) {
      emitter.update(deltaTime);
    }
  }

  getTotalParticleCount(): number {
    let total = 0;
    for (const emitter of this.emitters.values()) {
      total += emitter.getActiveParticleCount();
    }
    return total;
  }

  createFireEffect(position: { x: number; y: number; z: number }): ParticleEmitter {
    return this.createEmitter(createFireParticleSettings(position));
  }

  createSmokeEffect(position: { x: number; y: number; z: number }): ParticleEmitter {
    return this.createEmitter(createSmokeParticleSettings(position));
  }

  createSparkEffect(position: { x: number; y: number; z: number }): ParticleEmitter {
    return this.createEmitter(createSparkParticleSettings(position));
  }

  dispose(): void {
    for (const emitter of this.emitters.values()) {
      emitter.dispose();
    }
    this.emitters.clear();

    while (this.group.children.length > 0) {
      this.group.remove(this.group.children[0]);
    }
  }
}
