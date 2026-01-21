import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// FINANCE METRICS API
// =============================================================================

interface FinanceMetrics {
  mrr: number;
  mrrGrowth: number;
  arr: number;
  
  dailyRevenue: number;
  dailyAICost: number;
  dailyInfraCost: number;
  dailyProfit: number;
  profitMargin: number;
  
  burnRate: number;
  runway: number;
  
  activeSubscriptions: number;
  churnRate: number;
  ltv: number;
  cac: number;
  
  aiCostBreakdown: {
    model: string;
    cost: number;
    calls: number;
    percentage: number;
  }[];
  
  revenueByPlan: {
    plan: string;
    users: number;
    revenue: number;
    percentage: number;
  }[];
  
  recentTransactions: {
    id: string;
    type: 'subscription' | 'usage' | 'refund' | 'credit';
    amount: number;
    userId: string;
    userEmail: string;
    description: string;
    createdAt: string;
  }[];
  
  alerts: {
    type: 'warning' | 'critical';
    message: string;
    metric: string;
    value: number;
    threshold: number;
  }[];
}

// Plan pricing (monthly)
const PLAN_PRICES: Record<string, number> = {
  starter: 0,
  starter_trial: 0,
  basic: 29,
  basic_trial: 0,
  pro: 79,
  pro_trial: 0,
  studio: 199,
  studio_trial: 0,
  enterprise: 499,
  enterprise_trial: 0,
};

// AI model costs per 1K tokens
const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },
  'gemini-1.5-pro': { input: 0.00125, output: 0.005 },
  'gemini-1.5-flash': { input: 0.000075, output: 0.0003 },
};

const numberFromEnv = (value?: string) => {
  if (!value) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const INFRA_COSTS = {
  database: numberFromEnv(process.env.FINANCE_COST_DATABASE),
  redis: numberFromEnv(process.env.FINANCE_COST_REDIS),
  storage: numberFromEnv(process.env.FINANCE_COST_STORAGE),
  cdn: numberFromEnv(process.env.FINANCE_COST_CDN),
  compute: numberFromEnv(process.env.FINANCE_COST_COMPUTE),
  monitoring: numberFromEnv(process.env.FINANCE_COST_MONITORING),
};

async function handler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const range = searchParams.get('range') || 'today';
  
  // Calculate date range
  const now = new Date();
  let startDate: Date;
  
  switch (range) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'mtd':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default: // today
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  const daysInRange = Math.max(1, Math.ceil((now.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
  const previousStartDate = new Date(startDate.getTime() - daysInRange * 24 * 60 * 60 * 1000);
  
  try {
    // Get active paying users by plan
    const usersByPlan = await prisma.user.groupBy({
      by: ['plan'],
      _count: { id: true },
      where: {
        plan: {
          notIn: ['starter', 'starter_trial'],
        },
      },
    });

    const [activeSubscriptions, churnedSubscriptions] = await prisma.$transaction([
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.subscription.count({
        where: {
          status: 'canceled',
          updatedAt: { gte: startDate },
        },
      }),
    ]);
    
    // Calculate MRR
    let mrr = 0;
    const revenueByPlan: FinanceMetrics['revenueByPlan'] = [];
    
    for (const group of usersByPlan) {
      const price = PLAN_PRICES[group.plan] || 0;
      const revenue = price * group._count.id;
      mrr += revenue;
      
      if (price > 0) {
        revenueByPlan.push({
          plan: group.plan.replace('_trial', ''),
          users: group._count.id,
          revenue,
          percentage: 0, // Calculate after total
        });
      }
    }
    
    // Calculate percentages
    for (const item of revenueByPlan) {
      item.percentage = mrr > 0 ? (item.revenue / mrr) * 100 : 0;
    }
    
    // Get AI usage for the period
    const aiUsage = await prisma.creditLedgerEntry.findMany({
      where: {
        createdAt: { gte: startDate },
        entryType: { in: ['ai_generation', 'usage'] },
      },
      select: {
        amount: true,
        metadata: true,
        createdAt: true,
      },
    });
    
    // Calculate AI costs by model
    const modelUsage: Record<string, { cost: number; calls: number }> = {};
    let totalAICost = 0;
    
    for (const entry of aiUsage) {
      const metadata = entry.metadata as any;
      const model = metadata?.model || 'unknown';
      const tokens = Math.abs(entry.amount);
      
      const costs = MODEL_COSTS[model];
      // Assume 70% input, 30% output tokens
      const cost = costs ? (tokens * 0.7 * costs.input + tokens * 0.3 * costs.output) / 1000 : 0;
      
      if (!modelUsage[model]) {
        modelUsage[model] = { cost: 0, calls: 0 };
      }
      modelUsage[model].cost += cost;
      modelUsage[model].calls += 1;
      totalAICost += cost;
    }
    
    const aiCostBreakdown: FinanceMetrics['aiCostBreakdown'] = Object.entries(modelUsage)
      .map(([model, data]) => ({
        model,
        cost: data.cost,
        calls: data.calls,
        percentage: totalAICost > 0 ? (data.cost / totalAICost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);
    
    // Get recent credit ledger entries as transactions
    const recentEntries = await prisma.creditLedgerEntry.findMany({
      where: {
        createdAt: { gte: startDate },
      },
      include: {
        user: {
          select: { email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    
    const recentTransactions: FinanceMetrics['recentTransactions'] = recentEntries.map(entry => ({
      id: entry.id,
      type: entry.entryType === 'purchase' ? 'subscription' : 
            entry.entryType === 'refund' ? 'refund' :
            entry.entryType === 'bonus' ? 'credit' : 'usage',
      amount: entry.amount,
      userId: entry.userId,
      userEmail: entry.user.email,
      description: (entry.metadata as any)?.description || entry.reference || undefined,
      createdAt: entry.createdAt.toISOString(),
    }));
    
    const [currentRevenueAgg, previousRevenueAgg] = await prisma.$transaction([
      prisma.payment.aggregate({
        where: {
          status: 'succeeded',
          createdAt: { gte: startDate, lt: now },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'succeeded',
          createdAt: { gte: previousStartDate, lt: startDate },
        },
        _sum: { amount: true },
      }),
    ]);

    const revenueInRange = (currentRevenueAgg._sum?.amount ?? 0) / 100;
    const revenuePreviousRange = (previousRevenueAgg._sum?.amount ?? 0) / 100;
    const infraCostsTotal = Object.values(INFRA_COSTS).reduce((sum, value) => sum + value, 0);
    const infraOverride = numberFromEnv(process.env.FINANCE_INFRA_DAILY_TOTAL);

    // Calculate daily metrics
    const dailyAICost = totalAICost / daysInRange;
    const dailyInfraCost = infraOverride > 0 ? infraOverride : infraCostsTotal;
    const dailyRevenue = revenueInRange / daysInRange;
    const dailyProfit = dailyRevenue - dailyAICost - dailyInfraCost;
    const profitMargin = dailyRevenue > 0 ? (dailyProfit / dailyRevenue) * 100 : 0;
    
    const totalPaidUsers = usersByPlan.reduce((sum, g) => sum + g._count.id, 0);
    const churnBase = activeSubscriptions + churnedSubscriptions;
    const churnRate = churnBase > 0 ? (churnedSubscriptions / churnBase) * 100 : 0;
    const paidAccounts = activeSubscriptions > 0 ? activeSubscriptions : totalPaidUsers;
    
    // Unit economics
    const ltv = mrr > 0 ? (mrr / Math.max(paidAccounts, 1)) * 24 : 0; // 24 month average lifespan
    const cac = numberFromEnv(process.env.FINANCE_CAC);
    
    // Burn rate and runway
    const totalDailyCost = dailyAICost + dailyInfraCost;
    const burnRate = Math.max(0, totalDailyCost - dailyRevenue);
    const cashReserves = numberFromEnv(process.env.FINANCE_CASH_RESERVES);
    const runway = burnRate > 0 && cashReserves > 0 ? Math.floor(cashReserves / (burnRate * 30)) : 0;
    
    // Generate alerts
    const alerts: FinanceMetrics['alerts'] = [];
    
    if (profitMargin < 20) {
      alerts.push({
        type: profitMargin < 0 ? 'critical' : 'warning',
        message: `Profit margin is ${profitMargin < 0 ? 'negative' : 'below target'} at ${profitMargin.toFixed(1)}%`,
        metric: 'profitMargin',
        value: profitMargin,
        threshold: 20,
      });
    }
    
    if (dailyAICost > dailyRevenue * 0.4) {
      alerts.push({
        type: 'warning',
        message: `AI costs are ${((dailyAICost / dailyRevenue) * 100).toFixed(0)}% of revenue`,
        metric: 'aiCostRatio',
        value: dailyAICost,
        threshold: dailyRevenue * 0.4,
      });
    }
    
    if (churnRate > 5) {
      alerts.push({
        type: churnRate > 10 ? 'critical' : 'warning',
        message: `Monthly churn rate is elevated at ${churnRate.toFixed(1)}%`,
        metric: 'churnRate',
        value: churnRate,
        threshold: 5,
      });
    }
    
    if (runway < 12) {
      alerts.push({
        type: runway < 6 ? 'critical' : 'warning',
        message: `Runway is ${runway} months at current burn rate`,
        metric: 'runway',
        value: runway,
        threshold: 12,
      });
    }
    
    // Previous period MRR for growth calculation (simplified)
    const mrrGrowth = revenuePreviousRange > 0
      ? ((revenueInRange - revenuePreviousRange) / revenuePreviousRange) * 100
      : (revenueInRange > 0 ? 100 : 0);
    
    const metrics: FinanceMetrics = {
      mrr,
      mrrGrowth,
      arr: mrr * 12,
      
      dailyRevenue,
      dailyAICost,
      dailyInfraCost,
      dailyProfit,
      profitMargin,
      
      burnRate,
      runway,
      
      activeSubscriptions: paidAccounts,
      churnRate,
      ltv,
      cac,
      
      aiCostBreakdown,
      revenueByPlan,
      recentTransactions,
      alerts,
    };
    
    return NextResponse.json(metrics);
    
  } catch (error) {
    console.error('[Admin Finance] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch finance metrics' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(handler, 'ops:finance:view');
