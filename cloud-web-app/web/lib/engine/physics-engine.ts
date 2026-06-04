import { EventEmitter } from 'events';
import { BoxCollider, CapsuleCollider, Collider, PlaneCollider, SphereCollider } from './physics-colliders';
import { Quat, Vec3, type AABB, type BodyType, type ColliderConfig, type PhysicsConfig, type Quaternion, type RigidBodyConfig, type Vector3 } from './physics-math';

export { BoxCollider, CapsuleCollider, Collider, PlaneCollider, SphereCollider } from './physics-colliders';
export { Quat, Vec3 } from './physics-math';
export type { AABB, BodyType, ColliderConfig, ColliderType, PhysicsConfig, Quaternion, RigidBodyConfig, Transform, Vector, Vector2, Vector3 } from './physics-math';

export interface RaycastResult {
  hit: boolean;
  point?: Vector3;
  normal?: Vector3;
  distance?: number;
  body?: RigidBody;
}
export interface CollisionInfo {
  bodyA: RigidBody;
  bodyB: RigidBody;
  point: Vector3;
  normal: Vector3;
  penetration: number;
  impulse: number;
}
export class RigidBody {
  public id: string;
  public type: BodyType;
  public collider: Collider | null = null;
  public position: Vector3;
  public rotation: Quaternion;
  public scale: Vector3 = { x: 1, y: 1, z: 1 };
  public linearVelocity: Vector3 = Vec3.zero();
  public angularVelocity: Vector3 = Vec3.zero();
  public mass: number;
  public inverseMass: number;
  public inertia: Vector3 = { x: 1, y: 1, z: 1 };
  public inverseInertia: Vector3 = { x: 1, y: 1, z: 1 };
  public linearDamping = 0.01;
  public angularDamping = 0.01;
  public gravityScale = 1;
  public fixedRotation = false;
  public isSleeping = false;
  public sleepTimer = 0;
  private forceAccumulator: Vector3 = Vec3.zero();
  private torqueAccumulator: Vector3 = Vec3.zero();
  public userData: Record<string, unknown> = {};
  constructor(config: RigidBodyConfig) {
    this.id = crypto.randomUUID();
    this.type = config.type;
    this.position = config.position ?? Vec3.zero();
    this.rotation = config.rotation ?? Quat.identity();
    if (config.type === 'static') {
      this.mass = 0;
      this.inverseMass = 0;
    } else {
      this.mass = config.mass ?? 1;
      this.inverseMass = this.mass > 0 ? 1 / this.mass : 0;
    }
    this.linearDamping = config.linearDamping ?? 0.01;
    this.angularDamping = config.angularDamping ?? 0.01;
    this.gravityScale = config.gravityScale ?? 1;
    this.fixedRotation = config.fixedRotation ?? false;
    if (config.collider) {
      this.setCollider(config.collider);
    }
  }
  setCollider(config: ColliderConfig): void {
    let collider: Collider;
    switch (config.type) {
      case 'box':
        collider = new BoxCollider(config.size);
        break;
      case 'sphere':
        collider = new SphereCollider(config.radius);
        break;
      case 'capsule':
        collider = new CapsuleCollider(config.radius, config.height);
        break;
      case 'plane':
        collider = new PlaneCollider();
        break;
      default:
        collider = new BoxCollider();
    }
    collider.friction = config.friction ?? 0.5;
    collider.restitution = config.restitution ?? 0.3;
    collider.isTrigger = config.isTrigger ?? false;
    collider.body = this;
    this.collider = collider;
    if (this.mass > 0) {
      this.inertia = collider.computeInertia(this.mass);
      this.inverseInertia = {
        x: this.inertia.x > 0 ? 1 / this.inertia.x : 0,
        y: this.inertia.y > 0 ? 1 / this.inertia.y : 0,
        z: this.inertia.z > 0 ? 1 / this.inertia.z : 0,
      };
    }
  }
  applyForce(force: Vector3, point?: Vector3): void {
    if (this.type === 'static') return;
    this.wake();
    this.forceAccumulator = Vec3.add(this.forceAccumulator, force);
    if (point) {
      const r = Vec3.sub(point, this.position);
      const torque = Vec3.cross(r, force);
      this.torqueAccumulator = Vec3.add(this.torqueAccumulator, torque);
    }
  }
  applyImpulse(impulse: Vector3, point?: Vector3): void {
    if (this.type === 'static') return;
    this.wake();
    this.linearVelocity = Vec3.add(
      this.linearVelocity,
      Vec3.scale(impulse, this.inverseMass)
    );
    if (point && !this.fixedRotation) {
      const r = Vec3.sub(point, this.position);
      const angularImpulse = Vec3.cross(r, impulse);
      this.angularVelocity = Vec3.add(
        this.angularVelocity,
        {
          x: angularImpulse.x * this.inverseInertia.x,
          y: angularImpulse.y * this.inverseInertia.y,
          z: angularImpulse.z * this.inverseInertia.z,
        }
      );
    }
  }
  applyTorque(torque: Vector3): void {
    if (this.type === 'static' || this.fixedRotation) return;
    this.wake();
    this.torqueAccumulator = Vec3.add(this.torqueAccumulator, torque);
  }
  integrateForces(dt: number, gravity: Vector3): void {
    if (this.type === 'static' || this.isSleeping) return;
    const gravityForce = Vec3.scale(gravity, this.mass * this.gravityScale);
    const totalForce = Vec3.add(this.forceAccumulator, gravityForce);
    this.linearVelocity = Vec3.add(
      this.linearVelocity,
      Vec3.scale(totalForce, this.inverseMass * dt)
    );
    if (!this.fixedRotation) {
      this.angularVelocity = Vec3.add(
        this.angularVelocity,
        {
          x: this.torqueAccumulator.x * this.inverseInertia.x * dt,
          y: this.torqueAccumulator.y * this.inverseInertia.y * dt,
          z: this.torqueAccumulator.z * this.inverseInertia.z * dt,
        }
      );
    }
    this.linearVelocity = Vec3.scale(
      this.linearVelocity,
      1 / (1 + this.linearDamping * dt)
    );
    this.angularVelocity = Vec3.scale(
      this.angularVelocity,
      1 / (1 + this.angularDamping * dt)
    );
    this.forceAccumulator = Vec3.zero();
    this.torqueAccumulator = Vec3.zero();
  }
  integrateVelocity(dt: number): void {
    if (this.type === 'static' || this.isSleeping) return;
    this.position = Vec3.add(
      this.position,
      Vec3.scale(this.linearVelocity, dt)
    );
    if (!this.fixedRotation) {
      const omega = this.angularVelocity;
      const dq: Quaternion = {
        x: 0.5 * (omega.x * this.rotation.w + omega.y * this.rotation.z - omega.z * this.rotation.y) * dt,
        y: 0.5 * (omega.y * this.rotation.w + omega.z * this.rotation.x - omega.x * this.rotation.z) * dt,
        z: 0.5 * (omega.z * this.rotation.w + omega.x * this.rotation.y - omega.y * this.rotation.x) * dt,
        w: 0.5 * (-omega.x * this.rotation.x - omega.y * this.rotation.y - omega.z * this.rotation.z) * dt,
      };
      this.rotation = Quat.normalize({
        x: this.rotation.x + dq.x,
        y: this.rotation.y + dq.y,
        z: this.rotation.z + dq.z,
        w: this.rotation.w + dq.w,
      });
    }
  }
  wake(): void {
    this.isSleeping = false;
    this.sleepTimer = 0;
  }
  sleep(): void {
    this.isSleeping = true;
    this.linearVelocity = Vec3.zero();
    this.angularVelocity = Vec3.zero();
  }
  getAABB(): AABB | null {
    return this.collider?.getAABB() ?? null;
  }
  getKineticEnergy(): number {
    const linearKE = 0.5 * this.mass * Vec3.lengthSq(this.linearVelocity);
    const angularKE = 0.5 * (
      this.inertia.x * this.angularVelocity.x ** 2 +
      this.inertia.y * this.angularVelocity.y ** 2 +
      this.inertia.z * this.angularVelocity.z ** 2
    );
    return linearKE + angularKE;
  }
}
class CollisionDetector {
  static sphereVsSphere(a: SphereCollider, b: SphereCollider): CollisionInfo | null {
    const bodyA = a.body!;
    const bodyB = b.body!;
    const diff = Vec3.sub(bodyB.position, bodyA.position);
    const distSq = Vec3.lengthSq(diff);
    const radiusSum = a.radius + b.radius;
    if (distSq >= radiusSum * radiusSum) return null;
    const dist = Math.sqrt(distSq);
    const normal = dist > 0 ? Vec3.scale(diff, 1 / dist) : { x: 0, y: 1, z: 0 };
    const penetration = radiusSum - dist;
    const point = Vec3.add(bodyA.position, Vec3.scale(normal, a.radius));
    return {
      bodyA,
      bodyB,
      point,
      normal,
      penetration,
      impulse: 0,
    };
  }
  static sphereVsPlane(sphere: SphereCollider, plane: PlaneCollider): CollisionInfo | null {
    const body = sphere.body!;
    const dist = Vec3.dot(body.position, plane.normal) - plane.distance;
    if (dist >= sphere.radius) return null;
    const penetration = sphere.radius - dist;
    const point = Vec3.sub(body.position, Vec3.scale(plane.normal, dist));
    return {
      bodyA: body,
      bodyB: plane.body!,
      point,
      normal: plane.normal,
      penetration,
      impulse: 0,
    };
  }
  static boxVsBox(a: BoxCollider, b: BoxCollider): CollisionInfo | null {
    const bodyA = a.body!;
    const bodyB = b.body!;
    const aabbA = a.getAABB();
    const aabbB = b.getAABB();
    if (aabbA.max.x < aabbB.min.x || aabbA.min.x > aabbB.max.x) return null;
    if (aabbA.max.y < aabbB.min.y || aabbA.min.y > aabbB.max.y) return null;
    if (aabbA.max.z < aabbB.min.z || aabbA.min.z > aabbB.max.z) return null;
    const overlapX = Math.min(aabbA.max.x - aabbB.min.x, aabbB.max.x - aabbA.min.x);
    const overlapY = Math.min(aabbA.max.y - aabbB.min.y, aabbB.max.y - aabbA.min.y);
    const overlapZ = Math.min(aabbA.max.z - aabbB.min.z, aabbB.max.z - aabbA.min.z);
    let normal: Vector3;
    let penetration: number;
    if (overlapX < overlapY && overlapX < overlapZ) {
      penetration = overlapX;
      normal = bodyA.position.x < bodyB.position.x ? { x: -1, y: 0, z: 0 } : { x: 1, y: 0, z: 0 };
    } else if (overlapY < overlapZ) {
      penetration = overlapY;
      normal = bodyA.position.y < bodyB.position.y ? { x: 0, y: -1, z: 0 } : { x: 0, y: 1, z: 0 };
    } else {
      penetration = overlapZ;
      normal = bodyA.position.z < bodyB.position.z ? { x: 0, y: 0, z: -1 } : { x: 0, y: 0, z: 1 };
    }
    const point = Vec3.lerp(bodyA.position, bodyB.position, 0.5);
    return {
      bodyA,
      bodyB,
      point,
      normal,
      penetration,
      impulse: 0,
    };
  }
  static boxVsSphere(box: BoxCollider, sphere: SphereCollider): CollisionInfo | null {
    const boxBody = box.body!;
    const sphereBody = sphere.body!;
    const aabb = box.getAABB();
    const closest: Vector3 = {
      x: Math.max(aabb.min.x, Math.min(sphereBody.position.x, aabb.max.x)),
      y: Math.max(aabb.min.y, Math.min(sphereBody.position.y, aabb.max.y)),
      z: Math.max(aabb.min.z, Math.min(sphereBody.position.z, aabb.max.z)),
    };
    const diff = Vec3.sub(sphereBody.position, closest);
    const distSq = Vec3.lengthSq(diff);
    if (distSq >= sphere.radius * sphere.radius) return null;
    const dist = Math.sqrt(distSq);
    const normal = dist > 0 ? Vec3.scale(diff, 1 / dist) : { x: 0, y: 1, z: 0 };
    const penetration = sphere.radius - dist;
    return {
      bodyA: boxBody,
      bodyB: sphereBody,
      point: closest,
      normal,
      penetration,
      impulse: 0,
    };
  }
  static detect(a: Collider, b: Collider): CollisionInfo | null {
    const typeA = a.getType();
    const typeB = b.getType();
    if (typeA === 'sphere' && typeB === 'sphere') {
      return this.sphereVsSphere(a as SphereCollider, b as SphereCollider);
    }
    if (typeA === 'sphere' && typeB === 'plane') {
      return this.sphereVsPlane(a as SphereCollider, b as PlaneCollider);
    }
    if (typeA === 'plane' && typeB === 'sphere') {
      const result = this.sphereVsPlane(b as SphereCollider, a as PlaneCollider);
      if (result) {
        [result.bodyA, result.bodyB] = [result.bodyB, result.bodyA];
        result.normal = Vec3.scale(result.normal, -1);
      }
      return result;
    }
    if (typeA === 'box' && typeB === 'box') {
      return this.boxVsBox(a as BoxCollider, b as BoxCollider);
    }
    if (typeA === 'box' && typeB === 'sphere') {
      return this.boxVsSphere(a as BoxCollider, b as SphereCollider);
    }
    if (typeA === 'sphere' && typeB === 'box') {
      const result = this.boxVsSphere(b as BoxCollider, a as SphereCollider);
      if (result) {
        [result.bodyA, result.bodyB] = [result.bodyB, result.bodyA];
        result.normal = Vec3.scale(result.normal, -1);
      }
      return result;
    }
    return null;
  }
}
class ContactConstraint {
  collision: CollisionInfo;
  friction: number;
  restitution: number;
  constructor(collision: CollisionInfo) {
    this.collision = collision;
    const colliderA = collision.bodyA.collider;
    const colliderB = collision.bodyB.collider;
    this.friction = Math.sqrt(
      (colliderA?.friction ?? 0.5) * (colliderB?.friction ?? 0.5)
    );
    this.restitution = Math.max(
      colliderA?.restitution ?? 0.3,
      colliderB?.restitution ?? 0.3
    );
  }
  resolve(): void {
    const { bodyA, bodyB, normal, point, penetration } = this.collision;
    if (bodyA.inverseMass === 0 && bodyB.inverseMass === 0) return;
    const rA = Vec3.sub(point, bodyA.position);
    const rB = Vec3.sub(point, bodyB.position);
    const velA = Vec3.add(bodyA.linearVelocity, Vec3.cross(bodyA.angularVelocity, rA));
    const velB = Vec3.add(bodyB.linearVelocity, Vec3.cross(bodyB.angularVelocity, rB));
    const relativeVel = Vec3.sub(velA, velB);
    const contactVel = Vec3.dot(relativeVel, normal);
    if (contactVel > 0) return;
    const rAxN = Vec3.cross(rA, normal);
    const rBxN = Vec3.cross(rB, normal);
    const invMassSum = bodyA.inverseMass + bodyB.inverseMass +
      Vec3.dot(rAxN, {
        x: rAxN.x * bodyA.inverseInertia.x,
        y: rAxN.y * bodyA.inverseInertia.y,
        z: rAxN.z * bodyA.inverseInertia.z,
      }) +
      Vec3.dot(rBxN, {
        x: rBxN.x * bodyB.inverseInertia.x,
        y: rBxN.y * bodyB.inverseInertia.y,
        z: rBxN.z * bodyB.inverseInertia.z,
      });
    let j = -(1 + this.restitution) * contactVel;
    j /= invMassSum;
    const impulse = Vec3.scale(normal, j);
    bodyA.applyImpulse(impulse, point);
    bodyB.applyImpulse(Vec3.scale(impulse, -1), point);
    let tangent = Vec3.sub(relativeVel, Vec3.scale(normal, contactVel));
    const tangentLen = Vec3.length(tangent);
    if (tangentLen > 0.0001) {
      tangent = Vec3.scale(tangent, 1 / tangentLen);
      let jt = -Vec3.dot(relativeVel, tangent);
      jt /= invMassSum;
      const frictionImpulse = Math.abs(jt) < j * this.friction
        ? Vec3.scale(tangent, jt)
        : Vec3.scale(tangent, -j * this.friction);
      bodyA.applyImpulse(frictionImpulse, point);
      bodyB.applyImpulse(Vec3.scale(frictionImpulse, -1), point);
    }
    const slop = 0.01;
    const percent = 0.8;
    const correction = Vec3.scale(
      normal,
      Math.max(penetration - slop, 0) * percent / (bodyA.inverseMass + bodyB.inverseMass)
    );
    bodyA.position = Vec3.add(bodyA.position, Vec3.scale(correction, bodyA.inverseMass));
    bodyB.position = Vec3.sub(bodyB.position, Vec3.scale(correction, bodyB.inverseMass));
    this.collision.impulse = j;
  }
}
interface BroadphasePair {
  a: RigidBody;
  b: RigidBody;
}
class AABBBroadphase {
  getPairs(bodies: RigidBody[]): BroadphasePair[] {
    const pairs: BroadphasePair[] = [];
    for (let i = 0; i < bodies.length; i++) {
      const a = bodies[i];
      const aabbA = a.getAABB();
      if (!aabbA) continue;
      for (let j = i + 1; j < bodies.length; j++) {
        const b = bodies[j];
        if (a.type === 'static' && b.type === 'static') continue;
        if (a.isSleeping && b.isSleeping) continue;
        const aabbB = b.getAABB();
        if (!aabbB) continue;
        if (
          aabbA.max.x >= aabbB.min.x && aabbA.min.x <= aabbB.max.x &&
          aabbA.max.y >= aabbB.min.y && aabbA.min.y <= aabbB.max.y &&
          aabbA.max.z >= aabbB.min.z && aabbA.min.z <= aabbB.max.z
        ) {
          pairs.push({ a, b });
        }
      }
    }
    return pairs;
  }
}
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
