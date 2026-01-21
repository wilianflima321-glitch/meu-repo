import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/prisma';

const handler = async (_req: NextRequest) => {
  const onboardingActions = await prisma.auditLog.findMany({
    where: {
      action: { startsWith: 'onboarding.' },
    },
    select: {
      action: true,
      userId: true,
      createdAt: true,
      metadata: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });

  const uniqueUsers = new Set(onboardingActions.map((entry) => entry.userId)).size;
  const actionCounts: Record<string, number> = {};

  for (const entry of onboardingActions) {
    actionCounts[entry.action] = (actionCounts[entry.action] || 0) + 1;
  }

  const lastActivity = onboardingActions[0]?.createdAt?.toISOString() ?? null;

  return NextResponse.json({
    success: true,
    stats: {
      totalActions: onboardingActions.length,
      uniqueUsers,
      lastActivity,
      actionCounts,
    },
  });
};

export const GET = withAdminAuth(handler, 'ops:users:view');
