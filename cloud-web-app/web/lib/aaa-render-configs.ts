// Studio/render-gated constants; keep this module serializable and Three-free at runtime.
import type * as THREE from 'three'

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

// Values mirror Three.js constants, but keeping them local prevents this config
// module from pulling the renderer package into non-render import graphs.
const ACES_FILMIC_TONE_MAPPING = 4 as THREE.ToneMapping
const LINEAR_TONE_MAPPING = 1 as THREE.ToneMapping
const BASIC_SHADOW_MAP = 0 as THREE.ShadowMapType
const PCF_SOFT_SHADOW_MAP = 2 as THREE.ShadowMapType
const SRGB_COLOR_SPACE = 'srgb' as THREE.ColorSpace

export const DEFAULT_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forwardPlus',
  hdr: true,
  multisampling: true,
  samples: 4,
  toneMapping: ACES_FILMIC_TONE_MAPPING,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: PCF_SOFT_SHADOW_MAP,
  shadowMapSize: 2048,
  physicallyCorrectLights: true,
  outputColorSpace: SRGB_COLOR_SPACE,
}

export const LITE_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forward',
  hdr: true,
  multisampling: false,
  samples: 1,
  toneMapping: ACES_FILMIC_TONE_MAPPING,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: BASIC_SHADOW_MAP,
  shadowMapSize: 1024,
  physicallyCorrectLights: true,
  outputColorSpace: SRGB_COLOR_SPACE,
}

export const MOBILE_PIPELINE_CONFIG: RenderPipelineConfig = {
  type: 'forward',
  hdr: false,
  multisampling: false,
  samples: 1,
  toneMapping: LINEAR_TONE_MAPPING,
  toneMappingExposure: 1.0,
  shadowMapEnabled: true,
  shadowMapType: BASIC_SHADOW_MAP,
  shadowMapSize: 512,
  physicallyCorrectLights: false,
  outputColorSpace: SRGB_COLOR_SPACE,
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
