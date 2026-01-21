import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// PAYMENTS ADMIN API
// =============================================================================

type PaymentItem = {
  id: string;
  userEmail: string | null;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);

    const where: Record<string, any> = {};
    if (status && status !== 'all') where.status = status;

    const payments = await prisma.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = Array.from(new Set(payments.map((payment) => payment.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user.email]));

    const items: PaymentItem[] = payments.map((payment) => ({
      id: payment.id,
      userEmail: userMap.get(payment.userId) || null,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    }));

    const totals = payments.reduce(
      (acc, payment) => {
        acc.total += payment.amount / 100;
        if (payment.status === 'succeeded') acc.succeeded += payment.amount / 100;
        if (payment.status === 'pending') acc.pending += payment.amount / 100;
        if (payment.status === 'failed') acc.failed += payment.amount / 100;
        return acc;
      },
      { total: 0, succeeded: 0, pending: 0, failed: 0 }
    );

    return NextResponse.json({ items, totals });
  } catch (error) {
    console.error('[Admin Payments] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:finance:view');
