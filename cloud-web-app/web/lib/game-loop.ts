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

  constructor(canvas: HTMLCanvasElement) {
    this.world = new World();
    
    // Initialize Systems
    this.renderer = new AAARenderer(canvas, window.innerWidth, window.innerHeight);
    this.physicsWorld = new PhysicsWorld(); 
    this.physicsSystem = new PhysicsIntegrationSystem(this.physicsWorld);
    this.renderSystem = new RenderSystem(this.world, this.renderer);
    this.visualScriptSystem = new VisualScriptSystem(this.renderer.scene);
    this.visualScriptSystem.setWorld(this.world);
    
    // Auto-resize
    window.addEventListener('resize', () => {
        this.renderer.resize(window.innerWidth, window.innerHeight);
    });
  }

  async init() {
     await initPhysicsEngine();
     // Initialize physics world after WASM load
     this.physicsWorld.init(new THREE.Vector3(0, -9.81, 0));
     
     // Scan existing entities to create bodies (if initialized late)
     this.world.getAllEntities().forEach(e => {
         this.physicsSystem.registerEntity(e, this.world);
     });

     console.log("🚀 Game Loop Initialized (WASM Physics Ready)");
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.frameId);
  }

  private tick = () => {
    if (!this.isRunning) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1);
    this.lastTime = now;

    // 1. Logic Update (ECS Systems)
    this.world.update(dt);
    
    // 2. Visual Script Update
    const scriptEntities = this.world.getAllEntities().filter(
      e => this.world.getComponent(e.id, 'visualScript')
    );
    this.visualScriptSystem.update(scriptEntities, dt);
    
    // 3. Physics Step
    // Register new bodies if needed - checking every frame is slow, 
    // ideally World emits events we listen to.
    this.physicsWorld.step(dt);
    this.physicsSystem.syncTransformsFromPhysics(this.world);

    // 4. Sequencer
    if (this.sequencer) {
        this.sequencer.update(dt, {
            camera: this.renderer.camera,
            scene: this.renderer.scene
        });
    }

    // 5. Render Setup
    this.renderSystem.update();
    
    // 6. Draw
    this.renderer.render(dt);

    this.frameId = requestAnimationFrame(this.tick);
  }

  // Legacy/Unused
  private syncPhysicsToTransform() {} 
}
