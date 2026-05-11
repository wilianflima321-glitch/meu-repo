import { buildDefaultAgenticProductionState } from '@/lib/production/agentic-production-state'
import { mergeViewportAssetImportIntoProductionState } from '@/lib/production/asset-import-production-state'
import { buildViewportAssetImportBatch, buildViewportImportedObjects } from '@/lib/viewport/viewport-asset-import'

describe('asset import production state', () => {
  it('merges viewport asset intake into Asset Graph, Scene Graph, evidence, validation, and Mission Ledger', () => {
    const importedObjects = buildViewportImportedObjects({
      existingCount: 1,
      importedAt: '2026-05-11T12:00:00.000Z',
      files: [{ fileName: 'Hero Rig.glb', sizeBytes: 4_194_304 }],
    })
    const batch = buildViewportAssetImportBatch(importedObjects, {
      id: 'batch-hero-rig',
      projectId: 'project-1',
      importedAt: '2026-05-11T12:00:00.000Z',
    })
    const state = mergeViewportAssetImportIntoProductionState(
      buildDefaultAgenticProductionState({ projectName: 'AAA prototype' }),
      batch,
      '2026-05-11T12:01:00.000Z',
    )

    expect(state.ledger[0]).toMatchObject({
      id: 'asset-import-batch-hero-rig',
      phase: 'Asset intake',
      state: 'needs-approval',
      ownerAgent: 'Asset Librarian Agent',
      nextAction: 'Review asset licenses and generate preview/proxy evidence',
    })
    expect(state.graphs.assetGraph[0]).toMatchObject({
      label: 'Hero Rig - GLB - 4.0 MB',
      status: 'needs-review',
      ownerAgent: 'Asset Librarian Agent',
      blockers: expect.arrayContaining([
        'License/provenance review required before release',
        'Asset quality gate is raw intake; generate preview/proxy before final release',
      ]),
    })
    expect(state.graphs.sceneWorldGraph[0].id).toBe('asset-scene-batch-hero-rig')
    expect(state.graphs.evidenceGraph[0].evidenceRefs).toEqual(
      expect.arrayContaining(['asset-import:batch-hero-rig'])
    )
    expect(state.graphs.validationGraph[0].status).toBe('needs-review')
    expect(state.brain.risks).toContain('Asset provenance pending: Hero Rig')
  })
})
