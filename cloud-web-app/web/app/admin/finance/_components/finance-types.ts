import type { AIMarginDrilldown } from '@/components/admin/AIMarginDrilldownPanel'
import type { AIMarginRecommendation } from '@/components/admin/AIMarginRecommendationsPanel'
import type { AIMarginSnapshot } from '@/components/admin/AIMarginSnapshotPanel'

export interface FinanceMetrics {
  mrr: number
  mrrGrowth: number
  arr: number
  dailyRevenue: number
  dailyAICost: number
  dailyInfraCost: number
  dailyProfit: number
  profitMargin: number
  burnRate: number
  runway: number
  activeSubscriptions: number
  churnRate: number
  ltv: number
  cac: number
  aiCostBreakdown: {
    model: string
    cost: number
    calls: number
    percentage: number
  }[]
  aiMarginSnapshot: AIMarginSnapshot
  aiMarginDrilldown: AIMarginDrilldown
  aiMarginRecommendations: AIMarginRecommendation[]
  revenueByPlan: {
    plan: string
    users: number
    revenue: number
    percentage: number
  }[]
  recentTransactions: {
    id: string
    type: 'revenue' | 'cost' | 'refund'
    amount: number
    userEmail?: string
    description: string
    timestamp: string
    createdAt?: string
  }[]
  alerts: {
    type: 'warning' | 'critical' | 'info'
    message: string
    metric?: string
    value?: number
    threshold?: number
  }[]
}

export type FinanceDateRange = 'today' | '7d' | '30d' | 'mtd'
