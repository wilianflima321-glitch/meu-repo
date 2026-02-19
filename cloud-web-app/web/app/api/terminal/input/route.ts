import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';

/**
 * POST /api/terminal/input
 * 
 * Envia input para uma sessão de terminal
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'terminal-input-post',
      key: user.userId,
      max: 3600,
      windowMs: 60 * 60 * 1000,
      message: 'Too many terminal input requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { sessionId, data } = await request.json();

    if (!sessionId || data === undefined) {
      return NextResponse.json(
        { error: 'sessionId e data são obrigatórios' },
        { status: 400 }
      );
    }

    // Em produção, isso enviaria dados para o processo PTY via WebSocket
    console.log(`[terminal/input] Input para sessão ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    console.error('[terminal/input] Error:', error);
    return NextResponse.json(
      { error: 'Falha ao enviar input' },
      { status: 500 }
    );
  }
}
