import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';

/**
 * POST /api/terminal/resize
 * 
 * Redimensiona uma sessão de terminal
 */
export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'terminal-resize-post',
      key: user.userId,
      max: 1200,
      windowMs: 60 * 60 * 1000,
      message: 'Too many terminal resize requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    const { sessionId, cols, rows } = await request.json();

    if (!sessionId || !cols || !rows) {
      return NextResponse.json(
        { error: 'sessionId, cols e rows são obrigatórios' },
        { status: 400 }
      );
    }

    // Validar dimensões
    const validCols = Math.max(10, Math.min(500, parseInt(cols)));
    const validRows = Math.max(5, Math.min(200, parseInt(rows)));

    // Em produção, isso enviaria SIGWINCH para o processo PTY
    console.log(`[terminal/resize] Redimensionando sessão ${sessionId} para ${validCols}x${validRows}`);

    return NextResponse.json({
      success: true,
      sessionId,
      cols: validCols,
      rows: validRows,
    });
  } catch (error) {
    console.error('[terminal/resize] Error:', error);
    return NextResponse.json(
      { error: 'Falha ao redimensionar terminal' },
      { status: 500 }
    );
  }
}
