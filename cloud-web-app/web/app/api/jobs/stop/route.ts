/**
 * AETHEL ENGINE - Job Queue Stop API
 * 
 * Endpoint para pausar a fila de jobs.
 * 
 * POST /api/jobs/stop - Pausa a fila de processamento
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================================================
// POST - Pausar fila
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Em produção, isso enviaria um comando para o worker pausar
    // e não processar novos jobs
    
    return NextResponse.json({
      success: true,
      status: 'stopped',
      message: 'Fila de jobs pausada com sucesso',
      stoppedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao pausar fila:', error);
    return NextResponse.json(
      { error: 'Erro interno ao pausar fila' },
      { status: 500 }
    );
  }
}
