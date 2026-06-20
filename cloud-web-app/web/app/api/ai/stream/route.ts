import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { aiService, type LLMProvider, type Message } from '@/lib/ai-service';
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
	isAiDemoModeEnabled,
} from '@/lib/server/ai-demo-mode';
import { consumeAiDemoUsage } from '@/lib/server/ai-demo-usage';
import { AI_CORE_RATE_LIMIT, enforceAiCoreRateLimit, AI_BYOK_RATE_LIMIT } from '@/lib/server/ai-core-rate-limit';
import { blockIfSimulationDisabled } from '@/lib/server/simulation-guard';

function getBackendBaseUrl(): string | null {
	const raw = process.env.NEXT_PUBLIC_API_URL;
	if (!raw) return null;
	if (raw.startsWith('/')) {
		throw Object.assign(
			new Error('AI_BACKEND_NOT_CONFIGURED: NEXT_PUBLIC_API_URL precisa ser uma URL absoluta (http/https) para proxy de IA.'),
			{ code: 'AI_BACKEND_NOT_CONFIGURED' }
		);
	}
	return raw.replace(/\/$/, '');
}

type AiStreamRequestBody = {
	prompt?: unknown;
	messages?: unknown;
	provider?: unknown;
	model?: unknown;
	maxTokens?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function isMessage(value: unknown): value is Message {
	return isRecord(value)
		&& (value.role === 'system' || value.role === 'user' || value.role === 'assistant')
		&& typeof value.content === 'string';
}

function parseProvider(value: unknown): LLMProvider | undefined {
	return value === 'openai'
		|| value === 'openrouter'
		|| value === 'anthropic'
		|| value === 'google'
		|| value === 'groq'
		? value
		: undefined;
}

function hasErrorCode(error: unknown, code: string): boolean {
	return isRecord(error) && error.code === code;
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
	let leaseId: string | null = null;
	let releaseOnFinally = true;

	try {
		const auth = requireAuth(req);
		const rateLimited = enforceAiCoreRateLimit({
			req,
			capability: 'AI_STREAM',
			route: '/api/ai/stream',
			config: AI_CORE_RATE_LIMIT,
		});
		if (rateLimited) return rateLimited;
		const entitlements = await requireEntitlementsForUser(auth.userId);

		const body = await req.json().catch(() => null);
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'INVALID_BODY', message: 'Invalid JSON body.' }, { status: 400 });
		}

		const payload = body as AiStreamRequestBody;
		const prompt = typeof payload.prompt === 'string' ? payload.prompt : '';
		const rawMessages = Array.isArray(payload.messages) ? payload.messages : [];
		const messages = rawMessages.filter(isMessage);
		const provider = parseProvider(payload.provider);
		const model = typeof payload.model === 'string' ? payload.model : undefined;
		const promptText = prompt
			? prompt
			: messages.map((m) => m.content).join('\n');
		const maxTokens = typeof payload.maxTokens === 'number' ? Math.max(0, Math.floor(payload.maxTokens)) : 0;

		const estimatedPromptTokens = estimateTokensFromText(promptText);
		const estimatedTotalTokens = estimatedPromptTokens + maxTokens;

		const isByok = req.headers.get('x-aethel-byok-active') === '1';

		if (isByok) {
			const rateLimitedByok = enforceAiCoreRateLimit({
				req,
				capability: 'AI_STREAM',
				route: '/api/ai/stream',
				config: AI_BYOK_RATE_LIMIT,
			});
			if (rateLimitedByok) return rateLimitedByok;
		}

		if (model && !isByok) {
			const modelCheck = await checkModelAccess(auth.userId, model);
			if (!modelCheck.allowed) {
				return NextResponse.json(
					{ error: modelCheck.code || 'MODEL_NOT_ALLOWED', message: modelCheck.reason || 'Model not allowed' },
					{ status: 403 }
				);
			}
		}

		const lease = await acquireConcurrencyLease({
			userId: auth.userId,
			key: 'api/ai/stream',
			concurrencyLimit: entitlements.plan.limits.concurrent,
			ttlSeconds: 120,
		});
		leaseId = lease?.leaseId ?? null;

		let decision: any = null;
		let reservation: any = null;

		if (!isByok) {
			decision = await consumeMeteredUsage({
				userId: auth.userId,
				limits: entitlements.plan.limits,
				cost: { requests: 1, tokens: 0 },
				modelId: model || undefined,
			});

			const modelName = model || 'openai/gpt-4o-mini';
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

		const backendBase = getBackendBaseUrl();
		if (backendBase) {
			const upstream = await fetch(`${backendBase}/chat/stream`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(req.headers.get('authorization') ? { Authorization: req.headers.get('authorization') as string } : {}),
					'X-Aethel-User-Id': auth.userId,
				},
				body: JSON.stringify(body),
			});

			if (!upstream.ok || !upstream.body) {
				if (reservation) {
					await cancelReservation(reservation.reservationId).catch(() => {});
					reservation = null;
				}
				const text = await upstream.text().catch(() => '');
				return new NextResponse(text || JSON.stringify({ error: 'UPSTREAM_ERROR' }), {
					status: upstream.status,
					headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
				});
			}

			const { readable, writable } = new TransformStream();
			releaseOnFinally = false;

			let totalBytes = 0;
			const transformStream = new TransformStream({
				transform(chunk, controller) {
					totalBytes += chunk.byteLength || chunk.length || 0;
					controller.enqueue(chunk);
				},
				async flush() {
					if (reservation) {
						const actualTokens = Math.max(1, Math.ceil(totalBytes / 4));
						const actualWeighted = applyTokenWeight(actualTokens, model || 'openai/gpt-4o-mini');
						const actualCost = calculateTokenCost('chat', actualWeighted);
						await settleCredits(reservation.reservationId, actualCost, { actualTokens });
						await recordTokenUsage(auth.userId, actualWeighted).catch(() => {});
						reservation = null;
					}
				}
			});

			upstream.body
				.pipeThrough(transformStream)
				.pipeTo(writable)
				.catch(async () => {
					if (reservation) {
						await cancelReservation(reservation.reservationId).catch(() => {});
						reservation = null;
					}
				})
				.finally(async () => {
					if (reservation) {
						await cancelReservation(reservation.reservationId).catch(() => {});
						reservation = null;
					}
					if (leaseId) await releaseConcurrencyLease(leaseId);
				});

			return new NextResponse(readable, {
				status: upstream.status,
				headers: {
					'Content-Type': upstream.headers.get('content-type') || 'text/plain; charset=utf-8',
					'Cache-Control': 'no-store',
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
		}

		if (aiService.getAvailableProviders().length === 0) {
			const blocked = blockIfSimulationDisabled({
				capability: 'AI_STREAM',
				reason: 'AI_PROVIDER_NOT_CONFIGURED',
				message: 'AI provider not configured. Configure a real provider to run streaming chat.',
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
					route: '/api/ai/stream',
				});
				if (!demoUsage.allowed) {
					if (reservation) {
						await cancelReservation(reservation.reservationId).catch(() => {});
						reservation = null;
					}
					return capabilityResponse({
						error: 'AI_DEMO_LIMIT_REACHED',
						status: 429,
						message: 'AI demo daily limit reached for this user.',
						capability: 'AI_STREAM',
						capabilityStatus: 'PARTIAL',
						milestone: 'P0',
						metadata: {
							...buildAiProviderSetupMetadata({ route: '/api/ai/stream' }),
							demoMode: true,
							demoLimit: demoUsage.limit,
							demoUsed: demoUsage.used,
							demoRemaining: demoUsage.remaining,
							demoResetAt: demoUsage.resetAt,
						},
					});
				}

				if (reservation) {
					await settleCredits(reservation.reservationId, 0, { actualTokens: 0 });
					reservation = null;
				}

				const encoder = new TextEncoder();
				const demoText = buildDemoChatContent({ messages });
				const readable = new ReadableStream({
					start(controller) {
						controller.enqueue(encoder.encode(demoText));
						controller.close();
					},
				});

				return new NextResponse(readable, {
					status: 200,
					headers: {
						'Content-Type': 'text/plain; charset=utf-8',
						'Cache-Control': 'no-store',
						'X-Aethel-AI-Demo-Mode': '1',
						'X-Aethel-AI-Demo-Provider': AI_DEMO_PROVIDER,
						'X-Aethel-AI-Demo-Model': AI_DEMO_MODEL,
						'X-Aethel-AI-Demo-Remaining': String(demoUsage.remaining),
					},
				});
			}

			if (reservation) {
				await cancelReservation(reservation.reservationId).catch(() => {});
				reservation = null;
			}

			return capabilityResponse({
				error: 'AI_PROVIDER_NOT_CONFIGURED',
				status: 503,
				message: 'AI provider not configured.',
				capability: 'AI_STREAM',
				capabilityStatus: 'PARTIAL',
				milestone: 'P0',
				metadata: buildAiProviderSetupMetadata({ route: '/api/ai/stream', requestedModel: model }),
			});
		}

		const encoder = new TextEncoder();
		let accumulatedText = '';
		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of aiService.chatStream({
						messages: messages
							.map((m) => ({ role: m.role, content: m.content })),
						model,
						provider,
						maxTokens: maxTokens > 0 ? maxTokens : undefined,
					})) {
						accumulatedText += chunk;
						controller.enqueue(encoder.encode(chunk));
					}

					if (reservation) {
						const actualTokens = estimateTokensFromText(accumulatedText);
						const actualWeighted = applyTokenWeight(actualTokens, model || 'openai/gpt-4o-mini');
						const actualCost = calculateTokenCost('chat', actualWeighted);
						await settleCredits(reservation.reservationId, actualCost, { actualTokens });
						await recordTokenUsage(auth.userId, actualWeighted).catch(() => {});
						reservation = null;
					}

					controller.close();
				} catch (streamError) {
					if (reservation) {
						await cancelReservation(reservation.reservationId).catch(() => {});
						reservation = null;
					}
					controller.error(streamError);
				} finally {
					if (leaseId) {
						await releaseConcurrencyLease(leaseId);
						leaseId = null;
					}
				}
			},
			async cancel() {
				if (reservation) {
					await cancelReservation(reservation.reservationId).catch(() => {});
					reservation = null;
				}
				if (leaseId) {
					await releaseConcurrencyLease(leaseId);
					leaseId = null;
				}
			}
		});
		releaseOnFinally = false;

		return new NextResponse(readable, {
			status: 200,
			headers: {
				'Content-Type': 'text/plain; charset=utf-8',
				'Cache-Control': 'no-store',
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
	} catch (error) {
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;

		if (hasErrorCode(error, 'AI_BACKEND_NOT_CONFIGURED')) {
			return NextResponse.json(
				{ error: 'AI_BACKEND_NOT_CONFIGURED', message: (error as Error).message },
				{ status: 501 }
			);
		}

		return apiInternalError('Internal server error', 500);
	} finally {
		// Se a resposta for stream, a liberação ocorre no finally do pipeTo.
		if (leaseId && releaseOnFinally) {
			await releaseConcurrencyLease(leaseId);
		}
	}
}
