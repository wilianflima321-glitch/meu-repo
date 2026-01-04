import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import {
	acquireConcurrencyLease,
	estimateTokensFromText,
	consumeMeteredUsage,
	releaseConcurrencyLease,
} from '@/lib/metering';

function getBackendBaseUrl(): string {
	// Quando NEXT_PUBLIC_API_URL aponta para runtime externo (ex: http://localhost:8000)
	// este endpoint pode atuar como proxy com enforcement.
	const raw = process.env.NEXT_PUBLIC_API_URL;
	if (!raw) {
		throw Object.assign(
			new Error('AI_BACKEND_NOT_CONFIGURED: defina NEXT_PUBLIC_API_URL (ex: http://localhost:8000) ou use um runtime interno.'),
			{ code: 'AI_BACKEND_NOT_CONFIGURED' }
		);
	}
	// Evita base relativa aqui (seria loop com /api no mesmo servidor)
	if (raw.startsWith('/')) {
		throw Object.assign(
			new Error('AI_BACKEND_NOT_CONFIGURED: NEXT_PUBLIC_API_URL precisa ser uma URL absoluta (http/https) para proxy de IA.'),
			{ code: 'AI_BACKEND_NOT_CONFIGURED' }
		);
	}
	return raw.replace(/\/$/, '');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	let leaseId: string | null = null;

	try {
		const auth = requireAuth(req);
		const entitlements = await requireEntitlementsForUser(auth.userId);

		const body = await req.json().catch(() => null);
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON inválido.' }, { status: 400 });
		}

		// Estima tokens a partir de mensagens/prompt
		const messages = Array.isArray((body as any).messages) ? (body as any).messages : [];
		const promptText = messages
			.map((m: any) => (typeof m?.content === 'string' ? m.content : ''))
			.join('\n');
		const maxTokens = typeof (body as any).maxTokens === 'number' ? Math.max(0, Math.floor((body as any).maxTokens)) : 0;

		const estimatedPromptTokens = estimateTokensFromText(promptText);
		const estimatedTotalTokens = estimatedPromptTokens + maxTokens;

		// Concurrency enforcement (IA costuma ser a operação cara)
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

		const backendBase = getBackendBaseUrl();
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
	} catch (error) {
		const mapped = apiErrorToResponse(error);
		if (mapped) return mapped;

		if ((error as any)?.code === 'AI_BACKEND_NOT_CONFIGURED') {
			return NextResponse.json(
				{ error: 'AI_BACKEND_NOT_CONFIGURED', message: (error as Error).message },
				{ status: 501 }
			);
		}

		return apiInternalError('Internal server error', 500);
	} finally {
		if (leaseId) {
			await releaseConcurrencyLease(leaseId);
		}
	}
}
