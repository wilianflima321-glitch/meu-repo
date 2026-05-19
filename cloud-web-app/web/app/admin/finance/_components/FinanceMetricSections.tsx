import { Bot, CreditCard, DollarSign, PieChart, Server, TrendingDown, TrendingUp, Users, Zap } from 'lucide-react'

import { AIMarginDrilldownPanel } from '@/components/admin/AIMarginDrilldownPanel'
import { AIMarginRecommendationsPanel } from '@/components/admin/AIMarginRecommendationsPanel'
import { AIMarginSnapshotPanel } from '@/components/admin/AIMarginSnapshotPanel'
import { AdminMetricCard } from '@/components/admin/AdminMetricCard'

import type { FinanceMetrics } from './finance-types'

export function FinanceCriticalMetrics({ metrics }: { metrics: FinanceMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <AdminMetricCard label="MRR" value={metrics.mrr} delta={metrics.mrrGrowth} icon={TrendingUp} valuePrefix="$" trend={metrics.mrrGrowth >= 0 ? 'up' : 'down'} subValue={`ARR: $${(metrics.arr / 1000).toFixed(0)}k`} />
      <AdminMetricCard label="Daily revenue" value={metrics.dailyRevenue} icon={DollarSign} valuePrefix="$" />
      <AdminMetricCard label="Daily profit" value={metrics.dailyProfit} icon={metrics.dailyProfit >= 0 ? TrendingUp : TrendingDown} valuePrefix="$" trend={metrics.dailyProfit >= 0 ? 'up' : 'down'} subValue={`Margin: ${metrics.profitMargin.toFixed(1)}%`} />
      <AdminMetricCard label="Daily burn" value={metrics.burnRate} icon={Zap} valuePrefix="$" valueSuffix="/day" subValue={`Runway: ${metrics.runway} months`} />
    </div>
  )
}

export function FinanceCostMetrics({ metrics }: { metrics: FinanceMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      <AdminMetricCard label="AI costs" value={metrics.dailyAICost} icon={Bot} valuePrefix="$" subValue="AI spend today" />
      <AdminMetricCard label="Infrastructure" value={metrics.dailyInfraCost} icon={Server} valuePrefix="$" subValue="Servers, database, CDN" />
      <AdminMetricCard label="Active subscriptions" value={metrics.activeSubscriptions} icon={Users} subValue={`Churn: ${metrics.churnRate.toFixed(1)}%`} />
    </div>
  )
}

export function FinanceUnitEconomics({ metrics }: { metrics: FinanceMetrics }) {
  const ltvToCac = metrics.cac ? metrics.ltv / metrics.cac : 0

  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      <AdminMetricCard label="LTV" value={metrics.ltv} icon={TrendingUp} valuePrefix="$" subValue="Lifetime value" />
      <AdminMetricCard label="CAC" value={metrics.cac} icon={CreditCard} valuePrefix="$" subValue="Acquisition cost" />
      <AdminMetricCard label="LTV:CAC" value={ltvToCac.toFixed(1)} icon={PieChart} valueSuffix="x" trend={ltvToCac >= 3 ? 'up' : 'down'} subValue={ltvToCac >= 3 ? 'Healthy' : 'Needs improvement'} />
      <AdminMetricCard label="Churn rate" value={metrics.churnRate} icon={TrendingDown} valueSuffix="%" trend={metrics.churnRate <= 5 ? 'up' : 'down'} subValue="Monthly" />
    </div>
  )
}

export function FinanceAIMarginSections({ metrics }: { metrics: FinanceMetrics }) {
  return (
    <>
      <AIMarginSnapshotPanel snapshot={metrics.aiMarginSnapshot} />
      <AIMarginRecommendationsPanel recommendations={metrics.aiMarginRecommendations} />
      <AIMarginDrilldownPanel drilldown={metrics.aiMarginDrilldown} />
    </>
  )
}
