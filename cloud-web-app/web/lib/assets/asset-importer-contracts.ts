import type * as THREE from 'three'

export type AssetType =
  | 'model'
  | 'texture'
  | 'hdri'
  | 'audio'
  | 'video'
  | 'font'
  | 'data'

export type ModelFormat = 'gltf' | 'glb' | 'fbx' | 'obj'
export type TextureFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'gif' | 'bmp' | 'tga'
export type HDRIFormat = 'hdr' | 'exr'
export type AudioFormat = 'mp3' | 'wav' | 'ogg' | 'flac' | 'aac'

export interface ImportProgress {
  loaded: number
  total: number
  percent: number
  phase: 'loading' | 'parsing' | 'processing' | 'complete' | 'error'
  message: string
}

export interface ImportOptions {
  generateMipmaps?: boolean
  flipY?: boolean
  optimizeMeshes?: boolean
  mergeMaterials?: boolean
  computeNormals?: boolean
  centerModel?: boolean
  normalizeScale?: boolean
  targetScale?: number
  applyTransforms?: boolean
}

export interface ImportedAsset {
  id: string
  name: string
  type: AssetType
  format: string
  size: number
  data: unknown
  metadata: Record<string, unknown>
  thumbnail?: string
  createdAt: Date
}

export interface ImportedModel extends ImportedAsset {
  type: 'model'
  data: THREE.Object3D
  animations: THREE.AnimationClip[]
  materials: THREE.Material[]
  textures: THREE.Texture[]
  boundingBox: THREE.Box3
  triangleCount: number
  vertexCount: number
}

export interface ImportedTexture extends ImportedAsset {
  type: 'texture'
  data: THREE.Texture
  width: number
  height: number
  format: string
  isHDR: boolean
}

export interface ImportedHDRI extends ImportedAsset {
  type: 'hdri'
  data: THREE.Texture
  width: number
  height: number
}

export interface ImportedAudio extends ImportedAsset {
  type: 'audio'
  data: AudioBuffer
  duration: number
  sampleRate: number
  numberOfChannels: number
}
