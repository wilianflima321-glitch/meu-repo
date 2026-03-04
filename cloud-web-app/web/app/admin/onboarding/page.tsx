'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type OnboardingStats = {
  success: true
  capability: 'ADMIN_ONBOARDING_STATS'
  capabilityStatus: 'IMPLEMENTED'
  window: {
    days: number
    startAt: string
    endAt: string
  }
  totals: {
    uniqueUsers: number
    totalActions: number
    onboardingActions: number
    analyticsActions: number
  }
  firstValue: {
    completionRateFromSignup: number | null
    completionRateFromEntry: number | null
    medianFirstValueTimeMs: number | null
  }
  funnel: {
    signups: number
    onboardingEntries: number
    firstProjectCreated: number
    firstAiSuccess: number
    firstIdeOpened: number
    firstValueCompleted: number
  }
  actionCounts: Record<string, number>
  lastActivity: string | null
}

function formatMs(value: number | null): string {
  if (value === null) return '--'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}s`
  return `${Math.round(value)}ms`
}

function formatPercent(value: number | null): string {
  if (value === null) return '--'
  return `${value.toFixed(1)}%`
}

export default function OnboardingAdminPage() {
  const [stats, setStats] = useState<OnboardingStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [search, setSearch] = useState('')
  const [days, setDays] = useState<7 | 14 | 30>(7)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/admin/onboarding/stats?days=${days}`, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Falha ao carregar estatisticas de onboarding (${response.status})`)
      }
      const payload = (await response.json()) as OnboardingStats
      setStats(payload)
      setLastUpdated(new Date())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Falha ao carregar onboarding')
    } finally {
      setLoading(false)
    }
  }, [days])

  useEffect(() => {
    void fetchStats()
  }, [fetchStats])

  const filteredActions = useMemo(() => {
    const term = search.trim().toLowerCase()
    const entries = Object.entries(stats?.actionCounts || {})
    if (!term) return entries
    return entries.filter(([action]) => action.toLowerCase().includes(term))
  }, [search, stats?.actionCounts])

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Onboarding quality</h1>
          <p className="text-sm text-zinc-400">Conversao de first value, tempo de ativacao e evidencias por acao.</p>
          {lastUpdated && <p className="text-xs text-zinc-500">Atualizado em {lastUpdated.toLocaleString()}</p>}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value) as 7 | 14 | 30)}
            className="rounded border border-zinc-700/80 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200"
            aria-label="Janela de dias"
          >
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>
          <button
            type="button"
            onClick={fetchStats}
            className="rounded border border-zinc-700/80 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800/80"
          >
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" aria-live="polite" className="aethel-state aethel-state-error mb-4">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4" aria-busy={loading}>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-500">Usuarios unicos</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : stats?.totals.uniqueUsers ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-500">Acao total</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : stats?.totals.totalActions ?? 0}</p>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-500">First value / signup</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : formatPercent(stats?.firstValue.completionRateFromSignup ?? null)}</p>
        </div>
        <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4">
          <p className="text-xs text-zinc-500">Median first value time</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : formatMs(stats?.firstValue.medianFirstValueTimeMs ?? null)}</p>
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4">
        <h2 className="mb-3 text-base font-semibold text-zinc-200">First value funnel</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded border border-zinc-800/70 bg-zinc-950/40 p-3">
            <p className="text-xs text-zinc-500">Signups</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.signups ?? 0}</p>
          </div>
          <div className="rounded border border-zinc-800/70 bg-zinc-950/40 p-3">
            <p className="text-xs text-zinc-500">Onboarding entries</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.onboardingEntries ?? 0}</p>
          </div>
          <div className="rounded border border-zinc-800/70 bg-zinc-950/40 p-3">
            <p className="text-xs text-zinc-500">First project</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.firstProjectCreated ?? 0}</p>
          </div>
          <div className="rounded border border-zinc-800/70 bg-zinc-950/40 p-3">
            <p className="text-xs text-zinc-500">First AI success</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.firstAiSuccess ?? 0}</p>
          </div>
          <div className="rounded border border-zinc-800/70 bg-zinc-950/40 p-3">
            <p className="text-xs text-zinc-500">First IDE open</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.firstIdeOpened ?? 0}</p>
          </div>
          <div className="rounded border border-zinc-800/70 bg-zinc-950/40 p-3">
            <p className="text-xs text-zinc-500">Completed</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.firstValueCompleted ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-800/80 bg-zinc-900/70 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-zinc-200">Actions by type</h2>
          <input
            type="text"
            placeholder="Buscar acao"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded border border-zinc-700/80 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200"
          />
        </div>
        {filteredActions.length > 0 ? (
          <ul className="divide-y divide-zinc-800/70">
            {filteredActions.map(([action, count]) => (
              <li key={action} className="flex items-center justify-between py-2 text-sm">
                <span className="text-zinc-300">{action}</span>
                <span className="text-zinc-500">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-500">Nenhuma acao registrada para o filtro atual.</p>
        )}
      </div>
    </div>
  )
}
