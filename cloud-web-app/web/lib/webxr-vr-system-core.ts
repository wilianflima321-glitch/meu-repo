// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
import * as THREE from 'three';

import { logger } from '@/lib/observability/logger';

import { FoveatedRenderingManager } from './webxr-vr-foveated-rendering';
import { ControllerTracker, HandTracker } from './webxr-vr-input';
import { GrabbingSystem } from './webxr-vr-grabbing';
import { HapticsManager } from './webxr-vr-haptics';
import { TeleportationSystem } from './webxr-vr-teleportation';
import { XR_HAND_JOINTS } from './webxr-vr-contracts';
import type { XRConfig, XRControllerState, XRFeature, XRHandState } from './webxr-vr-contracts';
import { VR_APPLY_TO_LAYER_IN_FRAME } from '@/lib/production/vr-honesty-capability';

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
    // VR-001 — apply hardware fixedFoveation each frame when the layer supports it.
    // Darken-shader uniforms are never marketed as VRS (see vr-honesty-capability).
    if (VR_APPLY_TO_LAYER_IN_FRAME && this.config.foveatedRendering) {
      const layer = this.session.renderState.baseLayer as XRWebGLLayer | null;
      if (layer) {
        this.foveatedRendering.applyToLayer(layer);
      }
    }
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
    // VR-001 — apply hardware fixedFoveation every frame when layer supports it
    if (this.config.foveatedRendering && this.session) {
      const layer = this.session.renderState.baseLayer;
      if (layer) {
        this.foveatedRendering.applyToLayer(layer);
      }
    }
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
