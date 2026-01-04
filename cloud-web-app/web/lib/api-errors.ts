import { NextResponse } from 'next/server';

const PAYMENT_CODES = new Set([
	'PAYMENT_REQUIRED',
	'TRIAL_EXPIRED',
	'SUBSCRIPTION_EXPIRED',
	'FEATURE_NOT_AVAILABLE',
	'PROJECT_LIMIT_REACHED',
	'STORAGE_LIMIT_REACHED',
]);

const BAD_REQUEST_CODES = new Set([
	'PATH_OUTSIDE_WORKSPACE',
	'INVALID_PATH',
	'INVALID_CWD',
	'INVALID_WORKSPACE_ROOT',
]);

const TOO_MANY_REQUESTS_CODES = new Set([
	'RATE_LIMITED',
]);

export function apiErrorToResponse(error: unknown): NextResponse | null {
	// Auth not configured is a server-side misconfig, not a 401.
	if ((error as any)?.code === 'AUTH_NOT_CONFIGURED') {
		return NextResponse.json(
			{ error: 'AUTH_NOT_CONFIGURED', message: (error as Error).message },
			{ status: 503 }
		);
	}

	if (error instanceof Error && error.message === 'Unauthorized') {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const code = (error as any)?.code;
	if (typeof code === 'string') {
		if (TOO_MANY_REQUESTS_CODES.has(code)) {
			const retryAfterSeconds = Number((error as any)?.retryAfterSeconds);
			const resetAt = String((error as any)?.resetAt || '');
			const limitType = String((error as any)?.limitType || '');

			return NextResponse.json(
				{
					error: code,
					message: (error as Error).message,
					limitType,
					retryAfterSeconds: Number.isFinite(retryAfterSeconds)
						? Math.max(1, Math.floor(retryAfterSeconds))
						: undefined,
					resetAt: resetAt || undefined,
				},
				{
					status: 429,
					headers: {
						...(Number.isFinite(retryAfterSeconds)
							? { 'Retry-After': String(Math.max(1, Math.floor(retryAfterSeconds))) }
							: {}),
						...(resetAt ? { 'X-RateLimit-Reset': resetAt } : {}),
						...(limitType ? { 'X-RateLimit-Type': limitType } : {}),
					},
				}
			);
		}

		if (PAYMENT_CODES.has(code)) {
			return NextResponse.json(
				{ error: code, message: (error as Error).message },
				{ status: 402 }
			);
		}

		if (BAD_REQUEST_CODES.has(code) || code.startsWith('INVALID_')) {
			return NextResponse.json(
				{ error: code, message: (error as Error).message },
				{ status: 400 }
			);
		}
	}

	return null;
}

export function apiInternalError(message = 'Internal server error', status = 500): NextResponse {
	return NextResponse.json({ error: message }, { status });
}
