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

const FORBIDDEN_CODES = new Set([
	'PROJECT_ACCESS_DENIED',
	'FORBIDDEN',
]);

const NOT_FOUND_CODES = new Set([
	'PROJECT_NOT_FOUND',
	'ROOM_NOT_FOUND',
	'USER_NOT_FOUND',
]);

type ApiErrorLike = Error & {
	code?: string;
	retryAfterSeconds?: number;
	resetAt?: string;
	limitType?: string;
};

function getApiError(error: unknown): ApiErrorLike | null {
	return error instanceof Error ? (error as ApiErrorLike) : null;
}

export function apiErrorToResponse(error: unknown): NextResponse | null {
	const apiError = getApiError(error);

	// Auth not configured is a server-side misconfig, not a 401.
	if (apiError?.code === 'AUTH_NOT_CONFIGURED') {
		return NextResponse.json(
			{ error: 'AUTH_NOT_CONFIGURED', message: apiError.message },
			{ status: 503 }
		);
	}

	if (error instanceof Error && error.message === 'Unauthorized') {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const code = apiError?.code;
	if (typeof code === 'string' && apiError) {
		if (FORBIDDEN_CODES.has(code)) {
			return NextResponse.json(
				{ error: code, message: apiError.message },
				{ status: 403 }
			);
		}

		if (NOT_FOUND_CODES.has(code)) {
			return NextResponse.json(
				{ error: code, message: apiError.message },
				{ status: 404 }
			);
		}

		if (TOO_MANY_REQUESTS_CODES.has(code)) {
			const retryAfterSeconds = Number(apiError.retryAfterSeconds);
			const resetAt = String(apiError.resetAt || '');
			const limitType = String(apiError.limitType || '');

			return NextResponse.json(
				{
					error: code,
					message: apiError.message,
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
				{ error: code, message: apiError.message },
				{ status: 402 }
			);
		}

		if (BAD_REQUEST_CODES.has(code) || code.startsWith('INVALID_')) {
			return NextResponse.json(
				{ error: code, message: apiError.message },
				{ status: 400 }
			);
		}
	}

	return null;
}

export function apiInternalError(message = 'Internal server error', status = 500): NextResponse {
	return NextResponse.json({ error: message }, { status });
}

/**
 * Creates an API error with a stable code and message.
 */
export function createAPIError(code: string, message: string, details?: Record<string, unknown>): Error {
	const error = new Error(message) as ApiErrorLike;
	error.code = code;
	if (details) {
		Object.assign(error, details);
	}
	return error;
}
