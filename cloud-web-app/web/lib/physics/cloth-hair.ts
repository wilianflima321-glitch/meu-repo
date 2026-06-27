/**
 * cloth-hair.ts  — Sprint V33
 *
 * Position-Based Dynamics (PBD) cloth and hair simulation for Aethel Engine.
 *
 * Cloth: grid-based particle mesh with stretch, shear, and bend constraints.
 * Hair:  chain of particles with length + angular constraints + aerodynamics.
 *
 * PBD reference (Müller et al., 2007):
 *   x* = x + dt·v + dt²·f/m
 *   Solve constraints iteratively on x*
 *   v = (x* - x) / dt
 *   x = x*
 *
 * GPU acceleration via WebGPU compute is planned; this implementation is the
 * CPU reference that drives Three.js BufferGeometry updates each frame.
 */

import * as THREE from 'three';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('cloth-hair');

const GRAVITY = new THREE.Vector3(0, -9.81, 0);
const DAMPING = 0.98;

// ---------------------------------------------------------------------------
// Shared particle
// ---------------------------------------------------------------------------

interface Particle {
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  inverseMass: number; // 0 = pinned
}

interface DistanceConstraint {
  a: number;
  b: number;
  restLength: number;
  stiffness: number; // 0..1
}

// ---------------------------------------------------------------------------
// ClothSimulator
// ---------------------------------------------------------------------------

export interface ClothConfig {
  width: number;        // grid columns
  height: number;       // grid rows
  spacing: number;      // world-space distance between particles (metres)
  mass: number;         // kg per particle
  stretchStiffness: number; // 0..1
  shearStiffness: number;
  bendStiffness: number;
  iterations: number;   // PBD solver iterations per step
  windForce: THREE.Vector3;
}

export const DEFAULT_CLOTH_CONFIG: ClothConfig = {
  width: 20,
  height: 20,
  spacing: 0.1,
  mass: 0.05,
  stretchStiffness: 0.9,
  shearStiffness: 0.5,
  bendStiffness: 0.2,
  iterations: 8,
  windForce: new THREE.Vector3(0.2, 0, 0.1),
};

export class ClothSimulator {
  private particles: Particle[] = [];
  private constraints: DistanceConstraint[] = [];
  public geometry: THREE.BufferGeometry;
  private positionAttr: THREE.BufferAttribute;
  private normalAttr: THREE.BufferAttribute;

  constructor(
    private config: ClothConfig = DEFAULT_CLOTH_CONFIG,
    origin = new THREE.Vector3(0, 3, 0),
  ) {
    const { width, height, spacing, mass } = config;
    const invM = 1 / mass;

    // Build particles
    for (let iy = 0; iy < height; iy++) {
      for (let ix = 0; ix < width; ix++) {
        const pos = origin.clone().add(new THREE.Vector3(ix * spacing, 0, iy * spacing));
        this.particles.push({
          position: pos,
          prevPosition: pos.clone(),
          velocity: new THREE.Vector3(),
          inverseMass: (iy === 0) ? 0 : invM, // pin top row
        });
      }
    }

    // Stretch constraints (horizontal + vertical)
    for (let iy = 0; iy < height; iy++) {
      for (let ix = 0; ix < width; ix++) {
        const i = iy * width + ix;
        if (ix + 1 < width) this.addConstraint(i, i + 1, spacing, config.stretchStiffness);
        if (iy + 1 < height) this.addConstraint(i, i + width, spacing, config.stretchStiffness);
        // Shear
        if (ix + 1 < width && iy + 1 < height) {
          this.addConstraint(i, i + width + 1, spacing * Math.SQRT2, config.shearStiffness);
          this.addConstraint(i + 1, i + width, spacing * Math.SQRT2, config.shearStiffness);
        }
        // Bend (skip-1 neighbours)
        if (ix + 2 < width) this.addConstraint(i, i + 2, spacing * 2, config.bendStiffness);
        if (iy + 2 < height) this.addConstraint(i, i + width * 2, spacing * 2, config.bendStiffness);
      }
    }

    this.geometry = this.buildGeometry();
    this.positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    this.normalAttr = this.geometry.getAttribute('normal') as THREE.BufferAttribute;

    log.info('ClothSimulator created', { particles: this.particles.length, constraints: this.constraints.length });
  }

  private addConstraint(a: number, b: number, rest: number, stiffness: number): void {
    this.constraints.push({ a, b, restLength: rest, stiffness });
  }

  private buildGeometry(): THREE.BufferGeometry {
    const { width, height } = this.config;
    const positions = new Float32Array(width * height * 3);
    const normals = new Float32Array(width * height * 3);
    const uvs = new Float32Array(width * height * 2);
    const indices: number[] = [];

    for (let iy = 0; iy < height; iy++) {
      for (let ix = 0; ix < width; ix++) {
        const i = iy * width + ix;
        const p = this.particles[i].position;
        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
        normals[i * 3 + 1] = 1;
        uvs[i * 2] = ix / (width - 1);
        uvs[i * 2 + 1] = iy / (height - 1);
        if (ix + 1 < width && iy + 1 < height) {
          indices.push(i, i + 1, i + width, i + 1, i + width + 1, i + width);
        }
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    return geo;
  }

  step(dt: number): void {
    const { iterations, windForce } = this.config;
    const dtSq = dt * dt;

    // 1. Integrate + apply external forces
    for (const p of this.particles) {
      if (p.inverseMass === 0) continue;
      const acc = GRAVITY.clone().add(windForce).multiplyScalar(p.inverseMass);
      p.prevPosition.copy(p.position);
      p.position.addScaledVector(p.velocity, dt).addScaledVector(acc, dtSq);
    }

    // 2. Solve constraints (Gauss-Seidel)
    for (let iter = 0; iter < iterations; iter++) {
      for (const c of this.constraints) {
        const pa = this.particles[c.a];
        const pb = this.particles[c.b];
        const diff = pb.position.clone().sub(pa.position);
        const dist = diff.length();
        if (dist < 1e-8) continue;
        const correction = diff.multiplyScalar((dist - c.restLength) / dist * c.stiffness);
        const wA = pa.inverseMass / (pa.inverseMass + pb.inverseMass + 1e-10);
        const wB = 1 - wA;
        if (pa.inverseMass > 0) pa.position.addScaledVector(correction, wA);
        if (pb.inverseMass > 0) pb.position.addScaledVector(correction, -wB);
      }
    }

    // 3. Compute velocity + damping
    for (const p of this.particles) {
      if (p.inverseMass === 0) continue;
      p.velocity.copy(p.position).sub(p.prevPosition).divideScalar(dt).multiplyScalar(DAMPING);
    }

    // 4. Update geometry
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i].position;
      this.positionAttr.setXYZ(i, p.x, p.y, p.z);
    }
    this.positionAttr.needsUpdate = true;
    this.geometry.computeVertexNormals();
  }

  pinParticle(index: number): void { this.particles[index].inverseMass = 0; }
  unpinParticle(index: number, mass: number): void { this.particles[index].inverseMass = 1 / mass; }
}

// ---------------------------------------------------------------------------
// HairStrandSimulator
// ---------------------------------------------------------------------------

export interface HairConfig {
  segmentCount: number;     // particles per strand
  segmentLength: number;    // metres
  stiffness: number;        // 0..1 (angular constraint)
  iterations: number;
  windForce: THREE.Vector3;
  aeroDrag: number;         // 0..1
}

export const DEFAULT_HAIR_CONFIG: HairConfig = {
  segmentCount: 12,
  segmentLength: 0.05,
  stiffness: 0.8,
  iterations: 6,
  windForce: new THREE.Vector3(0.05, 0, 0.02),
  aeroDrag: 0.02,
};

export class HairStrandSimulator {
  private strands: Particle[][] = [];

  constructor(
    private roots: THREE.Vector3[],
    private config: HairConfig = DEFAULT_HAIR_CONFIG,
  ) {
    for (const root of roots) {
      const strand: Particle[] = [];
      for (let i = 0; i < config.segmentCount; i++) {
        const pos = root.clone().sub(new THREE.Vector3(0, i * config.segmentLength, 0));
        strand.push({
          position: pos,
          prevPosition: pos.clone(),
          velocity: new THREE.Vector3(),
          inverseMass: i === 0 ? 0 : 1,
        });
      }
      this.strands.push(strand);
    }

    log.info('HairSimulator created', { strands: roots.length, segmentsPerStrand: config.segmentCount });
  }

  updateRoot(strandIndex: number, newRoot: THREE.Vector3): void {
    const s = this.strands[strandIndex];
    if (s) { s[0].position.copy(newRoot); s[0].prevPosition.copy(newRoot); }
  }

  step(dt: number): void {
    const { iterations, windForce, aeroDrag, stiffness, segmentLength } = this.config;
    const dtSq = dt * dt;

    for (const strand of this.strands) {
      // Integrate
      for (const p of strand) {
        if (p.inverseMass === 0) continue;
        const drag = p.velocity.clone().multiplyScalar(-aeroDrag);
        const acc = GRAVITY.clone().add(windForce).add(drag);
        p.prevPosition.copy(p.position);
        p.position.addScaledVector(acc, dtSq);
      }

      // Length constraints
      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < strand.length - 1; i++) {
          const pa = strand[i];
          const pb = strand[i + 1];
          const d = pb.position.clone().sub(pa.position);
          const dist = d.length();
          if (dist < 1e-8) continue;
          const corr = d.multiplyScalar((dist - segmentLength) / dist * stiffness);
          if (pa.inverseMass > 0) pa.position.add(corr.clone().multiplyScalar(0.5));
          if (pb.inverseMass > 0) pb.position.sub(corr.multiplyScalar(0.5));
        }
      }

      // Velocity
      for (const p of strand) {
        if (p.inverseMass === 0) continue;
        p.velocity.copy(p.position).sub(p.prevPosition).divideScalar(dt).multiplyScalar(DAMPING);
      }
    }
  }

  getStrandPositions(): THREE.Vector3[][] {
    return this.strands.map((s) => s.map((p) => p.position.clone()));
  }
}
