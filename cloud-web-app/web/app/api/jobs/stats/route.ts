/**
 * AETHEL ENGINE - Jobs Statistics API
 * 
 * Estatísticas agregadas de jobs.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    // Em produção, calcular a partir do banco de dados
    const stats = {
      total: 156,
      today: 23,
      thisWeek: 89,
      thisMonth: 156,
      
      byStatus: {
        queued: 5,
        processing: 3,
        completed: 142,
        failed: 4,
        cancelled: 2,
      },
      
      byType: {
        build: 67,
        render: 34,
        export: 28,
        import: 15,
        compress: 8,
        upload: 4,
      },
      
      averageDuration: {
        build: 45000, // ms
        render: 180000,
        export: 30000,
        import: 20000,
        compress: 15000,
        upload: 10000,
      },
      
      successRate: 96.2,
      
      lastHour: {
        total: 8,
        completed: 6,
        failed: 1,
        processing: 1,
      },
      
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return NextResponse.json(
      { error: 'Falha ao buscar estatísticas' },
      { status: 500 }
    );
  }
}
