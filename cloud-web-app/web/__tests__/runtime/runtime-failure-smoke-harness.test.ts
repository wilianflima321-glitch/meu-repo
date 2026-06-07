import { describe, expect, it } from 'vitest'

import {
  buildRuntimeFailureSmokeHarnessReport,
  validateRuntimeFailureSmokeHarnessReport,
} from '@/lib/runtime/runtime-failure-smoke-harness'

describe('runtime failure smoke harness', () => {
  it('declares canonical IDE and preview harness contracts without market claims', () => {
    const report = buildRuntimeFailureSmokeHarnessReport()

    expect(validateRuntimeFailureSmokeHarnessReport(report)).toEqual([])
    expect(report.capability).toBe('AETHEL_RUNTIME_FAILURE_SMOKE_HARNESS')
    expect(report.harnessCount).toBe(2)
    expect(report.contractReadyCount).toBe(2)
    expect(report.runnerReadyCount).toBe(2)
    expect(report.needsRunnerCount).toBe(0)
    expect(report.runnerCommand).toBe('npm run runtime:v29-failure-smoke')
    expect(report.marketClaimAllowed).toBe(false)
    expect(report.manualRunnerRequired).toBe(true)
  })

  it('maps ModernIDEShell and CanonicalPreviewSurface to replayable smoke fixtures', () => {
    const report = buildRuntimeFailureSmokeHarnessReport()
    const ideHarness = report.harnesses.find((harness) => harness.id === 'ide-modern-shell-region-boundary')
    const previewHarness = report.harnesses.find((harness) => harness.id === 'preview-canonical-fallback-surface')

    expect(ideHarness?.canonicalEntrypoint).toBe('components/ide/ModernIDEShell.tsx')
    expect(ideHarness?.generatedEvidenceRefs).toContain('error boundary receipt:ide-editor-region')
    expect(ideHarness?.generatedEvidenceRefs).toContain('crash state receipt:ide-region-isolated')
    expect(ideHarness?.blockedClaims).toContain('production ready')

    expect(previewHarness?.canonicalEntrypoint).toBe('components/preview/CanonicalPreviewSurface.tsx')
    expect(previewHarness?.generatedEvidenceRefs).toContain('error boundary receipt:preview-render-adapter')
    expect(previewHarness?.generatedEvidenceRefs).toContain('performance trace receipt:preview-fallback-frame-budget')
    expect(previewHarness?.blockedClaims).toContain('final render')
  })
})
