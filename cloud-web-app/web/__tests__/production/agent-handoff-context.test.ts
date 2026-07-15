import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildDefaultAgenticProductionState, writeAgenticProductionStateToSettings } from '@/lib/production/agentic-production-state'
import {
  buildRepositoryContextBudgetExecutionState,
  mergeRepositoryContextBudgetExecutionPatch,
  writeRepositoryContextBudgetExecutionStateToSettings,
} from '@/lib/production/repository-context-budget-execution'
import {
  applyAgentHandoffContextToMessages,
  inferAgentForAiRequest,
  loadAgentHandoffContext,
} from '@/lib/production/agent-handoff-context'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
  writeRepositoryCartographyManifestToSettings,
} from '@/lib/production/repository-cartography'

const prismaMocks = vi.hoisted(() => ({
  prisma: {
    project: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/db', () => prismaMocks)

const now = '2026-05-04T20:00:00.000Z'

describe('agent handoff context', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('infers specialized agents from game, film, release, and validation prompts', () => {
    expect(
      inferAgentForAiRequest({
        routeKind: 'chat',
        promptText: 'Improve combat physics and enemy playtest criteria',
      })
    ).toBe('QA Agent')
    expect(
      inferAgentForAiRequest({
        routeKind: 'inline-edit',
        filePath: 'src/game/CharacterController.ts',
        promptText: 'adjust jump feel',
      })
    ).toBe('Gameplay Engineer Agent')
    expect(
      inferAgentForAiRequest({
        routeKind: 'chat',
        promptText: 'prepare cinematic shot timeline and render queue',
      })
    ).toBe('Cinematic Editor Agent')
    expect(
      inferAgentForAiRequest({
        routeKind: 'completion',
        promptText: 'add deploy rollback docs',
      })
    ).toBe('Release Agent')
  })

  it('builds a compact factual prompt context from persisted Project Brain and Repository Cartography', async () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'project-1',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 1000 },
        { path: 'docs/story-bible.md', sizeBytes: 3000 },
        { path: 'src/game/combat/BossController.ts', sizeBytes: 35_000 },
        { path: 'assets/boss.glb', sizeBytes: 80_000_000, license: 'commercial-use' },
        { path: 'tests/playtest/boss.spec.ts', sizeBytes: 9000 },
      ],
    })
    const state = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss fight', projectType: 'unreal', now }),
      manifest
    )
    const contextBudgetExecution = mergeRepositoryContextBudgetExecutionPatch(
      buildRepositoryContextBudgetExecutionState({ projectId: 'project-1', manifest, now }),
      { batchId: 'read-canonical-contracts', status: 'complete' },
      now
    )
    const settings = writeRepositoryContextBudgetExecutionStateToSettings(
      writeRepositoryCartographyManifestToSettings(writeAgenticProductionStateToSettings({}, state), manifest),
      contextBudgetExecution
    )

    prismaMocks.prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Boss fight',
      template: 'unreal',
      settings,
    })

    const result = await loadAgentHandoffContext({
      userId: 'user-1',
      projectId: 'project-1',
      routeKind: 'inline-edit',
      promptText: 'Tune combat feel',
      filePath: 'src/game/combat/BossController.ts',
    })

    expect(result.agent).toBe('Gameplay Engineer Agent')
    expect(result.hasManifest).toBe(true)
    expect(result.projectFound).toBe(true)
    expect(result.context).toContain('Aethel Agent Handoff Packet')
    expect(result.context).toContain('BossController.ts')
    expect(result.context).toContain('Parallel work lane: gameplay')
    expect(result.context).toContain('Allowed toolbelt')
    expect(result.context).toContain('Repository context budget')
    expect(result.context).toContain('Context budget execution')
    expect(result.context).toContain('read-canonical-contracts:complete')
    expect(result.context).toContain('Retrieval batches')
    expect(result.context).toContain('Context budget guardrails')
    expect(result.context).toContain('Browser Operator policy')
    expect(result.context).toContain('Do-not-invent guardrails')
    expect(result.context).toContain('Repository Cartography')
  })

  it('keeps AI messages unchanged when no project context is available', async () => {
    const result = await loadAgentHandoffContext({
      userId: 'user-1',
      routeKind: 'chat',
      promptText: 'build a landing page',
    })

    expect(result.context).toBe('')
    expect(result.packet).toBeNull()

    const messages = [{ role: 'user' as const, content: 'hello' }]
    expect(applyAgentHandoffContextToMessages(messages, result.context)).toEqual(messages)
  })

  it('injects handoff context as a system guardrail before user content', () => {
    const messages = [{ role: 'user' as const, content: 'edit combat' }]
    const next = applyAgentHandoffContextToMessages(messages, 'handoff context')

    expect(next).toEqual([
      { role: 'system', content: 'handoff context' },
      { role: 'user', content: 'edit combat' },
    ])
  })
})
