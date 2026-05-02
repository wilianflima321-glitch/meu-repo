import { describe, expect, it } from 'vitest'

import { buildDashboardProjectBrainSnapshot } from '@/components/dashboard/dashboard-project-brain'

describe('dashboard project brain', () => {
  it('asks for a mission before exposing deep Studio work', () => {
    const snapshot = buildDashboardProjectBrainSnapshot({
      backendOnline: true,
      aiProviderConfigured: true,
      pendingApprovals: 0,
      walletReady: true,
      connectivityStatus: 'healthy',
    })

    expect(snapshot.title).toBe('No active mission')
    expect(snapshot.domain).toBe('Mission intake')
    expect(snapshot.riskStatus).toBe('attention')
    expect(snapshot.nextAction).toBe('Define the first mission')
    expect(snapshot.continuity).toContainEqual({ label: 'Checkpoint', value: 'After mission', status: 'attention' })
    expect(snapshot.continuity).toContainEqual({ label: 'Permission', value: 'Gated', status: 'ready' })
  })

  it('keeps runtime failures as blocking signals', () => {
    const snapshot = buildDashboardProjectBrainSnapshot({
      primaryProject: { id: 1, name: 'Launch site', type: 'web', status: 'active' },
      backendOnline: false,
      aiProviderConfigured: true,
      pendingApprovals: 0,
      walletReady: true,
      connectivityStatus: 'healthy',
    })

    expect(snapshot.riskStatus).toBe('blocked')
    expect(snapshot.riskLabel).toBe('Blocked')
    expect(snapshot.nextAction).toBe('Restore runtime')
    expect(snapshot.signals).toContainEqual({ label: 'Runtime', value: 'Blocked', status: 'blocked' })
  })

  it('routes ready missions toward the Studio cockpit', () => {
    const snapshot = buildDashboardProjectBrainSnapshot({
      primaryProject: { id: 2, name: 'AAA prototype', type: 'unreal', status: 'planning' },
      backendOnline: true,
      aiProviderConfigured: true,
      pendingApprovals: 0,
      walletReady: true,
      connectivityStatus: 'healthy',
    })

    expect(snapshot.domain).toBe('Game/film room')
    expect(snapshot.riskStatus).toBe('ready')
    expect(snapshot.nextAction).toBe('Expand Studio')
    expect(snapshot.continuity).toContainEqual({ label: 'Checkpoint', value: 'Ready', status: 'ready' })
  })

  it('surfaces a connected local runtime as part of mission continuity', () => {
    const snapshot = buildDashboardProjectBrainSnapshot({
      primaryProject: { id: 3, name: 'Studio sync', type: 'code', status: 'active' },
      backendOnline: true,
      aiProviderConfigured: true,
      pendingApprovals: 0,
      walletReady: true,
      connectivityStatus: 'healthy',
      localRuntime: {
        connection: 'connected',
        executorLabel: 'Local native',
      },
    })

    expect(snapshot.signals).toContainEqual({
      label: 'Runtime',
      value: 'Healthy / Local native',
      status: 'ready',
    })
    expect(snapshot.continuity).toContainEqual({
      label: 'Device',
      value: 'Local native',
      status: 'ready',
    })
    expect(snapshot.summary).toContain('local-native handoff')
  })
})
