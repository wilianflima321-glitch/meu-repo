// @aethel-heavy-async-boundary Studio/viewport runtime module; never import from public/dashboard/admin route shells.
/**
 * Camera System
 *
 * Governed camera runtime for viewport/editor modes, follow/orbit,
 * cinematic paths, shake, FOV, and culling helpers.
 *
 * @module lib/camera/camera-system
 */

import { EventEmitter } from 'events';
import { THREE } from '../three/static';
import { easingFunctions } from './camera-system.easing';
import {
  CameraPathBuilder,
  applyCameraPathFrame,
  applyCameraTransitionFrame,
  createDefaultCameraConfig,
  createDefaultFollowSettings,
  createCameraTransitionEnd,
  createDefaultOrbitSettings,
  getCameraRay,
  isObjectInCameraFrustum,
  screenToWorld as projectScreenToWorld,
  type CameraFovAnimation,
  type CameraTransitionFrame,
  updateCameraFovAnimation,
  updateCameraShakeOffset,
  updateFirstPersonCamera,
  updateFollowCamera,
  updateOrbitCamera,
  updateSideScrollerCamera,
  updateThirdPersonCamera,
  updateTopDownCamera,
  worldToScreen as projectWorldToScreen,
} from './camera-system-runtime';
import { CameraProvider, useCameraController, useCameraFollow, useCameraMode, useCameraShake, useCameraUpdate } from './camera-system-react';
import type {
  CameraConfig,
  CameraMode,
  CameraPath,
  EasingType,
  FollowSettings,
  OrbitSettings,
  ShakeSettings,
} from './camera-system.contracts';

export { CameraProvider, useCameraController, useCameraFollow, useCameraMode, useCameraShake, useCameraUpdate } from './camera-system-react';
export { easingFunctions } from './camera-system.easing';
export {
  CameraPathBuilder,
  applyCameraPathFrame,
  applyCameraTransitionFrame,
  createDefaultCameraConfig,
  createDefaultFollowSettings,
  createCameraTransitionEnd,
  createDefaultOrbitSettings,
} from './camera-system-runtime';
export type {
  CameraConfig,
  CameraMode,
  CameraPath,
  EasingType,
  FollowSettings,
  OrbitSettings,
  ShakeSettings,
} from './camera-system.contracts';

export class CameraController extends EventEmitter {
  private camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'free';
  private config: CameraConfig;

  // Follow mode
  private followSettings: FollowSettings = createDefaultFollowSettings();

  // Orbit mode
  private orbitSettings: OrbitSettings = createDefaultOrbitSettings();

  // Shake
  private shakeIntensity = 0;
  private shakeFrequency = 0;
  private shakeDecay = true;
  private shakeDuration = 0;
  private shakeElapsed = 0;
  private shakeOffset = new THREE.Vector3();

  // Path following
  private currentPath: CameraPath | null = null;
  private pathProgress = 0;
  private pathPlaying = false;

  // Transition
  private isTransitioning = false;
  private transitionStart: CameraTransitionFrame | null = null;
  private transitionEnd: CameraTransitionFrame | null = null;
  private transitionDuration = 1;
  private transitionProgress = 0;
  private transitionEasing: EasingType = 'easeInOutQuad';

  // Input state
  private inputState = {
    mouseDown: false,
    lastMouseX: 0,
    lastMouseY: 0,
    deltaX: 0,
    deltaY: 0,
  };

  // Temp vectors
  private tempVec = new THREE.Vector3();
  private tempQuat = new THREE.Quaternion();
  private targetVelocity = new THREE.Vector3();
  private lastTargetPosition = new THREE.Vector3();

  constructor(config: Partial<CameraConfig> = {}) {
    super();

    this.config = createDefaultCameraConfig(config);

    this.camera = new THREE.PerspectiveCamera(
      this.config.fov,
      this.config.aspect,
      this.config.near,
      this.config.far
    );
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getMode(): CameraMode {
    return this.mode;
  }

  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  getRotation(): THREE.Euler {
    return this.camera.rotation.clone();
  }

  getQuaternion(): THREE.Quaternion {
    return this.camera.quaternion.clone();
  }

  getFOV(): number {
    return this.camera.fov;
  }

  setMode(mode: CameraMode, transition = true, duration = 1): void {
    if (this.mode === mode) return;

    const oldMode = this.mode;
    this.mode = mode;

    this.emit('modeChanged', { from: oldMode, to: mode });
  }

  setFollowTarget(target: THREE.Object3D | null, settings?: Partial<FollowSettings>): void {
    this.followSettings.target = target;

    if (settings) {
      Object.assign(this.followSettings, settings);
    }

    if (target) {
      this.lastTargetPosition.copy(target.position);
    }
  }

  setFollowOffset(offset: THREE.Vector3): void {
    this.followSettings.offset.copy(offset);
  }

  setFollowSmoothing(smoothing: number): void {
    this.followSettings.smoothing = Math.max(0.01, Math.min(1, smoothing));
  }

  private updateFollow(_deltaTime: number): void {
    updateFollowCamera({
      camera: this.camera,
      settings: this.followSettings,
      targetVelocity: this.targetVelocity,
      lastTargetPosition: this.lastTargetPosition,
    });
  }

  setOrbitTarget(target: THREE.Vector3): void {
    this.orbitSettings.target.copy(target);
  }

  setOrbitDistance(distance: number): void {
    this.orbitSettings.distance = Math.max(
      this.orbitSettings.minDistance,
      Math.min(this.orbitSettings.maxDistance, distance)
    );
  }

  rotateOrbit(deltaAzimuth: number, deltaPolar: number): void {
    this.orbitSettings.azimuthAngle += deltaAzimuth * this.orbitSettings.rotationSpeed;
    this.orbitSettings.polarAngle = Math.max(
      this.orbitSettings.minPolarAngle,
      Math.min(
        this.orbitSettings.maxPolarAngle,
        this.orbitSettings.polarAngle + deltaPolar * this.orbitSettings.rotationSpeed
      )
    );
  }

  zoomOrbit(delta: number): void {
    this.orbitSettings.distance = Math.max(
      this.orbitSettings.minDistance,
      Math.min(
        this.orbitSettings.maxDistance,
        this.orbitSettings.distance * (1 - delta * this.orbitSettings.zoomSpeed)
      )
    );
  }

  private updateOrbit(_deltaTime: number): void {
    updateOrbitCamera(this.camera, this.orbitSettings);
  }

  private updateFirstPerson(_deltaTime: number): void {
    updateFirstPersonCamera(this.camera, this.followSettings);
  }

  private updateThirdPerson(_deltaTime: number): void {
    updateThirdPersonCamera(this.camera, this.followSettings, this.orbitSettings);
  }

  private updateTopDown(_deltaTime: number): void {
    updateTopDownCamera(this.camera, this.followSettings);
  }

  private updateSideScroller(_deltaTime: number): void {
    updateSideScrollerCamera(this.camera, this.followSettings);
  }

  shake(settings: Partial<ShakeSettings> = {}): void {
    this.shakeIntensity = settings.intensity ?? 0.5;
    this.shakeFrequency = settings.frequency ?? 20;
    this.shakeDuration = settings.duration ?? 0.5;
    this.shakeDecay = settings.decay ?? true;
    this.shakeElapsed = 0;

    this.emit('shakeStarted', settings);
  }

  stopShake(): void {
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeElapsed = 0;
    this.shakeOffset.set(0, 0, 0);

    this.emit('shakeStopped');
  }

  private updateShake(deltaTime: number): void {
    if (this.shakeIntensity <= 0) return;

    this.shakeElapsed += deltaTime;
    if (this.shakeElapsed >= this.shakeDuration) {
      this.stopShake();
      return;
    }

    updateCameraShakeOffset({
      offset: this.shakeOffset,
      elapsed: this.shakeElapsed,
      duration: this.shakeDuration,
      frequency: this.shakeFrequency,
      intensity: this.shakeIntensity,
      decay: this.shakeDecay,
    });
    this.camera.position.add(this.shakeOffset);
  }

  playPath(path: CameraPath, onComplete?: () => void): void {
    this.currentPath = path;
    this.pathProgress = 0;
    this.pathPlaying = true;

    this.emit('pathStarted', { pathId: path.id });

    if (onComplete) {
      const handler = () => {
        onComplete();
        this.off('pathCompleted', handler);
      };
      this.on('pathCompleted', handler);
    }
  }

  stopPath(): void {
    this.pathPlaying = false;
    this.currentPath = null;

    this.emit('pathStopped');
  }

  private updatePath(deltaTime: number): void {
    if (!this.currentPath || !this.pathPlaying) return;

    const path = this.currentPath;
    this.pathProgress += deltaTime / path.duration;

    if (this.pathProgress >= 1) {
      if (path.loop) {
        this.pathProgress = 0;
      } else {
        this.pathProgress = 1;
        this.pathPlaying = false;
        this.emit('pathCompleted', { pathId: path.id });
      }
    }

    applyCameraPathFrame({
      camera: this.camera,
      path,
      progress: this.pathProgress,
      easing: easingFunctions[path.easing],
    });
  }

  transitionTo(
    position: THREE.Vector3,
    lookAt: THREE.Vector3,
    options: {
      duration?: number;
      fov?: number;
      easing?: EasingType;
      onComplete?: () => void;
    } = {}
  ): void {
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.transitionDuration = options.duration ?? 1;
    this.transitionEasing = options.easing ?? 'easeInOutQuad';
    this.transitionStart = {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      fov: this.camera.fov,
    };
    this.transitionEnd = createCameraTransitionEnd(position, lookAt, options.fov ?? this.camera.fov);
    this.emit('transitionStarted');

    if (options.onComplete) {
      const handler = () => {
        options.onComplete!();
        this.off('transitionCompleted', handler);
      };
      this.on('transitionCompleted', handler);
    }
  }


  private updateTransition(deltaTime: number): void {
    if (!this.isTransitioning || !this.transitionStart || !this.transitionEnd) return;

    this.transitionProgress += deltaTime / this.transitionDuration;
    if (this.transitionProgress >= 1) {
      this.transitionProgress = 1;
      this.isTransitioning = false;
      this.emit('transitionCompleted');
    }

    applyCameraTransitionFrame({
      camera: this.camera,
      start: this.transitionStart,
      end: this.transitionEnd,
      progress: this.transitionProgress,
      easing: easingFunctions[this.transitionEasing],
    });
  }

  setFOV(fov: number, animate = false, duration = 0.5): void {
    if (animate) {
      this.animateFOV(fov, duration);
    } else {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  private fovAnimation: CameraFovAnimation | null = null;

  private animateFOV(targetFov: number, duration: number): void {
    this.fovAnimation = {
      start: this.camera.fov,
      end: targetFov,
      duration,
      elapsed: 0,
    };
  }

  private updateFOVAnimation(deltaTime: number): void {
    if (!this.fovAnimation) return;

    this.fovAnimation = updateCameraFovAnimation({
      camera: this.camera,
      animation: this.fovAnimation,
      deltaTime,
      easing: easingFunctions.easeInOutQuad,
    });
  }

  update(deltaTime: number): void {
    if (this.isTransitioning) {
      this.updateTransition(deltaTime);
      return;
    }

    if (this.pathPlaying) {
      this.updatePath(deltaTime);
      return;
    }

    switch (this.mode) {
      case 'follow':
        this.updateFollow(deltaTime);
        break;
      case 'orbit':
        this.updateOrbit(deltaTime);
        break;
      case 'first_person':
        this.updateFirstPerson(deltaTime);
        break;
      case 'third_person':
        this.updateThirdPerson(deltaTime);
        break;
      case 'top_down':
        this.updateTopDown(deltaTime);
        break;
      case 'side_scroller':
        this.updateSideScroller(deltaTime);
        break;
    }

    // Apply shake
    this.updateShake(deltaTime);

    this.updateFOVAnimation(deltaTime);
  }

  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  resize(width: number, height: number): void {
    this.setAspect(width / height);
  }

  worldToScreen(worldPos: THREE.Vector3, screenWidth: number, screenHeight: number): THREE.Vector2 {
    return projectWorldToScreen(this.camera, worldPos, screenWidth, screenHeight);
  }

  screenToWorld(screenPos: THREE.Vector2, screenWidth: number, screenHeight: number, depth = 0.5): THREE.Vector3 {
    return projectScreenToWorld(this.camera, screenPos, screenWidth, screenHeight, depth);
  }

  getRay(screenPos: THREE.Vector2, screenWidth: number, screenHeight: number): THREE.Raycaster {
    return getCameraRay(this.camera, screenPos, screenWidth, screenHeight);
  }

  isInFrustum(object: THREE.Object3D): boolean {
    return isObjectInCameraFrustum(this.camera, object);
  }

  dispose(): void {
    this.stopShake();
    this.stopPath();
    this.removeAllListeners();
  }
}

const __defaultExport = {
  CameraController,
  CameraPathBuilder,
  applyCameraPathFrame,
  applyCameraTransitionFrame,
  CameraProvider,
  useCameraController,
  useCameraUpdate,
  useCameraFollow,
  useCameraShake,
  useCameraMode,
};

export default __defaultExport;
