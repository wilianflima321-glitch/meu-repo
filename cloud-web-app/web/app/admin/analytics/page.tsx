'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getToken } from '@/lib/auth'
import { AnalyticsAlerts } from './_components/AnalyticsAlerts'
import { AnalyticsFunnel } from './_components/AnalyticsFunnel'
import { AnalyticsHeader } from './_components/AnalyticsHeader'
import { AnalyticsLoadingState } from './_components/AnalyticsLoadingState'
import { AnalyticsPerformanceBaseline } from './_components/AnalyticsPerformanceBaseline'
import { AnalyticsSummaryCards } from './_components/AnalyticsSummaryCards'
import type { AdminAnalyticsMetrics, AnalyticsWindowDays, PerformanceBaselineResponse } from './_components/analytics-types'
import { emptyMetric, METRIC_LABELS, METRIC_ORDER } from './_components/analytics-utils'

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<AdminAnalyticsMetrics | null>(null)
  const [baseline, setBaseline] = useState<PerformanceBaselineResponse | null>(null)
  const [windowDays, setWindowDays] = useState<AnalyticsWindowDays>(7)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const getAuthHeaders = useCallback(() => {
    const token = getToken()
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  }, [])

  const fetchMetrics = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [quickStatsRes, financeRes, aiRes, baselineRes] = await Promise.allSettled([
        fetch('/api/admin/quick-stats', { headers: getAuthHeaders() }),
        fetch('/api/admin/finance/metrics?range=today', { headers: getAuthHeaders() }),
        fetch('/api/admin/ai/metrics', { headers: getAuthHeaders() }),
        fetch(`/api/admin/analytics/baseline?days=${windowDays}`, { headers: getAuthHeaders() }),
      ])

      const readJson = async <T,>(result: PromiseSettledResult<Response>): Promise<T | null> => {
        if (result.status !== 'fulfilled') return null
        if (!result.value.ok) return null
        try {
          return (await result.value.json()) as T
        } catch {
          return null
        }
      }

      const quickStats = await readJson<{ stats?: { activeUsers?: number; requestsPerMinute?: number; aiCostToday?: number } }>(quickStatsRes)
      const finance = await readJson<{ dailyRevenue?: number }>(financeRes)
      const ai = await readJson<{ metrics?: { totalTokens?: number } }>(aiRes)
      const baselinePayload = await readJson<PerformanceBaselineResponse>(baselineRes)

      setMetrics({
        activeUsers: quickStats?.stats?.activeUsers || 0,
        dailyRevenue: finance?.dailyRevenue || 0,
        aiTokens: ai?.metrics?.totalTokens || 0,
        requestsPerMinute: quickStats?.stats?.requestsPerMinute || 0,
        aiCostToday: quickStats?.stats?.aiCostToday || 0,
      })
      setBaseline(baselinePayload)
      setLastUpdated(new Date())

      const failedRequests = [quickStatsRes, financeRes, aiRes, baselineRes].filter(
        (result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok),
      ).length

      if (failedRequests > 0) setError(`Partial collection: ${failedRequests} endpoint(s) unavailable.`)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to load analytics metrics.')
      setMetrics(null)
      setBaseline(null)
    } finally {
      setLoading(false)
    }
  }, [getAuthHeaders, windowDays])

  useEffect(() => {
    void fetchMetrics()
  }, [fetchMetrics])

  const baselineRows = useMemo(() => {
    const source = baseline?.performance || {}
    return METRIC_ORDER.map((metricName) => ({
      name: metricName,
      label: METRIC_LABELS[metricName] || metricName,
      data: source[metricName] || emptyMetric(),
    }))
  }, [baseline?.performance])

  const handleExport = useCallback(() => {
    if (!metrics && !baseline) return
    const payload = { generatedAt: new Date().toISOString(), metrics, baseline }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-baseline-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [baseline, metrics])

  const firstValueCompletionRate = useMemo(() => {
    const completed = baseline?.funnel?.firstValueCompleted || 0
    const signups = baseline?.funnel?.signups || 0
    if (signups <= 0) return null
    return (completed / signups) * 100
  }, [baseline?.funnel?.firstValueCompleted, baseline?.funnel?.signups])

  const firstValueFromProjectRate = useMemo(() => {
    const completed = baseline?.funnel?.firstValueCompleted || 0
    const created = baseline?.funnel?.firstValueProjectCreated || 0
    if (created <= 0) return null
    return (completed / created) * 100
  }, [baseline?.funnel?.firstValueCompleted, baseline?.funnel?.firstValueProjectCreated])

  return (
    <div className="mx-auto max-w-6xl p-6">
      <AnalyticsHeader baseline={baseline} lastUpdated={lastUpdated} windowDays={windowDays} onWindowChange={setWindowDays} onExport={handleExport} />
      <AnalyticsAlerts error={error} baseline={baseline} />
      <AnalyticsSummaryCards loading={loading} metrics={metrics} />
      <AnalyticsLoadingState loading={loading} />
      <AnalyticsPerformanceBaseline baseline={baseline} baselineRows={baselineRows} windowDays={windowDays} />
      <AnalyticsFunnel
        baseline={baseline}
        windowDays={windowDays}
        firstValueCompletionRate={firstValueCompletionRate}
        firstValueFromProjectRate={firstValueFromProjectRate}
      />
    </div>
  )
}
