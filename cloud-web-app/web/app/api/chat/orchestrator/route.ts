import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { requireEntitlementsForUser } from '@/lib/entitlements';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import {
	acquireConcurrencyLease,
	estimateTokensFromText,
	consumeMeteredUsage,
	releaseConcurrencyLease,
} from '@/lib/metering';

function getBackendBaseUrl(): string {
	const raw = process.env.NEXT_PUBLIC_API_URL;
	if (!raw) {
		throw Object.assign(
			new Error('AI_BACKEND_NOT_CONFIGURED: defina NEXT_PUBLIC_API_URL (ex: http://localhost:8000) para habilitar o Chat Orchestrator.'),
			{ code: 'AI_BACKEND_NOT_CONFIGURED' }
		);
	}
	if (raw.startsWith('/')) {
		throw Object.assign(
			new Error('AI_BACKEND_NOT_CONFIGURED: NEXT_PUBLIC_API_URL precisa ser uma URL absoluta (http/https).'),
			{ code: 'AI_BACKEND_NOT_CONFIGURED' }
		);
	}
	return raw.replace(/\/$/, '');
}

export async function POST(req: NextRequest): Promise<NextResponse> {
	let leaseId: string | null = null;

	try {
		const auth = requireAuth(req);
		const rateLimitResponse = await enforceRateLimit({
			scope: 'chat-orchestrator-post',
			key: auth.userId,
			max: 180,
			windowMs: 60 * 60 * 1000,
			message: 'Too many chat orchestrator requests. Please wait before retrying.',
		});
		if (rateLimitResponse) return rateLimitResponse;
		const entitlements = await requireEntitlementsForUser(auth.userId);

		const body = await req.json().catch(() => null);
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON inválido.' }, { status: 400 });
		}

		const prompt = typeof (body as any).prompt === 'string' ? (body as any).prompt : '';
		const maxTokens = typeof (body as any).maxTokens === 'number' ? Math.max(0, Math.floor((body as any).maxTokens)) : 0;
		const estimatedTotalTokens = estimateTokensFromText(prompt) + maxTokens;

		const lease = await acquireConcurrencyLease({
			userId: auth.userId,
			key: 'api/chat/orchestrator',
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
		const upstream = await fetch(`${backendBase}/chat/orchestrator`, {
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
