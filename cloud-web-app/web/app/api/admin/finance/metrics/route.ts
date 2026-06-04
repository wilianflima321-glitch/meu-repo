import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import { createComponentLogger } from '@/lib/observability/logger';
import {
  PLAN_PRICES,
  TRIAL_AND_FREE_PLANS,
  buildAiMarginDrilldown,
  buildAiMarginRecommendations,
  buildAiMarginSnapshot,
  calculateAiLedgerCost,
  getDateRange,
  metadataRecord,
  normalizePlan,
  stringFromMetadata,
  type FinanceMetrics,
} from '@/lib/admin/finance-metrics-model';

const routeLogger = createComponentLogger('admin.finance.metrics');

async function handler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') ?? '30d';
    const { start, end, days } = getDateRange(range);
    const previousStart = new Date(start);
    previousStart.setDate(previousStart.getDate() - days);

    const [
      activeSubscriptions,
      currentRevenue,
      previousRevenue,
      paymentsInRange,
      refundsInRange,
      usersByPlan,
    ] = await prisma.$transaction([
      prisma.subscription.count({ where: { status: 'active' } }),
      prisma.payment.aggregate({
        where: {
          status: 'succeeded',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'succeeded',
          createdAt: { gte: previousStart, lt: start },
        },
        _sum: { amount: true },
      }),
      prisma.payment.findMany({
        where: {
          status: 'succeeded',
          createdAt: { gte: start, lte: end },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, userId: true, amount: true, createdAt: true },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'refunded',
          createdAt: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      prisma.user.groupBy({
        by: ['plan'],
        orderBy: { plan: 'asc' },
        where: { plan: { notIn: TRIAL_AND_FREE_PLANS } },
        _count: { _all: true },
      }),
    ]);

    const revenueInRange = (currentRevenue._sum.amount ?? 0) / 100;
    const previousRevenueAmount = (previousRevenue._sum.amount ?? 0) / 100;
    const dailyRevenue = revenueInRange / days;
    const mrr = (revenueInRange / days) * 30;
    const mrrGrowth = previousRevenueAmount > 0
      ? ((revenueInRange - previousRevenueAmount) / previousRevenueAmount) * 100
      : 0;

    const aiUsage = await prisma.creditLedgerEntry.findMany({
      where: {
        entryType: { in: ['ai_chat', 'ai_generation', 'usage'] },
        createdAt: { gte: start, lte: end },
      },
      select: {
        amount: true,
        metadata: true,
        createdAt: true,
        userId: true,
        user: { select: { email: true, plan: true } },
      },
    });

    const revenueByUserGroups = await prisma.payment.groupBy({
      by: ['userId'],
      where: {
        status: 'succeeded',
        createdAt: { gte: start, lte: end },
      },
      _sum: { amount: true },
    });
    const revenueByUserId = new Map(
      revenueByUserGroups.map((group) => [group.userId, (group._sum.amount ?? 0) / 100]),
    );

    const modelUsage = new Map<string, { cost: number; calls: number; tokens: number }>();
    let totalAICost = 0;

    aiUsage.forEach((entry) => {
      const calculated = calculateAiLedgerCost(entry);
      totalAICost += calculated.costUsd;
      const existing = modelUsage.get(calculated.model) ?? { cost: 0, calls: 0, tokens: 0 };
      existing.cost += calculated.costUsd;
      existing.calls += 1;
      existing.tokens += calculated.totalTokens;
      modelUsage.set(calculated.model, existing);
    });

    const dailyAICost = totalAICost / days;
    const aiCostBreakdown = Array.from(modelUsage.entries())
      .map(([model, data]) => ({
        model,
        cost: data.cost,
        calls: data.calls,
        percentage: totalAICost > 0 ? (data.cost / totalAICost) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost);

    const infrastructureCosts = {
      vercel: Number(process.env.MONTHLY_VERCEL_COST ?? 0) / 30,
      database: Number(process.env.MONTHLY_DATABASE_COST ?? 0) / 30,
      storage: Number(process.env.MONTHLY_STORAGE_COST ?? 0) / 30,
      monitoring: Number(process.env.MONTHLY_MONITORING_COST ?? 0) / 30,
    };
    const dailyInfraCost = Object.values(infrastructureCosts).reduce((sum, cost) => sum + cost, 0);

    const dailyProfit = dailyRevenue - dailyAICost - dailyInfraCost;
    const profitMargin = dailyRevenue > 0 ? (dailyProfit / dailyRevenue) * 100 : 0;
    const burnRate = Math.max(0, -dailyProfit * 30);
    const cashBalance = Number(process.env.CASH_BALANCE ?? 0);
    const runway = burnRate > 0 ? cashBalance / burnRate : 999;

    const revenueByPlan = usersByPlan
      .map((group) => {
        const plan = normalizePlan(group.plan ?? 'free');
        const users = typeof group._count === 'object' ? group._count._all ?? 0 : 0;
        const revenue = (PLAN_PRICES[plan] ?? 0) * users;
        return {
          plan,
          users,
          revenue,
          percentage: mrr > 0 ? (revenue / mrr) * 100 : 0,
        };
      })
      .filter((item) => item.users > 0)
      .sort((a, b) => b.revenue - a.revenue);

    const monthlyChurnRate = Number(process.env.MONTHLY_CHURN_RATE ?? 5);
    const averageRevenuePerUser = activeSubscriptions > 0 ? mrr / activeSubscriptions : 0;
    const ltv = monthlyChurnRate > 0 ? averageRevenuePerUser / (monthlyChurnRate / 100) : 0;
    const cac = Number(process.env.CUSTOMER_ACQUISITION_COST ?? 0);

    const recentEntries = await prisma.creditLedgerEntry.findMany({
      where: { createdAt: { gte: start, lte: end } },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { user: { select: { email: true } } },
    });

    const recentTransactions: FinanceMetrics['recentTransactions'] = [
      ...paymentsInRange.map((payment) => ({
        id: payment.id,
        type: 'revenue' as const,
        amount: payment.amount / 100,
        description: `Payment from ${payment.userId}`,
        timestamp: payment.createdAt.toISOString(),
        createdAt: payment.createdAt.toISOString(),
      })),
      ...recentEntries.map((entry) => {
        const metadata = metadataRecord(entry.metadata);
        return {
          id: entry.id,
          type: entry.amount < 0 ? ('cost' as const) : ('revenue' as const),
          amount: Math.abs(entry.amount),
          userEmail: entry.user?.email ?? undefined,
          description: stringFromMetadata(metadata, ['description', 'operation'], entry.reference ?? entry.entryType),
          timestamp: entry.createdAt.toISOString(),
          createdAt: entry.createdAt.toISOString(),
        };
      }),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    const aiMarginSnapshot = buildAiMarginSnapshot({
      revenueInRange,
      totalAICost,
      aiCallCount: aiUsage.length,
      dailyAICost,
      aiCostBreakdown,
    });
    const aiMarginDrilldown = buildAiMarginDrilldown({
      aiUsage,
      totalAICost,
      revenueByUserId,
    });
    const aiMarginRecommendations = buildAiMarginRecommendations({
      snapshot: aiMarginSnapshot,
      drilldown: aiMarginDrilldown,
      aiCostBreakdown,
    });

    const alerts: FinanceMetrics['alerts'] = [];

    if (dailyProfit < 0) {
      alerts.push({
        type: 'critical',
        message: 'Daily profit is negative. Review pricing, token usage, or infrastructure costs.',
        value: dailyProfit,
      });
    }

    if (aiMarginSnapshot.status === 'risk') {
      alerts.push({
        type: 'critical',
        message: `AI usage is consuming ${aiMarginSnapshot.aiCostRatio.toFixed(1)}% of period revenue. Margin protection is required.`,
        value: aiMarginSnapshot.aiCostRatio,
      });
    } else if (aiMarginSnapshot.status === 'watch') {
      alerts.push({
        type: 'warning',
        message: `AI usage is consuming ${aiMarginSnapshot.aiCostRatio.toFixed(1)}% of period revenue. Monitor high-cost models.`,
        value: aiMarginSnapshot.aiCostRatio,
      });
    }

    if (runway < 6 && runway !== 999) {
      alerts.push({
        type: 'warning',
        message: `Runway is below 6 months (${runway.toFixed(1)} months).`,
        value: runway,
      });
    }

    if (profitMargin > 50) {
      alerts.push({
        type: 'info',
        message: `Healthy profit margin: ${profitMargin.toFixed(1)}%.`,
        value: profitMargin,
      });
    }

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
      activeSubscriptions,
      churnRate: monthlyChurnRate,
      ltv,
      cac,
      aiCostBreakdown,
      aiMarginSnapshot,
      aiMarginDrilldown,
      aiMarginRecommendations,
      revenueByPlan,
      recentTransactions,
      alerts,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    routeLogger.error('failed to compute admin finance metrics', error);
    return NextResponse.json(
      { error: 'Failed to compute finance metrics' },
      { status: 500 },
    );
  }
}

export const GET = withAdminAuth(handler, 'ops:finance:view');
