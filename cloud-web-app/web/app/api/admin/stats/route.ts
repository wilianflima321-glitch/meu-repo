/**
 * Admin System Stats API
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { withAdminAuth } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

async function getHandler(_request: NextRequest) {
  try {
    const dbStats = {
      users: await prisma.user.count(),
      projects: await prisma.project.count(),
      files: await prisma.file.count(),
      assets: await prisma.asset.count(),
      sessions: 0,
      subscriptions: await prisma.subscription.count(),
      auditLogs: await prisma.auditLog.count(),
      marketplaceItems: await prisma.marketplaceItem.count(),
    };

    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
    };

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentGrowth = {
      newUsers: await prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      newProjects: await prisma.project.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      newAssets: await prisma.asset.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    };

    return NextResponse.json({
      success: true,
      stats: {
        database: dbStats,
        system: systemInfo,
        growth: recentGrowth,
      },
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('[admin/stats] Failed to get system stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export const GET = withAdminAuth(getHandler, 'ops:dashboard:metrics');
