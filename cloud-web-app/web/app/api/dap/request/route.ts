import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { dapRequest } from '@/lib/server/dap-runtime';
import { enforceRateLimit } from '@/lib/server/rate-limit';

interface DAPRequest {
  sessionId: string;
  command: string;
  arguments: any;
  seq: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    await requireFeatureForUser(user.userId, 'dap');
    const rateLimitResponse = await enforceRateLimit({
      scope: 'dap-request-post',
      key: user.userId,
      max: 420,
      windowMs: 60 * 60 * 1000,
      message: 'Too many debug command requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const payload: DAPRequest = await request.json();
    const { sessionId, command, arguments: args, seq } = payload;

    if (!sessionId || !command) {
      return NextResponse.json(
        { success: false, message: 'Session ID and command are required' },
        { status: 400 }
      );
    }

    console.log(`DAP Request [${sessionId}]: ${command}`);

    const responseBody = await dapRequest(sessionId, seq, command, args);

    return NextResponse.json({
      success: true,
      seq,
      command,
      body: responseBody,
    });
  } catch (error) {
    console.error('DAP request failed:', error);
    const code = (error as any)?.code;
    if (code === 'DAP_SESSION_NOT_FOUND') {
      return NextResponse.json(
        { success: false, message: 'Sessão DAP não encontrada (sessionId inválido ou expirado).' },
        { status: 404 }
      );
    }
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Request failed'
      },
      { status: 500 }
    );
  }
}
