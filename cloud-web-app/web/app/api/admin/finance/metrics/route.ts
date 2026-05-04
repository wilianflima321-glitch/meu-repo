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
  aiMarginDrilldown: AIMarginDrilldown;
  aiMarginRecommendations: AIMarginRecommendation[];
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

interface AIMarginDrilldown {
  topUsers: Array<{
    userId: string;
    userEmail: string;
    plan: string;
    revenue: number;
    cost: number;
    marginAfterAi: number;
    aiCostRatio: number;
    calls: number;
    tokens: number;
    percentage: number;
    status: AIMarginSnapshot['status'];
  }>;
  topWorkspaces: Array<{
    workspaceId: string;
    cost: number;
    calls: number;
    tokens: number;
    percentage: number;
    topModel: string | null;
    status: AIMarginSnapshot['status'];
  }>;
}

interface AIMarginRecommendation {
  id: string;
  priority: 'critical' | 'warning' | 'info';
  scope: 'global' | 'user' | 'workspace' | 'model';
  target: string;
  title: string;
  rationale: string;
  action: string;
  expectedImpact: string;
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

function statusForMargin(revenue: number, cost: number): AIMarginSnapshot['status'] {
  if (cost <= 0) return 'healthy';
  if (revenue <= 0) return 'risk';
  const ratio = (cost / revenue) * 100;
  if (ratio > 80 || revenue - cost < 0) return 'risk';
  if (ratio > 40) return 'watch';
  return 'healthy';
}

function buildAiMarginDrilldown(params: {
  aiUsage: Array<{
    amount: number;
    metadata: unknown;
    userId: string;
    user?: { email: string; plan: string } | null;
  }>;
  totalAICost: number;
  revenueByUserId: Map<string, number>;
}): AIMarginDrilldown {
  const { aiUsage, totalAICost, revenueByUserId } = params;
  const userMap = new Map<string, {
    userId: string;
    userEmail: string;
    plan: string;
    cost: number;
    calls: number;
    tokens: number;
  }>();
  const workspaceMap = new Map<string, {
    workspaceId: string;
    cost: number;
    calls: number;
    tokens: number;
    models: Map<string, number>;
  }>();

  aiUsage.forEach((entry) => {
    const metadata = metadataRecord(entry.metadata);
    const calculated = calculateAiLedgerCost(entry);
    const user = userMap.get(entry.userId) ?? {
      userId: entry.userId,
      userEmail: entry.user?.email ?? 'unknown',
      plan: normalizePlan(entry.user?.plan ?? 'free'),
      cost: 0,
      calls: 0,
      tokens: 0,
    };
    user.cost += calculated.costUsd;
    user.calls += 1;
    user.tokens += calculated.totalTokens;
    userMap.set(entry.userId, user);

    const workspaceId = stringFromMetadata(
      metadata,
      ['projectId', 'workspaceId', 'project_id', 'workspace_id'],
      'unattributed',
    );
    const workspace = workspaceMap.get(workspaceId) ?? {
      workspaceId,
      cost: 0,
      calls: 0,
      tokens: 0,
      models: new Map<string, number>(),
    };
    workspace.cost += calculated.costUsd;
    workspace.calls += 1;
    workspace.tokens += calculated.totalTokens;
    workspace.models.set(calculated.model, (workspace.models.get(calculated.model) ?? 0) + calculated.costUsd);
    workspaceMap.set(workspaceId, workspace);
  });

  const topUsers = Array.from(userMap.values())
    .map((user) => {
      const revenue = revenueByUserId.get(user.userId) ?? 0;
      const marginAfterAi = revenue - user.cost;
      const aiCostRatio = revenue > 0 ? (user.cost / revenue) * 100 : user.cost > 0 ? 100 : 0;
      return {
        ...user,
        revenue,
        marginAfterAi,
        aiCostRatio,
        percentage: totalAICost > 0 ? (user.cost / totalAICost) * 100 : 0,
        status: statusForMargin(revenue, user.cost),
      };
    })
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const topWorkspaces = Array.from(workspaceMap.values())
    .map((workspace) => {
      const sortedModels = Array.from(workspace.models.entries()).sort((a, b) => b[1] - a[1]);
      const percentage = totalAICost > 0 ? (workspace.cost / totalAICost) * 100 : 0;
      const status: AIMarginSnapshot['status'] =
        percentage > 40 ? 'risk' : percentage > 20 || workspace.workspaceId === 'unattributed' ? 'watch' : 'healthy';
      return {
        workspaceId: workspace.workspaceId,
        cost: workspace.cost,
        calls: workspace.calls,
        tokens: workspace.tokens,
        percentage,
        topModel: sortedModels[0]?.[0] ?? null,
        status,
      };
    })
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  return { topUsers, topWorkspaces };
}

function buildAiMarginRecommendations(params: {
  snapshot: AIMarginSnapshot;
  drilldown: AIMarginDrilldown;
  aiCostBreakdown: FinanceMetrics['aiCostBreakdown'];
}): AIMarginRecommendation[] {
  const { snapshot, drilldown, aiCostBreakdown } = params;
  const recommendations: AIMarginRecommendation[] = [];

  if (snapshot.status === 'risk') {
    recommendations.push({
      id: 'global-ai-margin-risk',
      priority: 'critical',
      scope: 'global',
      target: 'AI margin',
      title: 'Protect AI gross margin now',
      rationale: `AI cost is consuming ${snapshot.aiCostRatio.toFixed(1)}% of period revenue.`,
      action: 'Apply a temporary workspace budget cap and route routine work to budget models until margin recovers.',
      expectedImpact: 'Stops negative-margin agent waves before they scale across the platform.',
    });
  } else if (snapshot.status === 'watch') {
    recommendations.push({
      id: 'global-ai-margin-watch',
      priority: 'warning',
      scope: 'global',
      target: 'AI margin',
      title: 'Watch AI cost pressure',
      rationale: `AI cost is above the 40% watch threshold at ${snapshot.aiCostRatio.toFixed(1)}%.`,
      action: 'Review high-cost users and workspaces before raising paid-plan limits.',
      expectedImpact: 'Keeps free/trial growth from hiding token-cost leakage.',
    });
  }

  const topRiskUser = drilldown.topUsers.find((user) => user.status === 'risk' || user.status === 'watch');
  if (topRiskUser) {
    recommendations.push({
      id: `user-margin-${topRiskUser.userId}`,
      priority: topRiskUser.status === 'risk' ? 'critical' : 'warning',
      scope: 'user',
      target: topRiskUser.userEmail,
      title: 'Review user AI economics',
      rationale: `${topRiskUser.userEmail} consumed ${topRiskUser.aiCostRatio.toFixed(1)}% of recognized user revenue in AI cost.`,
      action: 'Check plan fit, daily budget, and whether this user should move to Studio/Enterprise usage governance.',
      expectedImpact: 'Prevents one power user from turning a healthy plan into a negative-margin account.',
    });
  }

  const unattributedWorkspace = drilldown.topWorkspaces.find((workspace) => workspace.workspaceId === 'unattributed');
  if (unattributedWorkspace) {
    recommendations.push({
      id: 'workspace-unattributed-ai-cost',
      priority: 'warning',
      scope: 'workspace',
      target: 'unattributed',
      title: 'Fix AI cost attribution',
      rationale: `${unattributedWorkspace.percentage.toFixed(1)}% of AI spend has no project/workspace metadata.`,
      action: 'Require projectId/workspaceId metadata on every AI ledger write before launching broader agent automation.',
      expectedImpact: 'Makes billing, support, and agent governance auditable per workspace.',
    });
  }

  const concentratedWorkspace = drilldown.topWorkspaces.find(
    (workspace) => workspace.workspaceId !== 'unattributed' && workspace.status !== 'healthy',
  );
  if (concentratedWorkspace) {
    recommendations.push({
      id: `workspace-margin-${concentratedWorkspace.workspaceId}`,
      priority: concentratedWorkspace.status === 'risk' ? 'critical' : 'warning',
      scope: 'workspace',
      target: concentratedWorkspace.workspaceId,
      title: 'Add workspace budget guardrail',
      rationale: `${concentratedWorkspace.workspaceId} represents ${concentratedWorkspace.percentage.toFixed(1)}% of AI spend in this range.`,
      action: 'Set a workspace-level budget warning and review whether long-running agents need approval gates.',
      expectedImpact: 'Protects collaborative projects from silent high-cost agent loops.',
    });
  }

  const dominantModel = aiCostBreakdown[0];
  if (dominantModel && dominantModel.percentage > 40) {
    recommendations.push({
      id: `model-concentration-${dominantModel.model}`,
      priority: dominantModel.percentage > 70 ? 'critical' : 'warning',
      scope: 'model',
      target: dominantModel.model,
      title: 'Reduce model concentration risk',
      rationale: `${dominantModel.model} accounts for ${dominantModel.percentage.toFixed(1)}% of AI cost.`,
      action: 'Introduce model-routing policy: premium models for review/complex tasks, budget models for routine edits and summaries.',
      expectedImpact: 'Cuts token spend without weakening high-value agent work.',
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      id: 'ai-margin-healthy',
      priority: 'info',
      scope: 'global',
      target: 'AI margin',
      title: 'AI margin is healthy',
      rationale: 'No user, workspace, or model is currently breaching margin thresholds.',
      action: 'Keep monitoring before increasing free/trial limits or raising default model quality.',
      expectedImpact: 'Maintains confidence while product usage grows.',
    });
  }

  return recommendations.slice(0, 5);
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
