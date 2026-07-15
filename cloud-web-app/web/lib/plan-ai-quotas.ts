/**
 * Dual-pool AI quotas — canonical math shared by plans, metering, and billing UI.
 * Premium raw tokens debit at 40× against the total weighted budget (billing_security_analysis §5).
 */

export const PREMIUM_TOKEN_WEIGHT = 40;

export type AiPoolMode = 'single_fast' | 'dual';

export type AiQuotaPools = {
	/** Total weighted budget (backward compat + audit). */
	tokensPerMonth: number;
	tokensFastPerMonth: number;
	tokensPremiumRawPerMonth: number;
	aiPoolMode: AiPoolMode;
};

export const AI_QUOTA_PRESETS = {
	free: { tokensFastPerMonth: 200_000, tokensPremiumRawPerMonth: 0, aiPoolMode: 'single_fast' as const },
	starter: { tokensFastPerMonth: 1_000_000, tokensPremiumRawPerMonth: 0, aiPoolMode: 'single_fast' as const },
	proDual: { tokensFastPerMonth: 3_000_000, tokensPremiumRawPerMonth: 37_500, aiPoolMode: 'dual' as const },
	studioDual: { tokensFastPerMonth: 12_000_000, tokensPremiumRawPerMonth: 150_000, aiPoolMode: 'dual' as const },
	enterpriseDual: { tokensFastPerMonth: 70_000_000, tokensPremiumRawPerMonth: 750_000, aiPoolMode: 'dual' as const },
} as const;

export function computeWeightedTokenBudget(
	pools: Pick<AiQuotaPools, 'tokensFastPerMonth' | 'tokensPremiumRawPerMonth'>,
): number {
	return pools.tokensFastPerMonth + pools.tokensPremiumRawPerMonth * PREMIUM_TOKEN_WEIGHT;
}

export function buildAiQuotaPools(
	preset: Pick<AiQuotaPools, 'tokensFastPerMonth' | 'tokensPremiumRawPerMonth' | 'aiPoolMode'>,
): AiQuotaPools {
	return {
		...preset,
		tokensPerMonth: computeWeightedTokenBudget(preset),
	};
}

export function formatAiQuotaLabel(pools: Pick<AiQuotaPools, 'tokensFastPerMonth' | 'tokensPremiumRawPerMonth' | 'aiPoolMode'>): string {
	if (pools.aiPoolMode === 'dual' && pools.tokensPremiumRawPerMonth > 0) {
		return `${formatTokenCount(pools.tokensFastPerMonth)} Fast + ${formatTokenCount(pools.tokensPremiumRawPerMonth)} Premium AI tokens/mo`;
	}
	return `${formatTokenCount(pools.tokensFastPerMonth)} Fast AI tokens/mo`;
}

function formatTokenCount(value: number): string {
	if (value >= 1_000_000) return `${value / 1_000_000}M`;
	if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
	return String(value);
}

/** UsageBucket window keys for dual-pool metering (no Prisma migration). */
export const USAGE_WINDOW = {
	monthWeighted: 'month',
	monthFast: 'month_fast',
	monthPremiumRaw: 'month_premium_raw',
} as const;
