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

// ============================================================================
// TYPES
// ============================================================================

export interface ClothConfig {
  width: number;
  height: number;
  segmentsX: number;
  segmentsY: number;
  mass: number;
  stiffness: number;
  damping: number;
  gravity: THREE.Vector3;
  wind: THREE.Vector3;
  windVariation: number;
  iterations: number;
  tearThreshold: number;
  selfCollision: boolean;
  groundPlane: boolean;
  groundHeight: number;
}

export interface ClothParticle {
  position: THREE.Vector3;
  previousPosition: THREE.Vector3;
  acceleration: THREE.Vector3;
  mass: number;
  invMass: number;
  pinned: boolean;
  index: number;
}

export interface ClothConstraint {
  p1: number;
  p2: number;
  restLength: number;
  stiffness: number;
  type: 'structural' | 'shear' | 'bend';
  broken: boolean;
}

export interface ClothCollider {
  type: 'sphere' | 'plane' | 'capsule' | 'box';
  position: THREE.Vector3;
  radius?: number;
  normal?: THREE.Vector3;
  size?: THREE.Vector3;
  start?: THREE.Vector3;
  end?: THREE.Vector3;
}

// ============================================================================
// CLOTH PARTICLE
// ============================================================================

export class ClothParticleSystem {
  particles: ClothParticle[] = [];
  constraints: ClothConstraint[] = [];
  
  private config: ClothConfig;
  private width: number;
  private height: number;
  private segmentsX: number;
  private segmentsY: number;
  
  constructor(config: ClothConfig) {
    this.config = config;
    this.width = config.width;
    this.height = config.height;
    this.segmentsX = config.segmentsX;
    this.segmentsY = config.segmentsY;
    
    this.createParticles();
    this.createConstraints();
  }
  
  private createParticles(): void {
    const massPerParticle = this.config.mass / ((this.segmentsX + 1) * (this.segmentsY + 1));
    
    for (let j = 0; j <= this.segmentsY; j++) {
      for (let i = 0; i <= this.segmentsX; i++) {
        const x = (i / this.segmentsX) * this.width - this.width / 2;
        const y = this.height;
        const z = (j / this.segmentsY) * this.height - this.height / 2;
        
        const position = new THREE.Vector3(x, y, z);
        
        const particle: ClothParticle = {
          position: position.clone(),
          previousPosition: position.clone(),
          acceleration: new THREE.Vector3(),
          mass: massPerParticle,
          invMass: 1 / massPerParticle,
          pinned: false,
          index: j * (this.segmentsX + 1) + i
        };
        
        // Pin top row by default
        if (j === 0) {
          particle.pinned = true;
          particle.invMass = 0;
        }
        
        this.particles.push(particle);
      }
    }
  }
  
  private createConstraints(): void {
    const getIndex = (i: number, j: number) => j * (this.segmentsX + 1) + i;
    
    // Structural constraints (horizontal and vertical)
    for (let j = 0; j <= this.segmentsY; j++) {
      for (let i = 0; i <= this.segmentsX; i++) {
        // Horizontal
        if (i < this.segmentsX) {
          const p1 = getIndex(i, j);
          const p2 = getIndex(i + 1, j);
          const restLength = this.particles[p1].position.distanceTo(this.particles[p2].position);
          
          this.constraints.push({
            p1, p2,
            restLength,
            stiffness: this.config.stiffness,
            type: 'structural',
            broken: false
          });
        }
        
        // Vertical
        if (j < this.segmentsY) {
          const p1 = getIndex(i, j);
          const p2 = getIndex(i, j + 1);
          const restLength = this.particles[p1].position.distanceTo(this.particles[p2].position);
          
          this.constraints.push({
            p1, p2,
            restLength,
            stiffness: this.config.stiffness,
            type: 'structural',
            broken: false
          });
        }
      }
    }
    
    // Shear constraints (diagonal)
    for (let j = 0; j < this.segmentsY; j++) {
      for (let i = 0; i < this.segmentsX; i++) {
        // Diagonal 1
        const p1 = getIndex(i, j);
        const p2 = getIndex(i + 1, j + 1);
        const restLength1 = this.particles[p1].position.distanceTo(this.particles[p2].position);
        
        this.constraints.push({
          p1, p2,
          restLength: restLength1,
          stiffness: this.config.stiffness * 0.8,
          type: 'shear',
          broken: false
        });
        
        // Diagonal 2
        const p3 = getIndex(i + 1, j);
        const p4 = getIndex(i, j + 1);
        const restLength2 = this.particles[p3].position.distanceTo(this.particles[p4].position);
        
        this.constraints.push({
          p1: p3, p2: p4,
          restLength: restLength2,
          stiffness: this.config.stiffness * 0.8,
          type: 'shear',
          broken: false
        });
      }
    }
    
    // Bend constraints (skip one)
    for (let j = 0; j <= this.segmentsY; j++) {
      for (let i = 0; i <= this.segmentsX; i++) {
        // Horizontal bend
        if (i < this.segmentsX - 1) {
          const p1 = getIndex(i, j);
          const p2 = getIndex(i + 2, j);
          const restLength = this.particles[p1].position.distanceTo(this.particles[p2].position);
          
          this.constraints.push({
            p1, p2,
            restLength,
            stiffness: this.config.stiffness * 0.3,
            type: 'bend',
            broken: false
          });
        }
        
        // Vertical bend
        if (j < this.segmentsY - 1) {
          const p1 = getIndex(i, j);
          const p2 = getIndex(i, j + 2);
          const restLength = this.particles[p1].position.distanceTo(this.particles[p2].position);
          
          this.constraints.push({
            p1, p2,
            restLength,
            stiffness: this.config.stiffness * 0.3,
            type: 'bend',
            broken: false
          });
        }
      }
    }
  }
  
  pinParticle(index: number, pinned: boolean = true): void {
    if (index >= 0 && index < this.particles.length) {
      this.particles[index].pinned = pinned;
      this.particles[index].invMass = pinned ? 0 : 1 / this.particles[index].mass;
    }
  }
  
  pinRow(row: number, pinned: boolean = true): void {
    for (let i = 0; i <= this.segmentsX; i++) {
      const index = row * (this.segmentsX + 1) + i;
      this.pinParticle(index, pinned);
    }
  }
  
  pinCorners(): void {
    this.pinParticle(0, true); // Top-left
    this.pinParticle(this.segmentsX, true); // Top-right
    this.pinParticle((this.segmentsY) * (this.segmentsX + 1), true); // Bottom-left
    this.pinParticle((this.segmentsY + 1) * (this.segmentsX + 1) - 1, true); // Bottom-right
  }
  
  getParticleAt(x: number, y: number): ClothParticle | null {
    if (x < 0 || x > this.segmentsX || y < 0 || y > this.segmentsY) {
      return null;
    }
    return this.particles[y * (this.segmentsX + 1) + x];
  }
}

// ============================================================================
// VERLET INTEGRATOR
// ============================================================================

export class VerletIntegrator {
  private damping: number;
  private gravity: THREE.Vector3;
  
  constructor(damping: number = 0.99, gravity: THREE.Vector3 = new THREE.Vector3(0, -9.81, 0)) {
    this.damping = damping;
    this.gravity = gravity;
  }
  
  integrate(particles: ClothParticle[], dt: number, wind: THREE.Vector3): void {
    const dtSq = dt * dt;
    
    for (const particle of particles) {
      if (particle.pinned) continue;
      
      // Add gravity
      particle.acceleration.copy(this.gravity);
      
      // Add wind with some randomness
      const windForce = wind.clone().multiplyScalar(particle.invMass);
      particle.acceleration.add(windForce);
      
      // Verlet integration
      const velocity = particle.position.clone().sub(particle.previousPosition);
      velocity.multiplyScalar(this.damping);
      
      const newPosition = particle.position.clone()
        .add(velocity)
        .add(particle.acceleration.clone().multiplyScalar(dtSq));
      
      particle.previousPosition.copy(particle.position);
      particle.position.copy(newPosition);
      
      // Reset acceleration
      particle.acceleration.set(0, 0, 0);
    }
  }
  
  setGravity(gravity: THREE.Vector3): void {
    this.gravity.copy(gravity);
  }
  
  setDamping(damping: number): void {
    this.damping = Math.max(0, Math.min(1, damping));
  }
}

// ============================================================================
// CONSTRAINT SOLVER
// ============================================================================

export class ConstraintSolver {
  private iterations: number;
  private tearThreshold: number;
  
  constructor(iterations: number = 10, tearThreshold: number = 2.0) {
    this.iterations = iterations;
    this.tearThreshold = tearThreshold;
  }
  
  solve(particles: ClothParticle[], constraints: ClothConstraint[]): void {
    for (let iter = 0; iter < this.iterations; iter++) {
      for (const constraint of constraints) {
        if (constraint.broken) continue;
        
        this.solveConstraint(particles, constraint);
      }
    }
  }
  
  private solveConstraint(particles: ClothParticle[], constraint: ClothConstraint): void {
    const p1 = particles[constraint.p1];
    const p2 = particles[constraint.p2];
    
    const delta = p2.position.clone().sub(p1.position);
    const currentLength = delta.length();
    
    if (currentLength === 0) return;
    
    // Check for tearing
    if (currentLength > constraint.restLength * this.tearThreshold) {
      constraint.broken = true;
      return;
    }
    
    // Calculate correction
    const diff = (currentLength - constraint.restLength) / currentLength;
    const correction = delta.multiplyScalar(diff * 0.5 * constraint.stiffness);
    
    // Apply correction based on inverse mass
    const totalInvMass = p1.invMass + p2.invMass;
    if (totalInvMass === 0) return;
    
    const w1 = p1.invMass / totalInvMass;
    const w2 = p2.invMass / totalInvMass;
    
    if (!p1.pinned) {
      p1.position.add(correction.clone().multiplyScalar(w1));
    }
    if (!p2.pinned) {
      p2.position.sub(correction.clone().multiplyScalar(w2));
    }
  }
  
  setIterations(iterations: number): void {
    this.iterations = Math.max(1, iterations);
  }
  
  setTearThreshold(threshold: number): void {
    this.tearThreshold = Math.max(1.0, threshold);
  }
}

// ============================================================================
// COLLISION HANDLER
// ============================================================================

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
      // Push particle out of sphere
      const normal = delta.normalize();
      particle.position.copy(collider.position).add(normal.multiplyScalar(minDist));
      
      // Apply friction to velocity
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
      // Push particle above plane
      particle.position.add(collider.normal.clone().multiplyScalar(-dot + 0.01));
      
      // Apply friction
      const velocity = particle.position.clone().sub(particle.previousPosition);
      const normalVelocity = collider.normal.clone().multiplyScalar(velocity.dot(collider.normal));
      const tangentVelocity = velocity.sub(normalVelocity);
      tangentVelocity.multiplyScalar(1 - this.friction);
      
      particle.previousPosition.copy(particle.position.clone().sub(tangentVelocity));
    }
  }
  
  private handleCapsuleCollision(particle: ClothParticle, collider: ClothCollider): void {
    if (!collider.start || !collider.end || !collider.radius) return;
    
    // Find closest point on capsule line segment
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
    
    // Check if inside box
    if (
      Math.abs(localPos.x) < halfSize.x &&
      Math.abs(localPos.y) < halfSize.y &&
      Math.abs(localPos.z) < halfSize.z
    ) {
      // Find closest face
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

// ============================================================================
// SELF COLLISION
// ============================================================================

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
    
    // Build spatial hash
    this.buildHashGrid(particles);
    
    // Check collisions using hash grid
    for (let i = 0; i < particles.length; i++) {
      const p1 = particles[i];
      if (p1.pinned) continue;
      
      const neighbors = this.getNearbyParticles(p1.position);
      
      for (const j of neighbors) {
        if (i >= j) continue; // Avoid duplicate checks
        
        const p2 = particles[j];
        if (p2.pinned) continue;
        
        // Skip directly connected particles (would need constraint info)
        // For now, just check distance
        const delta = p2.position.clone().sub(p1.position);
        const distance = delta.length();
        
        if (distance < this.thickness && distance > 0) {
          // Push particles apart
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
    
    // Check 27 neighboring cells
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

// ============================================================================
// CLOTH MESH
// ============================================================================

export class ClothMesh {
  readonly geometry: THREE.BufferGeometry;
  readonly mesh: THREE.Mesh;
  private particleSystem: ClothParticleSystem;
  private vertices: Float32Array;
  private normals: Float32Array;
  private indices: Uint32Array;
  
  constructor(particleSystem: ClothParticleSystem, material?: THREE.Material) {
    this.particleSystem = particleSystem;
    
    const particles = particleSystem.particles;
    const segmentsX = Math.sqrt(particles.length) - 1;
    const segmentsY = segmentsX;
    
    // Create vertex buffer
    this.vertices = new Float32Array(particles.length * 3);
    this.normals = new Float32Array(particles.length * 3);
    
    // Create index buffer
    const indexCount = segmentsX * segmentsY * 6;
    this.indices = new Uint32Array(indexCount);
    
    let indexOffset = 0;
    for (let j = 0; j < segmentsY; j++) {
      for (let i = 0; i < segmentsX; i++) {
        const a = j * (segmentsX + 1) + i;
        const b = a + 1;
        const c = a + (segmentsX + 1);
        const d = c + 1;
        
        // Triangle 1
        this.indices[indexOffset++] = a;
        this.indices[indexOffset++] = c;
        this.indices[indexOffset++] = b;
        
        // Triangle 2
        this.indices[indexOffset++] = b;
        this.indices[indexOffset++] = c;
        this.indices[indexOffset++] = d;
      }
    }
    
    // Create UV buffer
    const uvs = new Float32Array(particles.length * 2);
    for (let j = 0; j <= segmentsY; j++) {
      for (let i = 0; i <= segmentsX; i++) {
        const index = j * (segmentsX + 1) + i;
        uvs[index * 2] = i / segmentsX;
        uvs[index * 2 + 1] = 1 - j / segmentsY;
      }
    }
    
    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.vertices, 3));
    this.geometry.setAttribute('normal', new THREE.BufferAttribute(this.normals, 3));
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(this.indices, 1));
    
    // Create mesh
    const defaultMaterial = material || new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.0
    });
    
    this.mesh = new THREE.Mesh(this.geometry, defaultMaterial);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    
    this.updateGeometry();
  }
  
  updateGeometry(): void {
    const particles = this.particleSystem.particles;
    const positionAttribute = this.geometry.getAttribute('position');
    const normalAttribute = this.geometry.getAttribute('normal');
    
    // Update positions
    for (let i = 0; i < particles.length; i++) {
      this.vertices[i * 3] = particles[i].position.x;
      this.vertices[i * 3 + 1] = particles[i].position.y;
      this.vertices[i * 3 + 2] = particles[i].position.z;
    }
    
    positionAttribute.needsUpdate = true;
    
    // Recalculate normals
    this.calculateNormals();
    normalAttribute.needsUpdate = true;
    
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
  }
  
  private calculateNormals(): void {
    // Reset normals
    this.normals.fill(0);
    
    // Calculate face normals and accumulate
    for (let i = 0; i < this.indices.length; i += 3) {
      const a = this.indices[i];
      const b = this.indices[i + 1];
      const c = this.indices[i + 2];
      
      const p1 = new THREE.Vector3(
        this.vertices[a * 3],
        this.vertices[a * 3 + 1],
        this.vertices[a * 3 + 2]
      );
      const p2 = new THREE.Vector3(
        this.vertices[b * 3],
        this.vertices[b * 3 + 1],
        this.vertices[b * 3 + 2]
      );
      const p3 = new THREE.Vector3(
        this.vertices[c * 3],
        this.vertices[c * 3 + 1],
        this.vertices[c * 3 + 2]
      );
      
      const edge1 = p2.clone().sub(p1);
      const edge2 = p3.clone().sub(p1);
      const normal = edge1.cross(edge2);
      
      // Accumulate normals
      for (const idx of [a, b, c]) {
        this.normals[idx * 3] += normal.x;
        this.normals[idx * 3 + 1] += normal.y;
        this.normals[idx * 3 + 2] += normal.z;
      }
    }
    
    // Normalize
    for (let i = 0; i < this.normals.length; i += 3) {
      const len = Math.sqrt(
        this.normals[i] ** 2 +
        this.normals[i + 1] ** 2 +
        this.normals[i + 2] ** 2
      );
      
      if (len > 0) {
        this.normals[i] /= len;
        this.normals[i + 1] /= len;
        this.normals[i + 2] /= len;
      }
    }
  }
  
  dispose(): void {
    this.geometry.dispose();
    if (this.mesh.material instanceof THREE.Material) {
      this.mesh.material.dispose();
    }
  }
}

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

// ============================================================================
// GPU CLOTH SIMULATION (WebGL Compute/Transform Feedback)
// ============================================================================

export class GPUClothSimulation {
  private renderer: THREE.WebGLRenderer;
  private particleCount: number;
  private constraintCount: number;
  
  // Double buffer for positions
  private positionBufferA: THREE.DataTexture;
  private positionBufferB: THREE.DataTexture;
  private velocityBuffer: THREE.DataTexture;
  private constraintBuffer: THREE.DataTexture;
  
  // Compute materials
  private integrationMaterial: THREE.ShaderMaterial;
  private constraintMaterial: THREE.ShaderMaterial;
  
  private quadMesh: THREE.Mesh;
  private renderTarget: THREE.WebGLRenderTarget;
  
  private currentBuffer: 'A' | 'B' = 'A';
  
  constructor(renderer: THREE.WebGLRenderer, config: ClothConfig) {
    this.renderer = renderer;
    this.particleCount = (config.segmentsX + 1) * (config.segmentsY + 1);
    this.constraintCount = 0; // Would calculate from config
    
    const size = Math.ceil(Math.sqrt(this.particleCount));
    
    // Create position buffers
    this.positionBufferA = this.createDataTexture(size);
    this.positionBufferB = this.createDataTexture(size);
    this.velocityBuffer = this.createDataTexture(size);
    this.constraintBuffer = this.createDataTexture(size);
    
    // Create render target
    this.renderTarget = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    });
    
    // Create shaders
    this.integrationMaterial = this.createIntegrationMaterial();
    this.constraintMaterial = this.createConstraintMaterial();
    
    // Create fullscreen quad
    const quadGeometry = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeometry, this.integrationMaterial);
  }
  
  private createDataTexture(size: number): THREE.DataTexture {
    const data = new Float32Array(size * size * 4);
    const texture = new THREE.DataTexture(
      data, size, size,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    texture.needsUpdate = true;
    return texture;
  }
  
  private createIntegrationMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        positionTexture: { value: null },
        velocityTexture: { value: null },
        deltaTime: { value: 0.016 },
        gravity: { value: new THREE.Vector3(0, -9.81, 0) },
        wind: { value: new THREE.Vector3(0, 0, 0) },
        damping: { value: 0.99 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D positionTexture;
        uniform sampler2D velocityTexture;
        uniform float deltaTime;
        uniform vec3 gravity;
        uniform vec3 wind;
        uniform float damping;
        
        varying vec2 vUv;
        
        void main() {
          vec4 posData = texture2D(positionTexture, vUv);
          vec4 velData = texture2D(velocityTexture, vUv);
          
          vec3 position = posData.xyz;
          float pinned = posData.w;
          vec3 velocity = velData.xyz;
          
          if (pinned < 0.5) {
            // Verlet integration
            vec3 acceleration = gravity + wind;
            velocity = velocity * damping + acceleration * deltaTime;
            position = position + velocity * deltaTime;
          }
          
          gl_FragColor = vec4(position, pinned);
        }
      `
    });
  }
  
  private createConstraintMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        positionTexture: { value: null },
        constraintTexture: { value: null },
        textureSize: { value: 0 },
        stiffness: { value: 0.9 }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D positionTexture;
        uniform sampler2D constraintTexture;
        uniform float textureSize;
        uniform float stiffness;
        
        varying vec2 vUv;
        
        vec2 indexToUV(float index) {
          float y = floor(index / textureSize);
          float x = index - y * textureSize;
          return vec2((x + 0.5) / textureSize, (y + 0.5) / textureSize);
        }
        
        void main() {
          vec4 posData = texture2D(positionTexture, vUv);
          vec3 position = posData.xyz;
          float pinned = posData.w;
          
          // Would apply constraint corrections here
          // Simplified version - actual implementation would be more complex
          
          gl_FragColor = vec4(position, pinned);
        }
      `
    });
  }
  
  update(dt: number): void {
    // Swap buffers
    const readBuffer = this.currentBuffer === 'A' ? this.positionBufferA : this.positionBufferB;
    const writeBuffer = this.currentBuffer === 'A' ? this.positionBufferB : this.positionBufferA;
    
    // Integration pass
    this.integrationMaterial.uniforms.positionTexture.value = readBuffer;
    this.integrationMaterial.uniforms.velocityTexture.value = this.velocityBuffer;
    this.integrationMaterial.uniforms.deltaTime.value = dt;
    
    this.quadMesh.material = this.integrationMaterial;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.quadMesh, new THREE.Camera());
    
    // Constraint passes would go here
    
    this.renderer.setRenderTarget(null);
    
    this.currentBuffer = this.currentBuffer === 'A' ? 'B' : 'A';
  }
  
  getPositionTexture(): THREE.Texture {
    return this.currentBuffer === 'A' ? this.positionBufferA : this.positionBufferB;
  }
  
  dispose(): void {
    this.positionBufferA.dispose();
    this.positionBufferB.dispose();
    this.velocityBuffer.dispose();
    this.constraintBuffer.dispose();
    this.renderTarget.dispose();
    this.integrationMaterial.dispose();
    this.constraintMaterial.dispose();
    this.quadMesh.geometry.dispose();
  }
}

// ============================================================================
// PRESETS
// ============================================================================

export const CLOTH_PRESETS = {
  flag: {
    width: 2,
    height: 1.5,
    segmentsX: 30,
    segmentsY: 20,
    mass: 0.5,
    stiffness: 0.95,
    damping: 0.98,
    wind: new THREE.Vector3(5, 0, 1),
    windVariation: 2
  },
  
  cape: {
    width: 1.2,
    height: 1.5,
    segmentsX: 15,
    segmentsY: 20,
    mass: 0.8,
    stiffness: 0.9,
    damping: 0.97,
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.5
  },
  
  curtain: {
    width: 3,
    height: 2.5,
    segmentsX: 40,
    segmentsY: 35,
    mass: 2.0,
    stiffness: 0.85,
    damping: 0.96,
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.2
  },
  
  tablecloth: {
    width: 2,
    height: 2,
    segmentsX: 25,
    segmentsY: 25,
    mass: 1.5,
    stiffness: 0.8,
    damping: 0.95,
    gravity: new THREE.Vector3(0, -15, 0),
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0
  },
  
  silk: {
    width: 1.5,
    height: 2,
    segmentsX: 50,
    segmentsY: 60,
    mass: 0.3,
    stiffness: 0.6,
    damping: 0.99,
    wind: new THREE.Vector3(1, 0, 0.5),
    windVariation: 1
  }
};

export default ClothSimulation;
