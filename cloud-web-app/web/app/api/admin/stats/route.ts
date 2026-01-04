/**
 * Admin System Stats API - Aethel Engine
 * GET /api/admin/stats - Estatísticas do sistema
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    
    // TODO: Verificar se é admin
    
    // Database stats
    const dbStats = {
      users: await prisma.user.count(),
      projects: await prisma.project.count(),
      files: await prisma.file.count(),
      assets: await prisma.asset.count(),
      sessions: await prisma.session.count(),
      subscriptions: await prisma.subscription.count(),
      auditLogs: await prisma.auditLog.count(),
      marketplaceItems: await prisma.marketplaceItem.count(),
    };
    
    // System info
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: process.env.NODE_ENV || 'development',
    };
    
    // Growth metrics (últimos 7 dias)
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
    console.error('Failed to get system stats:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
