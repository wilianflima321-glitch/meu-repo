import { describe, expect, it } from 'vitest'

import {
  buildRuntimeResilienceBudgetReport,
  validateRuntimeResilienceBudgetReport,
} from '@/lib/runtime/runtime-resilience-budget'

describe('runtime resilience budget', () => {
  it('models every critical surface with recovery evidence and bounded claims', () => {
    const report = buildRuntimeResilienceBudgetReport()

    expect(validateRuntimeResilienceBudgetReport(report)).toEqual([])
    expect(report.budgetCount).toBe(7)
    expect(report.heldOrBlockedBudgetCount).toBe(report.budgetCount)
    expect(report.budgets.map((budget) => budget.surfaceId)).toEqual(
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

  it('requires takeover for research and rollback for publishing', () => {
    const report = buildRuntimeResilienceBudgetReport()
    const research = report.budgets.find((budget) => budget.surfaceId === 'research-browser')
    const publish = report.budgets.find((budget) => budget.surfaceId === 'publish-export')

    expect(research?.requiredEvidence).toContain('takeover-control-receipt')
    expect(research?.recoveryModes).toContain('takeover-control')
    expect(publish?.requiredEvidence).toContain('rollback-receipt')
    expect(publish?.recoveryModes).toContain('rollback-last-change')
  })

  it('keeps cloud and Studio Local held without teardown/crash evidence', () => {
    const report = buildRuntimeResilienceBudgetReport({
      cloudTeardownReady: true,
      studioLocalCrashManifestReady: true,
      evidenceRefs: ['cost cap receipt', 'teardown receipt', 'rollback receipt', 'crash state receipt', 'retry policy receipt'],
    })
    const cloud = report.budgets.find((budget) => budget.surfaceId === 'cloud-render')
    const desktop = report.budgets.find((budget) => budget.surfaceId === 'studio-local')

    expect(cloud?.state).toBe('human_review_required')
    expect(desktop?.state).toBe('human_review_required')
    expect(cloud?.blockers).toContain('Human review receipt is missing.')
    expect(desktop?.blockers).toContain('Human review receipt is missing.')
  })
})
