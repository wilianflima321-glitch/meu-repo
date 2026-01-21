import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

/**
 * POST /api/terminal/kill
 * 
 * Mata processo em uma sessão de terminal
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { sessionId, signal = 'SIGTERM' } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId é obrigatório' },
        { status: 400 }
      );
    }

    // Validar sinal
    const validSignals = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'];
    const normalizedSignal = validSignals.includes(signal) ? signal : 'SIGTERM';

    // Em produção, isso enviaria o sinal para o processo PTY
    console.log(`[terminal/kill] Enviando ${normalizedSignal} para sessão ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      signal: normalizedSignal,
      message: `Sinal ${normalizedSignal} enviado`,
    });
  } catch (error) {
    console.error('[terminal/kill] Error:', error);
    return NextResponse.json(
      { error: 'Falha ao matar processo' },
      { status: 500 }
    );
  }
}
