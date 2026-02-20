import * as THREE from 'three';

import type { FootLockState, TrajectoryPoint } from './motion-matching-types';

export class FootLockingIK {
  private leftFootState: FootLockState = {
    locked: false,
    lockPosition: new THREE.Vector3(),
    lockRotation: new THREE.Quaternion(),
    unlockProgress: 1,
  };

  private rightFootState: FootLockState = {
    locked: false,
    lockPosition: new THREE.Vector3(),
    lockRotation: new THREE.Quaternion(),
    unlockProgress: 1,
  };

  private lockThreshold = 0.1;
  private unlockThreshold = 0.3;
  private maxLockDistance = 0.3;

  update(
    leftFootPos: THREE.Vector3,
    leftFootVel: THREE.Vector3,
    leftFootRot: THREE.Quaternion,
    rightFootPos: THREE.Vector3,
    rightFootVel: THREE.Vector3,
    rightFootRot: THREE.Quaternion,
    deltaTime: number
  ): { leftFoot: { position: THREE.Vector3; rotation: THREE.Quaternion }; rightFoot: { position: THREE.Vector3; rotation: THREE.Quaternion } } {
    const leftResult = this.updateFoot(this.leftFootState, leftFootPos, leftFootVel, leftFootRot, deltaTime);
    const rightResult = this.updateFoot(this.rightFootState, rightFootPos, rightFootVel, rightFootRot, deltaTime);

    return {
      leftFoot: leftResult,
      rightFoot: rightResult,
    };
  }

  private updateFoot(
    state: FootLockState,
    position: THREE.Vector3,
    velocity: THREE.Vector3,
    rotation: THREE.Quaternion,
    deltaTime: number
  ): { position: THREE.Vector3; rotation: THREE.Quaternion } {
    const speed = velocity.length();

    if (!state.locked) {
      if (speed < this.lockThreshold) {
        state.locked = true;
        state.lockPosition.copy(position);
        state.lockRotation.copy(rotation);
        state.unlockProgress = 0;
      }
      return { position, rotation };
    }

    const distance = position.distanceTo(state.lockPosition);

    if (speed > this.unlockThreshold || distance > this.maxLockDistance) {
      state.unlockProgress += deltaTime * 5;
      if (state.unlockProgress >= 1) {
        state.locked = false;
        state.unlockProgress = 1;
        return { position, rotation };
      }
    }

    const t = state.unlockProgress;
    const blendedPosition = state.lockPosition.clone().lerp(position, t);
    const blendedRotation = state.lockRotation.clone().slerp(rotation, t);

    return { position: blendedPosition, rotation: blendedRotation };
  }

  reset(): void {
    this.leftFootState.locked = false;
    this.leftFootState.unlockProgress = 1;
    this.rightFootState.locked = false;
    this.rightFootState.unlockProgress = 1;
  }
}

export class TrajectoryPredictor {
  private predictionTime: number;
  private pointCount: number;

  constructor(predictionTime = 1.0, pointCount = 5) {
    this.predictionTime = predictionTime;
    this.pointCount = pointCount;
  }

  predict(
    currentPosition: THREE.Vector3,
    currentVelocity: THREE.Vector3,
    currentFacing: THREE.Vector2,
    desiredVelocity: THREE.Vector3,
    desiredFacing: THREE.Vector2,
    stickInput: THREE.Vector2
  ): TrajectoryPoint[] {
    const points: TrajectoryPoint[] = [];
    const dt = this.predictionTime / this.pointCount;

    let pos = currentPosition.clone();
    let vel = currentVelocity.clone();
    let facing = currentFacing.clone();

    const acceleration = 10;
    const turnSpeed = 5;

    for (let i = 0; i < this.pointCount; i++) {
      const t = (i + 1) * dt;

      const velDiff = desiredVelocity.clone().sub(vel);
      const velDiffLength = velDiff.length();
      if (velDiffLength > 0.01) {
        const accel = velDiff.normalize().multiplyScalar(Math.min(acceleration * dt, velDiffLength));
        vel.add(accel);
      }

      pos = pos.clone().add(vel.clone().multiplyScalar(dt));

      const facingDiff = desiredFacing.clone().sub(facing);
      const maxTurn = turnSpeed * dt;
      if (facingDiff.length() > maxTurn) {
        facingDiff.normalize().multiplyScalar(maxTurn);
      }
      facing.add(facingDiff).normalize();

      points.push({
        position: pos.clone(),
        facing: facing.clone(),
        time: t,
      });
    }

    return points;
  }

  predictFromInput(
    currentPosition: THREE.Vector3,
    currentVelocity: THREE.Vector3,
    currentFacing: number,
    inputDirection: THREE.Vector2,
    inputMagnitude: number,
    maxSpeed: number
  ): TrajectoryPoint[] {
    const desiredVelocity = new THREE.Vector3(
      inputDirection.x * inputMagnitude * maxSpeed,
      0,
      inputDirection.y * inputMagnitude * maxSpeed
    );

    const desiredFacing =
      inputMagnitude > 0.1
        ? new THREE.Vector2(inputDirection.x, inputDirection.y).normalize()
        : new THREE.Vector2(Math.sin(currentFacing), Math.cos(currentFacing));

    const currentFacingVec = new THREE.Vector2(Math.sin(currentFacing), Math.cos(currentFacing));

    return this.predict(
      currentPosition,
      currentVelocity,
      currentFacingVec,
      desiredVelocity,
      desiredFacing,
      inputDirection
    );
  }
}
