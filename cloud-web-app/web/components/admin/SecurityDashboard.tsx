'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Activity,
  AlertTriangle,
  Ban,
  Clock,
  Eye,
  Filter,
  Globe,
  Lock,
  RefreshCw,
  Search,
  TrendingUp,
  User,
  Zap,
  AlertCircle,
} from 'lucide-react'
import { CANONICAL_FOCUS, CANONICAL_MOTION, CANONICAL_TYPOGRAPHY } from '@/lib/canonical-spacing'

// ============================================================================
// TYPES
// ============================================================================

type ThreatLevel = 'critical' | 'high' | 'medium' | 'low' | 'info'
type ThreatType =
  | 'prompt_injection'
  | 'code_injection'
  | 'rate_limit'
  | 'path_traversal'
  | 'auth_failure'
  | 'suspicious_pattern'

interface SecurityEvent {
  id: string
  timestamp: Date
  type: ThreatType
  level: ThreatLevel
  source: string
  userId?: string
  ip?: string
  description: string
  blocked: boolean
  details?: Record<string, unknown>
}

interface SecurityStats {
  totalBloqueado24h: number
  criticalThreats: number
  activeAttacks: number
  blockedIPs: number
  rateLimitHits: number
  promptInjections: number
}

// ============================================================================
// SKELETONS
// ============================================================================

const SkeletonCard: React.FC = () => (
  <div className="rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] p-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-9 w-9 rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
      <div className="h-4 w-12 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
    </div>
    <div className="mt-3 h-8 w-20 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
    <div className="mt-2 h-4 w-24 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
  </div>
)

const SkeletonEventRow: React.FC = () => (
  <div className="rounded-xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] p-3 animate-pulse">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-20 rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
          <div className="h-6 w-28 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
        </div>
        <div className="mb-2 h-5 w-3/4 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
          <div className="h-4 w-16 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
          <div className="h-4 w-20 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
        <div className="h-8 w-8 rounded bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_88%,transparent)]" />
      </div>
    </div>
  </div>
)

// ============================================================================
// STATES
// ============================================================================

const ErrorState: React.FC<{ message: string; onRetry: () => void }> = ({ message, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <AlertCircle className="mb-4 h-12 w-12 text-[var(--aethel-error-light)]" />
    <h3 className="mb-2 text-lg font-semibold text-[var(--aethel-text-primary)]">Erro ao carregar dados</h3>
    <p className="mb-4 max-w-md text-sm text-[var(--aethel-text-tertiary)]">{message}</p>
    <button type="button" aria-label="Tentar carregar eventos de seguranca novamente" onClick={onRetry} className={`inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_32px_rgba(56,189,248,0.24)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:brightness-110`}>
      <RefreshCw className="h-4 w-4" />
      Tentar novamente
    </button>
  </div>
)

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <ShieldCheck className="mb-4 h-16 w-16 text-[var(--aethel-success-light)]/60" />
    <h3 className="mb-2 text-lg font-semibold text-[var(--aethel-text-primary)]">Nenhum evento de seguranca</h3>
    <p className="max-w-md text-sm text-[var(--aethel-text-tertiary)]">
      Nenhum evento registrado. O ambiente esta protegido e operando normalmente.
    </p>
  </div>
)

// ============================================================================
// COMPONENTS
// ============================================================================

const THREAT_LEVELS: Record<
  ThreatLevel,
  { color: string; icon: React.ElementType; label: string }
> = {
  critical: { color: 'bg-[var(--aethel-error)]/15 text-[var(--aethel-error-light)] border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]', icon: ShieldX, label: 'CRITICO' },
  high: { color: 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]', icon: ShieldAlert, label: 'ALTO' },
  medium: { color: 'bg-[var(--aethel-warning)]/15 text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]', icon: AlertTriangle, label: 'MEDIO' },
  low: { color: 'bg-[var(--aethel-info)]/15 text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]', icon: Shield, label: 'BAIXO' },
  info: { color: 'bg-[color-mix(in_srgb,var(--aethel-text-tertiary)_15%,transparent)] text-[var(--aethel-text-secondary)] border-[color-mix(in_srgb,var(--aethel-text-tertiary)_35%,transparent)]', icon: ShieldCheck, label: 'INFO' },
}

const THREAT_TYPE_LABELS: Record<ThreatType, string> = {
  prompt_injection: 'Injecao de prompt',
  code_injection: 'Injecao de codigo',
  rate_limit: 'Limite de taxa',
  path_traversal: 'Travessia de caminho',
  auth_failure: 'Falha de autenticacao',
  suspicious_pattern: 'Padrao suspeito',
}

const ThreatLevelBadge: React.FC<{ level: ThreatLevel }> = ({ level }) => {
  const { color, icon: Icon, label } = THREAT_LEVELS[level]
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${color}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}

const ThreatTypeBadge: React.FC<{ type: ThreatType }> = ({ type }) => (
  <span className="rounded-md bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] px-2 py-1 text-xs text-[var(--aethel-text-secondary)]">
    {THREAT_TYPE_LABELS[type]}
  </span>
)

const StatsCard: React.FC<{
  label: string
  value: number
  icon: React.ReactNode
  trend?: number
  color: string
}> = ({ label, value, icon, trend, color }) => (
  <div className={`rounded-2xl border p-4 shadow-[0_18px_48px_rgba(2,6,23,0.16)] ${color}`}>
    <div className="flex items-center justify-between">
      <div className="rounded-lg bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_35%,transparent)] p-2 text-[var(--aethel-text-tertiary)]">{icon}</div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-success-light)]'}`}>
          <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="mt-3 text-2xl font-semibold text-[var(--aethel-text-primary)]">{value.toLocaleString()}</p>
    <p className="text-sm text-[var(--aethel-text-tertiary)]">{label}</p>
  </div>
)

const EventRow: React.FC<{
  event: SecurityEvent
  onBloquear: () => void
  onInvestigate: () => void
}> = ({ event, onBloquear, onInvestigate }) => {
  const levelColors: Record<ThreatLevel, string> = {
    critical: 'border-l-[var(--aethel-error)]',
    high: 'border-l-[var(--aethel-warning)]',
    medium: 'border-l-yellow-500',
    low: 'border-l-[var(--aethel-info)]',
    info: 'border-l-[color-mix(in_srgb,var(--aethel-text-tertiary)_40%,transparent)]',
  }

  return (
    <div className={`rounded-xl border border-[var(--aethel-border-primary)] border-l-4 ${levelColors[event.level]} bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_80%,transparent)] p-3`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <ThreatLevelBadge level={event.level} />
            <ThreatTypeBadge type={event.type} />
            {event.blocked && (
              <span className="rounded-md bg-[var(--aethel-success)]/20 px-2 py-1 text-xs text-[var(--aethel-success-light)]">
                Bloqueado
              </span>
            )}
          </div>

          <p className="mb-1 text-sm font-medium text-[var(--aethel-text-primary)]">{event.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--aethel-text-tertiary)]">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {event.timestamp.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {event.source}
            </span>
            {event.ip && (
              <span className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {event.ip}
              </span>
            )}
            {event.userId && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {event.userId}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button type="button" aria-label="Investigar evento de seguranca"
            onClick={onInvestigate}
            className={`inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] p-2 text-[var(--aethel-info-light)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]`}
            title="Investigar"
          >
            <Eye className="h-4 w-4" />
          </button>
          {!event.blocked && (
            <button type="button" aria-label="Bloquear origem do evento"
              onClick={onBloquear}
              className={`inline-flex items-center justify-center rounded-lg border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)] p-2 text-[var(--aethel-error-light)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)]`}
              title="Bloquear IP"
            >
              <Ban className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SecurityDashboard: React.FC<{ className?: string }> = ({ className = '' }) => {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [stats, setStats] = useState<SecurityStats>({
    totalBloqueado24h: 0,
    criticalThreats: 0,
    activeAttacks: 0,
    blockedIPs: 0,
    rateLimitHits: 0,
    promptInjections: 0,
  })
  const [filterLevel, setFilterLevel] = useState<ThreatLevel | 'all'>('all')
  const [filterType, setFilterType] = useState<ThreatType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (isLoading) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }
    setError(null)

    try {
      const [eventsResponse, rateLimitsResponse] = await Promise.all([
        fetch('/api/admin/security/events'),
        fetch('/api/admin/security/rate-limits'),
      ])

      if (!eventsResponse.ok) {
        throw new Error(`Falha ao buscar eventos: ${eventsResponse.status} ${eventsResponse.statusText}`)
      }

      if (!rateLimitsResponse.ok) {
        throw new Error(`Falha ao buscar limites de taxa: ${rateLimitsResponse.status} ${rateLimitsResponse.statusText}`)
      }

      const eventsData = await eventsResponse.json()
      const rateLimitsData = await rateLimitsResponse.json()

      const parsedEvents: SecurityEvent[] = (eventsData.events || [])
        .map((event: Record<string, unknown>) => ({
          ...event,
          timestamp: new Date(event.timestamp as string),
        }))
        .sort((a: SecurityEvent, b: SecurityEvent) => b.timestamp.getTime() - a.timestamp.getTime())

      setEvents(parsedEvents)
      setStats({
        totalBloqueado24h: parsedEvents.filter((event) => event.blocked).length,
        criticalThreats: parsedEvents.filter((event) => event.level === 'critical').length,
        activeAttacks: eventsData.activeAttacks || 0,
        blockedIPs: rateLimitsData.blockedIPs || 0,
        rateLimitHits: parsedEvents.filter((event) => event.type === 'rate_limit').length,
        promptInjections: parsedEvents.filter((event) => event.type === 'prompt_injection').length,
      })
    } catch (err) {
      console.error('Falha ao buscar dados de seguranca:', err)
      setError(err instanceof Error ? err.message : 'Erro desconhecido ao buscar dados de seguranca')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [isLoading])

  useEffect(() => {
    fetchEvents()
    const interval = setInterval(fetchEvents, 15000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  const filteredEvents = events.filter((event) => {
    if (filterLevel !== 'all' && event.level !== filterLevel) return false
    if (filterType !== 'all' && event.type !== filterType) return false
    if (searchQuery && !event.description.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const handleBloquear = (id: string) => {
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, blocked: true } : event)))
  }

  if (error && !isRefreshing) {
    return (
      <div className={`rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] shadow-[0_18px_48px_rgba(2,6,23,0.2)] ${className}`}>
        <div className="flex items-center gap-3 border-b border-[var(--aethel-border-primary)] px-4 py-3">
          <Shield className="h-5 w-5 text-[var(--aethel-success-light)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">Central de seguranca</h2>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Monitoramento de ameacas em tempo real</p>
          </div>
        </div>
        <ErrorState message={error} onRetry={fetchEvents} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] shadow-[0_18px_48px_rgba(2,6,23,0.2)] ${className}`}>
        <div className="flex items-center gap-3 border-b border-[var(--aethel-border-primary)] px-4 py-3">
          <Shield className="h-5 w-5 text-[var(--aethel-success-light)]" />
          <div>
            <h2 className="text-base font-semibold text-[var(--aethel-text-primary)]">Central de seguranca</h2>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Monitoramento de ameacas em tempo real</p>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, index) => (
            <SkeletonCard key={index} />
          ))}
        </div>
        <div className="space-y-2 px-4 pb-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <SkeletonEventRow key={index} />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className={`rounded-2xl border border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_78%,transparent)] shadow-[0_18px_48px_rgba(2,6,23,0.2)] ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--aethel-border-primary)] px-4 py-3">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-[var(--aethel-success-light)]" />
          <div>
            <h2 className={`${CANONICAL_TYPOGRAPHY.h3} text-[var(--aethel-text-primary)]`}>Central de seguranca</h2>
            <p className="text-xs text-[var(--aethel-text-tertiary)]">Monitoramento de ameacas em tempo real</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              stats.activeAttacks > 0 ? 'bg-[var(--aethel-error)]/20 text-[var(--aethel-error-light)] animate-pulse' : 'bg-[var(--aethel-success)]/20 text-[var(--aethel-success-light)]'
            }`}
          >
            {stats.activeAttacks > 0 ? `${stats.activeAttacks} ataques ativos` : 'Sistema seguro'}
          </div>

          <button type="button" aria-label="Atualizar eventos de seguranca"
            onClick={fetchEvents}
            disabled={isRefreshing}
            className={`inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,rgba(79,70,229,0.95),rgba(14,165,233,0.9))] px-4 py-2 text-xs font-semibold text-white shadow-[0_14px_32px_rgba(56,189,248,0.24)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS} hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatsCard
          label="Bloqueados (24h)"
          value={stats.totalBloqueado24h}
          icon={<ShieldCheck className="h-5 w-5 text-[var(--aethel-success-light)]" />}
          color="border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-success)]/5"
        />
        <StatsCard
          label="Criticos"
          value={stats.criticalThreats}
          icon={<ShieldX className="h-5 w-5 text-[var(--aethel-error-light)]" />}
          trend={15}
          color="border border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)] bg-[var(--aethel-error)]/5"
        />
        <StatsCard
          label="IPs bloqueados"
          value={stats.blockedIPs}
          icon={<Ban className="h-5 w-5 text-[var(--aethel-warning-light)]" />}
          color="border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[var(--aethel-warning)]/5"
        />
        <StatsCard
          label="Limites de taxa"
          value={stats.rateLimitHits}
          icon={<Activity className="h-5 w-5 text-[var(--aethel-warning-light)]" />}
          color="border border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)] bg-[var(--aethel-warning)]/5"
        />
        <StatsCard
          label="Injecoes de prompt"
          value={stats.promptInjections}
          icon={<AlertTriangle className="h-5 w-5 text-[var(--aethel-info-light)]" />}
          trend={-8}
          color="border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[var(--aethel-info)]/5"
        />
        <StatsCard
          label="Ataques ativos"
          value={stats.activeAttacks}
          icon={<Zap className="h-5 w-5 text-[var(--aethel-info-light)]" />}
          color="border border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)] bg-[var(--aethel-info)]/5"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3 px-4 pb-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--aethel-text-tertiary)]" />
          <input
            type="text"
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className={`w-full rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] pl-9 pr-3 py-2 text-xs text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-tertiary)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
            aria-label="Buscar eventos de seguranca"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-[var(--aethel-text-tertiary)]" />
          <select
            value={filterLevel}
            onChange={(event) => setFilterLevel(event.target.value as ThreatLevel | 'all')}
            className={`rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
            aria-label="Filtrar eventos por nivel"
          >
            <option value="all">Todos niveis</option>
            <option value="critical">Critico</option>
            <option value="high">Alto</option>
            <option value="medium">Medio</option>
            <option value="low">Baixo</option>
            <option value="info">Info</option>
          </select>

          <select
            value={filterType}
            onChange={(event) => setFilterType(event.target.value as ThreatType | 'all')}
            className={`rounded-xl border border-[var(--aethel-border-primary)] bg-[var(--aethel-surface-primary)] px-3 py-2 text-xs text-[var(--aethel-text-primary)] ${CANONICAL_MOTION} ${CANONICAL_FOCUS}`}
            aria-label="Filtrar eventos por tipo"
          >
            <option value="all">Todos tipos</option>
            <option value="prompt_injection">Injecao de prompt</option>
            <option value="code_injection">Injecao de codigo</option>
            <option value="rate_limit">Limite de taxa</option>
            <option value="path_traversal">Travessia de caminho</option>
            <option value="auth_failure">Falha de autenticacao</option>
            <option value="suspicious_pattern">Padrao suspeito</option>
          </select>
        </div>
      </div>

      <div className="max-h-[500px] space-y-3 overflow-y-auto px-4 pb-4">
        {filteredEvents.length === 0 && events.length === 0 ? (
          <EmptyState />
        ) : filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--aethel-border-primary)] bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_72%,transparent)] px-6 py-12 text-center">
            <Lock className="mb-2 h-10 w-10 text-[var(--aethel-text-tertiary)]" />
            <p className="text-sm font-medium text-[var(--aethel-text-primary)]">Nenhum evento encontrado com os filtros selecionados.</p>
            <p className="mt-1 text-xs text-[var(--aethel-text-tertiary)]">Ajuste os filtros ou aguarde novos sinais de seguranca.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onBloquear={() => handleBloquear(event.id)}
              onInvestigate={() => console.log('Investigate:', event.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default SecurityDashboard
