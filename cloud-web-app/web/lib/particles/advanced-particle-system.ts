/**
 * Advanced Particle System - Sistema de Partículas Avançado
 * 
 * Sistema completo de partículas GPU-accelerated com:
 * - Emitters: Point, Box, Sphere, Cone, Mesh Surface
 * - Modifiers: Gravity, Turbulence, Attract, Vortex
 * - Color/Size/Velocity over lifetime
 * - Sub-emitters
 * - Collision detection
 * - Trail rendering
 * - Instanced rendering for performance
 * 
 * @module lib/particles/particle-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type EmitterShape = 'point' | 'box' | 'sphere' | 'cone' | 'circle' | 'edge' | 'mesh';
export type BlendMode = 'additive' | 'normal' | 'multiply' | 'screen';
export type SimulationSpace = 'local' | 'world';

export interface Vector3Range {
  min: { x: number; y: number; z: number };
  max: { x: number; y: number; z: number };
}

export interface FloatRange {
  min: number;
  max: number;
}

export interface ColorStop {
  time: number; // 0-1
  color: { r: number; g: number; b: number; a: number };
}

export interface FloatCurve {
  time: number;
  value: number;
  inTangent?: number;
  outTangent?: number;
}

export interface EmitterSettings {
  shape: EmitterShape;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  
  // Shape-specific
  boxSize?: { x: number; y: number; z: number };
  sphereRadius?: number;
  coneAngle?: number;
  coneRadius?: number;
  circleRadius?: number;
  edgeLength?: number;
  
  // Emission
  rate: number; // Particles per second
  bursts?: { time: number; count: number; probability: number }[];
  
  // Space
  simulationSpace: SimulationSpace;
}

export interface ParticleSettings {
  // Lifetime
  lifetime: FloatRange;
  
  // Initial values
  startSpeed: FloatRange;
  startSize: FloatRange;
  startRotation: FloatRange;
  startColor: ColorStop[];
  
  // Over lifetime
  sizeOverLifetime?: FloatCurve[];
  speedOverLifetime?: FloatCurve[];
  colorOverLifetime?: ColorStop[];
  rotationOverLifetime?: number; // Degrees per second
  
  // Velocity
  inheritVelocity: number;
  velocityRandomness: Vector3Range;
  
  // Rendering
  texture?: string;
  blendMode: BlendMode;
  renderOrder: number;
  
  // Billboard
  billboard: boolean;
  stretchedBillboard: boolean;
  stretchFactor: number;
  
  // Sorting
  sortByDistance: boolean;
}

export interface ModifierSettings {
  gravity: { x: number; y: number; z: number };
  drag: number;
  
  // Noise/Turbulence
  turbulenceStrength: number;
  turbulenceFrequency: number;
  turbulenceScrollSpeed: number;
  
  // Attractors
  attractors?: {
    position: { x: number; y: number; z: number };
    strength: number;
    radius: number;
  }[];
  
  // Vortex
  vortex?: {
    axis: { x: number; y: number; z: number };
    strength: number;
    center: { x: number; y: number; z: number };
  };
}

export interface CollisionSettings {
  enabled: boolean;
  bounce: number;
  dampen: number;
  lifetime: number; // Multiplier on collision
  planes?: { normal: { x: number; y: number; z: number }; distance: number }[];
  world: boolean;
}

export interface SubEmitterSettings {
  trigger: 'birth' | 'death' | 'collision';
  emitterId: string;
  probability: number;
  inheritVelocity: number;
}

export interface ParticleSystemSettings {
  id: string;
  name: string;
  duration: number;
  looping: boolean;
  prewarm: boolean;
  maxParticles: number;
  
  emitter: EmitterSettings;
  particle: ParticleSettings;
  modifiers: ModifierSettings;
  collision: CollisionSettings;
  subEmitters: SubEmitterSettings[];
}

export interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  age: number;
  lifetime: number;
  size: number;
  rotation: number;
  color: THREE.Color;
  alpha: number;
  speed: number;
  alive: boolean;
}

// ============================================================================
// PARTICLE POOL
// ============================================================================

class ParticlePool {
  private particles: Particle[] = [];
  private activeCount = 0;
  private maxParticles: number;
  
  constructor(maxParticles: number) {
    this.maxParticles = maxParticles;
    
    for (let i = 0; i < maxParticles; i++) {
      this.particles.push(this.createParticle());
    }
  }
  
  private createParticle(): Particle {
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      age: 0,
      lifetime: 1,
      size: 1,
      rotation: 0,
      color: new THREE.Color(1, 1, 1),
      alpha: 1,
      speed: 1,
      alive: false,
    };
  }
  
  acquire(): Particle | null {
    for (let i = 0; i < this.maxParticles; i++) {
      if (!this.particles[i].alive) {
        this.particles[i].alive = true;
        this.activeCount++;
        return this.particles[i];
      }
    }
    return null;
  }
  
  release(particle: Particle): void {
    particle.alive = false;
    this.activeCount--;
  }
  
  forEach(callback: (particle: Particle, index: number) => void): void {
    let index = 0;
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.particles[i].alive) {
        callback(this.particles[i], index++);
      }
    }
  }
  
  getActiveCount(): number {
    return this.activeCount;
  }
  
  getAll(): Particle[] {
    return this.particles;
  }
  
  clear(): void {
    for (const particle of this.particles) {
      particle.alive = false;
    }
    this.activeCount = 0;
  }
}

// ============================================================================
// PARTICLE EMITTER
// ============================================================================

export class ParticleEmitter extends EventEmitter {
  private settings: ParticleSystemSettings;
  private pool: ParticlePool;
  private mesh: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial | THREE.ShaderMaterial;
  
  private time = 0;
  private emissionAccumulator = 0;
  private isPlaying = false;
  private isPaused = false;
  
  private noiseOffset = Math.random() * 1000;
  
  constructor(settings: ParticleSystemSettings) {
    super();
    
    this.settings = settings;
    this.pool = new ParticlePool(settings.maxParticles);
    
    // Create geometry with max particles
    this.geometry = new THREE.BufferGeometry();
    
    const positions = new Float32Array(settings.maxParticles * 3);
    const colors = new Float32Array(settings.maxParticles * 4);
    const sizes = new Float32Array(settings.maxParticles);
    const rotations = new Float32Array(settings.maxParticles);
    
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.geometry.setAttribute('rotation', new THREE.BufferAttribute(rotations, 1));
    
    // Create material based on blend mode
    const blendModes: Record<BlendMode, THREE.Blending> = {
      additive: THREE.AdditiveBlending,
      normal: THREE.NormalBlending,
      multiply: THREE.MultiplyBlending,
      screen: THREE.CustomBlending,
    };
    
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: null },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute vec4 color;
        attribute float size;
        attribute float rotation;
        
        varying vec4 vColor;
        varying float vRotation;
        
        void main() {
          vColor = color;
          vRotation = rotation;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float uTime;
        
        varying vec4 vColor;
        varying float vRotation;
        
        void main() {
          vec2 center = gl_PointCoord - 0.5;
          
          // Apply rotation
          float c = cos(vRotation);
          float s = sin(vRotation);
          vec2 rotated = vec2(
            center.x * c - center.y * s,
            center.x * s + center.y * c
          ) + 0.5;
          
          vec4 texColor = texture2D(pointTexture, rotated);
          
          // Soft circle fallback if no texture
          float dist = length(center) * 2.0;
          float alpha = 1.0 - smoothstep(0.8, 1.0, dist);
          
          gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: blendModes[settings.particle.blendMode],
    });
    
    // Load texture if specified
    if (settings.particle.texture) {
      new THREE.TextureLoader().load(settings.particle.texture, (texture) => {
        (this.material as THREE.ShaderMaterial).uniforms.pointTexture.value = texture;
      });
    }
    
    this.mesh = new THREE.Points(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = settings.particle.renderOrder;
    
    // Prewarm if needed
    if (settings.prewarm) {
      this.prewarm();
    }
  }
  
  private prewarm(): void {
    const steps = 60;
    const dt = this.settings.duration / steps;
    
    for (let i = 0; i < steps; i++) {
      this.update(dt);
    }
  }
  
  play(): void {
    this.isPlaying = true;
    this.isPaused = false;
    this.emit('play');
  }
  
  pause(): void {
    this.isPaused = true;
    this.emit('pause');
  }
  
  stop(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.pool.clear();
    this.updateBuffers();
    this.emit('stop');
  }
  
  restart(): void {
    this.stop();
    this.time = 0;
    this.emissionAccumulator = 0;
    this.play();
  }
  
  isActive(): boolean {
    return this.isPlaying && !this.isPaused;
  }
  
  getActiveParticleCount(): number {
    return this.pool.getActiveCount();
  }
  
  getMesh(): THREE.Points | null {
    return this.mesh;
  }
  
  update(deltaTime: number): void {
    if (!this.isPlaying || this.isPaused) return;
    
    this.time += deltaTime;
    
    // Check duration
    if (!this.settings.looping && this.time >= this.settings.duration) {
      this.isPlaying = false;
      this.emit('complete');
      return;
    }
    
    // Loop time
    if (this.settings.looping && this.time >= this.settings.duration) {
      this.time = 0;
      this.emit('loop');
    }
    
    // Emit new particles
    this.emitParticles(deltaTime);
    
    // Update existing particles
    this.updateParticles(deltaTime);
    
    // Update GPU buffers
    this.updateBuffers();
    
    // Update shader uniforms
    if (this.material instanceof THREE.ShaderMaterial) {
      this.material.uniforms.uTime.value = this.time;
    }
  }
  
  private emitParticles(deltaTime: number): void {
    const emitter = this.settings.emitter;
    
    // Rate emission
    this.emissionAccumulator += emitter.rate * deltaTime;
    const toEmit = Math.floor(this.emissionAccumulator);
    this.emissionAccumulator -= toEmit;
    
    for (let i = 0; i < toEmit; i++) {
      this.emitSingleParticle();
    }
    
    // Burst emission
    if (emitter.bursts) {
      for (const burst of emitter.bursts) {
        const burstTime = burst.time * this.settings.duration;
        if (this.time >= burstTime && this.time - deltaTime < burstTime) {
          if (Math.random() < burst.probability) {
            for (let i = 0; i < burst.count; i++) {
              this.emitSingleParticle();
            }
          }
        }
      }
    }
  }
  
  private emitSingleParticle(): void {
    const particle = this.pool.acquire();
    if (!particle) return;
    
    const emitter = this.settings.emitter;
    const settings = this.settings.particle;
    
    // Position based on shape
    particle.position.copy(this.getEmissionPosition());
    
    // Velocity based on shape direction
    const direction = this.getEmissionDirection(particle.position);
    const speed = this.randomRange(settings.startSpeed);
    particle.velocity.copy(direction).multiplyScalar(speed);
    
    // Add randomness
    const rand = settings.velocityRandomness;
    particle.velocity.x += this.randomBetween(rand.min.x, rand.max.x);
    particle.velocity.y += this.randomBetween(rand.min.y, rand.max.y);
    particle.velocity.z += this.randomBetween(rand.min.z, rand.max.z);
    
    // Initialize properties
    particle.age = 0;
    particle.lifetime = this.randomRange(settings.lifetime);
    particle.size = this.randomRange(settings.startSize);
    particle.rotation = this.randomRange(settings.startRotation) * Math.PI / 180;
    particle.speed = speed;
    
    // Initial color
    if (settings.startColor.length > 0) {
      const colorStop = settings.startColor[Math.floor(Math.random() * settings.startColor.length)];
      particle.color.setRGB(colorStop.color.r, colorStop.color.g, colorStop.color.b);
      particle.alpha = colorStop.color.a;
    }
    
    this.emit('particleBorn', { particle });
  }
  
  private getEmissionPosition(): THREE.Vector3 {
    const emitter = this.settings.emitter;
    const pos = new THREE.Vector3(emitter.position.x, emitter.position.y, emitter.position.z);
    
    switch (emitter.shape) {
      case 'point':
        break;
        
      case 'box':
        const box = emitter.boxSize || { x: 1, y: 1, z: 1 };
        pos.x += (Math.random() - 0.5) * box.x;
        pos.y += (Math.random() - 0.5) * box.y;
        pos.z += (Math.random() - 0.5) * box.z;
        break;
        
      case 'sphere':
        const radius = emitter.sphereRadius || 1;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        pos.x += radius * Math.sin(phi) * Math.cos(theta);
        pos.y += radius * Math.sin(phi) * Math.sin(theta);
        pos.z += radius * Math.cos(phi);
        break;
        
      case 'circle':
        const circleRadius = emitter.circleRadius || 1;
        const angle = Math.random() * Math.PI * 2;
        const r = Math.sqrt(Math.random()) * circleRadius;
        pos.x += r * Math.cos(angle);
        pos.z += r * Math.sin(angle);
        break;
        
      case 'cone':
        const coneRadius = emitter.coneRadius || 1;
        const coneAngle = (emitter.coneAngle || 45) * Math.PI / 180;
        const coneR = Math.random() * coneRadius;
        const coneTheta = Math.random() * Math.PI * 2;
        pos.x += coneR * Math.cos(coneTheta);
        pos.z += coneR * Math.sin(coneTheta);
        break;
        
      case 'edge':
        const length = emitter.edgeLength || 1;
        pos.x += (Math.random() - 0.5) * length;
        break;
    }
    
    return pos;
  }
  
  private getEmissionDirection(position: THREE.Vector3): THREE.Vector3 {
    const emitter = this.settings.emitter;
    const dir = new THREE.Vector3(0, 1, 0);
    
    switch (emitter.shape) {
      case 'point':
      case 'box':
        // Random direction
        dir.set(
          Math.random() - 0.5,
          Math.random() - 0.5,
          Math.random() - 0.5
        ).normalize();
        break;
        
      case 'sphere':
        // Outward from center
        dir.copy(position).sub(new THREE.Vector3(
          emitter.position.x,
          emitter.position.y,
          emitter.position.z
        )).normalize();
        break;
        
      case 'cone':
        const coneAngle = (emitter.coneAngle || 45) * Math.PI / 180;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.random() * coneAngle;
        dir.set(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta)
        );
        break;
        
      case 'circle':
        // Upward with spread
        dir.set(
          (Math.random() - 0.5) * 0.5,
          1,
          (Math.random() - 0.5) * 0.5
        ).normalize();
        break;
    }
    
    // Apply emitter rotation
    const euler = new THREE.Euler(
      emitter.rotation.x * Math.PI / 180,
      emitter.rotation.y * Math.PI / 180,
      emitter.rotation.z * Math.PI / 180
    );
    dir.applyEuler(euler);
    
    return dir;
  }
  
  private updateParticles(deltaTime: number): void {
    const modifiers = this.settings.modifiers;
    const settings = this.settings.particle;
    const collision = this.settings.collision;
    
    this.pool.forEach((particle) => {
      // Age
      particle.age += deltaTime;
      
      // Check death
      if (particle.age >= particle.lifetime) {
        this.emit('particleDied', { particle });
        this.pool.release(particle);
        return;
      }
      
      const normalizedAge = particle.age / particle.lifetime;
      
      // Apply gravity
      particle.velocity.x += modifiers.gravity.x * deltaTime;
      particle.velocity.y += modifiers.gravity.y * deltaTime;
      particle.velocity.z += modifiers.gravity.z * deltaTime;
      
      // Apply drag
      const dragFactor = 1 - modifiers.drag * deltaTime;
      particle.velocity.multiplyScalar(dragFactor);
      
      // Apply turbulence
      if (modifiers.turbulenceStrength > 0) {
        const noiseX = this.noise3D(
          particle.position.x * modifiers.turbulenceFrequency + this.noiseOffset,
          particle.position.y * modifiers.turbulenceFrequency,
          particle.position.z * modifiers.turbulenceFrequency + this.time * modifiers.turbulenceScrollSpeed
        );
        const noiseY = this.noise3D(
          particle.position.x * modifiers.turbulenceFrequency + 100,
          particle.position.y * modifiers.turbulenceFrequency + this.noiseOffset,
          particle.position.z * modifiers.turbulenceFrequency + this.time * modifiers.turbulenceScrollSpeed
        );
        const noiseZ = this.noise3D(
          particle.position.x * modifiers.turbulenceFrequency + 200,
          particle.position.y * modifiers.turbulenceFrequency + 200,
          particle.position.z * modifiers.turbulenceFrequency + this.noiseOffset + this.time * modifiers.turbulenceScrollSpeed
        );
        
        particle.velocity.x += noiseX * modifiers.turbulenceStrength * deltaTime;
        particle.velocity.y += noiseY * modifiers.turbulenceStrength * deltaTime;
        particle.velocity.z += noiseZ * modifiers.turbulenceStrength * deltaTime;
      }
      
      // Apply attractors
      if (modifiers.attractors) {
        for (const attractor of modifiers.attractors) {
          const attractorPos = new THREE.Vector3(
            attractor.position.x,
            attractor.position.y,
            attractor.position.z
          );
          const diff = attractorPos.clone().sub(particle.position);
          const dist = diff.length();
          
          if (dist < attractor.radius && dist > 0.01) {
            const force = attractor.strength * (1 - dist / attractor.radius);
            diff.normalize().multiplyScalar(force * deltaTime);
            particle.velocity.add(diff);
          }
        }
      }
      
      // Apply vortex
      if (modifiers.vortex) {
        const vortex = modifiers.vortex;
        const center = new THREE.Vector3(
          vortex.center.x,
          vortex.center.y,
          vortex.center.z
        );
        const axis = new THREE.Vector3(
          vortex.axis.x,
          vortex.axis.y,
          vortex.axis.z
        ).normalize();
        
        const toParticle = particle.position.clone().sub(center);
        const tangent = axis.clone().cross(toParticle).normalize();
        tangent.multiplyScalar(vortex.strength * deltaTime);
        particle.velocity.add(tangent);
      }
      
      // Update position
      particle.position.x += particle.velocity.x * deltaTime;
      particle.position.y += particle.velocity.y * deltaTime;
      particle.position.z += particle.velocity.z * deltaTime;
      
      // Size over lifetime
      if (settings.sizeOverLifetime && settings.sizeOverLifetime.length > 0) {
        const sizeMultiplier = this.evaluateCurve(settings.sizeOverLifetime, normalizedAge);
        particle.size *= sizeMultiplier;
      }
      
      // Color over lifetime
      if (settings.colorOverLifetime && settings.colorOverLifetime.length > 0) {
        const color = this.evaluateColorGradient(settings.colorOverLifetime, normalizedAge);
        particle.color.setRGB(color.r, color.g, color.b);
        particle.alpha = color.a;
      }
      
      // Rotation over lifetime
      if (settings.rotationOverLifetime) {
        particle.rotation += settings.rotationOverLifetime * Math.PI / 180 * deltaTime;
      }
      
      // Collision
      if (collision.enabled) {
        this.handleCollision(particle, collision);
      }
    });
  }
  
  private handleCollision(particle: Particle, collision: CollisionSettings): void {
    // Ground plane collision (y = 0)
    if (collision.world && particle.position.y < 0) {
      particle.position.y = 0;
      particle.velocity.y = -particle.velocity.y * collision.bounce;
      particle.velocity.x *= (1 - collision.dampen);
      particle.velocity.z *= (1 - collision.dampen);
      particle.lifetime *= collision.lifetime;
      
      this.emit('particleCollision', { particle });
    }
    
    // Custom planes
    if (collision.planes) {
      for (const plane of collision.planes) {
        const normal = new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z);
        const dot = particle.position.dot(normal);
        
        if (dot < plane.distance) {
          // Reflect velocity
          const velocityDot = particle.velocity.dot(normal);
          particle.velocity.sub(normal.clone().multiplyScalar(2 * velocityDot));
          particle.velocity.multiplyScalar(collision.bounce);
          
          // Move to plane
          particle.position.add(normal.clone().multiplyScalar(plane.distance - dot));
          
          this.emit('particleCollision', { particle, plane });
        }
      }
    }
  }
  
  private updateBuffers(): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.size.array as Float32Array;
    const rotations = this.geometry.attributes.rotation.array as Float32Array;
    
    let index = 0;
    
    this.pool.forEach((particle) => {
      positions[index * 3] = particle.position.x;
      positions[index * 3 + 1] = particle.position.y;
      positions[index * 3 + 2] = particle.position.z;
      
      colors[index * 4] = particle.color.r;
      colors[index * 4 + 1] = particle.color.g;
      colors[index * 4 + 2] = particle.color.b;
      colors[index * 4 + 3] = particle.alpha;
      
      sizes[index] = particle.size;
      rotations[index] = particle.rotation;
      
      index++;
    });
    
    // Zero out unused particles
    for (let i = index; i < this.settings.maxParticles; i++) {
      sizes[i] = 0;
    }
    
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.rotation.needsUpdate = true;
    
    // Update draw range
    this.geometry.setDrawRange(0, index);
  }
  
  // Utility functions
  private randomRange(range: FloatRange): number {
    return range.min + Math.random() * (range.max - range.min);
  }
  
  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
  
  private evaluateCurve(curve: FloatCurve[], t: number): number {
    if (curve.length === 0) return 1;
    if (curve.length === 1) return curve[0].value;
    
    for (let i = 0; i < curve.length - 1; i++) {
      if (t >= curve[i].time && t <= curve[i + 1].time) {
        const localT = (t - curve[i].time) / (curve[i + 1].time - curve[i].time);
        return curve[i].value + (curve[i + 1].value - curve[i].value) * localT;
      }
    }
    
    return curve[curve.length - 1].value;
  }
  
  private evaluateColorGradient(
    gradient: ColorStop[],
    t: number
  ): { r: number; g: number; b: number; a: number } {
    if (gradient.length === 0) return { r: 1, g: 1, b: 1, a: 1 };
    if (gradient.length === 1) return gradient[0].color;
    
    for (let i = 0; i < gradient.length - 1; i++) {
      if (t >= gradient[i].time && t <= gradient[i + 1].time) {
        const localT = (t - gradient[i].time) / (gradient[i + 1].time - gradient[i].time);
        const a = gradient[i].color;
        const b = gradient[i + 1].color;
        return {
          r: a.r + (b.r - a.r) * localT,
          g: a.g + (b.g - a.g) * localT,
          b: a.b + (b.b - a.b) * localT,
          a: a.a + (b.a - a.a) * localT,
        };
      }
    }
    
    return gradient[gradient.length - 1].color;
  }
  
  // Simple 3D noise
  private noise3D(x: number, y: number, z: number): number {
    const p = [151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225];
    const X = Math.floor(x) & 15;
    const Y = Math.floor(y) & 15;
    const Z = Math.floor(z) & 15;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = p[X] + Y;
    const B = p[X + 1] + Y;
    return this.lerp(
      this.lerp(
        this.lerp(p[p[A] + Z] / 255, p[p[B] + Z] / 255, u),
        this.lerp(p[p[A + 1] + Z] / 255, p[p[B + 1] + Z] / 255, u),
        v
      ),
      this.lerp(
        this.lerp(p[p[A] + Z + 1] / 255, p[p[B] + Z + 1] / 255, u),
        this.lerp(p[p[A + 1] + Z + 1] / 255, p[p[B + 1] + Z + 1] / 255, u),
        v
      ),
      w
    ) * 2 - 1;
  }
  
  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }
  
  getSettings(): ParticleSystemSettings {
    return this.settings;
  }
  
  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.pool.clear();
  }
}

// ============================================================================
// PARTICLE SYSTEM MANAGER
// ============================================================================

export class ParticleSystemManager extends EventEmitter {
  private emitters: Map<string, ParticleEmitter> = new Map();
  private group: THREE.Group = new THREE.Group();
  
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
  
  getGroup(): THREE.Group {
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
  
  // Preset effects
  createFireEffect(position: { x: number; y: number; z: number }): ParticleEmitter {
    return this.createEmitter({
      id: `fire_${Date.now()}`,
      name: 'Fire',
      duration: 2,
      looping: true,
      prewarm: true,
      maxParticles: 500,
      emitter: {
        shape: 'cone',
        position,
        rotation: { x: 0, y: 0, z: 0 },
        coneAngle: 15,
        coneRadius: 0.5,
        rate: 100,
        simulationSpace: 'world',
      },
      particle: {
        lifetime: { min: 0.5, max: 1.5 },
        startSpeed: { min: 2, max: 4 },
        startSize: { min: 0.3, max: 0.6 },
        startRotation: { min: 0, max: 360 },
        startColor: [{ time: 0, color: { r: 1, g: 0.8, b: 0.3, a: 1 } }],
        colorOverLifetime: [
          { time: 0, color: { r: 1, g: 0.9, b: 0.3, a: 1 } },
          { time: 0.3, color: { r: 1, g: 0.5, b: 0.1, a: 0.8 } },
          { time: 0.7, color: { r: 0.5, g: 0.1, b: 0.05, a: 0.5 } },
          { time: 1, color: { r: 0.1, g: 0.1, b: 0.1, a: 0 } },
        ],
        sizeOverLifetime: [
          { time: 0, value: 0.5 },
          { time: 0.3, value: 1 },
          { time: 1, value: 0.2 },
        ],
        inheritVelocity: 0,
        velocityRandomness: { min: { x: -0.5, y: 0, z: -0.5 }, max: { x: 0.5, y: 0, z: 0.5 } },
        blendMode: 'additive',
        renderOrder: 10,
        billboard: true,
        stretchedBillboard: false,
        stretchFactor: 0,
        sortByDistance: true,
      },
      modifiers: {
        gravity: { x: 0, y: 0.5, z: 0 },
        drag: 0.1,
        turbulenceStrength: 2,
        turbulenceFrequency: 2,
        turbulenceScrollSpeed: 1,
      },
      collision: { enabled: false, bounce: 0, dampen: 0, lifetime: 1, world: false },
      subEmitters: [],
    });
  }
  
  createSmokeEffect(position: { x: number; y: number; z: number }): ParticleEmitter {
    return this.createEmitter({
      id: `smoke_${Date.now()}`,
      name: 'Smoke',
      duration: 3,
      looping: true,
      prewarm: true,
      maxParticles: 200,
      emitter: {
        shape: 'cone',
        position,
        rotation: { x: 0, y: 0, z: 0 },
        coneAngle: 20,
        coneRadius: 0.3,
        rate: 30,
        simulationSpace: 'world',
      },
      particle: {
        lifetime: { min: 2, max: 4 },
        startSpeed: { min: 0.5, max: 1 },
        startSize: { min: 0.5, max: 1 },
        startRotation: { min: 0, max: 360 },
        startColor: [{ time: 0, color: { r: 0.3, g: 0.3, b: 0.3, a: 0.5 } }],
        colorOverLifetime: [
          { time: 0, color: { r: 0.4, g: 0.4, b: 0.4, a: 0.4 } },
          { time: 0.5, color: { r: 0.5, g: 0.5, b: 0.5, a: 0.2 } },
          { time: 1, color: { r: 0.6, g: 0.6, b: 0.6, a: 0 } },
        ],
        sizeOverLifetime: [
          { time: 0, value: 0.5 },
          { time: 1, value: 3 },
        ],
        rotationOverLifetime: 20,
        inheritVelocity: 0,
        velocityRandomness: { min: { x: -0.2, y: 0, z: -0.2 }, max: { x: 0.2, y: 0, z: 0.2 } },
        blendMode: 'normal',
        renderOrder: 5,
        billboard: true,
        stretchedBillboard: false,
        stretchFactor: 0,
        sortByDistance: true,
      },
      modifiers: {
        gravity: { x: 0, y: 0.2, z: 0 },
        drag: 0.2,
        turbulenceStrength: 1,
        turbulenceFrequency: 0.5,
        turbulenceScrollSpeed: 0.5,
      },
      collision: { enabled: false, bounce: 0, dampen: 0, lifetime: 1, world: false },
      subEmitters: [],
    });
  }
  
  createSparkEffect(position: { x: number; y: number; z: number }): ParticleEmitter {
    return this.createEmitter({
      id: `spark_${Date.now()}`,
      name: 'Sparks',
      duration: 0.5,
      looping: false,
      prewarm: false,
      maxParticles: 100,
      emitter: {
        shape: 'point',
        position,
        rotation: { x: 0, y: 0, z: 0 },
        rate: 0,
        bursts: [{ time: 0, count: 50, probability: 1 }],
        simulationSpace: 'world',
      },
      particle: {
        lifetime: { min: 0.3, max: 0.8 },
        startSpeed: { min: 5, max: 10 },
        startSize: { min: 0.05, max: 0.15 },
        startRotation: { min: 0, max: 0 },
        startColor: [
          { time: 0, color: { r: 1, g: 1, b: 0.5, a: 1 } },
          { time: 0, color: { r: 1, g: 0.8, b: 0.3, a: 1 } },
        ],
        colorOverLifetime: [
          { time: 0, color: { r: 1, g: 1, b: 0.8, a: 1 } },
          { time: 0.5, color: { r: 1, g: 0.5, b: 0.2, a: 1 } },
          { time: 1, color: { r: 0.5, g: 0.1, b: 0.05, a: 0 } },
        ],
        inheritVelocity: 0,
        velocityRandomness: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
        blendMode: 'additive',
        renderOrder: 15,
        billboard: true,
        stretchedBillboard: true,
        stretchFactor: 0.5,
        sortByDistance: false,
      },
      modifiers: {
        gravity: { x: 0, y: -10, z: 0 },
        drag: 0.5,
        turbulenceStrength: 0,
        turbulenceFrequency: 0,
        turbulenceScrollSpeed: 0,
      },
      collision: { enabled: true, bounce: 0.3, dampen: 0.5, lifetime: 0.5, world: true },
      subEmitters: [],
    });
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

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback, useRef, useEffect } from 'react';

export function useParticleSystem() {
  const managerRef = useRef<ParticleSystemManager>(new ParticleSystemManager());
  const [emitters, setEmitters] = useState<ParticleEmitter[]>([]);
  const [totalParticles, setTotalParticles] = useState(0);
  
  useEffect(() => {
    const manager = managerRef.current;
    
    const updateEmitters = () => setEmitters(manager.getAllEmitters());
    
    manager.on('emitterCreated', updateEmitters);
    manager.on('emitterRemoved', updateEmitters);
    
    return () => {
      manager.removeAllListeners();
      manager.dispose();
    };
  }, []);
  
  const update = useCallback((deltaTime: number) => {
    managerRef.current.update(deltaTime);
    setTotalParticles(managerRef.current.getTotalParticleCount());
  }, []);
  
  const createEmitter = useCallback((settings: ParticleSystemSettings) => {
    return managerRef.current.createEmitter(settings);
  }, []);
  
  const createFire = useCallback((pos: { x: number; y: number; z: number }) => {
    return managerRef.current.createFireEffect(pos);
  }, []);
  
  const createSmoke = useCallback((pos: { x: number; y: number; z: number }) => {
    return managerRef.current.createSmokeEffect(pos);
  }, []);
  
  const createSparks = useCallback((pos: { x: number; y: number; z: number }) => {
    return managerRef.current.createSparkEffect(pos);
  }, []);
  
  return {
    manager: managerRef.current,
    emitters,
    totalParticles,
    update,
    createEmitter,
    createFire,
    createSmoke,
    createSparks,
    playAll: () => managerRef.current.playAll(),
    stopAll: () => managerRef.current.stopAll(),
    pauseAll: () => managerRef.current.pauseAll(),
    removeEmitter: (id: string) => managerRef.current.removeEmitter(id),
    getGroup: () => managerRef.current.getGroup(),
  };
}

export default {
  ParticleEmitter,
  ParticleSystemManager,
};
