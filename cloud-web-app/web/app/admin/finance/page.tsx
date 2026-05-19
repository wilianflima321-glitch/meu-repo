'use client'

import { useCallback, useEffect, useState } from 'react'

import { FinanceAlertsPanel } from './_components/FinanceAlertsPanel'
import { FinanceCharts } from './_components/FinanceCharts'
import { FinanceHeader } from './_components/FinanceHeader'
import { FinanceAIMarginSections, FinanceCostMetrics, FinanceCriticalMetrics, FinanceUnitEconomics } from './_components/FinanceMetricSections'
import { FinanceErrorState, FinanceLoadingState } from './_components/FinanceStates'
import { FinanceTransactionsTable } from './_components/FinanceTransactionsTable'
import type { FinanceDateRange, FinanceMetrics } from './_components/finance-types'

export default function FinanceDashboard() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [dateRange, setDateRange] = useState<FinanceDateRange>('today')

  const fetchMetrics = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/finance/metrics?range=${dateRange}`)
      if (!response.ok) throw new Error('Failed to load metrics')
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    fetchMetrics()

    if (!autoRefresh) return undefined
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [fetchMetrics, autoRefresh])

  if (loading) return <FinanceLoadingState />
  if (error || !metrics) return <FinanceErrorState error={error} onRetry={fetchMetrics} />

  return (
    <div className="space-y-6">
      <FinanceHeader dateRange={dateRange} autoRefresh={autoRefresh} onDateRangeChange={setDateRange} onToggleAutoRefresh={() => setAutoRefresh((value) => !value)} />
      <FinanceCriticalMetrics metrics={metrics} />
      <FinanceCostMetrics metrics={metrics} />
      <FinanceAIMarginSections metrics={metrics} />
      <FinanceUnitEconomics metrics={metrics} />
      {metrics.alerts.length > 0 ? <FinanceAlertsPanel alerts={metrics.alerts} /> : null}
      <FinanceCharts metrics={metrics} />
      <FinanceTransactionsTable transactions={metrics.recentTransactions} />
    </div>
  )
}
