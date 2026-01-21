import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

/**
 * POST /api/terminal/close
 * 
 * Fecha uma sessão de terminal
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId é obrigatório' },
        { status: 400 }
      );
    }

    // Em produção, isso enviaria comando para encerrar o processo PTY
    // Por enquanto, apenas logamos e retornamos sucesso
    console.log(`[terminal/close] Fechando sessão ${sessionId} para usuário ${user.userId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Sessão de terminal encerrada',
    });
  } catch (error) {
    console.error('[terminal/close] Error:', error);
    return NextResponse.json(
      { error: 'Falha ao fechar terminal' },
      { status: 500 }
    );
  }
}
