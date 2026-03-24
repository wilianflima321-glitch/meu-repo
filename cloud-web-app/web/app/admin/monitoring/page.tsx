/**
 * Admin Monitoring Dashboard
 * /admin/monitoring - Observabilidade de infraestrutura
 * Exibe taxa de erros, latencia, usuarios ativos e status dos health checks.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { Activity, AlertTriangle, Clock, Shield } from 'lucide-react'
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

interface CoreLoopPromotionSnapshot {
  promotionEligible: boolean
  blockers: string[]
  production: {
    sampleSize: number
    applySuccessRate?: number
    learnFeedbackCoverage?: number
    sandboxCoverage?: number
    workspaceCoverage?: number
    regressionRate?: number
    reviewedApplyRuns?: number
  } | null
  updatedAt: string | null
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
    status === 'healthy' ? 'bg-[var(--aethel-success)]' :
    status === 'degraded' ? 'bg-[var(--aethel-warning)]' :
    'bg-[var(--aethel-error)]'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
}

export default function AdminMonitoringPage() {
  const [metrics, setMetrics] = useState<MonitoringMetrics | null>(null)
  const [coreLoop, setCoreLoop] = useState<CoreLoopPromotionSnapshot | null>(null)
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
      const token = getToken()
      const authHeaders = token ? { Authorization: `Bearer ${token}` } : {}

      const [healthChecks, coreLoopRes] = await Promise.all([
        runHealthChecks(),
        fetch('/api/admin/ai/core-loop-promotion', {
          cache: 'no-store',
          headers: authHeaders,
        }).catch(() => null),
      ])
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

      if (coreLoopRes?.ok) {
        const payload = await coreLoopRes.json()
        setCoreLoop({
          promotionEligible: Boolean(payload?.promotionEligible),
          blockers: Array.isArray(payload?.blockers) ? payload.blockers : [],
          production: payload?.production ?? null,
          updatedAt: typeof payload?.updatedAt === 'string' ? payload.updatedAt : null,
        })
      } else {
        setCoreLoop(null)
      }

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

  const blockedChecks = metrics?.healthChecks.filter((check) => check.status === 'down') ?? []
  const degradedChecks = metrics?.healthChecks.filter((check) => check.status === 'degraded') ?? []
  const monitoringTone = blockedChecks.length > 0 ? 'blocked' : degradedChecks.length > 0 ? 'partial' : 'healthy'
  const monitoringTitle =
    monitoringTone === 'healthy'
      ? 'Infraestrutura respondendo sem bloqueio critico'
      : monitoringTone === 'partial'
        ? 'Infraestrutura respondendo com dependencia parcial'
        : 'Infraestrutura com bloqueios ativos'
  const monitoringDescription =
    monitoringTone === 'healthy'
      ? 'Os checks desta superficie estao operacionais. Agora o foco volta para evidencia de producao e experiencia de produto.'
      : monitoringTone === 'partial'
        ? 'O runtime base responde, mas ainda ha subsistemas que enfraquecem a narrativa de confiabilidade completa.'
        : 'Existe falha em uma ou mais dependencias importantes. Antes de vender robustez, precisamos reestabilizar esta base.'
  const nextActions = coreLoop?.blockers?.slice(0, 3) ?? []

  return (
    <div className="min-h-screen bg-[var(--aethel-surface-primary)] text-[var(--aethel-text-primary)] p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)]">
          <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--aethel-surface-secondary)_64%,transparent),color-mix(in_srgb,var(--aethel-surface-primary)_88%,transparent))] p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
                  Monitoramento de infraestrutura
                </p>
                <h1 className="mt-3 text-2xl font-bold">{monitoringTitle}</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  {monitoringDescription}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {lastRefresh && (
                  <span className="text-xs text-[var(--aethel-text-tertiary)]">
                    Ultima atualizacao: {new Date(lastRefresh).toLocaleTimeString('pt-BR')}
                  </span>
                )}
                <button
                  onClick={refresh}
                  disabled={loading}
                  className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] px-4 py-2 text-sm font-medium text-[var(--aethel-text-primary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Verificando...' : 'Atualizar'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_28%,transparent)] p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--aethel-text-tertiary)]">
              Proxima melhor acao
            </p>
            <div className="mt-4 space-y-3">
              {nextActions.length > 0 ? nextActions.map((action) => (
                <div
                  key={action}
                  className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_24%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--aethel-text-secondary)]"
                >
                  {action}
                </div>
              )) : (
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-4 py-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
                  Sem blocker retornado pelo core loop agora. O foco passa a ser validar preview, billing e onboarding com evidencias reais.
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Summary Cards */}
        {metrics && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <AdminMetricCard
              icon={Shield}
              label="Uptime"
              value={`${metrics.uptimePercent.toFixed(1)}%`}
              subValue="Taxa de aprovacao dos checks"
              trend={metrics.uptimePercent >= 99 ? 'up' : metrics.uptimePercent < 90 ? 'down' : undefined}
            />
            <AdminMetricCard
              icon={AlertTriangle}
              label="Taxa de erro"
              value={`${metrics.errorRate.toFixed(1)}%`}
              subValue="Health checks com falha"
              trend={metrics.errorRate <= 1 ? 'up' : metrics.errorRate > 5 ? 'down' : undefined}
              trendTone="negative"
            />
            <AdminMetricCard
              icon={Activity}
              label="Latencia P50"
              value={`${metrics.p50Latency}ms`}
              subValue="Tempo de resposta mediano"
              trend={metrics.p50Latency <= 200 ? 'up' : metrics.p50Latency > 500 ? 'down' : undefined}
              trendTone="negative"
            />
            <AdminMetricCard
              icon={Clock}
              label="Latencia P95"
              value={`${metrics.p95Latency}ms`}
              subValue="Percentil 95"
              trend={metrics.p95Latency <= 500 ? 'up' : metrics.p95Latency > 2000 ? 'down' : undefined}
              trendTone="negative"
            />
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-[var(--aethel-warning)]" />
              <h2 className="text-base font-semibold">Checks que ainda pedem atencao</h2>
            </div>
            <div className="mt-4 space-y-3">
              {[...blockedChecks, ...degradedChecks].length > 0 ? (
                [...blockedChecks, ...degradedChecks].map((check) => (
                  <div
                    key={check.endpoint}
                    className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <StatusDot status={check.status} />
                        <p className="text-sm font-medium">{check.endpoint}</p>
                      </div>
                      <Badge
                        variant={check.status === 'down' ? 'error' : 'warning'}
                        size="sm"
                      >
                        {STATUS_LABELS[check.status]}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-[var(--aethel-text-tertiary)]">
                      Latencia observada: {check.latencyMs}ms
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-lg border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-4 py-3 text-sm text-[var(--aethel-text-secondary)]">
                  Nenhum health check desta superficie esta degradado neste momento.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-[var(--aethel-success)]" />
              <h2 className="text-base font-semibold">Leitura correta desta pagina</h2>
            </div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--aethel-text-secondary)]">
              <p>Esta superficie mede disponibilidade tecnica e latencia dos servicos principais.</p>
              <p>Ela nao substitui o dossie de L4: preview, billing, rollback e workspace coverage continuam precisando de prova operacional dedicada.</p>
              <p>Quando esta pagina fica verde, significa base tecnica mais estavel. Nao significa automaticamente experiencia de produto completa.</p>
            </div>
          </div>
        </section>

        {/* Health Checks Table */}
        <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)]">
          <div className="border-b border-[var(--aethel-border-subtle)] px-6 py-4">
            <h2 className="text-lg font-semibold">Checks de saude dos servicos</h2>
          </div>
          <div className="divide-y divide-[color-mix(in_srgb,var(--aethel-border-subtle)_70%,transparent)]">
            {metrics?.healthChecks.map((check) => (
              <div
                key={check.endpoint}
                className="flex items-center justify-between px-6 py-3 hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <StatusDot status={check.status} />
                  <span className="font-medium">{check.endpoint}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-[var(--aethel-text-secondary)]">
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
              <div className="px-6 py-12 text-center text-[var(--aethel-text-tertiary)]">
                Executando health checks...
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Evidencia operacional L4</h2>
              <p className="mt-1 text-sm text-[var(--aethel-text-secondary)]">
                Mostra o que ja foi provado em producao e o que ainda bloqueia uma narrativa forte de Studio autonomo.
              </p>
            </div>
            <Badge variant={coreLoop?.promotionEligible ? 'success' : 'warning'} size="sm">
              {coreLoop?.promotionEligible ? 'Promotion-ready parcial' : 'Ainda com blockers'}
            </Badge>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <AdminMetricCard
              icon={Activity}
              label="Sample size"
              value={`${coreLoop?.production?.sampleSize ?? 0}`}
              subValue="Runs de producao no core loop"
            />
            <AdminMetricCard
              icon={Shield}
              label="Apply success"
              value={coreLoop?.production?.applySuccessRate !== undefined ? `${(coreLoop.production.applySuccessRate * 100).toFixed(1)}%` : 'n/a'}
              subValue="Taxa de apply bem-sucedido"
            />
            <AdminMetricCard
              icon={Clock}
              label="Feedback coverage"
              value={coreLoop?.production?.learnFeedbackCoverage !== undefined ? `${(coreLoop.production.learnFeedbackCoverage * 100).toFixed(1)}%` : 'n/a'}
              subValue="Cobertura de feedback estruturado"
            />
            <AdminMetricCard
              icon={AlertTriangle}
              label="Workspace coverage"
              value={coreLoop?.production?.workspaceCoverage !== undefined ? `${(coreLoop.production.workspaceCoverage * 100).toFixed(1)}%` : 'n/a'}
              subValue="Aplicacoes validadas fora de sandbox"
              trend={coreLoop?.production?.workspaceCoverage ? 'up' : 'down'}
              trendTone="negative"
            />
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-4">
              <h3 className="text-sm font-semibold">Blockers atuais</h3>
              <div className="mt-3 space-y-2">
                {coreLoop?.blockers?.length ? coreLoop.blockers.map((blocker) => (
                  <div
                    key={blocker}
                    className="rounded-md border border-[color-mix(in_srgb,var(--aethel-warning)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-warning)_10%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]"
                  >
                    {blocker}
                  </div>
                )) : (
                  <div className="rounded-md border border-[color-mix(in_srgb,var(--aethel-success)_28%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_10%,transparent)] px-3 py-2 text-sm text-[var(--aethel-text-secondary)]">
                    Nenhum blocker operacional retornado pela promocao do core loop.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-4">
              <h3 className="text-sm font-semibold">Coberturas criticas</h3>
              <div className="mt-3 space-y-3 text-sm text-[var(--aethel-text-secondary)]">
                <div className="flex items-center justify-between gap-3">
                  <span>Sandbox coverage</span>
                  <span className="font-medium text-[var(--aethel-text-primary)]">
                    {coreLoop?.production?.sandboxCoverage !== undefined ? `${(coreLoop.production.sandboxCoverage * 100).toFixed(1)}%` : 'n/a'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Workspace coverage</span>
                  <span className="font-medium text-[var(--aethel-text-primary)]">
                    {coreLoop?.production?.workspaceCoverage !== undefined ? `${(coreLoop.production.workspaceCoverage * 100).toFixed(1)}%` : 'n/a'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Regression rate</span>
                  <span className="font-medium text-[var(--aethel-text-primary)]">
                    {coreLoop?.production?.regressionRate !== undefined ? `${(coreLoop.production.regressionRate * 100).toFixed(1)}%` : 'n/a'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Reviewed apply runs</span>
                  <span className="font-medium text-[var(--aethel-text-primary)]">
                    {coreLoop?.production?.reviewedApplyRuns !== undefined ? `${coreLoop.production.reviewedApplyRuns} reviewed runs` : 'n/a'}
                  </span>
                </div>
                {coreLoop?.updatedAt && (
                  <div className="pt-2 text-xs text-[var(--aethel-text-tertiary)]">
                    Atualizado em {new Date(coreLoop.updatedAt).toLocaleString('pt-BR')}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Alert Thresholds */}
        <div className="rounded-xl border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-6">
          <h2 className="text-lg font-semibold mb-4">Limiares de alerta</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Taxa de erro', threshold: '> 1%', current: metrics ? `${metrics.errorRate.toFixed(1)}%` : '...' },
              { label: 'Latencia P95', threshold: '> 2000ms', current: metrics ? `${metrics.p95Latency}ms` : '...' },
              { label: 'Falhas de health check', threshold: 'Qualquer critica', current: metrics ? `${metrics.healthChecks.filter(h => h.status === 'down').length} indisponivel` : '...' },
            ].map((alert) => (
              <div key={alert.label} className="rounded-lg border border-[var(--aethel-border-subtle)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_20%,transparent)] p-3">
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
