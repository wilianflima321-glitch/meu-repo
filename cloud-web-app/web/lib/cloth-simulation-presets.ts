// @aethel-heavy-async-boundary Cloth presets are Studio/runtime-only.
import * as THREE from 'three';

export const CLOTH_PRESETS = {
  flag: {
    width: 2,
    height: 1.5,
    segmentsX: 30,
    segmentsY: 20,
    mass: 0.5,
    stiffness: 0.95,
    damping: 0.98,
    wind: new THREE.Vector3(5, 0, 1),
    windVariation: 2
  },
  cape: {
    width: 1.2,
    height: 1.5,
    segmentsX: 15,
    segmentsY: 20,
    mass: 0.8,
    stiffness: 0.9,
    damping: 0.97,
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.5
  },
  curtain: {
    width: 3,
    height: 2.5,
    segmentsX: 40,
    segmentsY: 35,
    mass: 2.0,
    stiffness: 0.85,
    damping: 0.96,
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0.2
  },
  tablecloth: {
    width: 2,
    height: 2,
    segmentsX: 25,
    segmentsY: 25,
    mass: 1.5,
    stiffness: 0.8,
    damping: 0.95,
    gravity: new THREE.Vector3(0, -15, 0),
    wind: new THREE.Vector3(0, 0, 0),
    windVariation: 0
  },
  silk: {
    width: 1.5,
    height: 2,
    segmentsX: 50,
    segmentsY: 60,
    mass: 0.3,
    stiffness: 0.6,
    damping: 0.99,
    wind: new THREE.Vector3(1, 0, 0.5),
    windVariation: 1
  }
};
