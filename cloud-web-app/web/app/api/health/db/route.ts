import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * GET /api/health/db
 * 
 * Verifica saúde do banco de dados
 */
export async function GET(_request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // Testar conexão
    await prisma.$queryRaw`SELECT 1`;
    
    // Verificar tabelas principais
    let userCount = 0;
    let projectCount = 0;
    
    try {
      userCount = await prisma.user.count();
      projectCount = await prisma.project.count();
    } catch {
      // Tabelas podem não existir
    }
    
    const latency = Date.now() - startTime;

    return NextResponse.json({
      status: 'healthy',
      latency,
      database: {
        connected: true,
        provider: 'postgresql',
        stats: {
          users: userCount,
          projects: projectCount,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error('[health/db] Error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        latency,
        database: {
          connected: false,
          error: (error as Error).message,
        },
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
