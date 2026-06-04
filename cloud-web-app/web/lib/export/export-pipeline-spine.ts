import type { AssetQualityLedger } from '@/lib/product/workspace-blueprint'

export type ExportPipelineFormat = 'mp4' | 'glb' | 'gltf' | 'wav' | 'zip'
export type ExportRuntimeLane = 'browser-preview' | 'studio-local' | 'cloud-render'
export type ExportPipelineState =
  | 'available'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'provider_unavailable'
  | 'human_review_required'

export type ExportPipelineInput = {
  format: ExportPipelineFormat
  durationSeconds?: number
  estimatedBytes?: number
  requiresGpu?: boolean
  runtimeLane?: ExportRuntimeLane
  studioLocalAvailable?: boolean
  cloudRenderAvailable?: boolean
  assetQualityLedger?: AssetQualityLedger | null
  humanApproved?: boolean
  evidenceRefs?: string[]
}

export type ExportPipelinePlan = {
  version: 1
  format: ExportPipelineFormat
  state: ExportPipelineState
  runtimeLane: ExportRuntimeLane
  blockers: string[]
  requiredEvidence: string[]
  evidenceRefs: string[]
  nextAction: string
}

export const EXPORT_PIPELINE_REQUIRED_EVIDENCE = [
  'provenance',
  'license',
  'quality-ledger',
  'runtime-capability',
  'rollback-plan',
] as const

function chooseRuntimeLane(input: ExportPipelineInput): ExportRuntimeLane {
  if (input.runtimeLane) return input.runtimeLane
  if (input.format === 'mp4' || input.requiresGpu || (input.durationSeconds ?? 0) > 60) {
    return input.cloudRenderAvailable ? 'cloud-render' : 'studio-local'
  }
  if (input.format === 'glb' || input.format === 'gltf' || input.format === 'zip') {
    return input.studioLocalAvailable ? 'studio-local' : 'browser-preview'
  }
  return 'browser-preview'
}

export function buildExportPipelinePlan(input: ExportPipelineInput): ExportPipelinePlan {
  const runtimeLane = chooseRuntimeLane(input)
  const blockers: string[] = []
  const evidenceRefs = input.evidenceRefs ?? []

  if (!input.assetQualityLedger) {
    blockers.push('Asset quality ledger is required before final export.')
  } else if (input.assetQualityLedger.state !== 'available') {
    blockers.push(`Asset quality ledger is ${input.assetQualityLedger.state}.`)
  }

  if (runtimeLane === 'studio-local' && !input.studioLocalAvailable) {
    blockers.push('Studio Local is required for this export lane but is not available.')
  }
  if (runtimeLane === 'cloud-render' && !input.cloudRenderAvailable) {
    blockers.push('Cloud render is required for this export lane but is not available.')
  }
  if ((input.estimatedBytes ?? 0) > 2_000_000_000 && runtimeLane === 'browser-preview') {
    blockers.push('Browser preview cannot own exports above 2 GB.')
  }
  if ((input.format === 'mp4' || input.requiresGpu) && runtimeLane === 'browser-preview') {
    blockers.push('Browser preview cannot claim final video/GPU export quality.')
  }
  if (!input.humanApproved && (input.format === 'mp4' || input.format === 'zip')) {
    blockers.push('Human approval is required before publishable export packages.')
  }

  const missingEvidence = EXPORT_PIPELINE_REQUIRED_EVIDENCE.filter(
    (item) => !evidenceRefs.some((ref) => ref.includes(item)),
  )

  let state: ExportPipelineState = 'available'
  if (blockers.some((blocker) => blocker.includes('not available'))) {
    state = 'provider_unavailable'
  } else if (blockers.some((blocker) => blocker.includes('Human approval'))) {
    state = 'human_review_required'
  } else if (blockers.length > 0) {
    state = 'blocked'
  } else if (missingEvidence.length > 0) {
    state = 'needs-review'
  }

  return {
    version: 1,
    format: input.format,
    state,
    runtimeLane,
    blockers,
    requiredEvidence: [...EXPORT_PIPELINE_REQUIRED_EVIDENCE],
    evidenceRefs,
    nextAction:
      state === 'available'
        ? 'Queue export with rollback, receipts, and runtime lane tracking.'
        : 'Resolve blockers/evidence before claiming final export.',
  }
}

export function validateExportPipelinePlan(plan: ExportPipelinePlan): string[] {
  const failures: string[] = []
  if (plan.requiredEvidence.length < EXPORT_PIPELINE_REQUIRED_EVIDENCE.length) failures.push('requiredEvidence is incomplete')
  if (plan.state === 'available' && plan.blockers.length > 0) failures.push('available export cannot have blockers')
  if (plan.state === 'available' && plan.evidenceRefs.length < plan.requiredEvidence.length) {
    failures.push('available export requires complete evidence refs')
  }
  if (plan.format === 'mp4' && plan.runtimeLane === 'browser-preview') {
    failures.push('mp4 final export cannot use browser-preview lane')
  }
  return failures
}
