import type {
  GbScaleProjectIndexingPlan,
  MultiResolutionProjectMemory,
  ProjectMemoryRetrievalPlan,
  ProjectMemoryRuntimeProbe,
} from './multi-resolution-project-memory'

export type ContextMemorySurface = 'web' | 'ide' | 'studio-local' | 'cloud-agent'

export type ContextMemoryStatus = 'available' | 'held' | 'blocked' | 'needs-review'

export type ContextMemoryCompressionLane =
  | 'direct-context'
  | 'summary-first'
  | 'index-first'
  | 'metadata-only'
  | 'sidecar-index'
  | 'cloud-index'
  | 'human-review'

export interface ContextMemorySpineInput {
  mission: string
  surface: ContextMemorySurface
  model?: string
  modelMaxInputTokens?: number
  requestedMaxInputTokens?: number
  responseReserveTokens?: number
  toolSchemaTokens?: number
  conversationHistoryChars?: number
  maxDirectContextTokens?: number
  memory?: MultiResolutionProjectMemory | null
  retrievalPlan?: ProjectMemoryRetrievalPlan | null
  indexingPlan?: GbScaleProjectIndexingPlan | null
  runtime?: Partial<ProjectMemoryRuntimeProbe> | null
  readReceiptRefs?: string[]
  evidenceRefs?: string[]
  humanReviewApproved?: boolean
}

export interface ContextMemorySpinePlan {
  version: 1
  status: ContextMemoryStatus
  surface: ContextMemorySurface
  model: string
  modelMaxInputTokens: number
  usableInputTokens: number
  responseReserveTokens: number
  toolSchemaTokens: number
  historyTokens: number
  memoryTokens: number
  plannedInputTokens: number
  maxDirectContextTokens: number
  compressionLane: ContextMemoryCompressionLane
  canUseUiThread: boolean
  requiresReadReceipts: boolean
  requiresHumanReview: boolean
  blockers: string[]
  hallucinationControls: string[]
  deviceControls: string[]
  selectedShardIds: string[]
  heldRefs: string[]
  evidenceRefs: string[]
  readReceiptRefs: string[]
  nextAction: string
}

const DEFAULT_MODEL_WINDOW = 128_000
const MIN_RESPONSE_RESERVE = 4_000
const DEFAULT_TOOL_SCHEMA_TOKENS = 2_000

function estimateTokensFromChars(chars: number): number {
  return Math.max(0, Math.ceil(Math.max(0, chars) / 4))
}

function inferModelWindow(model: string | undefined): number {
  const normalized = String(model || '').toLowerCase()
  if (normalized.includes('gemini')) return 1_000_000
  if (normalized.includes('claude')) return 200_000
  if (normalized.includes('gpt-4.1') || normalized.includes('gpt-5')) return 400_000
  if (normalized.includes('gpt-4') || normalized.includes('o3') || normalized.includes('o4')) return 128_000
  return DEFAULT_MODEL_WINDOW
}

function defaultDirectContextLimit(surface: ContextMemorySurface): number {
  switch (surface) {
    case 'web':
      return 16_000
    case 'ide':
      return 32_000
    case 'studio-local':
      return 96_000
    case 'cloud-agent':
      return 160_000
  }
}

function isRuntimeConstrained(runtime: Partial<ProjectMemoryRuntimeProbe> | null | undefined): boolean {
  if (!runtime) return false
  return (
    runtime.thermalState === 'critical' ||
    (typeof runtime.cpuLoadPercent === 'number' && runtime.cpuLoadPercent >= 90) ||
    (typeof runtime.availableRamBytes === 'number' && runtime.availableRamBytes < 1_500_000_000) ||
    (typeof runtime.availableDiskBytes === 'number' && runtime.availableDiskBytes < 2_000_000_000)
  )
}

function pickCompressionLane(input: {
  retrievalPlan?: ProjectMemoryRetrievalPlan | null
  indexingPlan?: GbScaleProjectIndexingPlan | null
  plannedInputTokens: number
  maxDirectContextTokens: number
  runtimeConstrained: boolean
}): ContextMemoryCompressionLane {
  const { retrievalPlan, indexingPlan, plannedInputTokens, maxDirectContextTokens, runtimeConstrained } = input
  if (retrievalPlan?.heldRefs.length) return 'human-review'
  if (indexingPlan?.heldBytes) return 'human-review'
  if (indexingPlan?.cloudBytesPlanned) return 'cloud-index'
  if (runtimeConstrained) return 'sidecar-index'
  if (retrievalPlan?.metadataRefs.length) return 'metadata-only'
  if (plannedInputTokens > maxDirectContextTokens) return 'summary-first'
  if (retrievalPlan?.summaryRefs.length) return 'summary-first'
  if (retrievalPlan?.directContextRefs.length) return 'direct-context'
  return 'index-first'
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

export function buildContextMemorySpinePlan(input: ContextMemorySpineInput): ContextMemorySpinePlan {
  const model = input.model?.trim() || 'default-context-model'
  const modelMaxInputTokens = Math.max(8_000, input.modelMaxInputTokens ?? inferModelWindow(model))
  const responseReserveTokens = Math.max(MIN_RESPONSE_RESERVE, input.responseReserveTokens ?? MIN_RESPONSE_RESERVE)
  const toolSchemaTokens = Math.max(0, input.toolSchemaTokens ?? DEFAULT_TOOL_SCHEMA_TOKENS)
  const requestedMaxInputTokens = input.requestedMaxInputTokens
    ? Math.max(8_000, Math.min(input.requestedMaxInputTokens, modelMaxInputTokens))
    : modelMaxInputTokens
  const usableInputTokens = Math.max(1_000, requestedMaxInputTokens - responseReserveTokens - toolSchemaTokens)
  const historyTokens = estimateTokensFromChars(input.conversationHistoryChars ?? 0)
  const memoryTokens = input.retrievalPlan?.estimatedTokens ?? 0
  const plannedInputTokens = historyTokens + memoryTokens + toolSchemaTokens
  const maxDirectContextTokens = input.maxDirectContextTokens ?? defaultDirectContextLimit(input.surface)
  const runtimeConstrained = isRuntimeConstrained(input.runtime)
  const selectedShardIds = input.retrievalPlan?.selectedShardIds ?? []
  const heldRefs = unique([...(input.retrievalPlan?.heldRefs ?? []), ...(input.indexingPlan?.blockers ?? [])])
  const readReceiptRefs = unique(input.readReceiptRefs ?? [])
  const evidenceRefs = unique(input.evidenceRefs ?? [])
  const blockers: string[] = []

  if (!input.memory && !input.retrievalPlan) {
    blockers.push('Project memory or retrieval plan is required before broad autonomous work.')
  }
  if (plannedInputTokens > usableInputTokens) {
    blockers.push(`Planned context ${plannedInputTokens} tokens exceeds usable model budget ${usableInputTokens}.`)
  }
  if (memoryTokens > maxDirectContextTokens) {
    blockers.push(`Memory selection ${memoryTokens} tokens exceeds direct-context limit ${maxDirectContextTokens}; summarize or index first.`)
  }
  if (runtimeConstrained) {
    blockers.push('Local runtime is constrained; route indexing to worker, Studio Local, cloud indexer, or hold.')
  }
  if (input.indexingPlan?.heldBytes) {
    blockers.push(`${input.indexingPlan.heldBytes} bytes of memory/indexing are held.`)
  }
  blockers.push(...(input.retrievalPlan?.blockers ?? []))

  const requiresReadReceipts = selectedShardIds.length > 0 && readReceiptRefs.length === 0
  const requiresHumanReview =
    !input.humanReviewApproved &&
    (Boolean(input.retrievalPlan?.heldRefs.length) ||
      Boolean(input.indexingPlan?.heldBytes) ||
      heldRefs.some((ref) => /license|human|review|held/i.test(ref)))

  let status: ContextMemoryStatus = 'available'
  if (plannedInputTokens > requestedMaxInputTokens || (!input.memory && !input.retrievalPlan)) {
    status = 'blocked'
  } else if (requiresHumanReview || input.indexingPlan?.heldBytes) {
    status = 'held'
  } else if (requiresReadReceipts || blockers.length > 0 || evidenceRefs.length === 0) {
    status = 'needs-review'
  }

  const compressionLane = pickCompressionLane({
    retrievalPlan: input.retrievalPlan,
    indexingPlan: input.indexingPlan,
    plannedInputTokens,
    maxDirectContextTokens,
    runtimeConstrained,
  })

  const canUseUiThread =
    !runtimeConstrained &&
    input.surface !== 'cloud-agent' &&
    memoryTokens <= Math.min(8_000, maxDirectContextTokens) &&
    (input.indexingPlan ? input.indexingPlan.localBytesPlanned <= 256_000 && input.indexingPlan.heldBytes === 0 : true)

  const hallucinationControls = unique([
    'Use selected shard IDs, source refs, and evidence refs; never invent missing files, assets, scenes, lore, or capabilities.',
    'Create read receipts before each apply step.',
    'Use metadata-only context for large assets until provenance, license, thumbnails, and quality sidecars exist.',
    'If a surface is held or blocked, keep the agent in planning/review mode instead of fabricating success.',
    ...(input.memory?.noRawContextRules ?? []),
  ])

  const deviceControls = unique([
    'Never index GB-scale projects on the UI thread.',
    'Browser/Web can preview and review; heavy indexing, asset cooking, render and builds must use workers, Studio Local, or cloud jobs.',
    'Hold or offload work when CPU, RAM, disk, or thermal state is constrained.',
    `Direct context cap for ${input.surface}: ${maxDirectContextTokens} tokens.`,
  ])

  const nextAction =
    status === 'blocked'
      ? 'Build or refresh project memory and reduce planned context before agent execution.'
      : status === 'held'
        ? 'Resolve held shards with human review, Studio Local capacity, or cloud indexing before apply.'
        : status === 'needs-review'
          ? 'Collect read receipts/evidence and use summary/index lanes before apply.'
          : 'Run agent with selected shards, evidence refs, and runtime lane constraints.'

  return {
    version: 1,
    status,
    surface: input.surface,
    model,
    modelMaxInputTokens,
    usableInputTokens,
    responseReserveTokens,
    toolSchemaTokens,
    historyTokens,
    memoryTokens,
    plannedInputTokens,
    maxDirectContextTokens,
    compressionLane,
    canUseUiThread,
    requiresReadReceipts,
    requiresHumanReview,
    blockers: unique(blockers),
    hallucinationControls,
    deviceControls,
    selectedShardIds,
    heldRefs,
    evidenceRefs,
    readReceiptRefs,
    nextAction,
  }
}

export function validateContextMemorySpinePlan(plan: ContextMemorySpinePlan): string[] {
  const failures: string[] = []
  if (plan.plannedInputTokens > plan.usableInputTokens) failures.push('plannedInputTokens exceeds usableInputTokens')
  if (plan.memoryTokens > plan.maxDirectContextTokens && plan.compressionLane === 'direct-context') {
    failures.push('oversized memory cannot use direct-context lane')
  }
  if (plan.canUseUiThread && plan.memoryTokens > 8_000) failures.push('UI thread cannot own large memory selection')
  if (plan.selectedShardIds.length > 0 && plan.readReceiptRefs.length === 0 && plan.status === 'available') {
    failures.push('available plan requires read receipts for selected shards')
  }
  if (plan.heldRefs.length > 0 && plan.status === 'available') failures.push('held refs cannot be available')
  if (plan.hallucinationControls.length < 4) failures.push('hallucination controls are too thin')
  if (plan.deviceControls.length < 4) failures.push('device controls are too thin')
  return failures
}
