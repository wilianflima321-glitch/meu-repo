import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { aiService } from '@/lib/ai-service';
import type { LLMProvider, Message } from '@/lib/ai-service';
import { checkModelAccess, recordTokenUsage } from '@/lib/plan-limits';
import {
  acquireConcurrencyLease,
  estimateTokensFromText,
  consumeMeteredUsage,
  releaseConcurrencyLease,
} from '@/lib/metering';

import {
  reserveCredits,
  settleCredits,
  cancelReservation,
  checkCreditQuota,
  createInsufficientCreditsResponse,
  calculateTokenCost,
} from '@/lib/credit-wallet';
import { applyTokenWeight } from '@/lib/ai/model-cost-weights';
import { capabilityResponse } from '@/lib/server/capability-response';
import { buildAiProviderSetupMetadata } from '@/lib/capability-constants';
import {
  AI_DEMO_MODEL,
  AI_DEMO_PROVIDER,
  buildDemoChatContent,
  demoRouteMetadata,
  isAiDemoModeEnabled,
} from '@/lib/server/ai-demo-mode';
import { consumeAiDemoUsage } from '@/lib/server/ai-demo-usage';
import { AI_CORE_RATE_LIMIT, enforceAiCoreRateLimit, AI_BYOK_RATE_LIMIT } from '@/lib/server/ai-core-rate-limit';
import { blockIfSimulationDisabled } from '@/lib/server/simulation-guard';
import { applyProjectRulesToMessages, loadProjectRulesContext } from '@/lib/server/project-rules'
import {
  applyAgentHandoffContextToMessages,
  loadAgentHandoffContext,
} from '@/lib/production/agent-handoff-context'
import { withLegacyAiRouteDeprecation } from '@/lib/server/ai-route-deprecation';

const PROVIDER_HEADER_MAP: Record<string, string> = {
  openai: 'x-aethel-byok-openai',
  anthropic: 'x-aethel-byok-anthropic',
  google: 'x-aethel-byok-google',
  openrouter: 'x-aethel-byok-openrouter',
  groq: 'x-aethel-byok-groq',
};

interface AIChatRequestBody {
  messages?: unknown;
  projectId?: unknown;
  model?: unknown;
  provider?: unknown;
  temperature?: unknown;
  maxTokens?: unknown;
}

const LLM_PROVIDERS = new Set<LLMProvider>(['openai', 'openrouter', 'anthropic', 'google', 'groq']);
const MESSAGE_ROLES = new Set<Message['role']>(['system', 'user', 'assistant']);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readProvider(value: unknown): LLMProvider | undefined {
  return typeof value === 'string' && LLM_PROVIDERS.has(value as LLMProvider) ? (value as LLMProvider) : undefined;
}

function isMessageRole(value: unknown): value is Message['role'] {
  return typeof value === 'string' && MESSAGE_ROLES.has(value as Message['role']);
}

function toAiMessage(value: unknown): Message | null {
  const message = asRecord(value);
  const role = message.role;
  const content = message.content;
  if (!isMessageRole(role) || typeof content !== 'string') {
    return null;
  }

  return { role, content };
}

function inferProviderFromModel(model?: string): LLMProvider | undefined {
  const raw = String(model || '').trim().toLowerCase()
  if (!raw) return undefined
  if (raw.startsWith('openrouter:')) return 'openrouter'
  if (raw.startsWith('openai:')) return 'openai'
  if (raw.startsWith('anthropic:')) return 'anthropic'
  if (raw.startsWith('google:')) return 'google'
  if (raw.startsWith('groq:')) return 'groq'
  if (raw.startsWith('openai/') || raw.startsWith('anthropic/') || raw.startsWith('google/')) return 'openrouter'
  if (raw.startsWith('gpt-')) return 'openai'
  if (raw.startsWith('claude-')) return 'anthropic'
  if (raw.startsWith('gemini-')) return 'google'
  return undefined
}

function resolveBackendBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  if (raw.startsWith('/')) return null;
  return raw.replace(/\/$/, '');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let leaseId: string | null = null;
  let reservation: any = null;

  try {
    const auth = requireAuth(req);
    const rateLimited = enforceAiCoreRateLimit({
      req,
      capability: 'AI_CHAT',
      route: '/api/ai/chat',
      config: AI_CORE_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;
    const entitlements = await requireEntitlementsForUser(auth.userId);

    const body = asRecord((await req.json().catch(() => null)) as AIChatRequestBody | null);
    if (Object.keys(body).length === 0) {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 });
    }

    const messages = Array.isArray(body.messages) ? body.messages : [];
    const projectId = readString(body.projectId)
    const requestedModel = readString(body.model)
    const requestedProvider = readProvider(body.provider)
    const promptText = messages
      .map((message) => {
        const content = asRecord(message).content
        return typeof content === 'string' ? content : ''
      })
      .join('\n');
    const requestedMaxTokens = readNumber(body.maxTokens)
    const maxTokens = requestedMaxTokens !== undefined ? Math.max(0, Math.floor(requestedMaxTokens)) : 0;
    const resolvedMaxTokens = maxTokens > 0 ? maxTokens : undefined;

    if (!promptText.trim()) {
      return NextResponse.json({ error: 'MISSING_PROMPT', message: 'messages is required.' }, { status: 400 });
    }

    const estimatedPromptTokens = estimateTokensFromText(promptText);
    const estimatedTotalTokens = estimatedPromptTokens + maxTokens;

    const userRow = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { plan: true, byokKey: true }
    });

    const isByok = req.headers.get('x-aethel-byok-active') === '1' || !!userRow?.byokKey;

    if (isByok) {
      const rateLimitedByok = enforceAiCoreRateLimit({
        req,
        capability: 'AI_CHAT',
        route: '/api/ai/chat',
        config: AI_BYOK_RATE_LIMIT,
      });
      if (rateLimitedByok) return rateLimitedByok;
    }

    if (requestedModel && !isByok) {
      const modelCheck = await checkModelAccess(auth.userId, requestedModel)
      if (!modelCheck.allowed) {
        return NextResponse.json(
          { error: modelCheck.code || 'MODEL_NOT_ALLOWED', message: modelCheck.reason || 'Model not allowed' },
          { status: 403 }
        )
      }
    }

    // Resolve BYOK key
    let byokKey: string | undefined = undefined;
    if (isByok) {
      const resolvedProvider = requestedProvider || inferProviderFromModel(requestedModel);
      if (resolvedProvider) {
        const headerName = PROVIDER_HEADER_MAP[resolvedProvider];
        byokKey = req.headers.get(headerName) || req.headers.get('x-aethel-byok-key') || undefined;
      }
      if (!byokKey && userRow?.byokKey) {
        try {
          const { decryptString } = await import('@/lib/server/crypto');
          byokKey = decryptString(userRow.byokKey);
        } catch (e) {
          const { logger } = await import('@/lib/observability/logger');
          logger.error('Failed to decrypt database BYOK key', e);
        }
      }
    }

    const lease = await acquireConcurrencyLease({
      userId: auth.userId,
      key: 'api/ai/chat',
      concurrencyLimit: entitlements.plan.limits.concurrent,
      ttlSeconds: 90,
    });
    leaseId = lease?.leaseId ?? null;

    let decision: any = null;

    if (!isByok) {
      decision = await consumeMeteredUsage({
        userId: auth.userId,
        limits: entitlements.plan.limits,
        cost: { requests: 1, tokens: 0 },
        modelId: requestedModel || undefined,
      });

      const modelName = requestedModel || 'openai/gpt-4o-mini';
      const estimatedTotalTokensWeighted = applyTokenWeight(estimatedTotalTokens, modelName);
      const estimatedCostCredits = calculateTokenCost('chat', estimatedTotalTokensWeighted);

      reservation = await reserveCredits(
        auth.userId,
        'chat',
        estimatedCostCredits
      );

      if (!reservation) {
        const check = await checkCreditQuota(auth.userId, 'chat', estimatedCostCredits);
        return NextResponse.json(createInsufficientCreditsResponse(check), { status: 402 });
      }
    }

    const backendBase = resolveBackendBaseUrl();
    if (backendBase) {
      try {
        const upstream = await fetch(`${backendBase}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(req.headers.get('authorization') ? { Authorization: req.headers.get('authorization') as string } : {}),
            'X-Aethel-User-Id': auth.userId,
          },
          body: JSON.stringify(body),
        });

        const text = await upstream.text();
        let actualTokens = 0;
        try {
          const parsed = JSON.parse(text);
          actualTokens = parsed.tokensUsed || 0;
        } catch {}

        if (reservation) {
          const actualWeighted = applyTokenWeight(actualTokens || estimatedTotalTokens, requestedModel || 'openai/gpt-4o-mini');
          const actualCost = calculateTokenCost('chat', actualWeighted);
          await settleCredits(reservation.reservationId, actualCost, { actualTokens });
          await recordTokenUsage(auth.userId, actualWeighted).catch(() => {});
          reservation = null;
        }

        return new NextResponse(text, {
          status: upstream.status,
          headers: {
            'Content-Type': upstream.headers.get('content-type') || 'application/json',
            ...(decision?.remaining?.requestsPerDay !== undefined
              ? { 'X-Usage-Remaining-RequestsPerDay': String(decision.remaining.requestsPerDay) }
              : {}),
            ...(decision?.remaining?.tokensPerDay !== undefined
              ? { 'X-Usage-Remaining-TokensPerDay': String(decision.remaining.tokensPerDay) }
              : {}),
            ...(decision?.remaining?.tokensPerMonth !== undefined
              ? { 'X-Usage-Remaining-TokensPerMonth': String(decision.remaining.tokensPerMonth) }
              : {}),
          },
        });
      } catch (err) {
        if (reservation) {
          await cancelReservation(reservation.reservationId).catch(() => {});
          reservation = null;
        }
        throw err;
      }
    }

    if (aiService.getAvailableProviders().length === 0) {
      const blocked = blockIfSimulationDisabled({
        capability: 'AI_CHAT',
        reason: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'AI provider not configured. Configure a real provider to run AI chat.',
        missingEnv: ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'],
      })
      if (blocked) {
        if (reservation) {
          await cancelReservation(reservation.reservationId).catch(() => {});
          reservation = null;
        }
        return blocked;
      }
      if (isAiDemoModeEnabled()) {
        const demoUsage = await consumeAiDemoUsage({
          userId: auth.userId,
          route: '/api/ai/chat',
        })
        if (!demoUsage.allowed) {
          if (reservation) {
            await cancelReservation(reservation.reservationId).catch(() => {});
            reservation = null;
          }
          return capabilityResponse({
            error: 'AI_DEMO_LIMIT_REACHED',
            status: 429,
            message: 'AI demo daily limit reached for this user.',
            capability: 'AI_CHAT',
            capabilityStatus: 'PARTIAL',
            milestone: 'P0',
            metadata: {
              ...buildAiProviderSetupMetadata({ route: '/api/ai/chat' }),
              demoMode: true,
              demoLimit: demoUsage.limit,
              demoUsed: demoUsage.used,
              demoRemaining: demoUsage.remaining,
              demoResetAt: demoUsage.resetAt,
            },
          })
        }

        if (reservation) {
          await settleCredits(reservation.reservationId, 0, { actualTokens: 0 });
          reservation = null;
        }

        const demo = demoRouteMetadata({ route: '/api/ai/chat', capability: 'AI_CHAT' });
        return NextResponse.json(
          {
            content: buildDemoChatContent({
              messages: messages.map((message) => ({ content: readString(asRecord(message).content) })),
            }),
            provider: AI_DEMO_PROVIDER,
            model: AI_DEMO_MODEL,
            tokensUsed: 0,
            latencyMs: 0,
            demoRemaining: demoUsage.remaining,
            demoLimit: demoUsage.limit,
            demoResetAt: demoUsage.resetAt,
            ...demo,
          },
          {
            headers: {
              ...(decision?.remaining?.requestsPerDay !== undefined
                ? { 'X-Usage-Remaining-RequestsPerDay': String(decision.remaining.requestsPerDay) }
                : {}),
              ...(decision?.remaining?.tokensPerDay !== undefined
                ? { 'X-Usage-Remaining-TokensPerDay': String(decision.remaining.tokensPerDay) }
                : {}),
              ...(decision?.remaining?.tokensPerMonth !== undefined
                ? { 'X-Usage-Remaining-TokensPerMonth': String(decision.remaining.tokensPerMonth) }
                : {}),
              'X-Aethel-AI-Demo-Mode': '1',
              'X-Aethel-AI-Demo-Remaining': String(demoUsage.remaining),
            },
          }
        );
      }
      if (reservation) {
        await cancelReservation(reservation.reservationId).catch(() => {});
        reservation = null;
      }
      return capabilityResponse({
        error: 'AI_PROVIDER_NOT_CONFIGURED',
        status: 503,
        message: 'AI provider not configured.',
        capability: 'AI_CHAT',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: buildAiProviderSetupMetadata({ route: '/api/ai/chat' }),
      });
    }

    if (requestedModel) {
      const inferredProvider = requestedProvider || inferProviderFromModel(requestedModel)
      if (inferredProvider && !aiService.getAvailableProviders().includes(inferredProvider)) {
        if (reservation) {
          await cancelReservation(reservation.reservationId).catch(() => {});
          reservation = null;
        }
        return capabilityResponse({
          error: 'AI_PROVIDER_NOT_CONFIGURED',
          status: 503,
          message: `Provider ${inferredProvider} not configured for model ${requestedModel}.`,
          capability: 'AI_CHAT',
          capabilityStatus: 'PARTIAL',
          milestone: 'P0',
          metadata: buildAiProviderSetupMetadata({
            route: '/api/ai/chat',
            requestedModel,
            expectedProvider: inferredProvider,
            availableProviders: aiService.getAvailableProviders(),
          }),
        })
      }
    }

    const aiMessages: Message[] = messages
      .map(toAiMessage)
      .filter((message): message is Message => Boolean(message));
    const agentHandoff = await loadAgentHandoffContext({
      userId: auth.userId,
      projectId,
      routeKind: 'chat',
      requestedAgent: readString(body.agent),
      promptText,
    })
    const projectRulesContext = await loadProjectRulesContext({ userId: auth.userId, projectId })
    const aiMessagesWithHandoff = applyAgentHandoffContextToMessages(aiMessages, agentHandoff.context)
    const aiMessagesWithRules = applyProjectRulesToMessages(aiMessagesWithHandoff, projectRulesContext)

    try {
      const response = await aiService.chat({
        messages: aiMessagesWithRules,
        model: requestedModel,
        provider: requestedProvider,
        temperature: readNumber(body.temperature),
        maxTokens: resolvedMaxTokens,
        userId: auth.userId,
        isBYOK: isByok,
        apiKeyOverride: byokKey,
      });

      const actualTokens = response.tokensUsed || 0;
      if (reservation) {
        const actualWeighted = applyTokenWeight(actualTokens || estimatedTotalTokens, response.model || requestedModel || 'openai/gpt-4o-mini');
        const actualCost = calculateTokenCost('chat', actualWeighted);
        await settleCredits(reservation.reservationId, actualCost, { actualTokens });
        await recordTokenUsage(auth.userId, actualWeighted).catch(() => {});
        reservation = null;
      }

      return withLegacyAiRouteDeprecation(
        NextResponse.json(
        {
          content: response.content,
          provider: response.provider,
          model: response.model,
          tokensUsed: response.tokensUsed,
          latencyMs: response.latencyMs,
          agentHandoff: agentHandoff.packet
            ? {
                agent: agentHandoff.agent,
                status: agentHandoff.packet.status,
                lane: agentHandoff.packet.workContract.lane,
                scopeMode: agentHandoff.packet.workContract.scopeLock.mode,
                hasManifest: agentHandoff.hasManifest,
                manifestId: agentHandoff.packet.cartography.manifestId,
              }
            : undefined,
        },
        {
          headers: {
            ...(decision?.remaining?.requestsPerDay !== undefined
              ? { 'X-Usage-Remaining-RequestsPerDay': String(decision.remaining.requestsPerDay) }
              : {}),
            ...(decision?.remaining?.tokensPerDay !== undefined
              ? { 'X-Usage-Remaining-TokensPerDay': String(decision.remaining.tokensPerDay) }
              : {}),
            ...(decision?.remaining?.tokensPerMonth !== undefined
              ? { 'X-Usage-Remaining-TokensPerMonth': String(decision.remaining.tokensPerMonth) }
              : {}),
          },
        }
      ),
      );
    } catch (err) {
      if (reservation) {
        await cancelReservation(reservation.reservationId).catch(() => {});
        reservation = null;
      }
      throw err;
    }
  } catch (error) {
    if (reservation) {
      await cancelReservation(reservation.reservationId).catch(() => {});
    }
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return apiInternalError('Internal server error', 500);
  } finally {
    if (leaseId) {
      await releaseConcurrencyLease(leaseId);
    }
  }
}
