/**
 * Camera System - Sistema de Câmera Avançado
 * 
 * Sistema completo com:
 * - Multiple camera modes
 * - Smooth follow/orbit
 * - Camera shake
 * - Transitions between cameras
 * - Cinematic effects
 * - FOV control
 * - Frustum culling helpers
 * - Camera paths
 * - DOF simulation
 * 
 * @module lib/camera/camera-system
 */

import * as THREE from 'three';
import { EventEmitter } from 'events';

// ============================================================================
// TYPES
// ============================================================================

export type CameraMode = 
  | 'free'
  | 'follow'
  | 'orbit'
  | 'first_person'
  | 'third_person'
  | 'top_down'
  | 'side_scroller'
  | 'cinematic'
  | 'fixed';

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  aspect: number;
}

export interface FollowSettings {
  target: THREE.Object3D | null;
  offset: THREE.Vector3;
  lookAtOffset: THREE.Vector3;
  smoothing: number;
  deadZone?: { x: number; y: number };
  lookAhead?: number;
}

export interface OrbitSettings {
  target: THREE.Vector3;
  distance: number;
  minDistance: number;
  maxDistance: number;
  azimuthAngle: number;
  polarAngle: number;
  minPolarAngle: number;
  maxPolarAngle: number;
  rotationSpeed: number;
  zoomSpeed: number;
  enableDamping: boolean;
  dampingFactor: number;
}

export interface ShakeSettings {
  intensity: number;
  frequency: number;
  duration: number;
  decay: boolean;
}

export interface CameraPath {
  id: string;
  points: CameraPathPoint[];
  loop: boolean;
  duration: number;
  easing: EasingType;
}

export interface CameraPathPoint {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov?: number;
  time: number; // 0-1 normalized
}

export type EasingType = 
  | 'linear'
  | 'easeInQuad'
  | 'easeOutQuad'
  | 'easeInOutQuad'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic';

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

const easingFunctions: Record<EasingType, (t: number) => number> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
};

// ============================================================================
// CAMERA CONTROLLER
// ============================================================================

export class CameraController extends EventEmitter {
  private camera: THREE.PerspectiveCamera;
  private mode: CameraMode = 'free';
  private config: CameraConfig;
  
  // Follow mode
  private followSettings: FollowSettings = {
    target: null,
    offset: new THREE.Vector3(0, 5, 10),
    lookAtOffset: new THREE.Vector3(0, 1, 0),
    smoothing: 0.1,
    lookAhead: 0,
  };
  
  // Orbit mode
  private orbitSettings: OrbitSettings = {
    target: new THREE.Vector3(0, 0, 0),
    distance: 10,
    minDistance: 2,
    maxDistance: 50,
    azimuthAngle: 0,
    polarAngle: Math.PI / 4,
    minPolarAngle: 0.1,
    maxPolarAngle: Math.PI - 0.1,
    rotationSpeed: 0.005,
    zoomSpeed: 0.1,
    enableDamping: true,
    dampingFactor: 0.05,
  };
  
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
  private transitionStart: { position: THREE.Vector3; quaternion: THREE.Quaternion; fov: number } | null = null;
  private transitionEnd: { position: THREE.Vector3; quaternion: THREE.Quaternion; fov: number } | null = null;
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
    
    this.config = {
      fov: 60,
      near: 0.1,
      far: 1000,
      aspect: window.innerWidth / window.innerHeight,
      ...config,
    };
    
    this.camera = new THREE.PerspectiveCamera(
      this.config.fov,
      this.config.aspect,
      this.config.near,
      this.config.far
    );
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
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
  
  // ============================================================================
  // MODE CONTROL
  // ============================================================================
  
  setMode(mode: CameraMode, transition = true, duration = 1): void {
    if (this.mode === mode) return;
    
    const oldMode = this.mode;
    this.mode = mode;
    
    this.emit('modeChanged', { from: oldMode, to: mode });
  }
  
  // ============================================================================
  // FOLLOW MODE
  // ============================================================================
  
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
  
  private updateFollow(deltaTime: number): void {
    const { target, offset, lookAtOffset, smoothing, lookAhead } = this.followSettings;
    if (!target) return;
    
    // Calculate target velocity for look-ahead
    if (lookAhead && lookAhead > 0) {
      this.targetVelocity.copy(target.position).sub(this.lastTargetPosition);
      this.lastTargetPosition.copy(target.position);
    }
    
    // Calculate desired position
    const desiredPosition = new THREE.Vector3();
    
    // Transform offset by target's rotation
    const worldOffset = offset.clone();
    worldOffset.applyQuaternion(target.quaternion);
    
    desiredPosition.copy(target.position).add(worldOffset);
    
    // Add look-ahead
    if (lookAhead && lookAhead > 0) {
      desiredPosition.add(this.targetVelocity.clone().multiplyScalar(lookAhead));
    }
    
    // Smooth interpolation
    this.camera.position.lerp(desiredPosition, smoothing);
    
    // Look at target
    const lookAtTarget = target.position.clone().add(lookAtOffset);
    this.camera.lookAt(lookAtTarget);
  }
  
  // ============================================================================
  // ORBIT MODE
  // ============================================================================
  
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
  
  private updateOrbit(deltaTime: number): void {
    const { target, distance, azimuthAngle, polarAngle, enableDamping, dampingFactor } = this.orbitSettings;
    
    // Calculate position from spherical coordinates
    const x = target.x + distance * Math.sin(polarAngle) * Math.cos(azimuthAngle);
    const y = target.y + distance * Math.cos(polarAngle);
    const z = target.z + distance * Math.sin(polarAngle) * Math.sin(azimuthAngle);
    
    const desiredPosition = new THREE.Vector3(x, y, z);
    
    if (enableDamping) {
      this.camera.position.lerp(desiredPosition, dampingFactor);
    } else {
      this.camera.position.copy(desiredPosition);
    }
    
    this.camera.lookAt(target);
  }
  
  // ============================================================================
  // FIRST/THIRD PERSON
  // ============================================================================
  
  private updateFirstPerson(deltaTime: number): void {
    const { target, lookAtOffset } = this.followSettings;
    if (!target) return;
    
    // Camera at target position with offset (usually at eye level)
    this.camera.position.copy(target.position).add(lookAtOffset);
    
    // Copy target's rotation
    this.camera.quaternion.copy(target.quaternion);
  }
  
  private updateThirdPerson(deltaTime: number): void {
    // Combine follow and orbit behavior
    const { target, offset, smoothing } = this.followSettings;
    if (!target) return;
    
    // Use orbit angles but follow target
    const { distance, azimuthAngle, polarAngle } = this.orbitSettings;
    
    const x = target.position.x + distance * Math.sin(polarAngle) * Math.cos(azimuthAngle);
    const y = target.position.y + distance * Math.cos(polarAngle);
    const z = target.position.z + distance * Math.sin(polarAngle) * Math.sin(azimuthAngle);
    
    const desiredPosition = new THREE.Vector3(x, y, z);
    
    this.camera.position.lerp(desiredPosition, smoothing);
    this.camera.lookAt(target.position);
  }
  
  // ============================================================================
  // TOP-DOWN / SIDE-SCROLLER
  // ============================================================================
  
  private updateTopDown(deltaTime: number): void {
    const { target, offset, smoothing } = this.followSettings;
    if (!target) return;
    
    // Position directly above target
    const desiredPosition = new THREE.Vector3(
      target.position.x,
      target.position.y + offset.y,
      target.position.z
    );
    
    this.camera.position.lerp(desiredPosition, smoothing);
    this.camera.lookAt(target.position);
  }
  
  private updateSideScroller(deltaTime: number): void {
    const { target, offset, smoothing, deadZone } = this.followSettings;
    if (!target) return;
    
    // Position to the side of target
    const desiredPosition = new THREE.Vector3(
      target.position.x + offset.x,
      target.position.y + offset.y,
      target.position.z + offset.z
    );
    
    // Apply dead zone
    if (deadZone) {
      const deltaX = desiredPosition.x - this.camera.position.x;
      const deltaY = desiredPosition.y - this.camera.position.y;
      
      if (Math.abs(deltaX) < deadZone.x) {
        desiredPosition.x = this.camera.position.x;
      }
      if (Math.abs(deltaY) < deadZone.y) {
        desiredPosition.y = this.camera.position.y;
      }
    }
    
    this.camera.position.lerp(desiredPosition, smoothing);
    this.camera.lookAt(new THREE.Vector3(target.position.x, target.position.y, target.position.z - 1));
  }
  
  // ============================================================================
  // CAMERA SHAKE
  // ============================================================================
  
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
    
    // Calculate intensity with decay
    let currentIntensity = this.shakeIntensity;
    if (this.shakeDecay) {
      currentIntensity *= 1 - (this.shakeElapsed / this.shakeDuration);
    }
    
    // Perlin-like noise for smooth shake
    const time = this.shakeElapsed * this.shakeFrequency;
    
    this.shakeOffset.set(
      (Math.sin(time * 1.1) + Math.sin(time * 2.3)) * currentIntensity * 0.5,
      (Math.sin(time * 1.7) + Math.sin(time * 1.9)) * currentIntensity * 0.5,
      (Math.sin(time * 2.1) + Math.sin(time * 1.3)) * currentIntensity * 0.5
    );
    
    this.camera.position.add(this.shakeOffset);
  }
  
  // ============================================================================
  // CAMERA PATHS
  // ============================================================================
  
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
    
    // Find the two points to interpolate between
    const t = easingFunctions[path.easing](this.pathProgress);
    
    let p1: CameraPathPoint | null = null;
    let p2: CameraPathPoint | null = null;
    
    for (let i = 0; i < path.points.length - 1; i++) {
      if (t >= path.points[i].time && t <= path.points[i + 1].time) {
        p1 = path.points[i];
        p2 = path.points[i + 1];
        break;
      }
    }
    
    if (!p1 || !p2) return;
    
    // Interpolate between points
    const segmentT = (t - p1.time) / (p2.time - p1.time);
    
    this.camera.position.lerpVectors(p1.position, p2.position, segmentT);
    
    const lookAt = new THREE.Vector3().lerpVectors(p1.lookAt, p2.lookAt, segmentT);
    this.camera.lookAt(lookAt);
    
    if (p1.fov !== undefined && p2.fov !== undefined) {
      this.camera.fov = p1.fov + (p2.fov - p1.fov) * segmentT;
      this.camera.updateProjectionMatrix();
    }
  }
  
  // ============================================================================
  // TRANSITIONS
  // ============================================================================
  
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
    
    // Store start state
    this.transitionStart = {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      fov: this.camera.fov,
    };
    
    // Calculate end state
    const endCamera = new THREE.PerspectiveCamera();
    endCamera.position.copy(position);
    endCamera.lookAt(lookAt);
    
    this.transitionEnd = {
      position: position.clone(),
      quaternion: endCamera.quaternion.clone(),
      fov: options.fov ?? this.camera.fov,
    };
    
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
    
    const t = easingFunctions[this.transitionEasing](this.transitionProgress);
    
    // Interpolate position
    this.camera.position.lerpVectors(
      this.transitionStart.position,
      this.transitionEnd.position,
      t
    );
    
    // Slerp quaternion
    this.camera.quaternion.slerpQuaternions(
      this.transitionStart.quaternion,
      this.transitionEnd.quaternion,
      t
    );
    
    // Interpolate FOV
    this.camera.fov = this.transitionStart.fov + 
      (this.transitionEnd.fov - this.transitionStart.fov) * t;
    this.camera.updateProjectionMatrix();
  }
  
  // ============================================================================
  // FOV CONTROL
  // ============================================================================
  
  setFOV(fov: number, animate = false, duration = 0.5): void {
    if (animate) {
      this.animateFOV(fov, duration);
    } else {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }
  
  private fovAnimation: { start: number; end: number; duration: number; elapsed: number } | null = null;
  
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
    
    this.fovAnimation.elapsed += deltaTime;
    const t = Math.min(1, this.fovAnimation.elapsed / this.fovAnimation.duration);
    const eased = easingFunctions.easeInOutQuad(t);
    
    this.camera.fov = this.fovAnimation.start + 
      (this.fovAnimation.end - this.fovAnimation.start) * eased;
    this.camera.updateProjectionMatrix();
    
    if (t >= 1) {
      this.fovAnimation = null;
    }
  }
  
  // ============================================================================
  // UPDATE
  // ============================================================================
  
  update(deltaTime: number): void {
    // Handle transitions first
    if (this.isTransitioning) {
      this.updateTransition(deltaTime);
      return;
    }
    
    // Handle path playback
    if (this.pathPlaying) {
      this.updatePath(deltaTime);
      return;
    }
    
    // Update based on mode
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
      // 'free', 'fixed', 'cinematic' don't auto-update
    }
    
    // Apply shake
    this.updateShake(deltaTime);
    
    // Update FOV animation
    this.updateFOVAnimation(deltaTime);
  }
  
  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  setAspect(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
  
  resize(width: number, height: number): void {
    this.setAspect(width / height);
  }
  
  worldToScreen(worldPos: THREE.Vector3, screenWidth: number, screenHeight: number): THREE.Vector2 {
    const projected = worldPos.clone().project(this.camera);
    
    return new THREE.Vector2(
      (projected.x + 1) * screenWidth / 2,
      (-projected.y + 1) * screenHeight / 2
    );
  }
  
  screenToWorld(screenPos: THREE.Vector2, screenWidth: number, screenHeight: number, depth = 0.5): THREE.Vector3 {
    const ndc = new THREE.Vector3(
      (screenPos.x / screenWidth) * 2 - 1,
      -(screenPos.y / screenHeight) * 2 + 1,
      depth
    );
    
    return ndc.unproject(this.camera);
  }
  
  getRay(screenPos: THREE.Vector2, screenWidth: number, screenHeight: number): THREE.Raycaster {
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2(
      (screenPos.x / screenWidth) * 2 - 1,
      -(screenPos.y / screenHeight) * 2 + 1
    );
    
    raycaster.setFromCamera(ndc, this.camera);
    return raycaster;
  }
  
  isInFrustum(object: THREE.Object3D): boolean {
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);
    
    if (object instanceof THREE.Mesh && object.geometry.boundingSphere) {
      const sphere = object.geometry.boundingSphere.clone();
      sphere.applyMatrix4(object.matrixWorld);
      return frustum.intersectsSphere(sphere);
    }
    
    return frustum.containsPoint(object.position);
  }
  
  dispose(): void {
    this.stopShake();
    this.stopPath();
    this.removeAllListeners();
  }
}

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

// ============================================================================
// REACT HOOKS
// ============================================================================

import { useState, useRef, useEffect, useContext, createContext, useCallback, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

const CameraContext = createContext<CameraController | null>(null);

export function CameraProvider({ 
  children,
  config,
}: { 
  children: React.ReactNode;
  config?: Partial<CameraConfig>;
}) {
  const controllerRef = useRef<CameraController>(new CameraController(config));
  
  useEffect(() => {
    const controller = controllerRef.current;
    return () => {
      controller.dispose();
    };
  }, []);
  
  return (
    <CameraContext.Provider value={controllerRef.current}>
      {children}
    </CameraContext.Provider>
  );
}

export function useCameraController() {
  const controller = useContext(CameraContext);
  if (!controller) {
    throw new Error('useCameraController must be used within a CameraProvider');
  }
  return controller;
}

export function useCameraUpdate() {
  const controller = useCameraController();
  
  useFrame((state, delta) => {
    controller.update(delta);
  });
  
  return controller;
}

export function useCameraFollow(target: THREE.Object3D | null, settings?: Partial<FollowSettings>) {
  const controller = useCameraController();
  
  useEffect(() => {
    if (target) {
      controller.setFollowTarget(target, settings);
      controller.setMode('follow');
    }
    
    return () => {
      controller.setFollowTarget(null);
    };
  }, [controller, target, settings]);
}

export function useCameraShake() {
  const controller = useCameraController();
  
  const shake = useCallback((settings?: Partial<ShakeSettings>) => {
    controller.shake(settings);
  }, [controller]);
  
  const stop = useCallback(() => {
    controller.stopShake();
  }, [controller]);
  
  return { shake, stop };
}

export function useCameraMode() {
  const controller = useCameraController();
  const [mode, setModeState] = useState<CameraMode>(controller.getMode());
  
  useEffect(() => {
    const handleModeChange = ({ to }: { to: CameraMode }) => {
      setModeState(to);
    };
    
    controller.on('modeChanged', handleModeChange);
    
    return () => {
      controller.off('modeChanged', handleModeChange);
    };
  }, [controller]);
  
  const setMode = useCallback((newMode: CameraMode) => {
    controller.setMode(newMode);
  }, [controller]);
  
  return { mode, setMode };
}

const __defaultExport = {
  CameraController,
  CameraPathBuilder,
  CameraProvider,
  useCameraController,
  useCameraUpdate,
  useCameraFollow,
  useCameraShake,
  useCameraMode,
};

export default __defaultExport;
