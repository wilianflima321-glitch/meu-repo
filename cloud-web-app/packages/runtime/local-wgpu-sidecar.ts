import type {
  LocalRuntimeAssetTool,
  LocalRuntimeCapabilityReport,
  LocalRuntimeGraphicsBackend,
  LocalRuntimeMediaTool,
  LocalRuntimeRendererBackend,
  LocalRuntimeShaderTool,
  LocalRuntimeToolchainFeature,
} from '../../web/lib/device/local-runtime-bridge'
import type { ViewportRenderQueuePayload } from '../../web/lib/viewport/viewport-render-queue'
import { buildRuntimeRendererRequestEnvelope } from './runtime-renderer-adapter'

export interface LocalWgpuSidecarProbeRequest {
  schemaVersion: 1
  kind: 'aethel.wgpu.probe'
  requestedAt: string
  timeoutMs: number
  benchmark: {
    enabled: true
    maxDurationMs: number
    maxFrames: number
  }
  policy: {
    noDownloads: true
    noMainThread: true
    manualConsentOnly: true
  }
}

export interface LocalWgpuSidecarProbeResponse {
  schemaVersion: 1
  sidecarVersion: string
  os: 'windows' | 'macos' | 'linux' | 'unknown'
  receivedAt?: string
  machineName?: string | null
  cpuCores?: number
  memoryGb?: number
  freeStorageGb?: number
  preferredBackend?: LocalRuntimeGraphicsBackend
  nativeGraphicsBackends?: LocalRuntimeGraphicsBackend[]
  rendererBackends?: LocalRuntimeRendererBackend[]
  assetTools?: LocalRuntimeAssetTool[]
  mediaTools?: LocalRuntimeMediaTool[]
  shaderTools?: LocalRuntimeShaderTool[]
  localToolchain?: LocalRuntimeToolchainFeature[]
  toolVersions?: Record<string, string>
  toolDigests?: Record<string, string>
  maxVramMb?: number
  maxTextureSize?: number
  supportsOffscreenRender?: boolean
  thermalState?: 'nominal' | 'elevated' | 'critical' | 'unknown'
  benchmark?: {
    durationMs: number
    frames: number
    averageFrameMs: number
  }
}

export interface LocalWgpuSidecarRenderRequest {
  schemaVersion: 1
  kind: 'aethel.wgpu.render'
  idempotencyKey: string
  payload: ViewportRenderQueuePayload
  rendererRequest: ReturnType<typeof buildRuntimeRendererRequestEnvelope>
  policy: {
    noDownloads: true
    noMainThread: true
    requireOffscreenRender: true
    requirePerformanceReport: true
    requireValidationReport: true
    maxRenderTimeMs: number
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function stringOrNull(value: unknown): string | null | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function stringRecord(value: unknown): Record<string, string> | undefined {
  if (!isRecord(value)) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string] => {
    return typeof entry[1] === 'string' && entry[1].trim().length > 0
  })
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function enumArray<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  const result = value.filter((entry): entry is T => typeof entry === 'string' && allowed.includes(entry as T))
  return result.length > 0 ? Array.from(new Set(result)) : undefined
}

const GRAPHICS_BACKENDS = ['vulkan', 'directx12', 'metal', 'webgpu', 'opengl'] as const
const RENDERER_BACKENDS = ['wgpu-native', 'dawn-native', 'three-webgpu', 'three-webgl', 'software-raster'] as const
const ASSET_TOOLS = [
  'gltf-transform',
  'meshoptimizer',
  'ktx-software',
  'basisu',
  'openusd',
  'blender-headless',
  'recast-detour',
  'ozz-animation',
  'unreal-export-bridge',
  'unity-export-bridge',
  'godot-export-bridge',
] as const
const MEDIA_TOOLS = ['ffmpeg', 'ffprobe'] as const
const SHADER_TOOLS = ['naga', 'wgsl-validator', 'shaderc', 'dxc'] as const
const TOOLCHAIN = [
  'ffmpeg',
  'ffprobe',
  'rapier',
  'browser-automation',
  'asset-optimizer',
  'shader-compiler',
  'meshoptimizer',
  'ktx-software',
  'basisu',
  'openusd',
  'blender-headless',
  'wgpu-native',
  'recast-detour',
  'zig-toolchain',
  'zig-c-compiler',
  'ozz-animation',
  'unreal-export-bridge',
  'unity-export-bridge',
  'godot-export-bridge',
] as const

export function buildLocalWgpuSidecarProbeRequest(now = new Date().toISOString()): LocalWgpuSidecarProbeRequest {
  return {
    schemaVersion: 1,
    kind: 'aethel.wgpu.probe',
    requestedAt: now,
    timeoutMs: 5_000,
    benchmark: {
      enabled: true,
      maxDurationMs: 750,
      maxFrames: 30,
    },
    policy: {
      noDownloads: true,
      noMainThread: true,
      manualConsentOnly: true,
    },
  }
}

export function buildLocalWgpuSidecarRenderRequest(
  payload: ViewportRenderQueuePayload
): LocalWgpuSidecarRenderRequest {
  const rendererRequest = buildRuntimeRendererRequestEnvelope(payload)
  return {
    schemaVersion: 1,
    kind: 'aethel.wgpu.render',
    idempotencyKey: rendererRequest.idempotencyKey,
    payload,
    rendererRequest,
    policy: {
      noDownloads: true,
      noMainThread: true,
      requireOffscreenRender: true,
      requirePerformanceReport: true,
      requireValidationReport: true,
      maxRenderTimeMs: Math.max(30_000, payload.metadata.renderContract.profile.maxDurationSeconds * 1_000),
    },
  }
}

export function coerceLocalWgpuSidecarCapabilityReport(
  value: unknown,
  receivedAt = new Date().toISOString()
): LocalRuntimeCapabilityReport | null {
  if (!isRecord(value) || value.schemaVersion !== 1) return null

  const os = value.os === 'windows' || value.os === 'macos' || value.os === 'linux' ? value.os : 'unknown'
  const nativeGraphicsBackends = enumArray(value.nativeGraphicsBackends, GRAPHICS_BACKENDS)
  const rendererBackends = enumArray(value.rendererBackends, RENDERER_BACKENDS)
    ?? (nativeGraphicsBackends?.length ? ['wgpu-native' as const] : undefined)
  const supportsOffscreenRender = value.supportsOffscreenRender === true
  const thermalState =
    value.thermalState === 'nominal' || value.thermalState === 'elevated' || value.thermalState === 'critical'
      ? value.thermalState
      : 'unknown'
  const canUseNative = Boolean(rendererBackends?.includes('wgpu-native') && supportsOffscreenRender && thermalState !== 'critical')

  return {
    version: 1,
    hostKind: 'native-daemon',
    transport: 'api-sync',
    os,
    receivedAt,
    appVersion: stringOrNull(value.sidecarVersion) ?? null,
    machineName: stringOrNull(value.machineName) ?? null,
    cpuCores: positiveNumber(value.cpuCores),
    memoryGb: positiveNumber(value.memoryGb),
    freeStorageGb: positiveNumber(value.freeStorageGb),
    gpuComputeAvailable: canUseNative,
    npuAvailable: false,
    nativeGraphicsBackends,
    localToolchain: enumArray(value.localToolchain, TOOLCHAIN),
    rendererBackends,
    assetTools: enumArray(value.assetTools, ASSET_TOOLS),
    mediaTools: enumArray(value.mediaTools, MEDIA_TOOLS),
    shaderTools: enumArray(value.shaderTools, SHADER_TOOLS),
    toolVersions: stringRecord(value.toolVersions),
    toolDigests: stringRecord(value.toolDigests),
    maxVramMb: positiveNumber(value.maxVramMb),
    maxTextureSize: positiveNumber(value.maxTextureSize),
    supportsOffscreenRender,
    preferredExecutor: canUseNative ? 'local-native' : 'held',
    recommendedViewportQuality: canUseNative ? 'high' : 'low',
    localModelPolicy: 'prefer-cloud-heavy-models',
    supportsPersistentMemory: false,
    thermalState,
  }
}
