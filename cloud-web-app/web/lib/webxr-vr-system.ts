/**
 * WEBXR / VR SYSTEM - Aethel Engine
 * 
 * Sistema completo de realidade virtual e aumentada para web.
 * 
 * FEATURES:
 * - WebXR Device API
 * - Hand tracking
 * - Eye tracking (foveated rendering)
 * - Controller input
 * - Haptic feedback
 * - Spatial anchors
 * - Passthrough AR
 * - Guardian/boundary system
 * - Teleportation locomotion
 * - Smooth locomotion
 * - Snap/smooth turning
 * - Grabbing/interaction
 * - UI panels in VR
 */

import * as THREE from 'three';
import { HapticsManager, VRUIPanel } from './webxr-vr-ui-haptics';
import type {
  GrabState,
  HandJointData,
  TeleportTarget,
  XRAnchor,
  XRConfig,
  XRControllerState,
  XRFeature,
  XRHandState,
  XRHitTestResult,
} from './webxr-vr-types';
import { XR_HAND_JOINTS } from './webxr-vr-types';
export { HapticsManager, VRUIPanel } from './webxr-vr-ui-haptics';
export type {
  GrabState,
  HandJointData,
  TeleportTarget,
  XRAnchor,
  XRConfig,
  XRControllerState,
  XRFeature,
  XRHandState,
  XRHitTestResult,
} from './webxr-vr-types';
export { XR_HAND_JOINTS } from './webxr-vr-types';

// ============================================================================
// HAND TRACKING
// ============================================================================

import { HandTracker } from './webxr-hand-tracker';

export { HandTracker } from './webxr-hand-tracker';

// ============================================================================
// CONTROLLER TRACKER
// ============================================================================

export class ControllerTracker {
  private controllerStates: Map<string, XRControllerState> = new Map();
  
  constructor() {
    this.initializeControllerState('left');
    this.initializeControllerState('right');
  }
  
  private initializeControllerState(hand: 'left' | 'right'): void {
    this.controllerStates.set(hand, {
      hand,
      position: new THREE.Vector3(),
      rotation: new THREE.Quaternion(),
      connected: false,
      trigger: 0,
      grip: 0,
      thumbstick: new THREE.Vector2(),
      thumbstickPressed: false,
      primaryButton: false,
      secondaryButton: false,
      selectStart: false,
      selectEnd: false,
      squeezeStart: false,
      squeezeEnd: false,
    });
  }
  
  updateFromGamepad(hand: 'left' | 'right', gamepad: Gamepad, pose: XRPose | null): void {
    const state = this.controllerStates.get(hand);
    if (!state) return;
    
    // Update position and rotation
    if (pose) {
      state.position.set(
        pose.transform.position.x,
        pose.transform.position.y,
        pose.transform.position.z
      );
      state.rotation.set(
        pose.transform.orientation.x,
        pose.transform.orientation.y,
        pose.transform.orientation.z,
        pose.transform.orientation.w
      );
      state.connected = true;
    } else {
      state.connected = false;
    }
    
    // Update buttons and axes
    if (gamepad.buttons.length > 0) {
      state.trigger = gamepad.buttons[0]?.value || 0;
    }
    if (gamepad.buttons.length > 1) {
      state.grip = gamepad.buttons[1]?.value || 0;
    }
    if (gamepad.buttons.length > 3) {
      state.thumbstickPressed = gamepad.buttons[3]?.pressed || false;
    }
    if (gamepad.buttons.length > 4) {
      state.primaryButton = gamepad.buttons[4]?.pressed || false;
    }
    if (gamepad.buttons.length > 5) {
      state.secondaryButton = gamepad.buttons[5]?.pressed || false;
    }
    
    // Thumbstick
    if (gamepad.axes.length >= 4) {
      state.thumbstick.set(
        gamepad.axes[2] || 0,
        gamepad.axes[3] || 0
      );
    }
    
    // Reset events
    state.selectStart = false;
    state.selectEnd = false;
    state.squeezeStart = false;
    state.squeezeEnd = false;
  }
  
  handleSelectStart(hand: 'left' | 'right'): void {
    const state = this.controllerStates.get(hand);
    if (state) state.selectStart = true;
  }
  
  handleSelectEnd(hand: 'left' | 'right'): void {
    const state = this.controllerStates.get(hand);
    if (state) state.selectEnd = true;
  }
  
  handleSqueezeStart(hand: 'left' | 'right'): void {
    const state = this.controllerStates.get(hand);
    if (state) state.squeezeStart = true;
  }
  
  handleSqueezeEnd(hand: 'left' | 'right'): void {
    const state = this.controllerStates.get(hand);
    if (state) state.squeezeEnd = true;
  }
  
  getControllerState(hand: 'left' | 'right'): XRControllerState | undefined {
    return this.controllerStates.get(hand);
  }
}

// ============================================================================
// FOVEATED RENDERING
// ============================================================================

export class FoveatedRenderingManager {
  private enabled: boolean = false;
  private foveationLevel: number = 0; // 0-4
  private dynamicFoveation: boolean = true;
  
  private gazePoint: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private innerRadius: number = 0.2;
  private outerRadius: number = 0.6;
  
  constructor() {}
  
  enable(session: XRSession): boolean {
    // Check if fixed foveation is supported
    const layer = session.renderState.baseLayer as any;
    
    if (layer?.fixedFoveation !== undefined) {
      this.enabled = true;
      this.setFoveationLevel(2);
      return true;
    }
    
    return false;
  }
  
  setFoveationLevel(level: number): void {
    this.foveationLevel = Math.max(0, Math.min(4, level));
  }
  
  updateGazePoint(x: number, y: number): void {
    this.gazePoint.set(x, y);
  }
  
  applyToLayer(layer: XRWebGLLayer | any): void {
    if (!this.enabled) return;
    
    if (layer.fixedFoveation !== undefined) {
      // Map level (0-4) to fixed foveation (0-1)
      layer.fixedFoveation = this.foveationLevel / 4;
    }
  }
  
  // Get shader uniforms for custom foveated rendering
  getShaderUniforms(): Record<string, any> {
    return {
      u_foveatedEnabled: this.enabled,
      u_gazePoint: this.gazePoint,
      u_innerRadius: this.innerRadius,
      u_outerRadius: this.outerRadius,
      u_foveationLevel: this.foveationLevel / 4,
    };
  }
  
  // Shader code for foveated rendering
  getShaderCode(): string {
    return `
      uniform bool u_foveatedEnabled;
      uniform vec2 u_gazePoint;
      uniform float u_innerRadius;
      uniform float u_outerRadius;
      uniform float u_foveationLevel;
      
      float getFoveationFactor(vec2 uv) {
        if (!u_foveatedEnabled) return 1.0;
        
        float dist = distance(uv, u_gazePoint);
        
        if (dist < u_innerRadius) {
          return 1.0; // Full resolution
        } else if (dist < u_outerRadius) {
          float t = (dist - u_innerRadius) / (u_outerRadius - u_innerRadius);
          return mix(1.0, 1.0 - u_foveationLevel, t);
        } else {
          return 1.0 - u_foveationLevel; // Reduced resolution
        }
      }
    `;
  }
  
  isEnabled(): boolean {
    return this.enabled;
  }
}

// ============================================================================
// TELEPORTATION SYSTEM
// ============================================================================

export class TeleportationSystem {
  private enabled: boolean = true;
  private maxDistance: number = 10;
  private arcResolution: number = 30;
  private arcVelocity: number = 5;
  private gravity: number = -9.81;
  
  private targetMesh: THREE.Mesh | null = null;
  private arcLine: THREE.Line | null = null;
  private validColor: THREE.Color = new THREE.Color(0x00ff00);
  private invalidColor: THREE.Color = new THREE.Color(0xff0000);
  
  private raycaster: THREE.Raycaster;
  private floorMeshes: THREE.Object3D[] = [];
  
  constructor() {
    this.raycaster = new THREE.Raycaster();
    this.createVisuals();
  }
  
  private createVisuals(): void {
    // Target indicator
    const targetGeometry = new THREE.RingGeometry(0.3, 0.4, 32);
    const targetMaterial = new THREE.MeshBasicMaterial({
      color: this.validColor,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    this.targetMesh = new THREE.Mesh(targetGeometry, targetMaterial);
    this.targetMesh.rotation.x = -Math.PI / 2;
    this.targetMesh.visible = false;
    
    // Arc line
    const arcGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.arcResolution * 3);
    arcGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const arcMaterial = new THREE.LineBasicMaterial({
      color: this.validColor,
      transparent: true,
      opacity: 0.8,
    });
    this.arcLine = new THREE.Line(arcGeometry, arcMaterial);
    this.arcLine.visible = false;
  }
  
  setFloorMeshes(meshes: THREE.Object3D[]): void {
    this.floorMeshes = meshes;
  }
  
  calculateTarget(
    origin: THREE.Vector3,
    direction: THREE.Vector3
  ): TeleportTarget | null {
    if (!this.enabled) return null;
    
    // Calculate arc trajectory
    const arcPoints: THREE.Vector3[] = [];
    const velocity = direction.clone().multiplyScalar(this.arcVelocity);
    const position = origin.clone();
    const dt = this.maxDistance / (this.arcResolution * this.arcVelocity);
    
    for (let i = 0; i < this.arcResolution; i++) {
      arcPoints.push(position.clone());
      
      // Update velocity with gravity
      velocity.y += this.gravity * dt;
      
      // Update position
      position.add(velocity.clone().multiplyScalar(dt));
      
      // Check for floor intersection
      this.raycaster.set(
        arcPoints[arcPoints.length - 1],
        velocity.clone().normalize()
      );
      
      const intersects = this.raycaster.intersectObjects(this.floorMeshes, true);
      
      if (intersects.length > 0) {
        const hit = intersects[0];
        
        if (hit.distance < velocity.length() * dt) {
          // Update arc visuals
          this.updateArcVisual(arcPoints, true);
          this.updateTargetVisual(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), true);
          
          return {
            position: hit.point,
            valid: true,
            normal: hit.face?.normal || new THREE.Vector3(0, 1, 0),
          };
        }
      }
      
      // Check if below floor level
      if (position.y < -10) {
        break;
      }
    }
    
    // No valid target found
    this.updateArcVisual(arcPoints, false);
    this.hideVisuals();
    
    return null;
  }
  
  private updateArcVisual(points: THREE.Vector3[], valid: boolean): void {
    if (!this.arcLine) return;
    
    const positions = this.arcLine.geometry.getAttribute('position') as THREE.BufferAttribute;
    const array = positions.array as Float32Array;
    
    for (let i = 0; i < points.length && i < this.arcResolution; i++) {
      array[i * 3] = points[i].x;
      array[i * 3 + 1] = points[i].y;
      array[i * 3 + 2] = points[i].z;
    }
    
    // Fill remaining with last point
    const last = points[points.length - 1];
    for (let i = points.length; i < this.arcResolution; i++) {
      array[i * 3] = last.x;
      array[i * 3 + 1] = last.y;
      array[i * 3 + 2] = last.z;
    }
    
    positions.needsUpdate = true;
    
    const material = this.arcLine.material as THREE.LineBasicMaterial;
    material.color = valid ? this.validColor : this.invalidColor;
    
    this.arcLine.visible = true;
  }
  
  private updateTargetVisual(position: THREE.Vector3, normal: THREE.Vector3, valid: boolean): void {
    if (!this.targetMesh) return;
    
    this.targetMesh.position.copy(position);
    this.targetMesh.position.y += 0.01; // Slight offset to prevent z-fighting
    
    // Align to surface normal
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, normal);
    this.targetMesh.quaternion.copy(quaternion);
    this.targetMesh.rotateX(-Math.PI / 2);
    
    const material = this.targetMesh.material as THREE.MeshBasicMaterial;
    material.color = valid ? this.validColor : this.invalidColor;
    
    this.targetMesh.visible = true;
  }
  
  hideVisuals(): void {
    if (this.targetMesh) this.targetMesh.visible = false;
    if (this.arcLine) this.arcLine.visible = false;
  }
  
  getVisuals(): THREE.Object3D[] {
    const visuals: THREE.Object3D[] = [];
    if (this.targetMesh) visuals.push(this.targetMesh);
    if (this.arcLine) visuals.push(this.arcLine);
    return visuals;
  }
  
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.hideVisuals();
  }
}

// ============================================================================
// GRABBING SYSTEM
// ============================================================================

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
    
    // Find nearest grabbable object
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
      // Calculate offset
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
    // Update left hand grabbed object
    const leftState = this.grabStates.get('left');
    if (leftState?.object && leftPosition && leftRotation) {
      const newPos = leftPosition.clone().add(
        leftState.offsetPosition.clone().applyQuaternion(leftRotation)
      );
      const newRot = leftRotation.clone().multiply(leftState.offsetRotation);
      
      leftState.object.position.copy(newPos);
      leftState.object.quaternion.copy(newRot);
    }
    
    // Update right hand grabbed object
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

// ============================================================================
// MAIN WEBXR SYSTEM
// ============================================================================

export class WebXRSystem {
  private config: XRConfig;
  private session: XRSession | null = null;
  private refSpace: XRReferenceSpace | null = null;
  
  private handTracker: HandTracker;
  private controllerTracker: ControllerTracker;
  private foveatedRendering: FoveatedRenderingManager;
  private teleportation: TeleportationSystem;
  private grabbing: GrabbingSystem;
  private haptics: HapticsManager;
  
  private scene: THREE.Scene | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private xrCamera: THREE.PerspectiveCamera;
  
  private playerRig: THREE.Group;
  private controllerModels: Map<string, THREE.Group> = new Map();
  private handModels: Map<string, THREE.Group> = new Map();
  
  // Callbacks
  private onSessionStart?: () => void;
  private onSessionEnd?: () => void;
  private onFrame?: (time: number, frame: XRFrame) => void;
  
  constructor(config: Partial<XRConfig> = {}) {
    this.config = {
      sessionMode: 'immersive-vr',
      referenceSpace: 'local-floor',
      features: ['local-floor'],
      optionalFeatures: ['hand-tracking', 'bounded-floor'],
      foveatedRendering: true,
      handTracking: true,
      passthrough: false,
      ...config,
    };
    
    this.handTracker = new HandTracker();
    this.controllerTracker = new ControllerTracker();
    this.foveatedRendering = new FoveatedRenderingManager();
    this.teleportation = new TeleportationSystem();
    this.grabbing = new GrabbingSystem();
    this.haptics = new HapticsManager();
    
    this.xrCamera = new THREE.PerspectiveCamera();
    this.playerRig = new THREE.Group();
    this.playerRig.name = 'XRPlayerRig';
    
    this.setupControllerModels();
    this.setupHandModels();
  }
  
  private setupControllerModels(): void {
    // Simple controller visualization
    for (const hand of ['left', 'right'] as const) {
      const group = new THREE.Group();
      
      // Controller body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.03, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      body.position.z = -0.05;
      group.add(body);
      
      // Pointer
      const pointer = new THREE.Mesh(
        new THREE.ConeGeometry(0.005, 0.5, 8),
        new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 })
      );
      pointer.rotation.x = -Math.PI / 2;
      pointer.position.z = -0.35;
      group.add(pointer);
      
      group.visible = false;
      this.controllerModels.set(hand, group);
      this.playerRig.add(group);
    }
  }
  
  private setupHandModels(): void {
    // Spheres for hand joints
    for (const hand of ['left', 'right'] as const) {
      const group = new THREE.Group();
      
      for (const jointName of XR_HAND_JOINTS) {
        const joint = new THREE.Mesh(
          new THREE.SphereGeometry(0.008, 8, 8),
          new THREE.MeshStandardMaterial({ color: 0x44aaff })
        );
        joint.name = jointName;
        group.add(joint);
      }
      
      group.visible = false;
      this.handModels.set(hand, group);
      this.playerRig.add(group);
    }
  }
  
  async checkXRSupport(): Promise<boolean> {
    if (!navigator.xr) return false;
    
    try {
      return await navigator.xr.isSessionSupported(this.config.sessionMode);
    } catch {
      return false;
    }
  }
  
  async startSession(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer
  ): Promise<boolean> {
    this.scene = scene;
    this.renderer = renderer;
    
    if (!navigator.xr) {
      console.error('WebXR not supported');
      return false;
    }
    
    try {
      const sessionInit: XRSessionInit = {
        requiredFeatures: this.config.features,
        optionalFeatures: this.config.optionalFeatures,
      };
      
      this.session = await navigator.xr.requestSession(this.config.sessionMode, sessionInit);
      
      // Set up renderer for XR
      await renderer.xr.setSession(this.session);
      
      // Get reference space
      this.refSpace = await this.session.requestReferenceSpace(this.config.referenceSpace);
      
      // Enable foveated rendering if supported
      if (this.config.foveatedRendering) {
        this.foveatedRendering.enable(this.session);
      }
      
      // Add player rig to scene
      scene.add(this.playerRig);
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Start render loop
      renderer.setAnimationLoop((time, frame) => this.onXRFrame(time, frame));
      
      this.onSessionStart?.();
      return true;
      
    } catch (error) {
      console.error('Failed to start XR session:', error);
      return false;
    }
  }
  
  endSession(): void {
    if (this.session) {
      this.session.end();
      this.session = null;
    }
    
    if (this.renderer) {
      this.renderer.setAnimationLoop(null);
    }
    
    if (this.scene) {
      this.scene.remove(this.playerRig);
    }
    
    this.onSessionEnd?.();
  }
  
  private setupEventListeners(): void {
    if (!this.session) return;
    
    this.session.addEventListener('end', () => {
      this.session = null;
      this.onSessionEnd?.();
    });
    
    this.session.addEventListener('selectstart', (event) => {
      const hand = (event.inputSource.handedness as 'left' | 'right') || 'right';
      this.controllerTracker.handleSelectStart(hand);
    });
    
    this.session.addEventListener('selectend', (event) => {
      const hand = (event.inputSource.handedness as 'left' | 'right') || 'right';
      this.controllerTracker.handleSelectEnd(hand);
    });
    
    this.session.addEventListener('squeezestart', (event) => {
      const hand = (event.inputSource.handedness as 'left' | 'right') || 'right';
      this.controllerTracker.handleSqueezeStart(hand);
    });
    
    this.session.addEventListener('squeezeend', (event) => {
      const hand = (event.inputSource.handedness as 'left' | 'right') || 'right';
      this.controllerTracker.handleSqueezeEnd(hand);
    });
  }
  
  private onXRFrame(time: number, frame: XRFrame | null): void {
    if (!frame || !this.session || !this.refSpace) return;
    
    // Update input sources
    for (const source of this.session.inputSources) {
      const hand = (source.handedness as 'left' | 'right') || 'right';
      
      if (source.hand && this.config.handTracking) {
        // Hand tracking
        this.handTracker.updateFromXRHand(hand, source.hand, frame, this.refSpace);
        this.updateHandModel(hand);
      } else if (source.gamepad) {
        // Controller
        const pose = frame.getPose(source.gripSpace!, this.refSpace);
        this.controllerTracker.updateFromGamepad(hand, source.gamepad, pose || null);
        this.updateControllerModel(hand);
        
        // Haptics
        if (source.gamepad.hapticActuators?.length) {
          this.haptics.setActuator(hand, source.gamepad.hapticActuators[0]);
        }
      }
    }
    
    // Update camera
    const viewerPose = frame.getViewerPose(this.refSpace);
    if (viewerPose) {
      const view = viewerPose.views[0];
      if (view) {
        this.xrCamera.position.set(
          view.transform.position.x,
          view.transform.position.y,
          view.transform.position.z
        );
        this.xrCamera.quaternion.set(
          view.transform.orientation.x,
          view.transform.orientation.y,
          view.transform.orientation.z,
          view.transform.orientation.w
        );
      }
    }
    
    // Process interactions
    this.processInteractions();
    
    // Custom callback
    this.onFrame?.(time, frame);
  }
  
  private updateControllerModel(hand: 'left' | 'right'): void {
    const state = this.controllerTracker.getControllerState(hand);
    const model = this.controllerModels.get(hand);
    
    if (state && model) {
      model.visible = state.connected;
      model.position.copy(state.position);
      model.quaternion.copy(state.rotation);
    }
  }
  
  private updateHandModel(hand: 'left' | 'right'): void {
    const state = this.handTracker.getHandState(hand);
    const model = this.handModels.get(hand);
    
    if (state && model) {
      model.visible = true;
      
      for (const jointName of XR_HAND_JOINTS) {
        const jointData = state.joints.get(jointName);
        const jointMesh = model.getObjectByName(jointName) as THREE.Mesh;
        
        if (jointData && jointMesh) {
          jointMesh.visible = jointData.visible;
          jointMesh.position.copy(jointData.position);
          jointMesh.quaternion.copy(jointData.rotation);
          jointMesh.scale.setScalar(jointData.radius * 100);
        }
      }
    }
  }
  
  private processInteractions(): void {
    for (const hand of ['left', 'right'] as const) {
      const controller = this.controllerTracker.getControllerState(hand);
      const handState = this.handTracker.getHandState(hand);
      
      // Grabbing via controller grip or hand pinch
      if (controller?.squeezeStart || handState?.pinching) {
        const grabPos = handState?.pinching 
          ? this.handTracker.getPinchPosition(hand)
          : controller?.position;
        
        if (grabPos) {
          const grabbed = this.grabbing.tryGrab(
            hand,
            grabPos,
            handState?.wristRotation || controller?.rotation || new THREE.Quaternion()
          );
          if (grabbed) {
            this.haptics.grab(hand);
          }
        }
      }
      
      // Release
      if (controller?.squeezeEnd || (handState && !handState.pinching && this.grabbing.isGrabbing(hand))) {
        const released = this.grabbing.release(hand);
        if (released) {
          this.haptics.release(hand);
        }
      }
      
      // Update grabbed objects
      this.grabbing.updateGrabbedObjects(
        this.controllerTracker.getControllerState('left')?.position || 
          this.handTracker.getPinchPosition('left'),
        this.controllerTracker.getControllerState('left')?.rotation ||
          this.handTracker.getHandState('left')?.wristRotation || null,
        this.controllerTracker.getControllerState('right')?.position ||
          this.handTracker.getPinchPosition('right'),
        this.controllerTracker.getControllerState('right')?.rotation ||
          this.handTracker.getHandState('right')?.wristRotation || null
      );
    }
  }
  
  // Public API
  teleport(position: THREE.Vector3): void {
    this.playerRig.position.copy(position);
    this.haptics.teleport('left');
    this.haptics.teleport('right');
  }
  
  setPlayerPosition(position: THREE.Vector3): void {
    this.playerRig.position.copy(position);
  }
  
  setPlayerRotation(rotation: THREE.Euler | number): void {
    if (typeof rotation === 'number') {
      this.playerRig.rotation.y = rotation;
    } else {
      this.playerRig.rotation.copy(rotation);
    }
  }
  
  getPlayerRig(): THREE.Group {
    return this.playerRig;
  }
  
  getControllerState(hand: 'left' | 'right'): XRControllerState | undefined {
    return this.controllerTracker.getControllerState(hand);
  }
  
  getHandState(hand: 'left' | 'right'): XRHandState | undefined {
    return this.handTracker.getHandState(hand);
  }
  
  addGrabbable(object: THREE.Object3D): void {
    this.grabbing.addGrabbable(object);
  }
  
  setFloorMeshes(meshes: THREE.Object3D[]): void {
    this.teleportation.setFloorMeshes(meshes);
  }
  
  getTeleportation(): TeleportationSystem {
    return this.teleportation;
  }
  
  getHaptics(): HapticsManager {
    return this.haptics;
  }
  
  isSessionActive(): boolean {
    return this.session !== null;
  }
  
  // Callbacks
  setOnSessionStart(callback: () => void): void {
    this.onSessionStart = callback;
  }
  
  setOnSessionEnd(callback: () => void): void {
    this.onSessionEnd = callback;
  }
  
  setOnFrame(callback: (time: number, frame: XRFrame) => void): void {
    this.onFrame = callback;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const createWebXRSystem = (config?: Partial<XRConfig>): WebXRSystem => {
  return new WebXRSystem(config);
};

export const createVRUIPanel = (width?: number, height?: number): VRUIPanel => {
  return new VRUIPanel(width, height);
};
