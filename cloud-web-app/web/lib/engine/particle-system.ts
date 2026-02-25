/**
 * Aethel Engine - Particle System
 * 
 * High-performance GPU-accelerated particle system for visual effects.
 * Supports emitters, forces, collisions, and custom shaders.
 */

import { EventEmitter } from 'events';

import type {
  BlendMode,
  CollisionModule,
  Color,
  ColorGradient,
  EmitterShape,
  EmitterShapeConfig,
  NoiseModule,
  Particle,
  ParticleEmitterConfig,
  SizeOverLife,
  SubEmitterConfig,
  ValueRange,
  Vector3,
  VelocityModule,
} from './particle-system-types';

export type {
  BlendMode,
  CollisionModule,
  Color,
  ColorGradient,
  EmitterShape,
  EmitterShapeConfig,
  NoiseModule,
  Particle,
  ParticleEmitterConfig,
  SizeOverLife,
  SubEmitterConfig,
  ValueRange,
  Vector3,
  VelocityModule,
} from './particle-system-types';
import { ColorUtil, ParticlePool, SimplexNoise, Vec3, randomRange, sampleCurve, sampleGradient } from './particle-system-runtime-helpers';
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
    const velocityMod = this.config.velocityModule!;
    
    // Linear velocity
    if (velocityMod.linear) {
      particle.velocity = Vec3.add(particle.velocity, velocityMod.linear);
    }
    
    // Orbital velocity
    if (velocityMod.orbital) {
      const toCenter = Vec3.sub(this.position, particle.position);
      const tangent = Vec3.normalize({
        x: -toCenter.z * velocityMod.orbital.y,
        y: toCenter.x * velocityMod.orbital.z - toCenter.z * velocityMod.orbital.x,
        z: toCenter.x * velocityMod.orbital.y,
      });
      const orbitalSpeed = Vec3.length(velocityMod.orbital);
      particle.velocity = Vec3.add(
        particle.velocity,
        Vec3.scale(tangent, orbitalSpeed)
      );
    }
    
    // Radial velocity
    if (velocityMod.radial) {
      const fromCenter = Vec3.sub(particle.position, this.position);
      const dir = Vec3.normalize(fromCenter);
      particle.velocity = Vec3.add(
        particle.velocity,
        Vec3.scale(dir, velocityMod.radial)
      );
    }
  }

  private applyNoiseModule(particle: Particle, dt: number): void {
    const noiseMod = this.config.noiseModule!;
    const time = this.elapsed * noiseMod.scrollSpeed;
    
    const noiseX = this.noise.noise3D(
      particle.position.x * noiseMod.frequency,
      particle.position.y * noiseMod.frequency,
      time
    );
    const noiseY = this.noise.noise3D(
      particle.position.y * noiseMod.frequency,
      particle.position.z * noiseMod.frequency,
      time + 100
    );
    const noiseZ = this.noise.noise3D(
      particle.position.z * noiseMod.frequency,
      particle.position.x * noiseMod.frequency,
      time + 200
    );
    
    particle.velocity = Vec3.add(particle.velocity, {
      x: noiseX * noiseMod.strength * dt,
      y: noiseY * noiseMod.strength * dt,
      z: noiseZ * noiseMod.strength * dt,
    });
  }

  private applyCollisionModule(particle: Particle, _dt: number): void {
    const collisionMod = this.config.collisionModule!;
    
    if (!collisionMod.planes) return;
    
    for (const plane of collisionMod.planes) {
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
          collisionMod.bounce * (1 - collisionMod.dampen)
        );
        
        // Reduce lifetime
        particle.life -= particle.maxLife * collisionMod.lifetimeLoss;
        
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
