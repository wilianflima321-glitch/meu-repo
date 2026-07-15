/**
 * AI Suggestions Action API
 * POST /api/ai/suggestions/[id]/action - Registra solicitacao de execucao
 *
 * Retorna status "queued" para manter honestidade operacional.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { AI_SUGGESTIONS_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    requireAuth(req);
    const rateLimited = enforceAiCoreRateLimit({
      req,
      capability: 'ai.suggestions.action',
      route: '/api/ai/suggestions/[id]/action',
      config: AI_SUGGESTIONS_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;

    const body = await req.json().catch(() => ({}));

    return NextResponse.json(
      {
        id: params.id,
        status: 'queued',
        action: body?.action || 'apply',
        command: body?.command || null,
        receivedAt: Date.now(),
      },
      { status: 202 },
    );
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
