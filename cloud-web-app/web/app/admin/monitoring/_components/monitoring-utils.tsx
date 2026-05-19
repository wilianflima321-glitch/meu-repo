import type { HealthCheckResult, MonitoringMetrics, MonitoringTone } from './monitoring-types'

export function getMonitoringTone(metrics: MonitoringMetrics | null): MonitoringTone {
  const blockedChecks = metrics?.healthChecks.filter((check) => check.status === 'down') ?? []
  const degradedChecks = metrics?.healthChecks.filter((check) => check.status === 'degraded') ?? []
  if (blockedChecks.length > 0) return 'blocked'
  if (degradedChecks.length > 0) return 'partial'
  return 'healthy'
}

export function monitoringTitle(tone: MonitoringTone) {
  if (tone === 'healthy') return 'Infrastructure is responding without critical blockers'
  if (tone === 'partial') return 'Infrastructure is responding with partial dependencies'
  return 'Infrastructure has active blockers'
}

export function monitoringDescription(tone: MonitoringTone) {
  if (tone === 'healthy') return 'These checks are operational. Focus can move back to production evidence and product experience.'
  if (tone === 'partial') return 'The base runtime responds, but some subsystems still weaken the reliability story.'
  return 'One or more important dependencies are failing. Restabilize this base before selling robustness.'
}

export function StatusDot({ status }: { status: HealthCheckResult['status'] }) {
  const color = status === 'healthy' ? 'bg-[var(--aethel-success)]' : status === 'degraded' ? 'bg-[var(--aethel-warning)]' : 'bg-[var(--aethel-error)]'
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${color}`} />
}
