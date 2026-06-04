// @aethel-heavy-async-boundary Studio/render-gated runtime; do not import from public route shells.
/**
 * Destruction System (Chaos-like)
 *
 * Sistema de destruição física profissional:
 * - Mesh fracturing/voronoi decomposition
 * - Real-time destruction
 * - Debris physics
 * - Destruction levels (hierarchical)
 * - Damage thresholds
 * - Impact propagation
 * - Sound/VFX triggers
 * - Debris cleanup/pooling
 */

import * as THREE from 'three';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export type { DestructibleConfig, DestructionEvent, FragmentData, VoronoiCell } from './destruction-contracts';
import type { DestructibleConfig, DestructionEvent, FragmentData, VoronoiCell } from './destruction-contracts';

// ============================================================================
// VORONOI FRACTURE GENERATOR
// ============================================================================

import { VoronoiFractureGenerator } from './destruction-fracture-generator';
export { VoronoiFractureGenerator } from './destruction-fracture-generator';

// ============================================================================
// DESTRUCTIBLE OBJECT
// ============================================================================

export class DestructibleObject {
  readonly id: string;
  readonly config: DestructibleConfig;

  private mesh: THREE.Mesh;
  private originalGeometry: THREE.BufferGeometry;
  private originalMaterial: THREE.Material;
  private health: number;
  private currentLevel: number = 0;
  private destroyed: boolean = false;
  private fragments: FragmentData[] = [];

  private fractureGenerator: VoronoiFractureGenerator;
  private scene: THREE.Scene;

  constructor(
    id: string,
    mesh: THREE.Mesh,
    scene: THREE.Scene,
    config: Partial<DestructibleConfig> = {}
  ) {
    this.id = id;
    this.mesh = mesh;
    this.scene = scene;
    this.originalGeometry = mesh.geometry.clone();
    this.originalMaterial = mesh.material as THREE.Material;

    this.config = {
      maxHealth: 100,
      fractureLevels: 3,
      fragmentCount: 8,
      debrisLifetime: 5,
      impactPropagation: 2.0,
      enablePhysics: true,
      enableSound: true,
      enableVFX: true,
      ...config,
    };

    this.health = this.config.maxHealth;
    this.fractureGenerator = new VoronoiFractureGenerator(Math.random() * 99999);
  }

  applyDamage(
    damage: number,
    impactPoint: THREE.Vector3,
    impactNormal: THREE.Vector3,
    impactForce: number
  ): DestructionEvent {
    if (this.destroyed) {
      return {
        type: 'damage',
        targetId: this.id,
        damage: 0,
        impactPoint,
        impactNormal,
        impactForce,
      };
    }

    this.health -= damage;

    // Calculate damage threshold for current level
    const healthPerLevel = this.config.maxHealth / this.config.fractureLevels;
    const targetLevel = Math.floor((this.config.maxHealth - this.health) / healthPerLevel);

    if (targetLevel > this.currentLevel && targetLevel < this.config.fractureLevels) {
      // Partial fracture
      this.fracture(impactPoint, impactForce, false);
      this.currentLevel = targetLevel;

      return {
        type: 'fracture',
        targetId: this.id,
        damage,
        impactPoint,
        impactNormal,
        impactForce,
        fragments: this.fragments.map(f => f.id),
      };
    }

    if (this.health <= 0) {
      // Complete destruction
      this.destroy(impactPoint, impactForce);

      return {
        type: 'destroy',
        targetId: this.id,
        damage,
        impactPoint,
        impactNormal,
        impactForce,
        fragments: this.fragments.map(f => f.id),
      };
    }

    return {
      type: 'damage',
      targetId: this.id,
      damage,
      impactPoint,
      impactNormal,
      impactForce,
    };
  }

  private fracture(impactPoint: THREE.Vector3, impactForce: number, complete: boolean): void {
    // Get bounding box
    this.mesh.geometry.computeBoundingBox();
    const bounds = this.mesh.geometry.boundingBox!.clone();

    // Transform bounds to world space
    bounds.applyMatrix4(this.mesh.matrixWorld);

    // Generate Voronoi points (biased toward impact)
    const fragmentCount = complete
      ? this.config.fragmentCount
      : Math.ceil(this.config.fragmentCount / 2);

    const points = this.generateBiasedPoints(bounds, impactPoint, fragmentCount);
    const cells = this.fractureGenerator.generateCells(points, bounds);

    // Create fragment meshes
    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const fragmentGeometry = this.fractureGenerator.cellToGeometry(cell);

      // Center geometry
      fragmentGeometry.computeBoundingBox();
      const center = new THREE.Vector3();
      fragmentGeometry.boundingBox!.getCenter(center);
      fragmentGeometry.translate(-center.x, -center.y, -center.z);

      const fragmentMaterial = this.originalMaterial.clone();
      const fragmentMesh = new THREE.Mesh(fragmentGeometry, fragmentMaterial);

      fragmentMesh.position.copy(center);
      fragmentMesh.castShadow = this.mesh.castShadow;
      fragmentMesh.receiveShadow = this.mesh.receiveShadow;

      // Calculate velocity based on impact
      const toFragment = center.clone().sub(impactPoint).normalize();
      const velocityMagnitude = impactForce * (0.5 + Math.random() * 0.5);

      const fragment: FragmentData = {
        id: `${this.id}_frag_${i}`,
        mesh: fragmentMesh,
        velocity: toFragment.multiplyScalar(velocityMagnitude),
        angularVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5,
          (Math.random() - 0.5) * 5
        ),
        mass: 1,
        lifetime: this.config.debrisLifetime,
        spawnTime: Date.now() / 1000,
        active: true,
      };

      this.fragments.push(fragment);
      this.scene.add(fragmentMesh);
    }

    if (complete) {
      // Hide original mesh
      this.mesh.visible = false;
    }
  }

  private generateBiasedPoints(
    bounds: THREE.Box3,
    impactPoint: THREE.Vector3,
    count: number
  ): THREE.Vector3[] {
    const points: THREE.Vector3[] = [];
    const size = new THREE.Vector3();
    bounds.getSize(size);

    // Add impact point
    points.push(impactPoint.clone());

    // Add random points biased toward impact
    for (let i = 1; i < count; i++) {
      const bias = Math.random() < 0.6 ? 0.3 : 1.0; // 60% near impact
      const point = new THREE.Vector3(
        bounds.min.x + Math.random() * size.x,
        bounds.min.y + Math.random() * size.y,
        bounds.min.z + Math.random() * size.z
      );

      // Bias toward impact
      point.lerp(impactPoint, 1 - bias);
      points.push(point);
    }

    return points;
  }

  private destroy(impactPoint: THREE.Vector3, impactForce: number): void {
    this.destroyed = true;
    this.fracture(impactPoint, impactForce, true);

    // Trigger VFX
    if (this.config.enableVFX) {
      this.spawnDestructionVFX(impactPoint);
    }
  }

  private spawnDestructionVFX(position: THREE.Vector3): void {
    // Create dust particles
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = position.x;
      positions[i * 3 + 1] = position.y;
      positions[i * 3 + 2] = position.z;

      velocities[i * 3] = (Math.random() - 0.5) * 5;
      velocities[i * 3 + 1] = Math.random() * 3;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x888888,
      size: 0.5,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    this.scene.add(particles);

    // Store for animation (in real implementation)
    // This would be handled by the particle system
    setTimeout(() => {
      this.scene.remove(particles);
      geometry.dispose();
      material.dispose();
    }, 2000);
  }

  update(deltaTime: number): void {
    const gravity = new THREE.Vector3(0, -9.81, 0);
    const currentTime = Date.now() / 1000;

    for (const fragment of this.fragments) {
      if (!fragment.active) continue;

      // Check lifetime
      const age = currentTime - fragment.spawnTime;
      if (age > fragment.lifetime) {
        this.deactivateFragment(fragment);
        continue;
      }

      // Apply physics
      if (this.config.enablePhysics) {
        // Apply gravity
        fragment.velocity.addScaledVector(gravity, deltaTime);

        // Apply drag
        fragment.velocity.multiplyScalar(0.99);
        fragment.angularVelocity.multiplyScalar(0.98);

        // Update position
        fragment.mesh.position.addScaledVector(fragment.velocity, deltaTime);

        // Update rotation
        fragment.mesh.rotation.x += fragment.angularVelocity.x * deltaTime;
        fragment.mesh.rotation.y += fragment.angularVelocity.y * deltaTime;
        fragment.mesh.rotation.z += fragment.angularVelocity.z * deltaTime;

        // Simple ground collision
        if (fragment.mesh.position.y < 0) {
          fragment.mesh.position.y = 0;
          fragment.velocity.y *= -0.3; // Bounce with energy loss
          fragment.velocity.x *= 0.7;
          fragment.velocity.z *= 0.7;
          fragment.angularVelocity.multiplyScalar(0.5);
        }
      }

      // Fade out near end of lifetime
      const fadeStart = fragment.lifetime * 0.7;
      if (age > fadeStart) {
        const fadeProgress = (age - fadeStart) / (fragment.lifetime - fadeStart);
        const material = fragment.mesh.material as THREE.MeshStandardMaterial;
        if (material.transparent !== true) {
          material.transparent = true;
        }
        material.opacity = 1 - fadeProgress;
      }
    }
  }

  private deactivateFragment(fragment: FragmentData): void {
    fragment.active = false;
    this.scene.remove(fragment.mesh);
    fragment.mesh.geometry.dispose();
    (fragment.mesh.material as THREE.Material).dispose();
  }

  cleanup(): void {
    for (const fragment of this.fragments) {
      if (fragment.active) {
        this.deactivateFragment(fragment);
      }
    }
    this.fragments = [];
  }

  reset(): void {
    this.cleanup();
    this.health = this.config.maxHealth;
    this.currentLevel = 0;
    this.destroyed = false;
    this.mesh.visible = true;
  }

  isDestroyed(): boolean {
    return this.destroyed;
  }

  getHealth(): number {
    return this.health;
  }

  getHealthPercentage(): number {
    return this.health / this.config.maxHealth;
  }

  getMesh(): THREE.Mesh {
    return this.mesh;
  }

  getActiveFragmentCount(): number {
    return this.fragments.filter(f => f.active).length;
  }
}

// ============================================================================
// DESTRUCTION MANAGER
// ============================================================================

export class DestructionManager {
  private destructibles: Map<string, DestructibleObject> = new Map();
  private scene: THREE.Scene;
  private eventListeners: ((event: DestructionEvent) => void)[] = [];

  // Object pooling for debris
  private debrisPool: THREE.Mesh[] = [];
  private maxPoolSize: number = 100;

  // Statistics
  private stats = {
    totalDestructions: 0,
    activeFragments: 0,
    pooledDebris: 0,
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  register(
    id: string,
    mesh: THREE.Mesh,
    config?: Partial<DestructibleConfig>
  ): DestructibleObject {
    const destructible = new DestructibleObject(id, mesh, this.scene, config);
    this.destructibles.set(id, destructible);
    return destructible;
  }

  unregister(id: string): void {
    const destructible = this.destructibles.get(id);
    if (destructible) {
      destructible.cleanup();
      this.destructibles.delete(id);
    }
  }

  applyDamage(
    targetId: string,
    damage: number,
    impactPoint: THREE.Vector3,
    impactNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0),
    impactForce: number = 10
  ): DestructionEvent | null {
    const destructible = this.destructibles.get(targetId);
    if (!destructible) return null;

    const event = destructible.applyDamage(damage, impactPoint, impactNormal, impactForce);

    if (event.type === 'destroy') {
      this.stats.totalDestructions++;
    }

    // Notify listeners
    for (const listener of this.eventListeners) {
      listener(event);
    }

    // Propagate damage to nearby objects
    if (event.type !== 'damage' && destructible.config.impactPropagation > 0) {
      this.propagateDamage(impactPoint, damage * 0.5, destructible.config.impactPropagation, targetId);
    }

    return event;
  }

  private propagateDamage(
    center: THREE.Vector3,
    damage: number,
    radius: number,
    excludeId: string
  ): void {
    for (const [id, destructible] of this.destructibles) {
      if (id === excludeId || destructible.isDestroyed()) continue;

      const position = destructible.getMesh().position;
      const distance = position.distanceTo(center);

      if (distance < radius) {
        const falloff = 1 - (distance / radius);
        const propagatedDamage = damage * falloff;

        if (propagatedDamage > 1) {
          const direction = position.clone().sub(center).normalize();
          destructible.applyDamage(
            propagatedDamage,
            position.clone().sub(direction.multiplyScalar(0.1)),
            direction.negate(),
            propagatedDamage * 0.5
          );
        }
      }
    }
  }

  applyExplosion(
    center: THREE.Vector3,
    damage: number,
    radius: number
  ): DestructionEvent[] {
    const events: DestructionEvent[] = [];

    for (const [id, destructible] of this.destructibles) {
      if (destructible.isDestroyed()) continue;

      const position = destructible.getMesh().position;
      const distance = position.distanceTo(center);

      if (distance < radius) {
        const falloff = 1 - (distance / radius);
        const explosionDamage = damage * falloff;
        const direction = position.clone().sub(center).normalize();

        const event = destructible.applyDamage(
          explosionDamage,
          position.clone().sub(direction.multiplyScalar(0.5)),
          direction.negate(),
          explosionDamage
        );

        events.push(event);
      }
    }

    return events;
  }

  raycastDamage(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    damage: number,
    maxDistance: number = 100
  ): DestructionEvent | null {
    const raycaster = new THREE.Raycaster(origin, direction.normalize(), 0, maxDistance);

    const meshes = Array.from(this.destructibles.values())
      .filter(d => !d.isDestroyed())
      .map(d => d.getMesh());

    const intersects = raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object as THREE.Mesh;

      // Find destructible by mesh
      for (const [id, destructible] of this.destructibles) {
        if (destructible.getMesh() === mesh) {
          return this.applyDamage(
            id,
            damage,
            hit.point,
            hit.face?.normal || direction.clone().negate(),
            damage * 0.5
          );
        }
      }
    }

    return null;
  }

  update(deltaTime: number): void {
    let activeFragments = 0;

    for (const destructible of this.destructibles.values()) {
      destructible.update(deltaTime);
      activeFragments += destructible.getActiveFragmentCount();
    }

    this.stats.activeFragments = activeFragments;
    this.stats.pooledDebris = this.debrisPool.length;
  }

  onDestruction(callback: (event: DestructionEvent) => void): () => void {
    this.eventListeners.push(callback);
    return () => {
      const index = this.eventListeners.indexOf(callback);
      if (index !== -1) this.eventListeners.splice(index, 1);
    };
  }

  // Pool management
  getDebrisFromPool(): THREE.Mesh | null {
    return this.debrisPool.pop() || null;
  }

  returnDebrisToPool(mesh: THREE.Mesh): void {
    if (this.debrisPool.length < this.maxPoolSize) {
      mesh.visible = false;
      this.debrisPool.push(mesh);
    } else {
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose();
    }
  }

  getDestructible(id: string): DestructibleObject | undefined {
    return this.destructibles.get(id);
  }

  getAllDestructibles(): Map<string, DestructibleObject> {
    return new Map(this.destructibles);
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  cleanupAll(): void {
    for (const destructible of this.destructibles.values()) {
      destructible.cleanup();
    }
  }

  resetAll(): void {
    for (const destructible of this.destructibles.values()) {
      destructible.reset();
    }
    this.stats.totalDestructions = 0;
  }

  dispose(): void {
    this.cleanupAll();
    this.destructibles.clear();

    // Dispose pool
    for (const mesh of this.debrisPool) {
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material)?.dispose();
    }
    this.debrisPool = [];
  }
}

// ============================================================================
// PRE-FRACTURED MESH GENERATOR
// ============================================================================

export { PreFracturedMesh } from './destruction-prefractured';

// ============================================================================
// EXPORTS
// ============================================================================

export { createDestructionManager, getDestructionManager } from './destruction-manager-singleton';
