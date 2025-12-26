/// <reference path="../types/rapier3d.d.ts" />
import { injectable } from 'inversify';
import { Emitter, Event } from '@theia/core/lib/common';

// ============================================================================
// AETHEL PHYSICS ENGINE - Rapier.js Integration
// Production-ready 3D physics simulation
// ============================================================================

/**
 * Vector3 type
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Quaternion type
 */
export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

/**
 * Transform containing position and rotation
 */
export interface Transform {
  position: Vector3;
  rotation: Quaternion;
}

/**
 * Rigid body types
 */
export type RigidBodyType = 'dynamic' | 'static' | 'kinematic-position' | 'kinematic-velocity';

/**
 * Collider shapes
 */
export type ColliderShape = 
  | 'box'
  | 'sphere'
  | 'capsule'
  | 'cylinder'
  | 'cone'
  | 'convex-hull'
  | 'trimesh'
  | 'heightfield';

/**
 * Collision group for filtering
 */
export interface CollisionGroups {
  memberships: number;
  filter: number;
}

/**
 * Rigid body descriptor
 */
export interface RigidBodyDescriptor {
  type: RigidBodyType;
  position: Vector3;
  rotation?: Quaternion;
  linearVelocity?: Vector3;
  angularVelocity?: Vector3;
  gravityScale?: number;
  linearDamping?: number;
  angularDamping?: number;
  canSleep?: boolean;
  ccd?: boolean;  // Continuous collision detection
  userData?: unknown;
}

/**
 * Collider descriptor
 */
export interface ColliderDescriptor {
  shape: ColliderShape;
  // Shape-specific dimensions
  halfExtents?: Vector3;  // For box
  radius?: number;        // For sphere, capsule, cylinder, cone
  halfHeight?: number;    // For capsule, cylinder, cone
  vertices?: Float32Array;  // For convex hull, trimesh
  indices?: Uint32Array;    // For trimesh
  heights?: Float32Array;   // For heightfield
  rows?: number;           // For heightfield
  cols?: number;           // For heightfield
  // Physics properties
  density?: number;
  friction?: number;
  restitution?: number;
  isSensor?: boolean;
  collisionGroups?: CollisionGroups;
  offset?: Vector3;
  rotation?: Quaternion;
  userData?: unknown;
}

/**
 * Rigid body handle
 */
export interface RigidBodyHandle {
  id: number;
  entityId: string;
}

/**
 * Collider handle
 */
export interface ColliderHandle {
  id: number;
  bodyId: number;
  entityId: string;
}

/**
 * Raycast hit result
 */
export interface RaycastHit {
  point: Vector3;
  normal: Vector3;
  distance: number;
  colliderId: number;
  entityId: string;
}

/**
 * Contact point between colliders
 */
export interface ContactPoint {
  point: Vector3;
  normal: Vector3;
  penetration: number;
}

/**
 * Collision event
 */
export interface CollisionEvent {
  type: 'start' | 'end';
  collider1: ColliderHandle;
  collider2: ColliderHandle;
  contacts?: ContactPoint[];
}

/**
 * Character controller descriptor
 */
export interface CharacterControllerDescriptor {
  offset: number;
  stepHeight: number;
  maxSlopeAngle: number;
  minSlopeAngle?: number;
  snapToGround?: number;
  autostep?: {
    maxHeight: number;
    minWidth: number;
    includeDynamic: boolean;
  };
}

/**
 * Joint types
 */
export type JointType = 
  | 'fixed'
  | 'revolute'
  | 'prismatic'
  | 'spherical'
  | 'rope'
  | 'spring';

/**
 * Joint descriptor
 */
export interface JointDescriptor {
  type: JointType;
  body1: RigidBodyHandle;
  body2: RigidBodyHandle;
  anchor1?: Vector3;
  anchor2?: Vector3;
  axis?: Vector3;
  limits?: { min: number; max: number };
  motor?: { targetVelocity: number; maxForce: number };
  stiffness?: number;
  damping?: number;
}

/**
 * Physics world configuration
 */
export interface PhysicsWorldConfig {
  gravity: Vector3;
  timestep: number;
  substeps: number;
  maxVelocityIterations: number;
  maxPositionIterations: number;
  predictionDistance: number;
  sleepEnabled: boolean;
}

/**
 * Physics debug renderer options
 */
export interface PhysicsDebugOptions {
  renderColliders: boolean;
  renderContacts: boolean;
  renderJoints: boolean;
  renderVelocities: boolean;
  renderAABBs: boolean;
}

/**
 * Physics Engine - Rapier.js Integration
 */
@injectable()
export class PhysicsEngine {
  private world: RapierWorld | null = null;
  private rapier: typeof RapierModule | null = null;
  private initialized = false;

  private readonly bodies = new Map<number, RigidBodyHandle>();
  private readonly colliders = new Map<number, ColliderHandle>();
  private readonly joints = new Map<number, JointHandle>();
  private readonly entityBodies = new Map<string, number>();
  private readonly controllers = new Map<string, CharacterController>();

  private config: PhysicsWorldConfig = {
    gravity: { x: 0, y: -9.81, z: 0 },
    timestep: 1 / 60,
    substeps: 1,
    maxVelocityIterations: 4,
    maxPositionIterations: 1,
    predictionDistance: 0.002,
    sleepEnabled: true,
  };

  private accumulator = 0;
  private debugOptions: PhysicsDebugOptions = {
    renderColliders: false,
    renderContacts: false,
    renderJoints: false,
    renderVelocities: false,
    renderAABBs: false,
  };

  // Events
  private readonly onCollisionStartEmitter = new Emitter<CollisionEvent>();
  private readonly onCollisionEndEmitter = new Emitter<CollisionEvent>();
  private readonly onBodyCreatedEmitter = new Emitter<RigidBodyHandle>();
  private readonly onBodyRemovedEmitter = new Emitter<number>();
  private readonly onStepEmitter = new Emitter<number>();

  readonly onCollisionStart: Event<CollisionEvent> = this.onCollisionStartEmitter.event;
  readonly onCollisionEnd: Event<CollisionEvent> = this.onCollisionEndEmitter.event;
  readonly onBodyCreated: Event<RigidBodyHandle> = this.onBodyCreatedEmitter.event;
  readonly onBodyRemoved: Event<number> = this.onBodyRemovedEmitter.event;
  readonly onStep: Event<number> = this.onStepEmitter.event;

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  /**
   * Initialize the physics engine
   */
  async initialize(config?: Partial<PhysicsWorldConfig>): Promise<void> {
    if (this.initialized) return;

    // Import Rapier (dynamic import for WASM)
    try {
      this.rapier = await import('@dimforge/rapier3d');
      await this.rapier.init();
    } catch (error) {
      // Fallback to basic physics simulation if Rapier not available
      console.warn('Rapier not available, using fallback physics');
      this.initializeFallback();
      return;
    }

    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Create physics world
    const gravity = { 
      x: this.config.gravity.x,
      y: this.config.gravity.y,
      z: this.config.gravity.z
    };

    this.world = new this.rapier.World(gravity);
    if (this.world) {
      (this.world as any).timestep = this.config.timestep;
      (this.world as any).numSolverIterations = this.config.maxVelocityIterations;
    }

    this.initialized = true;
  }

  /**
   * Initialize fallback physics (basic simulation without Rapier)
   */
  private initializeFallback(): void {
    this.world = new FallbackPhysicsWorld(this.config);
    this.initialized = true;
  }

  /**
   * Check if engine is ready
   */
  isReady(): boolean {
    return this.initialized && this.world !== null;
  }

  /**
   * Dispose the physics engine
   */
  dispose(): void {
    if (this.world) {
      this.world.free?.();
      this.world = null;
    }
    this.bodies.clear();
    this.colliders.clear();
    this.joints.clear();
    this.entityBodies.clear();
    this.controllers.clear();
    this.initialized = false;
  }

  // ========================================================================
  // SIMULATION
  // ========================================================================

  /**
   * Step the physics simulation
   */
  step(deltaTime: number): void {
    if (!this.world) return;

    // Fixed timestep with accumulator
    this.accumulator += deltaTime;

    while (this.accumulator >= this.config.timestep) {
      this.world.step();
      this.accumulator -= this.config.timestep;
      this.processCollisionEvents();
    }

    this.onStepEmitter.fire(deltaTime);
  }

  /**
   * Process collision events from the physics world
   */
  private processCollisionEvents(): void {
    if (!this.world || !this.rapier) return;

    // Get event queue
    const eventQueue = this.world.eventQueue;
    if (!eventQueue) return;

    eventQueue.drainCollisionEvents((handle1: number, handle2: number, started: boolean) => {
      const collider1 = this.colliders.get(handle1);
      const collider2 = this.colliders.get(handle2);

      if (collider1 && collider2) {
        const event: CollisionEvent = {
          type: started ? 'start' : 'end',
          collider1,
          collider2,
        };

        if (started) {
          this.onCollisionStartEmitter.fire(event);
        } else {
          this.onCollisionEndEmitter.fire(event);
        }
      }
    });
  }

  // ========================================================================
  // RIGID BODY MANAGEMENT
  // ========================================================================

  /**
   * Create a rigid body
   */
  createRigidBody(entityId: string, descriptor: RigidBodyDescriptor): RigidBodyHandle | null {
    if (!this.world || !this.rapier) return null;

    // Create body descriptor
    let bodyDesc: RapierRigidBodyDesc;
    
    switch (descriptor.type) {
      case 'dynamic':
        bodyDesc = this.rapier.RigidBodyDesc.dynamic();
        break;
      case 'static':
        bodyDesc = this.rapier.RigidBodyDesc.fixed();
        break;
      case 'kinematic-position':
        bodyDesc = this.rapier.RigidBodyDesc.kinematicPositionBased();
        break;
      case 'kinematic-velocity':
        bodyDesc = this.rapier.RigidBodyDesc.kinematicVelocityBased();
        break;
      default:
        bodyDesc = this.rapier.RigidBodyDesc.dynamic();
    }

    // Set position
    bodyDesc.setTranslation(descriptor.position.x, descriptor.position.y, descriptor.position.z);

    // Set rotation
    if (descriptor.rotation) {
      bodyDesc.setRotation({
        x: descriptor.rotation.x,
        y: descriptor.rotation.y,
        z: descriptor.rotation.z,
        w: descriptor.rotation.w,
      });
    }

    // Set velocities
    if (descriptor.linearVelocity) {
      bodyDesc.setLinvel(
        descriptor.linearVelocity.x,
        descriptor.linearVelocity.y,
        descriptor.linearVelocity.z
      );
    }

    if (descriptor.angularVelocity) {
      bodyDesc.setAngvel({
        x: descriptor.angularVelocity.x,
        y: descriptor.angularVelocity.y,
        z: descriptor.angularVelocity.z,
      });
    }

    // Set other properties
    if (descriptor.gravityScale !== undefined) {
      bodyDesc.setGravityScale(descriptor.gravityScale);
    }

    if (descriptor.linearDamping !== undefined) {
      bodyDesc.setLinearDamping(descriptor.linearDamping);
    }

    if (descriptor.angularDamping !== undefined) {
      bodyDesc.setAngularDamping(descriptor.angularDamping);
    }

    if (descriptor.canSleep !== undefined) {
      bodyDesc.setCanSleep(descriptor.canSleep);
    }

    if (descriptor.ccd) {
      bodyDesc.setCcdEnabled(true);
    }

    // Create body
    const body = this.world.createRigidBody(bodyDesc);
    const handle: RigidBodyHandle = {
      id: body.handle,
      entityId,
    };

    this.bodies.set(body.handle, handle);
    this.entityBodies.set(entityId, body.handle);

    this.onBodyCreatedEmitter.fire(handle);
    return handle;
  }

  /**
   * Remove a rigid body
   */
  removeRigidBody(handle: RigidBodyHandle): void {
    if (!this.world) return;

    const body = this.world.getRigidBody(handle.id);
    if (body) {
      this.world.removeRigidBody(body);
    }

    this.bodies.delete(handle.id);
    this.entityBodies.delete(handle.entityId);
    this.onBodyRemovedEmitter.fire(handle.id);
  }

  /**
   * Get rigid body by entity ID
   */
  getRigidBodyByEntity(entityId: string): RigidBodyHandle | undefined {
    const bodyId = this.entityBodies.get(entityId);
    return bodyId !== undefined ? this.bodies.get(bodyId) : undefined;
  }

  /**
   * Get rigid body transform
   */
  getBodyTransform(handle: RigidBodyHandle): Transform | null {
    if (!this.world) return null;

    const body = this.world.getRigidBody(handle.id);
    if (!body) return null;

    const position = body.translation();
    const rotation = body.rotation();

    return {
      position: { x: position.x, y: position.y, z: position.z },
      rotation: { x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w },
    };
  }

  /**
   * Set rigid body transform
   */
  setBodyTransform(handle: RigidBodyHandle, transform: Partial<Transform>): void {
    if (!this.world) return;

    const body = this.world.getRigidBody(handle.id);
    if (!body) return;

    if (transform.position) {
      body.setTranslation(
        { x: transform.position.x, y: transform.position.y, z: transform.position.z },
        true
      );
    }

    if (transform.rotation) {
      body.setRotation(transform.rotation, true);
    }
  }

  /**
   * Apply force to body
   */
  applyForce(handle: RigidBodyHandle, force: Vector3, wakeUp = true): void {
    if (!this.world) return;

    const body = this.world.getRigidBody(handle.id);
    if (!body) return;

    body.addForce({ x: force.x, y: force.y, z: force.z }, wakeUp);
  }

  /**
   * Apply impulse to body
   */
  applyImpulse(handle: RigidBodyHandle, impulse: Vector3, wakeUp = true): void {
    if (!this.world) return;

    const body = this.world.getRigidBody(handle.id);
    if (!body) return;

    body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, wakeUp);
  }

  /**
   * Apply torque to body
   */
  applyTorque(handle: RigidBodyHandle, torque: Vector3, wakeUp = true): void {
    if (!this.world) return;

    const body = this.world.getRigidBody(handle.id);
    if (!body) return;

    body.addTorque({ x: torque.x, y: torque.y, z: torque.z }, wakeUp);
  }

  /**
   * Set linear velocity
   */
  setLinearVelocity(handle: RigidBodyHandle, velocity: Vector3): void {
    if (!this.world) return;

    const body = this.world.getRigidBody(handle.id);
    if (!body) return;

    body.setLinvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }

  /**
   * Get linear velocity
   */
  getLinearVelocity(handle: RigidBodyHandle): Vector3 | null {
    if (!this.world) return null;

    const body = this.world.getRigidBody(handle.id);
    if (!body) return null;

    const vel = body.linvel();
    return { x: vel.x, y: vel.y, z: vel.z };
  }

  /**
   * Set angular velocity
   */
  setAngularVelocity(handle: RigidBodyHandle, velocity: Vector3): void {
    if (!this.world) return;

    const body = this.world.getRigidBody(handle.id);
    if (!body) return;

    body.setAngvel({ x: velocity.x, y: velocity.y, z: velocity.z }, true);
  }

  // ========================================================================
  // COLLIDER MANAGEMENT
  // ========================================================================

  /**
   * Create a collider and attach to body
   */
  createCollider(
    entityId: string,
    bodyHandle: RigidBodyHandle,
    descriptor: ColliderDescriptor
  ): ColliderHandle | null {
    if (!this.world || !this.rapier) return null;

    const body = this.world.getRigidBody(bodyHandle.id);
    if (!body) return null;

    // Create collider shape
    let colliderDesc: RapierColliderDesc;

    switch (descriptor.shape) {
      case 'box':
        colliderDesc = this.rapier.ColliderDesc.cuboid(
          descriptor.halfExtents?.x || 0.5,
          descriptor.halfExtents?.y || 0.5,
          descriptor.halfExtents?.z || 0.5
        );
        break;

      case 'sphere':
        colliderDesc = this.rapier.ColliderDesc.ball(descriptor.radius || 0.5);
        break;

      case 'capsule':
        colliderDesc = this.rapier.ColliderDesc.capsule(
          descriptor.halfHeight || 0.5,
          descriptor.radius || 0.25
        );
        break;

      case 'cylinder':
        colliderDesc = this.rapier.ColliderDesc.cylinder(
          descriptor.halfHeight || 0.5,
          descriptor.radius || 0.5
        );
        break;

      case 'cone':
        colliderDesc = this.rapier.ColliderDesc.cone(
          descriptor.halfHeight || 0.5,
          descriptor.radius || 0.5
        );
        break;

      case 'convex-hull':
        if (!descriptor.vertices) {
          return null;
        }
        colliderDesc = this.rapier.ColliderDesc.convexHull(descriptor.vertices);
        if (!colliderDesc) return null;
        break;

      case 'trimesh':
        if (!descriptor.vertices || !descriptor.indices) {
          return null;
        }
        colliderDesc = this.rapier.ColliderDesc.trimesh(
          descriptor.vertices,
          descriptor.indices
        );
        break;

      case 'heightfield':
        if (!descriptor.heights || !descriptor.rows || !descriptor.cols) {
          return null;
        }
        colliderDesc = this.rapier.ColliderDesc.heightfield(
          descriptor.rows,
          descriptor.cols,
          descriptor.heights,
          { x: 1, y: 1, z: 1 }
        );
        break;

      default:
        colliderDesc = this.rapier.ColliderDesc.ball(0.5);
    }

    // Set physics properties
    if (descriptor.density !== undefined) {
      colliderDesc.setDensity(descriptor.density);
    }

    if (descriptor.friction !== undefined) {
      colliderDesc.setFriction(descriptor.friction);
    }

    if (descriptor.restitution !== undefined) {
      colliderDesc.setRestitution(descriptor.restitution);
    }

    if (descriptor.isSensor) {
      colliderDesc.setSensor(true);
    }

    if (descriptor.collisionGroups) {
      colliderDesc.setCollisionGroups(
        (descriptor.collisionGroups.memberships << 16) | descriptor.collisionGroups.filter
      );
    }

    if (descriptor.offset) {
      colliderDesc.setTranslation(descriptor.offset.x, descriptor.offset.y, descriptor.offset.z);
    }

    if (descriptor.rotation) {
      colliderDesc.setRotation(descriptor.rotation);
    }

    // Create collider
    const collider = this.world.createCollider(colliderDesc, body);
    const handle: ColliderHandle = {
      id: collider.handle,
      bodyId: bodyHandle.id,
      entityId,
    };

    this.colliders.set(collider.handle, handle);
    return handle;
  }

  /**
   * Remove a collider
   */
  removeCollider(handle: ColliderHandle): void {
    if (!this.world) return;

    const collider = this.world.getCollider(handle.id);
    if (collider) {
      this.world.removeCollider(collider, true);
    }

    this.colliders.delete(handle.id);
  }

  // ========================================================================
  // QUERIES
  // ========================================================================

  /**
   * Cast a ray and get the first hit
   */
  raycast(
    origin: Vector3,
    direction: Vector3,
    maxDistance: number,
    filterMask?: number
  ): RaycastHit | null {
    if (!this.world || !this.rapier) return null;

    const ray = new this.rapier.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z }
    );

    const hit = this.world.castRay(ray, maxDistance, true, filterMask);

    if (hit) {
      const collider = this.world.getCollider(hit.collider.handle);
      const colliderHandle = this.colliders.get(hit.collider.handle);

      const point = ray.pointAt(hit.toi);
      const normal = hit.normal;

      return {
        point: { x: point.x, y: point.y, z: point.z },
        normal: { x: normal.x, y: normal.y, z: normal.z },
        distance: hit.toi,
        colliderId: hit.collider.handle,
        entityId: colliderHandle?.entityId || '',
      };
    }

    return null;
  }

  /**
   * Cast a ray and get all hits
   */
  raycastAll(
    origin: Vector3,
    direction: Vector3,
    maxDistance: number,
    filterMask?: number
  ): RaycastHit[] {
    if (!this.world || !this.rapier) return [];

    const ray = new this.rapier.Ray(
      { x: origin.x, y: origin.y, z: origin.z },
      { x: direction.x, y: direction.y, z: direction.z }
    );

    const hits: RaycastHit[] = [];

    this.world.intersectionsWithRay(ray, maxDistance, true, (hit) => {
      const colliderHandle = this.colliders.get(hit.collider.handle);
      const point = ray.pointAt(hit.toi);
      const normal = hit.normal;

      hits.push({
        point: { x: point.x, y: point.y, z: point.z },
        normal: { x: normal.x, y: normal.y, z: normal.z },
        distance: hit.toi,
        colliderId: hit.collider.handle,
        entityId: colliderHandle?.entityId || '',
      });

      return true; // Continue searching
    }, filterMask);

    return hits;
  }

  /**
   * Check if a point is inside any collider
   */
  pointInCollider(point: Vector3): ColliderHandle | null {
    if (!this.world) return null;

    const collider = this.world.intersectionsWithPoint(
      { x: point.x, y: point.y, z: point.z },
      () => false
    );

    if (collider) {
      return this.colliders.get(collider.handle) || null;
    }

    return null;
  }

  /**
   * Query colliders overlapping with a shape
   */
  overlapShape(
    position: Vector3,
    rotation: Quaternion,
    shape: ColliderDescriptor
  ): ColliderHandle[] {
    if (!this.world || !this.rapier) return [];

    // Create shape for query
    let queryShape: RapierShape;

    switch (shape.shape) {
      case 'box':
        queryShape = new this.rapier.Cuboid(
          shape.halfExtents?.x || 0.5,
          shape.halfExtents?.y || 0.5,
          shape.halfExtents?.z || 0.5
        );
        break;
      case 'sphere':
        queryShape = new this.rapier.Ball(shape.radius || 0.5);
        break;
      default:
        queryShape = new this.rapier.Ball(0.5);
    }

    const results: ColliderHandle[] = [];

    this.world.intersectionsWithShape(
      { x: position.x, y: position.y, z: position.z },
      rotation,
      queryShape,
      (collider) => {
        const handle = this.colliders.get(collider.handle);
        if (handle) {
          results.push(handle);
        }
        return true; // Continue searching
      }
    );

    return results;
  }

  // ========================================================================
  // JOINTS
  // ========================================================================

  /**
   * Create a joint between two bodies
   */
  createJoint(descriptor: JointDescriptor): JointHandle | null {
    if (!this.world || !this.rapier) return null;

    const body1 = this.world.getRigidBody(descriptor.body1.id);
    const body2 = this.world.getRigidBody(descriptor.body2.id);

    if (!body1 || !body2) return null;

    let jointData: RapierJointData;
    const anchor1 = descriptor.anchor1 || { x: 0, y: 0, z: 0 };
    const anchor2 = descriptor.anchor2 || { x: 0, y: 0, z: 0 };

    switch (descriptor.type) {
      case 'fixed':
        jointData = this.rapier.JointData.fixed(
          anchor1,
          { x: 0, y: 0, z: 0, w: 1 },
          anchor2,
          { x: 0, y: 0, z: 0, w: 1 }
        );
        break;

      case 'revolute':
        jointData = this.rapier.JointData.revolute(
          anchor1,
          anchor2,
          descriptor.axis || { x: 0, y: 1, z: 0 }
        );
        if (descriptor.limits) {
          jointData.limitsEnabled = true;
          jointData.limits = [descriptor.limits.min, descriptor.limits.max];
        }
        break;

      case 'prismatic':
        jointData = this.rapier.JointData.prismatic(
          anchor1,
          anchor2,
          descriptor.axis || { x: 1, y: 0, z: 0 }
        );
        if (descriptor.limits) {
          jointData.limitsEnabled = true;
          jointData.limits = [descriptor.limits.min, descriptor.limits.max];
        }
        break;

      case 'spherical':
        jointData = this.rapier.JointData.spherical(anchor1, anchor2);
        break;

      case 'rope':
        jointData = this.rapier.JointData.rope(
          descriptor.limits?.max || 1,
          anchor1,
          anchor2
        );
        break;

      case 'spring':
        jointData = this.rapier.JointData.spring(
          descriptor.stiffness || 1000,
          descriptor.damping || 10,
          anchor1,
          anchor2
        );
        break;

      default:
        jointData = this.rapier.JointData.fixed(
          anchor1,
          { x: 0, y: 0, z: 0, w: 1 },
          anchor2,
          { x: 0, y: 0, z: 0, w: 1 }
        );
    }

    const joint = this.world.createImpulseJoint(jointData, body1, body2, true);
    const handle: JointHandle = {
      id: joint.handle,
      body1Id: descriptor.body1.id,
      body2Id: descriptor.body2.id,
    };

    this.joints.set(joint.handle, handle);
    return handle;
  }

  /**
   * Remove a joint
   */
  removeJoint(handle: JointHandle): void {
    if (!this.world) return;

    const joint = this.world.getImpulseJoint(handle.id);
    if (joint) {
      this.world.removeImpulseJoint(joint, true);
    }

    this.joints.delete(handle.id);
  }

  // ========================================================================
  // CHARACTER CONTROLLER
  // ========================================================================

  /**
   * Create a character controller
   */
  createCharacterController(
    entityId: string,
    descriptor: CharacterControllerDescriptor
  ): CharacterController | null {
    if (!this.world || !this.rapier) return null;

    const controller = this.world.createCharacterController(descriptor.offset);

    // Configure autostep
    if (descriptor.autostep) {
      controller.enableAutostep(
        descriptor.autostep.maxHeight,
        descriptor.autostep.minWidth,
        descriptor.autostep.includeDynamic
      );
    }

    // Configure slope
    controller.setMaxSlopeClimbAngle(descriptor.maxSlopeAngle * (Math.PI / 180));
    if (descriptor.minSlopeAngle !== undefined) {
      controller.setMinSlopeSlideAngle(descriptor.minSlopeAngle * (Math.PI / 180));
    }

    // Configure snap to ground
    if (descriptor.snapToGround !== undefined) {
      controller.enableSnapToGround(descriptor.snapToGround);
    }

    const handle: CharacterController = {
      id: entityId,
      controller,
      collider: null as unknown as ColliderHandle,
    };

    this.controllers.set(entityId, handle);
    return handle;
  }

  /**
   * Move character controller
   */
  moveCharacter(
    controller: CharacterController,
    desiredMovement: Vector3,
    deltaTime: number
  ): Vector3 {
    if (!this.world || !controller.collider) return { x: 0, y: 0, z: 0 };

    const collider = this.world.getCollider(controller.collider.id);
    if (!collider) return { x: 0, y: 0, z: 0 };

    controller.controller.computeColliderMovement(
      collider,
      { x: desiredMovement.x, y: desiredMovement.y, z: desiredMovement.z }
    );

    const movement = controller.controller.computedMovement();
    return { x: movement.x, y: movement.y, z: movement.z };
  }

  /**
   * Check if character is grounded
   */
  isCharacterGrounded(controller: CharacterController): boolean {
    return controller.controller.computedGrounded();
  }

  // ========================================================================
  // DEBUG RENDERING
  // ========================================================================

  /**
   * Get debug render data
   */
  getDebugRenderData(): { vertices: Float32Array; colors: Float32Array } | null {
    if (!this.world) return null;

    const buffers = this.world.debugRender();
    return {
      vertices: buffers.vertices,
      colors: buffers.colors,
    };
  }

  /**
   * Set debug options
   */
  setDebugOptions(options: Partial<PhysicsDebugOptions>): void {
    this.debugOptions = { ...this.debugOptions, ...options };
  }

  // ========================================================================
  // CONFIGURATION
  // ========================================================================

  /**
   * Set gravity
   */
  setGravity(gravity: Vector3): void {
    if (!this.world) return;
    this.world.gravity = { x: gravity.x, y: gravity.y, z: gravity.z };
    this.config.gravity = gravity;
  }

  /**
   * Get current gravity
   */
  getGravity(): Vector3 {
    return this.config.gravity;
  }

  /**
   * Get all bodies
   */
  getAllBodies(): RigidBodyHandle[] {
    return Array.from(this.bodies.values());
  }

  /**
   * Get all colliders
   */
  getAllColliders(): ColliderHandle[] {
    return Array.from(this.colliders.values());
  }
}

// ============================================================================
// TYPE STUBS (for when Rapier is not available)
// ============================================================================

interface RapierWorld {
  step(): void;
  free(): void;
  gravity: Vector3;
  timestep: number;
  numSolverIterations: number;
  eventQueue?: RapierEventQueue;
  createRigidBody(desc: RapierRigidBodyDesc): RapierRigidBody;
  getRigidBody(handle: number): RapierRigidBody | null;
  removeRigidBody(body: RapierRigidBody): void;
  createCollider(desc: RapierColliderDesc, body: RapierRigidBody): RapierCollider;
  getCollider(handle: number): RapierCollider | null;
  removeCollider(collider: RapierCollider, wakeUp: boolean): void;
  castRay(ray: RapierRay, maxToi: number, solid: boolean, filter?: number): RapierRayHit | null;
  intersectionsWithRay(ray: RapierRay, maxToi: number, solid: boolean, callback: (hit: RapierRayHit) => boolean, filter?: number): void;
  intersectionsWithPoint(point: Vector3, callback: () => boolean): RapierCollider | null;
  intersectionsWithShape(pos: Vector3, rot: Quaternion, shape: RapierShape, callback: (collider: RapierCollider) => boolean): void;
  createImpulseJoint(data: RapierJointData, body1: RapierRigidBody, body2: RapierRigidBody, wakeUp: boolean): RapierJoint;
  getImpulseJoint(handle: number): RapierJoint | null;
  removeImpulseJoint(joint: RapierJoint, wakeUp: boolean): void;
  createCharacterController(offset: number): RapierCharacterController;
  debugRender(): { vertices: Float32Array; colors: Float32Array };
}

interface RapierEventQueue {
  drainCollisionEvents(callback: (h1: number, h2: number, started: boolean) => void): void;
}

interface RapierRigidBodyDesc {
  setTranslation(x: number, y: number, z: number): void;
  setRotation(rot: Quaternion): void;
  setLinvel(x: number, y: number, z: number): void;
  setAngvel(rot: Vector3): void;
  setGravityScale(scale: number): void;
  setLinearDamping(damping: number): void;
  setAngularDamping(damping: number): void;
  setCanSleep(canSleep: boolean): void;
  setCcdEnabled(enabled: boolean): void;
}

interface RapierRigidBody {
  handle: number;
  translation(): Vector3;
  rotation(): Quaternion;
  linvel(): Vector3;
  angvel(): Vector3;
  setTranslation(pos: Vector3, wakeUp: boolean): void;
  setRotation(rot: Quaternion, wakeUp: boolean): void;
  setLinvel(vel: Vector3, wakeUp: boolean): void;
  setAngvel(vel: Vector3, wakeUp: boolean): void;
  addForce(force: Vector3, wakeUp: boolean): void;
  applyImpulse(impulse: Vector3, wakeUp: boolean): void;
  addTorque(torque: Vector3, wakeUp: boolean): void;
}

interface RapierColliderDesc {
  setDensity(density: number): void;
  setFriction(friction: number): void;
  setRestitution(restitution: number): void;
  setSensor(isSensor: boolean): void;
  setCollisionGroups(groups: number): void;
  setTranslation(x: number, y: number, z: number): void;
  setRotation(rot: Quaternion): void;
}

interface RapierCollider {
  handle: number;
}

interface RapierRay {
  pointAt(t: number): Vector3;
}

interface RapierRayHit {
  collider: RapierCollider;
  toi: number;
  normal: Vector3;
}

interface RapierShape {}

interface RapierJointData {
  limitsEnabled?: boolean;
  limits?: [number, number];
}

interface RapierJoint {
  handle: number;
}

interface RapierCharacterController {
  enableAutostep(maxHeight: number, minWidth: number, includeDynamic: boolean): void;
  setMaxSlopeClimbAngle(angle: number): void;
  setMinSlopeSlideAngle(angle: number): void;
  enableSnapToGround(distance: number): void;
  computeColliderMovement(collider: RapierCollider, movement: Vector3): void;
  computedMovement(): Vector3;
  computedGrounded(): boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const RapierModule: any;

interface JointHandle {
  id: number;
  body1Id: number;
  body2Id: number;
}

interface CharacterController {
  id: string;
  controller: RapierCharacterController;
  collider: ColliderHandle;
}

// ============================================================================
// FALLBACK PHYSICS (Basic simulation without Rapier)
// ============================================================================

class FallbackPhysicsWorld implements RapierWorld {
  private bodies: Map<number, FallbackBody> = new Map();
  private nextHandle = 0;
  gravity: Vector3;
  timestep: number;
  numSolverIterations = 4;

  constructor(config: PhysicsWorldConfig) {
    this.gravity = config.gravity;
    this.timestep = config.timestep;
  }

  step(): void {
    for (const body of this.bodies.values()) {
      if (body.type === 'dynamic') {
        // Apply gravity
        body.velocity.y += this.gravity.y * this.timestep;

        // Update position
        body.position.x += body.velocity.x * this.timestep;
        body.position.y += body.velocity.y * this.timestep;
        body.position.z += body.velocity.z * this.timestep;

        // Simple ground collision
        if (body.position.y < 0) {
          body.position.y = 0;
          body.velocity.y = 0;
        }
      }
    }
  }

  free(): void {
    this.bodies.clear();
  }

  createRigidBody(desc: RapierRigidBodyDesc): RapierRigidBody {
    const handle = this.nextHandle++;
    const body: FallbackBody = {
      handle,
      type: 'dynamic',
      position: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      velocity: { x: 0, y: 0, z: 0 },
      angularVelocity: { x: 0, y: 0, z: 0 },
    };
    this.bodies.set(handle, body);
    return body as unknown as RapierRigidBody;
  }

  getRigidBody(handle: number): RapierRigidBody | null {
    const body = this.bodies.get(handle);
    return body as unknown as RapierRigidBody || null;
  }

  removeRigidBody(body: RapierRigidBody): void {
    this.bodies.delete((body as unknown as FallbackBody).handle);
  }

  createCollider(): RapierCollider {
    return { handle: this.nextHandle++ };
  }

  getCollider(): RapierCollider | null {
    return null;
  }

  removeCollider(): void {}

  castRay(): RapierRayHit | null {
    return null;
  }

  intersectionsWithRay(): void {}

  intersectionsWithPoint(): RapierCollider | null {
    return null;
  }

  intersectionsWithShape(): void {}

  createImpulseJoint(): RapierJoint {
    return { handle: this.nextHandle++ };
  }

  getImpulseJoint(): RapierJoint | null {
    return null;
  }

  removeImpulseJoint(): void {}

  createCharacterController(): RapierCharacterController {
    return {
      enableAutostep: () => {},
      setMaxSlopeClimbAngle: () => {},
      setMinSlopeSlideAngle: () => {},
      enableSnapToGround: () => {},
      computeColliderMovement: () => {},
      computedMovement: () => ({ x: 0, y: 0, z: 0 }),
      computedGrounded: () => true,
    };
  }

  debugRender(): { vertices: Float32Array; colors: Float32Array } {
    return { vertices: new Float32Array(0), colors: new Float32Array(0) };
  }
}

interface FallbackBody {
  handle: number;
  type: RigidBodyType;
  position: Vector3;
  rotation: Quaternion;
  velocity: Vector3;
  angularVelocity: Vector3;
}

export default PhysicsEngine;
