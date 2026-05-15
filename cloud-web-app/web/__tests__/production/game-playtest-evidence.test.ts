import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import {
  coerceGamePlaytestEvidence,
  mergeGamePlaytestEvidenceIntoProductionState,
} from '@/lib/production/game-playtest-evidence'

function validEvidence() {
  return {
    sessionId: 'playtest-boss-01',
    buildId: 'build-42',
    scenario: 'Boss arena first combat loop',
    runtimeTarget: 'local-native',
    capturedAt: '2026-05-14T13:00:00.000Z',
    artifacts: [
      { kind: 'replay', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/replay.json' },
      { kind: 'performance-trace', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/perf.json' },
      { kind: 'bug-report', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/bugs.json' },
    ],
    metrics: {
      durationSeconds: 180,
      averageFps: 72,
      p95FrameTimeMs: 18,
      inputLatencyMs: 38,
      crashCount: 0,
      blockerBugCount: 0,
      majorBugCount: 1,
      completionRate: 1,
      memoryPeakMb: 4096,
      vramPeakMb: 6144,
    },
    validation: {
      playable: true,
      crashFree: true,
      performanceOk: true,
      inputOk: true,
      progressionOk: true,
      accessibilityOk: true,
      humanFeelReviewOk: true,
    },
  }
}

describe('game playtest evidence', () => {
  it('requires replay, performance trace, and bug report evidence', () => {
    expect(coerceGamePlaytestEvidence(validEvidence())).toMatchObject({
      sessionId: 'playtest-boss-01',
      runtimeTarget: 'local-native',
    })
    expect(coerceGamePlaytestEvidence({
      ...validEvidence(),
      artifacts: [{ kind: 'replay', url: 'aethel-artifact://playtest/project-1/playtest-boss-01/replay.json' }],
    })).toBeNull()
  })

  it('merges passing playtest evidence as needs-review, never release-ready', () => {
    const state = buildDefaultAgenticProductionState({
      projectName: 'Boss fight',
      projectType: 'unreal',
      now: '2026-05-14T12:00:00.000Z',
    })
    const evidence = coerceGamePlaytestEvidence(validEvidence())
    expect(evidence).not.toBeNull()

    const merged = mergeGamePlaytestEvidenceIntoProductionState(state, evidence!)

    expect(merged.graphs.evidenceGraph[0]).toMatchObject({
      id: 'game-playtest-evidence-playtest-boss-01',
      status: 'ready',
    })
    expect(merged.graphs.gameplayGraph[0]).toMatchObject({
      id: 'game-playtest-gameplay-playtest-boss-01',
      status: 'needs-review',
    })
    expect(merged.graphs.validationGraph[0]).toMatchObject({
      id: 'game-playtest-validation-playtest-boss-01',
      status: 'needs-review',
    })
    expect(merged.graphs.releaseGraph[0]).toMatchObject({
      id: 'game-playtest-release-playtest-boss-01',
      status: 'needs-review',
      blockers: ['Human approval required before release; playtest evidence never auto-publishes the game'],
    })
    expect(merged.runtimePolicy.requiresHumanApproval).toBe(true)
  })

  it('blocks gameplay and release when playtest finds crashes or feel failures', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Survival horror' })
    const evidence = coerceGamePlaytestEvidence({
      ...validEvidence(),
      sessionId: 'playtest-crash-01',
      metrics: {
        ...validEvidence().metrics,
        crashCount: 1,
        blockerBugCount: 2,
      },
      validation: {
        ...validEvidence().validation,
        crashFree: false,
        humanFeelReviewOk: false,
      },
    })

    const merged = mergeGamePlaytestEvidenceIntoProductionState(state, evidence!)

    expect(merged.graphs.gameplayGraph[0].status).toBe('blocked')
    expect(merged.graphs.releaseGraph[0].status).toBe('blocked')
    expect(merged.graphs.releaseGraph[0].blockers).toEqual(expect.arrayContaining([
      'Crash-free validation failed',
      'Human feel review is still required',
      '2 blocker bugs remain',
      '1 crashes recorded',
    ]))
  })
})
