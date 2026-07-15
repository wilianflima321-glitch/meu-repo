import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { buildRepositoryCartographyManifest, REPOSITORY_CARTOGRAPHY_SETTINGS_KEY } from '@/lib/production/repository-cartography'
import {
  buildResearchIntelligencePacket,
  RESEARCH_INTELLIGENCE_SETTINGS_KEY,
} from '@/lib/production/research-intelligence-bridge'
import { AGENT_READ_RECEIPTS_SETTINGS_KEY } from '@/lib/production/agent-read-receipts'

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

import { GET, POST } from '@/app/api/projects/[id]/production-state/read-receipts/route'

const generatedAt = '2026-05-12T12:00:00.000Z'
const readAt = '2026-05-12T12:05:00.000Z'

const manifest = buildRepositoryCartographyManifest({
  projectId: 'project-read-receipts',
  generatedAt,
  artifacts: [
    { path: '.aethelrules', sizeBytes: 1000 },
    { path: 'src/game/combat/BossController.ts', sizeBytes: 20_000, symbols: ['BossController'] },
    {
      path: 'assets/boss.glb',
      sizeBytes: 150_000_000,
      sourceKind: 'huggingface-hub',
      sourceUrl: 'https://huggingface.co/datasets/aethel/boss',
    },
  ],
})

const packet = buildResearchIntelligencePacket({
  projectId: 'project-read-receipts',
  generatedAt,
  repositoryManifest: manifest,
  evidence: [
    {
      title: 'Combat readability benchmark',
      sourceKind: 'official-docs',
      claim: 'Boss windups should be readable before damage windows.',
      confidence: 0.91,
      relatedPaths: ['src/game/combat/BossController.ts'],
    },
  ],
})

const targetSurface = manifest.surfaces.find((surface) => surface.path === 'src/game/combat/BossController.ts')!
const settings = {
  [REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]: manifest,
  [RESEARCH_INTELLIGENCE_SETTINGS_KEY]: packet,
}

describe('api/projects/[id]/production-state/read-receipts route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'reader@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-read-receipts',
      name: 'Read receipt vertical slice',
      template: 'game',
      userId: 'user-1',
      settings,
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-read-receipts' })
  })

  it('persists agent read receipts and returns an allowed readiness decision', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-read-receipts/production-state/read-receipts', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          agent: 'Gameplay Engineer Agent',
          targetPaths: ['src/game/combat/BossController.ts'],
          enforceReadReceipts: true,
          receipts: [
            { id: 'cartography-read', agent: 'Producer Agent', kind: 'repository-cartography', ref: manifest.id, readAt },
            { id: 'research-read', agent: 'Producer Agent', kind: 'research-intelligence', ref: packet.id, readAt },
            { id: 'surface-read', agent: 'Producer Agent', kind: 'repo-surface', ref: targetSurface.id, path: targetSurface.path, readAt },
          ],
        }),
      }),
      { params: { id: 'project-read-receipts' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.readiness).toMatchObject({ allowed: true, enforcement: 'passed' })
    expect(payload.productionState.ledger[0]).toMatchObject({ id: 'agent-read-receipts' })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-read-receipts' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [AGENT_READ_RECEIPTS_SETTINGS_KEY]: expect.objectContaining({
              receipts: expect.arrayContaining([expect.objectContaining({ id: 'cartography-read' })]),
            }),
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              ledger: expect.arrayContaining([expect.objectContaining({ id: 'agent-read-receipts' })]),
            }),
          }),
        }),
      })
    )
  })

  it('reports blocked readiness when an agent has not acknowledged cartography', async () => {
    const response = await GET(
      new NextRequest(
        'http://localhost:3000/api/projects/project-read-receipts/production-state/read-receipts?agent=Gameplay%20Engineer%20Agent&targetPath=src/game/combat/BossController.ts&enforceReadReceipts=true'
      ),
      { params: { id: 'project-read-receipts' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.settingsKey).toBe(AGENT_READ_RECEIPTS_SETTINGS_KEY)
    expect(payload.readiness).toMatchObject({
      allowed: false,
      code: 'AGENT_READ_RECEIPTS_CARTOGRAPHY_UNREAD',
      status: 428,
    })
  })

  it('rejects viewer-only collaborators before mutating read receipts', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-read-receipts',
      name: 'Viewer receipts',
      template: 'web',
      userId: 'owner-1',
      settings,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-read-receipts/production-state/read-receipts', {
        method: 'POST',
        body: JSON.stringify({ receipts: [] }),
      }),
      { params: { id: 'project-read-receipts' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
