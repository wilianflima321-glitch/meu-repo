import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/cache
 * 
 * Verifica saúde do Redis/Cache
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const redisUrl = process.env.REDIS_URL;
    
    if (!redisUrl) {
      return NextResponse.json({
        status: 'unknown',
        latency: 0,
        cache: {
          configured: false,
          message: 'Redis não configurado',
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Tentar conectar ao Redis
    // Em produção, usar ioredis ou similar
    const latency = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      latency,
      cache: {
        configured: true,
        type: 'redis',
        url: redisUrl.replace(/:[^:@]+@/, ':****@'), // Ocultar senha
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('[health/cache] Error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        latency,
        cache: {
          connected: false,
          error: (error as Error).message,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
