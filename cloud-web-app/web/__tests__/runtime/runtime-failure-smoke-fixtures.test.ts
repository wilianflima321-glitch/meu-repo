import { describe, expect, it } from 'vitest'

import {
  buildRuntimeFailureSmokeFixtureReport,
  validateRuntimeFailureSmokeFixtureReport,
} from '@/lib/runtime/runtime-failure-smoke-fixtures'
import { buildRuntimeFailureSmokePackReport } from '@/lib/runtime/runtime-failure-smoke-pack'

describe('runtime failure smoke fixtures', () => {
  it('provides replayable evidence refs for every smoke scenario', () => {
    const fixtureReport = buildRuntimeFailureSmokeFixtureReport()

    expect(validateRuntimeFailureSmokeFixtureReport(fixtureReport)).toEqual([])
    expect(fixtureReport.fixtureCount).toBe(7)
    expect(fixtureReport.replayableCount).toBe(7)
    expect(fixtureReport.persistableCount).toBe(7)
  })

  it('can drive smoke packs with fixture evidence overrides', () => {
    const fixtureReport = buildRuntimeFailureSmokeFixtureReport()
    const pack = buildRuntimeFailureSmokePackReport({
      runPrefix: 'fixture-driven',
      evidenceOverrides: fixtureReport.evidenceOverrideMap,
    })

    expect(pack.scenarioCount).toBe(7)
    expect(pack.scenarios.find((scenario) => scenario.id === 'cloud-render-teardown')?.outcome).toBe('recovered-with-receipts')
    expect(pack.scenarios.find((scenario) => scenario.id === 'research-browser-takeover')?.ledger.summary.blockedClaims).toContain('research verified')
  })
})
