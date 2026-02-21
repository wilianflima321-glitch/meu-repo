/**
 * AI Thinking Session API
 * GET /api/ai/thinking/[sessionId] - read thinking session state
 * POST /api/ai/thinking/[sessionId] - start/restart thinking session
 *
 * Current implementation is preview-only and deterministic. It does not
 * represent production L4/L5 agent orchestration.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_THINKING_SESSION_ID_LENGTH = 120;
const MAX_PROMPT_LENGTH = 8000;
const THINKING_WARNING =
  'THINKING_SIMULATED_PREVIEW: preview mode only, not production-grade multi-agent runtime.';

const normalizeThinkingSessionId = (value?: string) => String(value ?? '').trim();

interface ThinkingStep {
  id: string;
  type: 'analyze' | 'plan' | 'research' | 'implement' | 'validate' | 'complete';
  title: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  startTime?: number;
  endTime?: number;
  tokens?: number;
  confidence?: number;
  details?: Record<string, unknown>;
}

interface ThinkingSession {
  id: string;
  userId: string;
  prompt: string;
  status: 'thinking' | 'completed' | 'error' | 'cancelled';
  steps: ThinkingStep[];
  totalTokens: number;
  estimatedCost: number;
  startTime: number;
  endTime?: number;
  runtimeMode: 'simulated_preview';
}

const sessions = new Map<string, ThinkingSession>();

function stableNumber(seed: string, min: number, max: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return min + (h % (max - min + 1));
}

function generateThinkingSteps(prompt: string): ThinkingStep[] {
  const now = Date.now();
  const suffix = String(now);
  const promptLength = prompt.length;
  return [
    {
      id: `step_${suffix}_1`,
      type: 'analyze',
      title: 'Analyzing request',
      description: 'Interpreting context and required outcomes.',
      status: 'active',
      startTime: now,
      confidence: 0.95,
      details: { promptLength },
    },
    {
      id: `step_${suffix}_2`,
      type: 'research',
      title: 'Gathering context',
      description: 'Collecting relevant project information.',
      status: 'pending',
      confidence: 0.9,
    },
    {
      id: `step_${suffix}_3`,
      type: 'plan',
      title: 'Planning execution',
      description: 'Defining implementation strategy and risk checks.',
      status: 'pending',
      confidence: 0.86,
    },
    {
      id: `step_${suffix}_4`,
      type: 'implement',
      title: 'Building solution',
      description: 'Producing proposed code or artifact changes.',
      status: 'pending',
      confidence: 0.88,
    },
    {
      id: `step_${suffix}_5`,
      type: 'validate',
      title: 'Validating result',
      description: 'Checking consistency and readiness to apply.',
      status: 'pending',
      confidence: 0.92,
    },
  ];
}

async function simulateThinkingProgress(sessionId: string) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const baseDelayMs = 1800;
  for (let i = 0; i < session.steps.length; i += 1) {
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs));

    const current = sessions.get(sessionId);
    if (!current || current.status === 'cancelled') return;

    current.steps[i].status = 'completed';
    current.steps[i].endTime = Date.now();
    current.steps[i].tokens = stableNumber(`${sessionId}:${i}:tokens`, 120, 520);
    current.totalTokens += current.steps[i].tokens || 0;

    if (i < current.steps.length - 1) {
      current.steps[i + 1].status = 'active';
      current.steps[i + 1].startTime = Date.now();
    }

    sessions.set(sessionId, current);
  }

  const finalSession = sessions.get(sessionId);
  if (!finalSession) return;
  finalSession.status = 'completed';
  finalSession.endTime = Date.now();
  finalSession.estimatedCost = Number(((finalSession.totalTokens / 1000) * 0.002).toFixed(6));
  sessions.set(sessionId, finalSession);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-thinking-get',
      key: user.userId,
      max: 300,
      windowMs: 60 * 60 * 1000,
      message: 'Too many thinking session reads. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { sessionId } = await params;
    const normalizedSessionId = normalizeThinkingSessionId(sessionId);
    if (!normalizedSessionId || normalizedSessionId.length > MAX_THINKING_SESSION_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_SESSION_ID', message: 'sessionId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const session = sessions.get(normalizedSessionId);
    if (!session) {
      return NextResponse.json({ error: 'SESSION_NOT_FOUND', message: 'Thinking session not found.' }, { status: 404 });
    }
    if (session.userId !== user.userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Session does not belong to current user.' }, { status: 403 });
    }

    return NextResponse.json(
      {
        ...session,
        capability: 'AI_THINKING_SESSION',
        capabilityStatus: 'PARTIAL',
        runtimeMode: 'simulated_preview',
        warning: THINKING_WARNING,
      },
      {
        headers: {
          'x-aethel-capability': 'AI_THINKING_SESSION',
          'x-aethel-capability-status': 'PARTIAL',
          'x-aethel-runtime-mode': 'simulated_preview',
          'x-aethel-warning': THINKING_WARNING,
        },
      }
    );
  } catch (error) {
    console.error('Thinking GET error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-thinking-post',
      key: user.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many thinking session starts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { sessionId } = await params;
    const normalizedSessionId = normalizeThinkingSessionId(sessionId);
    if (!normalizedSessionId || normalizedSessionId.length > MAX_THINKING_SESSION_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_SESSION_ID', message: 'sessionId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const prompt = typeof body?.prompt === 'string' ? body.prompt.trim() : '';
    if (prompt.length > MAX_PROMPT_LENGTH) {
      return NextResponse.json(
        { error: 'PROMPT_TOO_LARGE', message: `prompt must be under ${MAX_PROMPT_LENGTH} characters.` },
        { status: 400 }
      );
    }

    const existing = sessions.get(normalizedSessionId);
    if (existing && existing.userId !== user.userId) {
      return NextResponse.json(
        { error: 'SESSION_CONFLICT', message: 'sessionId is already in use by another user.' },
        { status: 409 }
      );
    }

    const session: ThinkingSession = {
      id: normalizedSessionId,
      userId: user.userId,
      prompt,
      status: 'thinking',
      steps: generateThinkingSteps(prompt),
      totalTokens: 0,
      estimatedCost: 0,
      startTime: Date.now(),
      runtimeMode: 'simulated_preview',
    };
    sessions.set(normalizedSessionId, session);

    void simulateThinkingProgress(normalizedSessionId);

    return NextResponse.json(
      {
        success: true,
        sessionId: normalizedSessionId,
        session: {
          ...session,
          capabilityStatus: 'PARTIAL',
          warning: THINKING_WARNING,
        },
        capability: 'AI_THINKING_SESSION',
        capabilityStatus: 'PARTIAL',
        runtimeMode: 'simulated_preview',
        warning: THINKING_WARNING,
      },
      {
        status: 202,
        headers: {
          'x-aethel-capability': 'AI_THINKING_SESSION',
          'x-aethel-capability-status': 'PARTIAL',
          'x-aethel-runtime-mode': 'simulated_preview',
          'x-aethel-warning': THINKING_WARNING,
        },
      }
    );
  } catch (error) {
    console.error('Thinking POST error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
