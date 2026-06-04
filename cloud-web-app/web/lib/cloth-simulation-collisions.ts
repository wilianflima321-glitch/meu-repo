// @aethel-heavy-async-boundary Studio/render-gated cloth collision runtime.
import * as THREE from 'three';
import type { ClothCollider, ClothParticle } from './cloth-simulation-contracts';

export class ClothCollisionHandler {
  private colliders: ClothCollider[] = [];
  private friction: number = 0.3;
  addCollider(collider: ClothCollider): void {
    this.colliders.push(collider);
  }
  removeCollider(collider: ClothCollider): void {
    const index = this.colliders.indexOf(collider);
    if (index !== -1) {
      this.colliders.splice(index, 1);
    }
  }
  clearColliders(): void {
    this.colliders = [];
  }
  handleCollisions(particles: ClothParticle[]): void {
    for (const particle of particles) {
      if (particle.pinned) continue;
      for (const collider of this.colliders) {
        this.handleCollision(particle, collider);
      }
    }
  }
  private handleCollision(particle: ClothParticle, collider: ClothCollider): void {
    switch (collider.type) {
      case 'sphere':
        this.handleSphereCollision(particle, collider);
        break;
      case 'plane':
        this.handlePlaneCollision(particle, collider);
        break;
      case 'capsule':
        this.handleCapsuleCollision(particle, collider);
        break;
      case 'box':
        this.handleBoxCollision(particle, collider);
        break;
    }
  }
  private handleSphereCollision(particle: ClothParticle, collider: ClothCollider): void {
    if (!collider.radius) return;
    const delta = particle.position.clone().sub(collider.position);
    const distance = delta.length();
    const minDist = collider.radius + 0.01; // Small offset
    if (distance < minDist) {
      const normal = delta.normalize();
      particle.position.copy(collider.position).add(normal.multiplyScalar(minDist));
      const velocity = particle.position.clone().sub(particle.previousPosition);
      const normalVelocity = normal.multiplyScalar(velocity.dot(normal));
      const tangentVelocity = velocity.sub(normalVelocity);
      tangentVelocity.multiplyScalar(1 - this.friction);
      particle.previousPosition.copy(particle.position.clone().sub(tangentVelocity));
    }
  }
  private handlePlaneCollision(particle: ClothParticle, collider: ClothCollider): void {
    if (!collider.normal) return;
    const dot = particle.position.clone().sub(collider.position).dot(collider.normal);
    if (dot < 0.01) {
      particle.position.add(collider.normal.clone().multiplyScalar(-dot + 0.01));
      const velocity = particle.position.clone().sub(particle.previousPosition);
      const normalVelocity = collider.normal.clone().multiplyScalar(velocity.dot(collider.normal));
      const tangentVelocity = velocity.sub(normalVelocity);
      tangentVelocity.multiplyScalar(1 - this.friction);
      particle.previousPosition.copy(particle.position.clone().sub(tangentVelocity));
    }
  }
  private handleCapsuleCollision(particle: ClothParticle, collider: ClothCollider): void {
    if (!collider.start || !collider.end || !collider.radius) return;
    const lineDir = collider.end.clone().sub(collider.start);
    const lineLength = lineDir.length();
    lineDir.normalize();
    const toParticle = particle.position.clone().sub(collider.start);
    let t = toParticle.dot(lineDir);
    t = Math.max(0, Math.min(lineLength, t));
    const closestPoint = collider.start.clone().add(lineDir.multiplyScalar(t));
    const delta = particle.position.clone().sub(closestPoint);
    const distance = delta.length();
    const minDist = collider.radius + 0.01;
    if (distance < minDist) {
      const normal = delta.normalize();
      particle.position.copy(closestPoint).add(normal.multiplyScalar(minDist));
    }
  }
  private handleBoxCollision(particle: ClothParticle, collider: ClothCollider): void {
    if (!collider.size) return;
    const halfSize = collider.size.clone().multiplyScalar(0.5);
    const localPos = particle.position.clone().sub(collider.position);
    if (
      Math.abs(localPos.x) < halfSize.x &&
      Math.abs(localPos.y) < halfSize.y &&
      Math.abs(localPos.z) < halfSize.z
    ) {
      const dx = halfSize.x - Math.abs(localPos.x);
      const dy = halfSize.y - Math.abs(localPos.y);
      const dz = halfSize.z - Math.abs(localPos.z);
      if (dx < dy && dx < dz) {
        localPos.x = Math.sign(localPos.x) * halfSize.x;
      } else if (dy < dz) {
        localPos.y = Math.sign(localPos.y) * halfSize.y;
      } else {
        localPos.z = Math.sign(localPos.z) * halfSize.z;
      }
      particle.position.copy(collider.position).add(localPos);
    }
  }
  setFriction(friction: number): void {
    this.friction = Math.max(0, Math.min(1, friction));
  }
}
export class SelfCollisionHandler {
  private enabled: boolean = true;
  private thickness: number = 0.02;
  private hashGrid: Map<string, number[]> = new Map();
  private cellSize: number;
  constructor(cellSize: number = 0.1) {
    this.cellSize = cellSize;
  }
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  handleSelfCollisions(particles: ClothParticle[]): void {
    if (!this.enabled) return;
    this.buildHashGrid(particles);
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      if (p1.pinned) continue;
      const neighbors = this.getNearbyParticles(p1.position);
      for (const j of neighbors) {
        if (i >= j) continue; // Avoid duplicate checks
        const p2 = particles[j];
        if (p2.pinned) continue;
        const delta = p2.position.clone().sub(p1.position);
        const distance = delta.length();
        if (distance < this.thickness && distance > 0) {
          const normal = delta.normalize();
          const correction = (this.thickness - distance) * 0.5;
          p1.position.sub(normal.clone().multiplyScalar(correction));
          p2.position.add(normal.clone().multiplyScalar(correction));
        }
      }
    }
  }
  private buildHashGrid(particles: ClothParticle[]): void {
    this.hashGrid.clear();
    for (let i = 0; i < particles.length; i++) {
      const key = this.getHashKey(particles[i].position);
      if (!this.hashGrid.has(key)) {
        this.hashGrid.set(key, []);
      }
      this.hashGrid.get(key)!.push(i);
    }
  }
  private getHashKey(position: THREE.Vector3): string {
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    return `${x},${y},${z}`;
  }
  private getNearbyParticles(position: THREE.Vector3): number[] {
    const result: number[] = [];
    const x = Math.floor(position.x / this.cellSize);
    const y = Math.floor(position.y / this.cellSize);
    const z = Math.floor(position.z / this.cellSize);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${x + dx},${y + dy},${z + dz}`;
          const particles = this.hashGrid.get(key);
          if (particles) {
            result.push(...particles);
          }
        }
      }
    }
    return result;
  }
  setThickness(thickness: number): void {
    this.thickness = Math.max(0.001, thickness);
  }
}
