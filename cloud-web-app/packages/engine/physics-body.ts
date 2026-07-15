import { BoxCollider, CapsuleCollider, Collider, PlaneCollider, SphereCollider } from './physics-colliders';
import { Quat, Vec3, type AABB, type BodyType, type ColliderConfig, type Quaternion, type RigidBodyConfig, type Vector3 } from './physics-math';

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
