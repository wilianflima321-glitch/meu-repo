import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import {
  buildGameProductionSpineContract,
  evaluateGameProductionReadiness,
  mergeGameProductionSpineIntoProductionState,
} from '@/lib/production/game-production-spine'

describe('game production spine', () => {
  it('builds a governed premium game contract instead of autonomous AAA claims', () => {
    const contract = buildGameProductionSpineContract({
      projectId: 'odin-revival',
      title: 'Odin Revival vertical slice',
      scale: 'aaa-assisted',
      createdAt: '2026-05-14T12:00:00.000Z',
    })

    expect(contract.noAutonomousAaaClaim).toBe(true)
    expect(contract.browserRole).toBe('responsive-preview-and-review')
    expect(contract.heavyWorkPolicy).toBe('sidecar-or-cloud-only')
    expect(contract.humanApprovalRequiredForRelease).toBe(true)
    expect(contract.requiredSpecialistAgents).toEqual(expect.arrayContaining([
      'Combat Designer Agent',
      'World Architect Agent',
      'Performance QA Agent',
      'QA Playtest Agent',
    ]))
    expect(contract.graphs.map((graph) => graph.id)).toEqual(expect.arrayContaining([
      'design-bible',
      'world-graph',
      'gameplay-graph',
      'combat-graph',
      'animation-graph',
      'asset-pipeline-graph',
      'performance-graph',
      'playtest-validation-graph',
      'release-graph',
    ]))
    expect(contract.qualityBars.join(' ')).toContain('Playable build beats chat transcript')
    expect(contract.knownLimitations.join(' ')).toContain('does not promise full autonomous AAA production')
  })

  it('holds readiness until every graph has evidence', () => {
    const contract = buildGameProductionSpineContract({
      projectId: 'raccoon-station',
      title: 'Raccoon Station survival horror',
      createdAt: '2026-05-14T12:00:00.000Z',
    })
    const allEvidence = contract.graphs.flatMap((graph) =>
      graph.requiredEvidence.map((evidence) => `required:${graph.id}:${evidence}`)
    )

    expect(evaluateGameProductionReadiness(contract, [])).toMatchObject({
      state: 'held',
      nextAction: 'Attach required graph evidence before agents can claim playable quality.',
    })
    expect(evaluateGameProductionReadiness(contract, allEvidence)).toMatchObject({
      state: 'needs-review',
      missingEvidence: [],
      nextAction: 'Request human release approval with replay, build, performance, and provenance evidence.',
    })
  })

  it('merges game production graphs into the Project Brain without marking release ready', () => {
    const state = buildDefaultAgenticProductionState({
      projectName: 'Frontier Trail',
      projectType: 'unreal',
      now: '2026-05-14T11:00:00.000Z',
    })
    const contract = buildGameProductionSpineContract({
      projectId: 'frontier-trail',
      title: 'Frontier Trail open-world slice',
      scale: 'premium-indie',
      createdAt: '2026-05-14T12:00:00.000Z',
    })

    const merged = mergeGameProductionSpineIntoProductionState(state, contract)

    expect(merged.brain.domain).toBe('game')
    expect(merged.brain.technicalBible.constraints).toEqual(expect.arrayContaining([
      'Browser is preview/review only for premium game production',
      'No autonomous AAA claim without graph evidence, playtest replay, performance report, and human approval',
    ]))
    expect(merged.graphs.gameplayGraph.some((node) => node.id === 'game-spine-combat-graph')).toBe(true)
    expect(merged.graphs.sceneWorldGraph.some((node) => node.id === 'game-spine-world-graph')).toBe(true)
    expect(merged.graphs.assetGraph.some((node) => node.id === 'game-spine-asset-pipeline-graph')).toBe(true)
    expect(merged.graphs.validationGraph.some((node) => node.id === 'game-spine-playtest-validation-graph')).toBe(true)
    expect(merged.graphs.releaseGraph[0]).toMatchObject({
      id: 'game-spine-release-graph',
      status: 'blocked',
      ownerAgent: 'Release Producer Agent',
    })
    expect(merged.runtimePolicy).toMatchObject({
      preferredTarget: 'local-native',
      fallbackTarget: 'cloud-sandbox',
      requiresHumanApproval: true,
    })
    expect(merged.ledger[0].acceptance).toEqual(expect.arrayContaining([
      'Design Bible approved',
      'Release requires human approval and rollback plan',
    ]))
  })
})
