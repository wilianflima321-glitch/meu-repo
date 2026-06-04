// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
import * as THREE from 'three';
import type { ClothCollider, ClothConfig, ClothConstraint, ClothParticle } from './cloth-simulation-contracts';
import { ClothCollisionHandler, SelfCollisionHandler } from './cloth-simulation-collisions';
import { ClothMesh } from './cloth-simulation-mesh';
export type { ClothCollider, ClothConfig, ClothConstraint, ClothParticle } from './cloth-simulation-contracts';
export { ClothCollisionHandler, SelfCollisionHandler } from './cloth-simulation-collisions';
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
    for (let j = 0; j <= this.segmentsY; j++) {
      for (let i = 0; i <= this.segmentsX; i++) {
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
    for (let j = 0; j < this.segmentsY; j++) {
      for (let i = 0; i < this.segmentsX; i++) {
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
    for (let j = 0; j <= this.segmentsY; j++) {
      for (let i = 0; i <= this.segmentsX; i++) {
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
      particle.acceleration.copy(this.gravity);
      const windForce = wind.clone().multiplyScalar(particle.invMass);
      particle.acceleration.add(windForce);
      const velocity = particle.position.clone().sub(particle.previousPosition);
      velocity.multiplyScalar(this.damping);
      const newPosition = particle.position.clone()
        .add(velocity)
        .add(particle.acceleration.clone().multiplyScalar(dtSq));
      particle.previousPosition.copy(particle.position);
      particle.position.copy(newPosition);
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
    if (currentLength > constraint.restLength * this.tearThreshold) {
      constraint.broken = true;
      return;
    }
    const diff = (currentLength - constraint.restLength) / currentLength;
    const correction = delta.multiplyScalar(diff * 0.5 * constraint.stiffness);
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
export { ClothMesh } from './cloth-simulation-mesh';
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
    this.particleSystem = new ClothParticleSystem(this.config);
    this.clothMesh = new ClothMesh(this.particleSystem);
    this.integrator = new VerletIntegrator(this.config.damping, this.config.gravity);
    this.constraintSolver = new ConstraintSolver(this.config.iterations, this.config.tearThreshold);
    this.collisionHandler = new ClothCollisionHandler();
    this.selfCollisionHandler = new SelfCollisionHandler();
    this.selfCollisionHandler.setEnabled(this.config.selfCollision);
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
    dt = Math.min(dt, 1 / 30);
    this.windTime += dt;
    const windVariation = new THREE.Vector3(
      Math.sin(this.windTime * 2.5) * this.config.windVariation,
      Math.cos(this.windTime * 3.1) * this.config.windVariation * 0.5,
      Math.sin(this.windTime * 1.8) * this.config.windVariation
    );
    const currentWind = this.config.wind.clone().add(windVariation);
    this.integrator.integrate(this.particleSystem.particles, dt, currentWind);
    this.constraintSolver.solve(
      this.particleSystem.particles,
      this.particleSystem.constraints
    );
    this.collisionHandler.handleCollisions(this.particleSystem.particles);
    this.selfCollisionHandler.handleSelfCollisions(this.particleSystem.particles);
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
  pinParticle(index: number, pinned: boolean = true): void {
    this.particleSystem.pinParticle(index, pinned);
  }
  pinRow(row: number, pinned: boolean = true): void {
    this.particleSystem.pinRow(row, pinned);
  }
  pinCorners(): void {
    this.particleSystem.pinCorners();
  }
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
  setWind(wind: THREE.Vector3): void {
    this.config.wind.copy(wind);
  }
  setWindVariation(variation: number): void {
    this.config.windVariation = Math.max(0, variation);
  }
  setGravity(gravity: THREE.Vector3): void {
    this.config.gravity.copy(gravity);
    this.integrator.setGravity(gravity);
  }
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
  applyForce(force: THREE.Vector3): void {
    for (const particle of this.particleSystem.particles) {
      if (!particle.pinned) {
        particle.position.add(force.clone().multiplyScalar(particle.invMass));
      }
    }
  }
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
  getMesh(): THREE.Mesh {
    return this.clothMesh.mesh;
  }
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
    for (const constraint of this.particleSystem.constraints) {
      constraint.broken = false;
    }
    this.clothMesh.updateGeometry();
  }
  dispose(): void {
    this.clothMesh.dispose();
  }
}
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
export class GPUClothSimulation {
  private renderer: THREE.WebGLRenderer;
  private particleCount: number;
  private constraintCount: number;
  private positionBufferA: THREE.DataTexture;
  private positionBufferB: THREE.DataTexture;
  private velocityBuffer: THREE.DataTexture;
  private constraintBuffer: THREE.DataTexture;
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
    this.positionBufferA = this.createDataTexture(size);
    this.positionBufferB = this.createDataTexture(size);
    this.velocityBuffer = this.createDataTexture(size);
    this.constraintBuffer = this.createDataTexture(size);
    this.renderTarget = new THREE.WebGLRenderTarget(size, size, {
      format: THREE.RGBAFormat,
      type: THREE.FloatType,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter
    });
    this.integrationMaterial = this.createIntegrationMaterial();
    this.constraintMaterial = this.createConstraintMaterial();
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
          gl_FragColor = vec4(position, pinned);
        }
      `
    });
  }
  update(dt: number): void {
    const readBuffer = this.currentBuffer === 'A' ? this.positionBufferA : this.positionBufferB;
    const writeBuffer = this.currentBuffer === 'A' ? this.positionBufferB : this.positionBufferA;
    this.integrationMaterial.uniforms.positionTexture.value = readBuffer;
    this.integrationMaterial.uniforms.velocityTexture.value = this.velocityBuffer;
    this.integrationMaterial.uniforms.deltaTime.value = dt;
    this.quadMesh.material = this.integrationMaterial;
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.render(this.quadMesh, new THREE.Camera());
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
