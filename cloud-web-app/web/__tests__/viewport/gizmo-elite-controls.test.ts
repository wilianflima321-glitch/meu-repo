import { describe, expect, it } from 'vitest'

import {
  buildGizmoEliteControlState,
  buildGizmoUndoVisualPacket,
  canApplyGizmoEliteControl,
} from '@/lib/viewport/gizmo-elite-controls'

describe('gizmo elite controls', () => {
  it('supports Unreal-grade multi-select pivots, axis-plane constraints, and outline layers', () => {
    const state = buildGizmoEliteControlState({
      mode: 'translate',
      space: 'world',
      pivotMode: 'median',
      constraint: 'xz',
      selectedObjectIds: ['hero', 'enemy', 'hero'],
      activeObjectId: 'hero',
      lockedObjectIds: ['enemy'],
      source: 'user',
    })

    expect(state.selectedObjectIds).toEqual(['enemy', 'hero'])
    expect(state.activeObjectId).toBe('hero')
    expect(state.outlineModes).toEqual(expect.arrayContaining(['selected', 'locked']))
    expect(state.inspectorRefreshRequired).toBe(true)
    expect(state.undoPreviewRequired).toBe(true)
    expect(canApplyGizmoEliteControl(state)).toBe(true)
  })

  it('blocks incompatible constraints and agent edits without evidence', () => {
    const state = buildGizmoEliteControlState({
      mode: 'rotate',
      space: 'local',
      pivotMode: 'active-object',
      constraint: 'xy',
      selectedObjectIds: ['camera-rig'],
      activeObjectId: 'camera-rig',
      source: 'agent',
    })

    expect(canApplyGizmoEliteControl(state)).toBe(false)
    expect(state.blockers).toEqual(expect.arrayContaining([
      'Constraint xy is not compatible with rotate mode.',
      'Agent gizmo edits require before/after evidence before apply.',
    ]))
    expect(state.outlineModes).toContain('conflict')
  })

  it('creates compact undo visual packets for evidence timelines', () => {
    const packet = buildGizmoUndoVisualPacket({
      operationId: 'gizmo-op-42',
      selectedObjectIds: ['hero', 'enemy'],
      source: 'agent',
    })

    expect(packet.beforeFrameRef).toBe('viewport:before:gizmo-op-42')
    expect(packet.afterFrameRef).toBe('viewport:after:gizmo-op-42')
    expect(packet.rollbackLabel).toBe('Rollback 2 objects')
    expect(packet.requiresReview).toBe(true)
  })
})
