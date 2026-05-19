import type { HealthCheckResult } from './monitoring-types'

export const HEALTH_ENDPOINTS = [
  { name: 'Liveness', path: '/api/health/live' },
  { name: 'Readiness', path: '/api/health/ready' },
  { name: 'Startup', path: '/api/health/startup' },
  { name: 'Database', path: '/api/health/db' },
  { name: 'Cache', path: '/api/health/cache' },
  { name: 'AI provider', path: '/api/health/ai' },
  { name: 'Stripe', path: '/api/health/stripe' },
  { name: 'Storage', path: '/api/health/storage' },
]

export const STATUS_LABELS: Record<HealthCheckResult['status'], string> = {
  healthy: 'Operational',
  degraded: 'Partial',
  down: 'Unavailable',
}
