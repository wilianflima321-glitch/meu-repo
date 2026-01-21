/**
 * AETHEL ENGINE - Job Cancel API
 * 
 * Endpoint para cancelar um job específico na fila.
 * 
 * POST /api/jobs/{id}/cancel - Cancela um job pendente/executando
 */

import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// ============================================================================
// POST - Cancelar job
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id } = await params;
    
    // Simular cancelamento de job
    // Em produção, isso acessaria o Redis/PostgreSQL para atualizar o status
    
    // Simular verificação se o job existe
    const jobExists = true; // Mock
    
    if (!jobExists) {
      return NextResponse.json(
        { error: 'Job não encontrado' },
        { status: 404 }
      );
    }
    
    // Simular verificação se o job pode ser cancelado
    const canCancel = true; // Jobs pendentes ou em execução podem ser cancelados
    
    if (!canCancel) {
      return NextResponse.json(
        { error: 'Este job não pode ser cancelado' },
        { status: 400 }
      );
    }
    
    const cancelledJob = {
      id,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      message: 'Job cancelado com sucesso',
    };
    
    return NextResponse.json({
      success: true,
      job: cancelledJob,
    });
  } catch (error) {
    console.error('Erro ao cancelar job:', error);
    return NextResponse.json(
      { error: 'Erro interno ao cancelar job' },
      { status: 500 }
    );
  }
}
