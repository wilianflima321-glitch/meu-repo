import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { listDapSessions } from '@/lib/server/dap-runtime';
import { enforceRateLimit } from '@/lib/server/rate-limit';

type ProcessType = 'game' | 'server' | 'editor' | 'worker' | 'external';

export const dynamic = 'force-dynamic';

function mapProcessType(sessionType: string): ProcessType {
  const t = sessionType.toLowerCase();
  if (t.includes('node') || t.includes('js') || t.includes('javascript') || t.includes('typescript')) return 'server';
  if (t.includes('python')) return 'worker';
  if (t.includes('game')) return 'game';
  if (t.includes('editor')) return 'editor';
  return 'external';
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    await requireFeatureForUser(user.userId, 'dap');
    const rateLimitResponse = await enforceRateLimit({
      scope: 'dap-processes-get',
      key: user.userId,
      max: 360,
      windowMs: 60 * 60 * 1000,
      message: 'Too many debug process list requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const sessions = listDapSessions(user.userId);
    const now = Date.now();

    const processes = sessions.map((s) => ({
      id: s.sessionId,
      pid: s.pid ?? 0,
      name: s.type ? `DAP ${s.type}` : 'DAP Session',
      type: mapProcessType(String(s.type || '')),
      status: 'running' as const,
      protocol: 'dap' as const,
      debuggerAttached: true,
      uptime: Math.max(0, Math.floor((now - s.createdAt) / 1000)),
      command: s.adapterCommand ? `${s.adapterCommand}${s.adapterArgs?.length ? ` ${s.adapterArgs.join(' ')}` : ''}` : undefined,
    }));

    return NextResponse.json({ processes });
  } catch (error) {
    console.error('Failed to list DAP sessions:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
