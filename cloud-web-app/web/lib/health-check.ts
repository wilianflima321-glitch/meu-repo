import { useEffect, useState } from 'react';
import { HealthCheckService } from './health-check-service';
import { UptimeMonitor } from './health-check.uptime';
import type { HealthReport } from './health-check.types';

export { UptimeMonitor } from './health-check.uptime';
export type {
  HealthStatus,
  ServiceType,
  AlertSeverity,
  ServiceHealth,
  SystemMetrics,
  HealthReport,
  HealthAlert,
  ServiceConfig
} from './health-check.types';

/**
 * Aethel Engine health checks and monitoring.
 *
 * Runtime service checks, resource metrics, status responses and alerting.
 */

export { HealthCheckService } from './health-check-service';
// ============================================================================
// API ROUTE HANDLERS
// ============================================================================

/**
 * Handler para /api/health
 */
export async function healthHandler(): Promise<Response> {
  const service = HealthCheckService.getInstance();
  const report = await service.getHealthReport();

  const status = report.status === 'healthy' ? 200 :
                 report.status === 'degraded' ? 200 : 503;

  return new Response(JSON.stringify(report), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store',
    },
  });
}

/**
 * Handler para /api/health/live
 */
export function livenessHandler(): Response {
  const service = HealthCheckService.getInstance();
  const alive = service.isAlive();

  return new Response(JSON.stringify({ status: alive ? 'ok' : 'error' }), {
    status: alive ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handler para /api/health/ready
 */
export async function readinessHandler(): Promise<Response> {
  const service = HealthCheckService.getInstance();
  const ready = await service.isReady();

  return new Response(JSON.stringify({ status: ready ? 'ok' : 'not_ready' }), {
    status: ready ? 200 : 503,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Handler para /api/metrics
 */
export function metricsHandler(): Response {
  const service = HealthCheckService.getInstance();
  const metrics = service.getMetrics();

  // Formato Prometheus
  const prometheusMetrics = `
# HELP aethel_uptime_seconds Server uptime in seconds
# TYPE aethel_uptime_seconds gauge
aethel_uptime_seconds ${metrics.uptime}

# HELP aethel_memory_used_bytes Memory used in bytes
# TYPE aethel_memory_used_bytes gauge
aethel_memory_used_bytes ${metrics.memory.used}

# HELP aethel_memory_total_bytes Total memory in bytes
# TYPE aethel_memory_total_bytes gauge
aethel_memory_total_bytes ${metrics.memory.total}

# HELP aethel_requests_total Total requests processed
# TYPE aethel_requests_total counter
aethel_requests_total ${metrics.requests.total}

# HELP aethel_request_latency_avg_ms Average request latency in milliseconds
# TYPE aethel_request_latency_avg_ms gauge
aethel_request_latency_avg_ms ${metrics.requests.avgLatency.toFixed(2)}

# HELP aethel_errors_total Total errors
# TYPE aethel_errors_total counter
aethel_errors_total ${metrics.errors.total}

# HELP aethel_active_connections Current active connections
# TYPE aethel_active_connections gauge
aethel_active_connections ${metrics.activeConnections}
`.trim();

  return new Response(prometheusMetrics, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Middleware para tracking de requests
 */
export function withHealthTracking<T extends (...args: unknown[]) => Promise<Response>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    const service = HealthCheckService.getInstance();
    const start = Date.now();

    try {
      const response = await handler(...args);
      const latency = Date.now() - start;
      service.trackRequest(latency);

      if (!response.ok) {
        service.trackError();
      }

      return response;
    } catch (error) {
      service.trackError();
      throw error;
    }
  }) as T;
}

// ============================================================================
// REACT HOOK
// ============================================================================


export function useHealthStatus(refreshInterval = 30000) {
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const response = await fetch('/api/health');
        const data = await response.json();
        setHealth(data);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to fetch health'));
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, refreshInterval);

    return () => clearInterval(interval);
  }, [refreshInterval]);

  return { health, loading, error };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const healthService = HealthCheckService.getInstance();
export const uptimeMonitor = new UptimeMonitor();

const healthCheckModule = {
  HealthCheckService,
  UptimeMonitor,
  healthHandler,
  livenessHandler,
  readinessHandler,
  metricsHandler,
  withHealthTracking,
  useHealthStatus,
  healthService,
  uptimeMonitor,
};

export default healthCheckModule;
