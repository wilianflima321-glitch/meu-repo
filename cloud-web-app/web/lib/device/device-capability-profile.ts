export type DeviceCapabilityTier = 'accelerated-local' | 'balanced-local' | 'cloud-safe' | 'constrained'

export type DeviceRuntimeMode = 'local-accelerated' | 'hybrid-balanced' | 'cloud-isolated' | 'safe-mode'

export type NpuSignal = 'webnn-available' | 'native-required' | 'not-detectable'

export interface RawDeviceCapabilitySignals {
  hardwareConcurrency?: number
  deviceMemoryGb?: number
  storageQuotaGb?: number
  storageUsageGb?: number
  webgpuAvailable: boolean
  webnnAvailable: boolean
  saveData: boolean
  effectiveConnectionType?: string
  prefersReducedMotion: boolean
}

export interface DeviceRuntimePolicy {
  mode: DeviceRuntimeMode
  tier: DeviceCapabilityTier
  npuSignal: NpuSignal
  maxParallelAgents: number
  viewportQuality: 'ultra' | 'high' | 'medium' | 'low'
  localModelPolicy: 'allow-small-models' | 'prefer-cloud-heavy-models' | 'cloud-only'
  browserOperatorPolicy: 'normal' | 'throttled' | 'manual-confirmation'
  memoryPolicy: 'persistent-index-ok' | 'compact-memory' | 'ephemeral-summary'
  backgroundTaskBudget: 'deep' | 'standard' | 'limited'
  safetySummary: string
  recommendations: string[]
}

export interface DeviceCapabilityProfile {
  signals: RawDeviceCapabilitySignals
  policy: DeviceRuntimePolicy
}

const LOW_MEMORY_GB = 4
const STRONG_MEMORY_GB = 12
const STRONG_CORE_COUNT = 8

function hasEnoughStorageForPersistentMemory(signals: RawDeviceCapabilitySignals): boolean {
  if (!signals.storageQuotaGb) return false
  const used = signals.storageUsageGb ?? 0
  return signals.storageQuotaGb - used >= 2
}

function resolveNpuSignal(signals: RawDeviceCapabilitySignals): NpuSignal {
  if (signals.webnnAvailable) return 'webnn-available'
  if (signals.webgpuAvailable) return 'native-required'
  return 'not-detectable'
}

export function buildDeviceRuntimePolicy(signals: RawDeviceCapabilitySignals): DeviceRuntimePolicy {
  const cores = signals.hardwareConcurrency ?? 0
  const memory = signals.deviceMemoryGb ?? 0
  const lowMemory = memory > 0 && memory <= LOW_MEMORY_GB
  const strongHardware = cores >= STRONG_CORE_COUNT && memory >= STRONG_MEMORY_GB
  const constrainedNetwork = signals.saveData || signals.effectiveConnectionType === 'slow-2g' || signals.effectiveConnectionType === '2g'
  const npuSignal = resolveNpuSignal(signals)

  if (lowMemory || cores <= 2 || constrainedNetwork) {
    return {
      mode: 'safe-mode',
      tier: 'constrained',
      npuSignal,
      maxParallelAgents: 1,
      viewportQuality: 'low',
      localModelPolicy: 'cloud-only',
      browserOperatorPolicy: 'manual-confirmation',
      memoryPolicy: 'ephemeral-summary',
      backgroundTaskBudget: 'limited',
      safetySummary: 'Aethel should avoid heavy local inference and keep agent work isolated to prevent device stalls.',
      recommendations: [
        'Run heavy AI, render, export, and browser-operator tasks in cloud or sandboxed workers.',
        'Keep only compact mission summaries on-device until the local app confirms more capacity.',
        'Use one active agent lane at a time and require confirmation before browser/device actions.',
      ],
    }
  }

  if (signals.webnnAvailable && signals.webgpuAvailable && strongHardware) {
    return {
      mode: 'local-accelerated',
      tier: 'accelerated-local',
      npuSignal,
      maxParallelAgents: 4,
      viewportQuality: 'ultra',
      localModelPolicy: 'allow-small-models',
      browserOperatorPolicy: 'normal',
      memoryPolicy: hasEnoughStorageForPersistentMemory(signals) ? 'persistent-index-ok' : 'compact-memory',
      backgroundTaskBudget: 'deep',
      safetySummary: 'Aethel can use local acceleration for small models, previews, indexing, and agent side work while reserving cloud for very large jobs.',
      recommendations: [
        'Prefer local small models, embeddings, OCR, image utilities, and project indexing.',
        'Keep AAA render/export, large game builds, and long browser sessions on isolated cloud or local sandbox lanes.',
        'Persist mission memory and project embeddings locally with cloud sync for continuity.',
      ],
    }
  }

  if (signals.webgpuAvailable && cores >= 4 && memory >= 6) {
    return {
      mode: 'hybrid-balanced',
      tier: 'balanced-local',
      npuSignal,
      maxParallelAgents: 2,
      viewportQuality: 'high',
      localModelPolicy: 'prefer-cloud-heavy-models',
      browserOperatorPolicy: 'throttled',
      memoryPolicy: hasEnoughStorageForPersistentMemory(signals) ? 'persistent-index-ok' : 'compact-memory',
      backgroundTaskBudget: 'standard',
      safetySummary: 'Aethel should split work: local preview/indexing where safe, cloud isolation for heavy AI and long-running automation.',
      recommendations: [
        'Use WebGPU for viewport, shaders, lightweight compute, and preview-side acceleration.',
        'Throttle concurrent agents and move large inference, exports, and browser automation to cloud workers.',
        'Persist memory as compact summaries plus selected evidence instead of raw full-session capture.',
      ],
    }
  }

  return {
    mode: 'cloud-isolated',
    tier: 'cloud-safe',
    npuSignal,
    maxParallelAgents: 1,
    viewportQuality: 'medium',
    localModelPolicy: 'cloud-only',
    browserOperatorPolicy: 'throttled',
    memoryPolicy: hasEnoughStorageForPersistentMemory(signals) ? 'compact-memory' : 'ephemeral-summary',
    backgroundTaskBudget: 'limited',
    safetySummary: 'Aethel should keep the web shell responsive and push heavy work into isolated runtime lanes.',
    recommendations: [
      'Avoid local heavy inference unless the desktop app confirms a supported accelerator.',
      'Keep preview quality adaptive and pause background work during user interaction.',
      'Use cloud or sandboxed local runtimes for builds, game/film exports, and browser-operator tasks.',
    ],
  }
}

export function buildDeviceCapabilityProfile(signals: RawDeviceCapabilitySignals): DeviceCapabilityProfile {
  return {
    signals,
    policy: buildDeviceRuntimePolicy(signals),
  }
}
