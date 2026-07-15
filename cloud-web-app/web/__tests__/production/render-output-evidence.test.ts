import { describe, expect, it } from 'vitest'

import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import {
  buildViewportRenderEvidenceFromContract,
  mergeViewportRenderOutputEvidenceIntoProductionState,
} from '@/lib/production/render-output-evidence'
import { mergeViewportRenderJobIntoProductionState } from '@/lib/production/render-job-production-state'
import { buildViewportRenderJobContract } from '@/lib/viewport/viewport-render-contract'

function buildContract() {
  return buildViewportRenderJobContract({
    id: 'render-final-shot',
    projectId: 'project-1',
    mode: 'film',
    renderMode: 'cinematic',
    quality: 'final',
    requestedAt: '2026-05-11T12:00:00.000Z',
    timeline: { currentTime: 0, duration: 12, isPlaying: false },
    selectedObjectId: 'hero-camera',
    selectedObjectName: 'Hero Camera',
    scene: {
      objectCount: 12,
      assetCount: 3,
      selectedObjectId: 'hero-camera',
      selectedObjectName: 'Hero Camera',
      assetFormats: ['glb'],
      visualScriptNodes: 2,
      visualScriptEdges: 1,
      vfxNodes: 2,
      vfxConnections: 1,
    },
  })
}

describe('render output evidence production state', () => {
  it('attaches render media evidence while keeping final release human-gated', () => {
    const contract = buildContract()
    const base = mergeViewportRenderJobIntoProductionState(buildDefaultAgenticProductionState(), contract)
    const evidence = buildViewportRenderEvidenceFromContract(contract, {
      jobId: 'queue-render-1',
      capturedAt: '2026-05-11T12:20:00.000Z',
      artifacts: [
        { kind: 'final-video', url: 's3://renders/final.mp4', sizeBytes: 2048, durationSeconds: 12 },
        { kind: 'performance-report', url: 's3://renders/perf.json' },
        { kind: 'license-report', url: 's3://renders/license.json' },
      ],
      validation: {
        playbackOk: true,
        performanceOk: true,
        licenseOk: true,
        continuityOk: true,
      },
    })

    const next = mergeViewportRenderOutputEvidenceIntoProductionState(base, evidence)

    expect(next.ledger.find((entry) => entry.id === 'render-job-render-final-shot')).toMatchObject({
      state: 'needs-approval',
      nextAction: 'Human review must approve media evidence before release',
    })
    expect(next.graphs.evidenceGraph[0]).toMatchObject({
      id: 'render-output-render-final-shot',
      status: 'ready',
      ownerAgent: 'Render Queue Agent',
    })
    expect(next.graphs.validationGraph[0]).toMatchObject({
      id: 'render-validation-render-final-shot',
      status: 'ready',
      ownerAgent: 'Performance QA Agent',
    })
    expect(next.graphs.releaseGraph[0]).toMatchObject({
      id: 'render-release-render-final-shot',
      status: 'needs-review',
      ownerAgent: 'Release Agent',
      blockers: ['Human approval required before release'],
    })
  })

  it('blocks release when playback, performance, license, or continuity checks fail', () => {
    const contract = buildContract()
    const base = mergeViewportRenderJobIntoProductionState(buildDefaultAgenticProductionState(), contract)
    const evidence = buildViewportRenderEvidenceFromContract(contract, {
      artifacts: [{ kind: 'review-mp4', url: 's3://renders/review.mp4' }],
      validation: {
        playbackOk: true,
        performanceOk: false,
        licenseOk: true,
        continuityOk: false,
      },
    })

    const next = mergeViewportRenderOutputEvidenceIntoProductionState(base, evidence)

    expect(next.ledger.find((entry) => entry.id === 'render-job-render-final-shot')).toMatchObject({
      state: 'blocked',
      nextAction: 'Fix render validation failures before release review',
    })
    expect(next.graphs.validationGraph[0]).toMatchObject({
      status: 'blocked',
      blockers: ['Performance budget failed', 'Continuity review failed'],
    })
    expect(next.graphs.releaseGraph[0]).toMatchObject({
      status: 'blocked',
    })
  })
})
