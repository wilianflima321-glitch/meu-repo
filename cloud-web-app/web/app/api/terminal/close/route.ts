import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/terminal/close/route')

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
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Em produção, isso enviaria comando para encerrar o processo PTY
    // Por enquanto, apenas logamos e retornamos sucesso
    log.info(`[terminal/close] Closing session ${sessionId} for user ${user.userId}`);

    return NextResponse.json({
      success: true,
      sessionId,
      message: 'Terminal session closed',
    });
  } catch (error) {
    log.error('[terminal/close] Error', error);
    return NextResponse.json(
      { error: 'Failed to close terminal' },
      { status: 500 }
    );
  }
}
