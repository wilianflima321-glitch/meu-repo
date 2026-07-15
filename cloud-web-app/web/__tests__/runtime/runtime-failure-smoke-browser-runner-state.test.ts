import { describe, expect, it } from 'vitest'

import {
  RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_HISTORY_LIMIT,
  RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_SETTINGS_KEY,
  buildRuntimeFailureSmokeBrowserRunnerState,
  buildRuntimeFailureSmokeBrowserRunnerStateFromReport,
  readRuntimeFailureSmokeBrowserRunnerStateFromSettings,
  validateRuntimeFailureSmokeBrowserRunnerState,
  writeRuntimeFailureSmokeBrowserRunnerStateToSettings,
} from '@/lib/production/runtime-failure-smoke-browser-runner-state'
import {
  buildRuntimeFailureSmokeBrowserRunnerReport,
  type RuntimeFailureSmokeBrowserRunnerResult,
} from '@aethel/runtime/runtime-failure-smoke-runner-report'

function buildResult(
  overrides: Partial<RuntimeFailureSmokeBrowserRunnerResult> = {},
): RuntimeFailureSmokeBrowserRunnerResult {
  const id = overrides.id ?? 'ide-modern-shell-region-boundary'
  const smokeParam = id === 'ide-modern-shell-region-boundary' ? 'ide-region-crash-isolated' : 'preview-render-fallback'
  const receipt =
    overrides.receipt ??
    (id === 'ide-modern-shell-region-boundary'
      ? 'error boundary receipt:ide-editor-region'
      : 'error boundary receipt:preview-render-adapter')

  return {
    id,
    route: overrides.route ?? `/ide?aethelRuntimeFailureSmoke=${smokeParam}`,
    finalUrl: overrides.finalUrl ?? `http://127.0.0.1:3065/ide?aethelRuntimeFailureSmoke=${smokeParam}`,
    recoveredWithBoundary: overrides.recoveredWithBoundary ?? true,
    receipt,
    expectedReceipt: overrides.expectedReceipt ?? receipt,
    screenshot: overrides.screenshot ?? `output/playwright/v29-runtime-failure-smoke/${id}.png`,
    blockedClaims: overrides.blockedClaims ?? ['production ready', 'final render'],
    marketClaimAllowed: false,
    releaseReady: false,
    strictReceiptMatch: overrides.strictReceiptMatch ?? true,
    evidenceRefs: overrides.evidenceRefs ?? [],
    consoleErrors: overrides.consoleErrors ?? [],
    networkErrors: overrides.networkErrors ?? [],
  }
}

function buildReport(generatedAt = '2026-06-07T00:00:00.000Z') {
  return buildRuntimeFailureSmokeBrowserRunnerReport({
    baseUrl: 'http://127.0.0.1:3065',
    generatedAt,
    results: [
      buildResult(),
      buildResult({
        id: 'preview-canonical-fallback-surface',
      }),
    ],
  })
}

describe('runtime failure smoke browser runner state', () => {
  it('persists strict browser runner evidence as release-held project state', () => {
    const report = buildReport()
    const { state, validationErrors } = buildRuntimeFailureSmokeBrowserRunnerStateFromReport({
      projectId: 'project-runtime',
      report,
    })

    expect(validationErrors).toEqual([])
    expect(validateRuntimeFailureSmokeBrowserRunnerState(state)).toEqual([])
    expect(state.projectId).toBe('project-runtime')
    expect(state.summary.totalReports).toBe(1)
    expect(state.summary.totalHarnesses).toBe(2)
    expect(state.summary.strictReceiptMatchCount).toBe(2)
    expect(state.summary.releaseReady).toBe(false)
    expect(state.releasePolicy).toBe('human-review-required')
    expect(state.reports[0]?.evidenceRefs).toContain('runtime-failure-smoke-browser-runner:2026-06-07T00:00:00.000Z')
    expect(state.reports[0]?.screenshotRefs).toHaveLength(2)
  })

  it('round-trips through project settings without dropping existing settings', () => {
    const state = buildRuntimeFailureSmokeBrowserRunnerState({
      projectId: 'project-runtime',
      report: buildReport(),
    })
    const settings = writeRuntimeFailureSmokeBrowserRunnerStateToSettings({ theme: 'dark' }, state)

    expect(settings.theme).toBe('dark')
    expect(settings[RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_SETTINGS_KEY]).toBe(state)
    expect(readRuntimeFailureSmokeBrowserRunnerStateFromSettings(settings)).toEqual(state)
  })

  it('keeps only the bounded browser runner history', () => {
    let previous: ReturnType<typeof buildRuntimeFailureSmokeBrowserRunnerState> | null = null
    for (let i = 0; i < RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_HISTORY_LIMIT + 3; i += 1) {
      const generatedAt = new Date(Date.UTC(2026, 5, 7, 0, 0, i)).toISOString()
      previous = buildRuntimeFailureSmokeBrowserRunnerState({
        projectId: 'project-runtime',
        previous,
        report: buildReport(generatedAt),
      })
    }

    expect(previous.reports).toHaveLength(RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_HISTORY_LIMIT)
    expect(previous.summary.totalReports).toBe(RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER_HISTORY_LIMIT)
    expect(previous.summary.lastRunId).toBe('runtime-browser-smoke:2026-06-07T00:00:14.000Z')
  })

  it('rejects incomplete browser runner receipts', () => {
    const report = buildReport()
    const state = buildRuntimeFailureSmokeBrowserRunnerState({
      projectId: 'project-runtime',
      report,
    })
    state.reports[0]!.strictReceiptMatchCount = 1

    expect(validateRuntimeFailureSmokeBrowserRunnerState(state)).toContain(
      'runtime-browser-smoke:2026-06-07T00:00:00.000Z: strict receipt coverage is incomplete',
    )
  })
})
