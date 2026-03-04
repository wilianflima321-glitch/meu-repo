'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { getToken } from '@/lib/auth'

type AdminAnalyticsMetrics = {
  activeUsers: number
  dailyRevenue: number
  aiTokens: number
  requestsPerMinute: number
  aiCostToday: number
}

type BaselineMetricSummary = {
  count: number
  avg: number | null
  p50: number | null
  p95: number | null
  lastValue: number | null
  lastSeenAt: string | null
  target: number | null
  unit: string
  status: 'ok' | 'warn' | 'no_data'
}

type PerformanceBaselineResponse = {
  success: boolean
  capability?: string
  capabilityStatus?: 'IMPLEMENTED' | 'PARTIAL' | 'UNAVAILABLE'
  window?: {
    days: number
    startAt: string
    endAt: string
  }
  performance?: Record<string, BaselineMetricSummary>
  funnel?: {
    landingViews: number
    signups: number
    logins: number
    dashboardViews: number
    projectCreates: number
    aiChats: number
    ideOpens: number
    firstValueProjectCreated: number
    firstValueAiSuccess: number
    firstValueIdeOpen: number
    firstValueCompleted: number
  }
  funnelConversions?: {
    signupToProjectCreate: number | null
    signupToAiChat: number | null
    signupToIdeOpen: number | null
    signupToFirstValueComplete: number | null
    projectCreateToFirstValueComplete: number | null
  }
  firstValue?: {
    medianMs: number | null
    p95Ms: number | null
    samples: number
  }
  dataQuality?: {
    missingSamples: string[]
    hasAnyMissingSamples: boolean
  }
  updatedAt?: string
}

const METRIC_LABELS: Record<string, string> = {
  FCP: 'First Contentful Paint',
  LCP: 'Largest Contentful Paint',
  CLS: 'Cumulative Layout Shift',
  TTI: 'Time to Interactive',
  ai_chat_latency: 'AI chat latency',
  first_value_time: 'First value time',
}

const METRIC_ORDER = ['FCP', 'LCP', 'CLS', 'TTI', 'ai_chat_latency', 'first_value_time']

function formatValue(value: number | null, unit: string): string {
  if (value === null) return '--'
  if (unit === 'ms') return `${Math.round(value)} ms`
  if (unit === 'count') return value.toFixed(3)
  return `${value}`
}

function statusBadgeClass(status: 'ok' | 'warn' | 'no_data'): string {
  if (status === 'ok') return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  if (status === 'warn') return 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  return 'bg-zinc-700/30 text-zinc-300 border-zinc-600/40'
}

export default function AdminAnalytics() {
  const [metrics, setMetrics] = useState<AdminAnalyticsMetrics | null>(null)
  const [baseline, setBaseline] = useState<PerformanceBaselineResponse | null>(null)
  const [windowDays, setWindowDays] = useState<7 | 14 | 30>(7)
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
        activeUsers: quickStats?.stats?.activeUsers ?? 0,
        dailyRevenue: finance?.dailyRevenue ?? 0,
        aiTokens: ai?.metrics?.totalTokens ?? 0,
        requestsPerMinute: quickStats?.stats?.requestsPerMinute ?? 0,
        aiCostToday: quickStats?.stats?.aiCostToday ?? 0,
      })
      setBaseline(baselinePayload)
      setLastUpdated(new Date())

      const failedRequests = [quickStatsRes, financeRes, aiRes, baselineRes].filter(
        (result) => result.status === 'rejected' || (result.status === 'fulfilled' && !result.value.ok)
      ).length

      if (failedRequests > 0) {
        setError(`Coleta parcial: ${failedRequests} endpoint(s) indisponivel(is).`)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar metricas de analytics.')
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
      data: source[metricName] || {
        count: 0,
        avg: null,
        p50: null,
        p95: null,
        lastValue: null,
        lastSeenAt: null,
        target: null,
        unit: 'ms',
        status: 'no_data' as const,
      },
    }))
  }, [baseline?.performance])

  const handleExport = useCallback(() => {
    if (!metrics && !baseline) return
    const payload = {
      generatedAt: new Date().toISOString(),
      metrics,
      baseline,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `analytics-baseline-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }, [baseline, metrics])

  const firstValueCompletionRate = useMemo(() => {
    const completed = baseline?.funnel?.firstValueCompleted ?? 0
    const signups = baseline?.funnel?.signups ?? 0
    if (signups <= 0) return null
    return (completed / signups) * 100
  }, [baseline?.funnel?.firstValueCompleted, baseline?.funnel?.signups])

  const firstValueFromProjectRate = useMemo(() => {
    const completed = baseline?.funnel?.firstValueCompleted ?? 0
    const created = baseline?.funnel?.firstValueProjectCreated ?? 0
    if (created <= 0) return null
    return (completed / created) * 100
  }, [baseline?.funnel?.firstValueCompleted, baseline?.funnel?.firstValueProjectCreated])

  return (
    <div className='mx-auto max-w-6xl p-6'>
      <div className='mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold'>Analytics baseline</h1>
          <p className='text-sm text-zinc-400'>Visao operacional de performance, funil e custo para janela configuravel.</p>
          {lastUpdated && <p className='text-xs text-zinc-500'>Atualizado em {lastUpdated.toLocaleString()}</p>}
          {baseline?.capability && (
            <p className='text-xs text-zinc-500'>
              capability: {baseline.capability} | status: {baseline.capabilityStatus ?? 'IMPLEMENTED'}
            </p>
          )}
        </div>
        <div className='flex items-center gap-2'>
          <label className='sr-only' htmlFor='analytics-window-days'>
            Janela de dias
          </label>
          <select
            id='analytics-window-days'
            value={windowDays}
            onChange={(event) => {
              const next = Number(event.target.value)
              if (next === 7 || next === 14 || next === 30) setWindowDays(next)
            }}
            className='rounded border border-zinc-700/80 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200'
          >
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>
          <button
            type='button'
            onClick={handleExport}
            className='rounded border border-blue-500/40 bg-blue-500/20 px-4 py-2 text-sm text-blue-100 hover:bg-blue-500/30'
          >
            Exportar JSON
          </button>
          <button
            type='button'
            onClick={fetchMetrics}
            className='rounded border border-zinc-700/80 bg-zinc-900/70 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800/80'
          >
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div role='alert' aria-live='polite' className='aethel-state aethel-state-error mb-4'>
          {error}
        </div>
      )}
      {baseline?.dataQuality?.hasAnyMissingSamples && (
        <div role='status' aria-live='polite' className='aethel-state aethel-state-loading mb-4'>
          Baseline parcial: sem amostras para {baseline.dataQuality.missingSamples.join(', ')}.
        </div>
      )}

      <div className='mb-6 grid grid-cols-1 gap-4 md:grid-cols-3' aria-busy={loading}>
        <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
          <h3 className='text-sm font-semibold text-zinc-300'>Usuarios ativos (1h)</h3>
          <p className='mt-2 text-2xl font-semibold'>{loading ? '--' : metrics?.activeUsers ?? 0}</p>
          <p className='text-xs text-zinc-500'>Req/min: {loading ? '--' : metrics?.requestsPerMinute ?? 0}</p>
        </div>
        <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
          <h3 className='text-sm font-semibold text-zinc-300'>Receita diaria</h3>
          <p className='mt-2 text-2xl font-semibold'>${loading ? '--' : (metrics?.dailyRevenue ?? 0).toFixed(2)}</p>
          <p className='text-xs text-zinc-500'>AI cost today: ${loading ? '--' : (metrics?.aiCostToday ?? 0).toFixed(2)}</p>
        </div>
        <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
          <h3 className='text-sm font-semibold text-zinc-300'>Tokens IA (24h)</h3>
          <p className='mt-2 text-2xl font-semibold'>{loading ? '--' : (metrics?.aiTokens ?? 0).toLocaleString()}</p>
          <p className='text-xs text-zinc-500'>Fonte: /api/admin/ai/metrics</p>
        </div>
      </div>

      {loading && (
        <div className='aethel-state aethel-state-loading mb-6'>
          <p className='aethel-state-title mb-2'>Carregando baseline operacional...</p>
          <div className='space-y-2'>
            <div className='aethel-skeleton-line w-full' />
            <div className='aethel-skeleton-line w-4/5' />
            <div className='aethel-skeleton-line w-2/3' />
          </div>
        </div>
      )}

      <div className='mb-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
        <div className='mb-3 flex items-center justify-between'>
          <h2 className='text-base font-semibold text-zinc-200'>Performance baseline ({windowDays}d)</h2>
          <span className='text-xs text-zinc-500'>
            {baseline?.window?.startAt && baseline?.window?.endAt
              ? `${new Date(baseline.window.startAt).toLocaleDateString()} - ${new Date(baseline.window.endAt).toLocaleDateString()}`
              : 'Sem janela carregada'}
          </span>
        </div>
        <div className='overflow-x-auto' role='region' aria-label='Tabela de baseline de performance'>
          <table className='w-full text-sm'>
            <thead>
              <tr className='border-b border-zinc-800/70 text-zinc-400'>
                <th className='p-2 text-left'>Metric</th>
                <th className='p-2 text-left'>P50</th>
                <th className='p-2 text-left'>P95</th>
                <th className='p-2 text-left'>Target</th>
                <th className='p-2 text-left'>Samples</th>
                <th className='p-2 text-left'>Status</th>
              </tr>
            </thead>
            <tbody>
              {baselineRows.map((row) => (
                <tr key={row.name} className='border-b border-zinc-800/60'>
                  <td className='p-2 text-zinc-200'>{row.label}</td>
                  <td className='p-2 text-zinc-300'>{formatValue(row.data.p50, row.data.unit)}</td>
                  <td className='p-2 text-zinc-300'>{formatValue(row.data.p95, row.data.unit)}</td>
                  <td className='p-2 text-zinc-400'>{formatValue(row.data.target, row.data.unit)}</td>
                  <td className='p-2 text-zinc-400'>{row.data.count}</td>
                  <td className='p-2'>
                    <span className={`rounded border px-2 py-1 text-xs ${statusBadgeClass(row.data.status)}`}>
                      {row.data.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {baseline?.firstValue && (
          <div className='mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3'>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
              <p className='text-xs text-zinc-500'>First value median</p>
              <p className='mt-1 text-sm font-semibold text-zinc-100'>
                {baseline.firstValue.medianMs === null ? '--' : `${Math.round(baseline.firstValue.medianMs)} ms`}
              </p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
              <p className='text-xs text-zinc-500'>First value p95</p>
              <p className='mt-1 text-sm font-semibold text-zinc-100'>
                {baseline.firstValue.p95Ms === null ? '--' : `${Math.round(baseline.firstValue.p95Ms)} ms`}
              </p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
              <p className='text-xs text-zinc-500'>First value samples</p>
              <p className='mt-1 text-sm font-semibold text-zinc-100'>{baseline.firstValue.samples}</p>
            </div>
          </div>
        )}
      </div>

      <div className='rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4'>
        <h2 className='mb-3 text-base font-semibold text-zinc-200'>Funnel ({windowDays}d)</h2>
        <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-7'>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>Landing views</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.landingViews ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>Signups</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.signups ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>Logins</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.logins ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>Dashboard views</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.dashboardViews ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>Project creates</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.projectCreates ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>AI chats</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.aiChats ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>IDE opens</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.ideOpens ?? 0}</p>
          </div>
        </div>
        <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4'>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>First value: project</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.firstValueProjectCreated ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>First value: AI success</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.firstValueAiSuccess ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>First value: IDE open</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.firstValueIdeOpen ?? 0}</p>
          </div>
          <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
            <p className='text-xs text-zinc-500'>First value completed</p>
            <p className='mt-1 text-xl font-semibold'>{baseline?.funnel?.firstValueCompleted ?? 0}</p>
            <p className='text-xs text-zinc-500'>
              signup conversion: {firstValueCompletionRate === null ? '--' : `${firstValueCompletionRate.toFixed(1)}%`}
            </p>
            <p className='text-xs text-zinc-500'>
              project to complete: {firstValueFromProjectRate === null ? '--' : `${firstValueFromProjectRate.toFixed(1)}%`}
            </p>
          </div>
        </div>
        {baseline?.funnelConversions && (
          <div className='mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5'>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
              <p className='text-xs text-zinc-500'>signup to project</p>
              <p className='mt-1 text-sm font-semibold text-zinc-100'>
                {baseline.funnelConversions.signupToProjectCreate === null
                  ? '--'
                  : `${baseline.funnelConversions.signupToProjectCreate.toFixed(1)}%`}
              </p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
              <p className='text-xs text-zinc-500'>signup to AI chat</p>
              <p className='mt-1 text-sm font-semibold text-zinc-100'>
                {baseline.funnelConversions.signupToAiChat === null
                  ? '--'
                  : `${baseline.funnelConversions.signupToAiChat.toFixed(1)}%`}
              </p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
              <p className='text-xs text-zinc-500'>signup to IDE open</p>
              <p className='mt-1 text-sm font-semibold text-zinc-100'>
                {baseline.funnelConversions.signupToIdeOpen === null
                  ? '--'
                  : `${baseline.funnelConversions.signupToIdeOpen.toFixed(1)}%`}
              </p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
              <p className='text-xs text-zinc-500'>signup to first value</p>
              <p className='mt-1 text-sm font-semibold text-zinc-100'>
                {baseline.funnelConversions.signupToFirstValueComplete === null
                  ? '--'
                  : `${baseline.funnelConversions.signupToFirstValueComplete.toFixed(1)}%`}
              </p>
            </div>
            <div className='rounded border border-zinc-800/70 bg-zinc-950/40 p-3'>
              <p className='text-xs text-zinc-500'>project to first value</p>
              <p className='mt-1 text-sm font-semibold text-zinc-100'>
                {baseline.funnelConversions.projectCreateToFirstValueComplete === null
                  ? '--'
                  : `${baseline.funnelConversions.projectCreateToFirstValueComplete.toFixed(1)}%`}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
