import {
  filterChangeRunLedgerBySample,
  summarizeChangeRunGroups,
  summarizeChangeRunLedger,
  type ChangeRunLedgerRow,
  type ChangeRunSampleClass,
} from '@/lib/server/change-run-ledger'

export type CoreLoopThresholds = {
  minSample: number
  successRate: number
  regressionRateMax: number
  sandboxCoverage: number
  feedbackCoverageMin: number
}

export type CoreLoopWindowReport = {
  sampleClass: ChangeRunSampleClass | 'all'
  sampleSize: number
  applySuccessRate: number
  regressionRate: number
  blockedRate: number
  sandboxCoverage: number
  learnFeedbackCoverage: number
  workspaceCoverage: number
  reviewedApplyRuns: number
  unreviewedApplyRuns: number
  workspaceApplyRuns: number
  sandboxApplyRuns: number
  successfulApplyRuns: number
  failedApplyRuns: number
  blockedApplyRuns: number
  promotionEligible: boolean
  blockers: string[]
}

export type CoreLoopReadinessReport = {
  thresholds: CoreLoopThresholds
  providerConfigured: boolean
  rollup: ReturnType<typeof summarizeChangeRunLedger>
  runGroups: ReturnType<typeof summarizeChangeRunGroups>
  metrics: CoreLoopWindowReport
}

export function computeCoreLoopReadiness(params: {
  events: ChangeRunLedgerRow[]
  thresholds: CoreLoopThresholds
  providerConfigured: boolean
  runGroupLimit?: number
  sampleClass?: ChangeRunSampleClass | 'all'
}): CoreLoopReadinessReport {
  const sampleClass = params.sampleClass ?? 'all'
  const scopedEvents = filterChangeRunLedgerBySample(params.events, sampleClass)
  const runGroups = summarizeChangeRunGroups(scopedEvents, params.runGroupLimit ?? 200)
  const applyRuns = runGroups.filter((group) => group.applyCount > 0)
  const totalApplyRuns = applyRuns.length
  const successfulApplyRuns = applyRuns.filter((group) => group.finalOutcome === 'success').length
  const failedApplyRuns = applyRuns.filter((group) => group.finalOutcome === 'failed').length
  const blockedApplyRuns = applyRuns.filter((group) => group.finalOutcome === 'blocked').length
  const sandboxApplyRuns = applyRuns.filter((group) => group.executionModes.includes('sandbox')).length
  const workspaceApplyRuns = applyRuns.filter((group) => group.executionModes.includes('workspace')).length
  const reviewedApplyRuns = applyRuns.filter((group) => group.learnFeedbackCount > 0).length
  const unreviewedApplyRuns = Math.max(0, totalApplyRuns - reviewedApplyRuns)

  const applySuccessRate = totalApplyRuns > 0 ? successfulApplyRuns / totalApplyRuns : 0
  const regressionRate = totalApplyRuns > 0 ? failedApplyRuns / totalApplyRuns : 0
  const blockedRate = totalApplyRuns > 0 ? blockedApplyRuns / totalApplyRuns : 0
  const sandboxCoverage = totalApplyRuns > 0 ? sandboxApplyRuns / totalApplyRuns : 0
  const learnFeedbackCoverage = totalApplyRuns > 0 ? reviewedApplyRuns / totalApplyRuns : 0
  const workspaceCoverage = totalApplyRuns > 0 ? workspaceApplyRuns / totalApplyRuns : 0

  const blockers: string[] = []
  if (!params.providerConfigured) blockers.push('AI provider not configured')
  if (totalApplyRuns < params.thresholds.minSample) blockers.push('Insufficient sample size')
  if (applySuccessRate < params.thresholds.successRate) blockers.push('Apply success rate below threshold')
  if (regressionRate > params.thresholds.regressionRateMax) blockers.push('Regression rate above threshold')
  if (sandboxCoverage < params.thresholds.sandboxCoverage) blockers.push('Sandbox coverage below threshold')
  if (totalApplyRuns >= Math.min(10, params.thresholds.minSample) && learnFeedbackCoverage < params.thresholds.feedbackCoverageMin) {
    blockers.push('Learn feedback coverage below threshold')
  }

  return {
    thresholds: params.thresholds,
    providerConfigured: params.providerConfigured,
    rollup: summarizeChangeRunLedger(scopedEvents),
    runGroups,
    metrics: {
      sampleClass,
      sampleSize: totalApplyRuns,
      applySuccessRate,
      regressionRate,
      blockedRate,
      sandboxCoverage,
      learnFeedbackCoverage,
      workspaceCoverage,
      reviewedApplyRuns,
      unreviewedApplyRuns,
      workspaceApplyRuns,
      sandboxApplyRuns,
      successfulApplyRuns,
      failedApplyRuns,
      blockedApplyRuns,
      promotionEligible: blockers.length === 0,
      blockers,
    },
  }
}
