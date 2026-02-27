import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { aiService } from '@/lib/ai-service';
import {
  acquireConcurrencyLease,
  estimateTokensFromText,
  consumeMeteredUsage,
  releaseConcurrencyLease,
} from '@/lib/metering';
import { capabilityResponse, notImplementedCapability } from '@/lib/server/capability-response';
import { enforceRateLimit } from '@/lib/server/rate-limit';

const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'google', 'groq'] as const;

function resolveBackendBaseUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw) return null;
  if (raw.startsWith('/')) return null;
  return raw.replace(/\/$/, '');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let leaseId: string | null = null;

  try {
    const auth = requireAuth(req);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'ai-chat',
      key: auth.userId,
      max: 60,
      windowMs: 60 * 1000,
      message: 'Too many AI chat requests. Please retry shortly.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const entitlements = await requireEntitlementsForUser(auth.userId);

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 });
    }

    const requestedProviderRaw =
      typeof (body as any).provider === 'string' ? String((body as any).provider).trim().toLowerCase() : '';
    if (
      requestedProviderRaw &&
      !SUPPORTED_PROVIDERS.includes(requestedProviderRaw as (typeof SUPPORTED_PROVIDERS)[number])
    ) {
      return NextResponse.json(
        {
          error: 'INVALID_PROVIDER',
          message: 'Requested provider is not supported.',
          supportedProviders: [...SUPPORTED_PROVIDERS],
        },
        { status: 400 }
      );
    }
    const requestedProvider = requestedProviderRaw
      ? (requestedProviderRaw as (typeof SUPPORTED_PROVIDERS)[number])
      : undefined;

    const messages = Array.isArray((body as any).messages) ? (body as any).messages : [];
    const promptText = messages
      .map((m: any) => (typeof m?.content === 'string' ? m.content : ''))
      .join('\n');
    const maxTokens = typeof (body as any).maxTokens === 'number' ? Math.max(0, Math.floor((body as any).maxTokens)) : 0;
    const resolvedMaxTokens = maxTokens > 0 ? maxTokens : undefined;

    if (!promptText.trim()) {
      return NextResponse.json({ error: 'MISSING_PROMPT', message: 'messages is required.' }, { status: 400 });
    }

    const estimatedPromptTokens = estimateTokensFromText(promptText);
    const estimatedTotalTokens = estimatedPromptTokens + maxTokens;

    const lease = await acquireConcurrencyLease({
      userId: auth.userId,
      key: 'api/ai/chat',
      concurrencyLimit: entitlements.plan.limits.concurrent,
      ttlSeconds: 90,
    });
    leaseId = lease?.leaseId ?? null;

    const decision = await consumeMeteredUsage({
      userId: auth.userId,
      limits: entitlements.plan.limits,
      cost: { requests: 1, tokens: estimatedTotalTokens },
    });

    const backendBase = resolveBackendBaseUrl();
    if (backendBase) {
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
      return new NextResponse(text, {
        status: upstream.status,
        headers: {
          'Content-Type': upstream.headers.get('content-type') || 'application/json',
          ...(decision.remaining?.requestsPerHour !== undefined
            ? { 'X-Usage-Remaining-RequestsPerHour': String(decision.remaining.requestsPerHour) }
            : {}),
          ...(decision.remaining?.tokensPerDay !== undefined
            ? { 'X-Usage-Remaining-TokensPerDay': String(decision.remaining.tokensPerDay) }
            : {}),
          ...(decision.remaining?.tokensPerMonth !== undefined
            ? { 'X-Usage-Remaining-TokensPerMonth': String(decision.remaining.tokensPerMonth) }
            : {}),
        },
      });
    }

    const availableProviders = aiService.getAvailableProviders();
    if (availableProviders.length === 0) {
      return notImplementedCapability({
        error: 'NOT_IMPLEMENTED',
        status: 501,
        message: 'AI provider not configured.',
        capability: 'AI_CHAT',
        milestone: 'P0',
      });
    }
    if (requestedProvider && !availableProviders.includes(requestedProvider as (typeof availableProviders)[number])) {
      return capabilityResponse({
        error: 'PROVIDER_NOT_CONFIGURED',
        message: 'Requested AI provider is not configured for current runtime.',
        status: 503,
        capability: 'AI_CHAT',
        capabilityStatus: 'PARTIAL',
        milestone: 'P0',
        metadata: {
          requestedProvider,
          availableProviders,
        },
      });
    }

    const aiMessages = messages
      .filter((m: any) => typeof m?.role === 'string' && typeof m?.content === 'string')
      .map((m: any) => ({ role: m.role, content: m.content }));

    const response = await aiService.chat({
      messages: aiMessages,
      model: typeof (body as any).model === 'string' ? (body as any).model : undefined,
      provider: requestedProvider,
      temperature: typeof (body as any).temperature === 'number' ? (body as any).temperature : undefined,
      maxTokens: resolvedMaxTokens,
    });

    return NextResponse.json(
      {
        content: response.content,
        provider: response.provider,
        model: response.model,
        tokensUsed: response.tokensUsed,
        latencyMs: response.latencyMs,
      },
      {
        headers: {
          ...(decision.remaining?.requestsPerHour !== undefined
            ? { 'X-Usage-Remaining-RequestsPerHour': String(decision.remaining.requestsPerHour) }
            : {}),
          ...(decision.remaining?.tokensPerDay !== undefined
            ? { 'X-Usage-Remaining-TokensPerDay': String(decision.remaining.tokensPerDay) }
            : {}),
          ...(decision.remaining?.tokensPerMonth !== undefined
            ? { 'X-Usage-Remaining-TokensPerMonth': String(decision.remaining.tokensPerMonth) }
            : {}),
        },
      }
    );
  } catch (error) {
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;

    return apiInternalError('Internal server error', 500);
  } finally {
    if (leaseId) {
      await releaseConcurrencyLease(leaseId);
    }
  }
}
