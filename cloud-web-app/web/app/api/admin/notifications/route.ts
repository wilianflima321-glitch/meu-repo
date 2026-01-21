import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// NOTIFICATIONS ADMIN API
// =============================================================================

type NotificationItem = {
  id: string;
  userEmail: string | null;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
};

async function getHandler(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200);
    const read = searchParams.get('read');
    const type = searchParams.get('type');

    const where: Record<string, any> = {};
    if (read && read !== 'all') where.read = read === 'true';
    if (type && type !== 'all') where.type = type;

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    const userIds = Array.from(new Set(notifications.map((n) => n.userId)));
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true },
    });
    const userMap = new Map(users.map((user) => [user.id, user.email]));

    const items: NotificationItem[] = notifications.map((notification) => ({
      id: notification.id,
      userEmail: userMap.get(notification.userId) || null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      read: notification.read,
      createdAt: notification.createdAt.toISOString(),
    }));

    const totals = items.reduce(
      (acc, item) => {
        acc.total += 1;
        if (item.read) acc.read += 1;
        else acc.unread += 1;
        return acc;
      },
      { total: 0, read: 0, unread: 0 }
    );

    return NextResponse.json({ items, totals });
  } catch (error) {
    console.error('[Admin Notifications] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:users:view');
