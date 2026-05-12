import type {
  DeviceCapabilityProfile,
  DeviceRuntimeMode,
  DeviceRuntimePolicy,
  NpuSignal,
} from './device-capability-profile'

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

function getReportTimestamp(report: LocalRuntimeCapabilityReport | null | undefined): number {
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

function asNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
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
  const thermal = asEnum(value, ['nominal', 'warm', 'elevated', 'critical', 'unknown'] as const)
  if (thermal === 'warm' || thermal === 'elevated') return 'elevated'
  return thermal ?? 'unknown'
}

function normalizeRuntimePreferredExecutor(
  value: unknown,
  thermalState: LocalRuntimeThermalState,
  storagePressure?: unknown
): LocalRuntimePreferredExecutor | undefined {
  if (thermalState === 'critical' || storagePressure === 'critical') return 'held'
  return asEnum(value, ['local-native', 'local-worker', 'cloud-sandbox', 'held'] as const)
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
  const generatedAt =
    typeof candidate.generatedAt === 'string' && !Number.isNaN(Date.parse(candidate.generatedAt))
      ? candidate.generatedAt
      : null

  if (!generatedAt) return null

  const totalMemoryMb = asNumberOrNull(candidate.totalMemoryMb)
  const availableMemoryMb = asNumberOrNull(candidate.availableMemoryMb)
  const storageFreeMb = asNumberOrNull(candidate.storageFreeMb)
  const cpuCores = asPositiveNumber(candidate.cpuLogicalCores)
  const memoryGb = totalMemoryMb !== null ? Math.round((totalMemoryMb / 1024) * 10) / 10 : undefined
  const freeStorageGb = storageFreeMb !== null ? Math.round((storageFreeMb / 1024) * 10) / 10 : undefined
  const thermalState = normalizeRuntimeThermalState(candidate.thermalState)
  const preferredExecutor = normalizeRuntimePreferredExecutor(
    candidate.preferredExecutor,
    thermalState,
    candidate.storagePressure
  )
  const npuAvailable = asBoolean(candidate.npuAvailable) ?? asBoolean(candidate.windowsMlAvailable) ?? false
  const nativeGraphicsBackends = asEnumArray(candidate.nativeGraphicsBackends, [
    'vulkan',
    'directx12',
    'metal',
    'webgpu',
    'opengl',
  ] as const)
  const aiExecutionProviders = asEnumArray(candidate.aiExecutionProviders, [
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
  ] as const)
  const localToolchain = asEnumArray(candidate.localToolchain, [
    'ffmpeg',
    'ffprobe',
    'rapier',
    'browser-automation',
    'asset-optimizer',
    'shader-compiler',
  ] as const)
  const gpuComputeAvailable = (
    asBoolean(candidate.gpuAvailable) ??
    asBoolean(candidate.webGpuAvailable) ??
    asBoolean(candidate.directMlAvailable) ??
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
    npuName: npuAvailable ? asStringOrNull(candidate.gpuName) ?? null : null,
    directMlAvailable: asBoolean(candidate.directMlAvailable),
    onnxRuntimeAvailable: asBoolean(candidate.onnxRuntimeAvailable),
    rapierAvailable: asBoolean(candidate.rapierAvailable),
    nativeGraphicsBackends,
    aiExecutionProviders,
    localToolchain,
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
  if (typeof candidate.generatedAt === 'string' || 'cpuLogicalCores' in candidate) {
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
    ] as const),
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

export function getLocalRuntimeConnectionState(
  report: LocalRuntimeCapabilityReport | null | undefined,
  now = Date.now()
): LocalRuntimeConnectionState {
  if (!report) return 'missing'
  const ageMs = Math.max(0, now - Date.parse(report.receivedAt))
  return ageMs > LOCAL_RUNTIME_STALE_MS ? 'stale' : 'connected'
}

function describeExecutor(preferredExecutor?: LocalRuntimePreferredExecutor): string {
  switch (preferredExecutor) {
    case 'local-native':
      return 'Local native'
    case 'local-worker':
      return 'Local worker'
    case 'cloud-sandbox':
      return 'Cloud sandbox'
    case 'held':
      return 'Held safely'
    default:
      return 'Browser shell'
  }
}

function describeAccelerator(report: LocalRuntimeCapabilityReport | null): string {
  if (!report) return 'Browser-only'
  if (report.npuAvailable) {
    return report.npuName ? `NPU - ${report.npuName}` : 'NPU available'
  }
  if (report.gpuComputeAvailable) {
    return 'GPU compute'
  }
  return 'Cloud fallback'
}

function buildLocalRuntimeSummary(
  connection: LocalRuntimeConnectionState,
  report: LocalRuntimeCapabilityReport | null
): string {
  if (connection === 'missing') {
    return 'Studio Local has not attached a native capability probe yet, so Aethel is still making decisions from browser-only signals.'
  }

  if (connection === 'stale') {
    return 'The last Studio Local probe is stale. Aethel is keeping the web shell safe until the native bridge refreshes.'
  }

  if (!report) {
    return 'Studio Local capability data is unavailable, so Aethel is keeping native acceleration conservative.'
  }

  if (report.thermalState === 'critical') {
    return 'Studio Local reported critical thermal pressure, so Aethel should fall back to isolated cloud lanes until the device cools down.'
  }

  if (report.preferredExecutor === 'held') {
    return 'Studio Local is connected but holding native work because the device reported unsafe capacity, thermal, or storage pressure.'
  }

  if (report.preferredExecutor === 'local-native') {
    return 'Studio Local is connected and can take native-side agent work, indexing, and small local models while the web shell stays responsive.'
  }

  if (report.preferredExecutor === 'local-worker') {
    return 'Studio Local is connected for worker-side acceleration, but Aethel should still keep the heaviest jobs isolated from the UI.'
  }

  return 'Studio Local is connected, but this device should still favor cloud isolation for the heaviest work.'
}

function elevateNpuSignal(
  baseSignal: NpuSignal,
  report: LocalRuntimeCapabilityReport | null
): NpuSignal {
  if (report?.npuAvailable) {
    return 'native-runtime-available'
  }
  return baseSignal
}

function pickStrongerMode(
  current: DeviceRuntimeMode,
  desired: DeviceRuntimeMode
): DeviceRuntimeMode {
  const rank: Record<DeviceRuntimeMode, number> = {
    'safe-mode': 0,
    'cloud-isolated': 1,
    'hybrid-balanced': 2,
    'local-accelerated': 3,
  }

  return rank[desired] > rank[current] ? desired : current
}

function pickBetterViewport(
  current: DeviceRuntimePolicy['viewportQuality'],
  desired?: DeviceRuntimePolicy['viewportQuality']
): DeviceRuntimePolicy['viewportQuality'] {
  if (!desired) return current
  return VIEWPORT_QUALITY_ORDER[desired] > VIEWPORT_QUALITY_ORDER[current] ? desired : current
}

export function buildLocalRuntimeBridgeState(
  report: LocalRuntimeCapabilityReport | null | undefined,
  now = Date.now()
): LocalRuntimeBridgeState {
  const connection = getLocalRuntimeConnectionState(report, now)
  const ageMs = report ? Math.max(0, now - Date.parse(report.receivedAt)) : null
  const canUseNativeAcceleration = Boolean(
    report && report.preferredExecutor !== 'held' && (report.npuAvailable || report.gpuComputeAvailable)
  )

  return {
    connection,
    report: report ?? null,
    ageMs,
    acceleratorLabel: describeAccelerator(report ?? null),
    executorLabel: describeExecutor(report?.preferredExecutor),
    summary: buildLocalRuntimeSummary(connection, report ?? null),
    canUseNativeAcceleration,
  }
}

export function isLocalRuntimeReportFresher(
  candidate: LocalRuntimeCapabilityReport | null | undefined,
  baseline: LocalRuntimeCapabilityReport | null | undefined
): boolean {
  return getReportTimestamp(candidate) > getReportTimestamp(baseline)
}

export function pickPreferredLocalRuntimeReport(
  primary: LocalRuntimeCapabilityReport | null | undefined,
  fallback: LocalRuntimeCapabilityReport | null | undefined
): LocalRuntimeCapabilityReport | null {
  if (!primary && !fallback) return null
  if (!primary) return fallback ?? null
  if (!fallback) return primary
  return isLocalRuntimeReportFresher(fallback, primary) ? fallback : primary
}

export function mergeDeviceCapabilityProfileWithLocalRuntime(
  baseProfile: DeviceCapabilityProfile,
  report: LocalRuntimeCapabilityReport | null | undefined,
  now = Date.now()
): DeviceCapabilityProfile {
  const connection = getLocalRuntimeConnectionState(report, now)
  if (connection !== 'connected' || !report) {
    return baseProfile
  }

  if (report.thermalState === 'critical' || report.preferredExecutor === 'held') {
    return {
      ...baseProfile,
      policy: {
        ...baseProfile.policy,
        mode: 'cloud-isolated',
        tier: 'cloud-safe',
        npuSignal: elevateNpuSignal(baseProfile.policy.npuSignal, report),
        maxParallelAgents: 1,
        viewportQuality: 'medium',
        localModelPolicy: 'cloud-only',
        browserOperatorPolicy: 'manual-confirmation',
        memoryPolicy:
          baseProfile.policy.memoryPolicy === 'persistent-index-ok'
            ? 'compact-memory'
            : baseProfile.policy.memoryPolicy,
        backgroundTaskBudget: 'limited',
        safetySummary:
          report.preferredExecutor === 'held'
            ? 'Studio Local intentionally held native execution, so Aethel is protecting the user session and routing heavy work away from the device.'
            : 'Studio Local reported critical thermal pressure, so Aethel is pushing heavy work back to isolated lanes.',
        recommendations: [
          report.preferredExecutor === 'held'
            ? 'Keep local heavy inference, indexing, and render jobs paused until a fresh probe clears the blocker.'
            : 'Pause local heavy inference, indexing, and viewport bursts until the native runtime cools down.',
          'Keep browser operator, builds, and exports in cloud or sandbox lanes while local safety is degraded.',
          'Refresh the local capability probe before scaling agents back up.',
        ],
      },
    }
  }

  const localAccelerationAvailable =
    report.preferredExecutor === 'local-native' || Boolean(report.npuAvailable || report.gpuComputeAvailable)

  if (!localAccelerationAvailable) {
    return {
      ...baseProfile,
      policy: {
        ...baseProfile.policy,
        npuSignal: elevateNpuSignal(baseProfile.policy.npuSignal, report),
      },
    }
  }

  const desiredMode =
    report.preferredExecutor === 'local-native' && (report.maxLocalAgents ?? 0) >= 3
      ? 'local-accelerated'
      : 'hybrid-balanced'
  const mergedMode = pickStrongerMode(baseProfile.policy.mode, desiredMode)
  const maxParallelAgents = Math.max(baseProfile.policy.maxParallelAgents, Math.min(report.maxLocalAgents ?? 2, 6))
  const desiredLocalModelPolicy =
    report.localModelPolicy ?? (report.npuAvailable ? 'allow-small-models' : 'prefer-cloud-heavy-models')

  return {
    ...baseProfile,
    policy: {
      ...baseProfile.policy,
      mode: mergedMode,
      tier: mergedMode === 'local-accelerated' ? 'accelerated-local' : 'balanced-local',
      npuSignal: elevateNpuSignal(baseProfile.policy.npuSignal, report),
      maxParallelAgents,
      viewportQuality: pickBetterViewport(
        baseProfile.policy.viewportQuality,
        report.recommendedViewportQuality ?? (report.preferredExecutor === 'local-native' ? 'high' : undefined)
      ),
      localModelPolicy: desiredLocalModelPolicy,
      browserOperatorPolicy:
        mergedMode === 'local-accelerated' ? 'normal' : baseProfile.policy.browserOperatorPolicy,
      memoryPolicy:
        report.supportsPersistentMemory === true
          ? 'persistent-index-ok'
          : baseProfile.policy.memoryPolicy,
      backgroundTaskBudget: maxParallelAgents >= 3 ? 'deep' : 'standard',
      safetySummary:
        'Studio Local is connected, so Aethel can route small models, indexing, and side work into the native executor without overloading the browser shell.',
      recommendations: [
        'Prefer the native executor for small local models, embeddings, OCR, and project indexing.',
        'Keep long browser sessions, AAA exports, and risky automation in isolated cloud lanes even when the local bridge is healthy.',
        'Use the local bridge as a capability amplifier, not as permission to run everything on the main device at once.',
      ],
    },
  }
}
