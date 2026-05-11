import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'

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
      update: vi.fn(),
    },
  },
}))

vi.mock('@/lib/auth-server', () => authMocks)
vi.mock('@/lib/entitlements', () => entitlementMocks)
vi.mock('@/lib/db', () => prismaMocks)
vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: vi.fn(() => loggerMocks),
}))

import { POST } from '@/app/api/projects/[id]/production-state/render-job/evidence/route'

function buildEvidence(overrides: Partial<ReturnType<typeof buildEvidenceShape>> = {}) {
  return {
    ...buildEvidenceShape(),
    ...overrides,
  }
}

function buildEvidenceShape() {
  return {
    contractId: 'render-final-shot',
    jobId: 'queue-render-1',
    quality: 'final',
    runtimeTarget: 'cloud-sandbox',
    capturedAt: '2026-05-11T12:20:00.000Z',
    artifacts: [
      { kind: 'final-video', url: 's3://renders/final.mp4', sizeBytes: 2048, durationSeconds: 12 },
      { kind: 'performance-report', url: 's3://renders/perf.json' },
      {
        kind: 'license-report',
        url: 'aethel-artifact://viewport-render/project-1/render-final-shot/license-report.json',
      },
    ],
    validation: {
      playbackOk: true,
      performanceOk: true,
      licenseOk: true,
      continuityOk: true,
    },
  }
}

describe('api/projects/[id]/production-state/render-job/evidence route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss cinematic',
      template: 'unreal',
      userId: 'user-1',
      settings: null,
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('persists render output evidence without marking final release as automatically ready', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/render-job/evidence', {
        method: 'POST',
        body: JSON.stringify({ evidence: buildEvidence() }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.releaseReady).toBe(false)
    expect(payload.releaseNote).toContain('Human approval')
    expect(payload.evidence.artifacts).toEqual([
      expect.objectContaining({
        url: 's3://renders/final.mp4',
        accessUrl: 's3://renders/final.mp4',
        accessMode: 'direct-url',
      }),
      expect.objectContaining({
        url: 's3://renders/perf.json',
        accessUrl: 's3://renders/perf.json',
        accessMode: 'direct-url',
      }),
      expect.objectContaining({
        url: 'aethel-artifact://viewport-render/project-1/render-final-shot/license-report.json',
        accessUrl:
          '/api/projects/project-1/production-state/render-job/artifact?artifactUrl=aethel-artifact%3A%2F%2Fviewport-render%2Fproject-1%2Frender-final-shot%2Flicense-report.json',
        accessMode: 'project-authenticated-proxy',
      }),
    ])
    expect(payload.state.graphs.releaseGraph[0]).toMatchObject({
      id: 'render-release-render-final-shot',
      status: 'needs-review',
      ownerAgent: 'Release Agent',
    })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              graphs: expect.objectContaining({
                evidenceGraph: expect.arrayContaining([
                  expect.objectContaining({ id: 'render-output-render-final-shot' }),
                ]),
              }),
            }),
          }),
        }),
      }),
    )
  })

  it('rejects malformed render evidence before mutating project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/render-job/evidence', {
        method: 'POST',
        body: JSON.stringify({ evidence: { contractId: 'render-final-shot', artifacts: [] } }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload).toEqual({ error: 'Invalid viewport render output evidence' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('rejects internal render artifacts that belong to another project before persistence', async () => {
    const evidence = buildEvidence({
      artifacts: [
        {
          kind: 'license-report',
          url: 'aethel-artifact://viewport-render/other-project/render-final-shot/license-report.json',
        },
      ],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/render-job/evidence', {
        method: 'POST',
        body: JSON.stringify({ evidence }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Render artifact does not belong to this project' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })

  it('rejects malformed internal render artifact URLs before persistence', async () => {
    const evidence = buildEvidence({
      artifacts: [
        {
          kind: 'validation-report',
          url: 'aethel-artifact://viewport-render/project-1/render-final-shot/..%2Fsecret.json',
        },
      ],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/render-job/evidence', {
        method: 'POST',
        body: JSON.stringify({ evidence }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(400)
    expect(payload.error).toBe('INVALID_ARTIFACT_URL')
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
