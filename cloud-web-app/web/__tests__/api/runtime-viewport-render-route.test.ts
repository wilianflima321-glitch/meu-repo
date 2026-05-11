import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it } from 'vitest'

import { POST } from '@/app/api/runtime/viewport/render/route'
import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
  VIEWPORT_RENDER_QUEUE_JOB_TYPE,
} from '@/lib/viewport/viewport-render-queue'

const ORIGINAL_TOKEN = process.env.AETHEL_RENDER_BACKEND_TOKEN
const ORIGINAL_INTERNAL_TOKEN = process.env.AETHEL_INTERNAL_API_TOKEN
const ORIGINAL_ARTIFACT_ROOT = process.env.AETHEL_RENDER_ARTIFACT_ROOT

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }

  process.env[name] = value
}

function buildRequest(headers: Record<string, string> = {}) {
  const contract = buildViewportRenderJobContract({
    id: 'api-render-backend-draft',
    projectId: 'project-api-render-backend',
    mode: 'game',
    renderMode: 'draft',
    quality: 'draft',
    requestedAt: '2026-05-11T16:30:00.000Z',
    selectedObjectId: 'hero',
    selectedObjectName: 'Hero',
    timeline: { currentTime: 0, duration: 8, isPlaying: false },
    scene: {
      objectCount: 18,
      assetCount: 4,
      selectedObjectId: 'hero',
      selectedObjectName: 'Hero',
      assetFormats: ['glb'],
      visualScriptNodes: 2,
      visualScriptEdges: 1,
      vfxNodes: 1,
      vfxConnections: 0,
    },
  })
  const payload = buildViewportRenderQueuePayload({
    contract,
    projectId: 'project-api-render-backend',
    projectName: 'API Render Backend',
    runtimeRoute: buildDefaultViewportRenderRuntimeRoute(contract),
    requestedBy: 'user-api-render-backend',
    requestedAt: '2026-05-11T16:31:00.000Z',
  })

  return new NextRequest('http://localhost/api/runtime/viewport/render', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({
      jobType: VIEWPORT_RENDER_QUEUE_JOB_TYPE,
      payload,
      evidencePolicy: {
        requirePlayback: true,
        neverAutoRelease: true,
      },
    }),
  })
}

afterEach(() => {
  restoreEnv('AETHEL_RENDER_BACKEND_TOKEN', ORIGINAL_TOKEN)
  restoreEnv('AETHEL_INTERNAL_API_TOKEN', ORIGINAL_INTERNAL_TOKEN)
  restoreEnv('AETHEL_RENDER_ARTIFACT_ROOT', ORIGINAL_ARTIFACT_ROOT)
})

describe('/api/runtime/viewport/render', () => {
  it('refuses to expose the renderer without an internal token', async () => {
    delete process.env.AETHEL_RENDER_BACKEND_TOKEN
    delete process.env.AETHEL_INTERNAL_API_TOKEN

    const response = await POST(buildRequest())
    const payload = await response.json()

    expect(response.status).toBe(503)
    expect(payload.error).toBe('RENDER_BACKEND_TOKEN_NOT_CONFIGURED')
  })

  it('requires the configured bearer token', async () => {
    process.env.AETHEL_RENDER_BACKEND_TOKEN = 'render-secret'

    const response = await POST(buildRequest({ authorization: 'Bearer wrong-token' }))

    expect(response.status).toBe(401)
  })

  it('returns render evidence and never auto-releases', async () => {
    const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'aethel-api-render-'))
    process.env.AETHEL_RENDER_BACKEND_TOKEN = 'render-secret'
    process.env.AETHEL_RENDER_ARTIFACT_ROOT = artifactRoot

    try {
      const response = await POST(buildRequest({ authorization: 'Bearer render-secret' }))
      const payload = await response.json()

      expect(response.status).toBe(200)
      expect(payload.evidence.validation.playbackOk).toBe(true)
      expect(payload.renderer.producedKinds).toContain('thumbnail')
      expect(payload.releaseReady).toBe(false)
    } finally {
      await rm(artifactRoot, { recursive: true, force: true })
    }
  })
})
