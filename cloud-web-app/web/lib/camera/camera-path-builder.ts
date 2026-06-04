// @aethel-heavy-async-boundary Studio/camera path authoring runtime.
import * as THREE from 'three';
import type { CameraPath, EasingType } from './camera-system.contracts';

// ============================================================================
// CAMERA PATH BUILDER
// ============================================================================

export class CameraPathBuilder {
  private path: Partial<CameraPath> = {
    points: [],
    loop: false,
    easing: 'easeInOutQuad',
  };

  static create(id: string): CameraPathBuilder {
    return new CameraPathBuilder().id(id);
  }

  id(id: string): this {
    this.path.id = id;
    return this;
  }

  duration(seconds: number): this {
    this.path.duration = seconds;
    return this;
  }

  loop(loop = true): this {
    this.path.loop = loop;
    return this;
  }

  easing(easing: EasingType): this {
    this.path.easing = easing;
    return this;
  }

  point(
    position: { x: number; y: number; z: number },
    lookAt: { x: number; y: number; z: number },
    time: number,
    fov?: number
  ): this {
    this.path.points!.push({
      position: new THREE.Vector3(position.x, position.y, position.z),
      lookAt: new THREE.Vector3(lookAt.x, lookAt.y, lookAt.z),
      time,
      fov,
    });
    return this;
  }

  build(): CameraPath {
    if (!this.path.id) throw new Error('Path ID is required');
    if (!this.path.duration) throw new Error('Duration is required');
    if (this.path.points!.length < 2) throw new Error('At least 2 points required');

    // Sort points by time
    this.path.points!.sort((a, b) => a.time - b.time);

    return this.path as CameraPath;
  }
}
