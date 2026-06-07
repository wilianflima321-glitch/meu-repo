import type { V29OperationalState } from '@/lib/runtime/v29-internal-spine'

export type PhotogrammetryProvider = 'luma-ai'
export type PhotogrammetryOutputKind = 'draft-scan' | 'retopo-source' | 'cinematic-review'

export interface LumaPhotogrammetryProviderInput {
  apiConfigured: boolean
  outputKind: PhotogrammetryOutputKind
  evidenceRefs: string[]
  estimatedCostUsd: number
  costCapUsd: number
  teardownConfigured: boolean
  humanApproved?: boolean
}

export interface LumaPhotogrammetryProviderCapability {
  id: 'luma-photogrammetry-provider:v1'
  provider: PhotogrammetryProvider
  state: V29OperationalState
  outputKind: PhotogrammetryOutputKind
  canCreateJob: boolean
  requiredReceipts: string[]
  missingReceipts: string[]
  blockers: string[]
  prohibitedClaims: string[]
  nextAction: string
  humanReviewRequired: true
}

export const LUMA_PHOTOGRAMMETRY_REQUIRED_RECEIPTS = [
  'source capture consent receipt',
  'license/provenance receipt',
  'provider job receipt',
  'cost cap receipt',
  'artifact teardown receipt',
  'retopology or curated mesh receipt',
  'human review receipt',
] as const

export function buildLumaPhotogrammetryProviderCapability(
  input: LumaPhotogrammetryProviderInput,
): LumaPhotogrammetryProviderCapability {
  const evidence = new Set(input.evidenceRefs)
  const missingReceipts = LUMA_PHOTOGRAMMETRY_REQUIRED_RECEIPTS.filter((receipt) =>
    receipt === 'human review receipt' ? input.humanApproved !== true && !evidence.has(receipt) : !evidence.has(receipt),
  )
  const blockers = [
    ...(input.apiConfigured ? [] : ['Luma AI provider endpoint or API key is not configured.']),
    ...(input.estimatedCostUsd > input.costCapUsd ? ['Estimated photogrammetry cost exceeds cost cap.'] : []),
    ...(input.teardownConfigured ? [] : ['Photogrammetry artifacts need teardown/retention policy before job creation.']),
  ]
  const state: V29OperationalState =
    !input.apiConfigured
      ? 'provider_unavailable'
      : blockers.length > 0
        ? 'blocked'
        : missingReceipts.length > 0
          ? 'held'
          : 'needs-review'

  return {
    id: 'luma-photogrammetry-provider:v1',
    provider: 'luma-ai',
    state,
    outputKind: input.outputKind,
    canCreateJob: state === 'needs-review',
    requiredReceipts: [...LUMA_PHOTOGRAMMETRY_REQUIRED_RECEIPTS],
    missingReceipts,
    blockers,
    prohibitedClaims: ['final asset', 'production ready', 'Unreal-grade'],
    nextAction:
      state === 'provider_unavailable'
        ? 'Configure provider endpoint, API key, and approval policy before photogrammetry jobs.'
        : blockers.length > 0
          ? 'Resolve cost, teardown, and provider blockers before job creation.'
          : missingReceipts.length > 0
            ? 'Attach consent, provenance, provider, cost, teardown, retopo, and human review receipts.'
            : 'Photogrammetry job can enter human review; output remains source material, not a final asset.',
    humanReviewRequired: true,
  }
}
