import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth } from '@/lib/rbac';

// =============================================================================
// MODERATION QUEUE API
// =============================================================================

async function getQueueHandler(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') || 'pending';
  
  try {
    // Build where clause based on filter
    const where: any = {};
    
    if (filter === 'pending') {
      where.status = 'pending';
    } else if (filter === 'urgent') {
      where.status = 'pending';
      where.priority = 'urgent';
    }
    // 'all' - no filter
    
    // Fetch moderation items
    const items = await prisma.moderationItem.findMany({
      where,
      orderBy: [
        { priority: 'desc' }, // urgent first
        { createdAt: 'asc' }, // oldest first within priority
      ],
      take: 50,
    });
    
    // Enrich with user emails if we have target owner IDs
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        let targetOwnerEmail: string | undefined;
        
        if (item.targetOwnerId) {
          const owner = await prisma.user.findUnique({
            where: { id: item.targetOwnerId },
            select: { email: true },
          });
          targetOwnerEmail = owner?.email;
        }
        
        return {
          ...item,
          targetOwnerEmail,
          contentSnapshot: item.contentSnapshot as any,
          autoFlags: item.autoFlags ? JSON.parse(item.autoFlags as string) : undefined,
        };
      })
    );
    
    // Calculate stats
    const [pendingCount, urgentCount, todayProcessed] = await Promise.all([
      prisma.moderationItem.count({ where: { status: 'pending' } }),
      prisma.moderationItem.count({ where: { status: 'pending', priority: 'urgent' } }),
      prisma.moderationItem.count({
        where: {
          resolvedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);
    
    // Calculate average response time (simplified)
    const recentResolved = await prisma.moderationItem.findMany({
      where: {
        resolvedAt: { not: null },
      },
      select: {
        createdAt: true,
        resolvedAt: true,
      },
      orderBy: { resolvedAt: 'desc' },
      take: 100,
    });
    
    let avgResponseTime = 0;
    if (recentResolved.length > 0) {
      const totalMinutes = recentResolved.reduce((sum, item) => {
        if (!item.resolvedAt) return sum;
        const diff = item.resolvedAt.getTime() - item.createdAt.getTime();
        return sum + diff / (1000 * 60);
      }, 0);
      avgResponseTime = Math.round(totalMinutes / recentResolved.length);
    }
    
    return NextResponse.json({
      items: enrichedItems,
      stats: {
        pending: pendingCount,
        urgent: urgentCount,
        todayProcessed,
        avgResponseTime,
      },
    });
    
  } catch (error) {
    console.error('[Moderation Queue] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch moderation queue' },
      { status: 500 }
    );
  }
}

export const GET = withAdminAuth(getQueueHandler, 'ops:moderation:view');
