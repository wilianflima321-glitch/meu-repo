/**
 * Physics bodies and colliders runtime primitives.
 */
import type { AABB, BodyType, ColliderConfig, ColliderType, Quaternion, RigidBodyConfig, Vector3 } from './physics-engine-types';
import { Quat, Vec3 } from './physics-engine-math';

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


export abstract class Collider {
  public body: RigidBody | null = null;
  public friction = 0.5;
  public restitution = 0.3;
  public isTrigger = false;
  public localOffset = Vec3.zero();

  abstract getAABB(): AABB;
  abstract getType(): ColliderType;
  abstract computeInertia(mass: number): Vector3;
}

export class BoxCollider extends Collider {
  public size: Vector3;

  constructor(size: Vector3 = { x: 1, y: 1, z: 1 }) {
    super();
    this.size = size;
  }

  getType(): ColliderType {
    return 'box';
  }

  getAABB(): AABB {
    const halfSize = Vec3.scale(this.size, 0.5);
    const pos = this.body?.position ?? Vec3.zero();
    
    return {
      min: Vec3.sub(pos, halfSize),
      max: Vec3.add(pos, halfSize),
    };
  }

  computeInertia(mass: number): Vector3 {
    const factor = mass / 12;
    return {
      x: factor * (this.size.y ** 2 + this.size.z ** 2),
      y: factor * (this.size.x ** 2 + this.size.z ** 2),
      z: factor * (this.size.x ** 2 + this.size.y ** 2),
    };
  }
}

export class SphereCollider extends Collider {
  public radius: number;

  constructor(radius = 0.5) {
    super();
    this.radius = radius;
  }

  getType(): ColliderType {
    return 'sphere';
  }

  getAABB(): AABB {
    const pos = this.body?.position ?? Vec3.zero();
    const r = { x: this.radius, y: this.radius, z: this.radius };
    
    return {
      min: Vec3.sub(pos, r),
      max: Vec3.add(pos, r),
    };
  }

  computeInertia(mass: number): Vector3 {
    const i = (2 / 5) * mass * this.radius ** 2;
    return { x: i, y: i, z: i };
  }
}

export class CapsuleCollider extends Collider {
  public radius: number;
  public height: number;

  constructor(radius = 0.5, height = 2) {
    super();
    this.radius = radius;
    this.height = height;
  }

  getType(): ColliderType {
    return 'capsule';
  }

  getAABB(): AABB {
    const pos = this.body?.position ?? Vec3.zero();
    const halfHeight = this.height / 2;
    
    return {
      min: {
        x: pos.x - this.radius,
        y: pos.y - halfHeight - this.radius,
        z: pos.z - this.radius,
      },
      max: {
        x: pos.x + this.radius,
        y: pos.y + halfHeight + this.radius,
        z: pos.z + this.radius,
      },
    };
  }

  computeInertia(mass: number): Vector3 {
    const cylinderHeight = this.height - 2 * this.radius;
    const sphereVolume = (4 / 3) * Math.PI * this.radius ** 3;
    const cylinderVolume = Math.PI * this.radius ** 2 * cylinderHeight;
    const totalVolume = sphereVolume + cylinderVolume;
    
    const sphereMass = mass * (sphereVolume / totalVolume);
    const cylinderMass = mass * (cylinderVolume / totalVolume);

    const iSphere = (2 / 5) * sphereMass * this.radius ** 2;
    const iCylinderX = (1 / 12) * cylinderMass * (3 * this.radius ** 2 + cylinderHeight ** 2);
    const iCylinderY = (1 / 2) * cylinderMass * this.radius ** 2;

    return {
      x: iCylinderX + iSphere,
      y: iCylinderY + iSphere,
      z: iCylinderX + iSphere,
    };
  }
}

export class PlaneCollider extends Collider {
  public normal: Vector3;
  public distance: number;

  constructor(normal: Vector3 = { x: 0, y: 1, z: 0 }, distance = 0) {
    super();
    this.normal = Vec3.normalize(normal);
    this.distance = distance;
  }

  getType(): ColliderType {
    return 'plane';
  }

  getAABB(): AABB {
    const inf = 1e10;
    return {
      min: { x: -inf, y: -inf, z: -inf },
      max: { x: inf, y: inf, z: inf },
    };
  }

  computeInertia(_mass: number): Vector3 {
    return { x: 0, y: 0, z: 0 };
  }
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


