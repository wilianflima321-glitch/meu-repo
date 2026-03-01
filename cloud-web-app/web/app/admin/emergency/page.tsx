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
    throw new Error(payload?.error || payload?.message || 'Falha ao carregar emergency mode')
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
    if (!state?.level || state.level === 'normal') return 'text-zinc-300 bg-zinc-800/80 border-zinc-700'
    if (state.level === 'warning') return 'text-amber-300 bg-amber-500/10 border-amber-500/30'
    if (state.level === 'critical') return 'text-orange-300 bg-orange-500/10 border-orange-500/30'
    return 'text-red-300 bg-red-500/10 border-red-500/30'
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
        throw new Error(payload?.error || payload?.message || 'Falha ao ativar emergency mode')
      }
      setReason('')
      await mutate()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao ativar emergency mode')
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
        throw new Error(payload?.error || payload?.message || 'Falha ao desativar emergency mode')
      }
      await mutate()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Erro ao desativar emergency mode')
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">Emergency Control</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Opera o modo de contingência para cargas críticas sem estado fake.
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          Recarregar
        </button>
      </header>

      <section className="mb-6 rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
        {isLoading ? (
          <p className="text-sm text-zinc-500">Carregando estado de emergência...</p>
        ) : state ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs font-medium ${levelTone}`}>
                {state.level.toUpperCase()}
              </span>
              <span className="text-xs text-zinc-500">
                {state.enabled ? 'Modo ativo' : 'Modo inativo'}
              </span>
            </div>
            <p className="text-sm text-zinc-300">
              {state.reason ? state.reason : 'Sem motivo registrado no momento.'}
            </p>
            <p className="text-xs text-zinc-500">
              {state.activatedAt
                ? `Última ativação: ${new Date(state.activatedAt).toLocaleString()} por ${state.activatedBy ?? 'sistema'}`
                : 'Nenhuma ativação recente.'}
            </p>
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Nenhum estado retornado pela API.</p>
        )}
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-100">
            <ShieldAlert className="h-4 w-4 text-amber-300" />
            Ativar Contingência
          </h2>
          <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">Nível</label>
          <select
            value={level}
            onChange={(event) => setLevel(event.target.value as EmergencyLevel)}
            className="mb-4 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
          >
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
            <option value="shutdown">Shutdown</option>
          </select>

          <label className="mb-2 block text-xs uppercase tracking-[0.08em] text-zinc-500">Motivo</label>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            rows={4}
            className="mb-4 w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-sky-500 focus:outline-none"
            placeholder="Ex: pico de custo IA fora do budget, mitigação temporária ativada."
          />

          <button
            onClick={activateEmergency}
            disabled={pending !== null}
            className="inline-flex items-center gap-2 rounded bg-amber-600 px-4 py-2 text-sm font-medium text-amber-50 hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <AlertTriangle className="h-4 w-4" />
            {pending === 'activate' ? 'Ativando...' : 'Ativar Emergency'}
          </button>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-zinc-100">
            <StopCircle className="h-4 w-4 text-rose-300" />
            Normalizar Operação
          </h2>
          <p className="mb-4 text-sm text-zinc-400">
            Desativa o modo de contingência e restaura as políticas normais de execução.
          </p>
          <button
            onClick={deactivateEmergency}
            disabled={!isActive || pending !== null}
            className="inline-flex items-center gap-2 rounded bg-rose-600 px-4 py-2 text-sm font-medium text-rose-50 hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <StopCircle className="h-4 w-4" />
            {pending === 'deactivate' ? 'Desativando...' : 'Desativar Emergency'}
          </button>
        </div>
      </section>

      {error ? (
        <div className="mt-4 rounded border border-rose-500/40 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</div>
      ) : null}
    </div>
  )
}
