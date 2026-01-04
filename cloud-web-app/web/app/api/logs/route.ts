/**
 * Logs API - Aethel Engine
 * GET /api/logs - Lista logs do sistema
 * POST /api/logs - Cria novo log
 * 
 * Integra com o sistema de logging em lib/logging-system.ts
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const level = searchParams.get('level'); // debug, info, warn, error, fatal
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    // Busca do AuditLog (logs de auditoria do sistema)
    const where: Record<string, unknown> = {};
    
    if (level) where.action = { contains: level };
    if (category) where.action = { startsWith: category };
    if (startDate) where.createdAt = { ...where.createdAt as object, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt as object, lte: new Date(endDate) };
    
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Failed to get logs:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const body = await request.json();
    
    const { action, resource, metadata } = body;
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }
    
    const log = await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action,
        resource,
        metadata: metadata || {},
      },
    });
    
    return NextResponse.json({
      success: true,
      log,
    });
  } catch (error) {
    console.error('Failed to create log:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
