import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { aiService } from '@/lib/ai-service';
import type { LLMProvider, Message } from '@/lib/ai-service';
import { checkModelAccess } from '@/lib/plan-limits';
import {
  acquireConcurrencyLease,
  estimateTokensFromText,
  consumeMeteredUsage,
  releaseConcurrencyLease,
} from '@/lib/metering';
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
import { AI_CORE_RATE_LIMIT, enforceAiCoreRateLimit } from '@/lib/server/ai-core-rate-limit';
import { blockIfSimulationDisabled } from '@/lib/server/simulation-guard';
import { applyProjectRulesToMessages, loadProjectRulesContext } from '@/lib/server/project-rules'
import {
  applyAgentHandoffContextToMessages,
  loadAgentHandoffContext,
} from '@/lib/production/agent-handoff-context'

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

    if (requestedModel) {
      const modelCheck = await checkModelAccess(auth.userId, requestedModel)
      if (!modelCheck.allowed) {
        return NextResponse.json(
          { error: modelCheck.code || 'MODEL_NOT_ALLOWED', message: modelCheck.reason || 'Model not allowed' },
          { status: 403 }
        )
      }
    }

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

    if (aiService.getAvailableProviders().length === 0) {
      const blocked = blockIfSimulationDisabled({
        capability: 'AI_CHAT',
        reason: 'AI_PROVIDER_NOT_CONFIGURED',
        message: 'AI provider not configured. Configure a real provider to run AI chat.',
        missingEnv: ['OPENAI_API_KEY', 'OPENROUTER_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_API_KEY'],
      })
      if (blocked) return blocked
      if (isAiDemoModeEnabled()) {
        const demoUsage = await consumeAiDemoUsage({
          userId: auth.userId,
          route: '/api/ai/chat',
        })
        if (!demoUsage.allowed) {
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
              ...(decision.remaining?.requestsPerHour !== undefined
                ? { 'X-Usage-Remaining-RequestsPerHour': String(decision.remaining.requestsPerHour) }
                : {}),
              ...(decision.remaining?.tokensPerDay !== undefined
                ? { 'X-Usage-Remaining-TokensPerDay': String(decision.remaining.tokensPerDay) }
                : {}),
              ...(decision.remaining?.tokensPerMonth !== undefined
                ? { 'X-Usage-Remaining-TokensPerMonth': String(decision.remaining.tokensPerMonth) }
                : {}),
              'X-Aethel-AI-Demo-Mode': '1',
              'X-Aethel-AI-Demo-Remaining': String(demoUsage.remaining),
            },
          }
        );
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

    const response = await aiService.chat({
      messages: aiMessagesWithRules,
      model: requestedModel,
      provider: requestedProvider,
      temperature: readNumber(body.temperature),
      maxTokens: resolvedMaxTokens,
    });

    return NextResponse.json(
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
