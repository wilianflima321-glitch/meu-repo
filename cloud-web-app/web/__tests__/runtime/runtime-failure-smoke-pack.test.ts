import { describe, expect, it } from 'vitest'

import {
  buildRuntimeFailureSmokePackReport,
  validateRuntimeFailureSmokePackReport,
} from '@/lib/runtime/runtime-failure-smoke-pack'

describe('runtime failure smoke pack', () => {
  it('models governed failure and recovery scenarios for every critical runtime lane', () => {
    const report = buildRuntimeFailureSmokePackReport({ runPrefix: 'test-smoke' })

    expect(validateRuntimeFailureSmokePackReport(report)).toEqual([])
    expect(report.scenarioCount).toBe(7)
    expect(report.marketClaimAllowed).toBe(false)
    expect(report.scenarios.map((scenario) => scenario.surfaceId)).toEqual(
      expect.arrayContaining([
        'ide-shell',
        'preview-viewport',
        'agent-runtime',
        'research-browser',
        'studio-local',
        'cloud-render',
        'publish-export',
      ]),
    )
  })

  it('keeps takeover and desktop crash scenarios as governed failures', () => {
    const report = buildRuntimeFailureSmokePackReport()
    const research = report.scenarios.find((scenario) => scenario.id === 'research-browser-takeover')
    const desktop = report.scenarios.find((scenario) => scenario.id === 'studio-local-crash-loop')

    expect(research?.outcome).toBe('governed-failure')
    expect(research?.ledger.summary.blockedClaims).toContain('research verified')
    expect(desktop?.outcome).toBe('governed-failure')
    expect(desktop?.ledger.summary.blockedClaims).toContain('desktop ready')
  })

  it('supports receipt-backed recovery without allowing market claims', () => {
    const report = buildRuntimeFailureSmokePackReport()
    const preview = report.scenarios.find((scenario) => scenario.id === 'preview-render-fallback')
    const agent = report.scenarios.find((scenario) => scenario.id === 'agent-tool-retry-held')

    expect(preview?.outcome).toBe('recovered-with-receipts')
    expect(agent?.outcome).toBe('recovered-with-receipts')
    expect(preview?.marketClaimAllowed).toBe(false)
    expect(agent?.marketClaimAllowed).toBe(false)
  })
})
