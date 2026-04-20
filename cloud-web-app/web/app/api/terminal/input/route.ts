import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/terminal/input/route')

/**
 * POST /api/terminal/input
 * 
 * Envia input para uma sessão de terminal
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { sessionId, data } = await request.json();

    if (!sessionId || data === undefined) {
      return NextResponse.json(
        { error: 'sessionId e data são obrigatórios' },
        { status: 400 }
      );
    }

    // Em produção, isso enviaria dados para o processo PTY via WebSocket
    log.info(`[terminal/input] Input para sessão ${sessionId}`);

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
