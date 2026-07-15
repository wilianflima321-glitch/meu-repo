export type CloudStreamSafetyStatus = 'available' | 'held'

export type CloudStreamSafetyInput = {
  signalingUrl?: string | null
  sessionManagerConfigured?: boolean
  teardownConfigured?: boolean
  idleTimeoutSeconds?: number
  maxSessionMinutes?: number
  costPerMinuteUsd?: number
  costCapUsd?: number
  humanReviewRequired?: boolean
  recordingEvidenceEnabled?: boolean
}

export type CloudStreamSafetyPlan = {
  schemaVersion: 1
  capability: 'aethel.cloud-stream.cost-safety'
  status: CloudStreamSafetyStatus
  publicUseAllowed: boolean
  streamConnectAllowed: boolean
  requiredEvidence: string[]
  blockers: string[]
  warnings: string[]
  costPerMinuteUsd: number
  maxSessionMinutes: number
  costCapUsd: number
  idleTimeoutSeconds: number
  projectedMaxSessionUsd: number
  nextAction: string
}

export const CLOUD_STREAM_REQUIRED_EVIDENCE = [
  'NEXT_PUBLIC_AETHEL_PIXEL_STREAM_URL configured',
  'Governed backend session manager',
  'Visible per-minute cost before connection',
  'Session cost cap',
  'Idle teardown within five minutes',
  'Rollback/stop control',
  'Human review required before release evidence',
  'Stream recording or session receipt evidence',
]

const DEFAULT_COST_PER_MINUTE_USD = 0.03
const DEFAULT_MAX_SESSION_MINUTES = 30
const DEFAULT_IDLE_TIMEOUT_SECONDS = 300
const DEFAULT_COST_CAP_USD = DEFAULT_COST_PER_MINUTE_USD * DEFAULT_MAX_SESSION_MINUTES

function isSafeUrl(value: string | null | undefined): boolean {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'wss:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function buildCloudStreamSafetyPlan(input: CloudStreamSafetyInput = {}): CloudStreamSafetyPlan {
  const costPerMinuteUsd = input.costPerMinuteUsd ?? DEFAULT_COST_PER_MINUTE_USD
  const maxSessionMinutes = input.maxSessionMinutes ?? DEFAULT_MAX_SESSION_MINUTES
  const costCapUsd = input.costCapUsd ?? DEFAULT_COST_CAP_USD
  const idleTimeoutSeconds = input.idleTimeoutSeconds ?? DEFAULT_IDLE_TIMEOUT_SECONDS
  const projectedMaxSessionUsd = costPerMinuteUsd * maxSessionMinutes
  const blockers: string[] = []
  const warnings: string[] = []

  if (!isSafeUrl(input.signalingUrl)) {
    blockers.push('Cloud Stream requires a configured HTTPS/WSS signaling URL before any stream can start.')
  }
  if (!input.sessionManagerConfigured) {
    blockers.push('A governed backend session manager is required before Cloud Stream can be selectable.')
  }
  if (!input.teardownConfigured) {
    blockers.push('Idle teardown and explicit stop/rollback evidence are required before launch.')
  }
  if (idleTimeoutSeconds > 300) {
    blockers.push('Idle teardown must be five minutes or less to prevent runaway GPU spend.')
  }
  if (costPerMinuteUsd <= 0) {
    blockers.push('A visible non-zero cloud GPU cost per minute is required.')
  }
  if (costCapUsd <= 0 || projectedMaxSessionUsd > costCapUsd) {
    blockers.push('Session cost cap must cover the projected maximum session cost before launch.')
  }
  if (!input.humanReviewRequired) {
    blockers.push('Human review must remain required before Cloud Stream evidence can become release evidence.')
  }
  if (!input.recordingEvidenceEnabled) {
    warnings.push('No stream recording/session receipt evidence is enabled yet; keep output as review-only.')
  }

  warnings.push('Cloud Stream is for expensive final review, cinematic review, or client demo only; it is not the default editor runtime.')
  warnings.push('Do not claim final, AAA, Unreal-grade, or Pixel Streaming availability unless this plan is available and receipts exist.')

  const publicUseAllowed = blockers.length === 0

  return {
    schemaVersion: 1,
    capability: 'aethel.cloud-stream.cost-safety',
    status: publicUseAllowed ? 'available' : 'held',
    publicUseAllowed,
    streamConnectAllowed: publicUseAllowed,
    requiredEvidence: CLOUD_STREAM_REQUIRED_EVIDENCE,
    blockers,
    warnings,
    costPerMinuteUsd,
    maxSessionMinutes,
    costCapUsd,
    idleTimeoutSeconds,
    projectedMaxSessionUsd,
    nextAction: publicUseAllowed
      ? 'Allow explicit Cloud Stream connection with cost, teardown, session receipts, and human review visible.'
      : 'Keep Cloud Stream held and collect signaling, session manager, cost cap, teardown, receipt, and human review evidence.',
  }
}
