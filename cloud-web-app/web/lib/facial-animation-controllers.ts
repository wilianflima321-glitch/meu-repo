// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';

export class BlinkController {
  private blinkInterval: number = 4; // Seconds between blinks
  private blinkDuration: number = 0.15;
  private blinkVariation: number = 2;

  private timeSinceLastBlink: number = 0;
  private nextBlinkTime: number;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;

  constructor() {
    this.nextBlinkTime = this.getNextBlinkTime();
  }

  private getNextBlinkTime(): number {
    return this.blinkInterval + (Math.random() - 0.5) * this.blinkVariation * 2;
  }

  update(deltaTime: number): { leftEye: number; rightEye: number } {
    this.timeSinceLastBlink += deltaTime;

    if (!this.isBlinking && this.timeSinceLastBlink >= this.nextBlinkTime) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }

    if (this.isBlinking) {
      this.blinkProgress += deltaTime / this.blinkDuration;

      if (this.blinkProgress >= 1) {
        this.isBlinking = false;
        this.timeSinceLastBlink = 0;
        this.nextBlinkTime = this.getNextBlinkTime();
        this.blinkProgress = 0;
      }
    }

    // Blink curve: quick close, slower open
    let blinkWeight = 0;
    if (this.isBlinking) {
      const t = this.blinkProgress;
      if (t < 0.3) {
        // Close phase (fast)
        blinkWeight = t / 0.3;
      } else {
        // Open phase (slower)
        blinkWeight = 1 - (t - 0.3) / 0.7;
      }
    }

    return {
      leftEye: 1 - blinkWeight,
      rightEye: 1 - blinkWeight,
    };
  }

  triggerBlink(): void {
    if (!this.isBlinking) {
      this.isBlinking = true;
      this.blinkProgress = 0;
    }
  }

  setBlinkRate(blinksPerMinute: number): void {
    this.blinkInterval = 60 / blinksPerMinute;
  }
}

// ============================================================================
// EYE TRACKING
// ============================================================================

export class EyeTracker {
  private leftEyeBone: string = 'LeftEye';
  private rightEyeBone: string = 'RightEye';
  private headBone: string = 'Head';

  private currentTarget: THREE.Vector3 = new THREE.Vector3(0, 1.6, 10);
  private targetVelocity: THREE.Vector3 = new THREE.Vector3();

  private saccadeInterval: number = 0.2;
  private saccadeTime: number = 0;
  private saccadeOffset: THREE.Vector2 = new THREE.Vector2();

  private maxYaw: number = 30 * Math.PI / 180; // Max horizontal rotation
  private maxPitch: number = 20 * Math.PI / 180; // Max vertical rotation

  update(
    deltaTime: number,
    headPosition: THREE.Vector3,
    headRotation: THREE.Quaternion,
    target: THREE.Vector3 | null
  ): { leftEye: THREE.Quaternion; rightEye: THREE.Quaternion } {
    // Update target with smoothing
    if (target) {
      this.currentTarget.lerp(target, Math.min(1, deltaTime * 5));
    }

    // Micro-saccades
    this.saccadeTime += deltaTime;
    if (this.saccadeTime >= this.saccadeInterval) {
      this.saccadeTime = 0;
      this.saccadeOffset.set(
        (Math.random() - 0.5) * 0.02,
        (Math.random() - 0.5) * 0.02
      );
    }

    // Calculate look direction
    const lookDirection = this.currentTarget.clone().sub(headPosition).normalize();

    // Transform to head space
    const headInverse = headRotation.clone().invert();
    lookDirection.applyQuaternion(headInverse);

    // Add saccade
    lookDirection.x += this.saccadeOffset.x;
    lookDirection.y += this.saccadeOffset.y;

    // Calculate angles
    const yaw = Math.atan2(lookDirection.x, lookDirection.z);
    const pitch = Math.asin(Math.max(-1, Math.min(1, lookDirection.y)));

    // Clamp to limits
    const clampedYaw = Math.max(-this.maxYaw, Math.min(this.maxYaw, yaw));
    const clampedPitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, pitch));

    // Create rotations
    const eyeRotation = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(clampedPitch, clampedYaw, 0, 'YXZ')
    );

    // Slight convergence for close targets
    const distance = this.currentTarget.distanceTo(headPosition);
    const convergence = Math.max(0, 0.05 * (1 - distance / 2));

    const leftEyeRotation = eyeRotation.clone().multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), convergence)
    );

    const rightEyeRotation = eyeRotation.clone().multiply(
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -convergence)
    );

    return {
      leftEye: leftEyeRotation,
      rightEye: rightEyeRotation,
    };
  }

  setTarget(target: THREE.Vector3): void {
    this.currentTarget.copy(target);
  }

  setLimits(maxYaw: number, maxPitch: number): void {
    this.maxYaw = maxYaw;
    this.maxPitch = maxPitch;
  }
}
