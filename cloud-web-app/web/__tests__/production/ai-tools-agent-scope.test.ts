import { beforeEach, describe, expect, it, vi } from 'vitest'

const dbMocks = vi.hoisted(() => ({
  prisma: {
    auditLog: {
      create: vi.fn(),
    },
    file: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}))

const projectResolverMocks = vi.hoisted(() => ({
  assertProjectOwnership: vi.fn(),
}))

const handoffMocks = vi.hoisted(() => ({
  loadAgentHandoffContext: vi.fn(),
}))

vi.mock('@/lib/db', () => dbMocks)
vi.mock('@/lib/copilot/project-resolver', () => projectResolverMocks)
vi.mock('@/lib/production/agent-handoff-context', () => handoffMocks)

import { executeTool } from '@/lib/ai-tools-registry'
import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { buildAgentHandoffPacket } from '@/lib/production/agent-handoff-packet'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
} from '@/lib/production/repository-cartography'
import { acquireAgentSurfaceLocks, clearAgentSurfaceLocksForTests } from '@/lib/production/agent-surface-locks'

const nowMs = Date.now() - 60_000
const now = new Date(nowMs).toISOString()
const afterManifest = new Date(nowMs + 15 * 60 * 1000).toISOString()

function buildGameplayPacket() {
  const manifest = buildRepositoryCartographyManifest({
    projectId: 'game',
    generatedAt: now,
    artifacts: [
      { path: '.aethelrules', sizeBytes: 200 },
      { path: 'src/game/combat/BossController.ts', sizeBytes: 30_000 },
      { path: 'tests/playtest/boss.spec.ts', sizeBytes: 8_000 },
    ],
  })
  const state = mergeRepositoryCartographyIntoProductionState(
    buildDefaultAgenticProductionState({ projectName: 'Game', projectType: 'unreal', now }),
    manifest
  )

  return buildAgentHandoffPacket({
    projectId: 'game',
    agent: 'Gameplay Engineer Agent',
    state,
    manifest,
    generatedAt: now,
  })
}

describe('ai tools agent scope enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearAgentSurfaceLocksForTests()
    projectResolverMocks.assertProjectOwnership.mockResolvedValue(undefined)
    dbMocks.prisma.auditLog.create.mockResolvedValue({ id: 'audit-1' })
    dbMocks.prisma.file.upsert.mockResolvedValue({
      id: 'file-1',
      path: '/src/game/combat/BossController.ts',
      updatedAt: new Date(now),
    })
  })

  it('blocks scoped write tools when Repository Cartography is missing', async () => {
    handoffMocks.loadAgentHandoffContext.mockResolvedValue({
      agent: 'Gameplay Engineer Agent',
      context: '',
      packet: null,
      hasManifest: false,
      projectFound: true,
    })

    const result = await executeTool('create_file', {
      path: 'src/game/combat/BossController.ts',
      content: 'export const boss = true',
      __aethelContext: {
        userId: 'user-1',
        projectId: 'game',
        agent: 'Gameplay Engineer Agent',
        enforceAgentScope: true,
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('AGENT_SCOPE_MANIFEST_REQUIRED')
    expect(dbMocks.prisma.file.upsert).not.toHaveBeenCalled()
    expect(dbMocks.prisma.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'ai_tool.scope_blocked',
          metadata: expect.objectContaining({ reason: 'AGENT_SCOPE_MANIFEST_REQUIRED' }),
        }),
      })
    )
  })

  it('allows scoped write tools inside the agent-owned surfaces', async () => {
    const packet = buildGameplayPacket()
    handoffMocks.loadAgentHandoffContext.mockResolvedValue({
      agent: 'Gameplay Engineer Agent',
      context: 'handoff',
      packet,
      hasManifest: true,
      projectFound: true,
    })

    const result = await executeTool('create_file', {
      path: 'src/game/combat/BossController.ts',
      content: 'export const boss = true',
      __aethelContext: {
        userId: 'user-1',
        projectId: 'game',
        agent: 'Gameplay Engineer Agent',
        enforceAgentScope: true,
      },
    })

    expect(result.success).toBe(true)
    expect(handoffMocks.loadAgentHandoffContext).toHaveBeenCalledWith(
      expect.objectContaining({
        requestedAgent: 'Gameplay Engineer Agent',
        filePath: 'src/game/combat/BossController.ts',
      })
    )
    expect(projectResolverMocks.assertProjectOwnership).toHaveBeenCalledWith('user-1', 'game')
    expect(dbMocks.prisma.file.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_path: { projectId: 'game', path: '/src/game/combat/BossController.ts' } },
      })
    )
  })

  it('blocks scoped write tools when cartography is stale for the target file', async () => {
    const packet = buildGameplayPacket()
    dbMocks.prisma.file.findFirst.mockResolvedValueOnce({
      updatedAt: new Date(afterManifest),
    })
    handoffMocks.loadAgentHandoffContext.mockResolvedValue({
      agent: 'Gameplay Engineer Agent',
      context: 'handoff',
      packet,
      hasManifest: true,
      projectFound: true,
    })

    const result = await executeTool('create_file', {
      path: 'src/game/combat/BossController.ts',
      content: 'export const boss = true',
      __aethelContext: {
        userId: 'user-1',
        projectId: 'game',
        agent: 'Gameplay Engineer Agent',
        enforceAgentScope: true,
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('AGENT_SCOPE_STALE_MANIFEST')
    expect(dbMocks.prisma.file.upsert).not.toHaveBeenCalled()
  })

  it('blocks scoped write tools when another agent owns the live surface lock', async () => {
    const packet = buildGameplayPacket()
    acquireAgentSurfaceLocks({
      projectId: 'game',
      agent: 'Technical Artist Agent',
      ownerUserId: 'user-2',
      paths: ['src/game/combat/BossController.ts'],
      source: 'session',
      reason: 'parallel viewport work',
      now,
    })
    handoffMocks.loadAgentHandoffContext.mockResolvedValue({
      agent: 'Gameplay Engineer Agent',
      context: 'handoff',
      packet,
      hasManifest: true,
      projectFound: true,
    })

    const result = await executeTool('create_file', {
      path: 'src/game/combat/BossController.ts',
      content: 'export const boss = true',
      __aethelContext: {
        userId: 'user-1',
        projectId: 'game',
        agent: 'Gameplay Engineer Agent',
        enforceAgentScope: true,
      },
    })

    expect(result.success).toBe(false)
    expect(result.error).toBe('AGENT_SURFACE_LOCKED')
    expect(dbMocks.prisma.file.upsert).not.toHaveBeenCalled()
  })

  it('keeps legacy unscoped single-tool writes compatible', async () => {
    const result = await executeTool('create_file', {
      path: 'src/app.ts',
      content: 'export const ok = true',
      __aethelContext: {
        userId: 'user-1',
        projectId: 'game',
      },
    })

    expect(result.success).toBe(true)
    expect(handoffMocks.loadAgentHandoffContext).not.toHaveBeenCalled()
    expect(dbMocks.prisma.file.upsert).toHaveBeenCalled()
  })
})
