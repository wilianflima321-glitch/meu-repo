import { Activity, AlertTriangle, Wifi, Zap } from 'lucide-react'

import { AdminMetricCard } from '@/components/admin/AdminMetricCard'

import type { InfrastructureData } from './infrastructure-types'

export function InfrastructureOverviewMetrics({ data }: { data: InfrastructureData }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      <AdminMetricCard label="Requests/min" value={data.requestsPerMinute} icon={Activity} trend={data.requestsPerMinute > 100 ? 'up' : undefined} />
      <AdminMetricCard label="Active connections" value={data.activeConnections} icon={Wifi} />
      <AdminMetricCard label="Error rate" value={data.errorRate.toFixed(2)} valueSuffix="%" icon={AlertTriangle} trend={data.errorRate > 1 ? 'down' : undefined} />
      <AdminMetricCard label="Cache hit rate" value={data.cacheHitRate.toFixed(1)} valueSuffix="%" icon={Zap} trend={data.cacheHitRate > 80 ? 'up' : undefined} />
    </div>
  )
}
