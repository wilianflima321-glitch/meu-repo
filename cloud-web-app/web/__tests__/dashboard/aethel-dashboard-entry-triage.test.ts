import { describe, expect, it } from 'vitest'

import {
  resolveDashboardEntryLane,
  resolveDashboardEntrySeed,
} from '@/components/dashboard/aethel-dashboard-entry-triage'

describe('dashboard entry triage', () => {
  it('routes research starters into the AI Console lane', () => {
    const lane = resolveDashboardEntryLane('home-research')
    const seed = resolveDashboardEntrySeed({
      mission: null,
      source: 'home-research',
      onboarding: true,
    })

    expect(lane.label).toBe('Research')
    expect(seed.targetTab).toBe('ai-chat')
    expect(seed.showFirstValueGuide).toBe(true)
  })

  it('routes cloud starters into readiness before deeper work', () => {
    const lane = resolveDashboardEntryLane('home-cloud')
    const seed = resolveDashboardEntrySeed({
      mission: null,
      source: 'home-cloud',
      onboarding: true,
    })

    expect(lane.targetTab).toBe('connectivity')
    expect(seed.targetTab).toBe('connectivity')
    expect(seed.toast?.message).toMatch(/Cloud \/ DevOps/i)
  })

  it('keeps explicit mission intake in the AI Console regardless of lane', () => {
    const seed = resolveDashboardEntrySeed({
      mission: 'Fix the failing deployment and review the preview',
      source: 'home-apps',
      onboarding: true,
    })

    expect(seed.targetTab).toBe('ai-chat')
    expect(seed.chatSeed).toMatch(/Fix the failing deployment/i)
    expect(seed.toast?.type).toBe('info')
  })
})
