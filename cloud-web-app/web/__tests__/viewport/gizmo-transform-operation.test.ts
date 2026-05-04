import { describe, expect, it } from 'vitest'

import {
  buildGizmoTransformOperation,
  buildRollbackGizmoTransformOperation,
  summarizeGizmoTransformOperation,
  validateGizmoTransformOperation,
} from '@/lib/viewport/gizmo-transform-operation'

const before = {
  id: 'hero-rig',
  name: 'Hero Rig',
  position: [0, 1, 2] as const,
  rotation: [0, 0, 0] as const,
  scale: [1, 1, 1] as const,
}

const after = {
  ...before,
  position: [2, 1.5, 2] as const,
  rotation: [0, Math.PI / 2, 0] as const,
  scale: [1.25, 1.25, 1.25] as const,
}

describe('gizmo transform operation contract', () => {
  it('builds an auditable transform with delta, validation, and rollback target', () => {
    const operation = buildGizmoTransformOperation({
      id: 'op-1',
      projectId: 'project-1',
      sceneId: 'scene-airlock',
      objectsBefore: [before],
      objectsAfter: [after],
      mode: 'translate',
      space: 'world',
      snapEnabled: true,
      source: 'user',
      reason: 'Place hero rig on the cinematic mark.',
      evidenceRefs: ['viewport:screenshot:before-after'],
      createdAt: '2026-05-04T12:00:00.000Z',
    })

    expect(operation.version).toBe(1)
    expect(operation.objectIds).toEqual(['hero-rig'])
    expect(operation.delta['hero-rig'].position).toEqual({ x: 2, y: 0.5, z: 0 })
    expect(operation.delta['hero-rig'].rotation.y).toBeCloseTo(Math.PI / 2)
    expect(operation.delta['hero-rig'].scale).toEqual({ x: 0.25, y: 0.25, z: 0.25 })
    expect(operation.validation.ok).toBe(true)
    expect(operation.rollback.targetSnapshots['hero-rig']).toEqual(operation.before['hero-rig'])
  })

  it('flags unsafe transforms instead of letting agents silently corrupt a scene', () => {
    const unsafeAfter = {
      ...before,
      position: [20_000, 0, 0] as const,
      scale: [1, -1, 1] as const,
    }
    const operation = buildGizmoTransformOperation({
      id: 'op-unsafe',
      objectsBefore: [before],
      objectsAfter: [unsafeAfter],
      mode: 'scale',
      space: 'local',
      snapEnabled: false,
      source: 'agent',
      reason: 'Attempt a risky transform.',
      createdAt: '2026-05-04T12:00:00.000Z',
    })

    expect(operation.validation.ok).toBe(false)
    expect(operation.validation.blockers).toEqual(expect.arrayContaining([
      'Object hero-rig has an invalid non-positive scale.',
      'Object hero-rig moved beyond the safe scene transform budget.',
    ]))
    expect(operation.validation.warnings).toContain('Agent gizmo operation has no evidence references yet.')
  })

  it('creates a rollback operation that exactly swaps before and after states', () => {
    const operation = buildGizmoTransformOperation({
      id: 'op-2',
      objectsBefore: [before],
      objectsAfter: [after],
      mode: 'rotate',
      space: 'local',
      snapEnabled: true,
      source: 'agent',
      agentId: 'technical-artist-agent',
      reason: 'Align hero rig toward camera.',
      evidenceRefs: ['mission-ledger:gizmo-op-2'],
      createdAt: '2026-05-04T12:00:00.000Z',
    })

    const rollback = buildRollbackGizmoTransformOperation(operation, {
      id: 'rollback-2',
      source: 'user',
      createdAt: '2026-05-04T12:05:00.000Z',
    })

    expect(rollback.before).toEqual(operation.after)
    expect(rollback.after).toEqual(operation.before)
    expect(rollback.delta['hero-rig'].position).toEqual({ x: -2, y: -0.5, z: 0 })
    expect(rollback.rollback.targetSnapshots).toEqual(operation.after)
    expect(rollback.validation.ok).toBe(true)
  })

  it('summarizes the operation for evidence timelines and compact UI chips', () => {
    const operation = buildGizmoTransformOperation({
      id: 'op-3',
      sceneId: 'scene-airlock',
      objectsBefore: [before],
      objectsAfter: [after],
      mode: 'translate',
      space: 'world',
      snapEnabled: true,
      source: 'agent',
      reason: 'Move hero rig.',
      evidenceRefs: ['mission-ledger:gizmo-op-3'],
      createdAt: '2026-05-04T12:00:00.000Z',
    })

    expect(summarizeGizmoTransformOperation(operation)).toBe('Agent translate transform on Hero Rig in scene scene-airlock')
    expect(validateGizmoTransformOperation(operation).ok).toBe(true)
  })
})
