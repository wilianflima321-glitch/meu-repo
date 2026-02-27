/**
 * Billing Plans API - Aethel Engine
 * GET /api/billing/plans - List all available plans
 * 
 * Planos alinhados com análise estratégica 2025
 * ZERO PREJUÍZO - Margem mínima 89%
 */

import { NextRequest, NextResponse } from 'next/server';
import { PLANS } from '@/lib/plans';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * Planos definitivos - alinhados com custos reais
 * Todos os planos incluem os 17 sistemas AAA do Engine
 * Diferença está apenas no volume de IA e features extras
 */
export async function GET(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: 'billing-plans-get',
      key: getRequestIp(req),
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many plan requests. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    return NextResponse.json({
      plans: PLANS,
      success: true,
      currency: {
        default: 'USD',
        available: ['USD', 'BRL'],
        rates: { BRL: 5.0 }, // Taxa aproximada
      },
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
