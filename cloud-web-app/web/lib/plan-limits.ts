/**
 * Plan Limits Service - Enforcement de Limites por Plano
 *
 * Canonical plan definitions: `@/lib/plans.ts`
 * Dual-pool AI math: `@/lib/plan-ai-quotas.ts`
 */

import { prisma } from './db';
import { getModelTokenWeight, isUltraModel } from './ai/model-cost-weights';
import { getPlanById, PLANS, type PlanId } from './plans';
import { PREMIUM_TOKEN_WEIGHT, USAGE_WINDOW } from './plan-ai-quotas';
import { TokenLedger } from './server/financial-ledger';

// ============================================================================
// ENFORCEMENT LIMITS (derived from plans.ts)
// ============================================================================

export interface PlanLimits {
	tokensPerMonth: number;
	tokensFastPerMonth: number;
	tokensPremiumRawPerMonth: number;
	aiPoolMode: 'single_fast' | 'dual';
	requestsPerDay: number;
	cloudProjectsMax: number;
	storageGB: number;
	concurrentSessions: number;
	maxAgents: number;
	maxTokensPerRequest: number;
	models: string[];
	features: string[];
}

const ENFORCEMENT_FEATURES: Record<PlanId, string[]> = {
	free: ['editor', 'preview', 'chat', 'marketplace', 'extensions'],
	starter: ['editor', 'preview', 'chat', 'marketplace', 'extensions'],
	basic: ['editor', 'preview', 'chat', 'debugger', 'terminal', 'git', 'collaboration', 'agents', 'api', 'marketplace', 'extensions'],
	pro: ['editor', 'preview', 'chat', 'debugger', 'terminal', 'git', 'collaboration', 'agents', 'api', 'marketplace', 'extensions'],
	studio: ['editor', 'preview', 'chat', 'debugger', 'terminal', 'git', 'collaboration', 'agents', 'api', 'export', 'priority-support', 'webhooks', 'marketplace', 'extensions'],
	enterprise: ['*'],
};

const MAX_TOKENS_PER_REQUEST: Record<PlanId, number> = {
	free: 4_000,
	starter: 8_000,
	basic: 32_000,
	pro: 32_000,
	studio: 64_000,
	enterprise: 200_000,
};

const MAX_AGENTS: Record<PlanId, number> = {
	free: 3,
	starter: 3,
	basic: 3,
	pro: 3,
	studio: 10,
	enterprise: 10,
};

function mapPlanDefinitionToLimits(planId: PlanId): PlanLimits {
	const plan = getPlanById(planId);
	if (!plan) {
		return mapPlanDefinitionToLimits('free');
	}

	return {
		tokensPerMonth: plan.limits.tokensPerMonth,
		tokensFastPerMonth: plan.limits.tokensFastPerMonth,
		tokensPremiumRawPerMonth: plan.limits.tokensPremiumRawPerMonth,
		aiPoolMode: plan.limits.aiPoolMode,
		requestsPerDay: plan.limits.requestsPerDay,
		cloudProjectsMax: plan.limits.cloudProjectsMax,
		storageGB: plan.limits.storage / (1024 ** 3),
		concurrentSessions: plan.limits.concurrent,
		maxAgents: MAX_AGENTS[planId],
		maxTokensPerRequest: MAX_TOKENS_PER_REQUEST[planId],
		models: plan.allowedModels,
		features: ENFORCEMENT_FEATURES[planId],
	};
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
	...Object.fromEntries(PLANS.map((plan) => [plan.id, mapPlanDefinitionToLimits(plan.id)])),
	starter_trial: mapPlanDefinitionToLimits('free'),
};

// ============================================================================
// TIPOS DE VERIFICAÇÃO
// ============================================================================

export interface UsageStatus {
	allowed: boolean;
	reason?: string;
	usage: {
		tokensUsed: number;
		tokensLimit: number;
		tokensRemaining: number;
		percentUsed: number;
		tokensFastUsed: number;
		tokensFastLimit: number;
		tokensFastRemaining: number;
		tokensPremiumRawUsed: number;
		tokensPremiumRawLimit: number;
		tokensPremiumRawRemaining: number;
		requestsUsedToday: number;
		requestsDailyLimit: number;
		requestsDailyRemaining: number;
	};
	plan: string;
	limits: PlanLimits;
}

export interface QuotaCheckResult {
	allowed: boolean;
	reason?: string;
	code?:
		| 'QUOTA_EXCEEDED'
		| 'MODEL_NOT_ALLOWED'
		| 'FEATURE_NOT_ALLOWED'
		| 'RATE_LIMITED'
		| 'PREMIUM_POOL_EXHAUSTED'
		| 'ULTRA_REQUIRES_WALLET';
	fallbackToFast?: boolean;
}

const MODEL_ALIASES = buildModelAliases(
	PLANS.flatMap((plan) => plan.allowedModels).filter((model) => model !== 'all' && model !== 'custom-fine-tuned'),
);

function buildModelAliases(models: string[]): Record<string, string[]> {
	const map: Record<string, string[]> = {};
	for (const id of models) {
		const parts = id.split('/');
		if (parts.length === 2) {
			const [provider, name] = parts;
			map[id] = [name, `${provider}:${name}`, `openrouter:${id}`];
		} else {
			map[id] = [];
		}
	}

	if (map['anthropic/claude-3.5-haiku']) {
		map['anthropic/claude-3.5-haiku'].push('claude-3-5-haiku-20241022', 'claude-3.5-haiku');
	}
	if (map['anthropic/claude-3.7-sonnet']) {
		map['anthropic/claude-3.7-sonnet'].push('claude-3-7-sonnet-20250219', 'claude-3.7-sonnet');
	}
	if (map['openai/gpt-5.4']) map['openai/gpt-5.4'].push('gpt-5.4');
	if (map['openai/gpt-5']) map['openai/gpt-5'].push('gpt-5');
	if (map['openai/gpt-5.4-mini']) map['openai/gpt-5.4-mini'].push('gpt-5.4-mini');
	if (map['openai/gpt-5.4-nano']) map['openai/gpt-5.4-nano'].push('gpt-5.4-nano');
	if (map['openai/gpt-5-mini']) map['openai/gpt-5-mini'].push('gpt-5-mini');
	if (map['openai/gpt-5-nano']) map['openai/gpt-5-nano'].push('gpt-5-nano');

	return map;
}

function normalizeModelIdentifier(model: string): string {
	const raw = String(model || '').trim();
	if (!raw) return raw;
	const colonIndex = raw.indexOf(':');
	if (colonIndex > 0 && colonIndex < raw.length - 1) {
		const prefix = raw.slice(0, colonIndex).toLowerCase();
		if (prefix === 'openai' || prefix === 'openrouter' || prefix === 'anthropic' || prefix === 'google' || prefix === 'groq') {
			return raw.slice(colonIndex + 1);
		}
	}
	return raw;
}

function expandAllowedModels(models: readonly string[]): Set<string> {
	const expanded = new Set<string>();
	for (const model of models) {
		const normalized = normalizeModelIdentifier(model);
		expanded.add(normalized);
		const aliases = MODEL_ALIASES[normalized];
		if (aliases) {
			for (const alias of aliases) {
				expanded.add(normalizeModelIdentifier(alias));
			}
		}

		for (const [canonical, aliasList] of Object.entries(MODEL_ALIASES)) {
			const normalizedAliases = aliasList.map(normalizeModelIdentifier);
			if (normalizedAliases.includes(normalized)) {
				expanded.add(canonical);
				for (const alias of normalizedAliases) {
					expanded.add(alias);
				}
			}
		}
	}
	return expanded;
}

function getUtcDayWindow(now: Date = new Date()): { start: Date; end: Date } {
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();
	const day = now.getUTCDate();
	const start = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
	return { start, end };
}

function getUtcMonthWindow(now: Date = new Date()): { start: Date; end: Date } {
	const year = now.getUTCFullYear();
	const month = now.getUTCMonth();
	const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
	const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
	return { start, end };
}

function unlimited(limit: number): boolean {
	return limit === -1;
}

function applyWeightedEstimate(rawTokens: number, modelId?: string): number {
	if (!modelId) return rawTokens;
	return Math.ceil(rawTokens * getModelTokenWeight(modelId));
}

function isPremiumWeight(modelId?: string): boolean {
	if (!modelId) return false;
	const weight = getModelTokenWeight(modelId);
	return weight >= PREMIUM_TOKEN_WEIGHT && weight < 200;
}

// ============================================================================
// FUNÇÕES DE VERIFICAÇÃO
// ============================================================================

export function getPlanLimits(plan: string): PlanLimits {
	const basePlan = plan.replace('_trial', '');
	return PLAN_LIMITS[plan] || PLAN_LIMITS[basePlan] || PLAN_LIMITS['free'];
}

export async function getCurrentUsage(userId: string): Promise<{
	tokensUsed: number;
	tokensFastUsed: number;
	tokensPremiumRawUsed: number;
	requestsUsed: number;
	storageUsedMB: number;
}> {
	const { start: monthStart } = getUtcMonthWindow();

	const buckets = await prisma.usageBucket.findMany({
		where: {
			userId,
			windowStart: { gte: monthStart },
			window: { in: [USAGE_WINDOW.monthWeighted, USAGE_WINDOW.monthFast, USAGE_WINDOW.monthPremiumRaw] },
		},
	});

	let tokensUsed = 0;
	let tokensFastUsed = 0;
	let tokensPremiumRawUsed = 0;

	for (const bucket of buckets) {
		if (bucket.window === USAGE_WINDOW.monthWeighted) tokensUsed = bucket.tokens;
		if (bucket.window === USAGE_WINDOW.monthFast) tokensFastUsed = bucket.tokens;
		if (bucket.window === USAGE_WINDOW.monthPremiumRaw) tokensPremiumRawUsed = bucket.tokens;
	}

	if (tokensUsed === 0 && (tokensFastUsed > 0 || tokensPremiumRawUsed > 0)) {
		tokensUsed = tokensFastUsed + tokensPremiumRawUsed * PREMIUM_TOKEN_WEIGHT;
	}

	return {
		tokensUsed,
		tokensFastUsed,
		tokensPremiumRawUsed,
		requestsUsed: 0,
		storageUsedMB: 0,
	};
}

async function getDailyRequestCount(userId: string): Promise<number> {
	const { start: dayStart } = getUtcDayWindow();

	const bucket = await prisma.usageBucket.findFirst({
		where: {
			userId,
			window: 'day',
			windowStart: dayStart,
		},
		select: { requests: true },
	});

	return bucket?.requests || 0;
}

function checkPoolQuota(
	limits: PlanLimits,
	usage: { tokensFastUsed: number; tokensPremiumRawUsed: number; tokensUsed: number },
	estimatedRawTokens: number,
	modelId?: string,
): QuotaCheckResult {
	const pendingNote = ' Upgrade or connect BYOK to continue premium AI.';
	const weight = modelId ? getModelTokenWeight(modelId) : 1;

	if (modelId && isUltraModel(modelId)) {
		return {
			allowed: false,
			reason: `Ultra models require Credit Wallet or BYOK.${pendingNote}`,
			code: 'ULTRA_REQUIRES_WALLET',
		};
	}

	if (unlimited(limits.tokensPerMonth)) {
		return { allowed: true };
	}

	const pendingTokens = 0;
	const weightedEstimate = applyWeightedEstimate(estimatedRawTokens, modelId);

	if (isPremiumWeight(modelId) && limits.aiPoolMode === 'dual' && limits.tokensPremiumRawPerMonth > 0) {
		const premiumAfter = usage.tokensPremiumRawUsed + pendingTokens + estimatedRawTokens;
		if (premiumAfter > limits.tokensPremiumRawPerMonth) {
			const fastRemaining = Math.max(0, limits.tokensFastPerMonth - usage.tokensFastUsed);
			if (fastRemaining > 0) {
				return {
					allowed: true,
					reason: 'Premium AI quota exhausted — routing to Fast AI models.',
					code: 'PREMIUM_POOL_EXHAUSTED',
					fallbackToFast: true,
				};
			}
			return {
				allowed: false,
				reason: `Premium and Fast AI quotas exhausted for this month.${pendingNote}`,
				code: 'QUOTA_EXCEEDED',
			};
		}
		return { allowed: true };
	}

	const fastAfter = usage.tokensFastUsed + pendingTokens + (weight <= 1 ? estimatedRawTokens : 0);
	if (weight <= 1 && fastAfter > limits.tokensFastPerMonth) {
		if (
			limits.aiPoolMode === 'dual' &&
			limits.tokensPremiumRawPerMonth > 0 &&
			usage.tokensPremiumRawUsed < limits.tokensPremiumRawPerMonth
		) {
			return {
				allowed: false,
				reason: `Fast AI quota exhausted. Switch to a Premium model or upgrade.${pendingNote}`,
				code: 'QUOTA_EXCEEDED',
			};
		}
		return {
			allowed: false,
			reason: `Fast AI quota of ${limits.tokensFastPerMonth.toLocaleString()} tokens exhausted.${pendingNote}`,
			code: 'QUOTA_EXCEEDED',
		};
	}

	const totalAfter = usage.tokensUsed + pendingTokens + weightedEstimate;
	if (totalAfter > limits.tokensPerMonth) {
		return {
			allowed: false,
			reason: `Monthly AI quota exhausted.${pendingNote}`,
			code: 'QUOTA_EXCEEDED',
		};
	}

	return { allowed: true };
}

export async function checkAIQuota(
	userId: string,
	estimatedTokens: number = 1000,
	modelId?: string,
): Promise<QuotaCheckResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { plan: true },
	});

	if (!user) {
		return { allowed: false, reason: 'User not found', code: 'QUOTA_EXCEEDED' };
	}

	const limits = getPlanLimits(user.plan);
	const usage = await getCurrentUsage(userId);
	const pendingTokens = TokenLedger.getPendingTokens(userId);
	const usageWithPending = {
		...usage,
		tokensUsed: usage.tokensUsed + pendingTokens,
		tokensFastUsed: usage.tokensFastUsed + (modelId && getModelTokenWeight(modelId) <= 1 ? pendingTokens : 0),
		tokensPremiumRawUsed:
			usage.tokensPremiumRawUsed + (modelId && isPremiumWeight(modelId) ? Math.ceil(pendingTokens / PREMIUM_TOKEN_WEIGHT) : 0),
	};

	const poolCheck = checkPoolQuota(limits, usageWithPending, estimatedTokens, modelId);
	if (!poolCheck.allowed) {
		return poolCheck;
	}

	const dailyRequests = await getDailyRequestCount(userId);
	const pendingRequests = TokenLedger.getPendingRequests(userId);
	if (!unlimited(limits.requestsPerDay) && dailyRequests + pendingRequests >= limits.requestsPerDay) {
		return {
			allowed: false,
			reason: `Daily request limit of ${limits.requestsPerDay} reached. Try again tomorrow or upgrade.`,
			code: 'RATE_LIMITED',
		};
	}

	return poolCheck;
}

export async function checkModelAccess(userId: string, model: string): Promise<QuotaCheckResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { plan: true },
	});

	if (!user) {
		return { allowed: false, reason: 'User not found' };
	}

	const limits = getPlanLimits(user.plan);
	const normalizedModel = normalizeModelIdentifier(model);
	const allowedModels = expandAllowedModels(limits.models);

	if (limits.models.includes('*') || allowedModels.has(normalizedModel)) {
		if (isUltraModel(normalizedModel)) {
			return {
				allowed: false,
				reason: 'Ultra models require Credit Wallet or BYOK on your plan.',
				code: 'ULTRA_REQUIRES_WALLET',
			};
		}
		return { allowed: true };
	}

	return {
		allowed: false,
		reason: `Model ${normalizedModel} is not included in your plan.`,
		code: 'MODEL_NOT_ALLOWED',
	};
}

export async function checkFeatureAccess(userId: string, feature: string): Promise<QuotaCheckResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { plan: true },
	});

	if (!user) {
		return { allowed: false, reason: 'User not found' };
	}

	const limits = getPlanLimits(user.plan);

	if (limits.features.includes('*') || limits.features.includes(feature)) {
		return { allowed: true };
	}

	return {
		allowed: false,
		reason: `Feature "${feature}" is not available on your plan.`,
		code: 'FEATURE_NOT_ALLOWED',
	};
}

export async function getUsageStatus(userId: string): Promise<UsageStatus> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { plan: true },
	});

	if (!user) {
		throw new Error('User not found');
	}

	const limits = getPlanLimits(user.plan);
	const usage = await getCurrentUsage(userId);
	const requestsUsedToday = await getDailyRequestCount(userId);

	const tokensRemaining = unlimited(limits.tokensPerMonth)
		? -1
		: Math.max(0, limits.tokensPerMonth - usage.tokensUsed);
	const percentUsed = unlimited(limits.tokensPerMonth)
		? 0
		: (usage.tokensUsed / limits.tokensPerMonth) * 100;
	const requestsDailyRemaining = unlimited(limits.requestsPerDay)
		? -1
		: Math.max(0, limits.requestsPerDay - requestsUsedToday);

	const tokensFastRemaining = unlimited(limits.tokensFastPerMonth)
		? -1
		: Math.max(0, limits.tokensFastPerMonth - usage.tokensFastUsed);
	const tokensPremiumRawRemaining = unlimited(limits.tokensPremiumRawPerMonth)
		? -1
		: Math.max(0, limits.tokensPremiumRawPerMonth - usage.tokensPremiumRawUsed);

	return {
		allowed:
			(unlimited(limits.tokensPerMonth) || percentUsed < 100) &&
			(unlimited(limits.requestsPerDay) || requestsUsedToday < limits.requestsPerDay),
		reason:
			percentUsed >= 100
				? 'Monthly AI quota reached'
				: requestsUsedToday >= limits.requestsPerDay
					? 'Daily request limit reached'
					: undefined,
		usage: {
			tokensUsed: usage.tokensUsed,
			tokensLimit: limits.tokensPerMonth,
			tokensRemaining,
			percentUsed: Math.round(percentUsed * 10) / 10,
			tokensFastUsed: usage.tokensFastUsed,
			tokensFastLimit: limits.tokensFastPerMonth,
			tokensFastRemaining,
			tokensPremiumRawUsed: usage.tokensPremiumRawUsed,
			tokensPremiumRawLimit: limits.tokensPremiumRawPerMonth,
			tokensPremiumRawRemaining,
			requestsUsedToday,
			requestsDailyLimit: limits.requestsPerDay,
			requestsDailyRemaining,
		},
		plan: user.plan,
		limits,
	};
}

export async function recordTokenUsage(userId: string, tokensUsed: number): Promise<void> {
	TokenLedger.addUsage(userId, tokensUsed);
}
