// @aethel-heavy-async-boundary Studio/render-gated constants; paired with aaa-render-system.
import * as THREE from 'three'

export type RenderPipelineType = 'forward' | 'deferred' | 'forwardPlus' | 'tiled'

export interface RenderPipelineConfig {
  type: RenderPipelineType
  hdr: boolean
  multisampling: boolean
  samples: number
  toneMapping: THREE.ToneMapping
  toneMappingExposure: number
  shadowMapEnabled: boolean
  shadowMapType: THREE.ShadowMapType
  shadowMapSize: number
  physicallyCorrectLights: boolean
  outputColorSpace: THREE.ColorSpace
}

export const DEFAULT_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forwardPlus',
  hdr: true,
  multisampling: true,
  samples: 4,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: THREE.PCFSoftShadowMap,
  shadowMapSize: 2048,
  physicallyCorrectLights: true,
  outputColorSpace: THREE.SRGBColorSpace,
}

export const LITE_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forward',
  hdr: true,
  multisampling: false,
  samples: 1,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: THREE.BasicShadowMap,
  shadowMapSize: 1024,
  physicallyCorrectLights: true,
  outputColorSpace: THREE.SRGBColorSpace,
}

export const MOBILE_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forward',
  hdr: false,
  multisampling: false,
  samples: 1,
  toneMapping: THREE.LinearToneMapping,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: THREE.BasicShadowMap,
  shadowMapSize: 512,
  physicallyCorrectLights: false,
  outputColorSpace: THREE.SRGBColorSpace,
}

export interface GBuffer {
  albedo: THREE.WebGLRenderTarget
  normal: THREE.WebGLRenderTarget
  emissive: THREE.WebGLRenderTarget
  depth: THREE.WebGLRenderTarget
  velocity: THREE.WebGLRenderTarget
  material: THREE.WebGLRenderTarget
}

export type GIMethod = 'none' | 'lightProbes' | 'ssgi' | 'rtgi' | 'voxelGI' | 'lpv'

export interface GlobalIlluminationConfig {
  method: GIMethod
  intensity: number
  bounces: number
  probeResolution: number
  probeSpacing: number
  ssgiSamples: number
  ssgiRadius: number
  rtgiRaysPerPixel: number
  rtgiDenoiser: boolean
  voxelResolution: number
  voxelBounce: number
}

export const DEFAULT_GI_CONFIG: GlobalIlluminationConfig = {
  method: 'ssgi',
  intensity: 1.0,
  bounces: 1,
  probeResolution: 16,
  probeSpacing: 2,
  ssgiSamples: 16,
  ssgiRadius: 0.5,
  rtgiRaysPerPixel: 1,
  rtgiDenoiser: true,
  voxelResolution: 128,
  voxelBounce: 1,
}

export const LITE_GI_CONFIG: GlobalIlluminationConfig = {
  method: 'lightProbes',
  intensity: 0.85,
  bounces: 0,
  probeResolution: 8,
  probeSpacing: 4,
  ssgiSamples: 0,
  ssgiRadius: 0,
  rtgiRaysPerPixel: 0,
  rtgiDenoiser: false,
  voxelResolution: 64,
  voxelBounce: 0,
}

export const MOBILE_GI_CONFIG: GlobalIlluminationConfig = {
  method: 'none',
  intensity: 0,
  bounces: 0,
  probeResolution: 4,
  probeSpacing: 8,
  ssgiSamples: 0,
  ssgiRadius: 0,
  rtgiRaysPerPixel: 0,
  rtgiDenoiser: false,
  voxelResolution: 32,
  voxelBounce: 0,
}
