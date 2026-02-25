/**
 * Aethel Engine - Physics System
 * 
 * Full 2D/3D physics engine with collision detection, rigid body dynamics,
 * and constraint solving. Uses a custom implementation optimized for games.
 */

import { EventEmitter } from 'events';
import { BoxCollider, PlaneCollider, RigidBody, SphereCollider } from './physics-body';
import { AABBBroadphase, CollisionDetector, ContactConstraint } from './physics-collision';
import type { CollisionInfo, RaycastResult } from './physics-body';
import type {
  AABB,
  BodyType,
  ColliderConfig,
  ColliderType,
  PhysicsConfig,
  Quaternion,
  RigidBodyConfig,
  Transform,
  Vector,
  Vector2,
  Vector3,
} from './physics-engine-types';
import { Vec3 } from './physics-engine-math';

export type {
  AABB,
  BodyType,
  ColliderConfig,
  ColliderType,
  PhysicsConfig,
  Quaternion,
  RigidBodyConfig,
  Transform,
  Vector,
  Vector2,
  Vector3,
} from './physics-engine-types';
export { Quat, Vec3 } from './physics-engine-math';
export { BoxCollider, Collider, PlaneCollider, RigidBody, SphereCollider, CapsuleCollider } from './physics-body';
export type { CollisionInfo, RaycastResult } from './physics-body';
export { AABBBroadphase, CollisionDetector, ContactConstraint } from './physics-collision';

export class PhysicsWorld extends EventEmitter {
  private bodies: RigidBody[] = [];
  private broadphase: AABBBroadphase;
  private config: PhysicsConfig;
  
  private accumulator = 0;
  private collisions: CollisionInfo[] = [];

  constructor(config?: Partial<PhysicsConfig>) {
    super();
    
    this.config = {
      gravity: { x: 0, y: -9.81, z: 0 },
      fixedTimeStep: 1 / 60,
      maxSubSteps: 8,
      velocityIterations: 8,
      positionIterations: 3,
      broadphaseType: 'aabb',
      enableSleeping: true,
      sleepThreshold: 0.1,
      ...config,
    };
    
    this.broadphase = new AABBBroadphase();
  }

  addBody(body: RigidBody): void {
    this.bodies.push(body);
    this.emit('bodyAdded', body);
  }

  removeBody(body: RigidBody): void {
    const index = this.bodies.indexOf(body);
    if (index !== -1) {
      this.bodies.splice(index, 1);
      this.emit('bodyRemoved', body);
    }
  }

  getBody(id: string): RigidBody | undefined {
    return this.bodies.find(b => b.id === id);
  }

  getBodies(): RigidBody[] {
    return [...this.bodies];
  }

  step(dt: number): void {
    this.accumulator += dt;
    
    let steps = 0;
    while (this.accumulator >= this.config.fixedTimeStep && steps < this.config.maxSubSteps) {
      this.fixedStep(this.config.fixedTimeStep);
      this.accumulator -= this.config.fixedTimeStep;
      steps++;
    }
    
    const alpha = this.accumulator / this.config.fixedTimeStep;
    this.emit('interpolate', alpha);
  }

  private fixedStep(dt: number): void {
    this.collisions = [];
    
    for (const body of this.bodies) {
      body.integrateForces(dt, this.config.gravity);
    }
    
    const pairs = this.broadphase.getPairs(this.bodies);
    
    const constraints: ContactConstraint[] = [];
    
    for (const { a, b } of pairs) {
      if (!a.collider || !b.collider) continue;
      
      const collision = CollisionDetector.detect(a.collider, b.collider);
      if (collision) {
        this.collisions.push(collision);
        
        if (a.collider.isTrigger || b.collider.isTrigger) {
          this.emit('trigger', collision);
          continue;
        }
        
        constraints.push(new ContactConstraint(collision));
        this.emit('collision', collision);
      }
    }
    
    for (let i = 0; i < this.config.velocityIterations; i++) {
      for (const constraint of constraints) {
        constraint.resolve();
      }
    }
    
    for (const body of this.bodies) {
      body.integrateVelocity(dt);
    }
    
    if (this.config.enableSleeping) {
      this.updateSleeping(dt);
    }
  }

  private updateSleeping(dt: number): void {
    const threshold = this.config.sleepThreshold;
    
    for (const body of this.bodies) {
      if (body.type === 'static') continue;
      
      const energy = body.getKineticEnergy();
      
      if (energy < threshold * body.mass) {
        body.sleepTimer += dt;
        if (body.sleepTimer > 0.5) {
          body.sleep();
        }
      } else {
        body.wake();
      }
    }
  }

  raycast(origin: Vector3, direction: Vector3, maxDistance = Infinity): RaycastResult {
    const dir = Vec3.normalize(direction);
    let closest: RaycastResult = { hit: false };
    let minDist = maxDistance;
    
    for (const body of this.bodies) {
      const collider = body.collider;
      if (!collider) continue;
      
      let result: RaycastResult | null = null;
      
      if (collider instanceof SphereCollider) {
        result = this.raycastSphere(origin, dir, body.position, collider.radius);
      } else if (collider instanceof BoxCollider) {
        result = this.raycastBox(origin, dir, collider.getAABB());
      } else if (collider instanceof PlaneCollider) {
        result = this.raycastPlane(origin, dir, collider.normal, collider.distance);
      }
      
      if (result?.hit && result.distance! < minDist) {
        minDist = result.distance!;
        closest = { ...result, body };
      }
    }
    
    return closest;
  }

  private raycastSphere(origin: Vector3, dir: Vector3, center: Vector3, radius: number): RaycastResult {
    const oc = Vec3.sub(origin, center);
    const a = Vec3.dot(dir, dir);
    const b = 2 * Vec3.dot(oc, dir);
    const c = Vec3.dot(oc, oc) - radius * radius;
    const discriminant = b * b - 4 * a * c;
    
    if (discriminant < 0) return { hit: false };
    
    const t = (-b - Math.sqrt(discriminant)) / (2 * a);
    if (t < 0) return { hit: false };
    
    const point = Vec3.add(origin, Vec3.scale(dir, t));
    const normal = Vec3.normalize(Vec3.sub(point, center));
    
    return { hit: true, point, normal, distance: t };
  }

  private raycastBox(origin: Vector3, dir: Vector3, aabb: AABB): RaycastResult {
    let tmin = (aabb.min.x - origin.x) / dir.x;
    let tmax = (aabb.max.x - origin.x) / dir.x;
    
    if (tmin > tmax) [tmin, tmax] = [tmax, tmin];
    
    let tymin = (aabb.min.y - origin.y) / dir.y;
    let tymax = (aabb.max.y - origin.y) / dir.y;
    
    if (tymin > tymax) [tymin, tymax] = [tymax, tymin];
    
    if (tmin > tymax || tymin > tmax) return { hit: false };
    
    if (tymin > tmin) tmin = tymin;
    if (tymax < tmax) tmax = tymax;
    
    let tzmin = (aabb.min.z - origin.z) / dir.z;
    let tzmax = (aabb.max.z - origin.z) / dir.z;
    
    if (tzmin > tzmax) [tzmin, tzmax] = [tzmax, tzmin];
    
    if (tmin > tzmax || tzmin > tmax) return { hit: false };
    
    if (tzmin > tmin) tmin = tzmin;
    
    if (tmin < 0) return { hit: false };
    
    const point = Vec3.add(origin, Vec3.scale(dir, tmin));
    
    const epsilon = 0.0001;
    let normal: Vector3;
    
    if (Math.abs(point.x - aabb.min.x) < epsilon) normal = { x: -1, y: 0, z: 0 };
    else if (Math.abs(point.x - aabb.max.x) < epsilon) normal = { x: 1, y: 0, z: 0 };
    else if (Math.abs(point.y - aabb.min.y) < epsilon) normal = { x: 0, y: -1, z: 0 };
    else if (Math.abs(point.y - aabb.max.y) < epsilon) normal = { x: 0, y: 1, z: 0 };
    else if (Math.abs(point.z - aabb.min.z) < epsilon) normal = { x: 0, y: 0, z: -1 };
    else normal = { x: 0, y: 0, z: 1 };
    
    return { hit: true, point, normal, distance: tmin };
  }

  private raycastPlane(origin: Vector3, dir: Vector3, normal: Vector3, distance: number): RaycastResult {
    const denom = Vec3.dot(normal, dir);
    
    if (Math.abs(denom) < 0.0001) return { hit: false };
    
    const t = (distance - Vec3.dot(normal, origin)) / denom;
    
    if (t < 0) return { hit: false };
    
    const point = Vec3.add(origin, Vec3.scale(dir, t));
    
    return { hit: true, point, normal: Vec3.clone(normal), distance: t };
  }

  getCollisions(): CollisionInfo[] {
    return [...this.collisions];
  }

  setGravity(gravity: Vector3): void {
    this.config.gravity = gravity;
  }

  getGravity(): Vector3 {
    return Vec3.clone(this.config.gravity);
  }

  clear(): void {
    this.bodies = [];
    this.collisions = [];
    this.accumulator = 0;
  }

  dispose(): void {
    this.clear();
    this.removeAllListeners();
  }
}


export class PhysicsEngine {
  private static instance: PhysicsEngine | null = null;
  private world: PhysicsWorld;
  private isRunning = false;
  private lastTime = 0;
  private animationFrameId: number | null = null;

  private constructor(config?: Partial<PhysicsConfig>) {
    this.world = new PhysicsWorld(config);
  }

  static getInstance(config?: Partial<PhysicsConfig>): PhysicsEngine {
    if (!PhysicsEngine.instance) {
      PhysicsEngine.instance = new PhysicsEngine(config);
    }
    return PhysicsEngine.instance;
  }

  static resetInstance(): void {
    if (PhysicsEngine.instance) {
      PhysicsEngine.instance.stop();
      PhysicsEngine.instance.world.dispose();
      PhysicsEngine.instance = null;
    }
  }

  getWorld(): PhysicsWorld {
    return this.world;
  }

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.lastTime = performance.now();
    this.tick();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private tick = (): void => {
    if (!this.isRunning) return;
    
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.1); // Cap at 100ms
    this.lastTime = now;
    
    this.world.step(dt);
    
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  createBody(config: RigidBodyConfig): RigidBody {
    const body = new RigidBody(config);
    this.world.addBody(body);
    return body;
  }

  destroyBody(body: RigidBody): void {
    this.world.removeBody(body);
  }
}

export default PhysicsEngine;
