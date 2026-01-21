import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// SUBSCRIPTIONS ADMIN API
// =============================================================================

type PlanSummary = {
  id: string;
  name: string;
  priceUSD: number;
  users: number;
  mrr: number;
  isTrial: boolean;
};

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

function formatPlanName(plan: string) {
  const normalized = plan.replace('_trial', '');
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

async function getHandler(_req: NextRequest) {
  try {
    const grouped = await prisma.user.groupBy({
      by: ['plan'],
      _count: { id: true },
    });

    const counts = new Map<string, number>();
    grouped.forEach((item) => counts.set(item.plan, item._count.id));

    const plans: PlanSummary[] = Object.keys(PLAN_PRICES).map((plan) => {
      const users = counts.get(plan) || 0;
      const priceUSD = PLAN_PRICES[plan] || 0;
      return {
        id: plan,
        name: formatPlanName(plan),
        priceUSD,
        users,
        mrr: priceUSD * users,
        isTrial: plan.endsWith('_trial'),
      };
    });

    const totals = plans.reduce(
      (acc, plan) => {
        acc.users += plan.users;
        acc.mrr += plan.mrr;
        return acc;
      },
      { users: 0, mrr: 0 }
    );

    return NextResponse.json({ plans, totals });
  } catch (error) {
    console.error('[Admin Subscriptions] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch subscriptions' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:finance:view');
