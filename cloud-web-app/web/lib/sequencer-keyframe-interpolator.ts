/** Shared keyframe interpolation helpers for sequencer runtime. */

import * as THREE from 'three';
import type { Keyframe } from './sequencer-cinematics.types';

export class KeyframeInterpolator {
  static interpolateNumber(keyframes: Keyframe<number>[], time: number): number {
    if (keyframes.length === 0) return 0;
    if (keyframes.length === 1) return keyframes[0].value;
    
    // Find surrounding keyframes
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= k1.time) return k1.value;
    if (time >= k2.time) return k2.value;
    
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    
    return k1.value + (k2.value - k1.value) * easedT;
  }
  
  static interpolateVector3(keyframes: Keyframe<THREE.Vector3>[], time: number): THREE.Vector3 {
    if (keyframes.length === 0) return new THREE.Vector3();
    if (keyframes.length === 1) return keyframes[0].value.clone();
    
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= k1.time) return k1.value.clone();
    if (time >= k2.time) return k2.value.clone();
    
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    
    return new THREE.Vector3().lerpVectors(k1.value, k2.value, easedT);
  }
  
  static interpolateQuaternion(keyframes: Keyframe<THREE.Quaternion>[], time: number): THREE.Quaternion {
    if (keyframes.length === 0) return new THREE.Quaternion();
    if (keyframes.length === 1) return keyframes[0].value.clone();
    
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= k1.time) return k1.value.clone();
    if (time >= k2.time) return k2.value.clone();
    
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    
    return new THREE.Quaternion().slerpQuaternions(k1.value, k2.value, easedT);
  }
  
  static interpolateColor(keyframes: Keyframe<THREE.Color>[], time: number): THREE.Color {
    if (keyframes.length === 0) return new THREE.Color();
    if (keyframes.length === 1) return keyframes[0].value.clone();
    
    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];
    
    for (let i = 0; i < keyframes.length - 1; i++) {
      if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }
    
    if (time <= k1.time) return k1.value.clone();
    if (time >= k2.time) return k2.value.clone();
    
    const t = (time - k1.time) / (k2.time - k1.time);
    const easedT = k1.easing(t);
    
    return new THREE.Color().lerpColors(k1.value, k2.value, easedT);
  }
}
