import type { RuntimeJobReceiptKind } from '@/lib/production/runtime-job-receipts'
import type { ProductionRuntimeTarget } from '@/lib/production/agentic-production-state'

export type RenderFarmState =
  | 'available'
  | 'held'
  | 'blocked'
  | 'needs-review'
  | 'provider_unavailable'
  | 'human_review_required'

export type RenderFarmJobKind = 'cinematic-render' | 'game-build' | 'asset-export' | 'viewport-review'
export type RenderFarmOutputFormat = 'mp4' | 'webm' | 'png-sequence' | 'glb' | 'gltf' | 'zip'
export type RenderFarmQualityTier = 'draft' | 'review' | 'publishable'

export type RenderFarmProviderCapability = {
  id: string
  label: string
  state: RenderFarmState
  supportedFormats: RenderFarmOutputFormat[]
  maxCostUsd: number
  cancelSupported: boolean
  teardownConfigured: boolean
  evidenceRefs: string[]
}

export type RenderFarmJobSpecInput = {
  projectId: string
  jobId?: string
  kind: RenderFarmJobKind
  format: RenderFarmOutputFormat
  quality: RenderFarmQualityTier
  requestedBy: string
  provider: RenderFarmProviderCapability
  estimatedMinutes: number
  estimatedCostUsd: number
  costCapUsd: number
  artifactPrefix?: string
  rollbackPlan?: string
  humanApproved?: boolean
  now?: string
  evidenceRefs?: string[]
}

export type RenderFarmJobSpec = {
  version: 1
  id: string
  projectId: string
  kind: RenderFarmJobKind
  format: RenderFarmOutputFormat
  quality: RenderFarmQualityTier
  state: RenderFarmState
  runtimeTarget: ProductionRuntimeTarget
  providerId: string
  requestedBy: string
  estimatedMinutes: number
  estimatedCostUsd: number
  costCapUsd: number
  artifactPrefix: string | null
  rollbackPlan: string | null
  requiredReceipts: RuntimeJobReceiptKind[]
  evidenceRefs: string[]
  blockers: string[]
  nextAction: string
  createdAt: string
}

export const RENDER_FARM_REQUIRED_RECEIPTS: RuntimeJobReceiptKind[] = [
  'dispatch',
  'capability-probe',
  'cost-meter',
  'artifact',
  'validation',
  'teardown',
  'rollback',
]

function compact(value: string | undefined | null): string | null {
  return value && value.trim().length > 0 ? value.trim() : null
}

function slug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'render-job'
}

export function buildRenderFarmJobSpec(input: RenderFarmJobSpecInput): RenderFarmJobSpec {
  const now = input.now ?? new Date().toISOString()
  const evidenceRefs = Array.from(new Set([...(input.evidenceRefs ?? []), ...input.provider.evidenceRefs]))
  const artifactPrefix = compact(input.artifactPrefix)
  const rollbackPlan = compact(input.rollbackPlan)
  const blockers: string[] = []

  if (input.provider.state !== 'available') blockers.push(`Render provider is ${input.provider.state}.`)
  if (!input.provider.supportedFormats.includes(input.format)) blockers.push(`Provider does not support ${input.format}.`)
  if (!input.provider.cancelSupported) blockers.push('Render provider must support explicit cancellation.')
  if (!input.provider.teardownConfigured) blockers.push('Render provider must prove teardown before dispatch.')
  if (input.estimatedCostUsd <= 0) blockers.push('Estimated render cost is required.')
  if (input.costCapUsd <= 0) blockers.push('Cost cap is required before cloud render dispatch.')
  if (input.estimatedCostUsd > input.costCapUsd) blockers.push('Estimated cost exceeds render cost cap.')
  if (input.estimatedCostUsd > input.provider.maxCostUsd) blockers.push('Estimated cost exceeds provider policy maximum.')
  if (!artifactPrefix) blockers.push('Artifact prefix is required for render output ownership.')
  if (!rollbackPlan) blockers.push('Rollback plan is required before render export.')
  if (input.quality === 'publishable' && !input.humanApproved) blockers.push('Human approval is required for publishable render output.')

  const providerUnavailable = input.provider.state === 'provider_unavailable'
  const state: RenderFarmState = providerUnavailable
    ? 'provider_unavailable'
    : blockers.some((blocker) => blocker.includes('Human approval'))
      ? 'human_review_required'
      : blockers.length > 0
        ? 'blocked'
        : 'available'

  const id = input.jobId ?? `render-farm-${slug(`${input.projectId}-${input.kind}-${input.format}-${now}`)}`
  return {
    version: 1,
    id,
    projectId: input.projectId,
    kind: input.kind,
    format: input.format,
    quality: input.quality,
    state,
    runtimeTarget: state === 'available' ? 'cloud-sandbox' : 'held',
    providerId: input.provider.id,
    requestedBy: input.requestedBy,
    estimatedMinutes: Math.max(0, input.estimatedMinutes),
    estimatedCostUsd: Math.max(0, input.estimatedCostUsd),
    costCapUsd: Math.max(0, input.costCapUsd),
    artifactPrefix,
    rollbackPlan,
    requiredReceipts: RENDER_FARM_REQUIRED_RECEIPTS,
    evidenceRefs,
    blockers,
    nextAction: state === 'available' ? 'Dispatch render job and attach receipts before release review.' : 'Resolve render provider, cost, teardown, artifact, rollback, and review blockers.',
    createdAt: now,
  }
}

export function validateRenderFarmJobSpec(spec: RenderFarmJobSpec): string[] {
  const failures: string[] = []
  if (spec.requiredReceipts.length < RENDER_FARM_REQUIRED_RECEIPTS.length) failures.push('render job required receipts are incomplete')
  if (spec.state === 'available' && spec.runtimeTarget !== 'cloud-sandbox') failures.push('available render farm jobs must target cloud-sandbox')
  if (spec.state === 'available' && spec.blockers.length > 0) failures.push('available render farm jobs cannot have blockers')
  if (spec.quality === 'publishable' && spec.state === 'available' && !spec.evidenceRefs.some((ref) => /human-review|approval/i.test(ref))) {
    failures.push('publishable render jobs need human approval evidence')
  }
  if (spec.state === 'available' && (!spec.artifactPrefix || !spec.rollbackPlan)) failures.push('available render jobs need artifact ownership and rollback')
  return failures
}
