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
    throw new Error(payload?.error || payload?.message || 'Falha ao carregar modo de emergencia')
  }
  return payload
}

export default function AdminEmergencyPage() {
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
    if (!state?.level || state.level === 'normal') return 'text-[var(--aethel-text-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] border-[var(--aethel-border-secondary)]'
    if (state.level === 'warning') return 'text-[var(--aethel-warning)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]'
    if (state.level === 'critical') return 'text-[var(--aethel-warning-light)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]'
    return 'text-[var(--aethel-error-light)] bg-[var(--aethel-error)]/10 border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]'
  }, [state?.level])

  async function activateEmergency() {
    if (!reason.trim()) {
      setError('Informe um motivo operacional antes de ativar.')
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
        throw new Error(payload?.error || payload?.message || 'Falha ao ativar modo de emergencia')
      }
      setReason('')
      await mutate()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao ativar modo de emergencia')
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
        throw new Error(payload?.error || payload?.message || 'Falha ao desativar modo de emergencia')
      }
      await mutate()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao desativar modo de emergencia')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--aethel-text-primary)]">Controle de emergencia</h1>
          <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
            Opera o modo de contingencia para cargas criticas sem estado fake.
          </p>
        </div>
        <button type="button"
          onClick={() => mutate()}
          className="rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-tertiary)]"
        >
          Recarregar
        </button>
      </header>

      <section className="mb-6 rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
        {isLoading ? (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Carregando estado de emergência...</p>
        ) : state ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${levelTone}`}>
                {state.level.toUpperCase()}
              </span>
              <span className="text-xs text-[var(--aethel-text-tertiary)]">
                {state.enabled ? 'Modo ativo' : 'Modo inativo'}
              </span>
            </div>
            <p className="text-sm text-[var(--aethel-text-secondary)]">
              {state.reason ? state.reason : 'Sem motivo registrado no momento.'}
            </p>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">
              {state.activatedAt
                ? `Última ativação: ${new Date(state.activatedAt).toLocaleString()} por ${state.activatedBy ? 'sistema' : 'desconhecido'}`
                : 'Nenhuma ativação recente.'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Nenhum estado retornado pela API.</p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--aethel-text-primary)]">
            <ShieldAlert className="h-4 w-4 text-[var(--aethel-warning)]" />
            Ativar Contingência
          </h2>
          <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--aethel-text-tertiary)]">Nível</label>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as EmergencyLevel)}
            className="mb-4 w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] focus:border-[var(--aethel-info)] focus:outline-none"
          >
            <option value="warning">Aviso</option>
            <option value="critical">Critico</option>
            <option value="shutdown">Desligamento</option>
          </select>

          <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-[var(--aethel-text-tertiary)]">Motivo</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="mb-4 w-full rounded border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-sm text-[var(--aethel-text-primary)] focus:border-[var(--aethel-info)] focus:outline-none"
            placeholder="Ex: pico de custo IA fora do budget, mitigação temporária ativada."
          />

          <button type="button"
            onClick={activateEmergency}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded bg-[var(--aethel-warning-dark)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-warning)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AlertTriangle className="h-4 w-4" />
            {pending === 'activate' ? 'Ativando...' : 'Ativar emergencia'}
          </button>
        </div>

        <div className="rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-[var(--aethel-text-primary)]">
            <StopCircle className="h-4 w-4 text-[var(--aethel-error)]" />
            Normalizar Operação
          </h2>
          <p className="mb-4 text-sm text-[var(--aethel-text-secondary)]">
            Desativa o modo de contingência e restaura as políticas normais de execução.
          </p>
          <button type="button"
            onClick={deactivateEmergency}
            disabled={!isActive || pending !== null}
            className="inline-flex items-center gap-2 rounded bg-[var(--aethel-error-dark)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:bg-[var(--aethel-error)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <StopCircle className="h-4 w-4" />
            {pending === 'deactivate' ? 'Desativando...' : 'Desativar emergencia'}
          </button>
        </div>
      </section>

      {error ? (
        <div className="mt-4 rounded border border-[color-mix(in_srgb,var(--aethel-error)_40%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-3 text-sm text-[var(--aethel-error)]">{error}</div>
      ) : null}
    </div>
  )
}
