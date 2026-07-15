import { describe, expect, it } from 'vitest'

import { buildCinematicEvidencePlan } from '@/lib/production/cinematic-evidence-spine'
import { buildDeepGameProductionBible } from '@/lib/production/deep-game-production-bible'
import { buildGameScopePlan } from '@/lib/production/game-scope-orchestrator'

describe('cinematic evidence spine', () => {
  it('blocks AI video reference when no provider evidence exists', () => {
    const plan = buildCinematicEvidencePlan({
      scope: 'demo',
      evidenceRefs: ['cinematic intent brief', 'shot list', 'storyboard frames'],
    })

    expect(plan.noFinalFootageClaim).toBe(true)
    expect(plan.route).toBe('/api/ai/video/generate')
    expect(plan.statusRoute).toBe('/api/ai/video/status')
    expect(plan.state).toBe('blocked')
    expect(plan.lanes.map((lane) => lane.id)).toEqual(expect.arrayContaining([
      'storyboard',
      'shot-blocking',
      'animatic-draft',
      'ai-video-reference',
      'engine-render-pass',
      'release-footage-review',
    ]))
    expect(plan.lanes.find((lane) => lane.id === 'ai-video-reference')).toMatchObject({
      status: 'blocked',
      blockers: ['Video provider required'],
    })
    expect(plan.copy.draftWarning).toBe('Draft videos are not final')
  })

  it('keeps fully evidenced cinematic work in human review instead of ready', () => {
    const evidenceRefs = [
      'cinematic intent brief',
      'shot list',
      'storyboard frames',
      'animatic prompt',
      'AI video provider status',
      'draft video review',
      'cutscene continuity receipt',
      'engine render or cloud stream capture',
      'human cinematic approval',
    ]
    const plan = buildCinematicEvidencePlan({
      scope: 'demo',
      evidenceRefs,
      videoProviderConfigured: true,
      cloudStreamConfigured: true,
    })

    expect(plan.missingEvidence).toEqual([])
    expect(plan.blockers).toEqual([])
    expect(plan.state).toBe('needs-review')
    expect(plan.nextAction).toContain('human cinematic approval')
  })

  it('flows into game scope and deep bible without exposing a wall of text', () => {
    const scopePlan = buildGameScopePlan({
      scope: 'demo',
      genre: 'rpg',
      userIntent: 'Create a mythic desert RPG demo with a memorable opening cinematic.',
      evidenceRefs: ['AI video provider status'],
    })
    const deepBible = buildDeepGameProductionBible({
      scope: 'demo',
      genre: 'rpg',
      genreLabel: 'RPG',
      userIntent: 'Create a mythic desert RPG demo with a memorable opening cinematic.',
      evidenceRefs: ['AI video provider status'],
    })

    expect(scopePlan.creativeArtifacts).toContain('cinematic-direction')
    expect(scopePlan.productionBible.sections.map((section) => section.id)).toContain('cinematics')
    expect(scopePlan.cinematicEvidence.copy.cloudCost).toBe('Cloud/video generation cost applies')
    expect(deepBible.cinematicEvidence.noFinalFootageClaim).toBe(true)
    expect(deepBible.compactUiSummary.visiblePillars).toContain('Cinematics')
    expect(deepBible.evidenceModel.blockedClaims).toContain('final cinematic')
  })
})
