export type MobileCompanionAction =
  | 'approve-task'
  | 'pause-task'
  | 'resume-task'
  | 'review-evidence'
  | 'view-preview'
  | 'browser-takeover'
  | 'comment'
  | 'receive-alert'

export type MobileCompanionRuntimeLane =
  | 'mission-control'
  | 'evidence-review'
  | 'approval'
  | 'preview-stream'
  | 'browser-takeover'
  | 'ai-local-inference'
  | 'memory-indexing'
  | 'asset-import'
  | 'viewport-render'
  | 'build-export'
  | 'playtest'
  | 'render-queue'

export interface MobileCompanionContract {
  version: 1
  productRole: 'control-plane'
  safeActions: MobileCompanionAction[]
  blockedHeavyRuntimeLanes: MobileCompanionRuntimeLane[]
  requiredEvidenceForApproval: string[]
  uxRules: string[]
  nonGoals: string[]
}

export interface MobileCompanionActionRequest {
  action: MobileCompanionAction
  runtimeLane: MobileCompanionRuntimeLane
  hasEvidenceLedger: boolean
  hasReplayOrPreview: boolean
  hasCostSummary: boolean
  requiresSensitiveApproval?: boolean
  hasSignedApproval?: boolean
}

export interface MobileCompanionActionDecision {
  allowed: boolean
  status: 'allowed' | 'held' | 'blocked'
  blockers: string[]
  requiredEvidence: string[]
  nextAction: string
}

export function getMobileCompanionContract(): MobileCompanionContract {
  return {
    version: 1,
    productRole: 'control-plane',
    safeActions: [
      'approve-task',
      'pause-task',
      'resume-task',
      'review-evidence',
      'view-preview',
      'browser-takeover',
      'comment',
      'receive-alert',
    ],
    blockedHeavyRuntimeLanes: [
      'ai-local-inference',
      'memory-indexing',
      'asset-import',
      'viewport-render',
      'build-export',
      'playtest',
      'render-queue',
    ],
    requiredEvidenceForApproval: [
      'mission summary',
      'Task Evidence Ledger',
      'cost summary',
      'risk summary',
      'browser replay or preview when relevant',
      'rollback or pause plan',
    ],
    uxRules: [
      'Show one compact mission status row before details.',
      'Expose pause, takeover, replay, cost, and next step without turning mobile into a heavy IDE.',
      'Use mobile for approvals and supervision; route heavy jobs to local sidecar or cloud workers.',
    ],
    nonGoals: [
      'Do not run render-queue, build-export, viewport-render, or memory-indexing on the mobile UI thread.',
      'Do not expose a full desktop IDE clone on mobile.',
      'Do not approve sensitive actions without evidence, cost, risk, and signed approval.',
    ],
  }
}

export function evaluateMobileCompanionAction(request: MobileCompanionActionRequest): MobileCompanionActionDecision {
  const contract = getMobileCompanionContract()
  const blockers: string[] = []

  if (!contract.safeActions.includes(request.action)) {
    blockers.push(`Mobile action is not supported: ${request.action}.`)
  }
  if (contract.blockedHeavyRuntimeLanes.includes(request.runtimeLane)) {
    blockers.push(`Mobile Companion is a control-plane only; lane ${request.runtimeLane} must run in sidecar/cloud, not on-device.`)
  }
  if (!request.hasEvidenceLedger) blockers.push('Task Evidence Ledger is required before mobile approval.')
  if (!request.hasCostSummary) blockers.push('Cost summary is required before mobile approval.')
  if (request.requiresSensitiveApproval && !request.hasSignedApproval) {
    blockers.push('Sensitive actions require signed human approval from mobile or desktop.')
  }
  if ((request.action === 'browser-takeover' || request.runtimeLane === 'browser-takeover') && !request.hasReplayOrPreview) {
    blockers.push('Browser takeover requires replay or live preview evidence.')
  }

  const status = blockers.length === 0 ? 'allowed' : contract.blockedHeavyRuntimeLanes.includes(request.runtimeLane) ? 'blocked' : 'held'

  return {
    allowed: status === 'allowed',
    status,
    blockers,
    requiredEvidence: contract.requiredEvidenceForApproval,
    nextAction:
      status === 'allowed'
        ? 'Mobile Companion may approve or supervise this mission step.'
        : 'Keep the mission paused; collect evidence or reroute heavy work to sidecar/cloud.',
  }
}
