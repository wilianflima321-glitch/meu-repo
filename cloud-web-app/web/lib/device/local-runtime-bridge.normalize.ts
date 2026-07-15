import type { DeviceRuntimePolicy } from './device-capability-profile'
import type {
  LocalRuntimeAiExecutionProvider,
  LocalRuntimeAssetTool,
  LocalRuntimeCapabilityReport,
  LocalRuntimeGraphicsBackend,
  LocalRuntimeMediaTool,
  LocalRuntimeOperatingSystem,
  LocalRuntimePreferredExecutor,
  LocalRuntimeRendererBackend,
  LocalRuntimeShaderTool,
  LocalRuntimeThermalState,
  LocalRuntimeToolchainFeature,
} from './local-runtime-bridge.contracts'

export function getReportTimestamp(report: LocalRuntimeCapabilityReport | null | undefined): number {
  if (!report) return 0
  const timestamp = Date.parse(report.receivedAt)
  return Number.isFinite(timestamp) ? timestamp : 0
}

const VIEWPORT_QUALITY_ORDER: Record<DeviceRuntimePolicy['viewportQuality'], number> = {
  low: 0,
  medium: 1,
  high: 2,
  ultra: 3,
}

function asPositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function asStringOrNull(value: unknown): string | null | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | undefined {
  if (typeof value !== 'string') return undefined
  return allowed.includes(value as T) ? (value as T) : undefined
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function asEnumArray<T extends string>(value: unknown, allowed: readonly T[]): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  const result = value.filter((entry): entry is T => typeof entry === 'string' && allowed.includes(entry as T))
  return result.length > 0 ? Array.from(new Set(result)) : undefined
}

function readAlias(source: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in source) return source[key]
  }
  return undefined
}

function asEnumArrayWithAliases<T extends string>(
  value: unknown,
  allowed: readonly T[],
  aliases: Record<string, T>
): T[] | undefined {
  if (!Array.isArray(value)) return undefined
  const result = value
    .map((entry) => {
      if (typeof entry !== 'string') return null
      return aliases[entry] ?? aliases[entry.toLowerCase()] ?? (allowed.includes(entry as T) ? entry as T : null)
    })
    .filter((entry): entry is T => Boolean(entry))
  return result.length > 0 ? Array.from(new Set(result)) : undefined
}

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function asStringRecord(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].trim().length > 0)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function normalizeRuntimeOperatingSystem(value: unknown): LocalRuntimeOperatingSystem {
  if (typeof value !== 'string') return 'unknown'
  const normalized = value.toLowerCase()
  if (normalized.includes('windows') || normalized === 'win32') return 'windows'
  if (normalized.includes('mac') || normalized.includes('darwin')) return 'macos'
  if (normalized.includes('linux')) return 'linux'
  return 'unknown'
}

function normalizeRuntimeThermalState(value: unknown): LocalRuntimeThermalState {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : value
  const thermal = asEnum(normalized, ['nominal', 'warm', 'elevated', 'critical', 'unknown'] as const)
  if (thermal === 'warm' || thermal === 'elevated') return 'elevated'
  return thermal ?? 'unknown'
}

function normalizeSerializedToken(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  return value.trim().replace(/_/g, '-').replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

function normalizeRuntimePreferredExecutor(
  value: unknown,
  thermalState: LocalRuntimeThermalState,
  storagePressure?: unknown
): LocalRuntimePreferredExecutor | undefined {
  const normalizedStoragePressure = normalizeSerializedToken(storagePressure)
  if (thermalState === 'critical' || normalizedStoragePressure === 'critical') return 'held'
  return asEnum(normalizeSerializedToken(value), ['local-native', 'local-worker', 'cloud-sandbox', 'held'] as const)
}

function pickMaxLocalAgents(params: {
  preferredExecutor?: LocalRuntimePreferredExecutor
  cpuCores?: number
  memoryGb?: number
}): number | undefined {
  if (params.preferredExecutor === 'held') return 0
  if (params.preferredExecutor === 'cloud-sandbox') return 1

  const cores = params.cpuCores ?? 0
  const memory = params.memoryGb ?? 0
  if (params.preferredExecutor === 'local-native' && cores >= 8 && memory >= 16) return 4
  if (params.preferredExecutor === 'local-native' && cores >= 6 && memory >= 8) return 3
  if (params.preferredExecutor === 'local-worker' && cores >= 4 && memory >= 6) return 2
  return undefined
}

function pickViewportQuality(params: {
  preferredExecutor?: LocalRuntimePreferredExecutor
  gpuComputeAvailable?: boolean
  memoryGb?: number
}): DeviceRuntimePolicy['viewportQuality'] | undefined {
  if (params.preferredExecutor === 'held') return 'low'
  if (!params.gpuComputeAvailable) return undefined
  if (params.preferredExecutor === 'local-native' && (params.memoryGb ?? 0) >= 16) return 'ultra'
  if (params.preferredExecutor === 'local-native') return 'high'
  return 'medium'
}

function normalizeStudioLocalProbeReport(candidate: Record<string, unknown>): LocalRuntimeCapabilityReport | null {
  const rawGeneratedAt = readAlias(candidate, 'generatedAt', 'generated_at')
  const generatedAt =
    typeof rawGeneratedAt === 'string' && !Number.isNaN(Date.parse(rawGeneratedAt))
      ? rawGeneratedAt
      : typeof rawGeneratedAt === 'string' && /^\d+$/.test(rawGeneratedAt)
        ? new Date(Number(rawGeneratedAt)).toISOString()
        : null

  if (!generatedAt) return null

  const totalMemoryMb = asNumberOrNull(readAlias(candidate, 'totalMemoryMb', 'total_memory_mb'))
  const availableMemoryMb = asNumberOrNull(readAlias(candidate, 'availableMemoryMb', 'available_memory_mb'))
  const storageFreeMb = asNumberOrNull(readAlias(candidate, 'storageFreeMb', 'storage_free_mb'))
  const cpuCores = asPositiveNumber(readAlias(candidate, 'cpuLogicalCores', 'cpu_logical_cores'))
  const memoryGb = totalMemoryMb !== null ? Math.round((totalMemoryMb / 1024) * 10) / 10 : undefined
  const freeStorageGb = storageFreeMb !== null ? Math.round((storageFreeMb / 1024) * 10) / 10 : undefined
  const thermalState = normalizeRuntimeThermalState(readAlias(candidate, 'thermalState', 'thermal_state'))
  const preferredExecutor = normalizeRuntimePreferredExecutor(
    readAlias(candidate, 'preferredExecutor', 'preferred_executor'),
    thermalState,
    readAlias(candidate, 'storagePressure', 'storage_pressure')
  )
  const npuAvailable = asBoolean(readAlias(candidate, 'npuAvailable', 'npu_available')) ?? asBoolean(readAlias(candidate, 'windowsMlAvailable', 'windows_ml_available')) ?? false
  const nativeGraphicsBackends = asEnumArrayWithAliases(readAlias(candidate, 'nativeGraphicsBackends', 'native_graphics_backends'), [
    'vulkan',
    'directx12',
    'metal',
    'webgpu',
    'opengl',
  ] as const, {
    Vulkan: 'vulkan',
    DirectX12: 'directx12',
    Metal: 'metal',
    WebGpu: 'webgpu',
    OpenGl: 'opengl',
  })
  const aiExecutionProviders = asEnumArrayWithAliases(readAlias(candidate, 'aiExecutionProviders', 'ai_execution_providers'), [
    'cpu',
    'cuda',
    'tensorrt',
    'directml',
    'coreml',
    'openvino',
    'qnn',
    'xnnpack',
    'webgpu',
    'webnn',
  ] as const, {
    Cpu: 'cpu',
    Cuda: 'cuda',
    TensorRt: 'tensorrt',
    DirectMl: 'directml',
    CoreMl: 'coreml',
    OpenVino: 'openvino',
    Qnn: 'qnn',
    Xnnpack: 'xnnpack',
    WebGpu: 'webgpu',
    WebNn: 'webnn',
  })
  const localToolchain = asEnumArrayWithAliases(readAlias(candidate, 'localToolchain', 'local_toolchain'), [
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
  ] as const, {
    Ffmpeg: 'ffmpeg',
    Ffprobe: 'ffprobe',
    Rapier: 'rapier',
    BrowserAutomation: 'browser-automation',
    AssetOptimizer: 'asset-optimizer',
    ShaderCompiler: 'shader-compiler',
    Meshoptimizer: 'meshoptimizer',
    KtxSoftware: 'ktx-software',
    Basisu: 'basisu',
    OpenUsd: 'openusd',
    BlenderHeadless: 'blender-headless',
    WgpuNative: 'wgpu-native',
    RecastDetour: 'recast-detour',
    ZigToolchain: 'zig-toolchain',
    ZigCCompiler: 'zig-c-compiler',
    OzzAnimation: 'ozz-animation',
    UnrealExportBridge: 'unreal-export-bridge',
    UnityExportBridge: 'unity-export-bridge',
    GodotExportBridge: 'godot-export-bridge',
  })
  const rendererBackends = asEnumArrayWithAliases(readAlias(candidate, 'rendererBackends', 'renderer_backends'), [
    'wgpu-native',
    'dawn-native',
    'three-webgpu',
    'three-webgl',
    'software-raster',
  ] as const, {
    WgpuNative: 'wgpu-native',
    DawnNative: 'dawn-native',
    ThreeWebGpu: 'three-webgpu',
    ThreeWebGl: 'three-webgl',
    SoftwareRaster: 'software-raster',
  })
  const assetTools = asEnumArrayWithAliases(readAlias(candidate, 'assetTools', 'asset_tools'), [
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
  ] as const, {
    GltfTransform: 'gltf-transform',
    Meshoptimizer: 'meshoptimizer',
    KtxSoftware: 'ktx-software',
    Basisu: 'basisu',
    OpenUsd: 'openusd',
    BlenderHeadless: 'blender-headless',
    RecastDetour: 'recast-detour',
    OzzAnimation: 'ozz-animation',
    UnrealExportBridge: 'unreal-export-bridge',
    UnityExportBridge: 'unity-export-bridge',
    GodotExportBridge: 'godot-export-bridge',
  })
  const mediaTools = asEnumArrayWithAliases(readAlias(candidate, 'mediaTools', 'media_tools'), ['ffmpeg', 'ffprobe'] as const, {
    Ffmpeg: 'ffmpeg',
    Ffprobe: 'ffprobe',
  })
  const shaderTools = asEnumArrayWithAliases(readAlias(candidate, 'shaderTools', 'shader_tools'), ['naga', 'wgsl-validator', 'shaderc', 'dxc'] as const, {
    Naga: 'naga',
    WgslValidator: 'wgsl-validator',
    Shaderc: 'shaderc',
    Dxc: 'dxc',
  })
  const gpuComputeAvailable = (
    asBoolean(readAlias(candidate, 'gpuAvailable', 'gpu_available')) ??
    asBoolean(readAlias(candidate, 'webGpuAvailable', 'web_gpu_available')) ??
    asBoolean(readAlias(candidate, 'directMlAvailable', 'direct_ml_available')) ??
    Boolean(nativeGraphicsBackends?.length)
  ) || false
  const maxLocalAgents = pickMaxLocalAgents({
    preferredExecutor,
    cpuCores,
    memoryGb: availableMemoryMb !== null ? Math.round((availableMemoryMb / 1024) * 10) / 10 : memoryGb,
  })

  return {
    version: 1,
    hostKind: 'native-daemon',
    transport: 'api-sync',
    os: normalizeRuntimeOperatingSystem(candidate.os),
    receivedAt: generatedAt,
    appVersion: `contract-v${candidate.version ?? 1}`,
    machineName: null,
    cpuCores,
    memoryGb,
    freeStorageGb,
    gpuComputeAvailable,
    npuAvailable,
    npuName: npuAvailable ? asStringOrNull(readAlias(candidate, 'gpuName', 'gpu_name')) ?? null : null,
    directMlAvailable: asBoolean(readAlias(candidate, 'directMlAvailable', 'direct_ml_available')),
    onnxRuntimeAvailable: asBoolean(readAlias(candidate, 'onnxRuntimeAvailable', 'onnx_runtime_available')),
    rapierAvailable: asBoolean(readAlias(candidate, 'rapierAvailable', 'rapier_available')),
    nativeGraphicsBackends,
    aiExecutionProviders,
    localToolchain,
    rendererBackends: rendererBackends ?? (nativeGraphicsBackends?.length ? ['wgpu-native'] : undefined),
    assetTools,
    mediaTools,
    shaderTools,
    toolVersions: asStringRecord(readAlias(candidate, 'toolVersions', 'tool_versions')),
    toolDigests: asStringRecord(readAlias(candidate, 'toolDigests', 'tool_digests')),
    maxVramMb: asPositiveNumber(readAlias(candidate, 'maxVramMb', 'max_vram_mb')),
    maxTextureSize: asPositiveNumber(readAlias(candidate, 'maxTextureSize', 'max_texture_size')),
    supportsOffscreenRender: asBoolean(readAlias(candidate, 'supportsOffscreenRender', 'supports_offscreen_render')),
    maxLocalAgents,
    preferredExecutor,
    recommendedViewportQuality: pickViewportQuality({
      preferredExecutor,
      gpuComputeAvailable,
      memoryGb,
    }),
    localModelPolicy: npuAvailable
      ? 'allow-small-models'
      : preferredExecutor === 'local-native'
        ? 'prefer-cloud-heavy-models'
        : 'cloud-only',
    supportsPersistentMemory: freeStorageGb !== undefined ? freeStorageGb >= 2 : undefined,
    thermalState,
  }
}

export function sanitizeLocalRuntimeCapabilityReport(
  value: unknown
): LocalRuntimeCapabilityReport | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
  if (typeof candidate.generatedAt === 'string' || typeof candidate.generated_at === 'string' || 'cpuLogicalCores' in candidate || 'cpu_logical_cores' in candidate) {
    return normalizeStudioLocalProbeReport(candidate)
  }

  const receivedAt =
    typeof candidate.receivedAt === 'string' && !Number.isNaN(Date.parse(candidate.receivedAt))
      ? candidate.receivedAt
      : null

  if (!receivedAt) {
    return null
  }

  return {
    version: 1,
    hostKind: asEnum(candidate.hostKind, ['desktop-app', 'native-daemon', 'native-worker', 'unknown']) ?? 'unknown',
    transport: asEnum(candidate.transport, ['custom-event', 'postmessage', 'storage-sync', 'api-sync', 'unknown']) ?? 'unknown',
    os: asEnum(candidate.os, ['windows', 'macos', 'linux', 'unknown']) ?? 'unknown',
    receivedAt,
    appVersion: asStringOrNull(candidate.appVersion) ?? null,
    machineName: asStringOrNull(candidate.machineName) ?? null,
    cpuCores: asPositiveNumber(candidate.cpuCores),
    memoryGb: asPositiveNumber(candidate.memoryGb),
    freeStorageGb: asPositiveNumber(candidate.freeStorageGb),
    gpuComputeAvailable: asBoolean(candidate.gpuComputeAvailable),
    npuAvailable: asBoolean(candidate.npuAvailable),
    npuName: asStringOrNull(candidate.npuName) ?? null,
    directMlAvailable: asBoolean(candidate.directMlAvailable),
    onnxRuntimeAvailable: asBoolean(candidate.onnxRuntimeAvailable),
    rapierAvailable: asBoolean(candidate.rapierAvailable),
    nativeGraphicsBackends: asEnumArray(candidate.nativeGraphicsBackends, [
      'vulkan',
      'directx12',
      'metal',
      'webgpu',
      'opengl',
    ] as const),
    aiExecutionProviders: asEnumArray(candidate.aiExecutionProviders, [
      'cpu',
      'cuda',
      'tensorrt',
      'directml',
      'coreml',
      'openvino',
      'qnn',
      'xnnpack',
      'webgpu',
      'webnn',
    ] as const),
    localToolchain: asEnumArray(candidate.localToolchain, [
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
    ] as const),
    rendererBackends: asEnumArray(candidate.rendererBackends, [
      'wgpu-native',
      'dawn-native',
      'three-webgpu',
      'three-webgl',
      'software-raster',
    ] as const),
    assetTools: asEnumArray(candidate.assetTools, [
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
    ] as const),
    mediaTools: asEnumArray(candidate.mediaTools, ['ffmpeg', 'ffprobe'] as const),
    shaderTools: asEnumArray(candidate.shaderTools, ['naga', 'wgsl-validator', 'shaderc', 'dxc'] as const),
    toolVersions: asStringRecord(candidate.toolVersions),
    toolDigests: asStringRecord(candidate.toolDigests),
    maxVramMb: asPositiveNumber(candidate.maxVramMb),
    maxTextureSize: asPositiveNumber(candidate.maxTextureSize),
    supportsOffscreenRender: asBoolean(candidate.supportsOffscreenRender),
    maxLocalAgents: asPositiveNumber(candidate.maxLocalAgents),
    preferredExecutor:
      asEnum(candidate.preferredExecutor, ['local-native', 'local-worker', 'cloud-sandbox', 'held']) ?? undefined,
    recommendedViewportQuality: asEnum(candidate.recommendedViewportQuality, ['low', 'medium', 'high', 'ultra']),
    localModelPolicy: asEnum(candidate.localModelPolicy, [
      'allow-small-models',
      'prefer-cloud-heavy-models',
      'cloud-only',
    ]),
    supportsPersistentMemory: asBoolean(candidate.supportsPersistentMemory),
    thermalState: asEnum(candidate.thermalState, ['nominal', 'elevated', 'critical', 'unknown']) ?? 'unknown',
  }
}


export function pickBetterViewport(
  current: DeviceRuntimePolicy['viewportQuality'],
  desired?: DeviceRuntimePolicy['viewportQuality']
): DeviceRuntimePolicy['viewportQuality'] {
  if (!desired) return current
  return VIEWPORT_QUALITY_ORDER[desired] > VIEWPORT_QUALITY_ORDER[current] ? desired : current
}
