import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { startDapSession } from '@/lib/server/dap-runtime';

interface StartSessionRequest {
  type: string;
  request: 'launch' | 'attach';
  name: string;
  program?: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  port?: number;
  host?: string;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
		await requireFeatureForUser(user.userId, 'dap');

    const config: StartSessionRequest = await request.json();

    if (!config.type || !config.request) {
      return NextResponse.json(
        { success: false, error: 'Type and request are required' },
        { status: 400 }
      );
    }

    const session = await startDapSession({
      userId: user.userId,
      type: config.type,
      workspaceRoot: config.cwd,
      cwd: config.cwd,
      env: config.env,
      adapter: (config as any).adapter,
    });

    return NextResponse.json({
      success: true,
      sessionId: session.sessionId,
      message: 'Debug session started',
    });
  } catch (error) {
    console.error('Failed to start debug session:', error);
    const code = (error as any)?.code;
    if (code === 'DAP_UNSUPPORTED_TYPE') {
      return NextResponse.json(
        {
          success: false,
          error: 'DAP_UNSUPPORTED_TYPE',
          message:
            'Tipo de DAP não suportado/sem adapter configurado. Configure AETHEL_DAP_NODE_CMD/AETHEL_DAP_NODE_ARGS (Node) ou instale/configure o adapter correspondente.'
        },
        { status: 422 }
      );
    }

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Failed to start session' },
      { status: 500 }
    );
  }
}
