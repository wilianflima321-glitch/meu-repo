export const STUDIO_LOCAL_CONTRACT_VERSION = 1 as const

export const STUDIO_LOCAL_ENDPOINTS = {
  health: '/health',
  probe: '/probe',
  jobs: '/jobs',
  job: (id: string) => `/jobs/${encodeURIComponent(id)}`,
  cancelJob: (id: string) => `/jobs/${encodeURIComponent(id)}/cancel`,
  syncCloud: '/sync/cloud',
} as const

export const RUNTIME_EXECUTION_TARGETS = [
  'local-native',
  'local-worker',
  'local-main-safe',
  'cloud-sandbox',
  'held',
] as const

export type RuntimeExecutionTarget = (typeof RUNTIME_EXECUTION_TARGETS)[number]

export const RUNTIME_JOB_LANES = [
  'ai-local-inference',
  'memory-indexing',
  'asset-import',
  'viewport-render',
  'build-export',
  'browser-operator',
  'file-sync',
  'playtest',
  'render-queue',
] as const

export type RuntimeJobLane = (typeof RUNTIME_JOB_LANES)[number]

export type RuntimeJobState =
  | 'queued'
  | 'running'
  | 'held'
  | 'needs-approval'
  | 'complete'
  | 'failed'
  | 'cancelled'

export type RuntimeSafetyLevel = 'ready' | 'fallback' | 'held' | 'needs-confirmation'

export type ThermalState = 'unknown' | 'nominal' | 'warm' | 'critical'
export type StoragePressure = 'unknown' | 'ok' | 'low-space' | 'critical'

export interface LocalRuntimeProbeReport {
  version: typeof STUDIO_LOCAL_CONTRACT_VERSION
  generatedAt: string
  deviceId: string
  os: string
  arch: string
  cpuLogicalCores: number
  totalMemoryMb: number | null
  availableMemoryMb: number | null
  storageFreeMb: number | null
  gpuAvailable: boolean
  gpuName: string | null
  webGpuAvailable: boolean
  webNnAvailable: boolean
  npuAvailable: boolean
  windowsMlAvailable: boolean
  directMlAvailable: boolean
  onnxRuntimeAvailable: boolean
  ffmpegAvailable: boolean
  rapierAvailable: boolean
  browserAutomationAvailable: boolean
  thermalState: ThermalState
  storagePressure: StoragePressure
  preferredExecutor: RuntimeExecutionTarget
  signature: string
}

export interface RuntimeJobEvidenceRequirement {
  kind:
    | 'test-log'
    | 'screenshot'
    | 'video'
    | 'render-preview'
    | 'asset-report'
    | 'browser-replay'
    | 'diff'
    | 'source-citation'
    | 'cost-report'
  required: boolean
}

export interface RuntimeJobScopeLock {
  mode: 'read-only' | 'diff-only' | 'exclusive-apply-held'
  allowedPaths: string[]
  deniedPaths: string[]
  reason: string
}

export interface RuntimeJobRequest {
  version: typeof STUDIO_LOCAL_CONTRACT_VERSION
  projectId: string
  missionId: string
  lane: RuntimeJobLane
  requestedTarget: RuntimeExecutionTarget
  title: string
  ownerAgent: string
  scopeLock: RuntimeJobScopeLock
  evidenceRequired: RuntimeJobEvidenceRequirement[]
  rollbackPlan: string
  maxCostUsd: number
  requiresHumanApproval: boolean
  createdAt: string
}

export interface RuntimeJobStatus {
  version: typeof STUDIO_LOCAL_CONTRACT_VERSION
  id: string
  request: RuntimeJobRequest
  state: RuntimeJobState
  target: RuntimeExecutionTarget
  safety: RuntimeSafetyLevel
  progress: number
  compactLog: string[]
  evidenceRefs: string[]
  blocker: string | null
  updatedAt: string
}

export interface RuntimeCloudSyncPayload {
  version: typeof STUDIO_LOCAL_CONTRACT_VERSION
  accountId: string
  projectId: string
  probe: LocalRuntimeProbeReport
  jobs: RuntimeJobStatus[]
  missionLedgerRefs: string[]
}

export function isRuntimeJobLane(value: string): value is RuntimeJobLane {
  return RUNTIME_JOB_LANES.includes(value as RuntimeJobLane)
}

export function isRuntimeExecutionTarget(value: string): value is RuntimeExecutionTarget {
  return RUNTIME_EXECUTION_TARGETS.includes(value as RuntimeExecutionTarget)
}

export function isHeavyRuntimeJobLane(lane: RuntimeJobLane): boolean {
  return lane !== 'file-sync'
}

export function requiresHumanApprovalForLane(lane: RuntimeJobLane): boolean {
  return lane === 'browser-operator' || lane === 'build-export' || lane === 'render-queue'
}

export function resolveSafeRuntimeTarget(input: {
  lane: RuntimeJobLane
  probe: Pick<
    LocalRuntimeProbeReport,
    | 'preferredExecutor'
    | 'npuAvailable'
    | 'gpuAvailable'
    | 'thermalState'
    | 'storagePressure'
    | 'availableMemoryMb'
  >
}): RuntimeExecutionTarget {
  if (input.probe.thermalState === 'critical' || input.probe.storagePressure === 'critical') {
    return 'held'
  }

  if (input.lane === 'file-sync') {
    return 'local-worker'
  }

  if (input.probe.preferredExecutor === 'local-native' && (input.probe.npuAvailable || input.probe.gpuAvailable)) {
    return 'local-native'
  }

  if (input.probe.availableMemoryMb !== null && input.probe.availableMemoryMb < 4096) {
    return 'cloud-sandbox'
  }

  return input.probe.preferredExecutor === 'held' ? 'cloud-sandbox' : input.probe.preferredExecutor
}
