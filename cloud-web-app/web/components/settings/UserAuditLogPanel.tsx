'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Clock3, RefreshCw, ShieldCheck, UserCheck } from 'lucide-react'
import { createComponentLogger } from '@/lib/observability/logger';

type AuditActor = 'you' | 'aethel_operator' | 'system'

type UserAuditEvent = {
  id: string
  action: string
  title: string
  category: string
  severity: string
  actor: AuditActor
  target: string | null
  resource: string | null
  reason: string | null
  metadata: Record<string, string | number | boolean>
  requestId: string | null
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

type AuditLogResponse = {
  events: UserAuditEvent[]
  summary: {
    totalReturned: number
    critical: number
    warnings: number
    categories: Record<string, number>
  }
  privacy: {
    metadata: string
    ipAddress: string
    adminIdentity: string
  }
}

const logger = createComponentLogger('UserAuditLogPanel')

function formatDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  } catch {
    return value
  }
}

function actorLabel(actor: AuditActor): string {
  if (actor === 'you') return 'Voce'
  if (actor === 'aethel_operator') return 'Operador Aethel'
  return 'Sistema'
}

function severityClass(severity: string): string {
  if (severity === 'critical') {
    return 'border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_12%,transparent)] text-[var(--aethel-error-light)]'
  }
  if (severity === 'warning') {
    return 'border-[color-mix(in_srgb,var(--aethel-warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] text-[var(--aethel-warning-light)]'
  }
  return 'border-[color-mix(in_srgb,var(--aethel-success)_35%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] text-[var(--aethel-success-light)]'
}

function metadataPreview(metadata: Record<string, string | number | boolean>): string {
  const entries = Object.entries(metadata)
  if (entries.length === 0) return 'Sem metadados sensiveis expostos.'
  return entries.slice(0, 4).map(([key, value]) => `${key}: ${String(value)}`).join(' · ')
}

export default function UserAuditLogPanel() {
  const [data, setData] = useState<AuditLogResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAuditLog = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch('/api/me/audit-log?limit=12', { cache: 'no-store' })
      const payload = (await response.json().catch(() => null)) as AuditLogResponse | { error?: string } | null

      if (!response.ok || !payload || !('events' in payload)) {
        throw new Error((payload && 'error' in payload && payload.error) || 'Nao foi possivel carregar a atividade da conta.')
      }

      setData(payload)
    } catch (loadError) {
      logger.warn('Failed to load user audit log', loadError)
      setError(loadError instanceof Error ? loadError.message : 'Nao foi possivel carregar a atividade da conta.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadAuditLog()
  }, [loadAuditLog])

  const categorySummary = useMemo(() => {
    const categories = data?.summary.categories ?? {}
    return Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
  }, [data])

  return (
    <section className="mt-6 rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_56%,transparent)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[var(--aethel-info)]" />
            <h3 className="text-sm font-semibold text-[var(--aethel-text-primary)]">Atividade auditavel da conta</h3>
          </div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--aethel-text-secondary)]">
            Eventos recentes com metadados filtrados, IP mascarado e identidade de operadores protegida.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            void loadAuditLog()
          }}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs text-[var(--aethel-text-secondary)] transition hover:bg-[var(--aethel-surface-tertiary)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {data && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Eventos</p>
            <p className="mt-1 text-lg font-semibold text-[var(--aethel-text-primary)]">{data.summary.totalReturned}</p>
          </div>
          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Alertas</p>
            <p className="mt-1 text-lg font-semibold text-[var(--aethel-warning)]">{data.summary.warnings + data.summary.critical}</p>
          </div>
          <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/35 p-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--aethel-text-tertiary)]">Privacidade</p>
            <p className="mt-1 text-xs text-[var(--aethel-text-secondary)]">IP {data.privacy.ipAddress}, metadata {data.privacy.metadata}</p>
          </div>
        </div>
      )}

      {categorySummary.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {categorySummary.map(([category, count]) => (
            <span key={category} className="rounded-full border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/45 px-2.5 py-1 text-[11px] text-[var(--aethel-text-secondary)]">
              {category}: {count}
            </span>
          ))}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-[color-mix(in_srgb,var(--aethel-warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_12%,transparent)] p-3 text-xs text-[var(--aethel-warning-light)]" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="mt-4 space-y-2" aria-live="polite">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-16 animate-pulse rounded-lg bg-[var(--aethel-surface-tertiary)]/70" />
          ))}
        </div>
      )}

      {!loading && data?.events.length === 0 && !error && (
        <div className="mt-4 rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/35 p-4 text-sm text-[var(--aethel-text-secondary)]">
          Nenhum evento auditavel recente para sua conta.
        </div>
      )}

      {!loading && data && data.events.length > 0 && (
        <div className="mt-4 space-y-2">
          {data.events.map((event) => (
            <article key={event.id} className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[var(--aethel-surface-primary)]/40 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] ${severityClass(event.severity)}`}>
                      {event.severity}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-[var(--aethel-text-tertiary)]">
                      <UserCheck className="h-3 w-3" /> {actorLabel(event.actor)}
                    </span>
                  </div>
                  <h4 className="mt-2 text-sm font-semibold text-[var(--aethel-text-primary)]">{event.title}</h4>
                  <p className="mt-1 text-xs leading-5 text-[var(--aethel-text-secondary)]">
                    {event.reason || metadataPreview(event.metadata)}
                  </p>
                </div>
                <div className="inline-flex items-center gap-1 text-[11px] text-[var(--aethel-text-tertiary)]">
                  <Clock3 className="h-3 w-3" /> {formatDateTime(event.createdAt)}
                </div>
              </div>
              {(event.target || event.resource || event.ipAddress) && (
                <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-[var(--aethel-text-tertiary)]">
                  {event.target && <span className="rounded border border-[var(--aethel-border-secondary)] px-2 py-1">target {event.target}</span>}
                  {event.resource && <span className="rounded border border-[var(--aethel-border-secondary)] px-2 py-1">resource {event.resource}</span>}
                  {event.ipAddress && <span className="rounded border border-[var(--aethel-border-secondary)] px-2 py-1">ip {event.ipAddress}</span>}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {data && data.summary.critical > 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-error)_45%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] p-3 text-xs text-[var(--aethel-error-light)]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Revise eventos criticos e altere sua senha se algo nao foi iniciado por voce.
        </div>
      )}
    </section>
  )
}
