import { prisma } from './db';
import { type PlanLimits } from './plans';

type WindowId = 'hour' | 'day' | 'month';

export type MeteringCost = {
	requests?: number;
	tokens?: number;
};

export type MeteringDecision = {
	allowed: boolean;
	remaining?: {
		requestsPerHour?: number;
		tokensPerDay?: number;
		tokensPerMonth?: number;
	};
	resetAt?: {
		hour?: Date;
		day?: Date;
		month?: Date;
	};
};

export type RateLimitedError = Error & {
	code: 'RATE_LIMITED';
	limitType: 'requestsPerHour' | 'tokensPerDay' | 'tokensPerMonth' | 'concurrent';
	retryAfterSeconds: number;
	resetAt: string;
};

function clampInt(value: unknown, fallback: number): number {
	if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
	return Math.max(0, Math.floor(value));
}

function utcWindowStart(now: Date, window: WindowId): Date {
	const y = now.getUTCFullYear();
	const m = now.getUTCMonth();
	const d = now.getUTCDate();
	const h = now.getUTCHours();
	if (window === 'month') return new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
	if (window === 'day') return new Date(Date.UTC(y, m, d, 0, 0, 0, 0));
	return new Date(Date.UTC(y, m, d, h, 0, 0, 0));
}

function utcWindowEnd(start: Date, window: WindowId): Date {
	const y = start.getUTCFullYear();
	const m = start.getUTCMonth();
	const d = start.getUTCDate();
	const h = start.getUTCHours();
	if (window === 'month') return new Date(Date.UTC(y, m + 1, 1, 0, 0, 0, 0));
	if (window === 'day') return new Date(Date.UTC(y, m, d + 1, 0, 0, 0, 0));
	return new Date(Date.UTC(y, m, d, h + 1, 0, 0, 0));
}

function unlimited(limit: number): boolean {
	return limit === -1;
}

export function estimateTokensFromText(text: string): number {
	// Estimativa conservadora (aprox. 4 chars/token). Serve para enforcement inicial.
	return Math.max(1, Math.ceil(text.length / 4));
}

export async function acquireConcurrencyLease(params: {
	userId: string;
	key: string;
	concurrencyLimit: number;
	ttlSeconds?: number;
}): Promise<{ leaseId: string } | null> {
	const { userId, key } = params;
	const concurrencyLimit = clampInt(params.concurrencyLimit, 0);
	const ttlSeconds = clampInt(params.ttlSeconds, 60);

	if (unlimited(params.concurrencyLimit)) return { leaseId: 'unlimited' };
	if (concurrencyLimit <= 0) {
		const err: RateLimitedError = Object.assign(new Error('CONCURRENCY_LIMIT: limite de concorrência atingido.'), {
			code: 'RATE_LIMITED' as const,
			limitType: 'concurrent' as const,
			retryAfterSeconds: 30,
			resetAt: new Date(Date.now() + 30_000).toISOString(),
		});
		throw err;
	}

	const now = new Date();
	const expiresAt = new Date(now.getTime() + ttlSeconds * 1000);

	// Limpa leases expirados e tenta adquirir um novo dentro de uma transação.
	return prisma.$transaction(async (tx) => {
		const txAny = tx as any;
		await txAny.concurrencyLease.deleteMany({
			where: { userId, expiresAt: { lte: now } },
		});

		const active = await txAny.concurrencyLease.count({
			where: { userId, expiresAt: { gt: now } },
		});

		if (active >= concurrencyLimit) {
			const err: RateLimitedError = Object.assign(
				new Error('CONCURRENCY_LIMIT: muitas operações simultâneas. Aguarde e tente novamente.'),
				{
					code: 'RATE_LIMITED' as const,
					limitType: 'concurrent' as const,
					retryAfterSeconds: 5,
					resetAt: new Date(Date.now() + 5_000).toISOString(),
				}
			);
			throw err;
		}

		const lease = await txAny.concurrencyLease.create({
			data: { userId, key, expiresAt },
		});
		return { leaseId: lease.id };
	});
}

export async function releaseConcurrencyLease(leaseId: string): Promise<void> {
	if (!leaseId || leaseId === 'unlimited') return;
	await (prisma as any).concurrencyLease.delete({ where: { id: leaseId } }).catch(() => {});
}

export async function consumeMeteredUsage(params: {
	userId: string;
	limits: PlanLimits;
	cost: MeteringCost;
}): Promise<MeteringDecision> {
	const { userId, limits } = params;
	const requestCost = clampInt(params.cost.requests ?? 1, 1);
	const tokenCost = clampInt(params.cost.tokens ?? 0, 0);

	const now = new Date();
	const hourStart = utcWindowStart(now, 'hour');
	const dayStart = utcWindowStart(now, 'day');
	const monthStart = utcWindowStart(now, 'month');
	const hourEnd = utcWindowEnd(hourStart, 'hour');
	const dayEnd = utcWindowEnd(dayStart, 'day');
	const monthEnd = utcWindowEnd(monthStart, 'month');

	return prisma.$transaction(async (tx) => {
		const txAny = tx as any;
		const [hourBucket, dayBucket, monthBucket] = await Promise.all([
			txAny.usageBucket.upsert({
				where: { userId_window_windowStart: { userId, window: 'hour', windowStart: hourStart } },
				update: {},
				create: {
					userId,
					window: 'hour',
					windowStart: hourStart,
					windowEnd: hourEnd,
				},
			}),
			txAny.usageBucket.upsert({
				where: { userId_window_windowStart: { userId, window: 'day', windowStart: dayStart } },
				update: {},
				create: {
					userId,
					window: 'day',
					windowStart: dayStart,
					windowEnd: dayEnd,
				},
			}),
			txAny.usageBucket.upsert({
				where: { userId_window_windowStart: { userId, window: 'month', windowStart: monthStart } },
				update: {},
				create: {
					userId,
					window: 'month',
					windowStart: monthStart,
					windowEnd: monthEnd,
				},
			}),
		]);

		// Checks (antes de incrementar)
		if (!unlimited(limits.requestsPerHour) && hourBucket.requests + requestCost > limits.requestsPerHour) {
			const retryAfterSeconds = Math.max(1, Math.ceil((hourBucket.windowEnd.getTime() - now.getTime()) / 1000));
			const err: RateLimitedError = Object.assign(
				new Error('RATE_LIMITED: limite de requisições por hora atingido.'),
				{
					code: 'RATE_LIMITED' as const,
					limitType: 'requestsPerHour' as const,
					retryAfterSeconds,
					resetAt: hourBucket.windowEnd.toISOString(),
				}
			);
			throw err;
		}

		if (tokenCost > 0 && !unlimited(limits.tokensPerDay) && dayBucket.tokens + tokenCost > limits.tokensPerDay) {
			const retryAfterSeconds = Math.max(1, Math.ceil((dayBucket.windowEnd.getTime() - now.getTime()) / 1000));
			const err: RateLimitedError = Object.assign(
				new Error('RATE_LIMITED: cota diária de tokens atingida.'),
				{
					code: 'RATE_LIMITED' as const,
					limitType: 'tokensPerDay' as const,
					retryAfterSeconds,
					resetAt: dayBucket.windowEnd.toISOString(),
				}
			);
			throw err;
		}

		if (tokenCost > 0 && !unlimited(limits.tokensPerMonth) && monthBucket.tokens + tokenCost > limits.tokensPerMonth) {
			// Mensagem sugere upgrade (mensal geralmente é limite de plano)
			const retryAfterSeconds = Math.max(1, Math.ceil((monthBucket.windowEnd.getTime() - now.getTime()) / 1000));
			const err: RateLimitedError = Object.assign(
				new Error('RATE_LIMITED: cota mensal de tokens atingida. Faça upgrade do plano para continuar.'),
				{
					code: 'RATE_LIMITED' as const,
					limitType: 'tokensPerMonth' as const,
					retryAfterSeconds,
					resetAt: monthBucket.windowEnd.toISOString(),
				}
			);
			throw err;
		}

		// Incrementa contadores (após checks)
		await Promise.all([
			txAny.usageBucket.update({
				where: { id: hourBucket.id },
				data: { requests: { increment: requestCost } },
			}),
			txAny.usageBucket.update({
				where: { id: dayBucket.id },
				data: {
					requests: { increment: requestCost },
					tokens: tokenCost > 0 ? { increment: tokenCost } : undefined,
				},
			}),
			txAny.usageBucket.update({
				where: { id: monthBucket.id },
				data: {
					requests: { increment: requestCost },
					tokens: tokenCost > 0 ? { increment: tokenCost } : undefined,
				},
			}),
		]);

		const remaining: MeteringDecision['remaining'] = {
			requestsPerHour: unlimited(limits.requestsPerHour) ? -1 : Math.max(0, limits.requestsPerHour - (hourBucket.requests + requestCost)),
			tokensPerDay: unlimited(limits.tokensPerDay) ? -1 : Math.max(0, limits.tokensPerDay - (dayBucket.tokens + tokenCost)),
			tokensPerMonth: unlimited(limits.tokensPerMonth) ? -1 : Math.max(0, limits.tokensPerMonth - (monthBucket.tokens + tokenCost)),
		};

		return {
			allowed: true,
			remaining,
			resetAt: {
				hour: hourBucket.windowEnd,
				day: dayBucket.windowEnd,
				month: monthBucket.windowEnd,
			},
		};
	});
}
