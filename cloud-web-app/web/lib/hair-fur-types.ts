import * as THREE from 'three';

export interface HairConfig {
  strandCount: number;
  segmentsPerStrand: number;
  rootWidth: number;
  tipWidth: number;
  length: number;
  lengthVariation: number;
  curl: number;
  curlFrequency: number;
  clumpSize: number;
  clumpStrength: number;
  noise: number;
  gravity: number;
  stiffness: number;
  damping: number;
  color: THREE.Color;
  colorVariation: number;
  specularColor: THREE.Color;
  specularPower: number;
  shadowDensity: number;
}

export interface FurConfig {
  shellCount: number;
  density: number;
  length: number;
  lengthVariation: number;
  thickness: number;
  curvature: number;
  gravity: number;
  windResponse: number;
  baseColor: THREE.Color;
  tipColor: THREE.Color;
  occlusionStrength: number;
}

export interface HairStrand {
  id: number;
  rootPosition: THREE.Vector3;
  rootNormal: THREE.Vector3;
  segments: HairSegment[];
  clumpId: number;
  lengthScale: number;
  colorVariation: THREE.Color;
}

export interface HairSegment {
  position: THREE.Vector3;
  previousPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  restLength: number;
  width: number;
}

export interface HairClump {
  id: number;
  center: THREE.Vector3;
  strands: number[];
  guideStrand: number;
}

export interface HairCollider {
  type: 'sphere' | 'capsule' | 'mesh';
  position: THREE.Vector3;
  radius?: number;
  height?: number;
  direction?: THREE.Vector3;
}

export interface GroomGuide {
  id: number;
  rootPosition: THREE.Vector3;
  controlPoints: THREE.Vector3[];
  influence: number;
}
