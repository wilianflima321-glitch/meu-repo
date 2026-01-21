import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError, createAPIError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

// Lista de emails com permissão de admin (pode vir de env ou DB)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || ['admin@aethel.com', 'owner@aethel.io'];
const ADMIN_ROLES = ['admin', 'super_admin', 'owner'];

/**
 * Verifica se o usuário tem permissão de admin
 * Usa role do banco OU lista de emails permitidos
 */
async function requireAdminAccess(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, email: true, adminRole: true }
  });
  
  if (!user) {
    throw createAPIError('USER_NOT_FOUND', 'User not found');
  }
  
  const isAdmin = 
    ADMIN_ROLES.includes(user.role) ||
    ADMIN_ROLES.includes(user.adminRole || '') ||
    ADMIN_EMAILS.includes(user.email);
  
  if (!isAdmin) {
    throw createAPIError('FORBIDDEN', 'Admin access required');
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Verify Auth
    const auth = requireAuth(req);

    // 2. CRÍTICO: Verificar permissão de admin
    await requireAdminAccess(auth.userId);

    // 3. Fetch Users (sem dados ultra-sensíveis no response padrão)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        plan: true,
        role: true,
        createdAt: true,
        // stripeCustomerId removido - dados sensíveis não devem ser expostos
        _count: {
          select: { projects: true, sessions: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Limit to 50 for performance
    });

    return NextResponse.json({ users });
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    
    console.error('Admin Users Error:', error);
    return apiInternalError();
  }
}
