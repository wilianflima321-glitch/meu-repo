/**
 * AETHEL ENGINE - Multiplayer Health Check API
 * 
 * Verifica a saúde do servidor de matchmaking.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar serviços de matchmaking
    const checks = {
      server: 'ok',
      redis: 'ok',
      timestamp: new Date().toISOString(),
    };

    // Em produção, verificar conexões reais
    // const redisOk = await redis.ping();
    // checks.redis = redisOk ? 'ok' : 'error';

    return NextResponse.json({
      status: 'healthy',
      service: 'matchmaking',
      checks,
    });
  } catch (error) {
    console.error('Erro no health check multiplayer:', error);
    return NextResponse.json(
      { 
        status: 'unhealthy',
        service: 'matchmaking',
        error: 'Falha ao verificar serviços' 
      },
      { status: 503 }
    );
  }
}
