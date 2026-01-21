import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/render/jobs/{jobId}/cancel
 * 
 * Cancela um job de renderização em andamento
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const user = requireAuth(request);
    const { jobId } = params;

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId é obrigatório' },
        { status: 400 }
      );
    }

    // Em produção, isso enviaria comando para o worker/queue
    // Por enquanto, retorna sucesso simulado
    
    // TODO: Implementar integração real com sistema de renderização
    // - Verificar se o job pertence ao usuário
    // - Enviar comando SIGTERM para o processo
    // - Atualizar status no banco de dados
    // - Notificar via WebSocket
    
    console.log(`[render/jobs/${jobId}/cancel] Cancelando job para usuário ${user.userId}`);

    return NextResponse.json({
      success: true,
      jobId,
      status: 'cancelled',
      cancelledAt: new Date().toISOString(),
      message: 'Job de renderização cancelado com sucesso',
    });
  } catch (error) {
    console.error('[render/jobs/cancel] Error:', error);
    return NextResponse.json(
      { error: 'Falha ao cancelar renderização' },
      { status: 500 }
    );
  }
}
