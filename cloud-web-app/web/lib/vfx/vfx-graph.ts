/**
 * vfx-graph.ts  — Sprint V33
 *
 * Niagara-style GPU particle VFX graph for Aethel Engine.
 *
 * Architecture:
 *   VFXGraph     — node graph: Emitter → Particles → Solvers → Renderers
 *   VFXEmitter   — spawns particles with configurable burst / rate / shape
 *   ParticlePool — fixed-size typed arrays for GPU-friendly cache layout
 *   VFXSolver    — per-particle simulation (gravity, drag, turbulence, curl noise)
 *   VFXRenderer  — outputs to THREE.Points / THREE.InstancedMesh
 *
 * Each VFXGraph is ticked by the GameLoop (scheduleDeferred for non-critical
 * graphs, or inline for hero effects).
 */

import * as THREE from 'three';

// ---------------------------------------------------------------------------
// Particle data pool (SOA layout for cache efficiency)
// ---------------------------------------------------------------------------

export class ParticlePool {
  readonly capacity: number;
  position: Float32Array;   // xyz per particle
  velocity: Float32Array;   // xyz
  color: Float32Array;      // rgba
  size: Float32Array;       // scalar
  life: Float32Array;       // current remaining life (seconds)
  maxLife: Float32Array;    // initial max life
  alive: Uint8Array;        // 0 = dead, 1 = alive

  constructor(capacity: number) {
    this.capacity = capacity;
    this.position = new Float32Array(capacity * 3);
    this.velocity = new Float32Array(capacity * 3);
    this.color = new Float32Array(capacity * 4);
    this.size = new Float32Array(capacity);
    this.life = new Float32Array(capacity);
    this.maxLife = new Float32Array(capacity);
    this.alive = new Uint8Array(capacity);
  }

  allocate(): number {
    for (let i = 0; i < this.capacity; i++) {
      if (!this.alive[i]) { this.alive[i] = 1; return i; }
    }
    return -1; // pool full
  }

  free(i: number): void { this.alive[i] = 0; }

  get aliveCount(): number { return this.alive.reduce((s, v) => s + v, 0); }
}

// ---------------------------------------------------------------------------
// Emitter shapes
// ---------------------------------------------------------------------------

export type EmitterShape = 'point' | 'sphere' | 'cone' | 'box' | 'ring';

export interface VFXEmitterConfig {
  shape: EmitterShape;
  radius: number;
  coneAngle: number;        // radians, for cone shape
  spawnRate: number;        // particles/second
  burstCount: number;       // particles spawned immediately on init
  /** Initial velocity magnitude range */
  velocityRange: [number, number];
  /** Initial life range */
  lifeRange: [number, number];
  /** Initial size range */
  sizeRange: [number, number];
  colorStart: THREE.Color;
  colorEnd: THREE.Color;
  alphaStart: number;
  alphaEnd: number;
}

export const DEFAULT_EMITTER_CONFIG: VFXEmitterConfig = {
  shape: 'sphere',
  radius: 0.5,
  coneAngle: Math.PI / 6,
  spawnRate: 50,
  burstCount: 0,
  velocityRange: [1, 3],
  lifeRange: [0.5, 2.0],
  sizeRange: [0.02, 0.1],
  colorStart: new THREE.Color(1, 0.5, 0),
  colorEnd: new THREE.Color(0.2, 0, 0),
  alphaStart: 1,
  alphaEnd: 0,
};

function randomInRange([lo, hi]: [number, number]): number {
  return lo + Math.random() * (hi - lo);
}

function spawnPosition(config: VFXEmitterConfig, origin: THREE.Vector3): THREE.Vector3 {
  const p = new THREE.Vector3();
  switch (config.shape) {
    case 'sphere': {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * config.radius;
      p.set(r * Math.sin(phi) * Math.cos(theta), r * Math.sin(phi) * Math.sin(theta), r * Math.cos(phi));
      break;
    }
    case 'cone': {
      const angle = Math.random() * config.coneAngle;
      const azimuth = Math.random() * Math.PI * 2;
      p.set(Math.sin(angle) * Math.cos(azimuth), Math.cos(angle), Math.sin(angle) * Math.sin(azimuth));
      p.multiplyScalar(randomInRange([0, config.radius]));
      break;
    }
    case 'box':
      p.set(
        (Math.random() - 0.5) * config.radius * 2,
        (Math.random() - 0.5) * config.radius * 2,
        (Math.random() - 0.5) * config.radius * 2,
      );
      break;
    case 'ring': {
      const a = Math.random() * Math.PI * 2;
      p.set(Math.cos(a) * config.radius, 0, Math.sin(a) * config.radius);
      break;
    }
    default: break; // point
  }
  return p.add(origin);
}

// ---------------------------------------------------------------------------
// VFX Solver
// ---------------------------------------------------------------------------

export interface VFXSolverConfig {
  gravity: THREE.Vector3;
  drag: number;        // 0..1 — exponential velocity damping per second
  turbulenceStrength: number;
  turbulenceFrequency: number;
  /** Curl noise integration steps — 0 = disabled */
  curlNoiseSteps: number;
}

export const DEFAULT_SOLVER_CONFIG: VFXSolverConfig = {
  gravity: new THREE.Vector3(0, -9.81, 0),
  drag: 0.05,
  turbulenceStrength: 0.5,
  turbulenceFrequency: 1.0,
  curlNoiseSteps: 0,
};

/** Pseudo-random noise for turbulence (gradient hash) */
function noise3(x: number, y: number, z: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return n - Math.floor(n);
}

// ---------------------------------------------------------------------------
// VFXGraph — main orchestrator
// ---------------------------------------------------------------------------

export interface VFXGraphConfig {
  maxParticles: number;
  emitter: Partial<VFXEmitterConfig>;
  solver: Partial<VFXSolverConfig>;
  origin: THREE.Vector3;
  /** Whether the graph auto-destroys when all particles die after bursting */
  oneShot: boolean;
}

export class VFXGraph {
  private pool: ParticlePool;
  private emitterCfg: VFXEmitterConfig;
  private solverCfg: VFXSolverConfig;
  private spawnAccum = 0;
  private origin: THREE.Vector3;
  private dead = false;
  private oneShot: boolean;
  private started = false;

  // Three.js output
  public points: THREE.Points;
  private posAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;

  constructor(config: VFXGraphConfig) {
    this.pool = new ParticlePool(config.maxParticles);
    this.emitterCfg = { ...DEFAULT_EMITTER_CONFIG, ...config.emitter };
    this.solverCfg = { ...DEFAULT_SOLVER_CONFIG, ...config.solver };
    this.origin = config.origin.clone();
    this.oneShot = config.oneShot;

    const geo = new THREE.BufferGeometry();
    const n = config.maxParticles;
    this.posAttr = new THREE.BufferAttribute(new Float32Array(n * 3), 3);
    this.colorAttr = new THREE.BufferAttribute(new Float32Array(n * 4), 4);
    this.sizeAttr = new THREE.BufferAttribute(new Float32Array(n).fill(0.05), 1);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colorAttr);
    geo.setAttribute('size', this.sizeAttr);
    geo.setDrawRange(0, 0);

    const mat = new THREE.PointsMaterial({ vertexColors: true, sizeAttenuation: true, transparent: true, depthWrite: false });
    this.points = new THREE.Points(geo, mat);
  }

  play(): void { this.started = true; this.burstSpawn(this.emitterCfg.burstCount); }
  stop(): void { this.started = false; }
  get isDead(): boolean { return this.dead; }

  private burstSpawn(count: number): void {
    for (let b = 0; b < count; b++) this.spawnParticle();
  }

  private spawnParticle(): void {
    const i = this.pool.allocate();
    if (i < 0) return;
    const p = spawnPosition(this.emitterCfg, this.origin);
    this.pool.position.set([p.x, p.y, p.z], i * 3);
    const vel = p.clone().sub(this.origin).normalize().multiplyScalar(randomInRange(this.emitterCfg.velocityRange));
    this.pool.velocity.set([vel.x, vel.y, vel.z], i * 3);
    const life = randomInRange(this.emitterCfg.lifeRange);
    this.pool.life[i] = life;
    this.pool.maxLife[i] = life;
    this.pool.size[i] = randomInRange(this.emitterCfg.sizeRange);
    const { r, g, b } = this.emitterCfg.colorStart;
    this.pool.color.set([r, g, b, this.emitterCfg.alphaStart], i * 4);
  }

  update(dt: number): void {
    if (this.dead) return;

    // Emit new particles
    if (this.started) {
      this.spawnAccum += this.emitterCfg.spawnRate * dt;
      while (this.spawnAccum >= 1) { this.spawnParticle(); this.spawnAccum -= 1; }
    }

    const { gravity, drag, turbulenceStrength, turbulenceFrequency } = this.solverCfg;
    const { colorEnd, alphaEnd, colorStart, alphaStart } = this.emitterCfg;
    let drawCount = 0;

    for (let i = 0; i < this.pool.capacity; i++) {
      if (!this.pool.alive[i]) continue;
      this.pool.life[i] -= dt;
      if (this.pool.life[i] <= 0) { this.pool.free(i); continue; }

      // Integrate velocity
      const ix = i * 3;
      this.pool.velocity[ix] += gravity.x * dt;
      this.pool.velocity[ix + 1] += gravity.y * dt;
      this.pool.velocity[ix + 2] += gravity.z * dt;

      // Turbulence
      if (turbulenceStrength > 0) {
        const px = this.pool.position[ix] * turbulenceFrequency;
        const py = this.pool.position[ix + 1] * turbulenceFrequency;
        const pz = this.pool.position[ix + 2] * turbulenceFrequency;
        this.pool.velocity[ix] += (noise3(px, py, pz) - 0.5) * turbulenceStrength * dt;
        this.pool.velocity[ix + 1] += (noise3(py, pz, px) - 0.5) * turbulenceStrength * dt;
        this.pool.velocity[ix + 2] += (noise3(pz, px, py) - 0.5) * turbulenceStrength * dt;
      }

      // Drag
      const dragFactor = Math.pow(1 - drag, dt);
      this.pool.velocity[ix] *= dragFactor;
      this.pool.velocity[ix + 1] *= dragFactor;
      this.pool.velocity[ix + 2] *= dragFactor;

      // Integrate position
      this.pool.position[ix] += this.pool.velocity[ix] * dt;
      this.pool.position[ix + 1] += this.pool.velocity[ix + 1] * dt;
      this.pool.position[ix + 2] += this.pool.velocity[ix + 2] * dt;

      // Colour lerp by age
      const age = 1 - this.pool.life[i] / this.pool.maxLife[i];
      const ic = i * 4;
      this.pool.color[ic] = colorStart.r + (colorEnd.r - colorStart.r) * age;
      this.pool.color[ic + 1] = colorStart.g + (colorEnd.g - colorStart.g) * age;
      this.pool.color[ic + 2] = colorStart.b + (colorEnd.b - colorStart.b) * age;
      this.pool.color[ic + 3] = alphaStart + (alphaEnd - alphaStart) * age;

      // Pack into GPU buffers at drawCount slot (compact)
      const dc3 = drawCount * 3, dc4 = drawCount * 4;
      this.posAttr.array[dc3] = this.pool.position[ix];
      this.posAttr.array[dc3 + 1] = this.pool.position[ix + 1];
      this.posAttr.array[dc3 + 2] = this.pool.position[ix + 2];
      (this.colorAttr.array as Float32Array).set(this.pool.color.subarray(ic, ic + 4), dc4);
      (this.sizeAttr.array as Float32Array)[drawCount] = this.pool.size[i];
      drawCount++;
    }

    this.posAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;
    this.points.geometry.setDrawRange(0, drawCount);

    if (this.oneShot && !this.started && drawCount === 0) this.dead = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}

// ---------------------------------------------------------------------------
// Preset VFX factories
// ---------------------------------------------------------------------------

export function createFireVFX(origin: THREE.Vector3): VFXGraph {
  return new VFXGraph({
    maxParticles: 500,
    origin,
    oneShot: false,
    emitter: {
      shape: 'cone',
      coneAngle: Math.PI / 8,
      radius: 0.3,
      spawnRate: 120,
      burstCount: 0,
      velocityRange: [1.5, 3],
      lifeRange: [0.3, 0.8],
      sizeRange: [0.05, 0.2],
      colorStart: new THREE.Color(1, 0.6, 0.1),
      colorEnd: new THREE.Color(0.8, 0, 0),
      alphaStart: 0.9,
      alphaEnd: 0,
    },
    solver: { gravity: new THREE.Vector3(0, 2, 0), turbulenceStrength: 0.8, drag: 0.1 },
  });
}

export function createExplosionVFX(origin: THREE.Vector3): VFXGraph {
  return new VFXGraph({
    maxParticles: 300,
    origin,
    oneShot: true,
    emitter: {
      shape: 'sphere',
      radius: 0.2,
      burstCount: 300,
      spawnRate: 0,
      velocityRange: [3, 12],
      lifeRange: [0.4, 1.2],
      sizeRange: [0.03, 0.15],
      colorStart: new THREE.Color(1, 0.8, 0.2),
      colorEnd: new THREE.Color(0.2, 0.1, 0),
      alphaStart: 1,
      alphaEnd: 0,
    },
    solver: { gravity: new THREE.Vector3(0, -4, 0), drag: 0.15, turbulenceStrength: 1.5 },
  });
}

export function createMagicAuraVFX(origin: THREE.Vector3, color: THREE.Color): VFXGraph {
  return new VFXGraph({
    maxParticles: 200,
    origin,
    oneShot: false,
    emitter: {
      shape: 'ring',
      radius: 0.8,
      spawnRate: 40,
      velocityRange: [0.2, 0.8],
      lifeRange: [1.0, 2.0],
      sizeRange: [0.02, 0.06],
      colorStart: color,
      colorEnd: new THREE.Color(0, 0, 0),
      alphaStart: 0.8,
      alphaEnd: 0,
    },
    solver: { gravity: new THREE.Vector3(0, 0.5, 0), turbulenceStrength: 0.3, drag: 0.05 },
  });
}
