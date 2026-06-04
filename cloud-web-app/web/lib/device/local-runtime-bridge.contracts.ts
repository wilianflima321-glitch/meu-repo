import type { DeviceRuntimePolicy } from './device-capability-profile'

export const LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY = 'aethel.runtime.local-capabilities.v1'
export const LOCAL_RUNTIME_DEVICE_ID_STORAGE_KEY = 'aethel.runtime.local-device-id.v1'
export const LOCAL_RUNTIME_CAPABILITY_EVENT = 'aethel:studio-local-capabilities'
export const LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT = 'aethel:request-studio-local-capabilities'
export const LOCAL_RUNTIME_STALE_MS = 5 * 60 * 1000

export type LocalRuntimeHostKind = 'desktop-app' | 'native-daemon' | 'native-worker' | 'unknown'
export type LocalRuntimeTransport = 'custom-event' | 'postmessage' | 'storage-sync' | 'api-sync' | 'unknown'
export type LocalRuntimeOperatingSystem = 'windows' | 'macos' | 'linux' | 'unknown'
export type LocalRuntimePreferredExecutor = 'local-native' | 'local-worker' | 'cloud-sandbox' | 'held'
export type LocalRuntimeThermalState = 'nominal' | 'elevated' | 'critical' | 'unknown'
export type LocalRuntimeConnectionState = 'missing' | 'connected' | 'stale'
export type LocalRuntimeGraphicsBackend = 'vulkan' | 'directx12' | 'metal' | 'webgpu' | 'opengl'
export type LocalRuntimeAiExecutionProvider =
  | 'cpu'
  | 'cuda'
  | 'tensorrt'
  | 'directml'
  | 'coreml'
  | 'openvino'
  | 'qnn'
  | 'xnnpack'
  | 'webgpu'
  | 'webnn'
export type LocalRuntimeToolchainFeature =
  | 'ffmpeg'
  | 'ffprobe'
  | 'rapier'
  | 'browser-automation'
  | 'asset-optimizer'
  | 'shader-compiler'
  | 'meshoptimizer'
  | 'ktx-software'
  | 'basisu'
  | 'openusd'
  | 'blender-headless'
  | 'wgpu-native'
  | 'recast-detour'
  | 'zig-toolchain'
  | 'zig-c-compiler'
  | 'ozz-animation'
  | 'unreal-export-bridge'
  | 'unity-export-bridge'
  | 'godot-export-bridge'

export type LocalRuntimeRendererBackend =
  | 'wgpu-native'
  | 'dawn-native'
  | 'three-webgpu'
  | 'three-webgl'
  | 'software-raster'
export type LocalRuntimeAssetTool =
  | 'gltf-transform'
  | 'meshoptimizer'
  | 'ktx-software'
  | 'basisu'
  | 'openusd'
  | 'blender-headless'
  | 'recast-detour'
  | 'ozz-animation'
  | 'unreal-export-bridge'
  | 'unity-export-bridge'
  | 'godot-export-bridge'
export type LocalRuntimeMediaTool = 'ffmpeg' | 'ffprobe'
export type LocalRuntimeShaderTool = 'naga' | 'wgsl-validator' | 'shaderc' | 'dxc'

export interface LocalRuntimeCapabilityReport {
  version: 1
  hostKind: LocalRuntimeHostKind
  transport: LocalRuntimeTransport
  os: LocalRuntimeOperatingSystem
  receivedAt: string
  appVersion?: string | null
  machineName?: string | null
  cpuCores?: number
  memoryGb?: number
  freeStorageGb?: number
  gpuComputeAvailable?: boolean
  npuAvailable?: boolean
  npuName?: string | null
  directMlAvailable?: boolean
  onnxRuntimeAvailable?: boolean
  rapierAvailable?: boolean
  nativeGraphicsBackends?: LocalRuntimeGraphicsBackend[]
  aiExecutionProviders?: LocalRuntimeAiExecutionProvider[]
  localToolchain?: LocalRuntimeToolchainFeature[]
  rendererBackends?: LocalRuntimeRendererBackend[]
  assetTools?: LocalRuntimeAssetTool[]
  mediaTools?: LocalRuntimeMediaTool[]
  shaderTools?: LocalRuntimeShaderTool[]
  toolVersions?: Record<string, string>
  toolDigests?: Record<string, string>
  maxVramMb?: number
  maxTextureSize?: number
  supportsOffscreenRender?: boolean
  maxLocalAgents?: number
  preferredExecutor?: LocalRuntimePreferredExecutor
  recommendedViewportQuality?: DeviceRuntimePolicy['viewportQuality']
  localModelPolicy?: DeviceRuntimePolicy['localModelPolicy']
  supportsPersistentMemory?: boolean
  thermalState?: LocalRuntimeThermalState
}

export interface LocalRuntimeBridgeState {
  connection: LocalRuntimeConnectionState
  report: LocalRuntimeCapabilityReport | null
  ageMs: number | null
  acceleratorLabel: string
  executorLabel: string
  summary: string
  canUseNativeAcceleration: boolean
}
