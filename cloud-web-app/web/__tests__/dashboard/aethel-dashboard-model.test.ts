import { describe, expect, it } from 'vitest'

import {
  DASHBOARD_TABS,
  DASHBOARD_TAB_GROUPS,
  EXPLORE_TABS,
  MISSION_CONTROL_TABS,
  OPERATIONS_TABS,
} from '@/components/dashboard/aethel-dashboard-model'

describe('aethel dashboard model', () => {
  it('keeps mission control tabs focused before support and explore surfaces', () => {
    expect(MISSION_CONTROL_TABS).toEqual(['overview', 'projects', 'activity'])
    expect(OPERATIONS_TABS).toEqual(['billing', 'wallet', 'connectivity'])
    expect(EXPLORE_TABS).toEqual(['templates', 'content-creation', 'unreal'])
    expect(DASHBOARD_TABS).not.toContain('download')
    expect(DASHBOARD_TABS).not.toContain('agent-canvas')
    expect(DASHBOARD_TABS).not.toContain('use-cases')
    expect(DASHBOARD_TABS).not.toContain('admin')
  })

  it('keeps tab groups aligned with the full dashboard taxonomy', () => {
    const combined = [
      ...DASHBOARD_TAB_GROUPS.mission,
      'ai-chat',
      ...DASHBOARD_TAB_GROUPS.operations,
      ...DASHBOARD_TAB_GROUPS.explore,
    ]

    expect(combined).toEqual(DASHBOARD_TABS)
    expect(new Set(combined).size).toBe(combined.length)
  })
})
