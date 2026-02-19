/**
 * AI Suggestions Feedback API
 * POST /api/ai/suggestions/feedback
 * 
 * Recebe feedback do usuário para melhorar sugestões
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

interface FeedbackPayload {
  suggestionId: string;
  action?: 'dismissed' | 'applied' | 'clicked';
  helpful?: boolean;
  reason?: string;
}

// Analytics em memória (em produção, usar banco de dados)
const feedbackStore: Map<string, FeedbackPayload & { userId: string; timestamp: number }> = new Map();

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

    if (!body.suggestionId) {
      return NextResponse.json({ error: 'suggestionId required' }, { status: 400 });
    }

    // Salvar feedback
    const key = `${user.userId}_${body.suggestionId}`;
    feedbackStore.set(key, {
      ...body,
      userId: user.userId,
      timestamp: Date.now(),
    });

    // Log para analytics
    console.log(`[AI Suggestion Feedback] User ${user.userId}:`, {
      suggestionId: body.suggestionId,
      action: body.action,
      helpful: body.helpful,
    });

    // Em produção, salvar no banco e reprocessar modelo
    // await prisma.suggestionFeedback.create({ data: { ... } });

    return NextResponse.json({
      success: true,
      message: 'Feedback recorded',
    });
  } catch (error) {
    console.error('Suggestion feedback error:', error);
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
    
    // Retorna estatísticas de feedback (admin only em produção)
    const stats = {
      totalFeedback: feedbackStore.size,
      byAction: {
        dismissed: Array.from(feedbackStore.values()).filter(f => f.action === 'dismissed').length,
        applied: Array.from(feedbackStore.values()).filter(f => f.action === 'applied').length,
        clicked: Array.from(feedbackStore.values()).filter(f => f.action === 'clicked').length,
      },
      byHelpfulness: {
        helpful: Array.from(feedbackStore.values()).filter(f => f.helpful === true).length,
        notHelpful: Array.from(feedbackStore.values()).filter(f => f.helpful === false).length,
      },
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Suggestion feedback GET error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
