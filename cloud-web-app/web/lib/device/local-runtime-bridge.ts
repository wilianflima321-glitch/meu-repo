import type {
  DeviceCapabilityProfile,
  DeviceRuntimeMode,
  DeviceRuntimePolicy,
  NpuSignal,
} from './device-capability-profile'

import {
  LOCAL_RUNTIME_CAPABILITY_EVENT,
  LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT,
  LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY,
  LOCAL_RUNTIME_DEVICE_ID_STORAGE_KEY,
  LOCAL_RUNTIME_STALE_MS,
} from './local-runtime-bridge.contracts'
import type {
  LocalRuntimeBridgeState,
  LocalRuntimeCapabilityReport,
  LocalRuntimeConnectionState,
  LocalRuntimePreferredExecutor,
} from './local-runtime-bridge.contracts'
import { getReportTimestamp, pickBetterViewport } from './local-runtime-bridge.normalize'

export {
  LOCAL_RUNTIME_CAPABILITY_EVENT,
  LOCAL_RUNTIME_CAPABILITY_REQUEST_EVENT,
  LOCAL_RUNTIME_CAPABILITY_STORAGE_KEY,
  LOCAL_RUNTIME_DEVICE_ID_STORAGE_KEY,
  LOCAL_RUNTIME_STALE_MS,
} from './local-runtime-bridge.contracts'
export type {
  LocalRuntimeAiExecutionProvider,
  LocalRuntimeAssetTool,
  LocalRuntimeBridgeState,
  LocalRuntimeCapabilityReport,
  LocalRuntimeConnectionState,
  LocalRuntimeGraphicsBackend,
  LocalRuntimeHostKind,
  LocalRuntimeMediaTool,
  LocalRuntimeOperatingSystem,
  LocalRuntimePreferredExecutor,
  LocalRuntimeRendererBackend,
  LocalRuntimeShaderTool,
  LocalRuntimeThermalState,
  LocalRuntimeToolchainFeature,
  LocalRuntimeTransport,
} from './local-runtime-bridge.contracts'
export { sanitizeLocalRuntimeCapabilityReport } from './local-runtime-bridge.normalize'

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
