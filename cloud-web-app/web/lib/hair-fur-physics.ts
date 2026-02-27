import * as THREE from 'three';
import type { HairCollider, HairSegment, HairStrand } from './hair-fur-types';

export class HairPhysicsSimulation {
  private strands: HairStrand[] = [];
  private colliders: HairCollider[] = [];

  private gravity: THREE.Vector3 = new THREE.Vector3(0, -9.81, 0);
  private wind: THREE.Vector3 = new THREE.Vector3();
  private windTurbulence: number = 0;

  private stiffness: number = 0.8;
  private damping: number = 0.95;
  private iterations: number = 3;

  constructor(stiffness: number = 0.8, damping: number = 0.95) {
    this.stiffness = stiffness;
    this.damping = damping;
  }

  addStrand(strand: HairStrand): void {
    this.strands.push(strand);
  }

  addCollider(collider: HairCollider): void {
    this.colliders.push(collider);
  }

  setWind(direction: THREE.Vector3, turbulence: number = 0): void {
    this.wind.copy(direction);
    this.windTurbulence = turbulence;
  }

  simulate(deltaTime: number, rootTransform?: THREE.Matrix4): void {
    const dt = Math.min(deltaTime, 1 / 30);

    for (const strand of this.strands) {
      this.simulateStrand(strand, dt, rootTransform);
    }
  }

  private simulateStrand(strand: HairStrand, dt: number, rootTransform?: THREE.Matrix4): void {
    const segments = strand.segments;

    if (rootTransform) {
      const newRootPos = strand.rootPosition.clone().applyMatrix4(rootTransform);
      segments[0].position.copy(newRootPos);
    }

    for (let i = 1; i < segments.length; i++) {
      const seg = segments[i];
      const force = this.gravity.clone();

      if (this.wind.lengthSq() > 0) {
        const windNoise = this.wind
          .clone()
          .multiplyScalar(1 + (Math.random() - 0.5) * this.windTurbulence);
        force.add(windNoise);
      }

      const acceleration = force.clone().multiplyScalar(dt * dt);
      const newPosition = seg.position
        .clone()
        .multiplyScalar(2)
        .sub(seg.previousPosition)
        .add(acceleration);

      const velocity = newPosition.clone().sub(seg.position);
      velocity.multiplyScalar(this.damping);

      seg.previousPosition.copy(seg.position);
      seg.position.add(velocity);
    }

    for (let iter = 0; iter < this.iterations; iter++) {
      for (let i = 1; i < segments.length; i++) {
        const segPrev = segments[i - 1];
        const seg = segments[i];

        const diff = seg.position.clone().sub(segPrev.position);
        const dist = diff.length();

        if (dist > 0.0001) {
          const correction = diff.multiplyScalar((dist - seg.restLength) / dist);

          if (i === 1) {
            seg.position.sub(correction);
          } else {
            correction.multiplyScalar(0.5);
            segPrev.position.add(correction);
            seg.position.sub(correction);
          }
        }
      }

      for (let i = 2; i < segments.length; i++) {
        const seg0 = segments[i - 2];
        const seg1 = segments[i - 1];
        const seg2 = segments[i];

        const dir1 = seg1.position.clone().sub(seg0.position).normalize();
        const dir2 = seg2.position.clone().sub(seg1.position).normalize();

        const targetDir = dir1.clone().lerp(dir2, 1 - this.stiffness);
        const targetPos = seg1.position.clone().add(targetDir.multiplyScalar(seg2.restLength));

        seg2.position.lerp(targetPos, this.stiffness * 0.5);
      }

      for (const collider of this.colliders) {
        for (let i = 1; i < segments.length; i++) {
          this.resolveCollision(segments[i], collider);
        }
      }
    }
  }

  private resolveCollision(segment: HairSegment, collider: HairCollider): void {
    if (collider.type === 'sphere' && collider.radius) {
      const diff = segment.position.clone().sub(collider.position);
      const dist = diff.length();

      if (dist < collider.radius) {
        const normal = diff.normalize();
        segment.position.copy(collider.position).add(normal.multiplyScalar(collider.radius + 0.001));
      }
      return;
    }

    if (collider.type === 'capsule' && collider.radius && collider.height && collider.direction) {
      const axis = collider.direction.clone().normalize();
      const p1 = collider.position.clone();
      const p2 = collider.position.clone().add(axis.multiplyScalar(collider.height));

      const d = segment.position.clone().sub(p1);
      let t = d.dot(axis) / collider.height;
      t = Math.max(0, Math.min(1, t));

      const closestPoint = p1.clone().lerp(p2, t);
      const diff = segment.position.clone().sub(closestPoint);
      const dist = diff.length();

      if (dist < collider.radius) {
        const normal = diff.normalize();
        segment.position.copy(closestPoint).add(normal.multiplyScalar(collider.radius + 0.001));
      }
    }
  }

  getStrands(): HairStrand[] {
    return this.strands;
  }

  clear(): void {
    this.strands = [];
    this.colliders = [];
  }
}
