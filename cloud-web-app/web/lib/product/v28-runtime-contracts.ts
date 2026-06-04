import type {
  AgentEvidenceReceipt,
  AssetQualityLedger,
  GovernedRuntimeState,
  RuntimeCapability,
} from '@/lib/product/workspace-blueprint'

export type SequencerTrackKind = 'camera' | 'animation' | 'dialogue' | 'audio' | 'fx' | 'gameplay'

export type SequencerTrack = {
  id: string
  kind: SequencerTrackKind
  label: string
  state: GovernedRuntimeState
  startFrame: number
  endFrame: number
  evidenceRef: string
}

export type ExportTarget = 'web-preview' | 'source-code' | 'video-draft' | 'asset-pack' | 'studio-local-cook' | 'cloud-render'

export type ExportJob = {
  id: string
  target: ExportTarget
  state: GovernedRuntimeState
  costUsd: number
  rollbackRef: string
  requiredReceipts: readonly AgentEvidenceReceipt[]
  runtimeCapabilities: readonly RuntimeCapability[]
}

export type HumanApprovalGate = {
  id: string
  state: Extract<GovernedRuntimeState, 'needs-review' | 'human_review_required' | 'available' | 'blocked'>
  reviewerRole: 'owner' | 'designer' | 'engineer' | 'security' | 'producer'
  reason: string
  evidenceRequired: readonly string[]
}

export type CreatorRuntimeSpine = {
  sequencerTracks: readonly SequencerTrack[]
  exportJobs: readonly ExportJob[]
  assetQualityLedger: AssetQualityLedger
  humanApprovalGates: readonly HumanApprovalGate[]
}

export const V28_REQUIRED_RUNTIME_STATES: readonly GovernedRuntimeState[] = [
  'available',
  'held',
  'blocked',
  'needs-review',
  'provider_unavailable',
  'human_review_required',
]

export const V28_FORBIDDEN_UNEVIDENCED_CLAIMS = [
  'AAA pronto',
  'Unreal-grade',
  'final asset',
  'Pixel Streaming disponível',
  'installer signed',
  'research verified',
] as const
