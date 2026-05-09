import { beforeEach, describe, expect, it } from 'vitest'

import {
  acquireAgentSurfaceLocks,
  buildAgentSurfaceLockSnapshot,
  clearAgentSurfaceLocksForTests,
  listActiveAgentSurfaceLocks,
  previewAgentSurfaceLockRequest,
} from '@/lib/production/agent-surface-locks'

describe('agent surface locks', () => {
  beforeEach(() => {
    clearAgentSurfaceLocksForTests()
  })

  it('allows the same agent owner to renew an existing surface lock', () => {
    const first = acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Software Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/app/page.tsx'],
      source: 'tool',
      reason: 'edit_file',
      now: '2026-05-04T22:00:00.000Z',
    })

    const second = acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Software Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/app/page.tsx'],
      source: 'apply',
      reason: 'AI_CHANGE_APPLY',
      now: '2026-05-04T22:01:00.000Z',
    })

    expect(first.allowed).toBe(true)
    expect(second.allowed).toBe(true)
  })

  it('blocks another agent from writing a locked surface', () => {
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Gameplay Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat/BossController.ts'],
      source: 'session',
      reason: 'playtest implementation',
      now: '2026-05-04T22:00:00.000Z',
    })

    const blocked = acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Technical Artist Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat/BossController.ts'],
      source: 'tool',
      reason: 'edit_file',
      now: '2026-05-04T22:01:00.000Z',
    })

    expect(blocked.allowed).toBe(false)
    expect(blocked.allowed ? '' : blocked.code).toBe('AGENT_SURFACE_LOCKED')
    expect(blocked.metadata).toEqual(
      expect.objectContaining({
        conflicts: [
          expect.objectContaining({
            agent: 'Gameplay Engineer Agent',
            paths: ['src/game/combat/BossController.ts'],
          }),
        ],
      })
    )
  })

  it('expires locks after the configured ttl', () => {
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Gameplay Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat/BossController.ts'],
      source: 'session',
      reason: 'playtest implementation',
      now: '2026-05-04T22:00:00.000Z',
      ttlMs: 1_000,
    })

    const next = acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Technical Artist Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat/BossController.ts'],
      source: 'tool',
      reason: 'edit_file',
      now: '2026-05-04T22:00:02.000Z',
    })

    expect(next.allowed).toBe(true)
  })

  it('treats nested paths as conflicting surfaces', () => {
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Asset Librarian Agent',
      ownerUserId: 'user-1',
      paths: ['assets/characters'],
      source: 'session',
      reason: 'asset provenance pass',
      now: '2026-05-04T22:00:00.000Z',
    })

    const blocked = acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Cinematic Editor Agent',
      ownerUserId: 'user-2',
      paths: ['assets/characters/hero.glb'],
      source: 'tool',
      reason: 'timeline shot import',
      now: '2026-05-04T22:01:00.000Z',
    })

    expect(blocked.allowed).toBe(false)
    expect(blocked.allowed ? '' : blocked.code).toBe('AGENT_SURFACE_LOCKED')
  })

  it('previews conflicts without acquiring a new lock', () => {
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Gameplay Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat'],
      source: 'session',
      reason: 'combat pass',
      now: '2026-05-04T22:00:00.000Z',
    })

    const preview = previewAgentSurfaceLockRequest({
      projectId: 'project-1',
      agent: 'Technical Artist Agent',
      ownerUserId: 'user-2',
      paths: ['src/game/combat/BossController.ts'],
      now: '2026-05-04T22:01:00.000Z',
    })

    expect(preview.allowed).toBe(false)
    expect(preview.conflicts).toEqual([
      expect.objectContaining({
        blockingAgent: 'Gameplay Engineer Agent',
        blockingPaths: ['src/game/combat'],
        requestedPaths: ['src/game/combat/BossController.ts'],
      }),
    ])
    expect(preview.nextAction).toContain('Producer Agent')
    expect(listActiveAgentSurfaceLocks({ projectId: 'project-1', now: '2026-05-04T22:01:00.000Z' })).toHaveLength(1)
  })

  it('builds a Producer-ready ownership snapshot for active scope locks', () => {
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'Gameplay Engineer Agent',
      ownerUserId: 'user-1',
      paths: ['src/game/combat/BossController.ts'],
      source: 'session',
      reason: 'combat pass',
      now: '2026-05-04T22:00:00.000Z',
      ttlMs: 90_000,
    })
    acquireAgentSurfaceLocks({
      projectId: 'project-1',
      agent: 'QA Agent',
      ownerUserId: 'user-2',
      paths: ['tests/playtest/boss.spec.ts'],
      source: 'session',
      reason: 'playtest pass',
      now: '2026-05-04T22:00:10.000Z',
      ttlMs: 300_000,
    })

    const snapshot = buildAgentSurfaceLockSnapshot({
      projectId: 'project-1',
      now: '2026-05-04T22:00:30.000Z',
      expiringSoonMs: 120_000,
    })

    expect(snapshot.activeLockCount).toBe(2)
    expect(snapshot.lockedPathCount).toBe(2)
    expect(snapshot.expiringSoonCount).toBe(1)
    expect(snapshot.arbitrationRequired).toBe(true)
    expect(snapshot.owners).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ agent: 'Gameplay Engineer Agent', paths: ['src/game/combat/BossController.ts'] }),
        expect.objectContaining({ agent: 'QA Agent', paths: ['tests/playtest/boss.spec.ts'] }),
      ])
    )
    expect(snapshot.nextAction).toContain('Producer Agent')
  })
})
