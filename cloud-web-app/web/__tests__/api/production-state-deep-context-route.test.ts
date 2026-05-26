import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import type { DeepContextMemorySnapshot } from '@/lib/ai/deep-context-manager'
import {
  DEEP_CONTEXT_MEMORY_SETTINGS_KEY,
  writeDeepContextMemorySnapshotToSettings,
} from '@/lib/production/deep-context-settings-persistence'

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

import { GET, POST } from '@/app/api/projects/[id]/production-state/deep-context/route'

const snapshot: DeepContextMemorySnapshot = {
  version: 1,
  projectId: 'project-1',
  updatedAt: '2026-05-26T12:00:00.000Z',
  chunks: [
    {
      id: 'approved-world-rule',
      projectId: 'project-1',
      category: 'world',
      title: 'Approved world rule',
      content: 'The city runs on solar magic and faction reputation affects every quest.',
      tags: ['world', 'magic', 'faction'],
      sourceRefs: ['docs/world.md'],
      evidenceRefs: ['evidence://world-rule'],
      importance: 0.9,
      tokenEstimate: 18,
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T12:00:00.000Z',
    },
    {
      id: 'draft-quest-note',
      projectId: 'project-1',
      category: 'gameplay',
      title: 'Draft quest note',
      content: 'Faction quest draft has no approval evidence yet.',
      tags: ['quest', 'faction'],
      sourceRefs: [],
      evidenceRefs: [],
      importance: 0.7,
      tokenEstimate: 12,
      createdAt: '2026-05-26T10:00:00.000Z',
      updatedAt: '2026-05-26T11:00:00.000Z',
    },
  ],
}

function project(settings: Record<string, unknown> = {}) {
  return {
    id: 'project-1',
    userId: 'user-1',
    settings,
    members: [],
  }
}

describe('api/projects/[id]/production-state/deep-context route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue(project())
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('returns empty governed memory when no snapshot exists', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/projects/project-1/production-state/deep-context'), {
      params: { id: 'project-1' },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hasMemory).toBe(false)
    expect(payload.memory).toBeNull()
    expect(payload.settingsKey).toBe(DEEP_CONTEXT_MEMORY_SETTINGS_KEY)
  })

  it('persists a new memory chunk into project settings', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/deep-context', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: 'quest-rule-1',
          category: 'decision',
          title: 'Quest decision',
          content: 'All boss fights need a fail-safe accessibility path and replayable evidence.',
          tags: ['Quest', 'Evidence'],
          sourceRefs: ['docs/design/quests.md'],
          evidenceRefs: ['evidence://quest-decision'],
          importance: 0.8,
        }),
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.chunk).toEqual(
      expect.objectContaining({
        id: 'quest-rule-1',
        category: 'decision',
        tags: ['quest', 'evidence'],
        evidenceRefs: ['evidence://quest-decision'],
      })
    )
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [DEEP_CONTEXT_MEMORY_SETTINGS_KEY]: expect.objectContaining({
              chunks: expect.arrayContaining([expect.objectContaining({ id: 'quest-rule-1' })]),
            }),
          }),
        }),
      })
    )
  })

  it('recalls only evidence-backed chunks when required', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue(
      project(writeDeepContextMemorySnapshotToSettings({}, snapshot))
    )

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/projects/project-1/production-state/deep-context?query=faction+quest+magic&requireEvidence=1&includeHeld=1'
      ),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hasMemory).toBe(true)
    expect(payload.recall.chunks.map((chunk: { id: string }) => chunk.id)).toContain('approved-world-rule')
    expect(payload.recall.heldChunks.map((chunk: { id: string }) => chunk.id)).toContain('draft-quest-note')
  })

  it('rejects viewer collaborators before writing memory', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      userId: 'owner-1',
      settings: {},
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/deep-context', {
        method: 'POST',
        body: JSON.stringify({ category: 'decision', content: 'Should not persist.' }),
      }),
      { params: { id: 'project-1' } }
    )

    expect(response.status).toBe(403)
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
