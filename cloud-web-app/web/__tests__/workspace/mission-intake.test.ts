import { describe, expect, it } from 'vitest'

import {
  buildMissionHandoffUrl,
  buildMissionProjectSettings,
  buildMissionWorkspaceName,
  parseMissionIntake,
} from '@/lib/workspace/mission-intake'

describe('mission intake helpers', () => {
  it('normalizes mission, source and template from public entry', () => {
    expect(
      parseMissionIntake({
        mission: '  Fix the failing deploy   and connect   domain  ',
        source: ' landing-mission-box ',
        template: ' saas-starter ',
      })
    ).toEqual({
      mission: 'Fix the failing deploy and connect domain',
      source: 'landing-mission-box',
      template: 'saas-starter',
    })
  })

  it('rejects empty mission payloads instead of creating fake workspaces', () => {
    expect(parseMissionIntake({ mission: '    ' })).toBeNull()
    expect(parseMissionIntake({})).toBeNull()
  })

  it('builds compact workspace names from the mission', () => {
    expect(buildMissionWorkspaceName('Launch marketing site!! with docs/pricing')).toBe(
      'Launch marketing site with docspricing'
    )
    expect(buildMissionWorkspaceName('***')).toBe('Aethel mission workspace')
  })

  it('builds unauthenticated handoff URLs that preserve mission context', () => {
    const handoffUrl = buildMissionHandoffUrl({
      mission: 'Research competitors',
      source: 'landing-mission-box',
      template: 'research',
    })

    expect(handoffUrl).toBe(
      '/dashboard?mission=Research+competitors&onboarding=1&source=landing-mission-box&auth=required&template=research'
    )
  })

  it('keeps project settings tied to Studio Home and the entry mission', () => {
    expect(
      buildMissionProjectSettings({
        mission: 'Build a customer portal',
        source: 'landing-mission-box',
        template: 'saas-starter',
      })
    ).toEqual({
      entry: {
        mission: 'Build a customer portal',
        source: 'landing-mission-box',
        template: 'saas-starter',
        createdFrom: 'web-entry',
        handoff: 'studio-home',
      },
      studio: {
        initialSurface: 'studio-home',
        depthModel: 'web-light-to-studio-cloud',
      },
    })
  })
})
