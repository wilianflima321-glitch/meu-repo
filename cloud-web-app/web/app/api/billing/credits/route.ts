/**
 * AETHEL ENGINE - Credits API
 * 
 * Endpoint para gerenciamento de créditos do usuário.
 * Retorna saldo disponível, limite e uso.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('api/billing/credits/route');

interface CreditData {
  available: number;
  limit: number;
  used: number;
  lastUpdated: string;
}

// Mock de dados - Substituir por banco de dados real
const userCredits: Record<string, CreditData> = {};

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    // Buscar ou criar créditos do usuário
    if (!userCredits[userId]) {
      userCredits[userId] = {
        available: 5000,
        limit: 5000,
        used: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    const credits = userCredits[userId];

    return NextResponse.json({
      available: credits.available,
      limit: credits.limit,
      used: credits.limit - credits.available,
      lastUpdated: credits.lastUpdated,
    });
  } catch (error) {
    log.error('Error fetching credits', error);
    return NextResponse.json(
      { error: 'Failed to fetch credits' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    const userId = session?.user?.email || 'anonymous';

    const body = await request.json();
    const { action, amount } = body;

    if (!userCredits[userId]) {
      userCredits[userId] = {
        available: 5000,
        limit: 5000,
        used: 0,
        lastUpdated: new Date().toISOString(),
      };
    }

    switch (action) {
      case 'use':
        if (amount > userCredits[userId].available) {
          return NextResponse.json(
            { error: 'Insufficient credits' },
            { status: 400 }
          );
        }
        userCredits[userId].available -= amount;
        userCredits[userId].used += amount;
        break;

      case 'add':
        userCredits[userId].available += amount;
        userCredits[userId].limit += amount;
        break;

      case 'refund':
        userCredits[userId].available += amount;
        userCredits[userId].used -= amount;
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    userCredits[userId].lastUpdated = new Date().toISOString();

    return NextResponse.json({
      success: true,
      credits: userCredits[userId],
    });
  } catch (error) {
    log.error('Error updating credits', error);
    return NextResponse.json(
      { error: 'Failed to update credits' },
      { status: 500 }
    );
  }
}
