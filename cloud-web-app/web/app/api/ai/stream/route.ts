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
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { capabilityResponse } from '@/lib/server/capability-response';

function getBackendBaseUrl(): string {
	const raw = process.env.NEXT_PUBLIC_API_URL;
	if (!raw) {
		throw Object.assign(
			new Error('AI_BACKEND_NOT_CONFIGURED: defina NEXT_PUBLIC_API_URL (ex: http://localhost:8000) ou use um runtime interno.'),
			{ code: 'AI_BACKEND_NOT_CONFIGURED' }
		);
	}
	if (raw.startsWith('/')) {
		throw Object.assign(
			new Error('AI_BACKEND_NOT_CONFIGURED: NEXT_PUBLIC_API_URL precisa ser uma URL absoluta (http/https) para proxy de IA.'),
			{ code: 'AI_BACKEND_NOT_CONFIGURED' }
		);
	}
	return raw.replace(/\/$/, '');
}

export const runtime = 'nodejs';

export async function POST(req: NextRequest): Promise<NextResponse> {
	let leaseId: string | null = null;
	let releaseOnFinally = true;

	try {
		const auth = requireAuth(req);
		const rateLimitResponse = await enforceRateLimit({
			scope: 'ai-stream',
			key: auth.userId,
			max: 30,
			windowMs: 60 * 1000,
			message: 'Too many AI stream requests. Please retry shortly.',
		});
		if (rateLimitResponse) return rateLimitResponse;

		const entitlements = await requireEntitlementsForUser(auth.userId);

		const body = await req.json().catch(() => null);
		if (!body || typeof body !== 'object') {
			return NextResponse.json({ error: 'INVALID_BODY', message: 'Body JSON inválido.' }, { status: 400 });
		}

		const prompt = typeof (body as any).prompt === 'string' ? (body as any).prompt : '';
		const messages = Array.isArray((body as any).messages) ? (body as any).messages : [];
		const promptText = prompt
			? prompt
			: messages.map((m: any) => (typeof m?.content === 'string' ? m.content : '')).join('\n');
		const maxTokens = typeof (body as any).maxTokens === 'number' ? Math.max(0, Math.floor((body as any).maxTokens)) : 0;

		const estimatedPromptTokens = estimateTokensFromText(promptText);
		const estimatedTotalTokens = estimatedPromptTokens + maxTokens;

		const lease = await acquireConcurrencyLease({
			userId: auth.userId,
			key: 'api/ai/stream',
			concurrencyLimit: entitlements.plan.limits.concurrent,
			ttlSeconds: 120,
		});
		leaseId = lease?.leaseId ?? null;

		const decision = await consumeMeteredUsage({
			userId: auth.userId,
			limits: entitlements.plan.limits,
			cost: { requests: 1, tokens: estimatedTotalTokens },
		});

		const backendBase = getBackendBaseUrl();
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
			const text = await upstream.text().catch(() => '');
			return new NextResponse(text || JSON.stringify({ error: 'UPSTREAM_ERROR' }), {
				status: upstream.status,
				headers: { 'Content-Type': upstream.headers.get('content-type') || 'application/json' },
			});
		}

		const { readable, writable } = new TransformStream();
		releaseOnFinally = false;
		upstream.body
			.pipeTo(writable)
			.catch(() => {})
			.finally(async () => {
				if (leaseId) await releaseConcurrencyLease(leaseId);
			});

		return new NextResponse(readable, {
			status: upstream.status,
			headers: {
				'Content-Type': upstream.headers.get('content-type') || 'text/plain; charset=utf-8',
				'Cache-Control': 'no-store',
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
			return capabilityResponse({
				error: 'AI_BACKEND_NOT_CONFIGURED',
				message: (error as Error).message,
				status: 503,
				capability: 'AI_STREAM_BACKEND',
				capabilityStatus: 'PARTIAL',
				milestone: 'P0',
				metadata: {
					reason: 'missing_backend_base_url',
				},
			});
		}

		return apiInternalError('Internal server error', 500);
	} finally {
		// Se a resposta for stream, a liberação ocorre no finally do pipeTo.
		if (leaseId && releaseOnFinally) {
			await releaseConcurrencyLease(leaseId);
		}
	}
}
