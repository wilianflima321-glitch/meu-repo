import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { mergeViewportRenderJobIntoProductionState } from '@/lib/production/render-job-production-state'
import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

describe('render job production state', () => {
  it('records heavy viewport render contracts in ledger, evidence, validation, release, and domain graph', () => {
    const base = buildDefaultAgenticProductionState({ projectName: 'Cinematic boss fight', projectType: 'unreal', now: '2026-05-11T12:00:00.000Z' })
    const contract = buildViewportRenderJobContract({
      id: 'render-cinematic-boss',
      mode: 'film',
      renderMode: 'cinematic',
      quality: 'final',
      requestedAt: '2026-05-11T12:05:00.000Z',
      timeline: { currentTime: 0, duration: 45, isPlaying: false },
      selectedObjectId: 'camera-rig',
      selectedObjectName: 'Camera Rig',
      scene: {
        objectCount: 24,
        assetCount: 6,
        selectedObjectId: 'camera-rig',
        selectedObjectName: 'Camera Rig',
        assetFormats: ['glb', 'fbx'],
        visualScriptNodes: 5,
        visualScriptEdges: 4,
        vfxNodes: 3,
        vfxConnections: 2,
      },
    })

    const state = mergeViewportRenderJobIntoProductionState(base, contract, '2026-05-11T12:06:00.000Z')

    expect(state.ledger[0]).toMatchObject({
      id: 'render-job-render-cinematic-boss',
      state: 'blocked',
      ownerAgent: 'Cinematic Editor Agent',
      estimatedCostUsd: contract.estimatedCostUsd,
    })
    expect(state.graphs.shotFilmGraph[0]).toMatchObject({
      id: 'film-render-render-cinematic-boss',
      status: 'needs-review',
    })
    expect(state.graphs.evidenceGraph[0].blockers).toContain('Rendered media evidence is required before release approval')
    expect(state.graphs.validationGraph[0].ownerAgent).toBe('Performance QA Agent')
    expect(state.graphs.releaseGraph[0]).toMatchObject({ status: 'blocked', ownerAgent: 'Release Agent' })
    expect(state.brain.technicalBible.constraints).toContain('Final game/film output requires evidence before release approval')
  })
})
