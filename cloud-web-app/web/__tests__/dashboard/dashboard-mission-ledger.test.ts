import { describe, expect, it } from 'vitest'

import { buildDashboardMissionLedgerSnapshot } from '@/components/dashboard/dashboard-mission-ledger'

describe('dashboard mission ledger', () => {
  it('starts as planned until a concrete mission exists', () => {
    const snapshot = buildDashboardMissionLedgerSnapshot({
      backendOnline: true,
      aiProviderConfigured: true,
      pendingApprovals: 0,
      walletReady: true,
      connectivityStatus: 'healthy',
    })

    expect(snapshot.state).toBe('planned')
    expect(snapshot.nextAction).toBe('Define mission')
    expect(snapshot.checks).toContainEqual({ label: 'Goal', ready: false })
  })

  it('blocks execution when runtime is offline', () => {
    const snapshot = buildDashboardMissionLedgerSnapshot({
      primaryProject: { id: 10, name: 'Launch storefront', type: 'web', status: 'active' },
      backendOnline: false,
      aiProviderConfigured: true,
      pendingApprovals: 0,
      walletReady: true,
      connectivityStatus: 'degraded',
    })

    expect(snapshot.state).toBe('blocked')
    expect(snapshot.nextAction).toBe('Restore runtime')
    expect(snapshot.evidence).toContainEqual({ label: 'Preview', value: 'Blocked', ready: false })
  })

  it('keeps approval work explicit before continuing execution', () => {
    const snapshot = buildDashboardMissionLedgerSnapshot({
      primaryProject: { id: 11, name: 'AAA combat prototype', type: 'unreal', status: 'planning' },
      backendOnline: true,
      aiProviderConfigured: true,
      pendingApprovals: 2,
      walletReady: true,
      connectivityStatus: 'healthy',
    })

    expect(snapshot.state).toBe('needs_approval')
    expect(snapshot.nextAction).toBe('Review approval')
    expect(snapshot.checks).toContainEqual({ label: 'Approval', ready: false })
  })
})
