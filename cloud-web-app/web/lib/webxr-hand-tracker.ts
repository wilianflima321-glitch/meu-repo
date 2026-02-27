import * as THREE from 'three';
import { XR_HAND_JOINTS } from './webxr-vr-types';
import type { HandJointData, XRHandState } from './webxr-vr-types';

export class HandTracker {
  private handStates: Map<string, XRHandState> = new Map();
  private gestureThresholds = {
    pinchDistance: 0.02,
    fistCurl: 0.6,
    pointAngle: 30 * Math.PI / 180,
  };
  
  constructor() {
    this.initializeHandState('left');
    this.initializeHandState('right');
  }
  
  private initializeHandState(hand: 'left' | 'right'): void {
    const joints = new Map<string, HandJointData>();
    
    for (const jointName of XR_HAND_JOINTS) {
      joints.set(jointName, {
        position: new THREE.Vector3(),
        rotation: new THREE.Quaternion(),
        radius: 0.01,
        visible: false,
      });
    }
    
    this.handStates.set(hand, {
      hand,
      joints,
      pinching: false,
      pinchStrength: 0,
      pointing: false,
      fist: false,
      wristPosition: new THREE.Vector3(),
      wristRotation: new THREE.Quaternion(),
    });
  }
  
  updateFromXRHand(hand: 'left' | 'right', xrHand: XRHand, frame: XRFrame, refSpace: XRReferenceSpace): void {
    const state = this.handStates.get(hand);
    if (!state) return;
    
    // Update joint positions
    for (const jointName of XR_HAND_JOINTS) {
      const xrJoint = xrHand.get(jointName as unknown as XRHandJoint);
      const joint = state.joints.get(jointName);
      
      if (xrJoint && joint) {
        const pose = frame.getJointPose?.(xrJoint, refSpace);
        
        if (pose) {
          joint.position.set(
            pose.transform.position.x,
            pose.transform.position.y,
            pose.transform.position.z
          );
          joint.rotation.set(
            pose.transform.orientation.x,
            pose.transform.orientation.y,
            pose.transform.orientation.z,
            pose.transform.orientation.w
          );
          joint.radius = pose.radius || 0.01;
          joint.visible = true;
        } else {
          joint.visible = false;
        }
      }
    }
    
    // Update wrist
    const wrist = state.joints.get('wrist');
    if (wrist) {
      state.wristPosition.copy(wrist.position);
      state.wristRotation.copy(wrist.rotation);
    }
    
    // Detect gestures
    this.detectGestures(state);
  }
  
  private detectGestures(state: XRHandState): void {
    // Pinch detection (thumb tip to index tip distance)
    const thumbTip = state.joints.get('thumb-tip');
    const indexTip = state.joints.get('index-finger-tip');
    
    if (thumbTip && indexTip && thumbTip.visible && indexTip.visible) {
      const pinchDistance = thumbTip.position.distanceTo(indexTip.position);
      state.pinchStrength = 1 - Math.min(pinchDistance / this.gestureThresholds.pinchDistance, 1);
      state.pinching = pinchDistance < this.gestureThresholds.pinchDistance;
    } else {
      state.pinching = false;
      state.pinchStrength = 0;
    }
    
    // Point detection (index extended, others curled)
    const indexProximal = state.joints.get('index-finger-phalanx-proximal');
    const indexDistal = state.joints.get('index-finger-phalanx-distal');
    const middleDistal = state.joints.get('middle-finger-phalanx-distal');
    
    if (indexProximal && indexDistal && indexTip && middleDistal) {
      const indexDir = indexTip.position.clone().sub(indexProximal.position).normalize();
      const wristToIndex = indexProximal.position.clone().sub(state.wristPosition).normalize();
      
      const indexStraight = indexDir.dot(wristToIndex) > Math.cos(this.gestureThresholds.pointAngle);
      
      // Check middle finger is curled
      const middleCurled = middleDistal.position.distanceTo(state.wristPosition) < 
                          indexDistal.position.distanceTo(state.wristPosition) * 0.7;
      
      state.pointing = indexStraight && middleCurled && !state.pinching;
    } else {
      state.pointing = false;
    }
    
    // Fist detection (all fingertips close to palm)
    const fingerTips = ['index-finger-tip', 'middle-finger-tip', 'ring-finger-tip', 'pinky-finger-tip'];
    let allCurled = true;
    
    for (const tipName of fingerTips) {
      const tip = state.joints.get(tipName);
      if (tip && tip.visible) {
        const distToWrist = tip.position.distanceTo(state.wristPosition);
        if (distToWrist > 0.08) {
          allCurled = false;
          break;
        }
      }
    }
    
    state.fist = allCurled;
  }
  
  getHandState(hand: 'left' | 'right'): XRHandState | undefined {
    return this.handStates.get(hand);
  }
  
  getPinchPosition(hand: 'left' | 'right'): THREE.Vector3 | null {
    const state = this.handStates.get(hand);
    if (!state) return null;
    
    const thumbTip = state.joints.get('thumb-tip');
    const indexTip = state.joints.get('index-finger-tip');
    
    if (thumbTip && indexTip && thumbTip.visible && indexTip.visible) {
      return thumbTip.position.clone().lerp(indexTip.position, 0.5);
    }
    
    return null;
  }
  
  getPointDirection(hand: 'left' | 'right'): THREE.Vector3 | null {
    const state = this.handStates.get(hand);
    if (!state || !state.pointing) return null;
    
    const indexProximal = state.joints.get('index-finger-phalanx-proximal');
    const indexTip = state.joints.get('index-finger-tip');
    
    if (indexProximal && indexTip && indexProximal.visible && indexTip.visible) {
      return indexTip.position.clone().sub(indexProximal.position).normalize();
    }
    
    return null;
  }
}
