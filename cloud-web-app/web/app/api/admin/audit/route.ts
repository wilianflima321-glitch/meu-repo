/**
 * Admin Audit Log API - Aethel Engine
 * GET /api/admin/audit - Lista logs de auditoria
 */

import { NextRequest, NextResponse } from 'next/server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { withAdminAuth } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const userId = searchParams.get('userId');
    const action = searchParams.get('action');
    const adminEmail = searchParams.get('adminEmail');
    const severity = searchParams.get('severity');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    const where: any = {};
    
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action };
    if (adminEmail) where.adminEmail = { contains: adminEmail };
    if (severity) where.severity = severity;
    if (startDate) where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    if (endDate) where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    
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
    console.error('Failed to get audit logs:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export const GET = withAdminAuth(getHandler, 'ops:dashboard:metrics');
