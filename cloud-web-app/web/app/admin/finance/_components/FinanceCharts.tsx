import { Bot, PieChart } from 'lucide-react'

import type { FinanceMetrics } from './finance-types'

const AI_COST_COLORS = [
  'var(--aethel-primary)',
  'var(--aethel-accent)',
  'var(--aethel-secondary)',
  'var(--aethel-warning)',
  'var(--aethel-success)',
  'var(--aethel-info)',
]

const PLAN_COLORS: Record<string, string> = {
  starter: 'var(--aethel-text-quaternary)',
  basic: 'var(--aethel-primary)',
  pro: 'var(--aethel-accent)',
  studio: 'var(--aethel-warning)',
  enterprise: 'var(--aethel-success)',
}

export function CostBreakdownChart({ data }: { data: FinanceMetrics['aiCostBreakdown'] }) {
  const total = data.reduce((sum, item) => sum + item.cost, 0)

  return (
    <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
        <Bot className="h-4 w-4" />
        AI cost by model
      </h3>

      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={item.model}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-[var(--aethel-text-secondary)]">{item.model}</span>
              <span className="text-[var(--aethel-text-tertiary)]">${item.cost.toFixed(2)} ({item.percentage.toFixed(1)}%)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--aethel-surface-tertiary)_80%,transparent)]">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${item.percentage}%`, backgroundColor: AI_COST_COLORS[index % AI_COST_COLORS.length] }} />
            </div>
            <p className="mt-0.5 text-[10px] text-[var(--aethel-text-tertiary)]">{item.calls.toLocaleString()} calls</p>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-[var(--aethel-border-secondary)] pt-4">
        <div className="flex justify-between text-sm">
          <span className="text-[var(--aethel-text-tertiary)]">Total AI cost today</span>
          <span className="font-medium text-[var(--aethel-text-primary)]">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

export function RevenueByPlanChart({ data }: { data: FinanceMetrics['revenueByPlan'] }) {
  return (
    <div className="rounded-lg border border-[var(--aethel-border-secondary)] bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_70%,transparent)] p-4">
      <h3 className="mb-4 flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-primary)]">
        <PieChart className="h-4 w-4" />
        Revenue by plan
      </h3>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.plan} className="flex items-center gap-3">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: PLAN_COLORS[item.plan.toLowerCase()] || 'var(--aethel-primary)' }} />
            <div className="flex-1">
              <div className="flex justify-between text-sm">
                <span className="capitalize text-[var(--aethel-text-secondary)]">{item.plan}</span>
                <span className="font-medium text-[var(--aethel-text-primary)]">${item.revenue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-[var(--aethel-text-tertiary)]">
                <span>{item.users} users</span>
                <span>{item.percentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function FinanceCharts({ metrics }: { metrics: FinanceMetrics }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <CostBreakdownChart data={metrics.aiCostBreakdown} />
      <RevenueByPlanChart data={metrics.revenueByPlan} />
    </div>
  )
}
