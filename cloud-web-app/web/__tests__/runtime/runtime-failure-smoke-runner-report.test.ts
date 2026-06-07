import { describe, expect, it } from 'vitest'

import {
  buildRuntimeFailureSmokeBrowserRunnerReport,
  validateRuntimeFailureSmokeBrowserRunnerReport,
  type RuntimeFailureSmokeBrowserRunnerResult,
} from '@/lib/runtime/runtime-failure-smoke-runner-report'

function buildResult(
  overrides: Partial<RuntimeFailureSmokeBrowserRunnerResult> = {},
): RuntimeFailureSmokeBrowserRunnerResult {
  const id = overrides.id ?? 'ide-modern-shell-region-boundary'
  const receipt = overrides.receipt ?? 'error boundary receipt:ide-editor-region'
  const expectedReceipt = overrides.expectedReceipt ?? receipt
  return {
    id,
    route: overrides.route ?? `/ide?aethelRuntimeFailureSmoke=${id === 'ide-modern-shell-region-boundary' ? 'ide-region-crash-isolated' : 'preview-render-fallback'}`,
    finalUrl: overrides.finalUrl ?? 'http://127.0.0.1:3065/ide?aethelRuntimeFailureSmoke=ide-region-crash-isolated',
    recoveredWithBoundary: overrides.recoveredWithBoundary ?? true,
    receipt,
    expectedReceipt,
    screenshot: overrides.screenshot ?? `output/playwright/v29-runtime-failure-smoke/${id}.png`,
    blockedClaims: overrides.blockedClaims ?? ['production ready', 'final render'],
    marketClaimAllowed: false,
    releaseReady: false,
    strictReceiptMatch: overrides.strictReceiptMatch ?? receipt === expectedReceipt,
    evidenceRefs: overrides.evidenceRefs ?? [],
    consoleErrors: overrides.consoleErrors ?? [],
    networkErrors: overrides.networkErrors ?? [],
  }
}

describe('runtime failure smoke browser runner report', () => {
  it('builds a strict report with screenshot and receipt evidence refs', () => {
    const report = buildRuntimeFailureSmokeBrowserRunnerReport({
      baseUrl: 'http://127.0.0.1:3065',
      results: [
        buildResult(),
        buildResult({
          id: 'preview-canonical-fallback-surface',
          receipt: 'error boundary receipt:preview-render-adapter',
          expectedReceipt: 'error boundary receipt:preview-render-adapter',
        }),
      ],
      generatedAt: '2026-06-07T00:00:00.000Z',
    })

    expect(validateRuntimeFailureSmokeBrowserRunnerReport(report)).toEqual([])
    expect(report.capability).toBe('AETHEL_RUNTIME_FAILURE_SMOKE_BROWSER_RUNNER')
    expect(report.strictReceiptMatchCount).toBe(2)
    expect(report.marketClaimAllowed).toBe(false)
    expect(report.releaseReady).toBe(false)
    expect(report.evidenceRefs).toContain('runtime-failure-smoke-browser:ide-modern-shell-region-boundary')
    expect(report.evidenceRefs.some((ref) => ref.startsWith('runtime-failure-smoke-browser-screenshot:'))).toBe(true)
  })

  it('rejects mismatched receipts and fake release readiness', () => {
    const report = buildRuntimeFailureSmokeBrowserRunnerReport({
      baseUrl: 'http://127.0.0.1:3065',
      results: [
        buildResult({ receipt: 'error boundary receipt:wrong', expectedReceipt: 'error boundary receipt:ide-editor-region' }),
        buildResult({
          id: 'preview-canonical-fallback-surface',
          receipt: 'error boundary receipt:preview-render-adapter',
          expectedReceipt: 'error boundary receipt:preview-render-adapter',
        }),
      ],
    })

    expect(validateRuntimeFailureSmokeBrowserRunnerReport(report)).toContain(
      'ide-modern-shell-region-boundary: receipt mismatch expected=error boundary receipt:ide-editor-region actual=error boundary receipt:wrong',
    )
  })
})
