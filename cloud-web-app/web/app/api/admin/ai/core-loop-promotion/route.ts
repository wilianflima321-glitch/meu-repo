import { NextResponse } from 'next/server'
import { withAdminAuth } from '@/lib/rbac'
import { filterChangeRunLedgerBySample, readChangeRunLedgerEvents } from '@/lib/server/change-run-ledger'
import { computeCoreLoopReadiness, type CoreLoopThresholds } from '@/lib/server/core-loop-readiness'
import { buildFeedbackCounts, topEntries } from '@/lib/server/core-loop-learning'

export const dynamic = 'force-dynamic'

const CAPABILITY = 'ADMIN_AI_CORE_LOOP_PROMOTION'
const THRESHOLDS: CoreLoopThresholds = {
  minSample: 20,
  successRate: 0.9,
  regressionRateMax: 0.05,
  sandboxCoverage: 0.5,
}

export const GET = withAdminAuth(async () => {
  const now = new Date()
  const sinceIso = new Date(now.getTime() - 24 * 7 * 60 * 60 * 1000).toISOString()
  const events = await readChangeRunLedgerEvents({ sinceIso, limit: 5000 })
  const providerConfigured = Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GROQ_API_KEY
  )

  const production = computeCoreLoopReadiness({
    events,
    thresholds: THRESHOLDS,
    providerConfigured,
    runGroupLimit: 200,
    sampleClass: 'production',
  })
  const rehearsal = computeCoreLoopReadiness({
    events,
    thresholds: THRESHOLDS,
    providerConfigured,
    runGroupLimit: 200,
    sampleClass: 'rehearsal',
  })
  const productionFeedbackCounts = topEntries(
    buildFeedbackCounts(filterChangeRunLedgerBySample(events, 'production')),
    6
  )
  const rehearsalFeedbackCounts = topEntries(
    buildFeedbackCounts(filterChangeRunLedgerBySample(events, 'rehearsal')),
    6
  )

  return NextResponse.json(
    {
      success: true,
      capability: CAPABILITY,
      capabilityStatus: 'PARTIAL',
      samplePolicy: 'production_only_for_promotion',
      promotionEligible: production.metrics.promotionEligible,
      blockers: production.metrics.blockers,
      thresholds: THRESHOLDS,
      production: production.metrics,
      rehearsal: rehearsal.metrics,
      productionFeedbackCounts,
      rehearsalFeedbackCounts,
      updatedAt: now.toISOString(),
      sinceIso,
    },
    {
      headers: {
        'x-aethel-capability': CAPABILITY,
        'x-aethel-capability-status': 'PARTIAL',
      },
    }
  )
}, 'ops:agents:view')
