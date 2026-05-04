import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { buildParallelAgentWorkContract } from '@/lib/production/parallel-agent-work-contract'
import { buildRepositoryCartographyManifest } from '@/lib/production/repository-cartography'

const now = '2026-05-04T21:00:00.000Z'

describe('parallel agent work contract', () => {
  it('keeps gameplay agents diff-only inside owned surfaces with playtest and viewport tools', () => {
    const manifest = buildRepositoryCartographyManifest({
      projectId: 'game',
      generatedAt: now,
      artifacts: [
        { path: 'src/game/combat/BossController.ts', sizeBytes: 40_000 },
        { path: 'tests/playtest/boss.spec.ts', sizeBytes: 8_000 },
      ],
    })
    const surface = manifest.surfaces.find((candidate) => candidate.path === 'src/game/combat/BossController.ts')

    const contract = buildParallelAgentWorkContract({
      agent: 'Gameplay Engineer Agent',
      state: buildDefaultAgenticProductionState({ projectName: 'Game', projectType: 'unreal', now }),
      manifest,
      ownedSurfaces: surface ? [surface] : [],
      criticalGaps: [],
    })

    expect(contract.lane).toBe('gameplay')
    expect(contract.allowedTools).toEqual(
      expect.arrayContaining(['context-budget', 'diff-proposal', 'playtest-runner', 'viewport-capture'])
    )
    expect(contract.scopeLock.mode).toBe('diff-only')
    expect(contract.scopeLock.surfaces).toContain('src/game/combat/BossController.ts')
    expect(contract.parallelRules.join(' ')).toContain('owned surfaces do not overlap')
    expect(contract.parallelRules.join(' ')).toContain('Repository Context Budget')
    expect(contract.evidenceRequired.join(' ')).toContain('Playtest criteria')
  })

  it('forces read-only planning when repository cartography is missing', () => {
    const contract = buildParallelAgentWorkContract({
      agent: 'Software Engineer Agent',
      state: buildDefaultAgenticProductionState({ projectName: 'App', projectType: 'web', now }),
      ownedSurfaces: [],
      criticalGaps: [],
    })

    expect(contract.lane).toBe('software')
    expect(contract.scopeLock.mode).toBe('read-only')
    expect(contract.blockedUntil).toContain('Run Repository Cartography before broad edits or asset imports.')
    expect(contract.allowedTools).toEqual(expect.arrayContaining(['repository-cartography', 'diff-proposal']))
  })

  it('gives Browser Operator a permissioned, replay-first toolbelt', () => {
    const contract = buildParallelAgentWorkContract({
      agent: 'Browser Operator Agent',
      state: buildDefaultAgenticProductionState({ projectName: 'Cloud setup', projectType: 'web', now }),
      manifest: buildRepositoryCartographyManifest({
        projectId: 'cloud',
        generatedAt: now,
        artifacts: [{ path: '.aethelrules', sizeBytes: 200 }],
      }),
      ownedSurfaces: [],
      criticalGaps: [],
    })

    expect(contract.lane).toBe('browser-operator')
    expect(contract.allowedTools).toEqual(expect.arrayContaining(['browser-operator', 'browser-replay']))
    expect(contract.browserOperatorPolicy.join(' ')).toContain('explicit approval')
    expect(contract.approvalRequiredFor.join(' ')).toContain('login flows')
    expect(contract.canRunInParallelWith).toEqual(expect.arrayContaining(['Producer Agent', 'Research Agent', 'QA Agent']))
  })
})
