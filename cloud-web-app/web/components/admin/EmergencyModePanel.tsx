'use client'

import { useMemo, useState } from 'react'
import useSWR from 'swr'
import { AlertTriangle, ShieldAlert, StopCircle } from 'lucide-react'

import { API_BASE } from '@/lib/api'
import { getToken } from '@/lib/auth'

type EmergencyLevel = 'normal' | 'warning' | 'critical' | 'shutdown'

type EmergencyState = {
  enabled: boolean
  level: EmergencyLevel
  reason?: string
  activatedBy?: string
  activatedAt?: string
}

const fetcher = async (url: string) => {
  const token = getToken()
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: 'no-store',
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(payload?.error || payload?.message || 'Failed to load emergency mode')
  }
  return payload
}

export function EmergencyModePanel() {
  const [level, setLevel] = useState<EmergencyLevel>('warning')
  const [reason, setReason] = useState('')
  const [pending, setPending] = useState<'activate' | 'deactivate' | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading, mutate } = useSWR(`${API_BASE}/admin/emergency`, fetcher, {
    refreshInterval: 10_000,
  })

  const state = (data?.data || null) as EmergencyState | null
  const isActive = Boolean(state?.enabled)

  const levelTone = useMemo(() => {
    if (!state?.level || state.level === 'normal') return 'border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] text-[var(--aethel-text-secondary)]'
    if (state.level === 'warning') return 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning)]'
    if (state.level === 'critical') return 'border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] text-[var(--aethel-warning-light)]'
    return 'border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[var(--aethel-error)]/10 text-[var(--aethel-error-light)]'
  }, [state?.level])

  async function activateEmergency() {
    if (!reason.trim()) {
      setError('Add an operational reason before activating contingency mode.')
      return
    }

    setPending('activate')
    setError(null)
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/admin/emergency`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ level, reason: reason.trim() }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Failed to activate emergency mode')
      }
      setReason('')
      await mutate()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Error activating emergency mode')
    } finally {
      setPending(null)
    }
  }

  async function deactivateEmergency() {
    setPending('deactivate')
    setError(null)
    try {
      const token = getToken()
      const response = await fetch(`${API_BASE}/admin/emergency`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || 'Failed to deactivate emergency mode')
      }
      await mutate()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Error deactivating emergency mode')
    } finally {
      setPending(null)
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_22%,var(--aethel-border-primary))] bg-[color-mix(in_srgb,var(--aethel-error)_6%,var(--aethel-surface-secondary))] p-4 shadow">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--aethel-error-light)]">Contingency</p>
          <h2 className="mt-1 text-lg font-semibold text-[var(--aethel-text-primary)]">Emergency controls</h2>
          <p className="mt-1 max-w-2xl text-sm text-[var(--aethel-text-secondary)]">
            Use only for cost spikes, unsafe agent behavior, or production containment.
          </p>
        </div>
        <button
          type="button"
          onClick={() => mutate()}
          className="w-fit rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
        >
          Refresh
        </button>
      </div>

      <div className="mb-4 rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_56%,transparent)] p-3">
        {isLoading ? (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Loading emergency state...</p>
        ) : state ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${levelTone}`}>
                {state.level.toUpperCase()}
              </span>
              <span className="text-xs text-[var(--aethel-text-tertiary)]">
                {state.enabled ? 'Mode active' : 'Mode inactive'}
              </span>
            </div>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              {state.reason ? state.reason : 'No reason registered.'}
            </p>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              {state.activatedAt
                ? `Last activation: ${new Date(state.activatedAt).toLocaleString()} by ${state.activatedBy || 'unknown'}`
                : 'No recent activation.'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">No emergency state returned by the API.</p>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] p-3">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
            <ShieldAlert className="h-4 w-4 text-[var(--aethel-warning)]" />
            Activate contingency
          </h3>
          <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--aethel-text-tertiary)]">Level</label>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as EmergencyLevel)}
            className="mb-3 w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] focus:border-[var(--aethel-info)] focus:outline-none"
          >
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="shutdown">Shutdown</option>
          </select>

          <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--aethel-text-tertiary)]">Reason</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={3}
            className="mb-3 w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] focus:border-[var(--aethel-info)] focus:outline-none"
            placeholder="Example: AI cost spike outside budget, temporary mitigation enabled."
          />

          <button
            type="button"
            onClick={activateEmergency}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded bg-[var(--aethel-warning-dark)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-warning)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AlertTriangle className="h-4 w-4" />
            {pending === 'activate' ? 'Activating...' : 'Activate'}
          </button>
        </div>

        <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-primary)_48%,transparent)] p-3">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--aethel-text-primary)]">
            <StopCircle className="h-4 w-4 text-[var(--aethel-error)]" />
            Normalize operation
          </h3>
          <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
            Deactivate contingency mode and restore normal execution policies.
          </p>
          <button
            type="button"
            onClick={deactivateEmergency}
            disabled={!isActive || pending !== null}
            className="inline-flex items-center gap-2 rounded bg-[var(--aethel-error-dark)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-error)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <StopCircle className="h-4 w-4" />
            {pending === 'deactivate' ? 'Deactivating...' : 'Deactivate'}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-3 text-sm text-[var(--aethel-error)]">
          {error}
        </div>
      ) : null}
    </section>
  )
}
