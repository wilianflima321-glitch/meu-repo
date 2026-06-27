// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import { AAARenderer } from './aaa-renderer-impl';
import { PhysicsWorld, PhysicsBody, initPhysicsEngine, RigidBodyConfig, ColliderConfig } from './physics-engine-real';
import { SequencerRuntime } from './sequencer-runtime';
import { RenderSystem } from './render-system';
import { VisualScriptSystem, getInputManager } from './visual-script-integration';
import {
  World,
  Entity,
  System,
  TransformComponent,
  RigidbodyComponent,
  ColliderComponent,
  EntityId
} from './game-engine-core';
import * as THREE from 'three';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('game-loop')

export interface GameLoopConfig {
  physicsEnabled: boolean;
  sequencerEnabled: boolean;
  renderEnabled: boolean;
}

// ============================================================================
// SYSTEM: PHYSICS INTEGRATION
// Connects ECS Data (RigidbodyComponent) <-> Physics Engine (Rapier)
// ============================================================================
class PhysicsIntegrationSystem implements System {
  name = 'PhysicsIntegration';
  requiredComponents = ['transform', 'rigidbody'];
  priority = 100; // Run early to apply physics results to transforms

  private bodyMap: Map<EntityId, PhysicsBody> = new Map();

  constructor(private physicsWorld: PhysicsWorld) {}

  onEntityAdded(entity: Entity) {
     // Registration will happen via registerEntity with World context
  }

  onEntityRemoved(entity: Entity) {
    this.bodyMap.delete(entity.id);
  }

  update(entities: Entity[], _dt: number) {
    // 2. Sync Physics -> Transform (Dynamic)
    for (const entity of entities) {
      const body = this.bodyMap.get(entity.id);
      if (!body) {
        // Body not yet registered, will be handled by registerEntity
        continue;
      }

      // If dynamic, physics drives the visual transform
      if (body.rawBody.isDynamic()) {
        const position = body.position; // Use getter instead of getPosition()
        const rotation = body.rotation; // Use getter instead of getRotation()

        // We need to write back to the "entity" object's component reference
        // Note: The entity passed here is just the ID wrapper in the current definition,
        // effectively we can't easily set component data without World reference or Components attached.
        // Assuming we rely on syncTransformsFromPhysics(world) instead which is cleaner.
      }
    }
  }

  // Called by GameLoop explicitly to sync positions after physics step
  syncTransformsFromPhysics(world: World) {
      this.bodyMap.forEach((body, entityId) => {
          if (!body.rawBody.isDynamic()) return;

          const transform = world.getComponent<TransformComponent>(entityId, 'transform');
          if (transform) {
              const pos = body.position; // Use getter
              const rot = body.rotation; // Use getter

              transform.position.set(pos.x, pos.y, pos.z);
              transform.rotation.setFromQuaternion(rot);
          }
      });
  }

  // New method to handle registration with full World access
  registerEntity(entity: Entity, world: World) {
      if (this.bodyMap.has(entity.id)) return;

      const rb = world.getComponent<RigidbodyComponent>(entity.id, 'rigidbody');
      const transform = world.getComponent<TransformComponent>(entity.id, 'transform');

      if (!rb || !transform) return;

      const bodyConfig: RigidBodyConfig = {
          type: rb.isKinematic ? 'kinematic' : 'dynamic',
          position: transform.position,
          rotation: new THREE.Quaternion().setFromEuler(transform.rotation),
          mass: rb.mass,
          linearDamping: rb.drag,
          angularDamping: rb.angularDrag,
          ccdEnabled: false
      };

      if (!rb.useGravity) bodyConfig.gravityScale = 0;

      const body = this.physicsWorld.createBody(bodyConfig);
      this.bodyMap.set(entity.id, body);

      // Check for Collider
      const collider = world.getComponent<ColliderComponent>(entity.id, 'collider');
      if (collider) {
          const colliderConfig: ColliderConfig = {
              shape: collider.shape as any,
              halfExtents: collider.shape === 'box' ? collider.size.clone().multiplyScalar(0.5) : undefined,
              radius: collider.shape === 'sphere' ? collider.size.x : undefined,
              height: collider.shape === 'capsule' ? collider.size.y : undefined,
              material: {
                  friction: collider.physicMaterial?.friction ?? 0.5,
                  restitution: collider.physicMaterial?.bounciness ?? 0.5,
                  density: 1.0,
                  frictionCombine: 'average',
                  restitutionCombine: 'average'
              }
          };

          // Use PhysicsWorld.addCollider instead of body.addCollider
          this.physicsWorld.addCollider(body.id, colliderConfig);
      }
  }
}

// ============================================================================
// FRAME BUDGET CONSTANTS
// Target: 60fps = 16.67ms per frame. Physics + Logic must finish in <= 10ms.
// Anything above threshold is deferred to the next frame or a background job.
// ============================================================================
const FIXED_TIMESTEP = 1 / 60;         // seconds per physics tick
const MAX_ACCUMULATOR = 0.2;           // cap at 4 missed frames to avoid spiral
const FRAME_BUDGET_MS = 10;            // ms budget for non-render work

export class GameLoop {
  public world: World;
  private renderer: AAARenderer;
  private physicsWorld: PhysicsWorld;
  private sequencer: SequencerRuntime | null = null;
  private physicsSystem: PhysicsIntegrationSystem;
  private renderSystem: RenderSystem;
  private visualScriptSystem: VisualScriptSystem;

  private isRunning: boolean = false;
  private lastTime: number = 0;
  private frameId: number = 0;

  // Fixed-timestep accumulator: absorbs variable wall-clock deltas
  private accumulator: number = 0;

  // Frame stats exposed to the frame-budget system
  public lastLogicMs: number = 0;
  public lastPhysicsMs: number = 0;
  public lastRenderMs: number = 0;
  public lastFrameMs: number = 0;

  // Deferred heavy-work queue: tasks pushed here run when budget allows
  private deferredTasks: Array<() => void> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.world = new World();

    this.renderer = new AAARenderer(canvas, window.innerWidth, window.innerHeight);
    this.physicsWorld = new PhysicsWorld();
    this.physicsSystem = new PhysicsIntegrationSystem(this.physicsWorld);
    this.renderSystem = new RenderSystem(this.world, this.renderer);
    this.visualScriptSystem = new VisualScriptSystem(this.renderer.scene);
    this.visualScriptSystem.setWorld(this.world);

    window.addEventListener('resize', () => {
      this.renderer.resize(window.innerWidth, window.innerHeight);
    });
  }

  async init() {
    await initPhysicsEngine();
    this.physicsWorld.init(new THREE.Vector3(0, -9.81, 0));
    this.world.getAllEntities().forEach(e => {
      this.physicsSystem.registerEntity(e, this.world);
    });
    log.info('Game Loop Initialized (fixed-timestep physics ready)');
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.frameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
  }

  /** Schedule a heavy task (LOD update, AI pathing, etc.) to run when frame budget allows. */
  scheduleDeferred(task: () => void): void {
    this.deferredTasks.push(task);
  }

  private tick = (timestamp: number) => {
    if (!this.isRunning) return;

    const frameStart = performance.now();
    const wallDelta = Math.min((timestamp - this.lastTime) / 1000, MAX_ACCUMULATOR);
    this.lastTime = timestamp;
    this.lastFrameMs = wallDelta * 1000;

    // ── 1. ECS Logic (variable dt, capped) ───────────────────────────────────
    const logicStart = performance.now();
    this.world.update(wallDelta);
    const scriptEntities = this.world.getAllEntities().filter(
      e => this.world.getComponent(e.id, 'visualScript'),
    );
    this.visualScriptSystem.update(scriptEntities, wallDelta);
    this.lastLogicMs = performance.now() - logicStart;

    // ── 2. Fixed-timestep Physics Catchup ────────────────────────────────────
    const physStart = performance.now();
    this.accumulator += wallDelta;
    while (this.accumulator >= FIXED_TIMESTEP) {
      this.physicsWorld.step(FIXED_TIMESTEP);
      this.accumulator -= FIXED_TIMESTEP;
    }
    this.physicsSystem.syncTransformsFromPhysics(this.world);
    this.lastPhysicsMs = performance.now() - physStart;

    // ── 3. Sequencer ─────────────────────────────────────────────────────────
    if (this.sequencer) {
      this.sequencer.update(wallDelta, {
        camera: this.renderer.camera,
        scene: this.renderer.scene,
      });
    }

    // ── 4. Deferred heavy tasks (run while we still have budget) ─────────────
    const budgetDeadline = frameStart + FRAME_BUDGET_MS;
    while (this.deferredTasks.length > 0 && performance.now() < budgetDeadline) {
      const task = this.deferredTasks.shift();
      task?.();
    }

    // ── 5. Render ─────────────────────────────────────────────────────────────
    const renderStart = performance.now();
    this.renderSystem.update();
    this.renderer.render(wallDelta);
    this.lastRenderMs = performance.now() - renderStart;

    this.frameId = requestAnimationFrame(this.tick);
  };
}
