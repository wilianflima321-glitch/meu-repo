/**
 * AI Metrics API - Métricas de uso de IA
 */

import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/rbac';
import { prisma } from '@/lib/db';

export const GET = withAdminAuth(
  async (request, { user }) => {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    try {
      // Busca entradas de AI na ledger
      const entries = await prisma.creditLedgerEntry.findMany({
        where: {
          timestamp: { gte: last24h },
          operationType: { in: ['ai_chat', 'ai_generation', 'usage'] },
        },
        select: {
          amount: true,
          metadata: true,
          operationType: true,
        },
      });
      
      // Calcula métricas
      let totalCalls = entries.length;
      let totalTokens = 0;
      let totalCost = 0;
      let totalLatency = 0;
      let errorCount = 0;
      const modelBreakdown: Record<string, { calls: number; cost: number; tokens: number }> = {};
      
      for (const entry of entries) {
        const metadata = entry.metadata as any;
        if (metadata) {
          const tokens = (metadata.inputTokens || 0) + (metadata.outputTokens || 0);
          const cost = metadata.costUSD || Math.abs(entry.amount) * 0.001;
          const model = metadata.model || 'unknown';
          const latency = metadata.latencyMs || 0;
          
          totalTokens += tokens;
          totalCost += cost;
          totalLatency += latency;
          
          if (metadata.status === 'error' || metadata.status === 'timeout') {
            errorCount++;
          }
          
          if (!modelBreakdown[model]) {
            modelBreakdown[model] = { calls: 0, cost: 0, tokens: 0 };
          }
          modelBreakdown[model].calls++;
          modelBreakdown[model].cost += cost;
          modelBreakdown[model].tokens += tokens;
        }
      }
      
      const avgLatency = totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0;
      const errorRate = totalCalls > 0 ? errorCount / totalCalls : 0;
      
      return NextResponse.json({
        success: true,
        metrics: {
          totalCalls,
          totalTokens,
          totalCost,
          avgLatency,
          errorRate,
          modelBreakdown,
        },
      });
      
    } catch (error) {
      console.error('[AI Metrics] Error:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch metrics',
      }, { status: 500 });
    }
  },
  'ops:agents:view'
);
