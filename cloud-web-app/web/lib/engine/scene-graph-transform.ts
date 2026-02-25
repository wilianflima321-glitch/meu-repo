import * as THREE from 'three';
import type { TransformData } from './scene-graph-types';

export interface TransformHierarchyNode {
  children: ReadonlyArray<{ transform: Transform }>;
}

export class Transform {
  private _position: THREE.Vector3 = new THREE.Vector3();
  private _rotation: THREE.Quaternion = new THREE.Quaternion();
  private _scale: THREE.Vector3 = new THREE.Vector3(1, 1, 1);
  private _eulerAngles: THREE.Euler = new THREE.Euler();

  private _localMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private _worldMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private _inverseWorldMatrix: THREE.Matrix4 = new THREE.Matrix4();

  private _dirty: boolean = true;
  private _parent: Transform | null = null;
  private _node: TransformHierarchyNode | null = null;

  constructor() {
    this.updateMatrices();
  }

  get position(): THREE.Vector3 {
    return this._position;
  }

  set position(v: THREE.Vector3) {
    this._position.copy(v);
    this.markDirty();
  }

  get localPosition(): THREE.Vector3 {
    return this._position;
  }

  get worldPosition(): THREE.Vector3 {
    this.updateMatricesIfNeeded();
    const pos = new THREE.Vector3();
    pos.setFromMatrixPosition(this._worldMatrix);
    return pos;
  }

  setWorldPosition(pos: THREE.Vector3): void {
    if (this._parent) {
      this._parent.updateMatricesIfNeeded();
      const invParent = this._parent._inverseWorldMatrix;
      this._position.copy(pos).applyMatrix4(invParent);
    } else {
      this._position.copy(pos);
    }
    this.markDirty();
  }

  get rotation(): THREE.Quaternion {
    return this._rotation;
  }

  set rotation(q: THREE.Quaternion) {
    this._rotation.copy(q);
    this._eulerAngles.setFromQuaternion(q);
    this.markDirty();
  }

  get eulerAngles(): THREE.Euler {
    return this._eulerAngles;
  }

  set eulerAngles(e: THREE.Euler) {
    this._eulerAngles.copy(e);
    this._rotation.setFromEuler(e);
    this.markDirty();
  }

  get worldRotation(): THREE.Quaternion {
    this.updateMatricesIfNeeded();
    const quat = new THREE.Quaternion();
    this._worldMatrix.decompose(new THREE.Vector3(), quat, new THREE.Vector3());
    return quat;
  }

  setWorldRotation(worldQuat: THREE.Quaternion): void {
    if (this._parent) {
      const parentWorldRot = this._parent.worldRotation;
      const local = parentWorldRot.clone().invert().multiply(worldQuat);
      this.rotation = local;
    } else {
      this.rotation = worldQuat;
    }
  }

  get scale(): THREE.Vector3 {
    return this._scale;
  }

  set scale(v: THREE.Vector3) {
    this._scale.copy(v);
    this.markDirty();
  }

  get lossyScale(): THREE.Vector3 {
    this.updateMatricesIfNeeded();
    const scale = new THREE.Vector3();
    this._worldMatrix.decompose(new THREE.Vector3(), new THREE.Quaternion(), scale);
    return scale;
  }

  get localMatrix(): THREE.Matrix4 {
    this.updateMatricesIfNeeded();
    return this._localMatrix;
  }

  get worldMatrix(): THREE.Matrix4 {
    this.updateMatricesIfNeeded();
    return this._worldMatrix;
  }

  get inverseWorldMatrix(): THREE.Matrix4 {
    this.updateMatricesIfNeeded();
    return this._inverseWorldMatrix;
  }

  get forward(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, -1).applyQuaternion(this.worldRotation);
  }

  get right(): THREE.Vector3 {
    return new THREE.Vector3(1, 0, 0).applyQuaternion(this.worldRotation);
  }

  get up(): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this.worldRotation);
  }

  translate(delta: THREE.Vector3, space: 'local' | 'world' = 'local'): void {
    if (space === 'local') {
      delta.applyQuaternion(this._rotation);
    }
    this._position.add(delta);
    this.markDirty();
  }

  rotate(axis: THREE.Vector3, angle: number, space: 'local' | 'world' = 'local'): void {
    const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    if (space === 'local') {
      this._rotation.multiply(q);
    } else {
      this._rotation.premultiply(q);
    }
    this._eulerAngles.setFromQuaternion(this._rotation);
    this.markDirty();
  }

  lookAt(target: THREE.Vector3, up: THREE.Vector3 = new THREE.Vector3(0, 1, 0)): void {
    const mat = new THREE.Matrix4();
    mat.lookAt(this.worldPosition, target, up);
    this._rotation.setFromRotationMatrix(mat);
    this._eulerAngles.setFromQuaternion(this._rotation);
    this.markDirty();
  }

  transformPoint(point: THREE.Vector3): THREE.Vector3 {
    return point.clone().applyMatrix4(this.worldMatrix);
  }

  inverseTransformPoint(point: THREE.Vector3): THREE.Vector3 {
    return point.clone().applyMatrix4(this.inverseWorldMatrix);
  }

  transformDirection(dir: THREE.Vector3): THREE.Vector3 {
    return dir.clone().applyQuaternion(this.worldRotation);
  }

  inverseTransformDirection(dir: THREE.Vector3): THREE.Vector3 {
    const invRot = this.worldRotation.clone().invert();
    return dir.clone().applyQuaternion(invRot);
  }

  setParent(parent: Transform | null): void {
    this._parent = parent;
    this.markDirty();
  }

  setNode(node: TransformHierarchyNode): void {
    this._node = node;
  }

  markDirty(): void {
    this._dirty = true;
    if (this._node) {
      for (const child of this._node.children) {
        child.transform.markDirty();
      }
    }
  }

  private updateMatricesIfNeeded(): void {
    if (this._dirty) {
      this.updateMatrices();
    }
  }

  private updateMatrices(): void {
    this._localMatrix.compose(this._position, this._rotation, this._scale);

    if (this._parent) {
      this._parent.updateMatricesIfNeeded();
      this._worldMatrix.multiplyMatrices(this._parent._worldMatrix, this._localMatrix);
    } else {
      this._worldMatrix.copy(this._localMatrix);
    }

    this._inverseWorldMatrix.copy(this._worldMatrix).invert();
    this._dirty = false;
  }

  toJSON(): TransformData {
    return {
      position: [this._position.x, this._position.y, this._position.z],
      rotation: [this._rotation.x, this._rotation.y, this._rotation.z, this._rotation.w],
      scale: [this._scale.x, this._scale.y, this._scale.z],
    };
  }

  fromJSON(data: TransformData): void {
    this._position.set(...data.position);
    this._rotation.set(...data.rotation);
    this._scale.set(...data.scale);
    this._eulerAngles.setFromQuaternion(this._rotation);
    this.markDirty();
  }
}
