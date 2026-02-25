/**
 * CLOTH SIMULATION SYSTEM - Aethel Engine
 * 
 * Sistema de simulação de tecidos baseado em física real.
 * Usa modelo de molas (spring-mass) com restrições de distância e dobra.
 * 
 * FEATURES:
 * - Verlet Integration para estabilidade
 * - Collision com esferas e planos
 * - Wind simulation
 * - Tearing/rasgo de tecido
 * - Self-collision
 * - GPU acceleration via compute shaders
 * - Pin constraints
 */

import * as THREE from 'three';
import type {
  ClothCollider,
  ClothConfig,
  ClothConstraint,
  ClothParticle,
} from './cloth-simulation.types';
export { CLOTH_PRESETS, GPUClothSimulation } from './cloth-simulation-gpu';
export type {
  ClothCollider,
  ClothConfig,
  ClothConstraint,
  ClothParticle,
} from './cloth-simulation.types';

export {
  ClothCollisionHandler,
  ClothMesh,
  ClothParticleSystem,
  ConstraintSolver,
  SelfCollisionHandler,
  VerletIntegrator,
} from './cloth-simulation-core';

import {
  ClothCollisionHandler,
  ClothMesh,
  ClothParticleSystem,
  ConstraintSolver,
  SelfCollisionHandler,
  VerletIntegrator,
} from './cloth-simulation-core';

// ============================================================================
// CLOTH SIMULATION
// ============================================================================

export class ClothSimulation {
  readonly config: ClothConfig;
  readonly particleSystem: ClothParticleSystem;
  readonly clothMesh: ClothMesh;
  
  private integrator: VerletIntegrator;
  private constraintSolver: ConstraintSolver;
  private collisionHandler: ClothCollisionHandler;
  private selfCollisionHandler: SelfCollisionHandler;
  
  private windTime: number = 0;
  
  constructor(config: Partial<ClothConfig> = {}) {
    this.config = {
      width: config.width ?? 2,
      height: config.height ?? 2,
      segmentsX: config.segmentsX ?? 20,
      segmentsY: config.segmentsY ?? 20,
      mass: config.mass ?? 1.0,
      stiffness: config.stiffness ?? 0.9,
      damping: config.damping ?? 0.99,
      gravity: config.gravity ?? new THREE.Vector3(0, -9.81, 0),
      wind: config.wind ?? new THREE.Vector3(0, 0, 0),
      windVariation: config.windVariation ?? 0.5,
      iterations: config.iterations ?? 10,
      tearThreshold: config.tearThreshold ?? 2.0,
      selfCollision: config.selfCollision ?? false,
      groundPlane: config.groundPlane ?? true,
      groundHeight: config.groundHeight ?? 0
    };
    
    // Create particle system
    this.particleSystem = new ClothParticleSystem(this.config);
    
    // Create mesh
    this.clothMesh = new ClothMesh(this.particleSystem);
    
    // Create simulation components
    this.integrator = new VerletIntegrator(this.config.damping, this.config.gravity);
    this.constraintSolver = new ConstraintSolver(this.config.iterations, this.config.tearThreshold);
    this.collisionHandler = new ClothCollisionHandler();
    this.selfCollisionHandler = new SelfCollisionHandler();
    this.selfCollisionHandler.setEnabled(this.config.selfCollision);
    
    // Add ground plane if enabled
    if (this.config.groundPlane) {
      this.collisionHandler.addCollider({
        type: 'plane',
        position: new THREE.Vector3(0, this.config.groundHeight, 0),
        normal: new THREE.Vector3(0, 1, 0)
      });
    }
  }

  get particles(): ClothParticle[] {
    return this.particleSystem.particles;
  }

  get constraints(): ClothConstraint[] {
    return this.particleSystem.constraints;
  }
  
  update(dt: number): void {
    // Limit dt for stability
    dt = Math.min(dt, 1 / 30);
    
    // Calculate wind with variation
    this.windTime += dt;
    const windVariation = new THREE.Vector3(
      Math.sin(this.windTime * 2.5) * this.config.windVariation,
      Math.cos(this.windTime * 3.1) * this.config.windVariation * 0.5,
      Math.sin(this.windTime * 1.8) * this.config.windVariation
    );
    const currentWind = this.config.wind.clone().add(windVariation);
    
    // Integration step
    this.integrator.integrate(this.particleSystem.particles, dt, currentWind);
    
    // Constraint solving
    this.constraintSolver.solve(
      this.particleSystem.particles,
      this.particleSystem.constraints
    );
    
    // Collision handling
    this.collisionHandler.handleCollisions(this.particleSystem.particles);
    
    // Self-collision
    this.selfCollisionHandler.handleSelfCollisions(this.particleSystem.particles);
    
    // Update mesh geometry
    this.clothMesh.updateGeometry();
  }

  updateConfig(config: Partial<ClothConfig>): void {
    if (typeof config.damping === 'number') {
      this.config.damping = config.damping;
      this.integrator.setDamping(config.damping);
    }
    if (config.gravity) {
      this.config.gravity.copy(config.gravity);
      this.integrator.setGravity(config.gravity);
    }
    if (config.wind) {
      this.setWind(config.wind);
    }
    if (typeof config.windVariation === 'number') {
      this.setWindVariation(config.windVariation);
    }
    if (typeof config.stiffness === 'number') {
      this.setStiffness(config.stiffness);
    }
    if (typeof config.iterations === 'number') {
      this.config.iterations = config.iterations;
      this.constraintSolver.setIterations(config.iterations);
    }
    if (typeof config.tearThreshold === 'number') {
      this.config.tearThreshold = config.tearThreshold;
      this.constraintSolver.setTearThreshold(config.tearThreshold);
    }
    if (typeof config.selfCollision === 'boolean') {
      this.config.selfCollision = config.selfCollision;
      this.selfCollisionHandler.setEnabled(config.selfCollision);
    }
    if (typeof config.groundPlane === 'boolean') {
      this.config.groundPlane = config.groundPlane;
    }
    if (typeof config.groundHeight === 'number') {
      this.config.groundHeight = config.groundHeight;
    }
  }

  setColliders(colliders: ClothCollider[]): void {
    this.collisionHandler.clearColliders();
    for (const collider of colliders) {
      this.collisionHandler.addCollider(collider);
    }
  }
  
  // Pin methods
  pinParticle(index: number, pinned: boolean = true): void {
    this.particleSystem.pinParticle(index, pinned);
  }
  
  pinRow(row: number, pinned: boolean = true): void {
    this.particleSystem.pinRow(row, pinned);
  }
  
  pinCorners(): void {
    this.particleSystem.pinCorners();
  }
  
  // Collider methods
  addSphereCollider(position: THREE.Vector3, radius: number): ClothCollider {
    const collider: ClothCollider = { type: 'sphere', position, radius };
    this.collisionHandler.addCollider(collider);
    return collider;
  }
  
  addBoxCollider(position: THREE.Vector3, size: THREE.Vector3): ClothCollider {
    const collider: ClothCollider = { type: 'box', position, size };
    this.collisionHandler.addCollider(collider);
    return collider;
  }
  
  addCapsuleCollider(start: THREE.Vector3, end: THREE.Vector3, radius: number): ClothCollider {
    const collider: ClothCollider = {
      type: 'capsule',
      position: start.clone().add(end).multiplyScalar(0.5),
      start, end, radius
    };
    this.collisionHandler.addCollider(collider);
    return collider;
  }
  
  removeCollider(collider: ClothCollider): void {
    this.collisionHandler.removeCollider(collider);
  }
  
  // Wind methods
  setWind(wind: THREE.Vector3): void {
    this.config.wind.copy(wind);
  }
  
  setWindVariation(variation: number): void {
    this.config.windVariation = Math.max(0, variation);
  }
  
  // Gravity methods
  setGravity(gravity: THREE.Vector3): void {
    this.config.gravity.copy(gravity);
    this.integrator.setGravity(gravity);
  }
  
  // Stiffness methods
  setStiffness(stiffness: number): void {
    this.config.stiffness = Math.max(0, Math.min(1, stiffness));
    for (const constraint of this.particleSystem.constraints) {
      if (constraint.type === 'structural') {
        constraint.stiffness = this.config.stiffness;
      } else if (constraint.type === 'shear') {
        constraint.stiffness = this.config.stiffness * 0.8;
      } else {
        constraint.stiffness = this.config.stiffness * 0.3;
      }
    }
  }
  
  // Apply external force
  applyForce(force: THREE.Vector3): void {
    for (const particle of this.particleSystem.particles) {
      if (!particle.pinned) {
        particle.position.add(force.clone().multiplyScalar(particle.invMass));
      }
    }
  }
  
  // Apply impulse at position
  applyImpulseAtPosition(position: THREE.Vector3, impulse: THREE.Vector3, radius: number): void {
    for (const particle of this.particleSystem.particles) {
      if (particle.pinned) continue;
      
      const distance = particle.position.distanceTo(position);
      if (distance < radius) {
        const falloff = 1 - distance / radius;
        const scaledImpulse = impulse.clone().multiplyScalar(falloff * particle.invMass);
        particle.position.add(scaledImpulse);
      }
    }
  }
  
  // Get mesh for adding to scene
  getMesh(): THREE.Mesh {
    return this.clothMesh.mesh;
  }
  
  // Reset simulation
  reset(): void {
    const particles = this.particleSystem.particles;
    const segmentsX = this.config.segmentsX;
    const segmentsY = this.config.segmentsY;
    
    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const x = (i / segmentsX) * this.config.width - this.config.width / 2;
        const y = this.config.height;
        const z = (j / segmentsY) * this.config.height - this.config.height / 2;
        
        const index = j * (segmentsX + 1) + i;
        particles[index].position.set(x, y, z);
        particles[index].previousPosition.set(x, y, z);
      }
    }
    
    // Reset torn constraints
    for (const constraint of this.particleSystem.constraints) {
      constraint.broken = false;
    }
    
    this.clothMesh.updateGeometry();
  }
  
  dispose(): void {
    this.clothMesh.dispose();
  }
}

// ============================================================================
// CLOTH MANAGER
// ============================================================================

export class ClothManager {
  private cloths: Map<string, ClothSimulation> = new Map();
  private scene: THREE.Scene;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }
  
  create(id: string, config: Partial<ClothConfig> = {}): ClothSimulation {
    const cloth = new ClothSimulation(config);
    this.cloths.set(id, cloth);
    this.scene.add(cloth.getMesh());
    return cloth;
  }
  
  get(id: string): ClothSimulation | undefined {
    return this.cloths.get(id);
  }
  
  remove(id: string): void {
    const cloth = this.cloths.get(id);
    if (cloth) {
      this.scene.remove(cloth.getMesh());
      cloth.dispose();
      this.cloths.delete(id);
    }
  }
  
  update(dt: number): void {
    for (const cloth of this.cloths.values()) {
      cloth.update(dt);
    }
  }
  
  dispose(): void {
    for (const cloth of this.cloths.values()) {
      this.scene.remove(cloth.getMesh());
      cloth.dispose();
    }
    this.cloths.clear();
  }
}

// GPU simulation and presets extracted to cloth-simulation-gpu.ts

export default ClothSimulation;
