import { Activity, AlertTriangle, Clock, Shield } from 'lucide-react'

import { AdminMetricCard } from '@/components/admin/AdminMetricCard'

import type { MonitoringMetrics } from './monitoring-types'

export function MonitoringSummaryCards({ metrics }: { metrics: MonitoringMetrics | null }) {
  if (!metrics) return null

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <AdminMetricCard icon={Shield} label="Uptime" value={`${metrics.uptimePercent.toFixed(1)}%`} subValue="Health-check pass rate" trend={metrics.uptimePercent >= 99 ? 'up' : metrics.uptimePercent < 90 ? 'down' : undefined} />
      <AdminMetricCard icon={AlertTriangle} label="Error rate" value={`${metrics.errorRate.toFixed(1)}%`} subValue="Failing health checks" trend={metrics.errorRate <= 1 ? 'up' : metrics.errorRate > 5 ? 'down' : undefined} trendTone="negative" />
      <AdminMetricCard icon={Activity} label="P50 latency" value={`${metrics.p50Latency}ms`} subValue="Median response time" trend={metrics.p50Latency <= 200 ? 'up' : metrics.p50Latency > 500 ? 'down' : undefined} trendTone="negative" />
      <AdminMetricCard icon={Clock} label="P95 latency" value={`${metrics.p95Latency}ms`} subValue="95th percentile" trend={metrics.p95Latency <= 500 ? 'up' : metrics.p95Latency > 2000 ? 'down' : undefined} trendTone="negative" />
    </div>
  )
}
