import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { mergeGizmoTransformOperationIntoProductionState } from '@/lib/production/gizmo-production-state'
import { buildGizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'

const before = {
  id: 'camera-rig',
  name: 'Camera Rig',
  position: [0, 1, 2] as const,
  rotation: [0, 0, 0] as const,
  scale: [1, 1, 1] as const,
}

const after = {
  ...before,
  position: [1, 1, 2] as const,
}

describe('gizmo production state', () => {
  it('adds safe user transforms to Mission Ledger, Scene Graph, Evidence Graph, and Validation Graph', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Airlock film shot', now: '2026-05-04T12:00:00.000Z' })
    const operation = buildGizmoTransformOperation({
      id: 'op-camera-1',
      sceneId: 'shot-001',
      objectsBefore: [before],
      objectsAfter: [after],
      mode: 'translate',
      space: 'world',
      snapEnabled: true,
      source: 'user',
      reason: 'Frame the opening shot.',
      evidenceRefs: ['viewport:screenshot:shot-001'],
      createdAt: '2026-05-04T12:01:00.000Z',
    })

    const next = mergeGizmoTransformOperationIntoProductionState(state, operation, '2026-05-04T12:02:00.000Z')

    expect(next.ledger[0]).toMatchObject({
      id: 'gizmo-op-camera-1',
      phase: 'Viewport transform',
      state: 'complete',
      evidenceRefs: ['gizmo-operation:op-camera-1', 'viewport:screenshot:shot-001'],
    })
    expect(next.graphs.sceneWorldGraph[0]).toMatchObject({
      id: 'gizmo-scene-op-camera-1',
      status: 'ready',
      ownerAgent: 'Viewport User',
    })
    expect(next.graphs.evidenceGraph[0].status).toBe('ready')
    expect(next.graphs.validationGraph[0].status).toBe('ready')
  })

  it('forces agent transforms into review and preserves blockers for unsafe operations', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Boss arena' })
    const unsafeAfter = {
      ...before,
      position: [25_000, 1, 2] as const,
      scale: [-1, 1, 1] as const,
    }
    const operation = buildGizmoTransformOperation({
      id: 'op-agent-risk',
      objectsBefore: [before],
      objectsAfter: [unsafeAfter],
      mode: 'scale',
      space: 'local',
      snapEnabled: false,
      source: 'agent',
      agentId: 'technical-artist-agent',
      reason: 'Risky cinematic scale test.',
      createdAt: '2026-05-04T12:01:00.000Z',
    })

    const next = mergeGizmoTransformOperationIntoProductionState(state, operation, '2026-05-04T12:02:00.000Z')

    expect(next.ledger[0].state).toBe('blocked')
    expect(next.ledger[0].ownerAgent).toBe('technical-artist-agent')
    expect(next.graphs.sceneWorldGraph[0].status).toBe('blocked')
    expect(next.graphs.validationGraph[0].blockers).toEqual(expect.arrayContaining([
      'Object camera-rig has an invalid non-positive scale.',
      'Object camera-rig moved beyond the safe scene transform budget.',
    ]))
  })
})
