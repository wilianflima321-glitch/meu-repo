import type * as THREE from 'three'

export interface RayTracingConfig {
  enabled: boolean
  maxBounces: number
  samplesPerPixel: number
  enableReflections: boolean
  enableShadows: boolean
  enableGI: boolean
  enableAO: boolean
  aoRadius: number
  aoSamples: number
  denoiseEnabled: boolean
  denoiseStrength: number
  resolution: number
}

export interface BVHNode {
  boundingBox: THREE.Box3
  leftChild: number | null
  rightChild: number | null
  triangleStart: number
  triangleCount: number
}

export interface Triangle {
  v0: THREE.Vector3
  v1: THREE.Vector3
  v2: THREE.Vector3
  n0: THREE.Vector3
  n1: THREE.Vector3
  n2: THREE.Vector3
  materialIndex: number
}

export interface RTMaterial {
  albedo: THREE.Color
  roughness: number
  metalness: number
  emissive: THREE.Color
  emissiveIntensity: number
}
