/**
 * Admin Quick Stats API - Métricas Rápidas
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/db';
import emergencyController from '@/lib/emergency-mode';

export const GET = withAdminAuth(
  async (request, { user }) => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Busca estatísticas em paralelo
    const [
      activeUsersResult,
      requestsResult,
      emergencyState,
    ] = await Promise.all([
      // Usuários ativos na última hora (simplificado)
      prisma.user.count({
        where: {
          updatedAt: { gte: oneHourAgo },
        },
      }),
      
      // Requests hoje (baseado em logs ou metering)
      prisma.creditLedgerEntry.count({
        where: {
          timestamp: { gte: todayStart },
        },
      }),
      
      // Estado de emergência
      emergencyController.updateMetrics(),
    ]);
    
    const state = emergencyController.getState();
    
    // Calcula requests por minuto (estimativa)
    const minutesSinceStart = Math.max(1, (now.getTime() - todayStart.getTime()) / 60000);
    const requestsPerMinute = Math.round(requestsResult / minutesSinceStart);
    
    return NextResponse.json({
      success: true,
      stats: {
        activeUsers: activeUsersResult,
        requestsPerMinute,
        aiCostToday: state.metrics.dailySpend,
        emergencyLevel: state.level,
      },
      timestamp: now.toISOString(),
    });
  },
  'ops:dashboard:view'
);
