import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';
import { OPENROUTER_MODELS } from '@/lib/ai/openrouter-models';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('admin.finance.metrics');

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
  aiCostBreakdown: Array<{
    model: string;
    cost: number;
    calls: number;
    percentage: number;
  }>;
  aiMarginSnapshot: AIMarginSnapshot;
  revenueByPlan: Array<{
    plan: string;
    users: number;
    revenue: number;
    percentage: number;
  }>;
  recentTransactions: Array<{
    id: string;
    type: 'revenue' | 'cost' | 'refund';
    amount: number;
    userEmail?: string;
    description: string;
    timestamp: string;
    createdAt?: string;
  }>;
  alerts: Array<{
    type: 'warning' | 'critical' | 'info';
    message: string;
    value?: number;
  }>;
}

interface AIMarginSnapshot {
  periodRevenue: number;
  periodAiCost: number;
  grossMarginAfterAi: number;
  grossMarginAfterAiPercent: number;
  aiCostRatio: number;
  avgAiCostPerCall: number;
  projectedMonthlyAiCost: number;
  highRiskModelCount: number;
  topRiskModel: string | null;
  status: 'healthy' | 'watch' | 'risk';
}

type LedgerMetadata = Record<string, unknown>;

type CalculatedAiCost = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
};

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  starter: 20,
  basic: 29,
  pro: 49.99,
  studio: 99.99,
  enterprise: 199,
  starter_trial: 20,
  basic_trial: 29,
  pro_trial: 49.99,
  studio_trial: 99.99,
  enterprise_trial: 199,
};

const MODEL_COSTS = Object.fromEntries(
  OPENROUTER_MODELS.map((model) => [
    model.id,
    {
      inputPerMillion: model.inputCost,
      outputPerMillion: model.outputCost,
    },
  ]),
) as Record<string, { inputPerMillion: number; outputPerMillion: number }>;

const FALLBACK_MODEL_COSTS: Record<string, { inputPerMillion: number; outputPerMillion: number }> = {
  'gpt-5.4-pro': { inputPerMillion: 15, outputPerMillion: 60 },
  'gpt-5.4': { inputPerMillion: 5, outputPerMillion: 20 },
  'gpt-4o': { inputPerMillion: 5, outputPerMillion: 15 },
  'claude-3.5-sonnet': { inputPerMillion: 3, outputPerMillion: 15 },
  'gemini-2.0-flash': { inputPerMillion: 0.1, outputPerMillion: 0.4 },
  default: { inputPerMillion: 1, outputPerMillion: 3 },
};

const TRIAL_AND_FREE_PLANS = [
  'free',
  'starter_trial',
  'basic_trial',
  'pro_trial',
  'studio_trial',
  'enterprise_trial',
];

function getDateRange(range: string): { start: Date; end: Date; days: number } {
  const end = new Date();
  const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '90d' ? 90 : 30;
  const start = new Date(end);
  start.setDate(start.getDate() - days);
  return { start, end, days };
}

function metadataRecord(value: unknown): LedgerMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as LedgerMetadata;
}

function numberFromMetadata(metadata: LedgerMetadata, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function stringFromMetadata(metadata: LedgerMetadata, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function normalizePlan(plan: string): string {
  return plan.replace(/_trial$/, '');
}

function getModelCost(model: string): { inputPerMillion: number; outputPerMillion: number } {
  return MODEL_COSTS[model] ?? FALLBACK_MODEL_COSTS[model] ?? FALLBACK_MODEL_COSTS.default;
}

function calculateAiLedgerCost(entry: { amount: number; metadata: unknown }): CalculatedAiCost {
  const metadata = metadataRecord(entry.metadata);
  const model = stringFromMetadata(metadata, ['model', 'modelId', 'providerModel'], 'unknown');
  const directCost = numberFromMetadata(metadata, ['costUSD', 'costUsd', 'usdCost'], Number.NaN);
  const totalTokens = numberFromMetadata(
    metadata,
    ['totalTokens', 'tokens', 'tokenCount'],
    Math.abs(entry.amount),
  );
  const inputTokens = numberFromMetadata(
    metadata,
    ['inputTokens', 'promptTokens'],
    Math.round(totalTokens * 0.7),
  );
  const outputTokens = numberFromMetadata(
    metadata,
    ['outputTokens', 'completionTokens'],
    Math.max(totalTokens - inputTokens, 0),
  );

  if (Number.isFinite(directCost) && directCost >= 0) {
    return { model, inputTokens, outputTokens, totalTokens, costUsd: directCost };
  }

  const cost = getModelCost(model);
  const costUsd =
    (inputTokens / 1_000_000) * cost.inputPerMillion +
    (outputTokens / 1_000_000) * cost.outputPerMillion;

  return { model, inputTokens, outputTokens, totalTokens, costUsd };
}

function buildAiMarginSnapshot(params: {
  revenueInRange: number;
  totalAICost: number;
  aiCallCount: number;
  dailyAICost: number;
  aiCostBreakdown: FinanceMetrics['aiCostBreakdown'];
}): AIMarginSnapshot {
  const { revenueInRange, totalAICost, aiCallCount, dailyAICost, aiCostBreakdown } = params;
  const grossMarginAfterAi = revenueInRange - totalAICost;
  const grossMarginAfterAiPercent = revenueInRange > 0 ? (grossMarginAfterAi / revenueInRange) * 100 : 0;
  const aiCostRatio = revenueInRange > 0 ? (totalAICost / revenueInRange) * 100 : totalAICost > 0 ? 100 : 0;
  const avgAiCostPerCall = aiCallCount > 0 ? totalAICost / aiCallCount : 0;
  const projectedMonthlyAiCost = dailyAICost * 30;
  const highRiskModelCount = aiCostBreakdown.filter(
    (item) => item.percentage >= 25 || item.cost >= Math.max(5, totalAICost * 0.25),
  ).length;
  const status: AIMarginSnapshot['status'] =
    grossMarginAfterAi < 0 || aiCostRatio > 80 ? 'risk' : aiCostRatio > 40 ? 'watch' : 'healthy';

  return {
    periodRevenue: revenueInRange,
    periodAiCost: totalAICost,
    grossMarginAfterAi,
    grossMarginAfterAiPercent,
    aiCostRatio,
    avgAiCostPerCall,
    projectedMonthlyAiCost,
    highRiskModelCount,
    topRiskModel: aiCostBreakdown[0]?.model ?? null,
    status,
  };
}

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
      },
    });

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
