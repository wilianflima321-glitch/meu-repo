'use client';

/**
 * AETHEL ENGINE - HEALTH DASHBOARD COMPONENT
 * ==========================================
 *
 * Real-time dashboard showing system health,
 * resource usage, and performance metrics.
 */
import React, { useState, useEffect } from 'react'
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Server,
  Gauge,
  Clock,
  Thermometer,
} from 'lucide-react'
import { CANONICAL_FOCUS, CANONICAL_MOTION } from '@/lib/canonical-spacing'

// ============================================================================
// TYPES
// ============================================================================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'critical' | 'offline'
  uptime: number
  timestamp: number
  components: {
    server: ComponentHealth
    blender: ComponentHealth
    ai: ComponentHealth
    storage: ComponentHealth
    database: ComponentHealth
  }
  metrics: {
    cpu: number
    memory: number
    disk: number
    gpuUsage?: number
    gpuTemp?: number
    networkLatency: number
  }
  activeJobs: number
  queuedJobs: number
  completedToday: number
  errors24h: number
}

export interface ComponentHealth {
  status: 'online' | 'degraded' | 'offline' | 'unknown'
  latency?: number
  lastCheck: number
  message?: string
  version?: string
}

export interface HealthDashboardProps {
  health: SystemHealth | null
  isConnected: boolean
  onRefresh?: () => void
  className?: string
}

// ============================================================================
// HELPERS
// ============================================================================

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  return `${mins}m`
}

function formatLatency(ms: number): string {
  if (ms < 100) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'healthy':
    case 'online':
      return 'text-[var(--aethel-success)]'
    case 'degraded':
      return 'text-[var(--aethel-warning)]'
    case 'critical':
    case 'offline':
      return 'text-[var(--aethel-error)]'
    default:
      return 'text-[var(--aethel-text-tertiary)]'
  }
}

function getStatusBg(status: string): string {
  switch (status) {
    case 'healthy':
    case 'online':
      return 'bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-success)_30%,transparent)]'
    case 'degraded':
      return 'bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-warning)_30%,transparent)]'
    case 'critical':
    case 'offline':
      return 'bg-[color-mix(in_srgb,var(--aethel-error)_10%,transparent)] border-[color-mix(in_srgb,var(--aethel-error)_30%,transparent)]'
    default:
      return 'bg-[color-mix(in_srgb,var(--aethel-border-secondary)_20%,transparent)] border-[color-mix(in_srgb,var(--aethel-border-secondary)_40%,transparent)]'
  }
}

function getMetricColor(value: number, thresholds: [number, number] = [70, 90]): string {
  if (value >= thresholds[1]) return 'text-[var(--aethel-error)]'
  if (value >= thresholds[0]) return 'text-[var(--aethel-warning)]'
  return 'text-[var(--aethel-success)]'
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatusIcon: React.FC<{ status: string; size?: number }> = ({ status, size = 16 }) => {
  const className = `${getStatusColor(status)}`

  switch (status) {
    case 'healthy':
    case 'online':
      return <CheckCircle size={size} className={className} />
    case 'degraded':
      return <AlertTriangle size={size} className={className} />
    case 'critical':
    case 'offline':
      return <XCircle size={size} className={className} />
    default:
      return <Activity size={size} className="text-[var(--aethel-text-tertiary)]" />
  }
}

const MetricBar: React.FC<{
  label: string
  value: number
  icon: React.ReactNode
  suffix?: string
  thresholds?: [number, number]
}> = ({ label, value, icon, suffix = '%', thresholds = [70, 90] }) => {
  const color = getMetricColor(value, thresholds)
  const bgColor = value >= thresholds[1] ? 'bg-[var(--aethel-error-light)]' : value >= thresholds[0] ? 'bg-[var(--aethel-warning-light)]' : 'bg-[var(--aethel-success-light)]'

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-[var(--aethel-text-tertiary)]">
          {icon}
          <span>{label}</span>
        </div>
        <span className={`font-mono ${color}`}>{value.toFixed(1)}{suffix}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_50%,transparent)]">
        <div className={`h-full ${bgColor} transition-all duration-500 ease-out`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
    </div>
  )
}

const ComponentStatus: React.FC<{ name: string; component: ComponentHealth; icon: React.ReactNode }> = ({ name, component, icon }) => {
  return (
    <div className={`flex items-center justify-between rounded-xl border p-3 ${getStatusBg(component.status)}`}>
      <div className="flex items-center gap-3">
        <div className={getStatusColor(component.status)}>{icon}</div>
        <div>
          <div className="text-sm font-semibold text-[var(--aethel-text-primary)]">{name}</div>
          {component.message && <div className="text-xs text-[var(--aethel-text-tertiary)]">{component.message}</div>}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {component.latency !== undefined && (
          <span className="text-xs font-mono text-[var(--aethel-text-tertiary)]">{formatLatency(component.latency)}</span>
        )}
        <StatusIcon status={component.status} />
      </div>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HealthDashboard: React.FC<HealthDashboardProps> = ({ health, isConnected, onRefresh, className = '' }) => {
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const panelClass =
    'rounded-[24px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_22%,transparent)] p-6 shadow-[0_20px_70px_rgba(2,6,23,0.16)]'
  const metricCardClass =
    'rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_34%,transparent)] p-4 text-center'
  const actionButtonClass = `inline-flex items-center gap-2 rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] px-4 py-2 text-xs font-medium text-[var(--aethel-text-primary)] hover:border-[var(--aethel-border-secondary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`
  const ghostIconButtonClass = `inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_44%,transparent)] text-[var(--aethel-text-secondary)] hover:border-[var(--aethel-border-secondary)] hover:text-[var(--aethel-text-primary)] ${CANONICAL_FOCUS} ${CANONICAL_MOTION}`

  useEffect(() => {
    if (health) {
      setLastUpdate(new Date(health.timestamp))
    }
  }, [health])

  if (!isConnected) {
    return (
      <div className={`${panelClass} ${className}`}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <WifiOff size={40} className="mb-4 text-[var(--aethel-error)]" />
          <h3 className="mb-2 text-lg font-semibold text-[var(--aethel-text-primary)]">Desconectado</h3>
          <p className="mb-4 text-sm text-[var(--aethel-text-tertiary)]">Nao foi possivel conectar ao servidor</p>
          {onRefresh && (
            <button type="button" onClick={onRefresh} className={actionButtonClass} aria-label="Reconnect health dashboard">
              <RefreshCw size={16} />
              Reconectar
            </button>
          )}
        </div>
      </div>
    )
  }

  if (!health) {
    return (
      <div className={`${panelClass} ${className}`}>
        <div className="flex flex-col items-center justify-center py-12">
          <RefreshCw size={28} className="mb-4 animate-spin text-[var(--aethel-info)]" />
          <p className="text-sm text-[var(--aethel-text-tertiary)]">Loading health data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${panelClass} ${className}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`rounded-lg border p-2 ${getStatusBg(health.status)}`}>
            <Activity size={20} className={getStatusColor(health.status)} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--aethel-text-primary)]">System Health</h2>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--aethel-text-tertiary)]">
              <Wifi size={14} className="text-[var(--aethel-success)]" />
              <span>Conectado</span>
              <span>•</span>
              <Clock size={14} />
              <span>Uptime: {formatUptime(health.uptime)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBg(health.status)} ${getStatusColor(health.status)}`}>
            {health.status.toUpperCase()}
          </span>
          {onRefresh && (
            <button type="button" onClick={onRefresh} className={ghostIconButtonClass} title="Refresh" aria-label="Refresh health metrics">
              <RefreshCw size={18} className="text-[var(--aethel-text-secondary)]" />
            </button>
          )}
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className={metricCardClass}>
          <div className="text-2xl font-semibold text-[var(--aethel-info)]">{health.activeJobs}</div>
          <div className="text-xs text-[var(--aethel-text-tertiary)]">Jobs actives</div>
        </div>
        <div className={metricCardClass}>
          <div className="text-2xl font-semibold text-[var(--aethel-warning)]">{health.queuedJobs}</div>
          <div className="text-xs text-[var(--aethel-text-tertiary)]">Na fila</div>
        </div>
        <div className={metricCardClass}>
          <div className="text-2xl font-semibold text-[var(--aethel-success)]">{health.completedToday}</div>
          <div className="text-xs text-[var(--aethel-text-tertiary)]">Completos hoje</div>
        </div>
        <div className={metricCardClass}>
          <div className="text-2xl font-semibold text-[var(--aethel-error)]">{health.errors24h}</div>
          <div className="text-xs text-[var(--aethel-text-tertiary)]">Errors 24h</div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Recursos do sistema</h3>
          <MetricBar label="CPU" value={health.metrics.cpu} icon={<Cpu size={14} />} />
          <MetricBar label="Memoria" value={health.metrics.memory} icon={<MemoryStick size={14} />} />
          <MetricBar label="Disco" value={health.metrics.disk} icon={<HardDrive size={14} />} />
          {health.metrics.gpuUsage !== undefined && (
            <MetricBar label="GPU" value={health.metrics.gpuUsage} icon={<Gauge size={14} />} />
          )}
          {health.metrics.gpuTemp !== undefined && (
            <MetricBar label="GPU Temp" value={health.metrics.gpuTemp} icon={<Thermometer size={14} />} suffix="C" thresholds={[70, 85]} />
          )}
          <div className="flex items-center justify-between pt-2 text-xs text-[var(--aethel-text-tertiary)]">
            <div className="flex items-center gap-2">
              <Wifi size={14} />
              <span>Latencia</span>
            </div>
            <span className={`font-mono ${getMetricColor(health.metrics.networkLatency, [100, 500])}`}>
              {health.metrics.networkLatency}ms
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--aethel-text-tertiary)]">Status dos componentes</h3>
          <ComponentStatus name="Servidor" component={health.components.server} icon={<Server size={18} />} />
          <ComponentStatus name="Blender" component={health.components.blender} icon={<Activity size={18} />} />
          <ComponentStatus name="AI Engine" component={health.components.ai} icon={<Activity size={18} />} />
          <ComponentStatus name="Storage" component={health.components.storage} icon={<HardDrive size={18} />} />
          <ComponentStatus name="Database" component={health.components.database} icon={<HardDrive size={18} />} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-between gap-2 border-t border-[var(--aethel-border-subtle)] pt-4 text-xs text-[var(--aethel-text-tertiary)]">
        <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
        <span>Aethel Engine v1.0.0</span>
      </div>
    </div>
  )
}

export default HealthDashboard
