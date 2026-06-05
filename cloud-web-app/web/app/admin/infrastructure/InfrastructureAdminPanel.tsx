'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { InfrastructureDataStores } from './_components/InfrastructureDataStores'
import { InfrastructureErrorState, InfrastructureLoadingState } from './_components/InfrastructureStates'
import { InfrastructureHeader } from './_components/InfrastructureHeader'
import { InfrastructureOverviewMetrics } from './_components/InfrastructureOverviewMetrics'
import { InfrastructureQueues } from './_components/InfrastructureQueues'
import { InfrastructureResources } from './_components/InfrastructureResources'
import { InfrastructureServiceGrid } from './_components/InfrastructureServiceGrid'
import type { InfrastructureData, ServiceHealth } from './_components/infrastructure-types'

export function InfrastructureAdminPanel() {
  const [data, setData] = useState<InfrastructureData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/infrastructure/status')
      if (!response.ok) throw new Error('Failed to load infrastructure status')
      const json = await response.json()
      setData(json)
      setError(null)
      setLastUpdated(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (!autoRefresh) return undefined
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [fetchData, autoRefresh])

  const overallStatus = useMemo<ServiceHealth['status']>(() => {
    if (!data) return 'degraded'
    if (data.services.every((service) => service.status === 'healthy')) return 'healthy'
    if (data.services.some((service) => service.status === 'down')) return 'down'
    return 'degraded'
  }, [data])

  if (loading) return <InfrastructureLoadingState />
  if (error || !data) return <InfrastructureErrorState error={error} onRetry={fetchData} />

  return (
    <section className="space-y-6">
      <InfrastructureHeader status={overallStatus} autoRefresh={autoRefresh} lastUpdated={lastUpdated} onToggleAutoRefresh={() => setAutoRefresh((value) => !value)} />
      <InfrastructureOverviewMetrics data={data} />
      <InfrastructureServiceGrid services={data.services} />
      <InfrastructureResources resources={data.resources} />
      <InfrastructureDataStores data={data} />
      <InfrastructureQueues queues={data.queues} />
    </section>
  )
}
