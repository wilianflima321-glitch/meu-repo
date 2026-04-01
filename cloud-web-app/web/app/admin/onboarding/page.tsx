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
    p95FirstValueTimeMs: number | null
    sampleSize: number
    sloTargetMs: number
    sloStatus: 'pass' | 'fail' | 'insufficient_sample'
    latestCompletedAt: string | null
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

function formatSloStatus(status: OnboardingStats['firstValue']['sloStatus'] | undefined): string {
  if (status === 'pass') return 'PASS'
  if (status === 'fail') return 'FAIL'
  return 'INSUFFICIENT_SAMPLE'
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
          <p className="text-sm text-[var(--aethel-text-secondary)]">Conversao de first value, tempo de ativacao e evidencias por acao.</p>
          {lastUpdated && <p className="text-xs text-[var(--aethel-text-tertiary)]">Atualizado em {lastUpdated.toLocaleString()}</p>}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(event) => setDays(Number(event.target.value) as 7 | 14 | 30)}
            className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
            aria-label="Janela de dias"
          >
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>
          <button
            type="button"
            onClick={fetchStats}
            className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]"
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

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-6" aria-busy={loading}>
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Usuarios unicos</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : stats?.totals.uniqueUsers || 0}</p>
        </div>
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Acao total</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : stats?.totals.totalActions || 0}</p>
        </div>
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">First value / signup</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : formatPercent(stats?.firstValue.completionRateFromSignup || null)}</p>
        </div>
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">Median first value time</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : formatMs(stats?.firstValue.medianFirstValueTimeMs || null)}</p>
          {!loading && stats?.firstValue && (
            <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">sample={stats.firstValue.sampleSize}</p>
          )}
        </div>
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">P95 first value time</p>
          <p className="mt-2 text-2xl font-semibold">{loading ? '--' : formatMs(stats?.firstValue.p95FirstValueTimeMs || null)}</p>
          {!loading && stats?.firstValue?.latestCompletedAt && (
            <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">last={new Date(stats.firstValue.latestCompletedAt).toLocaleString()}</p>
          )}
        </div>
        <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <p className="text-xs text-[var(--aethel-text-tertiary)]">First value SLO</p>
          <p className="mt-2 text-lg font-semibold">
            {loading ? '--' : `target ${formatMs(stats?.firstValue.sloTargetMs || null)}`}
          </p>
          {!loading && stats?.firstValue && (
            <p
              className={`mt-1 text-xs ${
                stats.firstValue.sloStatus === 'pass'
                  ? 'text-[var(--aethel-success)]'
                  : stats.firstValue.sloStatus === 'fail'
                    ? 'text-[var(--aethel-error)]'
                    : 'text-[var(--aethel-warning)]'
              }`}
            >
              {formatSloStatus(stats.firstValue.sloStatus)} (evaluated on P95)
            </p>
          )}
        </div>
      </div>

      <div className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
        <h2 className="mb-3 text-base font-semibold text-[var(--aethel-text-secondary)]">First value funnel</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Signups</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.signups || 0}</p>
          </div>
          <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Onboarding entries</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.onboardingEntries || 0}</p>
          </div>
          <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">First project</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.firstProjectCreated || 0}</p>
          </div>
          <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">First AI success</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.firstAiSuccess || 0}</p>
          </div>
          <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">First IDE open</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.firstIdeOpened || 0}</p>
          </div>
          <div className="rounded border border-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)] bg-[var(--aethel-surface-primary)]/40 p-3">
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Completed</p>
            <p className="mt-1 text-xl font-semibold">{stats?.funnel.firstValueCompleted || 0}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-[var(--aethel-text-secondary)]">Actions by type</h2>
          <input
            type="text"
            placeholder="Buscar acao"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="rounded border border-[color-mix(in_srgb,var(--aethel-border-secondary)_80%,transparent)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
          />
        </div>
        {filteredActions.length > 0 ? (
          <ul className="divide-y divide-[color-mix(in_srgb,var(--aethel-border-primary)_70%,transparent)]">
            {filteredActions.map(([action, count]) => (
              <li key={action} className="flex items-center justify-between py-2 text-sm">
                <span className="text-[var(--aethel-text-secondary)]">{action}</span>
                <span className="text-[var(--aethel-text-tertiary)]">{count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Nenhuma acao registrada para o filtro atual.</p>
        )}
      </div>
    </div>
  )
}

