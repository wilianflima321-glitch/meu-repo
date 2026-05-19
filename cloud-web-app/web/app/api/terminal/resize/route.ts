import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/terminal/resize/route')

/**
 * POST /api/terminal/resize
 * 
 * Redimensiona uma sessão de terminal
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const { sessionId, cols, rows } = await request.json();

    if (!sessionId || !cols || !rows) {
      return NextResponse.json(
        { error: 'sessionId, cols, and rows are required' },
        { status: 400 }
      );
    }

    // Validar dimensões
    const validCols = Math.max(10, Math.min(500, parseInt(cols)));
    const validRows = Math.max(5, Math.min(200, parseInt(rows)));

    // Em produção, isso enviaria SIGWINCH para o processo PTY
    log.info(`[terminal/resize] Resizing session ${sessionId} para ${validCols}x${validRows}`);

    return NextResponse.json({
      success: true,
      sessionId,
      cols: validCols,
      rows: validRows,
    });
  } catch (error) {
    log.error('[terminal/resize] Error', error);
    return NextResponse.json(
      { error: 'Failed to resize terminal' },
      { status: 500 }
    );
  }
}
