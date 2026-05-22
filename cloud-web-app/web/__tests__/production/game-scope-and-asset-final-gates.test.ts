import { describe, expect, it } from 'vitest'

import { buildGameScopePlan } from '@/lib/production/game-scope-orchestrator'
import {
  evaluateAssetFinalClaimReadiness,
  GAME_ASSET_QUALITY_REQUIRED_EVIDENCE,
} from '@/lib/production/game-asset-quality-pipeline'

describe('game scope and asset final gates', () => {
  it('supports vertical-slice as a production-quality chapter without claiming a full game', () => {
    const plan = buildGameScopePlan({
      scope: 'vertical-slice',
      genre: 'rpg',
      userIntent: 'Create a desert RPG chapter with one boss route and governed asset quality.',
    })

    expect(plan.scope).toBe('vertical-slice')
    expect(plan.notFullGameClaim).toBe(true)
    expect(plan.humanReviewRequired).toBe(true)
    expect(plan.uxDisclosure).toContain('one production-quality chapter')
    expect(plan.creativeArtifacts).toEqual(expect.arrayContaining([
      'story-bible',
      'world-bible',
      'character-bible',
      'production-budget',
      'content-roadmap',
    ]))
    expect(plan.productionBible.firstUserDecision).toContain('production-quality chapter')
    expect(plan.productionBible.deepBible.scenes.length).toBe(6)
  })

  it('blocks raw AI draft assets from final/public claims', () => {
    const readiness = evaluateAssetFinalClaimReadiness({
      currentTier: 'ai-draft',
      evidenceRefs: ['license/provenance receipt'],
      humanApproved: false,
    })

    expect(readiness.state).toBe('blocked')
    expect(readiness.blockers).toEqual(expect.arrayContaining([
      'AI draft assets are never final; upgrade through curated or Studio Local lanes first.',
      'Human art-direction approval is required before final/public claims.',
    ]))
    expect(readiness.missingEvidence).toContain('LOD0/LOD1/LOD2/LOD3 manifest')
  })

  it('allows final-candidate assets only to enter human release review, never auto-publish', () => {
    const readiness = evaluateAssetFinalClaimReadiness({
      currentTier: 'studio-local-optimized',
      evidenceRefs: [...GAME_ASSET_QUALITY_REQUIRED_EVIDENCE],
      humanApproved: true,
    })

    expect(readiness).toMatchObject({
      state: 'needs-review',
      missingEvidence: [],
      blockers: [],
      humanReviewRequired: true,
    })
    expect(readiness.nextAction).toContain('do not auto-publish')
  })
})
