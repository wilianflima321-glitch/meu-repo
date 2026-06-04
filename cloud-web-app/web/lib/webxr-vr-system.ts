// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import { logger } from '@/lib/observability/logger';
/** WebXR/VR runtime: hands, controllers, anchors, passthrough, locomotion and in-VR UI. */
import * as THREE from 'three';
import { ControllerTracker, HandTracker } from './webxr-vr-input';
import {
  XR_HAND_JOINTS,
  type GrabState,
  type HandJointData,
  type TeleportTarget,
  type XRAnchor,
  type XRConfig,
  type XRControllerState,
  type XRFeature,
  type XRHandState,
  type XRHitTestResult,
} from './webxr-vr-contracts';
export {
  XR_HAND_JOINTS,
} from './webxr-vr-contracts';
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
} from './webxr-vr-contracts';
export { ControllerTracker, HandTracker } from './webxr-vr-input';

import { FoveatedRenderingManager } from './webxr-vr-foveated-rendering';
export { FoveatedRenderingManager } from './webxr-vr-foveated-rendering';

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
    const arcPoints: THREE.Vector3[] = [];
    const velocity = direction.clone().multiplyScalar(this.arcVelocity);
    const position = origin.clone();
    const dt = this.maxDistance / (this.arcResolution * this.arcVelocity);
    for (let i = 0; i < this.arcResolution; i++) {
      arcPoints.push(position.clone());
      velocity.y += this.gravity * dt;
      position.add(velocity.clone().multiplyScalar(dt));
      this.raycaster.set(
        arcPoints[arcPoints.length - 1],
        velocity.clone().normalize()
      );
      const intersects = this.raycaster.intersectObjects(this.floorMeshes, true);
      if (intersects.length > 0) {
        const hit = intersects[0];
        if (hit.distance < velocity.length() * dt) {
          this.updateArcVisual(arcPoints, true);
          this.updateTargetVisual(hit.point, hit.face?.normal || new THREE.Vector3(0, 1, 0), true);
          return {
            position: hit.point,
            valid: true,
            normal: hit.face?.normal || new THREE.Vector3(0, 1, 0),
          };
        }
      }
      if (position.y < -10) {
        break;
      }
    }
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
export class HapticsManager {
  private hapticActuators: Map<string, GamepadHapticActuator> = new Map();
  setActuator(hand: 'left' | 'right', actuator: GamepadHapticActuator): void {
    this.hapticActuators.set(hand, actuator);
  }
  pulse(hand: 'left' | 'right', intensity: number, duration: number): void {
    const actuator = this.hapticActuators.get(hand);
    if (actuator?.pulse) {
      actuator.pulse(Math.max(0, Math.min(1, intensity)), duration);
    }
  }
  click(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.6, 10);
  }
  grab(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.8, 30);
  }
  release(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.4, 20);
  }
  teleport(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.5, 50);
  }
  error(hand: 'left' | 'right'): void {
    this.pulse(hand, 1.0, 20);
    setTimeout(() => this.pulse(hand, 1.0, 20), 50);
  }
  heartbeat(hand: 'left' | 'right'): void {
    this.pulse(hand, 0.3, 40);
    setTimeout(() => this.pulse(hand, 0.5, 60), 100);
  }
}
export class VRUIPanel {
  private mesh: THREE.Mesh;
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;
  private width: number;
  private height: number;
  private pixelWidth: number;
  private pixelHeight: number;
  constructor(width: number = 1, height: number = 0.6, pixelDensity: number = 512) {
    this.width = width;
    this.height = height;
    this.pixelWidth = Math.floor(width * pixelDensity);
    this.pixelHeight = Math.floor(height * pixelDensity);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.pixelWidth;
    this.canvas.height = this.pixelHeight;
    this.context = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    const geometry = new THREE.PlaneGeometry(width, height);
    const material = new THREE.MeshBasicMaterial({
      map: this.texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geometry, material);
  }
  clear(color: string = 'rgba(0, 0, 0, 0.8)'): void {
    this.context.fillStyle = color;
    this.context.fillRect(0, 0, this.pixelWidth, this.pixelHeight);
  }
  drawText(
    text: string,
    x: number,
    y: number,
    options: {
      font?: string;
      color?: string;
      align?: CanvasTextAlign;
      baseline?: CanvasTextBaseline;
    } = {}
  ): void {
    const {
      font = '32px Arial',
      color = '#ffffff',
      align = 'left',
      baseline = 'top',
    } = options;
    this.context.font = font;
    this.context.fillStyle = color;
    this.context.textAlign = align;
    this.context.textBaseline = baseline;
    this.context.fillText(text, x * this.pixelWidth, y * this.pixelHeight);
  }
  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string = '#ffffff',
    fill: boolean = true
  ): void {
    if (fill) {
      this.context.fillStyle = color;
      this.context.fillRect(
        x * this.pixelWidth,
        y * this.pixelHeight,
        width * this.pixelWidth,
        height * this.pixelHeight
      );
    } else {
      this.context.strokeStyle = color;
      this.context.strokeRect(
        x * this.pixelWidth,
        y * this.pixelHeight,
        width * this.pixelWidth,
        height * this.pixelHeight
      );
    }
  }
  drawButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    highlighted: boolean = false
  ): void {
    const bgColor = highlighted ? '#4488ff' : '#333333';
    const borderColor = highlighted ? '#66aaff' : '#666666';
    this.drawRect(x, y, width, height, bgColor, true);
    this.drawRect(x, y, width, height, borderColor, false);
    this.drawText(label, x + width / 2, y + height / 2, {
      align: 'center',
      baseline: 'middle',
      font: '24px Arial',
    });
  }
  update(): void {
    this.texture.needsUpdate = true;
  }
  getMesh(): THREE.Mesh {
    return this.mesh;
  }
  raycast(origin: THREE.Vector3, direction: THREE.Vector3): THREE.Vector2 | null {
    const raycaster = new THREE.Raycaster(origin, direction);
    const intersects = raycaster.intersectObject(this.mesh);
    if (intersects.length > 0 && intersects[0].uv) {
      return intersects[0].uv;
    }
    return null;
  }
}
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
    for (const hand of ['left', 'right'] as const) {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.03, 0.1),
        new THREE.MeshStandardMaterial({ color: 0x333333 })
      );
      body.position.z = -0.05;
      group.add(body);
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
      logger.error('WebXR not supported');
      return false;
    }
    try {
      const sessionInit: XRSessionInit = {
        requiredFeatures: this.config.features,
        optionalFeatures: this.config.optionalFeatures,
      };
      this.session = await navigator.xr.requestSession(this.config.sessionMode, sessionInit);
      await renderer.xr.setSession(this.session);
      this.refSpace = await this.session.requestReferenceSpace(this.config.referenceSpace);
      if (this.config.foveatedRendering) {
        this.foveatedRendering.enable(this.session);
      }
      scene.add(this.playerRig);
      this.setupEventListeners();
      renderer.setAnimationLoop((time, frame) => this.onXRFrame(time, frame));
      this.onSessionStart?.();
      return true;
    } catch (error) {
      logger.error('Failed to start XR session:', error);
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
    for (const source of this.session.inputSources) {
      const hand = (source.handedness as 'left' | 'right') || 'right';
      if (source.hand && this.config.handTracking) {
        this.handTracker.updateFromXRHand(hand, source.hand, frame, this.refSpace);
        this.updateHandModel(hand);
      } else if (source.gamepad) {
        const pose = frame.getPose(source.gripSpace!, this.refSpace);
        this.controllerTracker.updateFromGamepad(hand, source.gamepad, pose || null);
        this.updateControllerModel(hand);
        if (source.gamepad.hapticActuators?.length) {
          this.haptics.setActuator(hand, source.gamepad.hapticActuators[0]);
        }
      }
    }
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
    this.processInteractions();
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
      if (controller?.squeezeEnd || (handState && !handState.pinching && this.grabbing.isGrabbing(hand))) {
        const released = this.grabbing.release(hand);
        if (released) {
          this.haptics.release(hand);
        }
      }
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
export const createWebXRSystem = (config?: Partial<XRConfig>): WebXRSystem => {
  return new WebXRSystem(config);
};
export const createVRUIPanel = (width?: number, height?: number): VRUIPanel => {
  return new VRUIPanel(width, height);
};
