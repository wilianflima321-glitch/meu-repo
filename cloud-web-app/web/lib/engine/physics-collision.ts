/**
 * Collision detection and contact resolution runtime.
 */
import type { Vector3 } from './physics-engine-types';
import { Vec3 } from './physics-engine-math';
import { BoxCollider, Collider, PlaneCollider, RigidBody, SphereCollider } from './physics-body';
import type { CollisionInfo } from './physics-body';

export class CollisionDetector {
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


export class ContactConstraint {
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


export interface BroadphasePair {
  a: RigidBody;
  b: RigidBody;
}

export class AABBBroadphase {
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

