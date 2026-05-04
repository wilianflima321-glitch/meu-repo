import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { buildAgentHandoffPacket } from '@/lib/production/agent-handoff-packet'
import { evaluateAgentApplyScope } from '@/lib/production/agent-scope-enforcement'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
} from '@/lib/production/repository-cartography'

const now = '2026-05-04T22:00:00.000Z'

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

describe('agent scope enforcement', () => {
  it('skips legacy single-file apply when no explicit agent scope is requested', () => {
    const decision = evaluateAgentApplyScope({
      packet: null,
      virtualPaths: ['src/app.ts'],
      enforceAgentScope: false,
      broadEdit: false,
    })

    expect(decision.allowed).toBe(true)
    expect(decision.allowed ? decision.enforcement : decision.code).toBe('skipped')
  })

  it('requires cartography for broad edits', () => {
    const decision = evaluateAgentApplyScope({
      packet: null,
      virtualPaths: ['src/a.ts', 'src/b.ts'],
      enforceAgentScope: false,
      broadEdit: true,
    })

    expect(decision.allowed).toBe(false)
    expect(decision.allowed ? '' : decision.code).toBe('AGENT_SCOPE_MANIFEST_REQUIRED')
    expect(decision.allowed ? 0 : decision.status).toBe(428)
  })

  it('allows scoped applies inside owned surfaces', () => {
    const packet = buildGameplayPacket()
    const decision = evaluateAgentApplyScope({
      packet,
      virtualPaths: ['src/game/combat/BossController.ts'],
      enforceAgentScope: true,
      broadEdit: false,
    })

    expect(decision.allowed).toBe(true)
    expect(decision.allowed ? decision.enforcement : decision.code).toBe('passed')
    expect(decision.metadata).toEqual(expect.objectContaining({ lane: 'gameplay', scopeMode: 'diff-only' }))
  })

  it('blocks scoped applies when the repository cartography is stale for the path', () => {
    const packet = buildGameplayPacket()
    const decision = evaluateAgentApplyScope({
      packet,
      virtualPaths: ['src/game/combat/BossController.ts'],
      enforceAgentScope: true,
      broadEdit: false,
      pathModifiedAt: {
        'src/game/combat/BossController.ts': '2026-05-04T22:05:00.000Z',
      },
    })

    expect(decision.allowed).toBe(false)
    expect(decision.allowed ? '' : decision.code).toBe('AGENT_SCOPE_STALE_MANIFEST')
    expect(decision.metadata).toEqual(
      expect.objectContaining({
        stalePaths: [
          expect.objectContaining({
            path: 'src/game/combat/BossController.ts',
            manifestGeneratedAt: now,
          }),
        ],
      })
    )
  })

  it('blocks applies outside owned surfaces', () => {
    const packet = buildGameplayPacket()
    const decision = evaluateAgentApplyScope({
      packet,
      virtualPaths: ['src/app/admin/BillingSettings.tsx'],
      enforceAgentScope: true,
      broadEdit: false,
    })

    expect(decision.allowed).toBe(false)
    expect(decision.allowed ? '' : decision.code).toBe('AGENT_SCOPE_OUTSIDE_OWNERSHIP')
    expect(decision.metadata).toEqual(expect.objectContaining({ outsideScope: ['src/app/admin/BillingSettings.tsx'] }))
  })
})
