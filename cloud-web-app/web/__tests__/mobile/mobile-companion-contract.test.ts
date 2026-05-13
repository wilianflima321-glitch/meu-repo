import { describe, expect, it } from 'vitest'

import { evaluateMobileCompanionAction, getMobileCompanionContract } from '@/lib/mobile/mobile-companion-contract'

describe('mobile companion contract', () => {
  it('keeps mobile as a compact control-plane instead of a heavy IDE', () => {
    const contract = getMobileCompanionContract()

    expect(contract.productRole).toBe('control-plane')
    expect(contract.safeActions).toContain('approve-task')
    expect(contract.blockedHeavyRuntimeLanes).toContain('render-queue')
    expect(contract.nonGoals.join(' ')).toContain('full desktop IDE clone')
  })

  it('blocks heavy render and indexing lanes on mobile devices', () => {
    const decision = evaluateMobileCompanionAction({
      action: 'view-preview',
      runtimeLane: 'viewport-render',
      hasEvidenceLedger: true,
      hasReplayOrPreview: true,
      hasCostSummary: true,
    })

    expect(decision.status).toBe('blocked')
    expect(decision.blockers.join(' ')).toContain('sidecar/cloud')
  })

  it('allows approval only when evidence, cost, and sensitive-action signature exist', () => {
    const held = evaluateMobileCompanionAction({
      action: 'approve-task',
      runtimeLane: 'approval',
      hasEvidenceLedger: true,
      hasReplayOrPreview: false,
      hasCostSummary: true,
      requiresSensitiveApproval: true,
      hasSignedApproval: false,
    })
    expect(held.allowed).toBe(false)
    expect(held.blockers.join(' ')).toContain('signed human approval')

    const allowed = evaluateMobileCompanionAction({
      action: 'approve-task',
      runtimeLane: 'approval',
      hasEvidenceLedger: true,
      hasReplayOrPreview: false,
      hasCostSummary: true,
      requiresSensitiveApproval: true,
      hasSignedApproval: true,
    })
    expect(allowed.allowed).toBe(true)
  })
})
