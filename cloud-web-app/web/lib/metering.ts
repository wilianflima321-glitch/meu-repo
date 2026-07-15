import { prisma } from './db';
import { type PlanLimits } from './plans';
import { applyTokenWeight, getModelTokenWeight } from './ai/model-cost-weights';
import { PREMIUM_TOKEN_WEIGHT, USAGE_WINDOW } from './plan-ai-quotas';
import {
  bufferMeterDelta,
  flushMeteringBufferForUser,
  maybeAutoFlushUser,
  readProjectedMeterWindow,
  rollbackMeterDelta,
  type MeterBufferDelta,
} from './metering-redis-buffer';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('metering');

/** 6H.8 — fire-and-forget pool 80% emails; never block metering. */
function scheduleBillingThresholdEmails(userId: string): void {
	void import('@/lib/billing/billing-threshold-emails')
		.then(({ maybeSendBillingThresholdEmails }) => maybeSendBillingThresholdEmails(userId))
		.catch((error) => {
			log.warn('billing_threshold_email_schedule_failed', {
				userId,
				error: error instanceof Error ? error.message : String(error),
			})
		})
}

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
	await (prisma as any).concurrencyLease.delete({ where: { id: leaseId } }).catch(() => { });
}

function rateLimited(
	message: string,
	limitType: RateLimitedError['limitType'],
	resetAt: Date,
	now: Date,
): RateLimitedError {
	const retryAfterSeconds = Math.max(1, Math.ceil((resetAt.getTime() - now.getTime()) / 1000));
	return Object.assign(new Error(message), {
		code: 'RATE_LIMITED' as const,
		limitType,
		retryAfterSeconds,
		resetAt: resetAt.toISOString(),
	});
}

async function upsertPostgresBuckets(params: {
	userId: string;
	requestCost: number;
	rawTokenCost: number;
	weightedTokenCost: number;
	isFastDebit: boolean;
	isPremiumDebit: boolean;
	hourStart: Date;
	hourEnd: Date;
	dayStart: Date;
	dayEnd: Date;
	monthStart: Date;
	monthEnd: Date;
}) {
	const {
		userId,
		requestCost,
		rawTokenCost,
		weightedTokenCost,
		isFastDebit,
		isPremiumDebit,
		hourStart,
		hourEnd,
		dayStart,
		dayEnd,
		monthStart,
		monthEnd,
	} = params;

	return Promise.all([
		prisma.usageBucket.upsert({
			where: { userId_window_windowStart: { userId, window: 'hour', windowStart: hourStart } },
			update: { requests: { increment: requestCost } },
			create: {
				userId,
				window: 'hour',
				windowStart: hourStart,
				windowEnd: hourEnd,
				requests: requestCost,
			},
		}),
		prisma.usageBucket.upsert({
			where: { userId_window_windowStart: { userId, window: 'day', windowStart: dayStart } },
			update: {
				requests: { increment: requestCost },
				tokens: weightedTokenCost > 0 ? { increment: weightedTokenCost } : undefined,
			},
			create: {
				userId,
				window: 'day',
				windowStart: dayStart,
				windowEnd: dayEnd,
				requests: requestCost,
				tokens: weightedTokenCost,
			},
		}),
		prisma.usageBucket.upsert({
			where: {
				userId_window_windowStart: {
					userId,
					window: USAGE_WINDOW.monthWeighted,
					windowStart: monthStart,
				},
			},
			update: {
				requests: { increment: requestCost },
				tokens: weightedTokenCost > 0 ? { increment: weightedTokenCost } : undefined,
			},
			create: {
				userId,
				window: USAGE_WINDOW.monthWeighted,
				windowStart: monthStart,
				windowEnd: monthEnd,
				requests: requestCost,
				tokens: weightedTokenCost,
			},
		}),
		isFastDebit && rawTokenCost > 0
			? prisma.usageBucket.upsert({
					where: {
						userId_window_windowStart: {
							userId,
							window: USAGE_WINDOW.monthFast,
							windowStart: monthStart,
						},
					},
					update: { tokens: { increment: rawTokenCost } },
					create: {
						userId,
						window: USAGE_WINDOW.monthFast,
						windowStart: monthStart,
						windowEnd: monthEnd,
						tokens: rawTokenCost,
					},
				})
			: Promise.resolve(null),
		isPremiumDebit && rawTokenCost > 0
			? prisma.usageBucket.upsert({
					where: {
						userId_window_windowStart: {
							userId,
							window: USAGE_WINDOW.monthPremiumRaw,
							windowStart: monthStart,
						},
					},
					update: { tokens: { increment: rawTokenCost } },
					create: {
						userId,
						window: USAGE_WINDOW.monthPremiumRaw,
						windowStart: monthStart,
						windowEnd: monthEnd,
						tokens: rawTokenCost,
					},
				})
			: Promise.resolve(null),
	]);
}

function assertLimits(params: {
	limits: PlanLimits;
	now: Date;
	dayRequests: number;
	dayTokens: number;
	dayEnd: Date;
	monthTokens: number;
	monthEnd: Date;
	monthFastTokens: number;
	monthPremiumTokens: number;
	isFastDebit: boolean;
	isPremiumDebit: boolean;
	rawTokenCost: number;
	weightedTokenCost: number;
}): void {
	const {
		limits,
		now,
		dayRequests,
		dayTokens,
		dayEnd,
		monthTokens,
		monthEnd,
		monthFastTokens,
		monthPremiumTokens,
		isFastDebit,
		isPremiumDebit,
		rawTokenCost,
		weightedTokenCost,
	} = params;

	if (limits.requestsPerDay && !unlimited(limits.requestsPerDay) && dayRequests > limits.requestsPerDay) {
		throw rateLimited('RATE_LIMITED: limite diário de requisições atingido.', 'requestsPerHour', dayEnd, now);
	}

	if (weightedTokenCost > 0 && !unlimited(limits.tokensPerDay) && dayTokens > limits.tokensPerDay) {
		throw rateLimited('RATE_LIMITED: cota diária de tokens atingida.', 'tokensPerDay', dayEnd, now);
	}

	if (
		isFastDebit &&
		rawTokenCost > 0 &&
		!unlimited(limits.tokensFastPerMonth) &&
		monthFastTokens > limits.tokensFastPerMonth
	) {
		throw rateLimited('RATE_LIMITED: Fast AI monthly quota reached.', 'tokensPerMonth', monthEnd, now);
	}

	if (
		isPremiumDebit &&
		rawTokenCost > 0 &&
		!unlimited(limits.tokensPremiumRawPerMonth) &&
		monthPremiumTokens > limits.tokensPremiumRawPerMonth
	) {
		throw rateLimited(
			'RATE_LIMITED: Premium AI monthly quota reached. Fast AI fallback may still be available.',
			'tokensPerMonth',
			monthEnd,
			now,
		);
	}

	if (weightedTokenCost > 0 && !unlimited(limits.tokensPerMonth) && monthTokens > limits.tokensPerMonth) {
		throw rateLimited(
			'RATE_LIMITED: cota mensal de tokens atingida. Faça upgrade do plano para continuar.',
			'tokensPerMonth',
			monthEnd,
			now,
		);
	}
}

/**
 * Block 6G.1 — prefer Redis buffer; Postgres fallback when Redis path fails.
 */
export async function consumeMeteredUsage(params: {
	userId: string;
	limits: PlanLimits;
	cost: MeteringCost;
	modelId?: string;
	/** Block 6E — header-derived only; never infer from User.byokKey */
	byok?: boolean;
}): Promise<MeteringDecision> {
	const { userId, limits, modelId } = params;
	const requestCost = clampInt(params.cost.requests ?? 1, 1);
	const rawTokenCost = clampInt(params.cost.tokens ?? 0, 0);
	let weightedTokenCost = rawTokenCost;

	if (modelId) {
		weightedTokenCost = applyTokenWeight(rawTokenCost, modelId);
	}

	const modelWeight = modelId ? getModelTokenWeight(modelId) : 1;
	const isPremiumDebit = modelWeight >= PREMIUM_TOKEN_WEIGHT && modelWeight < 200;
	const isFastDebit = modelWeight <= 1;

	const now = new Date();
	const hourStart = utcWindowStart(now, 'hour');
	const dayStart = utcWindowStart(now, 'day');
	const monthStart = utcWindowStart(now, 'month');
	const hourEnd = utcWindowEnd(hourStart, 'hour');
	const dayEnd = utcWindowEnd(dayStart, 'day');
	const monthEnd = utcWindowEnd(monthStart, 'month');

	if (params.byok) {
		return {
			allowed: true,
			remaining: { requestsPerHour: -1, tokensPerDay: -1, tokensPerMonth: -1 },
			resetAt: { hour: hourEnd, day: dayEnd, month: monthEnd },
		};
	}

	const deltas: MeterBufferDelta[] = [
		{
			userId,
			window: 'hour',
			windowStart: hourStart,
			windowEnd: hourEnd,
			requests: requestCost,
			tokens: 0,
		},
		{
			userId,
			window: 'day',
			windowStart: dayStart,
			windowEnd: dayEnd,
			requests: requestCost,
			tokens: weightedTokenCost,
		},
		{
			userId,
			window: USAGE_WINDOW.monthWeighted,
			windowStart: monthStart,
			windowEnd: monthEnd,
			requests: requestCost,
			tokens: weightedTokenCost,
		},
	];

	if (isFastDebit && rawTokenCost > 0) {
		deltas.push({
			userId,
			window: USAGE_WINDOW.monthFast,
			windowStart: monthStart,
			windowEnd: monthEnd,
			requests: 0,
			tokens: rawTokenCost,
		});
	}
	if (isPremiumDebit && rawTokenCost > 0) {
		deltas.push({
			userId,
			window: USAGE_WINDOW.monthPremiumRaw,
			windowStart: monthStart,
			windowEnd: monthEnd,
			requests: 0,
			tokens: rawTokenCost,
		});
	}

	const bufferResults = await Promise.all(deltas.map((d) => bufferMeterDelta(d)));
	const redisOk = bufferResults.every((r) => r.ok);

	if (!redisOk) {
		log.info('metering.redis_unavailable_postgres_path', { userId });
		for (let i = 0; i < deltas.length; i++) {
			if (bufferResults[i]?.ok) {
				await rollbackMeterDelta(deltas[i]);
			}
		}

		const [hourBucket, dayBucket, monthBucket, monthFastBucket, monthPremiumBucket] =
			await upsertPostgresBuckets({
				userId,
				requestCost,
				rawTokenCost,
				weightedTokenCost,
				isFastDebit,
				isPremiumDebit,
				hourStart,
				hourEnd,
				dayStart,
				dayEnd,
				monthStart,
				monthEnd,
			});

		assertLimits({
			limits,
			now,
			dayRequests: dayBucket.requests,
			dayTokens: dayBucket.tokens,
			dayEnd: dayBucket.windowEnd,
			monthTokens: monthBucket.tokens,
			monthEnd: monthBucket.windowEnd,
			monthFastTokens: monthFastBucket?.tokens ?? 0,
			monthPremiumTokens: monthPremiumBucket?.tokens ?? 0,
			isFastDebit,
			isPremiumDebit,
			rawTokenCost,
			weightedTokenCost,
		});

		scheduleBillingThresholdEmails(userId);

		return {
			allowed: true,
			remaining: {
				requestsPerHour:
					limits.requestsPerDay && unlimited(limits.requestsPerDay)
						? -1
						: Math.max(0, (limits.requestsPerDay ?? 999999) - dayBucket.requests),
				tokensPerDay: unlimited(limits.tokensPerDay) ? -1 : Math.max(0, limits.tokensPerDay - dayBucket.tokens),
				tokensPerMonth: unlimited(limits.tokensPerMonth)
					? -1
					: Math.max(0, limits.tokensPerMonth - monthBucket.tokens),
			},
			resetAt: {
				hour: hourBucket.windowEnd,
				day: dayBucket.windowEnd,
				month: monthBucket.windowEnd,
			},
		};
	}

	const [dayProjected, monthProjected, monthFastProjected, monthPremiumProjected] = await Promise.all([
		readProjectedMeterWindow({ userId, window: 'day', windowStart: dayStart }),
		readProjectedMeterWindow({
			userId,
			window: USAGE_WINDOW.monthWeighted,
			windowStart: monthStart,
		}),
		isFastDebit && rawTokenCost > 0
			? readProjectedMeterWindow({
					userId,
					window: USAGE_WINDOW.monthFast,
					windowStart: monthStart,
				})
			: Promise.resolve({ requests: 0, tokens: 0, windowEnd: null }),
		isPremiumDebit && rawTokenCost > 0
			? readProjectedMeterWindow({
					userId,
					window: USAGE_WINDOW.monthPremiumRaw,
					windowStart: monthStart,
				})
			: Promise.resolve({ requests: 0, tokens: 0, windowEnd: null }),
	]);

	try {
		assertLimits({
			limits,
			now,
			dayRequests: dayProjected.requests,
			dayTokens: dayProjected.tokens,
			dayEnd,
			monthTokens: monthProjected.tokens,
			monthEnd,
			monthFastTokens: monthFastProjected.tokens,
			monthPremiumTokens: monthPremiumProjected.tokens,
			isFastDebit,
			isPremiumDebit,
			rawTokenCost,
			weightedTokenCost,
		});
	} catch (error) {
		await Promise.all(deltas.map((d) => rollbackMeterDelta(d)));
		throw error;
	}

	const monthBuf = bufferResults[2];
	if (monthBuf && monthBuf.ok) {
		await maybeAutoFlushUser(userId, monthBuf.pendingTokens);
	}

	scheduleBillingThresholdEmails(userId);

	return {
		allowed: true,
		remaining: {
			requestsPerHour:
				limits.requestsPerDay && unlimited(limits.requestsPerDay)
					? -1
					: Math.max(0, (limits.requestsPerDay ?? 999999) - dayProjected.requests),
			tokensPerDay: unlimited(limits.tokensPerDay)
				? -1
				: Math.max(0, limits.tokensPerDay - dayProjected.tokens),
			tokensPerMonth: unlimited(limits.tokensPerMonth)
				? -1
				: Math.max(0, limits.tokensPerMonth - monthProjected.tokens),
		},
		resetAt: {
			hour: hourEnd,
			day: dayEnd,
			month: monthEnd,
		},
	};
}

/** Cron / admin — flush buffered metering for a user into Postgres. */
export async function flushUserMeteringBuffer(userId: string): Promise<number> {
	return flushMeteringBufferForUser(userId);
}

export function weightedTokensFromUsage(rawTokens: number, modelId: string): number {
	return applyTokenWeight(rawTokens, modelId);
}
