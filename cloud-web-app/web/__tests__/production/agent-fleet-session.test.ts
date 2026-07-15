import { beforeEach, describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import {
  buildAgentFleetSnapshot,
  buildDefaultAgentFleetPreferences,
  mergeAgentFleetPreferences,
} from '@/lib/production/agent-fleet-session'
import {
  buildRepositoryCartographyManifest,
  mergeRepositoryCartographyIntoProductionState,
} from '@/lib/production/repository-cartography'
import {
  acquireAgentSurfaceLocks,
  clearAgentSurfaceLocksForTests,
  listActiveAgentSurfaceLocks,
} from '@/lib/production/agent-surface-locks'

const now = '2026-05-04T23:10:00.000Z'

describe('agent fleet session', () => {
  beforeEach(() => {
    clearAgentSurfaceLocksForTests()
  })

  it('keeps the fleet in coordinator-first planning mode until cartography exists', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Aethel Site', projectType: 'web', now })
    const snapshot = buildAgentFleetSnapshot({
      projectId: 'project-1',
      state,
      preferences: buildDefaultAgentFleetPreferences(now),
      now,
    })

    expect(snapshot.hasManifest).toBe(false)
    expect(snapshot.centralAgent).toBe('Producer Agent')
    expect(snapshot.composer.primaryMode).toBe('Ask coordinator to map context')
    expect(snapshot.members[0]).toEqual(
      expect.objectContaining({
        agent: 'Producer Agent',
        role: 'senior-coordinator',
        status: 'blocked',
        scopeMode: 'read-only',
      })
    )
  })

  it('allows a specialist to become the senior coordinator without adding a noisy new surface', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'game',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 1000 },
        { path: 'src/game/combat/BossController.ts', sizeBytes: 30_000 },
        { path: 'tests/playtest/boss.spec.ts', sizeBytes: 9_000 },
      ],
    })
    const state = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss Fight', projectType: 'unreal', now }),
      manifest
    )
    const preferences = mergeAgentFleetPreferences(buildDefaultAgentFleetPreferences(now), {
      centralAgent: 'Gameplay Engineer Agent',
      enabledAgents: ['Gameplay Engineer Agent', 'QA Agent', 'Producer Agent'],
      mode: 'selected-agent',
    }, now)
    const snapshot = buildAgentFleetSnapshot({
      projectId: 'game',
      state,
      manifest,
      preferences,
      now,
    })

    expect(snapshot.centralAgent).toBe('Gameplay Engineer Agent')
    expect(snapshot.mode).toBe('selected-agent')
    expect(snapshot.composer.primaryMode).toBe('Talk to selected specialist')
    expect(snapshot.members[0]).toEqual(
      expect.objectContaining({
        agent: 'Gameplay Engineer Agent',
        role: 'senior-coordinator',
        lane: 'gameplay',
        scopeMode: 'diff-only',
      })
    )
    expect(snapshot.controls).toContain('Change coordinator')
    expect(snapshot.summary).toContain('Gameplay Engineer Agent')
  })

  it('surfaces live locks and stale cartography as compact fleet signals', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'game',
      generatedAt: now,
      artifacts: [
        { path: '.aethelrules', sizeBytes: 1000 },
        {
          path: 'src/game/combat/BossController.ts',
          sizeBytes: 30_000,
          lastModified: '2026-05-04T23:20:00.000Z',
        },
      ],
    })
    const state = mergeRepositoryCartographyIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss Fight', projectType: 'unreal', now }),
      manifest
    )
    acquireAgentSurfaceLocks({
      projectId: 'game',
      agent: 'Gameplay Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat/BossController.ts'],
      source: 'session',
      reason: 'combat pass',
      now,
    })

    const snapshot = buildAgentFleetSnapshot({
      projectId: 'game',
      state,
      manifest,
      preferences: mergeAgentFleetPreferences(buildDefaultAgentFleetPreferences(now), {
        centralAgent: 'Gameplay Engineer Agent',
        enabledAgents: ['Gameplay Engineer Agent'],
      }, now),
      activeLocks: listActiveAgentSurfaceLocks({ projectId: 'game', now }),
      now,
    })

    expect(snapshot.activeLockCount).toBe(1)
    expect(snapshot.staleSurfaceCount).toBeGreaterThanOrEqual(1)
    expect(snapshot.members[0]).toEqual(
      expect.objectContaining({
        agent: 'Gameplay Engineer Agent',
        activeLockCount: 1,
        lockedSurfacePreview: ['src/game/combat/BossController.ts'],
        staleSurfaceCount: 1,
        staleSurfacePreview: ['src/game/combat/BossController.ts'],
      })
    )
  })
})
