/**
 * Admin Monitoring Dashboard
 * /admin/monitoring - Observabilidade de infraestrutura
 * Exibe taxa de erros, latencia, usuarios ativos e status dos health checks.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { getToken } from '@/lib/auth'
import { Badge } from '@/components/ui/Badge'
import { AdminMetricCard } from '@/components/admin/AdminMetricCard'

interface HealthCheckResult {
  endpoint: string
  status: 'healthy' | 'degraded' | 'down'
  latencyMs: number
  lastChecked: string
}

interface MonitoringMetrics {
  errorRate: number
  p50Latency: number
  p95Latency: number
  activeUsers: number
  requestsPerMinute: number
  uptimePercent: number
  healthChecks: HealthCheckResult[]
}

const HEALTH_ENDPOINTS = [
  { name: 'Liveness', path: '/api/health/live' },
  { name: 'Readiness', path: '/api/health/ready' },
  { name: 'Startup', path: '/api/health/startup' },
  { name: 'Banco de dados', path: '/api/health/db' },
  { name: 'Cache', path: '/api/health/cache' },
  { name: 'Provedor IA', path: '/api/health/ai' },
  { name: 'Stripe', path: '/api/health/stripe' },
  { name: 'Storage', path: '/api/health/storage' },
]

const STATUS_LABELS: Record<HealthCheckResult['status'], string> = {
  healthy: 'Operacional',
  degraded: 'Parcial',
  down: 'Indisponivel',
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === 'healthy' ? 'bg-emerald-400' :
    status === 'degraded' ? 'bg-amber-400' :
    'bg-red-400'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
}

export default function AdminMonitoringPage() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  const runHealthChecks = useCallback(async (): Promise<HealthCheckResult[]> => {
    const results: HealthCheckResult[] = []
    for (const ep of HEALTH_ENDPOINTS) {
      const start = performance.now()
      try {
        const token = getToken()
        const res = await fetch(ep.path, {
          cache: 'no-store',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const latencyMs = Math.round(performance.now() - start)
        results.push({
          endpoint: ep.name,
          status: res.ok ? 'healthy' : 'degraded',
          latencyMs,
          lastChecked: new Date().toISOString(),
        })
      } catch {
        results.push({
          endpoint: ep.name,
          status: 'down',
          latencyMs: Math.round(performance.now() - start),
          lastChecked: new Date().toISOString(),
        })
      }
    }
    return results
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const healthChecks = await runHealthChecks()
      const healthyCount = healthChecks.filter(h => h.status === 'healthy').length
      const latencies = healthChecks.map(h => h.latencyMs).sort((a, b) => a - b)
      const p50 = latencies[Math.floor(latencies.length * 0.5)] || 0
      const p95 = latencies[Math.floor(latencies.length * 0.95)] || 0

      setMetrics({
        errorRate: ((healthChecks.length - healthyCount) / healthChecks.length) * 100,
        p50Latency: p50,
        p95Latency: p95,
        activeUsers: 0, // Would come from analytics
        requestsPerMinute: 0, // Would come from telemetry
        uptimePercent: (healthyCount / healthChecks.length) * 100,
        healthChecks,
      })
      setLastRefresh(new Date().toISOString())
    } catch (err) {
      console.error('[admin/monitoring] Error:', err)
    } finally {
      setLoading(false)
    }
  }, [runHealthChecks])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 30_000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [refresh])

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Monitoramento de infraestrutura</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Health checks em tempo real e metricas de performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-zinc-500">
                Ultima atualizacao: {new Date(lastRefresh).toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Verificando...' : 'Atualizar'}
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        {metrics && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <AdminMetricCard
              title="Uptime"
              value={`${metrics.uptimePercent.toFixed(1)}%`}
              subtitle="Taxa de aprovacao dos checks"
              trend={metrics.uptimePercent >= 99 ? 'up' : metrics.uptimePercent >= 90 ? 'neutral' : 'down'}
            />
            <AdminMetricCard
              title="Taxa de erro"
              value={`${metrics.errorRate.toFixed(1)}%`}
              subtitle="Health checks com falha"
              trend={metrics.errorRate <= 1 ? 'up' : metrics.errorRate <= 5 ? 'neutral' : 'down'}
            />
            <AdminMetricCard
              title="Latencia P50"
              value={`${metrics.p50Latency}ms`}
              subtitle="Tempo de resposta mediano"
              trend={metrics.p50Latency <= 200 ? 'up' : metrics.p50Latency <= 500 ? 'neutral' : 'down'}
            />
            <AdminMetricCard
              title="Latencia P95"
              value={`${metrics.p95Latency}ms`}
              subtitle="Percentil 95"
              trend={metrics.p95Latency <= 500 ? 'up' : metrics.p95Latency <= 2000 ? 'neutral' : 'down'}
            />
          </div>
        )}

        {/* Health Checks Table */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02]">
          <div className="border-b border-white/10 px-6 py-4">
            <h2 className="text-lg font-semibold">Checks de saude dos servicos</h2>
          </div>
          <div className="divide-y divide-white/5">
            {metrics?.healthChecks.map((check) => (
              <div
                key={check.endpoint}
                className="flex items-center justify-between px-6 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={check.status} />
                  <span className="font-medium">{check.endpoint}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-zinc-400">
                    {check.latencyMs}ms
                  </span>
                  <Badge
                    variant={
                      check.status === 'healthy' ? 'success' :
                      check.status === 'degraded' ? 'warning' : 'error'
                    }
                    size="sm"
                  >
                    {STATUS_LABELS[check.status]}
                  </Badge>
                </div>
              </div>
            ))}
            {loading && !metrics && (
              <div className="px-6 py-12 text-center text-zinc-500">
                Executando health checks...
              </div>
            )}
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="text-lg font-semibold mb-4">Limiares de alerta</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Taxa de erro', threshold: '> 1%', current: metrics ? `${metrics.errorRate.toFixed(1)}%` : '...' },
              { label: 'Latencia P95', threshold: '> 2000ms', current: metrics ? `${metrics.p95Latency}ms` : '...' },
              { label: 'Falhas de health check', threshold: 'Qualquer critica', current: metrics ? `${metrics.healthChecks.filter(h => h.status === 'down').length} indisponivel` : '...' },
            ].map((alert) => (
              <div key={alert.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
                <div className="text-xs text-zinc-500">{alert.label}</div>
                <div className="mt-1 text-sm font-medium">{alert.current}</div>
                <div className="mt-0.5 text-xs text-zinc-600">Limiar: {alert.threshold}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
