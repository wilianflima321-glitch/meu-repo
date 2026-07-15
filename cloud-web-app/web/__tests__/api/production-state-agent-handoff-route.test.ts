import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { buildDefaultAgenticProductionState, writeAgenticProductionStateToSettings } from '@/lib/production/agentic-production-state'
import {
  buildRepositoryContextBudgetExecutionState,
  writeRepositoryContextBudgetExecutionStateToSettings,
} from '@/lib/production/repository-context-budget-execution'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
  writeRepositoryCartographyManifestToSettings,
} from '@/lib/production/repository-cartography'

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

import { GET } from '@/app/api/projects/[id]/production-state/agent-handoff/route'

const now = '2026-05-04T18:45:00.000Z'

describe('api/projects/[id]/production-state/agent-handoff route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'builder@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
  })

  it('returns a scoped handoff packet from persisted production state and cartography manifest', async () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'project-1',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 1000 },
        { path: 'package.json', sizeBytes: 3000 },
        { path: 'src/game/combat/BossController.ts', sizeBytes: 30_000 },
        { path: 'tests/playtest/boss.spec.ts', sizeBytes: 9000 },
      ],
    })
    const state = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss fight', projectType: 'unreal', now }),
      manifest
    )
    const execution = buildRepositoryContextBudgetExecutionState({ projectId: 'project-1', manifest, now })
    const settings = writeRepositoryContextBudgetExecutionStateToSettings(
      writeRepositoryCartographyManifestToSettings(writeAgenticProductionStateToSettings({}, state), manifest),
      execution
    )
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight',
      template: 'unreal',
      settings,
    })

    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/projects/project-1/production-state/agent-handoff?agent=Gameplay%20Engineer%20Agent'
      ),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hasManifest).toBe(true)
    expect(payload.packet.agent).toBe('Gameplay Engineer Agent')
    expect(payload.packet.cartography.manifestId).toBe(manifest.id)
    expect(payload.contextBudgetExecution.manifestId).toBe(manifest.id)
    expect(payload.packet.cartography.ownedSurfaces).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'src/game/combat/BossController.ts' })])
    )
    expect(payload.packet.acceptance).toContain('Cite Repository Cartography evidence before edits')
  })

  it('falls back safely when the project has no persisted cartography manifest', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Launch site',
      template: 'web',
      settings: null,
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-1/production-state/agent-handoff'),
      { params: { id: 'project-1' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hasManifest).toBe(false)
    expect(payload.packet.status).toBe('needs-review')
    expect(payload.packet.cartography.doNotInvent).toContain('Do not edit without a fresh Repository Cartography manifest.')
  })
})
