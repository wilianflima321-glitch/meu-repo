import { describe, expect, it, vi } from 'vitest'

import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildViewportRenderJobPersistenceRequest,
  canPersistViewportRenderJob,
  persistViewportRenderJob,
} from '@/lib/viewport/viewport-render-persistence'

function buildContract() {
  return buildViewportRenderJobContract({
    id: 'render-game-review',
    projectId: 'project-1',
    mode: 'game',
    renderMode: 'draft',
    quality: 'review',
    requestedAt: '2026-05-11T12:00:00.000Z',
    timeline: { currentTime: 0, duration: 10, isPlaying: false },
    selectedObjectId: 'player',
    selectedObjectName: 'Player',
    scene: {
      objectCount: 16,
      assetCount: 2,
      selectedObjectId: 'player',
      selectedObjectName: 'Player',
      assetFormats: ['glb'],
      visualScriptNodes: 7,
      visualScriptEdges: 6,
      vfxNodes: 1,
      vfxConnections: 0,
    },
  })
}

describe('viewport render persistence', () => {
  it('builds authenticated render-job persistence requests for durable production state', () => {
    const request = buildViewportRenderJobPersistenceRequest('project-1', buildContract(), 'token-1', true)

    expect(request.url).toBe('/api/projects/project-1/production-state/render-job')
    expect(request.init.method).toBe('POST')
    expect(request.init.headers).toMatchObject({ Authorization: 'Bearer token-1' })
    expect(String(request.init.body)).toContain('"enqueue":true')
    expect(String(request.init.body)).toContain('viewport:render-job:render-game-review')
  })

  it('surfaces queue status without claiming completed render evidence', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 202,
      json: async () => ({
        queued: true,
        queue: {
          status: 'queued',
          jobId: 'queue-render-1',
          message: 'Render job queued. Output media evidence is still required before release approval.',
        },
      }),
    })

    const result = await persistViewportRenderJob({
      projectId: 'project-1',
      contract: buildContract(),
      enqueue: true,
      fetcher,
    })

    expect(result).toMatchObject({
      ok: true,
      queued: true,
      queueStatus: 'queued',
      jobId: 'queue-render-1',
    })
  })

  it('skips local-only projects instead of pretending render evidence was persisted', async () => {
    expect(canPersistViewportRenderJob('local-project')).toBe(false)
    const fetcher = vi.fn()
    const result = await persistViewportRenderJob({ projectId: 'local-project', contract: buildContract(), fetcher })

    expect(result.ok).toBe(false)
    expect(fetcher).not.toHaveBeenCalled()
  })
})
