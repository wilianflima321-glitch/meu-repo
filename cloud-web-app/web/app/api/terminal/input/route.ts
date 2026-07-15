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
        { error: 'sessionId and data are required' },
        { status: 400 }
      );
    }

    // Em produção, isso enviaria dados para o processo PTY via WebSocket
    log.info(`[terminal/input] Input for session ${sessionId}`);

    return NextResponse.json({
      success: true,
      sessionId,
    });
  } catch (error) {
    log.error('[terminal/input] Error', error);
    return NextResponse.json(
      { error: 'Failed to send input' },
      { status: 500 }
    );
  }
}
