import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { RESEARCH_NAVIGATION_MESH_SETTINGS_KEY } from '@/lib/production/research-navigation-mesh'

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

import { GET, POST } from '@/app/api/projects/[id]/production-state/research-navigation/route'

describe('api/projects/[id]/production-state/research-navigation route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'operator@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'studio' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-navigation',
      name: 'Navigation research workspace',
      template: 'web',
      userId: 'user-1',
      settings: {},
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-navigation' })
  })

  it('persists navigation mesh into Project Brain, Mission Ledger, and graph evidence', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-navigation/production-state/research-navigation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          missionKind: 'advanced-research',
          targetUrl: 'https://docs.example.com',
          intendedAction: 'read public docs',
          hasHeadlessBrowserWorker: true,
          hasNetworkIsolation: true,
          hasReplayCapture: true,
          hasScreenshotCapture: true,
          hasDomSnapshot: true,
          hasPauseControl: true,
        }),
      }),
      { params: { id: 'project-navigation' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.mesh.recommendedLane).toBe('headless-browser-worker')
    expect(payload.state.ledger[0]).toMatchObject({ id: 'research-navigation-mesh' })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-navigation' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [RESEARCH_NAVIGATION_MESH_SETTINGS_KEY]: expect.objectContaining({
              capability: 'AETHEL_RESEARCH_NAVIGATION_MESH',
            }),
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              ledger: expect.arrayContaining([expect.objectContaining({ id: 'research-navigation-mesh' })]),
              graphs: expect.objectContaining({
                evidenceGraph: expect.arrayContaining([expect.objectContaining({ id: 'research-navigation-mesh-evidenceGraph' })]),
              }),
            }),
          }),
        }),
      }),
    )
  })

  it('reads the latest persisted navigation mesh from settings', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-navigation',
      name: 'Navigation research workspace',
      template: 'web',
      userId: 'user-1',
      settings: {
        [RESEARCH_NAVIGATION_MESH_SETTINGS_KEY]: {
          version: 1,
          capability: 'AETHEL_RESEARCH_NAVIGATION_MESH',
          capabilityStatus: 'held',
          missionKind: 'advanced-research',
          recommendedLane: null,
          lanes: [],
          policyDecision: {},
          requiredEvidence: [],
          marketParityCoverage: [],
          limitations: [],
          nextAction: 'Connect browser lane.',
        },
      },
      members: [],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-navigation/production-state/research-navigation'),
      { params: { id: 'project-navigation' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hasMesh).toBe(true)
    expect(payload.mesh.capability).toBe('AETHEL_RESEARCH_NAVIGATION_MESH')
    expect(payload.settingsKey).toBe(RESEARCH_NAVIGATION_MESH_SETTINGS_KEY)
  })

  it('rejects viewer-only collaborators before mutating navigation memory', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-navigation',
      name: 'Viewer navigation',
      template: 'web',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-navigation/production-state/research-navigation', {
        method: 'POST',
        body: JSON.stringify({ missionKind: 'advanced-research' }),
      }),
      { params: { id: 'project-navigation' } },
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
