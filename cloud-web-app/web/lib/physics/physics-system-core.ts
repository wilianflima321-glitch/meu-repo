// @aethel-heavy-async-boundary Studio/physics core runtime.
import * as THREE from 'three';
import { EventEmitter } from 'events';
import type { ColliderShape, RigidBodyConfig } from './physics-system-contracts';

export class AABB {
  min: THREE.Vector3;
  max: THREE.Vector3;
  constructor(
    min = new THREE.Vector3(-Infinity, -Infinity, -Infinity),
    max = new THREE.Vector3(Infinity, Infinity, Infinity)
  ) {
    this.min = min.clone();
    this.max = max.clone();
  }
  setFromCenterAndSize(center: THREE.Vector3, size: THREE.Vector3): this {
    const halfSize = size.clone().multiplyScalar(0.5);
    this.min.copy(center).sub(halfSize);
    this.max.copy(center).add(halfSize);
    return this;
  }
  intersects(other: AABB): boolean {
    return (
      this.min.x <= other.max.x && this.max.x >= other.min.x &&
      this.min.y <= other.max.y && this.max.y >= other.min.y &&
      this.min.z <= other.max.z && this.max.z >= other.min.z
    );
  }
  containsPoint(point: THREE.Vector3): boolean {
    return (
      point.x >= this.min.x && point.x <= this.max.x &&
      point.y >= this.min.y && point.y <= this.max.y &&
      point.z >= this.min.z && point.z <= this.max.z
    );
  }
  expand(amount: number): this {
    this.min.subScalar(amount);
    this.max.addScalar(amount);
    return this;
  }
  union(other: AABB): this {
    this.min.min(other.min);
    this.max.max(other.max);
    return this;
  }
  getCenter(target: THREE.Vector3): THREE.Vector3 {
    return target.addVectors(this.min, this.max).multiplyScalar(0.5);
  }
  getSize(target: THREE.Vector3): THREE.Vector3 {
    return target.subVectors(this.max, this.min);
  }
  clone(): AABB {
    return new AABB(this.min.clone(), this.max.clone());
  }
}
export class RigidBody extends EventEmitter {
  id: string;
  config: RigidBodyConfig;
  collider: ColliderShape;
  aabb: AABB;
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  linearVelocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  force: THREE.Vector3;
  torque: THREE.Vector3;
  inverseMass: number;
  inverseInertia: THREE.Matrix3;
  isAwake: boolean;
  sleepTimer: number;
  object3D?: THREE.Object3D;
  userData: Record<string, unknown>;
  private static idCounter = 0;
  constructor(collider: ColliderShape, config: Partial<RigidBodyConfig> = {}) {
    super();
    this.id = `body_${++RigidBody.idCounter}`;
    this.collider = collider;
    this.config = {
      type: 'dynamic',
      mass: 1,
      material: {
        friction: 0.5,
        restitution: 0.3,
        density: 1,
        rollingFriction: 0.1,
      },
      linearDamping: 0.01,
      angularDamping: 0.01,
      linearVelocity: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      allowSleep: true,
      isTrigger: false,
      collisionGroup: 1,
      collisionMask: -1,
      fixedRotation: false,
      gravityScale: 1,
      ...config,
    };
    this.position = new THREE.Vector3();
    this.rotation = new THREE.Quaternion();
    this.linearVelocity = this.config.linearVelocity.clone();
    this.angularVelocity = this.config.angularVelocity.clone();
    this.force = new THREE.Vector3();
    this.torque = new THREE.Vector3();
    this.inverseMass = this.config.type === 'dynamic' ? 1 / this.config.mass : 0;
    this.inverseInertia = new THREE.Matrix3();
    this.calculateInertia();
    this.aabb = new AABB();
    this.updateAABB();
    this.isAwake = true;
    this.sleepTimer = 0;
    this.userData = {};
  }
  private calculateInertia(): void {
    if (this.config.type !== 'dynamic') {
      this.inverseInertia.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
      return;
    }
    const m = this.config.mass;
    let ix = 0, iy = 0, iz = 0;
    switch (this.collider.type) {
      case 'box': {
        const hx = this.collider.halfExtents!.x;
        const hy = this.collider.halfExtents!.y;
        const hz = this.collider.halfExtents!.z;
        ix = (m / 12) * (4 * hy * hy + 4 * hz * hz);
        iy = (m / 12) * (4 * hx * hx + 4 * hz * hz);
        iz = (m / 12) * (4 * hx * hx + 4 * hy * hy);
        break;
      }
      case 'sphere': {
        const r = this.collider.radius!;
        ix = iy = iz = (2 / 5) * m * r * r;
        break;
      }
      case 'capsule':
      case 'cylinder': {
        const r = this.collider.radius!;
        const h = this.collider.height!;
        ix = iz = (m / 12) * (3 * r * r + h * h);
        iy = (m / 2) * r * r;
        break;
      }
      default:
        ix = iy = iz = m; // Fallback
    }
    this.inverseInertia.set(
      1 / ix, 0, 0,
      0, 1 / iy, 0,
      0, 0, 1 / iz
    );
  }
  updateAABB(): void {
    const center = this.position.clone().add(this.collider.offset);
    switch (this.collider.type) {
      case 'box': {
        const halfExtents = this.collider.halfExtents!;
        this.aabb.setFromCenterAndSize(center, halfExtents.clone().multiplyScalar(2));
        break;
      }
      case 'sphere': {
        const r = this.collider.radius!;
        this.aabb.setFromCenterAndSize(center, new THREE.Vector3(r * 2, r * 2, r * 2));
        break;
      }
      case 'capsule':
      case 'cylinder': {
        const r = this.collider.radius!;
        const h = this.collider.height!;
        this.aabb.setFromCenterAndSize(center, new THREE.Vector3(r * 2, h, r * 2));
        break;
      }
      case 'plane':
        this.aabb = new AABB(
          new THREE.Vector3(-1000, -0.1, -1000),
          new THREE.Vector3(1000, 0.1, 1000)
        );
        break;
      default:
        this.aabb.setFromCenterAndSize(center, new THREE.Vector3(1, 1, 1));
    }
    const velocity = this.linearVelocity.length();
    if (velocity > 0) {
      this.aabb.expand(velocity * 0.1);
    }
  }
  applyForce(force: THREE.Vector3, worldPoint?: THREE.Vector3): void {
    if (this.config.type !== 'dynamic') return;
    this.force.add(force);
    this.wakeUp();
    if (worldPoint) {
      const r = worldPoint.clone().sub(this.position);
      this.torque.add(r.cross(force));
    }
  }
  applyImpulse(impulse: THREE.Vector3, worldPoint?: THREE.Vector3): void {
    if (this.config.type !== 'dynamic') return;
    this.linearVelocity.add(impulse.clone().multiplyScalar(this.inverseMass));
    this.wakeUp();
    if (worldPoint) {
      const r = worldPoint.clone().sub(this.position);
      const angularImpulse = r.cross(impulse);
      this.angularVelocity.add(
        angularImpulse.applyMatrix3(this.inverseInertia)
      );
    }
  }
  applyTorque(torque: THREE.Vector3): void {
    if (this.config.type !== 'dynamic') return;
    this.torque.add(torque);
    this.wakeUp();
  }
  setPosition(position: THREE.Vector3): void {
    this.position.copy(position);
    this.updateAABB();
    this.wakeUp();
  }
  setRotation(rotation: THREE.Quaternion): void {
    this.rotation.copy(rotation);
    this.updateAABB();
    this.wakeUp();
  }
  setLinearVelocity(velocity: THREE.Vector3): void {
    this.linearVelocity.copy(velocity);
    this.wakeUp();
  }
  setAngularVelocity(velocity: THREE.Vector3): void {
    this.angularVelocity.copy(velocity);
    this.wakeUp();
  }
  wakeUp(): void {
    this.isAwake = true;
    this.sleepTimer = 0;
    this.emit('wakeUp');
  }
  sleep(): void {
    this.isAwake = false;
    this.linearVelocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);
    this.emit('sleep');
  }
  syncFromObject3D(): void {
    if (this.object3D) {
      this.object3D.getWorldPosition(this.position);
      this.object3D.getWorldQuaternion(this.rotation);
      this.updateAABB();
    }
  }
  syncToObject3D(): void {
    if (this.object3D) {
      this.object3D.position.copy(this.position);
      this.object3D.quaternion.copy(this.rotation);
    }
  }
}
