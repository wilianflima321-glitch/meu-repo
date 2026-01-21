/**
 * AETHEL ENGINE - Job Queue Start API
 * 
 * Endpoint para iniciar/resumir a fila de jobs.
 * 
 * POST /api/jobs/start - Inicia/resume a fila de processamento
 */

import { NextRequest, NextResponse } from 'next/server';

// Estado simulado da fila (em produção viria do Redis/DB)
let isQueueRunning = true;

// ============================================================================
// POST - Iniciar fila
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Em produção, isso enviaria um comando para o worker
    isQueueRunning = true;
    
    return NextResponse.json({
      success: true,
      status: 'running',
      message: 'Fila de jobs iniciada com sucesso',
      startedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Erro ao iniciar fila:', error);
    return NextResponse.json(
      { error: 'Erro interno ao iniciar fila' },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - Status da fila
// ============================================================================

export async function GET() {
  return NextResponse.json({
    isRunning: isQueueRunning,
    status: isQueueRunning ? 'running' : 'stopped',
  });
}
