import { NextRequest } from 'next/server'
import { requireAuth } from '@/lib/auth-server'
import { requireEntitlementsForUser } from '@/lib/entitlements'
import { capabilityResponse } from '@/lib/server/capability-response'
import { filterChangeRunLedgerBySample, readChangeRunLedgerEvents } from '@/lib/server/change-run-ledger'
import { computeCoreLoopReadiness, type CoreLoopThresholds } from '@/lib/server/core-loop-readiness'
import {
  buildCoreLoopTrend,
  buildCoreLoopRecommendations,
  buildExecutionModeCounts,
  buildReasonPlaybook,
  buildReasonCounts,
  buildRiskCounts,
  topEntries,
} from '@/lib/server/core-loop-learning'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'AI_CHANGE_READINESS'
const DEFAULT_HOURS = 24 * 7
const MAX_HOURS = 24 * 30
const THRESHOLDS: CoreLoopThresholds = {
  minSample: 20,
  successRate: 0.9,
  regressionRateMax: 0.05,
  sandboxCoverage: 0.5,
}

function parseHours(value: string | null): number {
  const parsed = Number.parseInt(value || `${DEFAULT_HOURS}`, 10)
  if (Number.isNaN(parsed)) return DEFAULT_HOURS
  return Math.max(1, Math.min(parsed, MAX_HOURS))
}

export async function GET(request: NextRequest) {
  const user = requireAuth(request)
  await requireEntitlementsForUser(user.userId)

  const hours = parseHours(request.nextUrl.searchParams.get('hours'))
  const sinceIso = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
  const events = await readChangeRunLedgerEvents({
    userId: user.userId,
    sinceIso,
    limit: 2000,
  })

  const providerConfigured = Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GROQ_API_KEY
  )
  const reportAll = computeCoreLoopReadiness({
    events,
    thresholds: THRESHOLDS,
    providerConfigured,
    runGroupLimit: 100,
    sampleClass: 'all',
  })
  const report = computeCoreLoopReadiness({
    events,
    thresholds: THRESHOLDS,
    providerConfigured,
    runGroupLimit: 100,
    sampleClass: 'production',
  })
  const rehearsalReport = computeCoreLoopReadiness({
    events,
    thresholds: THRESHOLDS,
    providerConfigured,
    runGroupLimit: 100,
    sampleClass: 'rehearsal',
  })
  const productionEvents = filterChangeRunLedgerBySample(events, 'production')
  const reasonCounts = buildReasonCounts(productionEvents)
  const executionModeCounts = buildExecutionModeCounts(productionEvents)
  const riskCounts = buildRiskCounts(productionEvents)
  const baselineSinceIso = new Date(Date.now() - 24 * 30 * 60 * 60 * 1000).toISOString()
  const baselineEvents = await readChangeRunLedgerEvents({
    userId: user.userId,
    sinceIso: baselineSinceIso,
    limit: 2000,
  })
  const baselineReport = computeCoreLoopReadiness({
    events: baselineEvents,
    thresholds: THRESHOLDS,
    providerConfigured: report.providerConfigured,
    runGroupLimit: 100,
    sampleClass: 'production',
  })
  const trend = buildCoreLoopTrend({
    latest: report.metrics,
    baseline: baselineReport.metrics,
  })
  const recommendations = buildCoreLoopRecommendations({
    metrics: report.metrics,
    thresholds: THRESHOLDS,
    providerConfigured: report.providerConfigured,
    reasonCounts,
  })

  return capabilityResponse({
    error: 'NONE',
    message: 'Core-loop readiness loaded.',
    status: 200,
    capability: CAPABILITY,
    capabilityStatus: 'PARTIAL',
    metadata: {
      hours,
      sinceIso,
      samplePolicy: 'production_only_for_promotion',
      thresholds: report.thresholds,
      metrics: report.metrics,
      metricsAll: reportAll.metrics,
      rehearsalMetrics: rehearsalReport.metrics,
      rollup: report.rollup,
      rollupAll: reportAll.rollup,
      reasonCounts: topEntries(reasonCounts, 8),
      allReasonCounts: topEntries(buildReasonCounts(events), 8),
      executionModeCounts: topEntries(executionModeCounts, 6),
      riskCounts: topEntries(riskCounts, 6),
      trend,
      recommendations,
      reasonPlaybook: buildReasonPlaybook(reasonCounts, 6),
      runGroups: report.runGroups.filter((group) => group.applyCount > 0).slice(0, 25),
      rehearsalRunGroups: rehearsalReport.runGroups.filter((group) => group.applyCount > 0).slice(0, 25),
    },
  })
}
