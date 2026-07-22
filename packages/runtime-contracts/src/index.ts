import { z } from 'zod'

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

export const NATIVE_GRAPHICS_BACKENDS = ['vulkan', 'directx12', 'metal', 'webgpu', 'opengl'] as const
export type NativeGraphicsBackend = (typeof NATIVE_GRAPHICS_BACKENDS)[number]

export const NATIVE_AI_EXECUTION_PROVIDERS = [
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
] as const
export type NativeAiExecutionProvider = (typeof NATIVE_AI_EXECUTION_PROVIDERS)[number]

export const LOCAL_RUNTIME_TOOLCHAIN_FEATURES = [
  'ffmpeg',
  'ffprobe',
  'rapier',
  'browser-automation',
  'asset-optimizer',
  'shader-compiler',
] as const
export type LocalRuntimeToolchainFeature = (typeof LOCAL_RUNTIME_TOOLCHAIN_FEATURES)[number]

export const RUNTIME_SIDECAR_KINDS = [
  'wgpu-renderer',
  'ffmpeg',
  'ffprobe',
  'onnx-runtime',
  'browser-operator',
  'asset-optimizer',
  'shader-compiler',
  'rapier-physics',
] as const
export type RuntimeSidecarKind = (typeof RUNTIME_SIDECAR_KINDS)[number]

export const RuntimeSidecarCapabilitySchema = z.object({
  kind: z.enum(RUNTIME_SIDECAR_KINDS),
  label: z.string(),
  available: z.boolean(),
  reason: z.string(),
})

export type RuntimeSidecarCapability = z.infer<typeof RuntimeSidecarCapabilitySchema>

export const LocalRuntimeProbeReportSchema = z.object({
  version: z.literal(STUDIO_LOCAL_CONTRACT_VERSION),
  generatedAt: z.string(),
  deviceId: z.string(),
  os: z.string(),
  arch: z.string(),
  cpuLogicalCores: z.number(),
  totalMemoryMb: z.number().nullable(),
  availableMemoryMb: z.number().nullable(),
  storageFreeMb: z.number().nullable(),
  gpuAvailable: z.boolean(),
  gpuName: z.string().nullable(),
  webGpuAvailable: z.boolean(),
  webNnAvailable: z.boolean(),
  npuAvailable: z.boolean(),
  windowsMlAvailable: z.boolean(),
  directMlAvailable: z.boolean(),
  onnxRuntimeAvailable: z.boolean(),
  ffmpegAvailable: z.boolean(),
  rapierAvailable: z.boolean(),
  browserAutomationAvailable: z.boolean(),
  nativeGraphicsBackends: z.array(z.enum(NATIVE_GRAPHICS_BACKENDS)).optional(),
  aiExecutionProviders: z.array(z.enum(NATIVE_AI_EXECUTION_PROVIDERS)).optional(),
  localToolchain: z.array(z.enum(LOCAL_RUNTIME_TOOLCHAIN_FEATURES)).optional(),
  thermalState: z.enum(['unknown', 'nominal', 'warm', 'critical']),
  storagePressure: z.enum(['unknown', 'ok', 'low-space', 'critical']),
  preferredExecutor: z.enum(RUNTIME_EXECUTION_TARGETS),
  signature: z.string(),
})

export type LocalRuntimeProbeReport = z.infer<typeof LocalRuntimeProbeReportSchema>

export const RuntimeJobEvidenceRequirementSchema = z.object({
  kind: z.enum([
    'test-log',
    'screenshot',
    'video',
    'render-preview',
    'asset-report',
    'browser-replay',
    'diff',
    'source-citation',
    'cost-report'
  ]),
  required: z.boolean(),
})

export type RuntimeJobEvidenceRequirement = z.infer<typeof RuntimeJobEvidenceRequirementSchema>

export const RuntimeJobScopeLockSchema = z.object({
  mode: z.enum(['read-only', 'diff-only', 'exclusive-apply-held']),
  allowedPaths: z.array(z.string()),
  deniedPaths: z.array(z.string()),
  reason: z.string(),
})

export type RuntimeJobScopeLock = z.infer<typeof RuntimeJobScopeLockSchema>

export const RuntimeJobRequestSchema = z.object({
  version: z.literal(STUDIO_LOCAL_CONTRACT_VERSION),
  projectId: z.string(),
  missionId: z.string(),
  lane: z.enum(RUNTIME_JOB_LANES),
  requestedTarget: z.enum(RUNTIME_EXECUTION_TARGETS),
  title: z.string(),
  ownerAgent: z.string(),
  scopeLock: RuntimeJobScopeLockSchema,
  evidenceRequired: z.array(RuntimeJobEvidenceRequirementSchema),
  rollbackPlan: z.string(),
  maxCostUsd: z.number(),
  requiresHumanApproval: z.boolean(),
  createdAt: z.string(),
})

export type RuntimeJobRequest = z.infer<typeof RuntimeJobRequestSchema>

export const RuntimeJobStatusSchema = z.object({
  version: z.literal(STUDIO_LOCAL_CONTRACT_VERSION),
  id: z.string(),
  request: RuntimeJobRequestSchema,
  state: z.enum(['queued', 'running', 'held', 'needs-approval', 'complete', 'failed', 'cancelled']),
  target: z.enum(RUNTIME_EXECUTION_TARGETS),
  safety: z.enum(['ready', 'fallback', 'held', 'needs-confirmation']),
  progress: z.number(),
  compactLog: z.array(z.string()),
  evidenceRefs: z.array(z.string()),
  blocker: z.string().nullable(),
  updatedAt: z.string(),
})

export type RuntimeJobStatus = z.infer<typeof RuntimeJobStatusSchema>

export const RuntimeCloudSyncPayloadSchema = z.object({
  version: z.literal(STUDIO_LOCAL_CONTRACT_VERSION),
  accountId: z.string(),
  projectId: z.string(),
  deviceId: z.string(),
  probe: LocalRuntimeProbeReportSchema,
  jobs: z.array(RuntimeJobStatusSchema),
  missionLedgerRefs: z.array(z.string()),
  signedAt: z.string().optional(),
  nonce: z.string().optional(),
  signature: z.string().optional(),
})

export type RuntimeCloudSyncPayload = z.infer<typeof RuntimeCloudSyncPayloadSchema>

export const RuntimeCloudSyncSigningPayloadSchema = z.object({
  version: z.literal(STUDIO_LOCAL_CONTRACT_VERSION),
  userId: z.string(),
  deviceId: z.string(),
  signedAt: z.string(),
  nonce: z.string(),
  report: LocalRuntimeProbeReportSchema,
})

export type RuntimeCloudSyncSigningPayload = z.infer<typeof RuntimeCloudSyncSigningPayloadSchema>

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

export const RUNTIME_LANE_SIDECAR_REQUIREMENTS: Record<RuntimeJobLane, RuntimeSidecarKind[]> = {
  'ai-local-inference': ['onnx-runtime'],
  'memory-indexing': [],
  'asset-import': ['asset-optimizer', 'ffprobe'],
  'viewport-render': ['wgpu-renderer', 'shader-compiler', 'rapier-physics'],
  'build-export': ['asset-optimizer'],
  'browser-operator': ['browser-operator'],
  'file-sync': [],
  playtest: ['wgpu-renderer', 'rapier-physics'],
  'render-queue': ['ffmpeg', 'ffprobe'],
}

const SIDECAR_LABELS: Record<RuntimeSidecarKind, string> = {
  'wgpu-renderer': 'Native renderer',
  ffmpeg: 'FFmpeg encoder',
  ffprobe: 'Media probe',
  'onnx-runtime': 'ONNX Runtime',
  'browser-operator': 'Browser operator runtime',
  'asset-optimizer': 'Asset optimizer',
  'shader-compiler': 'Shader compiler',
  'rapier-physics': 'Rapier physics',
}

function hasToolchainFeature(
  probe: Pick<
    LocalRuntimeProbeReport,
    | 'ffmpegAvailable'
    | 'rapierAvailable'
    | 'browserAutomationAvailable'
    | 'localToolchain'
  >,
  feature: LocalRuntimeToolchainFeature
): boolean {
  if (feature === 'ffmpeg' && probe.ffmpegAvailable) {
    return true
  }
  if (feature === 'rapier' && probe.rapierAvailable) {
    return true
  }
  if (feature === 'browser-automation' && probe.browserAutomationAvailable) {
    return true
  }
  return Boolean(probe.localToolchain?.includes(feature))
}

export function hasRuntimeSidecarCapability(
  probe: Pick<
    LocalRuntimeProbeReport,
    | 'gpuAvailable'
    | 'webGpuAvailable'
    | 'nativeGraphicsBackends'
    | 'onnxRuntimeAvailable'
    | 'aiExecutionProviders'
    | 'ffmpegAvailable'
    | 'rapierAvailable'
    | 'browserAutomationAvailable'
    | 'localToolchain'
  >,
  kind: RuntimeSidecarKind
): boolean {
  switch (kind) {
    case 'wgpu-renderer':
      return probe.gpuAvailable || probe.webGpuAvailable || Boolean(probe.nativeGraphicsBackends?.length)
    case 'ffmpeg':
      return hasToolchainFeature(probe, 'ffmpeg')
    case 'ffprobe':
      return hasToolchainFeature(probe, 'ffprobe')
    case 'onnx-runtime':
      return probe.onnxRuntimeAvailable || Boolean(probe.aiExecutionProviders?.length)
    case 'browser-operator':
      return hasToolchainFeature(probe, 'browser-automation')
    case 'asset-optimizer':
      return hasToolchainFeature(probe, 'asset-optimizer')
    case 'shader-compiler':
      return hasToolchainFeature(probe, 'shader-compiler')
    case 'rapier-physics':
      return hasToolchainFeature(probe, 'rapier')
  }
}

export function buildRuntimeSidecarManifest(
  probe: Parameters<typeof hasRuntimeSidecarCapability>[0]
): RuntimeSidecarCapability[] {
  return RUNTIME_SIDECAR_KINDS.map((kind) => {
    const available = hasRuntimeSidecarCapability(probe, kind)
    const label = SIDECAR_LABELS[kind]
    return {
      kind,
      label,
      available,
      reason: available
        ? `${label} is available for local execution.`
        : `${label} was not confirmed by the Studio Local probe.`,
    }
  })
}

export function missingRuntimeSidecarsForLane(
  probe: Parameters<typeof hasRuntimeSidecarCapability>[0],
  lane: RuntimeJobLane
): RuntimeSidecarKind[] {
  return RUNTIME_LANE_SIDECAR_REQUIREMENTS[lane].filter((kind) => !hasRuntimeSidecarCapability(probe, kind))
}

function stableJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stableJsonValue)
  }

  if (!value || typeof value !== 'object') {
    return value === undefined ? null : value
  }

  const source = value as Record<string, unknown>
  const sorted: Record<string, unknown> = {}
  for (const key of Object.keys(source).sort()) {
    sorted[key] = stableJsonValue(source[key])
  }
  return sorted
}

export function buildRuntimeCloudSyncSigningPayload(input: RuntimeCloudSyncSigningPayload): string {
  return JSON.stringify(stableJsonValue(input))
}

export function resolveSafeRuntimeTarget(input: {
  lane: RuntimeJobLane
  probe: Pick<
    LocalRuntimeProbeReport,
    | 'preferredExecutor'
    | 'npuAvailable'
    | 'gpuAvailable'
    | 'webGpuAvailable'
    | 'webNnAvailable'
    | 'directMlAvailable'
    | 'onnxRuntimeAvailable'
    | 'ffmpegAvailable'
    | 'rapierAvailable'
    | 'browserAutomationAvailable'
    | 'nativeGraphicsBackends'
    | 'aiExecutionProviders'
    | 'localToolchain'
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

  const hasNativeGraphics =
    input.probe.gpuAvailable ||
    input.probe.webGpuAvailable ||
    Boolean(input.probe.nativeGraphicsBackends?.length)
  const hasAiExecutionProvider =
    input.probe.onnxRuntimeAvailable ||
    input.probe.directMlAvailable ||
    input.probe.webNnAvailable ||
    Boolean(input.probe.aiExecutionProviders?.length)

  if (input.lane === 'ai-local-inference' && !hasAiExecutionProvider) {
    return 'cloud-sandbox'
  }

  if (input.lane === 'viewport-render' && !hasNativeGraphics) {
    return 'cloud-sandbox'
  }

  if (input.lane === 'render-queue' && !input.probe.ffmpegAvailable) {
    return 'cloud-sandbox'
  }

  if (input.lane === 'browser-operator' && !input.probe.browserAutomationAvailable) {
    return 'cloud-sandbox'
  }

  if (
    (input.lane === 'asset-import' || input.lane === 'build-export' || input.lane === 'playtest') &&
    missingRuntimeSidecarsForLane(input.probe, input.lane).length > 0
  ) {
    return 'cloud-sandbox'
  }

  if (input.probe.preferredExecutor === 'local-native' && (hasNativeGraphics || hasAiExecutionProvider)) {
    return 'local-native'
  }

  if (input.probe.availableMemoryMb !== null && input.probe.availableMemoryMb < 4096) {
    return 'cloud-sandbox'
  }

  return input.probe.preferredExecutor === 'held' ? 'cloud-sandbox' : input.probe.preferredExecutor
}

export * from './evidence-contract'

// --- SUPREMACIA UI & UX TEMPORAL --- //

export const SynapticThresholdLimiterSchema = z.object({
  hesitationMs: z.number(),
  misclickRate: z.number(),
  cognitiveOverloadDetected: z.boolean().describe('Verdadeiro quando a variância de cliques e scroll indica exaustão.'),
  // O Agente usa isso para assumir o controle (Piloto Automático) se o humano fritar
  systemInterventionLevel: z.enum(['none', 'simplify-ui', 'dialectic-suggestion', 'full-autopilot']),
})
export type SynapticThresholdLimiter = z.infer<typeof SynapticThresholdLimiterSchema>

export const GenerativeUIStateSchema = z.object({
  uiSeedHash: z.string(), // O Genoma Estético da Interface
  ghostStateActive: z.boolean(), // Projeção preditiva local via Rust
  collapseMode: z.enum(['generative-friendly', 'hlsl-raw', 'rust-raw']), // The Black Box Problem solver
  temporalBranchId: z.string().uuid(), // O "Git" de memória Multiversal (Substitui o Undo)
  predictiveHUDNextIntent: z.string().nullable(),
  synapticLimiter: SynapticThresholdLimiterSchema, // A camada de Sintonia L7
})
export type GenerativeUIState = z.infer<typeof GenerativeUIStateSchema>

export * from './matter-contract'

