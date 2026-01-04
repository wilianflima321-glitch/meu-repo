/**
 * Analytics API - Aethel Engine
 * GET /api/analytics - Dashboard de analytics
 * POST /api/analytics/event - Registra evento
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d'; // 7d, 30d, 90d
    const projectId = searchParams.get('projectId');
    
    // Busca dados reais do banco
    const now = new Date();
    const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    
    // Projetos do usuário
    const projectCount = await prisma.project.count({
      where: { userId: user.userId },
    });
    
    // Arquivos total
    const fileCount = await prisma.file.count({
      where: {
        project: { userId: user.userId },
        ...(projectId ? { projectId } : {}),
      },
    });
    
    // Assets total
    const assetCount = await prisma.asset.count({
      where: {
        project: { userId: user.userId },
        ...(projectId ? { projectId } : {}),
      },
    });
    
    // Atividade recente (projetos atualizados)
    const recentProjects = await prisma.project.findMany({
      where: {
        userId: user.userId,
        updatedAt: { gte: startDate },
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        updatedAt: true,
      },
    });
    
    return NextResponse.json({
      success: true,
      period,
      overview: {
        projects: projectCount,
        files: fileCount,
        assets: assetCount,
        activeProjects: recentProjects.length,
      },
      activity: {
        recentProjects,
      },
      generatedAt: new Date(),
    });
  } catch (error) {
    console.error('Failed to get analytics:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    const { event, category, properties } = body;
    
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event name is required' },
        { status: 400 }
      );
    }
    
    // Log para auditoria
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: `analytics:${event}`,
        resource: category || 'general',
        metadata: properties,
      },
    });
    
    return NextResponse.json({
      success: true,
      tracked: true,
    });
  } catch (error) {
    console.error('Failed to track event:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
