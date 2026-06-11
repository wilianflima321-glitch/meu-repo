// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import THREE from './webxr-vr-runtime';
import type { GrabState } from './webxr-vr-contracts';

export class GrabbingSystem {
  private grabbableObjects: Set<THREE.Object3D> = new Set();
  private grabStates: Map<string, GrabState> = new Map();
  private grabDistance: number = 0.1;
  constructor() {
    this.grabStates.set('left', {
      object: null,
      hand: 'left',
      offsetPosition: new THREE.Vector3(),
      offsetRotation: new THREE.Quaternion(),
    });
    this.grabStates.set('right', {
      object: null,
      hand: 'right',
      offsetPosition: new THREE.Vector3(),
      offsetRotation: new THREE.Quaternion(),
    });
  }
  addGrabbable(object: THREE.Object3D): void {
    this.grabbableObjects.add(object);
  }
  removeGrabbable(object: THREE.Object3D): void {
    this.grabbableObjects.delete(object);
  }
  tryGrab(hand: 'left' | 'right', position: THREE.Vector3, rotation: THREE.Quaternion): THREE.Object3D | null {
    const state = this.grabStates.get(hand);
    if (!state || state.object) return null; // Already grabbing
    let nearestObject: THREE.Object3D | null = null;
    let nearestDistance = this.grabDistance;
    for (const object of this.grabbableObjects) {
      const objectPos = new THREE.Vector3();
      object.getWorldPosition(objectPos);
      const distance = position.distanceTo(objectPos);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestObject = object;
      }
    }
    if (nearestObject) {
      const objectPos = new THREE.Vector3();
      const objectRot = new THREE.Quaternion();
      nearestObject.getWorldPosition(objectPos);
      nearestObject.getWorldQuaternion(objectRot);
      state.object = nearestObject;
      state.offsetPosition.copy(objectPos).sub(position);
      state.offsetRotation.copy(rotation.clone().invert().multiply(objectRot));
      return nearestObject;
    }
    return null;
  }
  release(hand: 'left' | 'right'): THREE.Object3D | null {
    const state = this.grabStates.get(hand);
    if (!state || !state.object) return null;
    const released = state.object;
    state.object = null;
    return released;
  }
  updateGrabbedObjects(
    leftPosition: THREE.Vector3 | null,
    leftRotation: THREE.Quaternion | null,
    rightPosition: THREE.Vector3 | null,
    rightRotation: THREE.Quaternion | null
  ): void {
    const leftState = this.grabStates.get('left');
    if (leftState?.object && leftPosition && leftRotation) {
      const newPos = leftPosition.clone().add(
        leftState.offsetPosition.clone().applyQuaternion(leftRotation)
      );
      const newRot = leftRotation.clone().multiply(leftState.offsetRotation);
      leftState.object.position.copy(newPos);
      leftState.object.quaternion.copy(newRot);
    }
    const rightState = this.grabStates.get('right');
    if (rightState?.object && rightPosition && rightRotation) {
      const newPos = rightPosition.clone().add(
        rightState.offsetPosition.clone().applyQuaternion(rightRotation)
      );
      const newRot = rightRotation.clone().multiply(rightState.offsetRotation);
      rightState.object.position.copy(newPos);
      rightState.object.quaternion.copy(newRot);
    }
  }
  isGrabbing(hand: 'left' | 'right'): boolean {
    const state = this.grabStates.get(hand);
    return state?.object !== null;
  }
  getGrabbedObject(hand: 'left' | 'right'): THREE.Object3D | null {
    return this.grabStates.get(hand)?.object || null;
  }
}
