import { describe, expect, it } from 'vitest'

import { buildDashboardProjectBrainSnapshot } from '@/components/dashboard/dashboard-project-brain'
import { buildDefaultAgenticProductionState, mergeAgenticProductionState } from '@/lib/production/agentic-production-state'

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

  it('surfaces durable production memory without expanding the dashboard into a heavy graph UI', () => {
    const productionState = mergeAgenticProductionState(
      buildDefaultAgenticProductionState({ projectName: 'Boss fight prototype', projectType: 'unreal' }),
      {
        graphs: {
          assetGraph: [{ id: 'assetGraph', label: 'Asset Graph', ownerAgent: 'Asset Librarian Agent', status: 'ready', evidenceRefs: ['license:boss-rig'], blockers: [], updatedAt: '2026-05-04T12:00:00.000Z' }],
          validationGraph: [{ id: 'validationGraph', label: 'Validation Graph', ownerAgent: 'QA Agent', status: 'ready', evidenceRefs: ['playtest:combo-loop'], blockers: [], updatedAt: '2026-05-04T12:00:00.000Z' }],
          evidenceGraph: [{ id: 'evidenceGraph', label: 'Evidence Graph', ownerAgent: 'Producer Agent', status: 'ready', evidenceRefs: ['clip:boss-fight'], blockers: [], updatedAt: '2026-05-04T12:00:00.000Z' }],
        },
      }
    )
    const snapshot = buildDashboardProjectBrainSnapshot({
      primaryProject: { id: 4, name: 'Boss fight prototype', type: 'unreal', status: 'active' },
      backendOnline: true,
      aiProviderConfigured: true,
      pendingApprovals: 0,
      walletReady: true,
      connectivityStatus: 'healthy',
      productionState,
      productionPersisted: true,
    })

    expect(snapshot.signals).toContainEqual({ label: 'Graphs', value: '3/7', status: 'ready' })
    expect(snapshot.continuity).toContainEqual({ label: 'Checkpoint', value: 'Durable', status: 'ready' })
    expect(snapshot.continuity).toContainEqual({ label: 'Evidence', value: '3 refs', status: 'ready' })
    expect(snapshot.summary).toContain('durable project memory')
  })
})
