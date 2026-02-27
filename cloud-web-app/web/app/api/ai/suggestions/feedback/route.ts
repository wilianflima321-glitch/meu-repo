/**
 * AI Suggestions Feedback API
 * POST /api/ai/suggestions/feedback - record user feedback
 * GET /api/ai/suggestions/feedback - read aggregate feedback stats
 *
 * Current implementation stores feedback in memory only.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

const MAX_SUGGESTION_ID_LENGTH = 120;
const MAX_REASON_LENGTH = 500;
const FEEDBACK_WARNING =
  'SUGGESTION_FEEDBACK_MEMORY_ONLY: stored in memory for preview/runtime validation, not persisted.';

interface FeedbackPayload {
  suggestionId: string;
  action?: 'dismissed' | 'applied' | 'clicked';
  helpful?: boolean;
  reason?: string;
}

const feedbackStore: Map<string, FeedbackPayload & { userId: string; timestamp: number }> = new Map();

function buildHeaders() {
  return {
    'x-aethel-capability': 'AI_SUGGESTION_FEEDBACK',
    'x-aethel-capability-status': 'PARTIAL',
    'x-aethel-runtime-mode': 'in-memory-preview',
    'x-aethel-warning': FEEDBACK_WARNING,
  };
}

export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-suggestions-feedback-post',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many suggestion feedback submissions. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body: FeedbackPayload = await req.json();
    const suggestionId = String(body?.suggestionId ?? '').trim();
    const action = body?.action;
    const helpful = typeof body?.helpful === 'boolean' ? body.helpful : undefined;
    const reason = typeof body?.reason === 'string' ? body.reason.trim() : undefined;

    if (!suggestionId || suggestionId.length > MAX_SUGGESTION_ID_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_SUGGESTION_ID', message: 'suggestionId is required and must be under 120 characters.' },
        { status: 400 }
      );
    }

    if (reason && reason.length > MAX_REASON_LENGTH) {
      return NextResponse.json(
        { error: 'INVALID_REASON', message: 'reason must be under 500 characters.' },
        { status: 400 }
      );
    }

    if (action && !['dismissed', 'applied', 'clicked'].includes(action)) {
      return NextResponse.json(
        { error: 'INVALID_ACTION', message: 'action must be dismissed, applied, or clicked.' },
        { status: 400 }
      );
    }

    const key = `${user.userId}_${suggestionId}`;
    feedbackStore.set(key, {
      suggestionId,
      action,
      helpful,
      reason,
      userId: user.userId,
      timestamp: Date.now(),
    });

    console.log('[AI Suggestion Feedback]', {
      userId: user.userId,
      suggestionId,
      action,
      helpful,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback recorded.',
        capability: 'AI_SUGGESTION_FEEDBACK',
        capabilityStatus: 'PARTIAL',
        runtimeMode: 'in-memory-preview',
        warning: FEEDBACK_WARNING,
      },
      { status: 202, headers: buildHeaders() }
    );
  } catch (error) {
    console.error('Suggestion feedback POST error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-suggestions-feedback-get',
      key: user.userId,
      max: 240,
      windowMs: 60 * 60 * 1000,
      message: 'Too many suggestion feedback reads. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const allFeedback = Array.from(feedbackStore.values());
    const stats = {
      totalFeedback: allFeedback.length,
      byAction: {
        dismissed: allFeedback.filter((f) => f.action === 'dismissed').length,
        applied: allFeedback.filter((f) => f.action === 'applied').length,
        clicked: allFeedback.filter((f) => f.action === 'clicked').length,
      },
      byHelpfulness: {
        helpful: allFeedback.filter((f) => f.helpful === true).length,
        notHelpful: allFeedback.filter((f) => f.helpful === false).length,
      },
    };

    return NextResponse.json(
      {
        ...stats,
        capability: 'AI_SUGGESTION_FEEDBACK',
        capabilityStatus: 'PARTIAL',
        runtimeMode: 'in-memory-preview',
        warning: FEEDBACK_WARNING,
      },
      { headers: buildHeaders() }
    );
  } catch (error) {
    console.error('Suggestion feedback GET error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
