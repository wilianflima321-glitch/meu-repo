'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { getToken } from '@/lib/auth'
import { AdminApisPanel } from '../apis/AdminApisPanel'
import { InfrastructureAdminPanel } from '../infrastructure/InfrastructureAdminPanel'

import { HEALTH_ENDPOINTS } from './_components/monitoring-constants'
import { MonitoringAlertThresholds } from './_components/MonitoringAlertThresholds'
import { MonitoringAttentionPanel, MonitoringInterpretationPanel } from './_components/MonitoringPanels'
import { MonitoringCoreLoopEvidence } from './_components/MonitoringCoreLoopEvidence'
import { MonitoringHealthChecksTable } from './_components/MonitoringHealthChecksTable'
import { MonitoringHero } from './_components/MonitoringHero'
import { MonitoringSummaryCards } from './_components/MonitoringSummaryCards'
import type { CoreLoopPromotionSnapshot, HealthCheckResult, MonitoringMetrics } from './_components/monitoring-types'
import { getMonitoringTone } from './_components/monitoring-utils'

export default function AdminMonitoringPage() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null)
  const [coreLoop, setCoreLoop] = useState<CoreLoopPromotionSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)
  const [showApisPanel, setShowApisPanel] = useState(false)
  const [showInfrastructurePanel, setShowInfrastructurePanel] = useState(false)

  const runHealthChecks = useCallback(async (): Promise<HealthCheckResult[]> => {
    const results: HealthCheckResult[] = []
    for (const endpoint of HEALTH_ENDPOINTS) {
      const start = performance.now()
      try {
        const token = getToken()
        const response = await fetch(endpoint.path, { cache: 'no-store', headers: token ? { Authorization: `Bearer ${token}` } : {} })
        results.push({ endpoint: endpoint.name, status: response.ok ? 'healthy' : 'degraded', latencyMs: Math.round(performance.now() - start), lastChecked: new Date().toISOString() })
      } catch {
        results.push({ endpoint: endpoint.name, status: 'down', latencyMs: Math.round(performance.now() - start), lastChecked: new Date().toISOString() })
      }
    }
    return results
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const token = getToken()
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
      const [healthChecks, coreLoopResponse] = await Promise.all([
        runHealthChecks(),
        fetch('/api/admin/ai/core-loop-promotion', { cache: 'no-store', headers: authHeaders }).catch(() => null),
      ])
      setMetrics(buildMonitoringMetrics(healthChecks))
      setCoreLoop(coreLoopResponse?.ok ? normalizeCoreLoopPayload(await coreLoopResponse.json()) : null)
      setLastRefresh(new Date().toISOString())
    } finally {
      setLoading(false)
    }
  }, [runHealthChecks])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30000)
    return () => clearInterval(interval)
  }, [refresh])

  useEffect(() => {
    const legacy = new URLSearchParams(window.location.search).get('legacy')
    if (legacy === 'apis') setShowApisPanel(true)
    if (legacy === 'infrastructure') setShowInfrastructurePanel(true)
  }, [])

  const blockedChecks = metrics?.healthChecks.filter((check) => check.status === 'down') ?? []
  const degradedChecks = metrics?.healthChecks.filter((check) => check.status === 'degraded') ?? []
  const monitoringTone = useMemo(() => getMonitoringTone(metrics), [metrics])

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] p-6 text-[var(--aethel-text-primary)]">
      <div className="mx-auto max-w-7xl space-y-6">
        <MonitoringHero tone={monitoringTone} coreLoop={coreLoop} loading={loading} lastRefresh={lastRefresh} onRefresh={refresh} />
        <MonitoringSummaryCards metrics={metrics} />
        <section className="grid gap-4 lg:grid-cols-2">
          <MonitoringAttentionPanel blockedChecks={blockedChecks} degradedChecks={degradedChecks} />
          <MonitoringInterpretationPanel />
        </section>
        <MonitoringHealthChecksTable metrics={metrics} loading={loading} />
        <details
          id="apis"
          className="rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4"
          open={showApisPanel}
          onToggle={(event) => setShowApisPanel(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-primary)]">
            API posture
          </summary>
          <div className="mt-4">
            <AdminApisPanel />
          </div>
        </details>
        <details
          id="infrastructure"
          className="rounded-2xl border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] p-4"
          open={showInfrastructurePanel}
          onToggle={(event) => setShowInfrastructurePanel(event.currentTarget.open)}
        >
          <summary className="cursor-pointer text-sm font-semibold text-[var(--aethel-text-primary)]">
            Infrastructure status
          </summary>
          <div className="mt-4">
            <InfrastructureAdminPanel />
          </div>
        </details>
        <MonitoringCoreLoopEvidence coreLoop={coreLoop} />
        <MonitoringAlertThresholds metrics={metrics} />
      </div>
    </div>
  )
}

function buildMonitoringMetrics(healthChecks: HealthCheckResult[]): MonitoringMetrics {
  const healthyCount = healthChecks.filter((check) => check.status === 'healthy').length
  const latencies = healthChecks.map((check) => check.latencyMs).sort((a, b) => a - b)
  return {
    errorRate: ((healthChecks.length - healthyCount) / healthChecks.length) * 100,
    p50Latency: latencies[Math.floor(latencies.length * 0.5)] || 0,
    p95Latency: latencies[Math.floor(latencies.length * 0.95)] || 0,
    activeUsers: 0,
    requestsPerMinute: 0,
    uptimePercent: (healthyCount / healthChecks.length) * 100,
    healthChecks,
  }
}

function normalizeCoreLoopPayload(payload: Record<string, unknown>): CoreLoopPromotionSnapshot {
  return {
    promotionEligible: Boolean(payload?.promotionEligible),
    blockers: Array.isArray(payload?.blockers) ? payload.blockers.filter((item): item is string => typeof item === 'string') : [],
    production: (payload?.production as CoreLoopPromotionSnapshot['production']) ?? null,
    updatedAt: typeof payload?.updatedAt === 'string' ? payload.updatedAt : null,
  }
}
