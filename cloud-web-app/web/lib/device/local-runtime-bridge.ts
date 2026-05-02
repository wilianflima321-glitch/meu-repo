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
export type LocalRuntimeTransport = 'custom-event' | 'postmessage' | 'storage-sync' | 'unknown'
export type LocalRuntimeOperatingSystem = 'windows' | 'macos' | 'linux' | 'unknown'
export type LocalRuntimePreferredExecutor = 'local-native' | 'local-worker' | 'cloud-sandbox'
export type LocalRuntimeThermalState = 'nominal' | 'elevated' | 'critical' | 'unknown'
export type LocalRuntimeConnectionState = 'missing' | 'connected' | 'stale'

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

export function sanitizeLocalRuntimeCapabilityReport(
  value: unknown
): LocalRuntimeCapabilityReport | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Record<string, unknown>
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
    transport: asEnum(candidate.transport, ['custom-event', 'postmessage', 'storage-sync', 'unknown']) ?? 'unknown',
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
    maxLocalAgents: asPositiveNumber(candidate.maxLocalAgents),
    preferredExecutor:
      asEnum(candidate.preferredExecutor, ['local-native', 'local-worker', 'cloud-sandbox']) ?? undefined,
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
  const canUseNativeAcceleration = Boolean(report && (report.npuAvailable || report.gpuComputeAvailable))

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

  if (report.thermalState === 'critical') {
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
          'Studio Local reported critical thermal pressure, so Aethel is pushing heavy work back to isolated lanes.',
        recommendations: [
          'Pause local heavy inference, indexing, and viewport bursts until the native runtime cools down.',
          'Keep browser operator, builds, and exports in cloud or sandbox lanes while thermal pressure is elevated.',
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
