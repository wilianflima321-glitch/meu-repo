import { describe, expect, it } from 'vitest'

import {
  buildRuntimeFailureSmokePackState,
  readRuntimeFailureSmokePackStateFromSettings,
  validateRuntimeFailureSmokePackState,
  writeRuntimeFailureSmokePackStateToSettings,
} from '@/lib/production/runtime-failure-smoke-pack-state'
import { buildRuntimeFailureSmokePackReport } from '@aethel/runtime/runtime-failure-smoke-pack'

describe('runtime failure smoke pack state', () => {
  it('persists a bounded smoke pack summary with release held', () => {
    const report = buildRuntimeFailureSmokePackReport({ runPrefix: 'project-smoke' })
    const state = buildRuntimeFailureSmokePackState({ projectId: 'project-1', report })

    expect(validateRuntimeFailureSmokePackState(state)).toEqual([])
    expect(state.summary.totalPacks).toBe(1)
    expect(state.summary.releaseReady).toBe(false)
    expect(state.packs[0]?.marketClaimAllowed).toBe(false)
    expect(state.packs[0]?.evidenceRefs.length).toBeGreaterThan(0)
  })

  it('round-trips through project settings', () => {
    const report = buildRuntimeFailureSmokePackReport({ runPrefix: 'round-trip' })
    const state = buildRuntimeFailureSmokePackState({ projectId: 'project-2', report })
    const settings = writeRuntimeFailureSmokePackStateToSettings({ existing: true }, state)
    const restored = readRuntimeFailureSmokePackStateFromSettings(settings)

    expect(restored?.projectId).toBe('project-2')
    expect(restored?.summary.releaseReady).toBe(false)
    expect(restored?.releasePolicy).toBe('human-review-required')
  })

  it('keeps only the latest bounded smoke histories', () => {
    let state = null
    for (let index = 0; index < 16; index += 1) {
      state = buildRuntimeFailureSmokePackState({
        projectId: 'project-3',
        previous: state,
        report: buildRuntimeFailureSmokePackReport({ runPrefix: `run-${index}` }),
      })
    }

    expect(state?.packs.length).toBe(12)
    expect(validateRuntimeFailureSmokePackState(state!)).toEqual([])
  })
})
