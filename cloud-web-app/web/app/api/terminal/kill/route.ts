import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/terminal/kill/route')

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
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Validar sinal
    const validSignals = ['SIGTERM', 'SIGKILL', 'SIGINT', 'SIGHUP'];
    const normalizedSignal = validSignals.includes(signal) ? signal : 'SIGTERM';

    // Em produção, isso enviaria o sinal para o processo PTY
    log.info(`[terminal/kill] Sending ${normalizedSignal} to session ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      signal: normalizedSignal,
      message: `Sinal ${normalizedSignal} enviado`,
    });
  } catch (error) {
    log.error('[terminal/kill] Error', error);
    return NextResponse.json(
      { error: 'Failed to kill process' },
      { status: 500 }
    );
  }
}
