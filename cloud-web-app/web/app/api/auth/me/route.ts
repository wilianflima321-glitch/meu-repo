import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

/**
 * GET /api/auth/me
 * 
 * Retorna dados do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = requireAuth(request);
    
    // Buscar dados completos do usuário
    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Buscar informações de créditos/plano se disponível
    let credits = null;
    let plan: string | null = null;
    
    try {
      // @ts-ignore - Tabela pode não existir no schema
      const creditBalance = await (prisma as any).creditBalance?.findUnique?.({
        where: { userId: user.id },
      });
      if (creditBalance) {
        credits = creditBalance.balance;
      }
    } catch {
      // Tabela pode não existir
    }

    try {
      const subscription = await prisma.subscription.findFirst({
        where: { userId: user.id, status: 'active' },
        orderBy: { createdAt: 'desc' },
      });
      if (subscription) {
        plan = subscription.stripePriceId || 'pro';
      }
    } catch {
      // Tabela pode não existir
    }

    return NextResponse.json({
      ...user,
      credits,
      plan: plan || 'free',
      authenticated: true,
    });
  } catch (error) {
    console.error('[auth/me] Error:', error);
    
    // Se não autenticado, retornar null (não erro)
    if ((error as Error).message?.includes('Unauthorized') || 
        (error as Error).message?.includes('Not authenticated')) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }
    
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
