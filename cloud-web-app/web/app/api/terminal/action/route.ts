import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { 
  getTerminalPtyManager, 
  writeToTerminal,
  resizeTerminal,
  killTerminalSession,
} from '@/lib/server/terminal-pty-runtime';

interface TerminalActionRequest {
  sessionId: string;
  action: 'write' | 'resize' | 'kill' | 'signal' | 'clear' | 'list';
  data?: string;
  cols?: number;
  rows?: number;
  signal?: string;
}

const MAX_SESSION_ID_LENGTH = 120;
const normalizeSessionId = (value?: string) => String(value ?? '').trim();

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'terminal-action-post',
      key: user.userId,
      max: 1200,
      windowMs: 60 * 60 * 1000,
      message: 'Too many terminal action requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireEntitlementsForUser(user.userId);

    const body: TerminalActionRequest = await request.json();
    const { sessionId, action, data, cols, rows, signal } = body;
    const normalizedSessionId = normalizeSessionId(sessionId);

    const manager = getTerminalPtyManager();

    switch (action) {
      case 'write': {
        if (!normalizedSessionId || !data) {
          return NextResponse.json(
            { success: false, error: 'sessionId and data required' },
            { status: 400 }
          );
        }

        if (normalizedSessionId.length > MAX_SESSION_ID_LENGTH) {
          return NextResponse.json(
            { success: false, error: 'sessionId must be under 120 characters' },
            { status: 400 }
          );
        }

        const session = manager.getSession(normalizedSessionId);
        if (!session || session.userId !== user.userId) {
          return NextResponse.json(
            { success: false, error: 'Terminal session not found' },
            { status: 404 }
          );
        }
        
        const success = writeToTerminal(normalizedSessionId, data);
        return NextResponse.json({ success });
      }

      case 'resize': {
        if (!normalizedSessionId || !cols || !rows) {
          return NextResponse.json(
            { success: false, error: 'sessionId, cols and rows required' },
            { status: 400 }
          );
        }

        if (normalizedSessionId.length > MAX_SESSION_ID_LENGTH) {
          return NextResponse.json(
            { success: false, error: 'sessionId must be under 120 characters' },
            { status: 400 }
          );
        }

        const session = manager.getSession(normalizedSessionId);
        if (!session || session.userId !== user.userId) {
          return NextResponse.json(
            { success: false, error: 'Terminal session not found' },
            { status: 404 }
          );
        }

        const success = resizeTerminal(normalizedSessionId, cols, rows);
        return NextResponse.json({ success });
      }

      case 'kill': {
        if (!normalizedSessionId) {
          return NextResponse.json(
            { success: false, error: 'sessionId required' },
            { status: 400 }
          );
        }

        if (normalizedSessionId.length > MAX_SESSION_ID_LENGTH) {
          return NextResponse.json(
            { success: false, error: 'sessionId must be under 120 characters' },
            { status: 400 }
          );
        }

        const session = manager.getSession(normalizedSessionId);
        if (!session || session.userId !== user.userId) {
          return NextResponse.json(
            { success: false, error: 'Terminal session not found' },
            { status: 404 }
          );
        }

        const success = await killTerminalSession(normalizedSessionId);
        return NextResponse.json({ success });
      }

      case 'signal': {
        if (!normalizedSessionId || !signal) {
          return NextResponse.json(
            { success: false, error: 'sessionId and signal required' },
            { status: 400 }
          );
        }

        if (normalizedSessionId.length > MAX_SESSION_ID_LENGTH) {
          return NextResponse.json(
            { success: false, error: 'sessionId must be under 120 characters' },
            { status: 400 }
          );
        }

        const session = manager.getSession(normalizedSessionId);
        if (!session || session.userId !== user.userId) {
          return NextResponse.json(
            { success: false, error: 'Terminal session not found' },
            { status: 404 }
          );
        }

        const success = manager.sendSignal(normalizedSessionId, signal);
        return NextResponse.json({ success });
      }

      case 'clear': {
        if (!normalizedSessionId) {
          return NextResponse.json(
            { success: false, error: 'sessionId required' },
            { status: 400 }
          );
        }

        if (normalizedSessionId.length > MAX_SESSION_ID_LENGTH) {
          return NextResponse.json(
            { success: false, error: 'sessionId must be under 120 characters' },
            { status: 400 }
          );
        }

        const session = manager.getSession(normalizedSessionId);
        if (!session || session.userId !== user.userId) {
          return NextResponse.json(
            { success: false, error: 'Terminal session not found' },
            { status: 404 }
          );
        }

        const success = manager.clearScreen(normalizedSessionId);
        return NextResponse.json({ success });
      }

      case 'list': {
        const sessions = manager.getSessionsByUser(user.userId);
        return NextResponse.json({
          success: true,
          sessions: sessions.map(s => ({
            id: s.id,
            name: s.name,
            cwd: s.cwd,
            shell: s.shell,
            isAlive: s.isAlive,
            createdAt: s.createdAt,
            lastActivity: s.lastActivity,
          })),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Terminal action failed:', error);

    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Action failed' },
      { status: 500 }
    );
  }
}
