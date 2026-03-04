import type { ChangeRunLedgerRow } from '@/lib/server/change-run-ledger'
import type { CoreLoopThresholds, CoreLoopWindowReport } from '@/lib/server/core-loop-readiness'

export type CountMap = Record<string, number>

export type CoreLoopRecommendation = {
  id:
    | 'increase_sample'
    | 'improve_success_rate'
    | 'reduce_regressions'
    | 'increase_sandbox_coverage'
    | 'provider_setup'
    | 'approve_high_risk'
  severity: 'critical' | 'warning' | 'info'
  message: string
}

export type CoreLoopTrend = {
  sampleSize: 'up' | 'down' | 'flat'
  applySuccessRate: 'up' | 'down' | 'flat'
  regressionRate: 'up' | 'down' | 'flat'
  sandboxCoverage: 'up' | 'down' | 'flat'
}

export type CoreLoopReasonPlaybookItem = {
  reason: string
  count: number
  action: string
}

function toMetadataObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value as Record<string, unknown>
}

function increment(map: CountMap, key: string): void {
  map[key] = (map[key] || 0) + 1
}

function sortCountMap(input: CountMap): CountMap {
  const sorted = Object.entries(input).sort((a, b) => b[1] - a[1])
  return Object.fromEntries(sorted)
}

function extractImpactedEndpoints(metadata: Record<string, unknown>): string[] {
  const fromChanges = Array.isArray(metadata.changes) ? metadata.changes : []
  const endpoints = new Set<string>()

  for (const change of fromChanges) {
    const changeObj = toMetadataObject(change)
    const projectImpact = toMetadataObject(changeObj.projectImpact)
    const impactedEndpoints = Array.isArray(projectImpact.impactedEndpoints)
      ? projectImpact.impactedEndpoints
      : []
    for (const endpoint of impactedEndpoints) {
      if (typeof endpoint !== 'string') continue
      if (!endpoint.trim()) continue
      endpoints.add(endpoint.trim())
    }
  }

  const metadataImpactedEndpoints = Array.isArray(metadata.impactedEndpoints)
    ? metadata.impactedEndpoints
    : []
  for (const endpoint of metadataImpactedEndpoints) {
    if (typeof endpoint !== 'string') continue
    if (!endpoint.trim()) continue
    endpoints.add(endpoint.trim())
  }

  return [...endpoints]
}

export function buildReasonCounts(events: ChangeRunLedgerRow[]): CountMap {
  const counts: CountMap = {}
  for (const event of events) {
    if (event.eventType !== 'apply_blocked' && event.eventType !== 'rollback_blocked') continue
    const metadata = toMetadataObject(event.metadata)
    const reason = typeof metadata.reason === 'string' && metadata.reason.trim() ? metadata.reason.trim() : 'UNKNOWN'
    increment(counts, reason)
  }
  return sortCountMap(counts)
}

export function buildExecutionModeCounts(events: ChangeRunLedgerRow[]): CountMap {
  const counts: CountMap = {}
  for (const event of events) {
    if (event.eventType !== 'apply' || event.outcome !== 'success') continue
    const metadata = toMetadataObject(event.metadata)
    const mode =
      typeof metadata.executionMode === 'string' && metadata.executionMode.trim()
        ? metadata.executionMode.trim()
        : 'unknown'
    increment(counts, mode)
  }
  return sortCountMap(counts)
}

export function buildRiskCounts(events: ChangeRunLedgerRow[]): CountMap {
  const counts: CountMap = {}
  for (const event of events) {
    if (event.eventType !== 'apply') continue
    const metadata = toMetadataObject(event.metadata)
    const risk =
      typeof metadata.dependencyGraphRisk === 'string' && metadata.dependencyGraphRisk.trim()
        ? metadata.dependencyGraphRisk.trim()
        : 'unknown'
    increment(counts, risk)
  }
  return sortCountMap(counts)
}

export function buildImpactedEndpointCounts(events: ChangeRunLedgerRow[]): CountMap {
  const counts: CountMap = {}
  for (const event of events) {
    if (event.eventType !== 'apply' && event.eventType !== 'apply_blocked') continue
    const metadata = toMetadataObject(event.metadata)
    const endpoints = extractImpactedEndpoints(metadata)
    for (const endpoint of endpoints) {
      increment(counts, endpoint)
    }
  }
  return sortCountMap(counts)
}

export function topEntries(input: CountMap, limit = 6): CountMap {
  return Object.fromEntries(Object.entries(input).slice(0, Math.max(1, limit)))
}

export function buildCoreLoopRecommendations(params: {
  metrics: CoreLoopWindowReport
  thresholds: CoreLoopThresholds
  providerConfigured: boolean
  reasonCounts: CountMap
}): CoreLoopRecommendation[] {
  const { metrics, thresholds, providerConfigured, reasonCounts } = params
  const out: CoreLoopRecommendation[] = []

  if (!providerConfigured) {
    out.push({
      id: 'provider_setup',
      severity: 'critical',
      message: 'Configure at least one AI provider; readiness evidence is invalid while provider is unavailable.',
    })
  }

  if (metrics.sampleSize < thresholds.minSample) {
    out.push({
      id: 'increase_sample',
      severity: 'critical',
      message: `Increase apply-run sample size to at least ${thresholds.minSample} in the active window.`,
    })
  }

  if (metrics.applySuccessRate < thresholds.successRate) {
    out.push({
      id: 'improve_success_rate',
      severity: 'warning',
      message: `Apply success rate is below target (${(thresholds.successRate * 100).toFixed(0)}%).`,
    })
  }

  if (metrics.regressionRate > thresholds.regressionRateMax) {
    out.push({
      id: 'reduce_regressions',
      severity: 'critical',
      message: `Regression rate exceeds threshold (${(thresholds.regressionRateMax * 100).toFixed(0)}%).`,
    })
  }

  if (metrics.sandboxCoverage < thresholds.sandboxCoverage) {
    out.push({
      id: 'increase_sandbox_coverage',
      severity: 'warning',
      message: `Sandbox coverage is below target (${(thresholds.sandboxCoverage * 100).toFixed(0)}%).`,
    })
  }

  if ((reasonCounts.HIGH_RISK_APPROVAL_REQUIRED || 0) > 0 || (reasonCounts.DEPENDENCY_GRAPH_APPROVAL_REQUIRED || 0) > 0) {
    out.push({
      id: 'approve_high_risk',
      severity: 'info',
      message:
        'High-risk paths are being blocked as expected; validate approval workflow and keep protected scopes gated.',
    })
  }

  return out
}

function compareWithTolerance(current: number, baseline: number, tolerance = 0.01): 'up' | 'down' | 'flat' {
  if (!Number.isFinite(current) || !Number.isFinite(baseline)) return 'flat'
  const delta = current - baseline
  if (Math.abs(delta) <= tolerance) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

export function buildCoreLoopTrend(params: {
  latest: CoreLoopWindowReport
  baseline?: CoreLoopWindowReport
}): CoreLoopTrend {
  const baseline = params.baseline
  if (!baseline) {
    return {
      sampleSize: 'flat',
      applySuccessRate: 'flat',
      regressionRate: 'flat',
      sandboxCoverage: 'flat',
    }
  }

  return {
    sampleSize: compareWithTolerance(params.latest.sampleSize, baseline.sampleSize, 0.5),
    applySuccessRate: compareWithTolerance(params.latest.applySuccessRate, baseline.applySuccessRate, 0.005),
    regressionRate: compareWithTolerance(params.latest.regressionRate, baseline.regressionRate, 0.005),
    sandboxCoverage: compareWithTolerance(params.latest.sandboxCoverage, baseline.sandboxCoverage, 0.005),
  }
}

function reasonAction(reason: string): string {
  if (reason === 'VALIDATION_BLOCKED') return 'Improve planner patch quality before apply.'
  if (reason === 'CURRENT_HASH_MISMATCH') return 'Refresh file snapshot right before apply.'
  if (reason === 'HIGH_RISK_APPROVAL_REQUIRED') return 'Route high-risk changes through explicit approval flow.'
  if (reason === 'DEPENDENCY_GRAPH_APPROVAL_REQUIRED') return 'Split large transitive changes into smaller waves.'
  if (reason === 'DEPENDENCY_IMPACT_APPROVAL_REQUIRED') return 'Reduce local-import fanout or require explicit approval.'
  if (reason === 'APPLY_WRITE_FAILED') return 'Harden workspace I/O path and fallback recovery.'
  if (reason === 'ROLLBACK_WRITE_FAILED') return 'Validate rollback token/write restore path with smoke runs.'
  return 'Review ledger evidence and add targeted remediation for this reason.'
}

export function buildReasonPlaybook(reasonCounts: CountMap, limit = 6): CoreLoopReasonPlaybookItem[] {
  return Object.entries(reasonCounts)
    .slice(0, Math.max(1, limit))
    .map(([reason, count]) => ({
      reason,
      count,
      action: reasonAction(reason),
    }))
}
