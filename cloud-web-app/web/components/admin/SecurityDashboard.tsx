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
  totalBlocked24h: number
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
  <div className="aethel-card aethel-p-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-9 w-9 rounded-lg bg-white/10" />
      <div className="h-4 w-12 rounded bg-white/10" />
    </div>
    <div className="mt-3 h-8 w-20 rounded bg-white/10" />
    <div className="mt-2 h-4 w-24 rounded bg-white/10" />
  </div>
)

const SkeletonEventRow: React.FC = () => (
  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 animate-pulse">
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-6 w-20 rounded-full bg-white/10" />
          <div className="h-6 w-28 rounded bg-white/10" />
        </div>
        <div className="mb-2 h-5 w-3/4 rounded bg-white/10" />
        <div className="flex items-center gap-4">
          <div className="h-4 w-24 rounded bg-white/10" />
          <div className="h-4 w-16 rounded bg-white/10" />
          <div className="h-4 w-20 rounded bg-white/10" />
        </div>
      </div>
      <div className="flex items-center gap-1">
        <div className="h-8 w-8 rounded bg-white/10" />
        <div className="h-8 w-8 rounded bg-white/10" />
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
    <h3 className="mb-2 text-lg font-semibold text-white">Erro ao carregar dados</h3>
    <p className="mb-4 max-w-md text-sm text-zinc-500">{message}</p>
    <button onClick={onRetry} className="aethel-button aethel-button-primary flex items-center gap-2 text-xs">
      <RefreshCw className="h-4 w-4" />
      Tentar novamente
    </button>
  </div>
)

const EmptyState: React.FC = () => (
  <div className="flex flex-col items-center justify-center py-12 text-center">
    <ShieldCheck className="mb-4 h-16 w-16 text-[var(--aethel-success-light)]/60" />
    <h3 className="mb-2 text-lg font-semibold text-white">Nenhum evento de seguranca</h3>
    <p className="max-w-md text-sm text-zinc-500">
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
  critical: { color: 'bg-[var(--aethel-error)]/15 text-[var(--aethel-error-light)] border-rose-500/30', icon: ShieldX, label: 'CRITICO' },
  high: { color: 'bg-orange-500/15 text-orange-300 border-orange-500/30', icon: ShieldAlert, label: 'ALTO' },
  medium: { color: 'bg-[var(--aethel-warning)]/15 text-[var(--aethel-warning-light)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]', icon: AlertTriangle, label: 'MEDIO' },
  low: { color: 'bg-[var(--aethel-info)]/15 text-[var(--aethel-info-light)] border-[color-mix(in_srgb,var(--aethel-info)_30%,transparent)]', icon: Shield, label: 'BAIXO' },
  info: { color: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30', icon: ShieldCheck, label: 'INFO' },
}

const THREAT_TYPE_LABELS: Record<ThreatType, string> = {
  prompt_injection: 'Injecao de prompt',
  code_injection: 'Injecao de codigo',
  rate_limit: 'Limite de taxa',
  path_traversal: 'Travessia de caminho',
  auth_failure: 'Falha de auth',
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
  <span className="rounded-md bg-white/5 px-2 py-1 text-xs text-zinc-300">
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
  <div className={`aethel-card aethel-p-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div className="rounded-lg bg-white/[0.05] p-2 text-zinc-400">{icon}</div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs ${trend > 0 ? 'text-[var(--aethel-error-light)]' : 'text-[var(--aethel-success-light)]'}`}>
          <TrendingUp className={`h-3 w-3 ${trend < 0 ? 'rotate-180' : ''}`} />
          {Math.abs(trend)}%
        </div>
      )}
    </div>
    <p className="mt-3 text-2xl font-semibold text-white">{value.toLocaleString()}</p>
    <p className="text-sm text-zinc-500">{label}</p>
  </div>
)

const EventRow: React.FC<{
  event: SecurityEvent
  onBlock: () => void
  onInvestigate: () => void
}> = ({ event, onBlock, onInvestigate }) => {
  const levelColors: Record<ThreatLevel, string> = {
    critical: 'border-l-rose-500',
    high: 'border-l-orange-500',
    medium: 'border-l-yellow-500',
    low: 'border-l-sky-500',
    info: 'border-l-zinc-500',
  }

  return (
    <div className={`rounded-xl border border-white/10 border-l-4 ${levelColors[event.level]} bg-white/[0.03] p-3`}>
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

          <p className="mb-1 text-sm font-medium text-white">{event.description}</p>

          <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
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
          <button
            onClick={onInvestigate}
            className="aethel-button aethel-button-ghost rounded-md p-2 text-[var(--aethel-info-light)]"
            title="Investigar"
          >
            <Eye className="h-4 w-4" />
          </button>
          {!event.blocked && (
            <button
              onClick={onBlock}
              className="aethel-button aethel-button-ghost rounded-md p-2 text-[var(--aethel-error-light)]"
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
    totalBlocked24h: 0,
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
        throw new Error(`Falha ao buscar rate limits: ${rateLimitsResponse.status} ${rateLimitsResponse.statusText}`)
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
        totalBlocked24h: parsedEvents.filter((event) => event.blocked).length,
        criticalThreats: parsedEvents.filter((event) => event.level === 'critical').length,
        activeAttacks: eventsData.activeAttacks || 0,
        blockedIPs: rateLimitsData.blockedIPs || 0,
        rateLimitHits: parsedEvents.filter((event) => event.type === 'rate_limit').length,
        promptInjections: parsedEvents.filter((event) => event.type === 'prompt_injection').length,
      })
    } catch (err) {
      console.error('Failed to fetch security data:', err)
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

  const handleBlock = (id: string) => {
    setEvents((prev) => prev.map((event) => (event.id === id ? { ...event, blocked: true } : event)))
  }

  if (error && !isRefreshing) {
    return (
      <div className={`aethel-card ${className}`}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Shield className="h-5 w-5 text-[var(--aethel-success-light)]" />
          <div>
            <h2 className="text-base font-semibold text-white">Central de seguranca</h2>
            <p className="text-xs text-zinc-500">Monitoramento de ameacas em tempo real</p>
          </div>
        </div>
        <ErrorState message={error} onRetry={fetchEvents} />
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className={`aethel-card ${className}`}>
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
          <Shield className="h-5 w-5 text-[var(--aethel-success-light)]" />
          <div>
            <h2 className="text-base font-semibold text-white">Central de seguranca</h2>
            <p className="text-xs text-zinc-500">Monitoramento de ameacas em tempo real</p>
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
    <div className={`aethel-card ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-[var(--aethel-success-light)]" />
          <div>
            <h2 className="text-base font-semibold text-white">Central de seguranca</h2>
            <p className="text-xs text-zinc-500">Monitoramento de ameacas em tempo real</p>
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

          <button
            onClick={fetchEvents}
            disabled={isRefreshing}
            className="aethel-button aethel-button-primary flex items-center gap-2 text-xs"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <StatsCard
          label="Bloqueados (24h)"
          value={stats.totalBlocked24h}
          icon={<ShieldCheck className="h-5 w-5 text-[var(--aethel-success-light)]" />}
          color="border border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)] bg-[var(--aethel-success)]/5"
        />
        <StatsCard
          label="Criticos"
          value={stats.criticalThreats}
          icon={<ShieldX className="h-5 w-5 text-[var(--aethel-error-light)]" />}
          trend={15}
          color="border border-rose-500/30 bg-[var(--aethel-error)]/5"
        />
        <StatsCard
          label="IPs bloqueados"
          value={stats.blockedIPs}
          icon={<Ban className="h-5 w-5 text-orange-300" />}
          color="border border-orange-500/30 bg-orange-500/5"
        />
        <StatsCard
          label="Rate limits"
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
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Buscar eventos..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="aethel-input w-full pl-9 text-xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-500" />
          <select
            value={filterLevel}
            onChange={(event) => setFilterLevel(event.target.value as ThreatLevel | 'all')}
            className="aethel-input text-xs"
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
            className="aethel-input text-xs"
          >
            <option value="all">Todos tipos</option>
            <option value="prompt_injection">Injecao de prompt</option>
            <option value="code_injection">Injecao de codigo</option>
            <option value="rate_limit">Limite de taxa</option>
            <option value="path_traversal">Travessia de caminho</option>
            <option value="auth_failure">Falha de auth</option>
            <option value="suspicious_pattern">Padrao suspeito</option>
          </select>
        </div>
      </div>

      <div className="max-h-[500px] space-y-3 overflow-y-auto px-4 pb-4">
        {filteredEvents.length === 0 && events.length === 0 ? (
          <EmptyState />
        ) : filteredEvents.length === 0 ? (
          <div className="aethel-state aethel-state-empty">
            <Lock className="mb-2 h-10 w-10 text-zinc-500" />
            <p>Nenhum evento encontrado com os filtros selecionados.</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              onBlock={() => handleBlock(event.id)}
              onInvestigate={() => console.log('Investigate:', event.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

export default SecurityDashboard
