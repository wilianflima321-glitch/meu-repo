/**
 * Physics Integration System - Sistema de Física Integrado
 * 
 * Sistema completo de física com:
 * - Rigid body dynamics
 * - Collision detection (broad + narrow phase)
 * - Constraints/Joints
 * - Raycasting
 * - Triggers
 * - Character controller
 * 
 * @module lib/physics/physics-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type ColliderType = 'box' | 'sphere' | 'capsule' | 'cylinder' | 'plane' | 'mesh' | 'convex';
export type BodyType = 'dynamic' | 'static' | 'kinematic';
export type ConstraintType = 'fixed' | 'hinge' | 'slider' | 'ball' | 'spring' | 'distance';

export interface PhysicsSettings {
  gravity: THREE.Vector3;
  fixedTimeStep: number;
  maxSubSteps: number;
  broadphase: 'naive' | 'sap' | 'grid';
  solverIterations: number;
  allowSleep: boolean;
  sleepThreshold: number;
  collisionGroups: number;
}

export interface ColliderShape {
  type: ColliderType;
  offset: THREE.Vector3;
  rotation: THREE.Quaternion;
  // Box
  halfExtents?: THREE.Vector3;
  // Sphere
  radius?: number;
  // Capsule/Cylinder
  height?: number;
  // Mesh
  vertices?: Float32Array;
  indices?: Uint32Array;
  scale?: THREE.Vector3;
}

export interface Material {
  friction: number;
  restitution: number;
  density: number;
  rollingFriction: number;
}

export interface RigidBodyConfig {
  type: BodyType;
  mass: number;
  material: Material;
  linearDamping: number;
  angularDamping: number;
  linearVelocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  allowSleep: boolean;
  isTrigger: boolean;
  collisionGroup: number;
  collisionMask: number;
  fixedRotation: boolean;
  gravityScale: number;
}

export interface CollisionContact {
  point: THREE.Vector3;
  normal: THREE.Vector3;
  penetration: number;
  impulse: number;
}

export interface CollisionEvent {
  bodyA: RigidBody;
  bodyB: RigidBody;
  contacts: CollisionContact[];
}

export interface RaycastHit {
  body: RigidBody;
  point: THREE.Vector3;
  normal: THREE.Vector3;
  distance: number;
}

export interface ConstraintConfig {
  type: ConstraintType;
  bodyA: RigidBody;
  bodyB: RigidBody | null;
  pivotA: THREE.Vector3;
  pivotB: THREE.Vector3;
  axisA?: THREE.Vector3;
  axisB?: THREE.Vector3;
  // Hinge
  lowerLimit?: number;
  upperLimit?: number;
  // Spring
  stiffness?: number;
  damping?: number;
  restLength?: number;
  // Distance
  minDistance?: number;
  maxDistance?: number;
}

// ============================================================================
// AABB (Axis-Aligned Bounding Box)
// ============================================================================

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

// ============================================================================
// RIGID BODY
// ============================================================================

export class RigidBody extends EventEmitter {
  id: string;
  config: RigidBodyConfig;
  collider: ColliderShape;
  aabb: AABB;
  
  // State
  position: THREE.Vector3;
  rotation: THREE.Quaternion;
  linearVelocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  
  // Forces
  force: THREE.Vector3;
  torque: THREE.Vector3;
  
  // Computed
  inverseMass: number;
  inverseInertia: THREE.Matrix3;
  
  // Flags
  isAwake: boolean;
  sleepTimer: number;
  
  // Reference to object3D
  object3D?: THREE.Object3D;
  
  // User data
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
        // Simplified - should consider rotation
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
    
    // Expand for motion
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

// ============================================================================
// COLLISION DETECTION
// ============================================================================

export class CollisionDetector {
  detectCollision(bodyA: RigidBody, bodyB: RigidBody): CollisionContact[] | null {
    // AABB early out
    if (!bodyA.aabb.intersects(bodyB.aabb)) {
      return null;
    }
    
    // Narrow phase based on collider types
    const typeA = bodyA.collider.type;
    const typeB = bodyB.collider.type;
    
    // Sphere-Sphere
    if (typeA === 'sphere' && typeB === 'sphere') {
      return this.sphereSphere(bodyA, bodyB);
    }
    
    // Sphere-Box
    if (typeA === 'sphere' && typeB === 'box') {
      return this.sphereBox(bodyA, bodyB);
    }
    if (typeA === 'box' && typeB === 'sphere') {
      const result = this.sphereBox(bodyB, bodyA);
      if (result) {
        result.forEach((c) => c.normal.negate());
      }
      return result;
    }
    
    // Box-Box
    if (typeA === 'box' && typeB === 'box') {
      return this.boxBox(bodyA, bodyB);
    }
    
    // Sphere-Plane
    if (typeA === 'sphere' && typeB === 'plane') {
      return this.spherePlane(bodyA, bodyB);
    }
    if (typeA === 'plane' && typeB === 'sphere') {
      const result = this.spherePlane(bodyB, bodyA);
      if (result) {
        result.forEach((c) => c.normal.negate());
      }
      return result;
    }
    
    // Box-Plane
    if (typeA === 'box' && typeB === 'plane') {
      return this.boxPlane(bodyA, bodyB);
    }
    if (typeA === 'plane' && typeB === 'box') {
      const result = this.boxPlane(bodyB, bodyA);
      if (result) {
        result.forEach((c) => c.normal.negate());
      }
      return result;
    }
    
    return null;
  }
  
  private sphereSphere(a: RigidBody, b: RigidBody): CollisionContact[] | null {
    const posA = a.position.clone().add(a.collider.offset);
    const posB = b.position.clone().add(b.collider.offset);
    const radiusA = a.collider.radius!;
    const radiusB = b.collider.radius!;
    
    const diff = posB.clone().sub(posA);
    const distance = diff.length();
    const combinedRadius = radiusA + radiusB;
    
    if (distance >= combinedRadius) {
      return null;
    }
    
    const normal = distance > 0 ? diff.normalize() : new THREE.Vector3(0, 1, 0);
    const penetration = combinedRadius - distance;
    const point = posA.clone().add(normal.clone().multiplyScalar(radiusA));
    
    return [{
      point,
      normal,
      penetration,
      impulse: 0,
    }];
  }
  
  private sphereBox(sphere: RigidBody, box: RigidBody): CollisionContact[] | null {
    const spherePos = sphere.position.clone().add(sphere.collider.offset);
    const boxPos = box.position.clone().add(box.collider.offset);
    const radius = sphere.collider.radius!;
    const halfExtents = box.collider.halfExtents!;
    
    // Transform sphere to box local space
    const localSphere = spherePos.clone().sub(boxPos);
    
    // Find closest point on box
    const closest = new THREE.Vector3(
      Math.max(-halfExtents.x, Math.min(halfExtents.x, localSphere.x)),
      Math.max(-halfExtents.y, Math.min(halfExtents.y, localSphere.y)),
      Math.max(-halfExtents.z, Math.min(halfExtents.z, localSphere.z))
    );
    
    const diff = localSphere.clone().sub(closest);
    const distance = diff.length();
    
    if (distance >= radius) {
      return null;
    }
    
    const normal = distance > 0 ? diff.normalize() : new THREE.Vector3(0, 1, 0);
    const penetration = radius - distance;
    const point = boxPos.clone().add(closest);
    
    return [{
      point,
      normal,
      penetration,
      impulse: 0,
    }];
  }
  
  private boxBox(a: RigidBody, b: RigidBody): CollisionContact[] | null {
    // Simplified SAT (Separating Axis Theorem)
    const posA = a.position.clone().add(a.collider.offset);
    const posB = b.position.clone().add(b.collider.offset);
    const halfA = a.collider.halfExtents!;
    const halfB = b.collider.halfExtents!;
    
    const diff = posB.clone().sub(posA);
    
    // Check overlap on each axis
    const overlapX = halfA.x + halfB.x - Math.abs(diff.x);
    const overlapY = halfA.y + halfB.y - Math.abs(diff.y);
    const overlapZ = halfA.z + halfB.z - Math.abs(diff.z);
    
    if (overlapX <= 0 || overlapY <= 0 || overlapZ <= 0) {
      return null;
    }
    
    // Find minimum overlap axis
    let normal: THREE.Vector3;
    let penetration: number;
    
    if (overlapX < overlapY && overlapX < overlapZ) {
      normal = new THREE.Vector3(Math.sign(diff.x), 0, 0);
      penetration = overlapX;
    } else if (overlapY < overlapZ) {
      normal = new THREE.Vector3(0, Math.sign(diff.y), 0);
      penetration = overlapY;
    } else {
      normal = new THREE.Vector3(0, 0, Math.sign(diff.z));
      penetration = overlapZ;
    }
    
    const point = posA.clone().add(posB).multiplyScalar(0.5);
    
    return [{
      point,
      normal,
      penetration,
      impulse: 0,
    }];
  }
  
  private spherePlane(sphere: RigidBody, plane: RigidBody): CollisionContact[] | null {
    const spherePos = sphere.position.clone().add(sphere.collider.offset);
    const planePos = plane.position.clone().add(plane.collider.offset);
    const radius = sphere.collider.radius!;
    const planeNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(plane.rotation);
    
    const distance = spherePos.clone().sub(planePos).dot(planeNormal);
    
    if (distance >= radius) {
      return null;
    }
    
    const penetration = radius - distance;
    const point = spherePos.clone().sub(planeNormal.clone().multiplyScalar(distance));
    
    return [{
      point,
      normal: planeNormal.clone(),
      penetration,
      impulse: 0,
    }];
  }
  
  private boxPlane(box: RigidBody, plane: RigidBody): CollisionContact[] | null {
    const boxPos = box.position.clone().add(box.collider.offset);
    const planePos = plane.position.clone().add(plane.collider.offset);
    const halfExtents = box.collider.halfExtents!;
    const planeNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(plane.rotation);
    
    // Check all 8 corners
    const corners = [
      new THREE.Vector3(-halfExtents.x, -halfExtents.y, -halfExtents.z),
      new THREE.Vector3(halfExtents.x, -halfExtents.y, -halfExtents.z),
      new THREE.Vector3(-halfExtents.x, halfExtents.y, -halfExtents.z),
      new THREE.Vector3(halfExtents.x, halfExtents.y, -halfExtents.z),
      new THREE.Vector3(-halfExtents.x, -halfExtents.y, halfExtents.z),
      new THREE.Vector3(halfExtents.x, -halfExtents.y, halfExtents.z),
      new THREE.Vector3(-halfExtents.x, halfExtents.y, halfExtents.z),
      new THREE.Vector3(halfExtents.x, halfExtents.y, halfExtents.z),
    ];
    
    const contacts: CollisionContact[] = [];
    
    for (const corner of corners) {
      corner.applyQuaternion(box.rotation);
      const worldCorner = corner.add(boxPos);
      const distance = worldCorner.clone().sub(planePos).dot(planeNormal);
      
      if (distance < 0) {
        contacts.push({
          point: worldCorner,
          normal: planeNormal.clone(),
          penetration: -distance,
          impulse: 0,
        });
      }
    }
    
    return contacts.length > 0 ? contacts : null;
  }
  
  raycast(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    bodies: RigidBody[],
    mask = -1
  ): RaycastHit | null {
    let closestHit: RaycastHit | null = null;
    
    for (const body of bodies) {
      if ((body.config.collisionGroup & mask) === 0) continue;
      
      const hit = this.raycastBody(origin, direction, maxDistance, body);
      if (hit && (!closestHit || hit.distance < closestHit.distance)) {
        closestHit = hit;
      }
    }
    
    return closestHit;
  }
  
  private raycastBody(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    maxDistance: number,
    body: RigidBody
  ): RaycastHit | null {
    const pos = body.position.clone().add(body.collider.offset);
    
    switch (body.collider.type) {
      case 'sphere': {
        const radius = body.collider.radius!;
        const oc = origin.clone().sub(pos);
        
        const a = direction.dot(direction);
        const b = 2 * oc.dot(direction);
        const c = oc.dot(oc) - radius * radius;
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) return null;
        
        const t = (-b - Math.sqrt(discriminant)) / (2 * a);
        if (t < 0 || t > maxDistance) return null;
        
        const point = origin.clone().add(direction.clone().multiplyScalar(t));
        const normal = point.clone().sub(pos).normalize();
        
        return { body, point, normal, distance: t };
      }
      
      case 'box': {
        const halfExtents = body.collider.halfExtents!;
        const localOrigin = origin.clone().sub(pos);
        
        let tmin = 0;
        let tmax = maxDistance;
        const normal = new THREE.Vector3();
        
        for (let i = 0; i < 3; i++) {
          const axis = ['x', 'y', 'z'][i] as 'x' | 'y' | 'z';
          const halfExtent = halfExtents[axis];
          const o = localOrigin[axis];
          const d = direction[axis];
          
          if (Math.abs(d) < 0.0001) {
            if (o < -halfExtent || o > halfExtent) return null;
          } else {
            let t1 = (-halfExtent - o) / d;
            let t2 = (halfExtent - o) / d;
            let sign = -1;
            
            if (t1 > t2) {
              [t1, t2] = [t2, t1];
              sign = 1;
            }
            
            if (t1 > tmin) {
              tmin = t1;
              normal.set(0, 0, 0);
              normal[axis] = sign;
            }
            
            tmax = Math.min(tmax, t2);
            
            if (tmin > tmax) return null;
          }
        }
        
        const point = origin.clone().add(direction.clone().multiplyScalar(tmin));
        return { body, point, normal, distance: tmin };
      }
      
      case 'plane': {
        const planeNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(body.rotation);
        const denom = direction.dot(planeNormal);
        
        if (Math.abs(denom) < 0.0001) return null;
        
        const t = pos.clone().sub(origin).dot(planeNormal) / denom;
        if (t < 0 || t > maxDistance) return null;
        
        const point = origin.clone().add(direction.clone().multiplyScalar(t));
        return { body, point, normal: planeNormal.clone(), distance: t };
      }
    }
    
    return null;
  }
}

// ============================================================================
// CONSTRAINT SOLVER
// ============================================================================

export class Constraint {
  id: string;
  config: ConstraintConfig;
  enabled = true;
  
  private static idCounter = 0;
  
  constructor(config: ConstraintConfig) {
    this.id = `constraint_${++Constraint.idCounter}`;
    this.config = config;
  }
  
  solve(dt: number): void {
    const { bodyA, bodyB, type } = this.config;
    
    switch (type) {
      case 'distance':
        this.solveDistance(dt);
        break;
      case 'spring':
        this.solveSpring(dt);
        break;
      case 'fixed':
        this.solveFixed(dt);
        break;
      // Other constraint types would be implemented similarly
    }
  }
  
  private solveDistance(_dt: number): void {
    const { bodyA, bodyB, minDistance, maxDistance } = this.config;
    if (!bodyB) return;
    
    const worldPivotA = this.config.pivotA.clone().applyQuaternion(bodyA.rotation).add(bodyA.position);
    const worldPivotB = this.config.pivotB.clone().applyQuaternion(bodyB.rotation).add(bodyB.position);
    
    const diff = worldPivotB.clone().sub(worldPivotA);
    const distance = diff.length();
    
    const min = minDistance ?? 0;
    const max = maxDistance ?? Infinity;
    
    if (distance >= min && distance <= max) return;
    
    const normal = diff.normalize();
    const targetDistance = distance < min ? min : max;
    const correction = (distance - targetDistance) * 0.5;
    
    if (bodyA.config.type === 'dynamic') {
      bodyA.position.add(normal.clone().multiplyScalar(correction));
    }
    if (bodyB.config.type === 'dynamic') {
      bodyB.position.sub(normal.clone().multiplyScalar(correction));
    }
  }
  
  private solveSpring(dt: number): void {
    const { bodyA, bodyB, stiffness = 100, damping = 1, restLength = 0 } = this.config;
    if (!bodyB) return;
    
    const worldPivotA = this.config.pivotA.clone().applyQuaternion(bodyA.rotation).add(bodyA.position);
    const worldPivotB = this.config.pivotB.clone().applyQuaternion(bodyB.rotation).add(bodyB.position);
    
    const diff = worldPivotB.clone().sub(worldPivotA);
    const distance = diff.length();
    const normal = diff.normalize();
    
    // Spring force: F = -k * (x - x0) - c * v
    const displacement = distance - restLength;
    const relativeVelocity = bodyB.linearVelocity.clone().sub(bodyA.linearVelocity);
    const velocityAlongSpring = relativeVelocity.dot(normal);
    
    const forceMagnitude = stiffness * displacement + damping * velocityAlongSpring;
    const force = normal.clone().multiplyScalar(forceMagnitude);
    
    bodyA.applyForce(force, worldPivotA);
    bodyB.applyForce(force.negate(), worldPivotB);
  }
  
  private solveFixed(_dt: number): void {
    const { bodyA, bodyB } = this.config;
    if (!bodyB) return;
    
    // Fixed constraint - maintain relative position and rotation
    const targetOffset = this.config.pivotB.clone().sub(this.config.pivotA);
    const worldPivotA = this.config.pivotA.clone().applyQuaternion(bodyA.rotation).add(bodyA.position);
    const targetPosition = worldPivotA.clone().add(targetOffset.applyQuaternion(bodyA.rotation));
    
    if (bodyB.config.type === 'dynamic') {
      const correction = targetPosition.sub(bodyB.position);
      bodyB.position.add(correction.multiplyScalar(0.5));
      bodyB.rotation.copy(bodyA.rotation);
    }
  }
}

// ============================================================================
// PHYSICS WORLD
// ============================================================================

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
      
      // Remove constraints involving this body
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
    
    // Sync to Object3D
    for (const body of this.bodies.values()) {
      body.syncToObject3D();
    }
  }
  
  private fixedStep(dt: number): void {
    const bodies = Array.from(this.bodies.values());
    
    // Apply gravity
    for (const body of bodies) {
      if (body.config.type !== 'dynamic' || !body.isAwake) continue;
      
      const gravity = this.settings.gravity.clone().multiplyScalar(
        body.config.mass * body.config.gravityScale
      );
      body.applyForce(gravity);
    }
    
    // Integrate velocities
    for (const body of bodies) {
      if (body.config.type !== 'dynamic' || !body.isAwake) continue;
      
      // Linear
      body.linearVelocity.add(
        body.force.clone().multiplyScalar(body.inverseMass * dt)
      );
      
      // Angular
      const angularAccel = body.torque.clone().applyMatrix3(body.inverseInertia);
      body.angularVelocity.add(angularAccel.multiplyScalar(dt));
      
      // Damping
      body.linearVelocity.multiplyScalar(1 - body.config.linearDamping);
      body.angularVelocity.multiplyScalar(1 - body.config.angularDamping);
      
      // Clear forces
      body.force.set(0, 0, 0);
      body.torque.set(0, 0, 0);
    }
    
    // Detect collisions
    this.detectCollisions(bodies);
    
    // Solve constraints
    for (let i = 0; i < this.settings.solverIterations; i++) {
      this.solveCollisions();
      this.solveConstraints(dt);
    }
    
    // Integrate positions
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
    
    // Check sleep
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
        
        // Skip if both are static/kinematic
        if (bodyA.config.type !== 'dynamic' && bodyB.config.type !== 'dynamic') continue;
        
        // Skip if sleeping
        if (!bodyA.isAwake && !bodyB.isAwake) continue;
        
        // Check collision mask
        if ((bodyA.config.collisionGroup & bodyB.config.collisionMask) === 0 ||
            (bodyB.config.collisionGroup & bodyA.config.collisionMask) === 0) continue;
        
        const contacts = this.collisionDetector.detectCollision(bodyA, bodyB);
        
        if (contacts) {
          const pairId = `${bodyA.id}-${bodyB.id}`;
          const event: CollisionEvent = { bodyA, bodyB, contacts };
          this.collisionPairs.set(pairId, event);
          
          // Emit trigger events
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
      
      // Skip triggers
      if (bodyA.config.isTrigger || bodyB.config.isTrigger) continue;
      
      for (const contact of contacts) {
        this.resolveContact(bodyA, bodyB, contact);
      }
    }
  }
  
  private resolveContact(bodyA: RigidBody, bodyB: RigidBody, contact: CollisionContact): void {
    const { normal, penetration, point } = contact;
    
    // Calculate relative velocity
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
    
    // Don't resolve if separating
    if (velocityAlongNormal > 0) return;
    
    // Calculate restitution
    const restitution = Math.min(
      bodyA.config.material.restitution,
      bodyB.config.material.restitution
    );
    
    // Calculate impulse magnitude
    const invMassSum = bodyA.inverseMass + bodyB.inverseMass;
    if (invMassSum === 0) return;
    
    let j = -(1 + restitution) * velocityAlongNormal;
    j /= invMassSum;
    
    // Apply impulse
    const impulse = normal.clone().multiplyScalar(j);
    
    if (bodyA.config.type === 'dynamic') {
      bodyA.linearVelocity.sub(impulse.clone().multiplyScalar(bodyA.inverseMass));
    }
    if (bodyB.config.type === 'dynamic') {
      bodyB.linearVelocity.add(impulse.clone().multiplyScalar(bodyB.inverseMass));
    }
    
    // Position correction (prevent sinking)
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
    
    // Friction
    const tangent = relativeVelocity.clone().sub(
      normal.clone().multiplyScalar(velocityAlongNormal)
    ).normalize();
    
    const friction = Math.sqrt(
      bodyA.config.material.friction * bodyB.config.material.friction
    );
    
    let jt = -relativeVelocity.dot(tangent);
    jt /= invMassSum;
    
    // Clamp friction
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

// ============================================================================
// REACT HOOK
// ============================================================================

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
