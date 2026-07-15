/**
 * Metrics API - Aethel Engine
 * GET /api/health/metrics - Prometheus-compatible metrics
 */

export const dynamic = 'force-dynamic';

// In-memory metrics (em produção, use Redis ou similar)
const metrics = {
  requests_total: 0,
  requests_errors: 0,
  uptime_start: Date.now(),
};

export async function GET() {
  metrics.requests_total++;
  const uptimeSeconds = Math.floor((Date.now() - metrics.uptime_start) / 1000);
  
  const prometheusFormat = `
# HELP aethel_uptime_seconds Server uptime in seconds
# TYPE aethel_uptime_seconds gauge
aethel_uptime_seconds ${uptimeSeconds}

# HELP aethel_requests_total Total requests processed
# TYPE aethel_requests_total counter
aethel_requests_total ${metrics.requests_total}

# HELP aethel_requests_errors_total Total request errors
# TYPE aethel_requests_errors_total counter
aethel_requests_errors_total ${metrics.requests_errors}

# HELP aethel_nodejs_version Node.js version info
# TYPE aethel_nodejs_version gauge
aethel_nodejs_version{version="${process.version}"} 1
`.trim();

  return new Response(prometheusFormat, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
      'Cache-Control': 'no-cache',
    },
  });
}
