import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { aiService } from '@/lib/ai-service';
import { prisma } from '@/lib/db';
import { checkAIQuota, checkModelAccess, recordTokenUsage, getPlanLimits } from '@/lib/plan-limits';
import { AITraceSummary, createAITraceId } from '@/lib/ai-internal-trace';
import { persistAITrace } from '@/lib/ai-trace-store';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { notImplementedCapability } from '@/lib/server/capability-response';

/**
 * AI Query API - Conexão REAL com LLMs
 * POST /api/ai/query
 * 
 * Conecta diretamente com OpenAI, Anthropic ou Google Gemini.
 * Com ENFORCEMENT de limites por plano!
 */
export async function POST(req: NextRequest) {
  try {
    const user = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-query',
      key: user.userId,
      max: 40,
      windowMs: 60 * 1000,
      message: 'Too many AI query requests. Please retry shortly.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { query, context, provider, model } = await req.json();

    const traceId = createAITraceId();

    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // =========================================
    // ENFORCEMENT DE LIMITES - ANTES DE TUDO!
    // =========================================
    
    // 1. Verificar quota de tokens (cap por request)
    const userRow = await prisma.user.findUnique({ where: { id: user.userId }, select: { plan: true } });
    const limits = getPlanLimits(userRow?.plan || 'starter_trial');
    const estimatedTokens = Math.max(600, Math.ceil(String(query).length / 4) + 600);
    if (estimatedTokens > limits.maxTokensPerRequest) {
      return NextResponse.json(
        {
          error: 'REQUEST_TOO_LARGE',
          message: `Query muito grande para o seu plano. Limite estimado: ${limits.maxTokensPerRequest.toLocaleString()} tokens por request.`,
          maxTokensPerRequest: limits.maxTokensPerRequest,
          upgradeUrl: '/pricing',
        },
        { status: 413 }
      );
    }

    const quotaCheck = await checkAIQuota(user.userId, estimatedTokens);
    if (!quotaCheck.allowed) {
      const status = quotaCheck.code === 'CREDITS_EXHAUSTED' ? 402 : 429;
      return NextResponse.json({
        error: quotaCheck.code,
        message: quotaCheck.reason,
        upgradeUrl: '/pricing',
      }, { status });
    }
    
    // 2. Verificar acesso ao modelo solicitado
    if (model) {
      const modelCheck = await checkModelAccess(user.userId, model);
      if (!modelCheck.allowed) {
        // Mostrar modelos disponíveis no plano atual do usuário.
        return NextResponse.json({
          error: modelCheck.code,
          message: modelCheck.reason,
          availableModels: limits.models,
          upgradeUrl: '/pricing',
        }, { status: 403 });
      }
    }

    // =========================================
    // PROVIDERS DISPONÍVEIS
    // =========================================
    
    const availableProviders = aiService.getAvailableProviders();
    if (availableProviders.length === 0) {
      return notImplementedCapability({
        error: 'NOT_IMPLEMENTED',
        status: 501,
        message: 'AI provider not configured.',
        capability: 'AI_QUERY',
        milestone: 'P0',
      });
    }

    // =========================================
    // CHAMAR IA REAL
    // =========================================
    
    const response = await aiService.query(query, context, {
      provider,
      model,
    });

    // =========================================
    // REGISTRAR USO COM SERVIÇO CENTRALIZADO
    // =========================================
    
    try {
      await recordTokenUsage(user.userId, response.tokensUsed);
    } catch (dbError) {
      console.warn('[AI Query] Falha ao registrar uso:', dbError);
      // Não falhar a request por causa de erro de tracking
    }

    const evidence: NonNullable<AITraceSummary['evidence']> = [
      { kind: 'context', label: 'query', detail: `chars=${String(query).length}` },
    ];

    if (context) {
      evidence.push({ kind: 'context', label: 'context', detail: `chars=${String(context).length}` });
    }

    const traceSummary: AITraceSummary = {
      traceId,
      summary: 'Resposta gerada (modo query).',
      evidence,
      telemetry: {
        model: response.model,
        provider: response.provider,
        estimatedTokens,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
      },
    };

    // Persistência para "Ver detalhes" (não bloqueia a resposta se falhar)
    persistAITrace({
      userId: user.userId,
      trace: traceSummary,
      kind: 'query',
    }).catch((err) => console.warn('[AI Trace] Falha ao persistir trace:', err));

    return NextResponse.json({
      answer: response.content,
      model: response.model,
      provider: response.provider,
      tokensUsed: response.tokensUsed,
      latencyMs: response.latencyMs,
      availableProviders,
      traceId,
      traceSummary,
    });

  } catch (error) {
    console.error('AI Query Error:', error);
    
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Erro específico de provider
    if (error instanceof Error && error.message.includes('não configurado')) {
      return NextResponse.json({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: error.message,
        availableProviders: aiService.getAvailableProviders(),
      }, { status: 503 });
    }
    
    return NextResponse.json({ 
      error: 'AI_ERROR',
      message: error instanceof Error ? error.message : 'Erro interno ao processar IA'
    }, { status: 500 });
  }
}
