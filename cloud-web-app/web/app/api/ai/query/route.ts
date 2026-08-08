import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { aiService } from '@/lib/ai-service';
import { prisma } from '@/lib/db';
import {
  type AIQuotaReservation,
  cancelAIQuotaReservation,
  checkModelAccess,
  getPlanLimits,
  reserveAIQuota,
  settleAIQuotaReservation,
} from '@/lib/plan-limits';
import { AITraceSummary, createAITraceId } from '@/lib/ai-internal-trace';
import { persistAITrace } from '@/lib/ai-trace-store';
import { createComponentLogger } from '@/lib/observability/logger';
import {
  AI_QUERY_RATE_LIMIT,
  enforceAiCoreRateLimit,
} from '@/lib/server/ai-core-rate-limit';
import {
  auditByokUsage,
  byokMissingCredentialResponse,
  enforceByokProxyRateLimit,
  parseByokFromRequest,
} from '@/lib/ai/byok-request';

const routeLogger = createComponentLogger('api.ai.query');

/**
 * AI Query API - Conexão REAL com LLMs
 * POST /api/ai/query
 *
 * Block 6E: BYOK is header-only (never User.byokKey).
 */
export async function POST(req: NextRequest) {
  let reservation: AIQuotaReservation | null = null;
  try {
    const user = requireAuth(req);
    const rateLimited = enforceAiCoreRateLimit({
      req,
      capability: 'ai.query',
      route: '/api/ai/query',
      config: AI_QUERY_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;

    const { query, context, provider, model } = await req.json();

    const traceId = createAITraceId();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const byokParsed = parseByokFromRequest(req);
    const isByok = byokParsed.active;

    if (req.headers.get('x-aethel-byok-active') === '1' && !isByok) {
      return NextResponse.json(byokMissingCredentialResponse(), { status: 400 });
    }

    const rateLimitedByok = enforceByokProxyRateLimit(req, '/api/ai/query');
    if (rateLimitedByok) return rateLimitedByok;

    const userRow = await prisma.user.findUnique({
      where: { id: user.userId },
      select: { plan: true },
    });
    const limits = getPlanLimits(userRow?.plan || 'starter_trial');
    const estimatedTokens = Math.max(600, Math.ceil(String(query).length / 4) + 600);

    if (estimatedTokens > limits.maxTokensPerRequest && !isByok) {
      return NextResponse.json(
        {
          error: 'REQUEST_TOO_LARGE',
          message: `Query muito grande para o seu plano. Limite estimado: ${limits.maxTokensPerRequest.toLocaleString()} tokens por request.`,
          maxTokensPerRequest: limits.maxTokensPerRequest,
          upgradeUrl: '/pricing',
        },
        { status: 413 },
      );
    }

    if (!isByok) {
      // P2f #1: reserve BEFORE dispatch — closes the TOCTOU race in the
      // previous check-then-record checkAIQuota pattern.
      const reserved = await reserveAIQuota(user.userId, estimatedTokens);
      if (!reserved.allowed) {
        return NextResponse.json(
          {
            error: reserved.code,
            message: reserved.reason,
            upgradeUrl: '/pricing',
          },
          { status: 429 },
        );
      }
      reservation = reserved.reservation;
    }

    if (model && !isByok) {
      const modelCheck = await checkModelAccess(user.userId, model);
      if (!modelCheck.allowed) {
        if (reservation) cancelAIQuotaReservation(reservation);
        return NextResponse.json(
          {
            error: modelCheck.code,
            message: modelCheck.reason,
            availableModels: limits.models,
            upgradeUrl: '/pricing',
          },
          { status: 403 },
        );
      }
    }

    let byokKey: string | undefined;
    if (byokParsed.active) {
      byokKey = byokParsed.apiKey;
      auditByokUsage({
        userId: user.userId,
        route: '/api/ai/query',
        modelId: model,
        estimatedTokens,
        provider: byokParsed.provider,
      });
    }

    const availableProviders = aiService.getAvailableProviders();
    if (availableProviders.length === 0 && !byokKey) {
      if (reservation) cancelAIQuotaReservation(reservation);
      return NextResponse.json(
        {
          error: 'NO_AI_PROVIDERS',
          message:
            'Nenhum provider de IA configurado. Configure OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY ou GOOGLE_API_KEY no .env',
          availableProviders: [],
        },
        { status: 503 },
      );
    }

    const response = await aiService.query(query, context, {
      provider,
      model,
      userId: user.userId,
      isBYOK: isByok,
      apiKeyOverride: byokKey,
    });

    if (reservation) {
      try {
        await settleAIQuotaReservation(reservation, response.tokensUsed);
      } catch (dbError) {
        routeLogger.warn('[AI Query] Failed to record usage', dbError);
      } finally {
        reservation = null;
      }
    }

    const evidence: NonNullable<AITraceSummary['evidence']> = [
      { kind: 'context', label: 'query', detail: `chars=${String(query).length}` },
    ];

    if (context) {
      evidence.push({ kind: 'context', label: 'context', detail: `chars=${String(context).length}` });
    }

    const trace: AITraceSummary = {
      traceId,
      summary: 'AI query completed',
      evidence,
      telemetry: {
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
      },
    };

    persistAITrace({ userId: user.userId, kind: 'query', trace }).catch((err) =>
      routeLogger.warn('Failed to persist query trace', err),
    );

    return NextResponse.json({
      ...response,
      traceId,
      billingMode: isByok ? 'byok' : 'platform',
    });
  } catch (error) {
    if (reservation) cancelAIQuotaReservation(reservation);
    routeLogger.error('AI Query error', error);
    return NextResponse.json(
      {
        error: 'AI_ERROR',
        message: error instanceof Error ? error.message : 'Query failed',
      },
      { status: 500 },
    );
  }
}
