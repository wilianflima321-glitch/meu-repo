import { describe, expect, it } from 'vitest'

import {
  buildGizmoEliteControlState,
  buildGizmoInspectorSummary,
  buildGizmoUndoVisualPacket,
  canApplyGizmoEliteControl,
  getGizmoConstraintAxes,
  getGizmoPivotLabel,
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

    const axes = getGizmoConstraintAxes(state.constraint)
    const summary = buildGizmoInspectorSummary(state)

    expect(axes).toMatchObject({ showX: true, showY: false, showZ: true, label: 'XZ' })
    expect(summary.tone).toBe('ready')
    expect(summary.chips).toEqual(expect.arrayContaining(['Pivot: Median', 'Constraint: XZ']))
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
    expect(buildGizmoInspectorSummary(state).tone).toBe('blocked')
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

  it('exposes stable labels for pivot and axis-plane UI controls', () => {
    expect(getGizmoPivotLabel('active-object')).toBe('Active object')
    expect(getGizmoConstraintAxes('screen').hint).toContain('screen-space')
    expect(getGizmoConstraintAxes('y')).toMatchObject({ showX: false, showY: true, showZ: false })
  })
})
