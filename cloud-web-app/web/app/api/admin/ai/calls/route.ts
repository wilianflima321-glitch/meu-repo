/**
 * AI Calls API - Histórico de chamadas de IA
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export const GET = withAdminAuth(
  async (request, { user }) => {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const model = searchParams.get('model') || 'all';
    const status = searchParams.get('status') || 'all';
    
    try {
      // Busca entradas recentes
      const entries = await prisma.creditLedgerEntry.findMany({
        where: {
          entryType: { in: ['ai_chat', 'ai_generation'] },
        },
        orderBy: { createdAt: 'desc' },
        take: limit * 2, // Pega mais para filtrar depois
        include: {
          user: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });
      
      // Transforma em formato de AI calls
      let calls = entries
        .filter(entry => {
          const metadata = entry.metadata as any;
          if (!metadata) return false;
          
          // Filtra por modelo
          if (model !== 'all' && metadata.model !== model) return false;
          
          // Filtra por status
          if (status !== 'all' && metadata.status !== status) return false;
          
          return true;
        })
        .slice(0, limit)
        .map(entry => {
          const metadata = entry.metadata as any;
          return {
            id: entry.id,
            userId: entry.userId,
            userEmail: entry.user?.email || 'unknown',
            model: metadata?.model || 'unknown',
            provider: metadata?.provider || 'unknown',
            inputTokens: metadata?.inputTokens || 0,
            outputTokens: metadata?.outputTokens || 0,
            cost: metadata?.costUSD || Math.abs(entry.amount) * 0.001,
            latencyMs: metadata?.latencyMs || 0,
            status: metadata?.status || 'success',
            prompt: metadata?.prompt || '[Not recorded]',
            response: metadata?.response || '[Not recorded]',
            timestamp: entry.createdAt.toISOString(),
            projectId: metadata?.projectId,
            operation: metadata?.operation || entry.entryType,
          };
        });
      
      return NextResponse.json({
        success: true,
        calls,
        total: calls.length,
      });
      
    } catch (error) {
      console.error('[AI Calls] Error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch calls',
      }, { status: 500 });
    }
  },
  'ops:agents:logs'
);
