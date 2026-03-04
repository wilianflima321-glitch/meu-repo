import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import {
  filterChangeRunLedgerBySample,
  readChangeRunLedgerEvents,
} from '@/lib/server/change-run-ledger'
import { computeCoreLoopReadiness, type CoreLoopThresholds } from '@/lib/server/core-loop-readiness'
import {
  buildCoreLoopRecommendations,
  buildCoreLoopTrend,
  buildReasonCounts,
  buildReasonPlaybook,
  topEntries,
} from '@/lib/server/core-loop-learning'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'AI_CORE_LOOP_READINESS'
const L4_MIN_SAMPLE = 20
const L4_SUCCESS_RATE_TARGET = 0.9
const L4_REGRESSION_RATE_MAX = 0.05
const L4_SANDBOX_COVERAGE_TARGET = 0.5

const THRESHOLDS: CoreLoopThresholds = {
  minSample: L4_MIN_SAMPLE,
  successRate: L4_SUCCESS_RATE_TARGET,
  regressionRateMax: L4_REGRESSION_RATE_MAX,
  sandboxCoverage: L4_SANDBOX_COVERAGE_TARGET,
}

const WINDOW_HOURS = [24, 24 * 7, 24 * 30]

export const GET = withAdminAuth(async () => {
  const now = new Date()

  const providerConfigured = Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GROQ_API_KEY
  )
  const windows = await Promise.all(
    WINDOW_HOURS.map(async (hours) => {
      const sinceIso = new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString()
      const events = await readChangeRunLedgerEvents({
        sinceIso,
        limit: 5000,
      })
      const reportAll = computeCoreLoopReadiness({
        events,
        thresholds: THRESHOLDS,
        providerConfigured,
        runGroupLimit: 200,
        sampleClass: 'all',
      })
      const reportProduction = computeCoreLoopReadiness({
        events,
        thresholds: THRESHOLDS,
        providerConfigured,
        runGroupLimit: 200,
        sampleClass: 'production',
      })
      const reportRehearsal = computeCoreLoopReadiness({
        events,
        thresholds: THRESHOLDS,
        providerConfigured,
        runGroupLimit: 200,
        sampleClass: 'rehearsal',
      })
      return {
        hours,
        sinceIso,
        events,
        reportAll,
        reportProduction,
        reportRehearsal,
      }
    })
  )

  const primaryWindow = windows[1] ?? windows[0]
  const productionEvents = filterChangeRunLedgerBySample(primaryWindow.events, 'production')
  const reasonCounts = buildReasonCounts(productionEvents)
  const trend =
    primaryWindow && windows[2]
      ? buildCoreLoopTrend({
          latest: primaryWindow.reportProduction.metrics,
          baseline: windows[2].reportProduction.metrics,
        })
      : null
  const recommendations = primaryWindow
    ? buildCoreLoopRecommendations({
        metrics: primaryWindow.reportProduction.metrics,
        thresholds: THRESHOLDS,
        providerConfigured: primaryWindow.reportProduction.providerConfigured,
        reasonCounts,
      })
    : []

  return NextResponse.json(
    {
      success: true,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      message:
        'Core-loop readiness is measured from deterministic run-ledger evidence. Promotion is blocked until thresholds are met.',
      samplePolicy: 'production_only_for_promotion',
      thresholds: THRESHOLDS,
      metrics: {
        providerConfigured: primaryWindow.reportProduction.providerConfigured,
        sampleSize: primaryWindow.reportProduction.metrics.sampleSize,
        applySuccessRate: primaryWindow.reportProduction.metrics.applySuccessRate,
        regressionRate: primaryWindow.reportProduction.metrics.regressionRate,
        blockedRate: primaryWindow.reportProduction.metrics.blockedRate,
        sandboxCoverage: primaryWindow.reportProduction.metrics.sandboxCoverage,
        workspaceCoverage: primaryWindow.reportProduction.metrics.workspaceCoverage,
        workspaceApplyRuns: primaryWindow.reportProduction.metrics.workspaceApplyRuns,
        sandboxApplyRuns: primaryWindow.reportProduction.metrics.sandboxApplyRuns,
        successfulApplyRuns: primaryWindow.reportProduction.metrics.successfulApplyRuns,
        failedApplyRuns: primaryWindow.reportProduction.metrics.failedApplyRuns,
        blockedApplyRuns: primaryWindow.reportProduction.metrics.blockedApplyRuns,
      },
      metricsAll: primaryWindow.reportAll.metrics,
      rehearsalMetrics: primaryWindow.reportRehearsal.metrics,
      blockers: primaryWindow.reportProduction.metrics.blockers,
      trend,
      reasonCounts: topEntries(reasonCounts, 8),
      reasonPlaybook: buildReasonPlaybook(reasonCounts, 6),
      recommendations,
      rollup: primaryWindow.reportProduction.rollup,
      rollupAll: primaryWindow.reportAll.rollup,
      runGroups: primaryWindow.reportProduction.runGroups.filter((group) => group.applyCount > 0).slice(0, 50),
      rehearsalRunGroups: primaryWindow.reportRehearsal.runGroups
        .filter((group) => group.applyCount > 0)
        .slice(0, 50),
      promotionEligible: primaryWindow.reportProduction.metrics.promotionEligible,
      windows: windows.map((window) => ({
        hours: window.hours,
        sinceIso: window.sinceIso,
        metrics: window.reportProduction.metrics,
        metricsAll: window.reportAll.metrics,
        rehearsalMetrics: window.reportRehearsal.metrics,
      })),
      updatedAt: now.toISOString(),
      sinceIso: primaryWindow.sinceIso,
    },
    {
      headers: {
        'x-aethel-capability': CAPABILITY,
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:agents:view')
