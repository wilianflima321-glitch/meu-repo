import * as THREE from 'three';
import type { CollisionContact, RaycastHit } from './physics-system-types';
import type { RigidBody } from './physics-system';

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

