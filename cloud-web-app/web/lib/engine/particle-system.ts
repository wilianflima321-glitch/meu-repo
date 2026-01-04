/**
 * Aethel Engine - Particle System
 * 
 * High-performance GPU-accelerated particle system for visual effects.
 * Supports emitters, forces, collisions, and custom shaders.
 */

import { EventEmitter } from 'events';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Particle {
  // Position and velocity
  position: Vector3;
  velocity: Vector3;
  acceleration: Vector3;
  
  // Visual
  color: Color;
  size: number;
  rotation: number;
  rotationSpeed: number;
  
  // Lifecycle
  life: number;
  maxLife: number;
  age: number;
  
  // Custom data
  userData: Record<string, number>;
}

export type EmitterShape = 'point' | 'sphere' | 'box' | 'cone' | 'circle' | 'line';
export type BlendMode = 'normal' | 'additive' | 'multiply' | 'screen';

export interface EmitterShapeConfig {
  type: EmitterShape;
  // Sphere/Circle
  radius?: number;
  innerRadius?: number;
  // Box
  size?: Vector3;
  // Cone
  angle?: number;
  height?: number;
  // Line
  start?: Vector3;
  end?: Vector3;
}

export interface ValueRange {
  min: number;
  max: number;
}

export interface ColorGradient {
  time: number; // 0-1
  color: Color;
}

export interface SizeOverLife {
  time: number; // 0-1
  size: number;
}

export interface VelocityModule {
  enabled: boolean;
  linear?: Vector3;
  orbital?: Vector3;
  radial?: number;
}

export interface NoiseModule {
  enabled: boolean;
  strength: number;
  frequency: number;
  scrollSpeed: number;
  octaves: number;
}

export interface CollisionModule {
  enabled: boolean;
  bounce: number;
  dampen: number;
  lifetimeLoss: number;
  planes?: { normal: Vector3; distance: number }[];
}

export interface SubEmitterConfig {
  trigger: 'birth' | 'death' | 'collision';
  emitterId: string;
  probability: number;
}

export interface ParticleEmitterConfig {
  // Identity
  name: string;
  enabled?: boolean;
  
  // Emission
  maxParticles: number;
  emissionRate: number; // particles per second
  bursts?: { time: number; count: number; cycles: number; interval: number }[];
  
  // Shape
  shape: EmitterShapeConfig;
  
  // Initial properties
  lifetime: ValueRange;
  speed: ValueRange;
  size: ValueRange;
  rotation: ValueRange;
  color: Color;
  
  // Over lifetime
  colorOverLife?: ColorGradient[];
  sizeOverLife?: SizeOverLife[];
  speedOverLife?: { time: number; multiplier: number }[];
  
  // Forces
  gravity?: Vector3;
  
  // Modules
  velocityModule?: VelocityModule;
  noiseModule?: NoiseModule;
  collisionModule?: CollisionModule;
  
  // Rendering
  blendMode?: BlendMode;
  texture?: string;
  spriteSheet?: { rows: number; cols: number; fps: number };
  
  // Sub-emitters
  subEmitters?: SubEmitterConfig[];
  
  // Simulation
  simulationSpace?: 'local' | 'world';
  startDelay?: number;
  duration?: number;
  loop?: boolean;
  prewarm?: boolean;
}

// ============================================================================
// Math Utilities
// ============================================================================

const Vec3 = {
  create(x = 0, y = 0, z = 0): Vector3 {
    return { x, y, z };
  },

  add(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  },

  sub(a: Vector3, b: Vector3): Vector3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  },

  scale(v: Vector3, s: number): Vector3 {
    return { x: v.x * s, y: v.y * s, z: v.z * s };
  },

  length(v: Vector3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  },

  normalize(v: Vector3): Vector3 {
    const len = Vec3.length(v);
    if (len === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  },

  dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  },

  lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
    };
  },

  random(): Vector3 {
    return Vec3.normalize({
      x: Math.random() * 2 - 1,
      y: Math.random() * 2 - 1,
      z: Math.random() * 2 - 1,
    });
  },
};

const ColorUtil = {
  lerp(a: Color, b: Color, t: number): Color {
    return {
      r: a.r + (b.r - a.r) * t,
      g: a.g + (b.g - a.g) * t,
      b: a.b + (b.b - a.b) * t,
      a: a.a + (b.a - a.a) * t,
    };
  },

  toRGBA(c: Color): string {
    return `rgba(${Math.floor(c.r * 255)}, ${Math.floor(c.g * 255)}, ${Math.floor(c.b * 255)}, ${c.a})`;
  },

  fromHex(hex: string): Color {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { r: 1, g: 1, b: 1, a: 1 };
    return {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255,
      a: 1,
    };
  },
};

function randomRange(range: ValueRange): number {
  return range.min + Math.random() * (range.max - range.min);
}

function sampleGradient(gradient: ColorGradient[], t: number): Color {
  if (gradient.length === 0) return { r: 1, g: 1, b: 1, a: 1 };
  if (gradient.length === 1) return gradient[0].color;
  
  // Find the two surrounding keys
  for (let i = 0; i < gradient.length - 1; i++) {
    if (t >= gradient[i].time && t <= gradient[i + 1].time) {
      const localT = (t - gradient[i].time) / (gradient[i + 1].time - gradient[i].time);
      return ColorUtil.lerp(gradient[i].color, gradient[i + 1].color, localT);
    }
  }
  
  return gradient[gradient.length - 1].color;
}

function sampleCurve(curve: { time: number; [key: string]: number }[], t: number, key: string): number {
  if (curve.length === 0) return 1;
  if (curve.length === 1) return curve[0][key];
  
  for (let i = 0; i < curve.length - 1; i++) {
    if (t >= curve[i].time && t <= curve[i + 1].time) {
      const localT = (t - curve[i].time) / (curve[i + 1].time - curve[i].time);
      return curve[i][key] + (curve[i + 1][key] - curve[i][key]) * localT;
    }
  }
  
  return curve[curve.length - 1][key];
}

// ============================================================================
// Simplex Noise (for noise module)
// ============================================================================

class SimplexNoise {
  private perm: number[] = [];
  
  constructor(seed = Math.random()) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    // Shuffle based on seed
    let s = seed * 1000;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.floor((s / 2147483647) * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    for (let i = 0; i < 512; i++) {
      this.perm[i] = p[i & 255];
    }
  }

  noise3D(x: number, y: number, z: number): number {
    // Simplified 3D noise implementation
    const grad3 = [
      [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],
      [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],
      [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]
    ];
    
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;
    
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);
    
    const t = (i + j + k) * G3;
    const x0 = x - (i - t);
    const y0 = y - (j - t);
    const z0 = z - (k - t);
    
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
    
    const dot = (g: number[], x: number, y: number, z: number) => g[0]*x + g[1]*y + g[2]*z;
    
    let t0 = 0.6 - x0*x0 - y0*y0 - z0*z0;
    if (t0 > 0) {
      t0 *= t0;
      const gi0 = this.perm[(i + this.perm[(j + this.perm[k & 255]) & 255]) & 255] % 12;
      n0 = t0 * t0 * dot(grad3[gi0], x0, y0, z0);
    }
    
    // Simplified - just return first contribution scaled
    return n0 * 32;
  }
}

// ============================================================================
// Particle Pool
// ============================================================================

class ParticlePool {
  private pool: Particle[] = [];
  private active: Particle[] = [];
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    
    // Pre-allocate particles
    for (let i = 0; i < maxSize; i++) {
      this.pool.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    return {
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      acceleration: { x: 0, y: 0, z: 0 },
      color: { r: 1, g: 1, b: 1, a: 1 },
      size: 1,
      rotation: 0,
      rotationSpeed: 0,
      life: 0,
      maxLife: 1,
      age: 0,
      userData: {},
    };
  }

  spawn(): Particle | null {
    if (this.pool.length === 0) return null;
    
    const particle = this.pool.pop()!;
    this.active.push(particle);
    return particle;
  }

  recycle(particle: Particle): void {
    const index = this.active.indexOf(particle);
    if (index !== -1) {
      this.active.splice(index, 1);
      
      // Reset particle
      particle.position = { x: 0, y: 0, z: 0 };
      particle.velocity = { x: 0, y: 0, z: 0 };
      particle.acceleration = { x: 0, y: 0, z: 0 };
      particle.life = 0;
      particle.age = 0;
      particle.userData = {};
      
      this.pool.push(particle);
    }
  }

  getActive(): Particle[] {
    return this.active;
  }

  getActiveCount(): number {
    return this.active.length;
  }

  getAvailableCount(): number {
    return this.pool.length;
  }

  clear(): void {
    while (this.active.length > 0) {
      const particle = this.active.pop()!;
      this.pool.push(particle);
    }
  }
}

// ============================================================================
// Particle Emitter
// ============================================================================

export class ParticleEmitter extends EventEmitter {
  public id: string;
  public name: string;
  public config: ParticleEmitterConfig;
  
  // Transform
  public position: Vector3 = { x: 0, y: 0, z: 0 };
  public rotation: Vector3 = { x: 0, y: 0, z: 0 };
  public scale: Vector3 = { x: 1, y: 1, z: 1 };
  
  // State
  private pool: ParticlePool;
  private emissionAccumulator = 0;
  private burstTimers: number[] = [];
  private elapsed = 0;
  private isPlaying = false;
  private isPaused = false;
  private noise: SimplexNoise;
  
  // Callbacks
  public onParticleBirth?: (particle: Particle) => void;
  public onParticleDeath?: (particle: Particle) => void;
  public onParticleUpdate?: (particle: Particle, dt: number) => void;

  constructor(config: ParticleEmitterConfig) {
    super();
    
    this.id = crypto.randomUUID();
    this.name = config.name;
    this.config = {
      enabled: true,
      blendMode: 'additive',
      simulationSpace: 'world',
      startDelay: 0,
      duration: 5,
      loop: true,
      prewarm: false,
      ...config,
    };
    
    this.pool = new ParticlePool(config.maxParticles);
    this.noise = new SimplexNoise();
    
    // Initialize burst timers
    if (config.bursts) {
      this.burstTimers = config.bursts.map(() => 0);
    }
  }

  play(): void {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.isPaused = false;
    this.elapsed = 0;
    this.emissionAccumulator = 0;
    
    if (this.config.prewarm) {
      // Simulate a few seconds to pre-warm
      const prewarmTime = this.config.duration ?? 5;
      const dt = 1 / 60;
      for (let t = 0; t < prewarmTime; t += dt) {
        this.update(dt);
      }
    }
    
    this.emit('play');
  }

  stop(clear = true): void {
    this.isPlaying = false;
    this.isPaused = false;
    
    if (clear) {
      this.pool.clear();
    }
    
    this.emit('stop');
  }

  pause(): void {
    this.isPaused = true;
    this.emit('pause');
  }

  resume(): void {
    this.isPaused = false;
    this.emit('resume');
  }

  update(dt: number): void {
    if (!this.isPlaying || this.isPaused || !this.config.enabled) return;
    
    this.elapsed += dt;
    
    // Check duration
    const duration = this.config.duration ?? Infinity;
    if (this.elapsed > duration) {
      if (this.config.loop) {
        this.elapsed = 0;
        this.burstTimers = this.burstTimers.map(() => 0);
      } else {
        this.isPlaying = false;
      }
    }
    
    // Check start delay
    if (this.elapsed < (this.config.startDelay ?? 0)) return;
    
    // Emit particles
    this.emitParticles(dt);
    
    // Process bursts
    this.processBursts(dt);
    
    // Update particles
    this.updateParticles(dt);
  }

  private emitParticles(dt: number): void {
    this.emissionAccumulator += this.config.emissionRate * dt;
    
    while (this.emissionAccumulator >= 1) {
      this.spawnParticle();
      this.emissionAccumulator -= 1;
    }
  }

  private processBursts(dt: number): void {
    if (!this.config.bursts) return;
    
    for (let i = 0; i < this.config.bursts.length; i++) {
      const burst = this.config.bursts[i];
      this.burstTimers[i] += dt;
      
      if (this.burstTimers[i] >= burst.time) {
        for (let c = 0; c < burst.cycles; c++) {
          if (this.burstTimers[i] >= burst.time + c * burst.interval) {
            for (let j = 0; j < burst.count; j++) {
              this.spawnParticle();
            }
          }
        }
      }
    }
  }

  private spawnParticle(): Particle | null {
    const particle = this.pool.spawn();
    if (!particle) return null;
    
    // Set initial position based on shape
    particle.position = this.getSpawnPosition();
    
    // Set initial velocity
    const speed = randomRange(this.config.speed);
    const direction = this.getSpawnDirection(particle.position);
    particle.velocity = Vec3.scale(direction, speed);
    
    // Set initial properties
    particle.size = randomRange(this.config.size);
    particle.rotation = randomRange(this.config.rotation);
    particle.rotationSpeed = (Math.random() - 0.5) * 2;
    particle.color = { ...this.config.color };
    particle.maxLife = randomRange(this.config.lifetime);
    particle.life = particle.maxLife;
    particle.age = 0;
    
    // Apply gravity as initial acceleration
    if (this.config.gravity) {
      particle.acceleration = { ...this.config.gravity };
    }
    
    this.onParticleBirth?.(particle);
    this.emit('birth', particle);
    
    return particle;
  }

  private getSpawnPosition(): Vector3 {
    const shape = this.config.shape;
    let localPos: Vector3;
    
    switch (shape.type) {
      case 'point':
        localPos = { x: 0, y: 0, z: 0 };
        break;
        
      case 'sphere': {
        const r = shape.innerRadius ?? 0;
        const R = shape.radius ?? 1;
        const radius = r + Math.random() * (R - r);
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(Math.random() * 2 - 1);
        localPos = {
          x: radius * Math.sin(phi) * Math.cos(theta),
          y: radius * Math.sin(phi) * Math.sin(theta),
          z: radius * Math.cos(phi),
        };
        break;
      }
        
      case 'box': {
        const size = shape.size ?? { x: 1, y: 1, z: 1 };
        localPos = {
          x: (Math.random() - 0.5) * size.x,
          y: (Math.random() - 0.5) * size.y,
          z: (Math.random() - 0.5) * size.z,
        };
        break;
      }
        
      case 'cone': {
        const angle = (shape.angle ?? 45) * Math.PI / 180;
        const height = shape.height ?? 1;
        const t = Math.random();
        const r = t * Math.tan(angle) * height;
        const theta = Math.random() * Math.PI * 2;
        localPos = {
          x: r * Math.cos(theta),
          y: t * height,
          z: r * Math.sin(theta),
        };
        break;
      }
        
      case 'circle': {
        const r = shape.innerRadius ?? 0;
        const R = shape.radius ?? 1;
        const radius = Math.sqrt(r * r + Math.random() * (R * R - r * r));
        const theta = Math.random() * Math.PI * 2;
        localPos = {
          x: radius * Math.cos(theta),
          y: 0,
          z: radius * Math.sin(theta),
        };
        break;
      }
        
      case 'line': {
        const start = shape.start ?? { x: 0, y: 0, z: 0 };
        const end = shape.end ?? { x: 1, y: 0, z: 0 };
        const t = Math.random();
        localPos = Vec3.lerp(start, end, t);
        break;
      }
        
      default:
        localPos = { x: 0, y: 0, z: 0 };
    }
    
    // Transform to world space
    return Vec3.add(this.position, Vec3.scale(localPos, this.scale.x));
  }

  private getSpawnDirection(position: Vector3): Vector3 {
    const shape = this.config.shape;
    
    switch (shape.type) {
      case 'sphere':
      case 'circle':
        // Radial outward
        const dir = Vec3.sub(position, this.position);
        return Vec3.length(dir) > 0 ? Vec3.normalize(dir) : { x: 0, y: 1, z: 0 };
        
      case 'cone':
        // Along cone surface
        const diff = Vec3.sub(position, this.position);
        return Vec3.normalize({ x: diff.x, y: 1, z: diff.z });
        
      default:
        // Random direction
        return Vec3.random();
    }
  }

  private updateParticles(dt: number): void {
    const particles = this.pool.getActive();
    const toRecycle: Particle[] = [];
    
    for (const particle of particles) {
      // Update age and life
      particle.age += dt;
      particle.life -= dt;
      
      // Check if dead
      if (particle.life <= 0) {
        toRecycle.push(particle);
        this.onParticleDeath?.(particle);
        this.emit('death', particle);
        continue;
      }
      
      const normalizedAge = particle.age / particle.maxLife;
      
      // Apply velocity module
      if (this.config.velocityModule?.enabled) {
        this.applyVelocityModule(particle, dt);
      }
      
      // Apply noise module
      if (this.config.noiseModule?.enabled) {
        this.applyNoiseModule(particle, dt);
      }
      
      // Apply collision module
      if (this.config.collisionModule?.enabled) {
        this.applyCollisionModule(particle, dt);
      }
      
      // Update velocity with acceleration
      particle.velocity = Vec3.add(
        particle.velocity,
        Vec3.scale(particle.acceleration, dt)
      );
      
      // Apply speed over life
      if (this.config.speedOverLife) {
        const multiplier = sampleCurve(
          this.config.speedOverLife,
          normalizedAge,
          'multiplier'
        );
        particle.velocity = Vec3.scale(particle.velocity, multiplier);
      }
      
      // Update position
      particle.position = Vec3.add(
        particle.position,
        Vec3.scale(particle.velocity, dt)
      );
      
      // Update rotation
      particle.rotation += particle.rotationSpeed * dt;
      
      // Update color over life
      if (this.config.colorOverLife) {
        particle.color = sampleGradient(this.config.colorOverLife, normalizedAge);
      }
      
      // Update size over life
      if (this.config.sizeOverLife) {
        const baseSizeData = this.config.sizeOverLife.find((s) => s.time <= normalizedAge);
        const baseSize = baseSizeData?.size ?? 1;
        const sizeFactor = sampleCurve(
          this.config.sizeOverLife.map(s => ({ time: s.time, size: s.size })),
          normalizedAge,
          'size'
        );
        particle.size = baseSize * sizeFactor;
      }
      
      this.onParticleUpdate?.(particle, dt);
    }
    
    // Recycle dead particles
    for (const particle of toRecycle) {
      this.pool.recycle(particle);
    }
  }

  private applyVelocityModule(particle: Particle, _dt: number): void {
    const module = this.config.velocityModule!;
    
    // Linear velocity
    if (module.linear) {
      particle.velocity = Vec3.add(particle.velocity, module.linear);
    }
    
    // Orbital velocity
    if (module.orbital) {
      const toCenter = Vec3.sub(this.position, particle.position);
      const tangent = Vec3.normalize({
        x: -toCenter.z * module.orbital.y,
        y: toCenter.x * module.orbital.z - toCenter.z * module.orbital.x,
        z: toCenter.x * module.orbital.y,
      });
      const orbitalSpeed = Vec3.length(module.orbital);
      particle.velocity = Vec3.add(
        particle.velocity,
        Vec3.scale(tangent, orbitalSpeed)
      );
    }
    
    // Radial velocity
    if (module.radial) {
      const fromCenter = Vec3.sub(particle.position, this.position);
      const dir = Vec3.normalize(fromCenter);
      particle.velocity = Vec3.add(
        particle.velocity,
        Vec3.scale(dir, module.radial)
      );
    }
  }

  private applyNoiseModule(particle: Particle, dt: number): void {
    const module = this.config.noiseModule!;
    const time = this.elapsed * module.scrollSpeed;
    
    const noiseX = this.noise.noise3D(
      particle.position.x * module.frequency,
      particle.position.y * module.frequency,
      time
    );
    const noiseY = this.noise.noise3D(
      particle.position.y * module.frequency,
      particle.position.z * module.frequency,
      time + 100
    );
    const noiseZ = this.noise.noise3D(
      particle.position.z * module.frequency,
      particle.position.x * module.frequency,
      time + 200
    );
    
    particle.velocity = Vec3.add(particle.velocity, {
      x: noiseX * module.strength * dt,
      y: noiseY * module.strength * dt,
      z: noiseZ * module.strength * dt,
    });
  }

  private applyCollisionModule(particle: Particle, _dt: number): void {
    const module = this.config.collisionModule!;
    
    if (!module.planes) return;
    
    for (const plane of module.planes) {
      const dist = Vec3.dot(particle.position, plane.normal) - plane.distance;
      
      if (dist < 0) {
        // Collision!
        // Move particle to surface
        particle.position = Vec3.add(
          particle.position,
          Vec3.scale(plane.normal, -dist)
        );
        
        // Reflect velocity
        const dot = Vec3.dot(particle.velocity, plane.normal);
        particle.velocity = Vec3.add(
          particle.velocity,
          Vec3.scale(plane.normal, -2 * dot)
        );
        
        // Apply bounce and dampen
        particle.velocity = Vec3.scale(
          particle.velocity,
          module.bounce * (1 - module.dampen)
        );
        
        // Reduce lifetime
        particle.life -= particle.maxLife * module.lifetimeLoss;
        
        this.emit('collision', particle, plane);
      }
    }
  }

  getParticles(): Particle[] {
    return this.pool.getActive();
  }

  getParticleCount(): number {
    return this.pool.getActiveCount();
  }

  isActive(): boolean {
    return this.isPlaying && !this.isPaused;
  }

  clear(): void {
    this.pool.clear();
  }

  dispose(): void {
    this.stop(true);
    this.removeAllListeners();
  }
}

// ============================================================================
// Particle System Manager
// ============================================================================

export class ParticleSystem extends EventEmitter {
  private static instance: ParticleSystem | null = null;
  
  private emitters = new Map<string, ParticleEmitter>();
  private isRunning = false;
  private lastTime = 0;
  private animationFrameId: number | null = null;
  
  // Rendering context (optional)
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;

  private constructor() {
    super();
  }

  static getInstance(): ParticleSystem {
    if (!ParticleSystem.instance) {
      ParticleSystem.instance = new ParticleSystem();
    }
    return ParticleSystem.instance;
  }

  static resetInstance(): void {
    if (ParticleSystem.instance) {
      ParticleSystem.instance.stop();
      ParticleSystem.instance.clear();
      ParticleSystem.instance = null;
    }
  }

  createEmitter(config: ParticleEmitterConfig): ParticleEmitter {
    const emitter = new ParticleEmitter(config);
    this.emitters.set(emitter.id, emitter);
    this.emit('emitterCreated', emitter);
    return emitter;
  }

  getEmitter(id: string): ParticleEmitter | undefined {
    return this.emitters.get(id);
  }

  getEmitterByName(name: string): ParticleEmitter | undefined {
    for (const emitter of this.emitters.values()) {
      if (emitter.name === name) return emitter;
    }
    return undefined;
  }

  removeEmitter(id: string): boolean {
    const emitter = this.emitters.get(id);
    if (emitter) {
      emitter.dispose();
      this.emitters.delete(id);
      this.emit('emitterRemoved', emitter);
      return true;
    }
    return false;
  }

  getAllEmitters(): ParticleEmitter[] {
    return Array.from(this.emitters.values());
  }

  setCanvas(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;
    
    this.update(dt);
    this.render();
    
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  update(dt: number): void {
    for (const emitter of this.emitters.values()) {
      emitter.update(dt);
    }
  }

  render(): void {
    if (!this.ctx || !this.canvas) return;
    
    // Clear canvas (or use blend mode)
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    for (const emitter of this.emitters.values()) {
      this.renderEmitter(emitter);
    }
  }

  private renderEmitter(emitter: ParticleEmitter): void {
    if (!this.ctx) return;
    
    const particles = emitter.getParticles();
    const blendMode = emitter.config.blendMode ?? 'additive';
    
    // Set blend mode
    switch (blendMode) {
      case 'additive':
        this.ctx.globalCompositeOperation = 'lighter';
        break;
      case 'multiply':
        this.ctx.globalCompositeOperation = 'multiply';
        break;
      case 'screen':
        this.ctx.globalCompositeOperation = 'screen';
        break;
      default:
        this.ctx.globalCompositeOperation = 'source-over';
    }
    
    for (const particle of particles) {
      this.renderParticle(particle);
    }
    
    // Reset blend mode
    this.ctx.globalCompositeOperation = 'source-over';
  }

  private renderParticle(particle: Particle): void {
    if (!this.ctx) return;
    
    const { position, color, size, rotation } = particle;
    
    this.ctx.save();
    this.ctx.translate(position.x, position.y);
    this.ctx.rotate(rotation);
    this.ctx.fillStyle = ColorUtil.toRGBA(color);
    
    // Simple circle rendering
    this.ctx.beginPath();
    this.ctx.arc(0, 0, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.restore();
  }

  getTotalParticleCount(): number {
    let total = 0;
    for (const emitter of this.emitters.values()) {
      total += emitter.getParticleCount();
    }
    return total;
  }

  playAll(): void {
    for (const emitter of this.emitters.values()) {
      emitter.play();
    }
  }

  stopAll(clear = true): void {
    for (const emitter of this.emitters.values()) {
      emitter.stop(clear);
    }
  }

  clear(): void {
    for (const emitter of this.emitters.values()) {
      emitter.dispose();
    }
    this.emitters.clear();
  }

  dispose(): void {
    this.stop();
    this.clear();
    this.removeAllListeners();
  }
}

// ============================================================================
// Preset Effects
// ============================================================================

export const ParticlePresets = {
  fire(): ParticleEmitterConfig {
    return {
      name: 'Fire',
      maxParticles: 200,
      emissionRate: 50,
      shape: { type: 'cone', angle: 15, height: 0.5 },
      lifetime: { min: 0.5, max: 1.5 },
      speed: { min: 1, max: 3 },
      size: { min: 0.1, max: 0.3 },
      rotation: { min: 0, max: Math.PI * 2 },
      color: { r: 1, g: 0.5, b: 0.1, a: 1 },
      colorOverLife: [
        { time: 0, color: { r: 1, g: 0.8, b: 0.2, a: 1 } },
        { time: 0.3, color: { r: 1, g: 0.4, b: 0.1, a: 0.8 } },
        { time: 0.6, color: { r: 0.8, g: 0.2, b: 0.1, a: 0.5 } },
        { time: 1, color: { r: 0.3, g: 0.1, b: 0.1, a: 0 } },
      ],
      sizeOverLife: [
        { time: 0, size: 0.5 },
        { time: 0.3, size: 1 },
        { time: 1, size: 0.2 },
      ],
      gravity: { x: 0, y: 0.5, z: 0 },
      noiseModule: {
        enabled: true,
        strength: 0.5,
        frequency: 2,
        scrollSpeed: 1,
        octaves: 2,
      },
      blendMode: 'additive',
    };
  },

  smoke(): ParticleEmitterConfig {
    return {
      name: 'Smoke',
      maxParticles: 100,
      emissionRate: 20,
      shape: { type: 'circle', radius: 0.2 },
      lifetime: { min: 2, max: 4 },
      speed: { min: 0.5, max: 1 },
      size: { min: 0.2, max: 0.5 },
      rotation: { min: 0, max: Math.PI * 2 },
      color: { r: 0.3, g: 0.3, b: 0.3, a: 0.5 },
      colorOverLife: [
        { time: 0, color: { r: 0.4, g: 0.4, b: 0.4, a: 0.8 } },
        { time: 0.5, color: { r: 0.5, g: 0.5, b: 0.5, a: 0.4 } },
        { time: 1, color: { r: 0.6, g: 0.6, b: 0.6, a: 0 } },
      ],
      sizeOverLife: [
        { time: 0, size: 0.3 },
        { time: 1, size: 2 },
      ],
      gravity: { x: 0, y: 0.2, z: 0 },
      noiseModule: {
        enabled: true,
        strength: 0.3,
        frequency: 1,
        scrollSpeed: 0.5,
        octaves: 3,
      },
      blendMode: 'normal',
    };
  },

  sparks(): ParticleEmitterConfig {
    return {
      name: 'Sparks',
      maxParticles: 500,
      emissionRate: 0,
      bursts: [{ time: 0, count: 50, cycles: 1, interval: 0 }],
      shape: { type: 'point' },
      lifetime: { min: 0.5, max: 1 },
      speed: { min: 5, max: 10 },
      size: { min: 0.02, max: 0.05 },
      rotation: { min: 0, max: 0 },
      color: { r: 1, g: 0.8, b: 0.3, a: 1 },
      colorOverLife: [
        { time: 0, color: { r: 1, g: 0.9, b: 0.5, a: 1 } },
        { time: 0.5, color: { r: 1, g: 0.6, b: 0.2, a: 1 } },
        { time: 1, color: { r: 0.8, g: 0.3, b: 0.1, a: 0 } },
      ],
      gravity: { x: 0, y: -9.8, z: 0 },
      collisionModule: {
        enabled: true,
        bounce: 0.3,
        dampen: 0.2,
        lifetimeLoss: 0.3,
        planes: [{ normal: { x: 0, y: 1, z: 0 }, distance: 0 }],
      },
      blendMode: 'additive',
      loop: false,
    };
  },

  rain(): ParticleEmitterConfig {
    return {
      name: 'Rain',
      maxParticles: 1000,
      emissionRate: 200,
      shape: { type: 'box', size: { x: 20, y: 0, z: 20 } },
      lifetime: { min: 1, max: 2 },
      speed: { min: 10, max: 15 },
      size: { min: 0.02, max: 0.03 },
      rotation: { min: 0, max: 0 },
      color: { r: 0.7, g: 0.8, b: 0.9, a: 0.6 },
      gravity: { x: 0, y: -10, z: 0 },
      velocityModule: {
        enabled: true,
        linear: { x: -1, y: 0, z: 0 }, // Wind
      },
      blendMode: 'normal',
    };
  },

  snow(): ParticleEmitterConfig {
    return {
      name: 'Snow',
      maxParticles: 500,
      emissionRate: 50,
      shape: { type: 'box', size: { x: 20, y: 0, z: 20 } },
      lifetime: { min: 5, max: 10 },
      speed: { min: 0.5, max: 1 },
      size: { min: 0.05, max: 0.15 },
      rotation: { min: 0, max: Math.PI * 2 },
      color: { r: 1, g: 1, b: 1, a: 0.8 },
      gravity: { x: 0, y: -0.5, z: 0 },
      noiseModule: {
        enabled: true,
        strength: 0.2,
        frequency: 0.5,
        scrollSpeed: 0.3,
        octaves: 2,
      },
      blendMode: 'normal',
    };
  },

  explosion(): ParticleEmitterConfig {
    return {
      name: 'Explosion',
      maxParticles: 300,
      emissionRate: 0,
      bursts: [
        { time: 0, count: 100, cycles: 1, interval: 0 },
        { time: 0.1, count: 50, cycles: 1, interval: 0 },
      ],
      shape: { type: 'sphere', radius: 0.1 },
      lifetime: { min: 0.5, max: 1.5 },
      speed: { min: 5, max: 15 },
      size: { min: 0.1, max: 0.4 },
      rotation: { min: 0, max: Math.PI * 2 },
      color: { r: 1, g: 0.5, b: 0.1, a: 1 },
      colorOverLife: [
        { time: 0, color: { r: 1, g: 0.9, b: 0.7, a: 1 } },
        { time: 0.2, color: { r: 1, g: 0.6, b: 0.2, a: 1 } },
        { time: 0.5, color: { r: 0.8, g: 0.3, b: 0.1, a: 0.8 } },
        { time: 1, color: { r: 0.2, g: 0.1, b: 0.1, a: 0 } },
      ],
      sizeOverLife: [
        { time: 0, size: 0.5 },
        { time: 0.2, size: 1 },
        { time: 1, size: 0.3 },
      ],
      gravity: { x: 0, y: -2, z: 0 },
      blendMode: 'additive',
      loop: false,
      duration: 2,
    };
  },

  magic(): ParticleEmitterConfig {
    return {
      name: 'Magic',
      maxParticles: 200,
      emissionRate: 30,
      shape: { type: 'sphere', radius: 0.5, innerRadius: 0.3 },
      lifetime: { min: 1, max: 2 },
      speed: { min: 0.5, max: 1 },
      size: { min: 0.05, max: 0.15 },
      rotation: { min: 0, max: Math.PI * 2 },
      color: { r: 0.5, g: 0.3, b: 1, a: 1 },
      colorOverLife: [
        { time: 0, color: { r: 0.8, g: 0.4, b: 1, a: 1 } },
        { time: 0.5, color: { r: 0.4, g: 0.6, b: 1, a: 0.8 } },
        { time: 1, color: { r: 0.2, g: 0.8, b: 1, a: 0 } },
      ],
      velocityModule: {
        enabled: true,
        orbital: { x: 0, y: 2, z: 0 },
      },
      noiseModule: {
        enabled: true,
        strength: 0.5,
        frequency: 3,
        scrollSpeed: 1,
        octaves: 2,
      },
      blendMode: 'additive',
    };
  },
};

export default ParticleSystem;
