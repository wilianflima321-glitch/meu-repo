import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'
import {
  buildDefaultViewportRenderRuntimeRoute,
  buildViewportRenderQueuePayload,
  VIEWPORT_RENDER_QUEUE_JOB_TYPE,
} from '@/lib/viewport/viewport-render-queue'
import { renderViewportBackendArtifacts } from '@/lib/viewport/viewport-render-backend'

const authMocks = vi.hoisted(() => ({
  requireAuth: vi.fn(),
}))

const entitlementMocks = vi.hoisted(() => ({
  requireEntitlementsForUser: vi.fn(),
}))

const loggerMocks = vi.hoisted(() => ({
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
}))

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { GET } from '@/app/api/projects/[id]/production-state/render-job/artifact/route'

const ORIGINAL_ARTIFACT_ROOT = process.env.AETHEL_RENDER_ARTIFACT_ROOT

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[name]
    return
  }
  process.env[name] = value
}

function buildPayload(projectId = 'project-1') {
  const contract = buildViewportRenderJobContract({
    id: 'artifact-route-draft',
    projectId,
    mode: 'film',
    renderMode: 'draft',
    quality: 'draft',
    requestedAt: '2026-05-11T17:00:00.000Z',
    selectedObjectId: 'shot-camera',
    selectedObjectName: 'Shot Camera',
    timeline: { currentTime: 0, duration: 8, isPlaying: false },
    scene: {
      objectCount: 12,
      assetCount: 3,
      selectedObjectId: 'shot-camera',
      selectedObjectName: 'Shot Camera',
      assetFormats: ['glb'],
      visualScriptNodes: 1,
      visualScriptEdges: 0,
      vfxNodes: 1,
      vfxConnections: 0,
    },
  })

  return buildViewportRenderQueuePayload({
    contract,
    projectId,
    projectName: 'Artifact Route Film',
    runtimeRoute: buildDefaultViewportRenderRuntimeRoute(contract),
    requestedBy: 'user-1',
    requestedAt: '2026-05-11T17:01:00.000Z',
  })
}

async function createArtifactUrl(artifactRoot: string, projectId = 'project-1') {
  const result = await renderViewportBackendArtifacts({
    jobType: VIEWPORT_RENDER_QUEUE_JOB_TYPE,
    payload: buildPayload(projectId),
  }, {
    artifactRoot,
    capturedAt: '2026-05-11T17:02:00.000Z',
    jobId: 'artifact-route-job-1',
  })

  const thumbnail = result.evidence.artifacts.find((artifact) => artifact.kind === 'thumbnail')
  if (!thumbnail) throw new Error('Missing thumbnail artifact')
  return thumbnail.url
}

function buildRequest(artifactUrl: string) {
  const url = new URL('http://localhost:3000/api/projects/project-1/production-state/render-job/artifact')
  url.searchParams.set('artifactUrl', artifactUrl)
  return new NextRequest(url)
}

describe('api/projects/[id]/production-state/render-job/artifact route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      userId: 'user-1',
      members: [],
    })
  })

  afterEach(() => {
    restoreEnv('AETHEL_RENDER_ARTIFACT_ROOT', ORIGINAL_ARTIFACT_ROOT)
  })

  it('serves a project-owned render artifact through user auth instead of renderer tokens', async () => {
    const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'aethel-project-artifact-'))
    process.env.AETHEL_RENDER_ARTIFACT_ROOT = artifactRoot

    try {
      const artifactUrl = await createArtifactUrl(artifactRoot)
      const response = await GET(buildRequest(artifactUrl), { params: { id: 'project-1' } })
      const body = await response.text()

      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toContain('image/svg+xml')
      expect(response.headers.get('cache-control')).toBe('private, no-store')
      expect(body).toContain('Aethel internal scene preview')
    } finally {
      await rm(artifactRoot, { recursive: true, force: true })
    }
  })

  it('blocks artifacts that belong to a different project before reading the file', async () => {
    const artifactRoot = await mkdtemp(path.join(os.tmpdir(), 'aethel-project-artifact-'))
    process.env.AETHEL_RENDER_ARTIFACT_ROOT = artifactRoot

    try {
      const artifactUrl = await createArtifactUrl(artifactRoot, 'project-2')
      const response = await GET(buildRequest(artifactUrl), { params: { id: 'project-1' } })
      const payload = await response.json()

      expect(response.status).toBe(403)
      expect(payload.error).toBe('Render artifact does not belong to this project')
    } finally {
      await rm(artifactRoot, { recursive: true, force: true })
    }
  })

  it('rejects malformed artifact URLs without touching storage', async () => {
    const response = await GET(
      buildRequest('aethel-artifact://viewport-render/project-1/render-1/..%2Fsecret.json'),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('INVALID_ARTIFACT_URL')
  })
})
