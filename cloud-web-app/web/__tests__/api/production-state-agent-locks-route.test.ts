import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import {
  acquireAgentSurfaceLocks,
  clearAgentSurfaceLocksForTests,
} from '@/lib/production/agent-surface-locks'

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

import { GET, POST } from '@/app/api/projects/[id]/production-state/agent-locks/route'

const recentNow = new Date(Date.now() - 60_000).toISOString()

function request(body: Record<string, unknown>) {
  return new NextRequest('http://localhost:3000/api/projects/project-1/production-state/agent-locks', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

describe('api/projects/[id]/production-state/agent-locks route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAgentSurfaceLocksForTests()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight',
      userId: 'user-1',
      members: [],
    })
  })

  it('returns a Producer-readable lock snapshot for the project', async () => {
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Gameplay Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat/BossController.ts'],
      source: 'session',
      reason: 'combat pass',
      now: recentNow,
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/agent-locks'),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.locks).toHaveLength(1)
    expect(payload.snapshot).toEqual(
      expect.objectContaining({
        projectId: 'project-1',
        activeLockCount: 1,
        lockedPathCount: 1,
        arbitrationRequired: false,
      })
    )
  })

  it('previews conflicts without mutating existing locks', async () => {
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Gameplay Engineer Agent',
      ownerUserId: 'user-2',
      paths: ['src/game/combat'],
      source: 'session',
      reason: 'parallel combat work',
      now: recentNow,
    })

    const response = await POST(
      request({
        action: 'preview',
        agent: 'QA Agent',
        paths: ['src/game/combat/BossController.ts'],
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.decision.allowed).toBe(false)
    expect(payload.decision.conflicts[0]).toEqual(
      expect.objectContaining({
        blockingAgent: 'Gameplay Engineer Agent',
        requestedPaths: ['src/game/combat/BossController.ts'],
      })
    )
    expect(payload.snapshot.activeLockCount).toBe(1)
  })

  it('acquires and releases a lock for editor agents', async () => {
    const acquireResponse = await POST(
      request({
        action: 'acquire',
        agent: 'Technical Artist Agent',
        paths: ['assets/characters/hero.glb'],
        source: 'tool',
        reason: 'asset import pass',
        ttlMs: 120_000,
      }),
      { params: { id: 'project-1' } }
    )
    const acquirePayload = await acquireResponse.json()

    expect(acquireResponse.status).toBe(200)
    expect(acquirePayload.decision.allowed).toBe(true)
    expect(acquirePayload.snapshot.activeLockCount).toBe(1)

    const releaseResponse = await POST(
      request({
        action: 'release',
        lockId: acquirePayload.decision.lock.id,
      }),
      { params: { id: 'project-1' } }
    )
    const releasePayload = await releaseResponse.json()

    expect(releaseResponse.status).toBe(200)
    expect(releasePayload.released).toBe(true)
    expect(releasePayload.snapshot.activeLockCount).toBe(0)
  })

  it('blocks viewer collaborators from acquiring locks', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Shared cinematic',
      userId: 'owner-1',
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      request({
        action: 'acquire',
        agent: 'Cinematic Editor Agent',
        paths: ['shots/intro.timeline.json'],
      }),
      { params: { id: 'project-1' } }
    )

    expect(response.status).toBe(403)
  })
})
