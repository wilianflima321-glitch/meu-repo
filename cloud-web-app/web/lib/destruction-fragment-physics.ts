// @aethel-heavy-async-boundary Three.js + Rapier fragment physics; never import from public route shells.
/**
 * DEST-001 fragment physics honesty + Rapier wire.
 * JS translate is preview-only and must never claim production physics.
 */
import * as THREE from 'three';
import type { FragmentData } from './destruction-contracts';
import {
  initPhysicsEngine,
  PhysicsWorld,
  type PhysicsBody,
} from './physics-engine-real';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('destruction-fragment-physics');

/** Production fragment physics requires a live Rapier world. */
export const FRAGMENT_PHYSICS_SHIP_STATUS = {
  rapier: 'SHIPPED' as const,
  jsPreview: 'HELD' as const,
  labelHeld: 'Fragment physics [HELD] — JS translate is preview only, not production',
  labelRapier: 'Fragment physics via Rapier WASM',
} as const;

export type FragmentPhysicsBackend = 'rapier' | 'held_js_preview';

export function evaluateFragmentPhysicsHonesty(hasRapierWorld: boolean): {
  backend: FragmentPhysicsBackend;
  shipStatus: 'SHIPPED' | 'HELD';
  badge: string;
  canClaimProductionPhysics: boolean;
} {
  if (hasRapierWorld) {
    return {
      backend: 'rapier',
      shipStatus: FRAGMENT_PHYSICS_SHIP_STATUS.rapier,
      badge: FRAGMENT_PHYSICS_SHIP_STATUS.labelRapier,
      canClaimProductionPhysics: true,
    };
  }
  return {
    backend: 'held_js_preview',
    shipStatus: FRAGMENT_PHYSICS_SHIP_STATUS.jsPreview,
    badge: FRAGMENT_PHYSICS_SHIP_STATUS.labelHeld,
    canClaimProductionPhysics: false,
  };
}

/**
 * Optional Rapier session for destruction fragments.
 * Call `await attach()` after `initPhysicsEngine()` before claiming production physics.
 */
export class DestructionFragmentRapierSession {
  private world: PhysicsWorld | null = null;
  private bodies = new Map<string, PhysicsBody>();
  private groundReady = false;

  get isReady(): boolean {
    return this.world?.rawWorld != null;
  }

  async attach(gravity = new THREE.Vector3(0, -9.81, 0)): Promise<boolean> {
    try {
      await initPhysicsEngine();
      this.world = new PhysicsWorld(gravity);
      if (!this.world.rawWorld) {
        this.world.init(gravity);
      }
      this.ensureGround();
      log.info('destruction_fragment_rapier_attached', { ready: this.isReady });
      return this.isReady;
    } catch (err) {
      log.warn('destruction_fragment_rapier_attach_failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      this.world = null;
      return false;
    }
  }

  private ensureGround(): void {
    if (!this.world || this.groundReady) return;
    const ground = this.world.createBody({
      type: 'static',
      position: new THREE.Vector3(0, -0.05, 0),
      rotation: new THREE.Quaternion(),
    });
    this.world.addCollider(ground.id, {
      shape: 'box',
      halfExtents: new THREE.Vector3(50, 0.05, 50),
      material: {
        friction: 0.7,
        restitution: 0.15,
        density: 1,
        frictionCombine: 'average',
        restitutionCombine: 'average',
      },
    });
    this.groundReady = true;
  }

  spawnFragment(fragment: FragmentData): void {
    if (!this.world?.rawWorld) return;
    if (this.bodies.has(fragment.id)) return;

    fragment.mesh.geometry.computeBoundingBox();
    const box = fragment.mesh.geometry.boundingBox;
    const size = new THREE.Vector3(0.2, 0.2, 0.2);
    if (box) box.getSize(size);
    const half = size.multiplyScalar(0.5).max(new THREE.Vector3(0.05, 0.05, 0.05));

    const body = this.world.createBody({
      type: 'dynamic',
      position: fragment.mesh.position.clone(),
      rotation: fragment.mesh.quaternion.clone(),
      linearVelocity: fragment.velocity.clone(),
      angularVelocity: fragment.angularVelocity.clone(),
      linearDamping: 0.05,
      angularDamping: 0.08,
      ccdEnabled: true,
    });
    this.world.addCollider(body.id, {
      shape: 'box',
      halfExtents: half,
      material: {
        friction: 0.55,
        restitution: 0.2,
        density: Math.max(0.2, fragment.mass),
        frictionCombine: 'average',
        restitutionCombine: 'average',
      },
    });
    this.bodies.set(fragment.id, body);
  }

  step(deltaTime: number): void {
    this.world?.step(deltaTime);
  }

  syncMesh(fragment: FragmentData): void {
    const body = this.bodies.get(fragment.id);
    if (!body) return;
    fragment.mesh.position.copy(body.position);
    fragment.mesh.quaternion.copy(body.rotation);
    fragment.velocity.copy(body.linearVelocity);
    fragment.angularVelocity.copy(body.angularVelocity);
  }

  removeFragment(fragmentId: string): void {
    const body = this.bodies.get(fragmentId);
    if (!body || !this.world) return;
    this.world.removeBody(body.id);
    this.bodies.delete(fragmentId);
  }

  dispose(): void {
    for (const id of [...this.bodies.keys()]) {
      this.removeFragment(id);
    }
    this.world = null;
    this.groundReady = false;
  }
}
