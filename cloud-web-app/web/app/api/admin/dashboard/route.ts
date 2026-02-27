/**
 * Admin Dashboard API - Aethel Engine
 * GET /api/admin/dashboard - Dashboard completo de admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'admin-dashboard-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many admin dashboard requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    
    // Verificar se é admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { role: true },
    });
    
    if (!dbUser || (dbUser.role !== 'admin' && dbUser.role !== 'super_admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Admin access required' },
        { status: 403 }
      );
    }
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Estatísticas de usuários
    const [
      totalUsers,
      newUsersThisMonth,
      newUsersThisWeek,
      newUsersToday,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: today } } }),
    ]);
    
    // Estatísticas de projetos
    const [
      totalProjects,
      activeProjects,
    ] = await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { updatedAt: { gte: sevenDaysAgo } } }),
    ]);
    
    // Estatísticas de arquivos e assets
    const [
      totalFiles,
      totalAssets,
    ] = await Promise.all([
      prisma.file.count(),
      prisma.asset.count(),
    ]);
    
    // Planos ativos
    const planDistribution = await prisma.user.groupBy({
      by: ['plan'],
      _count: { plan: true },
    });
    
    // Atividade recente
    const recentActivity = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        userId: true,
        action: true,
        resource: true,
        createdAt: true,
      },
    });
    
    // Receita (se houver subscriptions)
    const activeSubscriptions = await prisma.subscription.count({
      where: { status: 'active' },
    });
    
    return NextResponse.json({
      success: true,
      dashboard: {
        users: {
          total: totalUsers,
          newThisMonth: newUsersThisMonth,
          newThisWeek: newUsersThisWeek,
          newToday: newUsersToday,
        },
        projects: {
          total: totalProjects,
          activeThisWeek: activeProjects,
        },
        content: {
          files: totalFiles,
          assets: totalAssets,
        },
        plans: planDistribution.reduce((acc, p) => {
          acc[p.plan] = p._count.plan;
          return acc;
        }, {} as Record<string, number>),
        subscriptions: {
          active: activeSubscriptions,
        },
        recentActivity,
      },
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to get admin dashboard:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
