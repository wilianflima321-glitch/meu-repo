import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { filterChangeRunLedgerBySample, readChangeRunLedgerEvents } from '@/lib/server/change-run-ledger'
import { computeCoreLoopReadiness, type CoreLoopThresholds } from '@/lib/server/core-loop-readiness'
import {
  buildCoreLoopTrend,
  buildCoreLoopRecommendations,
  buildExecutionModeCounts,
  buildFeedbackCounts,
  buildImpactedEndpointCounts,
  buildReasonPlaybook,
  buildReasonCounts,
  buildRiskCounts,
  topEntries,
} from '@/lib/server/core-loop-learning'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'ADMIN_AI_CORE_LOOP_METRICS'
const WINDOW_HOURS = [24, 24 * 7, 24 * 30]
const THRESHOLDS: CoreLoopThresholds = {
  minSample: 20,
  successRate: 0.9,
  regressionRateMax: 0.05,
  sandboxCoverage: 0.5,
}

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
      const events = await readChangeRunLedgerEvents({ sinceIso, limit: 5000 })
      const reportAll = computeCoreLoopReadiness({
        events,
        thresholds: THRESHOLDS,
        providerConfigured,
        runGroupLimit: 200,
        sampleClass: 'all',
      })
      const report = computeCoreLoopReadiness({
        events,
        thresholds: THRESHOLDS,
        providerConfigured,
        runGroupLimit: 200,
        sampleClass: 'production',
      })
      const rehearsalReport = computeCoreLoopReadiness({
        events,
        thresholds: THRESHOLDS,
        providerConfigured,
        runGroupLimit: 200,
        sampleClass: 'rehearsal',
      })

      const productionEvents = filterChangeRunLedgerBySample(events, 'production')
      const reasonCounts = buildReasonCounts(productionEvents)
      const feedbackCounts = buildFeedbackCounts(productionEvents)
      const executionModeCounts = buildExecutionModeCounts(productionEvents)
      const riskCounts = buildRiskCounts(productionEvents)
      const impactedEndpointCounts = buildImpactedEndpointCounts(productionEvents)
      const recommendations = buildCoreLoopRecommendations({
        metrics: report.metrics,
        thresholds: THRESHOLDS,
        providerConfigured,
        reasonCounts,
        feedbackCounts,
      })
      const lastEventAt = events.length > 0 ? events[0].timestamp : null

      return {
        hours,
        sinceIso,
        metrics: report.metrics,
        metricsAll: reportAll.metrics,
        rehearsalMetrics: rehearsalReport.metrics,
        rollup: report.rollup,
        rollupAll: reportAll.rollup,
        reasonCounts,
        feedbackCounts,
        allReasonCounts: buildReasonCounts(events),
        allFeedbackCounts: buildFeedbackCounts(events),
        executionModeCounts,
        riskCounts,
        impactedEndpointCounts: topEntries(impactedEndpointCounts, 8),
        recommendations,
        lastEventAt,
      }
    })
  )

  const latest = windows[1] ?? windows[0]
  const trend = latest
    ? buildCoreLoopTrend({
        latest: latest.metrics,
        baseline: windows[2]?.metrics,
      })
    : null
  const reasonPlaybook = latest ? buildReasonPlaybook(latest.reasonCounts, 6) : []

  return NextResponse.json(
    {
      success: true,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      message: 'Core-loop metrics loaded.',
      samplePolicy: 'production_only_for_promotion',
      thresholds: THRESHOLDS,
      providerConfigured,
      latest,
      trend,
      reasonPlaybook,
      windows,
      updatedAt: now.toISOString(),
    },
    {
      headers: {
        'x-aethel-capability': CAPABILITY,
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:agents:view')
