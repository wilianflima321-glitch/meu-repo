import type { RigidBody } from './physics-engine';
import { Vec3, type AABB, type ColliderType, type Vector3 } from './physics-math';

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
