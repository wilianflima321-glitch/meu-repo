import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { mergeGizmoTransformOperationIntoProductionState } from '@/lib/production/gizmo-production-state'
import {
  buildGizmoTransformReviewPackets,
  buildGizmoTransformReviewSummary,
} from '@/lib/production/gizmo-review-packets'
import { buildGizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'

const before = {
  id: 'boss-rig',
  name: 'Boss Rig',
  position: [0, 0, 0] as const,
  rotation: [0, 0, 0] as const,
  scale: [1, 1, 1] as const,
}

describe('gizmo review packets', () => {
  it('summarizes persisted gizmo operations for review without exposing a dashboard wall of text', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Boss fight vertical slice' })
    const operation = buildGizmoTransformOperation({
      id: 'op-review-1',
      objectsBefore: [before],
      objectsAfter: [{ ...before, position: [0, 2, 0] as const }],
      mode: 'translate',
      space: 'world',
      snapEnabled: true,
      source: 'agent',
      agentId: 'technical-artist-agent',
      reason: 'Move boss to the combat intro mark.',
      evidenceRefs: ['viewport:screenshot:boss-intro'],
      createdAt: '2026-05-04T14:00:00.000Z',
    })

    const next = mergeGizmoTransformOperationIntoProductionState(state, operation, '2026-05-04T14:01:00.000Z')
    const packets = buildGizmoTransformReviewPackets(next)

    expect(packets[0]).toMatchObject({
      operationId: 'op-review-1',
      ledgerId: 'gizmo-op-review-1',
      state: 'needs-approval',
      ownerAgent: 'technical-artist-agent',
      graphStatuses: {
        scene: 'needs-review',
        evidence: 'ready',
        validation: 'needs-review',
      },
      evidenceRefs: ['gizmo-operation:op-review-1', 'viewport:screenshot:boss-intro'],
    })
    expect(buildGizmoTransformReviewSummary(packets)).toMatchObject({
      total: 1,
      needsApproval: 1,
      latestOperationId: 'op-review-1',
    })
  })

  it('separates missing evidence from hard blockers so agents know the next best action', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Cinematic shot polish' })
    const operation = buildGizmoTransformOperation({
      id: 'op-needs-evidence',
      objectsBefore: [before],
      objectsAfter: [{ ...before, rotation: [0, 0.25, 0] as const }],
      mode: 'rotate',
      space: 'local',
      snapEnabled: false,
      source: 'user',
      reason: 'Rotate boss toward camera.',
      createdAt: '2026-05-04T14:00:00.000Z',
    })

    const next = mergeGizmoTransformOperationIntoProductionState(state, operation, '2026-05-04T14:01:00.000Z')
    const packet = buildGizmoTransformReviewPackets(next)[0]

    expect(packet.state).toBe('needs-evidence')
    expect(packet.nextAction).toBe('Capture viewport screenshot or clip evidence')
    expect(packet.blockers).toContain('Viewport screenshot or clip is still required')
  })
})
