import { describe, expect, it } from 'vitest'

import {
  buildDefaultAgenticProductionState,
  enforceProductionReleaseGuard,
  buildProductionReadinessSummary,
  mergeAgenticProductionState,
  PRODUCTION_STATE_SETTINGS_KEY,
  readAgenticProductionStateFromSettings,
  writeAgenticProductionStateToSettings,
} from '@/lib/production/agentic-production-state'

describe('agentic production state', () => {
  it('stores durable Project Brain and Mission Ledger state inside project settings', () => {
    const state = buildDefaultAgenticProductionState({
      projectName: 'Combat vertical slice',
      projectType: 'unreal',
      now: '2026-05-04T12:00:00.000Z',
    })
    const settings = writeAgenticProductionStateToSettings({ theme: 'dark' }, state)
    const restored = readAgenticProductionStateFromSettings(settings)

    expect(settings[PRODUCTION_STATE_SETTINGS_KEY]).toBeTruthy()
    expect(restored?.brain.domain).toBe('game-film')
    expect(restored?.brain.objective).toContain('Combat vertical slice')
    expect(restored?.ledger[0]).toMatchObject({
      phase: 'Mission intake',
      ownerAgent: 'Producer Agent',
      state: 'running',
    })
    expect(restored?.graphs.assetGraph[0].ownerAgent).toBe('Asset Librarian Agent')
  })

  it('summarizes graph coverage, evidence, blockers, and human approval', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Film trailer' })
    const patched = mergeAgenticProductionState(
      state,
      {
        graphs: {
          assetGraph: [
            {
              ...state.graphs.assetGraph[0],
              status: 'ready',
              evidenceRefs: ['asset-license:hero-rig'],
            },
          ],
          validationGraph: [
            {
              ...state.graphs.validationGraph[0],
              status: 'ready',
              evidenceRefs: ['render-check:shot-001'],
            },
          ],
          evidenceGraph: [
            {
              ...state.graphs.evidenceGraph[0],
              status: 'blocked',
              blockers: ['Missing continuity screenshot'],
            },
          ],
        },
      },
      '2026-05-04T13:00:00.000Z'
    )
    const readiness = buildProductionReadinessSummary(patched)

    expect(readiness.ready).toBe(false)
    expect(readiness.readyGraphCount).toBe(2)
    expect(readiness.evidenceCount).toBe(2)
    expect(readiness.blockedCount).toBe(1)
    expect(readiness.needsHumanApproval).toBe(true)
    expect(readiness.nextAction).toBe('Complete production graphs')
  })


  it('guards release readiness from patches that lack human approval evidence', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Universal release gate' })
    const readyGraphs = Object.fromEntries(
      Object.entries(state.graphs).map(([key, nodes]) => [
        key,
        [
          {
            ...nodes[0],
            status: 'ready',
            evidenceRefs: [`${key}:validated`],
            blockers: [],
          },
        ],
      ])
    )

    const patched = mergeAgenticProductionState(
      state,
      {
        graphs: readyGraphs as typeof state.graphs,
        runtimePolicy: {
          requiresHumanApproval: false,
        },
      },
      '2026-05-25T13:00:00.000Z'
    )
    const guarded = enforceProductionReleaseGuard(patched)
    const readiness = buildProductionReadinessSummary(patched)

    expect(guarded.runtimePolicy.requiresHumanApproval).toBe(true)
    expect(guarded.graphs.releaseGraph[0]).toMatchObject({ status: 'needs-review' })
    expect(guarded.graphs.releaseGraph[0].blockers).toContain(
      'Human release approval evidence is required before release can be marked ready.'
    )
    expect(readiness.ready).toBe(false)
    expect(readiness.needsHumanApproval).toBe(true)
    expect(readiness.nextAction).not.toBe('Prepare release evidence')
  })

  it('allows release readiness only with explicit human approval evidence', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'Approved cinematic app launch' })
    const readyGraphs = Object.fromEntries(
      Object.entries(state.graphs).map(([key, nodes]) => [
        key,
        [
          {
            ...nodes[0],
            status: 'ready',
            evidenceRefs: key === 'releaseGraph' ? ['human approval:release-manager:42'] : [`${key}:validated`],
            blockers: [],
          },
        ],
      ])
    )

    const patched = mergeAgenticProductionState(
      state,
      {
        graphs: readyGraphs as typeof state.graphs,
        runtimePolicy: {
          requiresHumanApproval: false,
        },
      },
      '2026-05-25T14:00:00.000Z'
    )
    const readiness = buildProductionReadinessSummary(patched)

    expect(patched.runtimePolicy.requiresHumanApproval).toBe(false)
    expect(patched.graphs.releaseGraph[0].status).toBe('ready')
    expect(readiness.ready).toBe(true)
    expect(readiness.needsHumanApproval).toBe(false)
  })

  it('merges brain, runtime policy, and ledger patches without dropping existing graphs', () => {
    const state = buildDefaultAgenticProductionState({ projectName: 'SaaS launch' })
    const patched = mergeAgenticProductionState(state, {
      brain: {
        objective: 'Ship a Firebase-style onboarding flow with deploy evidence.',
        creativeBible: {
          ...state.brain.creativeBible,
          style: 'Low-noise mission cockpit',
        },
      },
      ledger: [
        {
          ...state.ledger[0],
          id: 'deploy-review',
          state: 'needs-approval',
          evidenceRefs: ['preview:https://example.test'],
          nextAction: 'Approve deploy preview',
        },
      ],
      runtimePolicy: {
        preferredTarget: 'local-native',
        localAcceleration: 'prefer-npu',
        maxConcurrentHeavyJobs: 2,
      },
    })

    expect(patched.brain.objective).toContain('Firebase-style')
    expect(patched.brain.creativeBible.style).toBe('Low-noise mission cockpit')
    expect(patched.graphs.releaseGraph[0].label).toBe('Release Graph')
    expect(patched.ledger[0].state).toBe('needs-approval')
    expect(patched.runtimePolicy.preferredTarget).toBe('local-native')
    expect(patched.runtimePolicy.localAcceleration).toBe('prefer-npu')
    expect(patched.runtimePolicy.maxConcurrentHeavyJobs).toBe(2)
  })
})
