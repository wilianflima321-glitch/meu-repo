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
import { applyExplosionDamage, propagateDestructionDamage } from './destruction-damage-runtime';
import { createDestructibleConfig } from './destruction-defaults';
import { createDestructionFragments } from './destruction-fragment-factory';
import {
  deactivateDestructionFragment,
  DestructionFragmentRapierSession,
  evaluateFragmentPhysicsHonesty,
  spawnDestructionDust,
  stepFragmentRapierWorld,
  updateDestructionFragment,
} from './destruction-fragment-runtime';
export {
  DestructionFragmentRapierSession,
  evaluateFragmentPhysicsHonesty,
  FRAGMENT_PHYSICS_SHIP_STATUS,
} from './destruction-fragment-runtime';
export { FRACTURE_GEOMETRY_SHIP_STATUS } from './destruction-fracture-generator';

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
  private rapierSession: DestructionFragmentRapierSession | null;

  constructor(
    id: string,
    mesh: THREE.Mesh,
    scene: THREE.Scene,
    config: Partial<DestructibleConfig> = {},
    rapierSession: DestructionFragmentRapierSession | null = null,
  ) {
    this.id = id;
    this.mesh = mesh;
    this.scene = scene;
    this.rapierSession = rapierSession;
    this.originalGeometry = mesh.geometry.clone();
    this.originalMaterial = mesh.material as THREE.Material;

    this.config = createDestructibleConfig(config);

    this.health = this.config.maxHealth;
    this.fractureGenerator = new VoronoiFractureGenerator(Math.random() * 99999);
  }

  setRapierSession(session: DestructionFragmentRapierSession | null): void {
    this.rapierSession = session;
  }

  getFragmentPhysicsHonesty() {
    return evaluateFragmentPhysicsHonesty(this.rapierSession?.isReady === true);
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
    const fragments = createDestructionFragments({
      id: this.id,
      mesh: this.mesh,
      material: this.originalMaterial,
      config: this.config,
      impactPoint,
      impactForce,
      complete,
      fractureGenerator: this.fractureGenerator,
    });

    for (const fragment of fragments) {
      this.fragments.push(fragment);
      this.scene.add(fragment.mesh);
    }

    if (complete) {
      // Hide original mesh
      this.mesh.visible = false;
    }
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
    spawnDestructionDust(this.scene, position);
  }

  update(deltaTime: number): void {
    const currentTime = Date.now() / 1000;
    stepFragmentRapierWorld(this.rapierSession, deltaTime);

    for (const fragment of this.fragments) {
      updateDestructionFragment({
        fragment,
        deltaTime,
        enablePhysics: this.config.enablePhysics,
        currentTime,
        deactivate: (targetFragment) => this.deactivateFragment(targetFragment),
        rapierSession: this.rapierSession,
      });
    }
  }

  private deactivateFragment(fragment: FragmentData): void {
    deactivateDestructionFragment({
      fragment,
      scene: this.scene,
      rapierSession: this.rapierSession,
    });
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
  private rapierSession: DestructionFragmentRapierSession | null = null;

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

  /** Attach Rapier before claiming production fragment physics. */
  async enableRapierFragmentPhysics(): Promise<boolean> {
    const session = new DestructionFragmentRapierSession();
    const ok = await session.attach();
    if (!ok) {
      this.rapierSession = null;
      return false;
    }
    this.rapierSession = session;
    for (const d of this.destructibles.values()) {
      d.setRapierSession(session);
    }
    return true;
  }

  getFragmentPhysicsHonesty() {
    return evaluateFragmentPhysicsHonesty(this.rapierSession?.isReady === true);
  }

  register(
    id: string,
    mesh: THREE.Mesh,
    config?: Partial<DestructibleConfig>
  ): DestructibleObject {
    const destructible = new DestructibleObject(
      id,
      mesh,
      this.scene,
      config,
      this.rapierSession,
    );
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
    propagateDestructionDamage({
      destructibles: this.destructibles,
      center,
      damage,
      radius,
      excludeId,
    });
  }

  applyExplosion(
    center: THREE.Vector3,
    damage: number,
    radius: number
  ): DestructionEvent[] {
    return applyExplosionDamage({
      destructibles: this.destructibles,
      center,
      damage,
      radius,
    });
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
