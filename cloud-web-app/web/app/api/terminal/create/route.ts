import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { assertWorkspacePath } from '@/lib/workspace';
import { apiErrorToResponse } from '@/lib/api-errors';
import { createTerminalSession } from '@/lib/server/terminal-pty-runtime';
import {
  detectAgentShellCaller,
  evaluateAgentShellPolicy,
} from '@/lib/production/agent-shell-policy';
import { describeTerminalLaneSplit } from '@/lib/server/forge-terminal-bridge';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('api/terminal/create/route')

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
    await requireEntitlementsForUser(user.userId);

    // L.4 / Law #48 — human-host-pty only. Agents must use /api/terminal/forge.
    const callerKind = detectAgentShellCaller(request.headers);
    if (callerKind === 'agent') {
      const policy = evaluateAgentShellPolicy({
        callerKind: 'agent',
        requestedTarget: 'host-pty',
        sandboxAvailable: false,
      });
      log.warn('terminal_create_agent_host_pty_blocked', {
        userId: user.userId,
        status: policy.status,
      });
      return NextResponse.json(
        {
          success: false,
          error: policy.reason,
          lane: 'human-host-pty',
          agentShellPolicy: policy,
          useInstead: '/api/terminal/forge',
          laneSplit: describeTerminalLaneSplit(),
        },
        { status: 403 },
      );
    }

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

    log.info(`Terminal PTY session created: ${session.id} (${session.name}) - Shell: ${session.shell}`);

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
    log.error('Failed to create terminal session', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    );
  }
}
