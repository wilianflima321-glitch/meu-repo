import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

import { PRODUCTION_STATE_SETTINGS_KEY } from '@/lib/production/agentic-production-state'
import { buildRepositoryCartographyManifest, REPOSITORY_CARTOGRAPHY_SETTINGS_KEY } from '@/lib/production/repository-cartography'
import { RESEARCH_INTELLIGENCE_SETTINGS_KEY } from '@/lib/production/research-intelligence-bridge'

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

import { GET, POST } from '@/app/api/projects/[id]/production-state/research-intelligence/route'

const manifest = buildRepositoryCartographyManifest({
  projectId: 'project-research',
  generatedAt: '2026-05-12T12:00:00.000Z',
  artifacts: [
    { path: '.aethelrules', sizeBytes: 1000 },
    { path: 'src/game/combat/BossController.ts', sizeBytes: 20_000, symbols: ['BossController'] },
    { path: 'assets/boss.glb', sizeBytes: 150_000_000, sourceKind: 'huggingface-hub', sourceUrl: 'https://huggingface.co/datasets/aethel/boss' },
  ],
})

describe('api/projects/[id]/production-state/research-intelligence route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMocks.requireAuth.mockReturnValue({ userId: 'user-1', email: 'research@example.com' })
    entitlementMocks.requireEntitlementsForUser.mockResolvedValue({ plan: { id: 'pro' } })
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-research',
      name: 'Research vertical slice',
      template: 'unreal',
      userId: 'user-1',
      settings: { [REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]: manifest },
      members: [],
    })
    prismaMocks.prisma.project.update.mockResolvedValue({ id: 'project-research' })
  })

  it('persists research intelligence into Project Brain, Mission Ledger, and graph evidence', async () => {
    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-research/production-state/research-intelligence', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mission: 'Validate boss combat and asset provenance before implementation.',
          evidence: [
            {
              title: 'Combat readability benchmark',
              sourceKind: 'official-docs',
              url: 'https://docs.example.com/gameplay/readability',
              claim: 'Boss windups should be readable before damage windows.',
              confidence: 0.91,
              relatedPaths: ['src/game/combat/BossController.ts'],
            },
            {
              title: 'HF boss asset pack',
              url: 'https://huggingface.co/datasets/aethel/boss',
              claim: 'Candidate external boss asset pack needs metadata-first inspection.',
              confidence: 0.78,
              relatedPaths: ['assets/boss.glb'],
            },
          ],
        }),
      }),
      { params: { id: 'project-research' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.persisted).toBe(true)
    expect(payload.packet.contextLinks.repositoryManifestId).toBe(manifest.id)
    expect(payload.packet.externalToolPlan.map((plan: { id: string }) => plan.id)).toContain('hf-metadata-first')
    expect(payload.state.ledger[0]).toMatchObject({ id: 'research-intelligence' })
    expect(prismaMocks.prisma.project.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-research' },
        data: expect.objectContaining({
          settings: expect.objectContaining({
            [RESEARCH_INTELLIGENCE_SETTINGS_KEY]: expect.objectContaining({
              id: expect.stringContaining('research-intelligence-project-research'),
            }),
            [PRODUCTION_STATE_SETTINGS_KEY]: expect.objectContaining({
              ledger: expect.arrayContaining([expect.objectContaining({ id: 'research-intelligence' })]),
              graphs: expect.objectContaining({
                evidenceGraph: expect.arrayContaining([expect.objectContaining({ id: 'research-intelligence-evidenceGraph' })]),
              }),
            }),
          }),
        }),
      })
    )
  })

  it('reads the latest research packet from settings', async () => {
    const packetSettings = {
      [REPOSITORY_CARTOGRAPHY_SETTINGS_KEY]: manifest,
      [RESEARCH_INTELLIGENCE_SETTINGS_KEY]: {
        version: 1,
        id: 'research-intelligence-existing',
        projectId: 'project-research',
        mission: 'Existing research',
        generatedAt: '2026-05-12T12:00:00.000Z',
        sources: [],
        claims: [],
        risks: [],
        externalToolPlan: [],
        guardrails: [],
        contextLinks: { repositoryManifestId: manifest.id, relatedSurfaceCount: 0, sourceCount: 0, claimCount: 0 },
      },
    }
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-research',
      name: 'Research vertical slice',
      template: 'unreal',
      userId: 'user-1',
      settings: packetSettings,
      members: [],
    })

    const response = await GET(
      new NextRequest('http://localhost:3000/api/projects/project-research/production-state/research-intelligence'),
      { params: { id: 'project-research' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.hasPacket).toBe(true)
    expect(payload.packet.id).toBe('research-intelligence-existing')
    expect(payload.repositoryManifestId).toBe(manifest.id)
  })

  it('rejects viewer-only collaborators before mutating research memory', async () => {
    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-research',
      name: 'Viewer research',
      template: 'web',
      userId: 'owner-1',
      settings: null,
      members: [{ role: 'viewer' }],
    })

    const response = await POST(
      new NextRequest('http://localhost:3000/api/projects/project-research/production-state/research-intelligence', {
        method: 'POST',
        body: JSON.stringify({ evidence: [] }),
      }),
      { params: { id: 'project-research' } }
    )
    const payload = await response.json()

    expect(response.status).toBe(403)
    expect(payload).toEqual({ error: 'Forbidden' })
    expect(prismaMocks.prisma.project.update).not.toHaveBeenCalled()
  })
})
