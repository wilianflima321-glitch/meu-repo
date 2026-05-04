import { describe, expect, it, vi } from 'vitest'

import {
  buildGizmoTransformPersistenceChip,
  buildGizmoTransformPersistenceRequest,
  canPersistGizmoTransform,
  persistGizmoTransformOperation,
} from '@/lib/viewport/gizmo-transform-persistence'
import { buildGizmoTransformOperation } from '@/lib/viewport/gizmo-transform-operation'

function buildOperation() {
  return buildGizmoTransformOperation({
    id: 'op-persist-1',
    projectId: 'project-1',
    objectsBefore: [
      {
        id: 'hero-rig',
        name: 'Hero Rig',
        position: [0, 1, 0] as const,
        rotation: [0, 0, 0] as const,
        scale: [1, 1, 1] as const,
      },
    ],
    objectsAfter: [
      {
        id: 'hero-rig',
        name: 'Hero Rig',
        position: [0, 2, 0] as const,
        rotation: [0, 0, 0] as const,
        scale: [1, 1, 1] as const,
      },
    ],
    mode: 'translate',
    space: 'world',
    snapEnabled: true,
    source: 'user',
    reason: 'Move hero rig to the mark.',
    evidenceRefs: ['viewport:screenshot:hero'],
    createdAt: '2026-05-04T12:00:00.000Z',
  })
}

describe('gizmo transform persistence client', () => {
  it('skips local-only project ids instead of pretending production memory was persisted', () => {
    expect(canPersistGizmoTransform(null)).toBe(false)
    expect(canPersistGizmoTransform('')).toBe(false)
    expect(canPersistGizmoTransform('local-project')).toBe(false)
    expect(canPersistGizmoTransform('project-1')).toBe(true)
  })

  it('builds an authenticated request and injects compact viewport evidence', () => {
    const operation = buildOperation()
    const request = buildGizmoTransformPersistenceRequest('project-1', operation, 'token-1')
    const body = JSON.parse(String(request.init.body)) as { operation: { projectId: string; evidenceRefs: string[] } }

    expect(request.url).toBe('/api/projects/project-1/production-state/gizmo-transform')
    expect(request.init.method).toBe('POST')
    expect(request.init.headers).toMatchObject({ Authorization: 'Bearer token-1' })
    expect(body.operation.projectId).toBe('project-1')
    expect(body.operation.evidenceRefs).toEqual(expect.arrayContaining([
      'viewport:screenshot:hero',
      'viewport:gizmo:op-persist-1',
    ]))
  })

  it('persists through the provided fetcher and returns the route payload', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ persisted: true }), { status: 200, headers: { 'content-type': 'application/json' } }),
    )

    const result = await persistGizmoTransformOperation({
      projectId: 'project-1',
      operation: buildOperation(),
      fetcher,
    })

    expect(fetcher).toHaveBeenCalledOnce()
    expect(result).toEqual({ ok: true, status: 200, payload: { persisted: true } })
  })

  it('returns route errors without throwing from the viewport event path', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'content-type': 'application/json' } }),
    )

    const result = await persistGizmoTransformOperation({
      projectId: 'project-1',
      operation: buildOperation(),
      fetcher,
    })

    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' })
  })

  it('maps persistence status into a compact viewport chip model', () => {
    expect(buildGizmoTransformPersistenceChip({
      status: 'idle',
      canPersist: true,
    }).visible).toBe(false)

    expect(buildGizmoTransformPersistenceChip({
      status: 'saved',
      canPersist: true,
      lastOperationLabel: 'User translate transform on Hero Rig in scene shot-1',
    })).toMatchObject({
      visible: true,
      tone: 'success',
      label: 'Saved to Mission Ledger',
      detail: 'User translate transform on Hero Rig in scene shot-1',
    })

    expect(buildGizmoTransformPersistenceChip({
      status: 'skipped',
      canPersist: false,
    })).toMatchObject({
      visible: true,
      tone: 'warning',
      label: 'Local viewport only',
    })

    expect(buildGizmoTransformPersistenceChip({
      status: 'error',
      canPersist: true,
      lastError: 'Forbidden',
    })).toMatchObject({
      visible: true,
      tone: 'error',
      detail: 'Forbidden',
    })
  })
})
