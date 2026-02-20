import * as THREE from 'three';

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
      this.min.x <= other.max.x &&
      this.max.x >= other.min.x &&
      this.min.y <= other.max.y &&
      this.max.y >= other.min.y &&
      this.min.z <= other.max.z &&
      this.max.z >= other.min.z
    );
  }

  containsPoint(point: THREE.Vector3): boolean {
    return (
      point.x >= this.min.x &&
      point.x <= this.max.x &&
      point.y >= this.min.y &&
      point.y <= this.max.y &&
      point.z >= this.min.z &&
      point.z <= this.max.z
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
