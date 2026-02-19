import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';
import { createTerminalSession } from '@/lib/server/terminal-pty-runtime';
import { enforceRateLimit } from '@/lib/server/rate-limit';

interface CreateTerminalRequest {
  name: string;
  cwd?: string;
  shellPath?: string;
  env?: Record<string, string>;
  cols?: number;
  rows?: number;
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'terminal-create-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many terminal create requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const body: CreateTerminalRequest = await request.json();
    const { 
      name, 
      cwd = process.cwd(), 
      shellPath, 
      env = {},
      cols = 120,
      rows = 30,
    } = body;
    const safeCwd = assertWorkspacePath(cwd, 'cwd');

    const sessionId = randomUUID();

    // Create real PTY session
    const session = await createTerminalSession({
      id: sessionId,
      userId: user.userId,
      name: name || `Terminal ${Date.now()}`,
      cwd: safeCwd,
      shell: shellPath,
      env,
      cols,
      rows,
    });

    console.log(`Terminal PTY session created: ${session.id} (${session.name}) - Shell: ${session.shell}`);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      name: session.name,
      cwd: session.cwd,
      shell: session.shell,
      websocketUrl: process.env.AETHEL_WS_URL || 'ws://localhost:3001',
      env: {
        ...env,
        TERM: 'xterm-256color',
        COLORTERM: 'truecolor',
      },
    });
  } catch (error) {
    console.error('Failed to create terminal session:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
