// @aethel-heavy-async-boundary Studio/engine runtime module; never import from public/dashboard/admin route shells.
export { XR_HAND_JOINTS } from './webxr-vr-contracts';
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
export { FoveatedRenderingManager } from './webxr-vr-foveated-rendering';
export { TeleportationSystem } from './webxr-vr-teleportation';
export { GrabbingSystem } from './webxr-vr-grabbing';
export { HapticsManager } from './webxr-vr-haptics';
export { VRUIPanel } from './webxr-vr-ui-panel';
export { WebXRSystem } from './webxr-vr-system-core';

import { VRUIPanel } from './webxr-vr-ui-panel';
import { WebXRSystem } from './webxr-vr-system-core';
import type { XRConfig } from './webxr-vr-contracts';

export const createWebXRSystem = (config?: Partial<XRConfig>): WebXRSystem => {
  return new WebXRSystem(config);
};

export const createVRUIPanel = (width?: number, height?: number): VRUIPanel => {
  return new VRUIPanel(width, height);
};

const webXrVrSystem = { WebXRSystem, VRUIPanel, createWebXRSystem, createVRUIPanel };

export default webXrVrSystem;
