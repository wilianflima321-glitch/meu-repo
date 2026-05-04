import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { buildDefaultAgenticProductionState, writeAgenticProductionStateToSettings } from '@/lib/production/agentic-production-state'
import { AGENT_FLEET_SETTINGS_KEY } from '@/lib/production/agent-fleet-session'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
  writeRepositoryCartographyManifestToSettings,
} from '@/lib/production/repository-cartography'
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

import { GET, PATCH } from '@/app/api/projects/[id]/production-state/agent-fleet/route'

const now = '2026-05-04T23:20:00.000Z'

function buildProjectSettings() {
  const manifest = buildRepositoryCartographyManifest({
    projectId: 'project-1',
    generatedAt: now,
    artifacts: [
      { path: '.aethelrules', sizeBytes: 1000 },
      { path: 'src/game/combat/BossController.ts', sizeBytes: 30_000 },
      { path: 'tests/playtest/boss.spec.ts', sizeBytes: 9000 },
    ],
  })
  const state = mergeRepositoryCartographyIntoProductionState(
    buildDefaultAgenticProductionState({ projectName: 'Boss fight', projectType: 'unreal', now }),
    manifest
  )
  return writeRepositoryCartographyManifestToSettings(writeAgenticProductionStateToSettings({}, state), manifest)
}

describe('api/projects/[id]/production-state/agent-fleet route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAgentSurfaceLocksForTests()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight',
      template: 'unreal',
      userId: 'user-1',
      settings: buildProjectSettings(),
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-1' })
  })

  it('returns a compact coordinator-first fleet snapshot', async () => {
    const response = await GET(new NextRequest('http://localhost:3000/api/projects/project-1/production-state/agent-fleet'), {
      params: { id: 'project-1' },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.settingsKey).toBe(AGENT_FLEET_SETTINGS_KEY)
    expect(payload.snapshot.centralAgent).toBe('Producer Agent')
    expect(payload.snapshot.composer.primaryMode).toBe('Ask Producer Agent')
    expect(payload.snapshot.members[0].role).toBe('senior-coordinator')
    expect(payload.snapshot.controls).toContain('Change coordinator')
  })

  it('includes live surface lock signals in the fleet snapshot', async () => {
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Gameplay Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat/BossController.ts'],
      source: 'session',
      reason: 'combat pass',
      now,
    })

    const response = await GET(new NextRequest('http://localhost:3000/api/projects/project-1/production-state/agent-fleet'), {
      params: { id: 'project-1' },
    })
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.snapshot.activeLockCount).toBe(1)
    expect(payload.snapshot.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          agent: 'Gameplay Engineer Agent',
          activeLockCount: 1,
          lockedSurfacePreview: ['src/game/combat/BossController.ts'],
        }),
      ])
    )
  })

  it('persists a selected senior coordinator for agent-fleet UX', async () => {
    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/agent-fleet', {
        method: 'PATCH',
        body: JSON.stringify({
          centralAgent: 'Gameplay Engineer Agent',
          enabledAgents: ['Gameplay Engineer Agent', 'QA Agent', 'Producer Agent'],
          mode: 'selected-agent',
        }),
        headers: { 'content-type': 'application/json' },
      }),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.preferences.centralAgent).toBe('Gameplay Engineer Agent')
    expect(payload.snapshot.members[0]).toEqual(
      expect.objectContaining({
        agent: 'Gameplay Engineer Agent',
        role: 'senior-coordinator',
      })
    )
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [AGENT_FLEET_SETTINGS_KEY]: expect.objectContaining({
              centralAgent: 'Gameplay Engineer Agent',
              mode: 'selected-agent',
            }),
          }),
        }),
      })
    )
  })

  it('rejects viewer-only collaborators before changing coordinator preferences', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Film intro',
      template: 'unreal',
      userId: 'owner-1',
      settings: {},
      members: [{ role: 'viewer' }],
    })

    const response = await PATCH(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/agent-fleet', {
        method: 'PATCH',
        body: JSON.stringify({ centralAgent: 'Story Agent' }),
      }),
      { params: { id: 'project-1' } }
    )

    expect(response.status).toBe(403)
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
