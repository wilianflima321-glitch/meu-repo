// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';
import { EventEmitter } from 'events';
import type {
  BodyType,
  ColliderShape,
  ColliderType,
  CollisionContact,
  ConstraintType,
  PhysicsMaterial,
  PhysicsSettings,
  RigidBodyConfig,
} from './physics-system-contracts';
import { AABB, RigidBody } from './physics-system-core';
import { CollisionDetector, type RaycastHit } from './physics-system-collision';
import { Constraint, type ConstraintConfig } from './physics-system-constraint';

export { AABB, RigidBody } from './physics-system-core';
export { CollisionDetector } from './physics-system-collision';
export { Constraint } from './physics-system-constraint';
export type { RaycastHit } from './physics-system-collision';
export type { ConstraintConfig } from './physics-system-constraint';

export type {
  BodyType,
  ColliderShape,
  ColliderType,
  CollisionContact,
  ConstraintType,
  PhysicsMaterial,
  PhysicsSettings,
  RigidBodyConfig,
} from './physics-system-contracts';

export type Material = PhysicsMaterial;
export interface CollisionEvent {
  bodyA: RigidBody;
  bodyB: RigidBody;
  contacts: CollisionContact[];
}
export class PhysicsWorld extends EventEmitter {
  private settings: PhysicsSettings;
  private bodies: Map<string, RigidBody> = new Map();
  private constraints: Map<string, Constraint> = new Map();
  private collisionDetector: CollisionDetector;
  private accumulator = 0;
  private collisionPairs: Map<string, CollisionEvent> = new Map();
  constructor(settings: Partial<PhysicsSettings> = {}) {
    super();
    this.settings = {
      gravity: new THREE.Vector3(0, -9.81, 0),
      fixedTimeStep: 1 / 60,
      maxSubSteps: 10,
      broadphase: 'naive',
      solverIterations: 10,
      allowSleep: true,
      sleepThreshold: 0.1,
      collisionGroups: 16,
      ...settings,
    };
    this.collisionDetector = new CollisionDetector();
  }
  addBody(body: RigidBody): void {
    this.bodies.set(body.id, body);
    this.emit('bodyAdded', { body });
  }
  removeBody(bodyId: string): void {
    const body = this.bodies.get(bodyId);
    if (body) {
      this.bodies.delete(bodyId);
      for (const [constraintId, constraint] of this.constraints) {
        if (constraint.config.bodyA.id === bodyId ||
            constraint.config.bodyB?.id === bodyId) {
          this.constraints.delete(constraintId);
        }
      }
      this.emit('bodyRemoved', { bodyId });
    }
  }
  getBody(bodyId: string): RigidBody | undefined {
    return this.bodies.get(bodyId);
  }
  getAllBodies(): RigidBody[] {
    return Array.from(this.bodies.values());
  }
  addConstraint(constraint: Constraint): void {
    this.constraints.set(constraint.id, constraint);
    this.emit('constraintAdded', { constraint });
  }
  removeConstraint(constraintId: string): void {
    this.constraints.delete(constraintId);
    this.emit('constraintRemoved', { constraintId });
  }
  step(deltaTime: number): void {
    this.accumulator += deltaTime;
    let steps = 0;
    while (this.accumulator >= this.settings.fixedTimeStep && steps < this.settings.maxSubSteps) {
      this.fixedStep(this.settings.fixedTimeStep);
      this.accumulator -= this.settings.fixedTimeStep;
      steps++;
    }
    for (const body of this.bodies.values()) {
      body.syncToObject3D();
    }
  }
  private fixedStep(dt: number): void {
    const bodies = Array.from(this.bodies.values());
    for (const body of bodies) {
      if (body.config.type !== 'dynamic' || !body.isAwake) continue;
      const gravity = this.settings.gravity.clone().multiplyScalar(
        body.config.mass * body.config.gravityScale
      );
      body.applyForce(gravity);
    }
    for (const body of bodies) {
      if (body.config.type !== 'dynamic' || !body.isAwake) continue;
      body.linearVelocity.add(
        body.force.clone().multiplyScalar(body.inverseMass * dt)
      );
      const angularAccel = body.torque.clone().applyMatrix3(body.inverseInertia);
      body.angularVelocity.add(angularAccel.multiplyScalar(dt));
      body.linearVelocity.multiplyScalar(1 - body.config.linearDamping);
      body.angularVelocity.multiplyScalar(1 - body.config.angularDamping);
      body.force.set(0, 0, 0);
      body.torque.set(0, 0, 0);
    }
    this.detectCollisions(bodies);
    for (let i = 0; i < this.settings.solverIterations; i++) {
      this.solveCollisions();
      this.solveConstraints(dt);
    }
    for (const body of bodies) {
      if (body.config.type !== 'dynamic' || !body.isAwake) continue;
      body.position.add(body.linearVelocity.clone().multiplyScalar(dt));
      if (!body.config.fixedRotation) {
        const angularDelta = body.angularVelocity.clone().multiplyScalar(dt);
        const deltaQuat = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(angularDelta.x, angularDelta.y, angularDelta.z)
        );
        body.rotation.premultiply(deltaQuat).normalize();
      }
      body.updateAABB();
    }
    if (this.settings.allowSleep) {
      this.checkSleep(bodies, dt);
    }
  }
  private detectCollisions(bodies: RigidBody[]): void {
    this.collisionPairs.clear();
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const bodyA = bodies[i];
        const bodyB = bodies[j];
        if (bodyA.config.type !== 'dynamic' && bodyB.config.type !== 'dynamic') continue;
        if (!bodyA.isAwake && !bodyB.isAwake) continue;
        if ((bodyA.config.collisionGroup & bodyB.config.collisionMask) === 0 ||
            (bodyB.config.collisionGroup & bodyA.config.collisionMask) === 0) continue;
        const contacts = this.collisionDetector.detectCollision(bodyA, bodyB);
        if (contacts) {
          const pairId = `${bodyA.id}-${bodyB.id}`;
          const event: CollisionEvent = { bodyA, bodyB, contacts };
          this.collisionPairs.set(pairId, event);
          if (bodyA.config.isTrigger || bodyB.config.isTrigger) {
            this.emit('trigger', event);
            bodyA.emit('trigger', { other: bodyB, contacts });
            bodyB.emit('trigger', { other: bodyA, contacts });
          } else {
            this.emit('collision', event);
            bodyA.emit('collision', { other: bodyB, contacts });
            bodyB.emit('collision', { other: bodyA, contacts });
          }
        }
      }
    }
  }
  private solveCollisions(): void {
    for (const event of this.collisionPairs.values()) {
      const { bodyA, bodyB, contacts } = event;
      if (bodyA.config.isTrigger || bodyB.config.isTrigger) continue;
      for (const contact of contacts) {
        this.resolveContact(bodyA, bodyB, contact);
      }
    }
  }
  private resolveContact(bodyA: RigidBody, bodyB: RigidBody, contact: CollisionContact): void {
    const { normal, penetration, point } = contact;
    const rA = point.clone().sub(bodyA.position);
    const rB = point.clone().sub(bodyB.position);
    const velA = bodyA.linearVelocity.clone().add(
      bodyA.angularVelocity.clone().cross(rA)
    );
    const velB = bodyB.linearVelocity.clone().add(
      bodyB.angularVelocity.clone().cross(rB)
    );
    const relativeVelocity = velB.clone().sub(velA);
    const velocityAlongNormal = relativeVelocity.dot(normal);
    if (velocityAlongNormal > 0) return;
    const restitution = Math.min(
      bodyA.config.material.restitution,
      bodyB.config.material.restitution
    );
    const invMassSum = bodyA.inverseMass + bodyB.inverseMass;
    if (invMassSum === 0) return;
    let j = -(1 + restitution) * velocityAlongNormal;
    j /= invMassSum;
    const impulse = normal.clone().multiplyScalar(j);
    if (bodyA.config.type === 'dynamic') {
      bodyA.linearVelocity.sub(impulse.clone().multiplyScalar(bodyA.inverseMass));
    }
    if (bodyB.config.type === 'dynamic') {
      bodyB.linearVelocity.add(impulse.clone().multiplyScalar(bodyB.inverseMass));
    }
    const percent = 0.8;
    const slop = 0.01;
    const correction = normal.clone().multiplyScalar(
      Math.max(penetration - slop, 0) / invMassSum * percent
    );
    if (bodyA.config.type === 'dynamic') {
      bodyA.position.sub(correction.clone().multiplyScalar(bodyA.inverseMass));
    }
    if (bodyB.config.type === 'dynamic') {
      bodyB.position.add(correction.clone().multiplyScalar(bodyB.inverseMass));
    }
    const tangent = relativeVelocity.clone().sub(
      normal.clone().multiplyScalar(velocityAlongNormal)
    ).normalize();
    const friction = Math.sqrt(
      bodyA.config.material.friction * bodyB.config.material.friction
    );
    let jt = -relativeVelocity.dot(tangent);
    jt /= invMassSum;
    const maxFriction = j * friction;
    jt = Math.max(-maxFriction, Math.min(maxFriction, jt));
    const frictionImpulse = tangent.multiplyScalar(jt);
    if (bodyA.config.type === 'dynamic') {
      bodyA.linearVelocity.sub(frictionImpulse.clone().multiplyScalar(bodyA.inverseMass));
    }
    if (bodyB.config.type === 'dynamic') {
      bodyB.linearVelocity.add(frictionImpulse.clone().multiplyScalar(bodyB.inverseMass));
    }
    contact.impulse = j;
  }
  private solveConstraints(dt: number): void {
    for (const constraint of this.constraints.values()) {
      if (constraint.enabled) {
        constraint.solve(dt);
      }
    }
  }
  private checkSleep(bodies: RigidBody[], dt: number): void {
    const threshold = this.settings.sleepThreshold;
    for (const body of bodies) {
      if (body.config.type !== 'dynamic' || !body.config.allowSleep) continue;
      const motion = body.linearVelocity.lengthSq() + body.angularVelocity.lengthSq();
      if (motion < threshold * threshold) {
        body.sleepTimer += dt;
        if (body.sleepTimer > 0.5) {
          body.sleep();
        }
      } else {
        body.sleepTimer = 0;
      }
    }
  }
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance = 1000,
    mask = -1
  ): RaycastHit | null {
    return this.collisionDetector.raycast(
      origin,
      direction.normalize(),
      maxDistance,
      Array.from(this.bodies.values()),
      mask
    );
  }
  raycastAll(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance = 1000,
    mask = -1
  ): RaycastHit[] {
    const hits: RaycastHit[] = [];
    const normalizedDir = direction.clone().normalize();
    for (const body of this.bodies.values()) {
      if ((body.config.collisionGroup & mask) === 0) continue;
      const hit = this.collisionDetector['raycastBody'](
        origin,
        normalizedDir,
        maxDistance,
        body
      );
      if (hit) {
        hits.push(hit);
      }
    }
    return hits.sort((a, b) => a.distance - b.distance);
  }
  setGravity(gravity: THREE.Vector3): void {
    this.settings.gravity.copy(gravity);
    this.emit('gravityChanged', { gravity });
  }
  clear(): void {
    this.bodies.clear();
    this.constraints.clear();
    this.collisionPairs.clear();
    this.emit('cleared');
  }
}
import { useState, useCallback, useRef, useEffect } from 'react';
export function usePhysics(settings?: Partial<PhysicsSettings>) {
  const worldRef = useRef<PhysicsWorld>(new PhysicsWorld(settings));
  const [bodyCount, setBodyCount] = useState(0);
  useEffect(() => {
    const world = worldRef.current;
    const updateCount = () => setBodyCount(world.getAllBodies().length);
    world.on('bodyAdded', updateCount);
    world.on('bodyRemoved', updateCount);
    return () => {
      world.off('bodyAdded', updateCount);
      world.off('bodyRemoved', updateCount);
    };
  }, []);
  const step = useCallback((deltaTime: number) => {
    worldRef.current.step(deltaTime);
  }, []);
  const addBody = useCallback((body: RigidBody) => {
    worldRef.current.addBody(body);
    return body;
  }, []);
  const removeBody = useCallback((bodyId: string) => {
    worldRef.current.removeBody(bodyId);
  }, []);
  const raycast = useCallback((
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance?: number,
    mask?: number
  ) => {
    return worldRef.current.raycast(origin, direction, maxDistance, mask);
  }, []);
  const createRigidBody = useCallback((
    colliderType: ColliderType,
    config: Partial<RigidBodyConfig> = {},
    colliderConfig: Partial<ColliderShape> = {}
  ) => {
    const collider: ColliderShape = {
      type: colliderType,
      offset: new THREE.Vector3(),
      rotation: new THREE.Quaternion(),
      halfExtents: new THREE.Vector3(0.5, 0.5, 0.5),
      radius: 0.5,
      height: 2,
      ...colliderConfig,
    };
    return new RigidBody(collider, config);
  }, []);
  return {
    world: worldRef.current,
    bodyCount,
    step,
    addBody,
    removeBody,
    raycast,
    createRigidBody,
    setGravity: (gravity: THREE.Vector3) => worldRef.current.setGravity(gravity),
    clear: () => worldRef.current.clear(),
  };
}
const __defaultExport = {
  PhysicsWorld,
  RigidBody,
  Constraint,
  CollisionDetector,
  AABB,
  usePhysics,
};
export default __defaultExport;
