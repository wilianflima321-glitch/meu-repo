import { describe, expect, it } from 'vitest'

import { buildDashboardMissionLedgerSnapshot } from '@/components/dashboard/dashboard-mission-ledger'
import { buildDefaultAgenticProductionState, mergeAgenticProductionState } from '@/lib/production/agentic-production-state'

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

  it('uses durable production state for graph coverage and persisted mission memory', () => {
    const baseState = buildDefaultAgenticProductionState({ projectName: 'Cinematic intro', projectType: 'unreal' })
    const productionState = mergeAgenticProductionState(baseState, {
      ledger: [
        {
          ...baseState.ledger[0],
          id: 'shot-review',
          state: 'needs-approval',
          evidenceRefs: ['render:shot-001'],
          nextAction: 'Approve continuity render',
        },
      ],
      graphs: {
        assetGraph: [{ ...baseState.graphs.assetGraph[0], status: 'ready', evidenceRefs: ['license:hero'] }],
        shotFilmGraph: [{ ...baseState.graphs.shotFilmGraph[0], status: 'ready', evidenceRefs: ['storyboard:shot-001'] }],
        validationGraph: [{ ...baseState.graphs.validationGraph[0], status: 'ready', evidenceRefs: ['continuity:shot-001'] }],
      },
    })

    const snapshot = buildDashboardMissionLedgerSnapshot({
      primaryProject: { id: 12, name: 'Cinematic intro', type: 'unreal', status: 'active' },
      backendOnline: true,
      aiProviderConfigured: true,
      pendingApprovals: 0,
      walletReady: true,
      connectivityStatus: 'healthy',
      productionState,
      productionPersisted: true,
    })

    expect(snapshot.state).toBe('needs_approval')
    expect(snapshot.summary).toContain('persists state')
    expect(snapshot.checks).toContainEqual({ label: 'Graphs', ready: true })
    expect(snapshot.evidence).toContainEqual({ label: 'Memory', value: 'Durable', ready: true })
    expect(snapshot.evidence).toContainEqual({ label: 'Production', value: '43% graphs / 3 refs', ready: true })
  })
})
