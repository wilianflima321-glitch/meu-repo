import {
	OPENROUTER_BEST_MODELS,
	OPENROUTER_BUDGET_MODELS,
	OPENROUTER_FREE_MODELS,
} from './ai/openrouter-models';
import {
	AI_QUOTA_PRESETS,
	buildAiQuotaPools,
	formatAiQuotaLabel,
	type AiPoolMode,
} from './plan-ai-quotas';

export type PlanId = 'free' | 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';
export type PaidPlanId = Exclude<PlanId, 'free'>;

export type PlanLimits = {
	cloudProjectsMax: number; // -1 = unlimited
	storage: number; // bytes — cloud sync only; local Tauri disk is unlimited (extras.localProjectsUnlimited)
	collaborators: number; // -1 = unlimited
	/** Total weighted AI budget (sum of pools). */
	tokensPerMonth: number;
	tokensFastPerMonth: number;
	tokensPremiumRawPerMonth: number;
	aiPoolMode: AiPoolMode;
	tokensPerDay: number;
	requestsPerDay: number;
	concurrent: number;
	contextWindow: number;
	historyDays: number;
	chatHistoryCopyMaxMessages: number; // -1 = unlimited (subject to server hard-cap)
};

export type PlanDefinition = {
	id: PlanId;
	name: string;
	price: number;
	priceAnnual?: number;
	priceBRL: number;
	priceAnnualBRL?: number;
	currency: 'USD';
	interval: 'month';
	popular?: boolean;
	description: string;
	features: string[];
	limits: PlanLimits;
	allowedModels: string[];
	allowedDomains: string[];
	allowedAgents: string[];
	extras?: Record<string, unknown>;
};

const FREE_MODEL_IDS = OPENROUTER_FREE_MODELS.map((model) => model.id);
const BUDGET_MODEL_IDS = [...FREE_MODEL_IDS, ...OPENROUTER_BUDGET_MODELS.map((model) => model.id)];
const BEST_MODEL_IDS = OPENROUTER_BEST_MODELS.map((model) => model.id);

const STARTER_ALLOWED_MODELS = Array.from(
	new Set([
		...FREE_MODEL_IDS,
		'google/gemini-2.5-flash-lite',
		'google/gemini-3.1-flash-lite-preview',
		'openai/gpt-5-nano',
		'openai/gpt-5.4-nano',
		'openai/gpt-4.1-nano',
		'anthropic/claude-3.5-haiku',
		'openai/gpt-5-mini',
		'openai/gpt-5.4-mini',
		'openai/gpt-4.1-mini',
		'google/gemini-2.5-flash',
	]),
);

const PRO_BEST_MODEL_IDS = [
	'anthropic/claude-sonnet-4.6',
	'anthropic/claude-sonnet-4.5',
	'anthropic/claude-3.7-sonnet',
	'openai/gpt-5',
	'openai/gpt-5.4',
	'openai/gpt-5-codex',
	'openai/o3',
	'google/gemini-2.5-pro',
	'openai/gpt-4.1',
];

const PRO_ALLOWED_MODELS = Array.from(new Set([...BUDGET_MODEL_IDS, ...PRO_BEST_MODEL_IDS]));
const STUDIO_ALLOWED_MODELS = Array.from(
	new Set([...BUDGET_MODEL_IDS, ...BEST_MODEL_IDS.filter((model) => model !== 'openai/gpt-5.4-pro')]),
);

const FREE_AI = buildAiQuotaPools(AI_QUOTA_PRESETS.free);
const STARTER_AI = buildAiQuotaPools(AI_QUOTA_PRESETS.starter);
const PRO_AI = buildAiQuotaPools(AI_QUOTA_PRESETS.proDual);
const STUDIO_AI = buildAiQuotaPools(AI_QUOTA_PRESETS.studioDual);
const ENTERPRISE_AI = buildAiQuotaPools(AI_QUOTA_PRESETS.enterpriseDual);

export const PLANS: PlanDefinition[] = [
	{
		id: 'free',
		name: 'Free',
		price: 0,
		priceAnnual: 0,
		priceBRL: 0,
		priceAnnualBRL: 0,
		currency: 'USD',
		interval: 'month',
		description: 'Test the real Studio flow without a card. Unlimited local projects; cloud sync with clear guardrails.',
		features: [
			formatAiQuotaLabel(FREE_AI),
			'1 cloud-synced project + unlimited local (Tauri)',
			'250 MB cloud storage (local disk unlimited)',
			'1 concurrent session',
			'Full IDE: chat, editor, preview, all standard agents',
			'Free OpenRouter models + optional BYOK at $0',
			'Local offline playtest',
			'Platform image/3D/video/music: Starter+ (debited from AI pool)',
			'Upgrade for deploy, collab write seats & premium AI',
		],
		limits: {
			cloudProjectsMax: 1,
			storage: 250 * 1024 * 1024,
			collaborators: 0,
			...FREE_AI,
			tokensPerDay: 5_000,
			requestsPerDay: 50,
			concurrent: 1,
			contextWindow: 4000,
			historyDays: 7,
			chatHistoryCopyMaxMessages: 500,
		},
		allowedModels: FREE_MODEL_IDS,
		allowedDomains: ['code', 'game', 'research'],
		allowedAgents: ['all-standard'],
		extras: {
			creativeDomain: false,
			creativeGenerative: 'blocked',
			llmFusion: true,
			cardRequired: false,
			localProjectsUnlimited: true,
			cloudSyncedProjects: 1,
			activeDeploys: 0,
			byokEnabled: true,
			byokAddonUsd: 0,
			realtimeCollabSeats: 0,
			upgradeRequiredFor: ['deploy', 'collaboration'],
			standardAgentsUnlocked: true,
			workspaceProfiles: ['code', 'game', 'research'],
			marketplaceInstall: true,
			yjsSpectatorAllowed: true,
			yjsWriteSeats: 0,
			premiumAutoFallback: false,
			storageScope: 'cloud_only',
		},
	},
	{
		id: 'starter',
		name: 'Starter',
		price: 9,
		priceAnnual: 90,
		priceBRL: 47,
		priceAnnualBRL: 470,
		currency: 'USD',
		interval: 'month',
		description: 'Indie entry: cloud sync, deploy playtests, and budget AI models.',
		features: [
			formatAiQuotaLabel(STARTER_AI),
			'3 cloud-synced projects + unlimited local',
			'2 GB cloud storage',
			'8 GB/mo deploy CDN',
			'P2P multiplayer playtest',
			'Budget & fast models only (no premium pool)',
			'All standard agents + workspace profiles',
			'BYOK optional ($5/mo platform addon)',
			'Creative APIs: image, 3D, music, voice (metered)',
			'Community support',
		],
		limits: {
			cloudProjectsMax: 3,
			storage: 2 * 1024 * 1024 * 1024,
			collaborators: 0,
			...STARTER_AI,
			tokensPerDay: 50_000,
			requestsPerDay: 720,
			concurrent: 1,
			contextWindow: 8000,
			historyDays: 14,
			chatHistoryCopyMaxMessages: 2000,
		},
		allowedModels: STARTER_ALLOWED_MODELS,
		allowedDomains: ['code', 'game', 'research', 'creative'],
		allowedAgents: ['all-standard'],
		extras: {
			creativeDomain: true,
			creativeGenerative: 'metered',
			llmFusion: true,
			localProjectsUnlimited: true,
			cloudSyncedProjects: 3,
			activeDeploys: 1,
			cdnEgressGB: 8,
			byokEnabled: true,
			byokAddonUsd: 5,
			realtimeCollabSeats: 0,
			standardAgentsUnlocked: true,
			workspaceProfiles: ['code', 'game', 'research'],
			marketplaceInstall: true,
			yjsSpectatorAllowed: true,
			yjsWriteSeats: 0,
			premiumAutoFallback: false,
			storageScope: 'cloud_only',
		},
	},
	{
		id: 'basic',
		name: 'Basic (Legacy)',
		price: 29,
		priceAnnual: 278.4,
		priceBRL: 145,
		priceAnnualBRL: 1392,
		currency: 'USD',
		interval: 'month',
		description: 'Legacy tier — grandfathered subscribers receive full Pro+IA rights. New signups blocked.',
		features: [
			formatAiQuotaLabel(PRO_AI),
			'Unlimited cloud + local projects',
			'14 GB cloud storage',
			'2 collaborator write seats',
			'Dual AI pools with premium auto-fallback',
			'BYOK optional',
			'All standard agents',
		],
		limits: {
			cloudProjectsMax: -1,
			storage: 14 * 1024 * 1024 * 1024,
			collaborators: 2,
			...PRO_AI,
			tokensPerDay: 250_000,
			requestsPerDay: 2880,
			concurrent: 5,
			contextWindow: 32000,
			historyDays: 90,
			chatHistoryCopyMaxMessages: 20000,
		},
		allowedModels: PRO_ALLOWED_MODELS,
		allowedDomains: ['code', 'game', 'research', 'trading', 'creative'],
		allowedAgents: ['all-standard'],
		extras: {
			creativeDomain: true,
			creativeGenerative: 'metered',
			llmFusion: true,
			legacy: true,
			supersededBy: 'pro',
			hiddenFromCheckout: true,
			grandfatheredAsProIa: true,
			standardAgentsUnlocked: true,
			workspaceProfiles: ['code', 'game', 'research'],
			marketplaceInstall: true,
			yjsSpectatorAllowed: true,
			yjsWriteSeats: 2,
			byokEnabled: true,
			byokAddonUsd: 5,
			localProjectsUnlimited: true,
			cloudSyncedProjects: -1,
			activeDeploys: 5,
			cdnEgressGB: 100,
			realtimeCollabSeats: 2,
			premiumAutoFallback: true,
			storageScope: 'cloud_only',
		},
	},
	{
		id: 'pro',
		name: 'Pro',
		price: 29,
		priceAnnual: 290,
		priceBRL: 149,
		priceAnnualBRL: 1490,
		currency: 'USD',
		interval: 'month',
		popular: true,
		description: 'Professional indie workflow: dual AI pools, collaboration, premium models with graceful fallback.',
		features: [
			formatAiQuotaLabel(PRO_AI),
			'Premium pool exhausted → auto Fast AI (IDE stays open)',
			'Unlimited cloud + local projects',
			'14 GB cloud storage',
			'100 GB/mo deploy CDN',
			'2 collaborator write seats',
			'All standard agents',
			'Creative APIs: image, 3D, music, voice, video (metered)',
			'BYOK optional ($5/mo platform addon)',
			'Priority support',
		],
		limits: {
			cloudProjectsMax: -1,
			storage: 14 * 1024 * 1024 * 1024,
			collaborators: 2,
			...PRO_AI,
			tokensPerDay: 250_000,
			requestsPerDay: 2880,
			concurrent: 5,
			contextWindow: 32000,
			historyDays: 90,
			chatHistoryCopyMaxMessages: 20000,
		},
		allowedModels: PRO_ALLOWED_MODELS,
		allowedDomains: ['code', 'game', 'research', 'trading', 'creative'],
		allowedAgents: ['all-standard'],
		extras: {
			creativeDomain: true,
			creativeGenerative: 'metered',
			llmFusion: true,
			priorityQueue: true,
			apiAccess: true,
			localProjectsUnlimited: true,
			cloudSyncedProjects: -1,
			activeDeploys: 5,
			byokEnabled: true,
			byokAddonUsd: 5,
			cdnEgressGB: 100,
			realtimeCollabSeats: 2,
			standardAgentsUnlocked: true,
			workspaceProfiles: ['code', 'game', 'research'],
			marketplaceInstall: true,
			yjsSpectatorAllowed: true,
			yjsWriteSeats: 2,
			premiumAutoFallback: true,
			storageScope: 'cloud_only',
			platformSkuUsd: 15,
			iaAddonUsd: 14,
		},
	},
	{
		id: 'studio',
		name: 'Studio',
		price: 79,
		priceAnnual: 790,
		priceBRL: 399,
		priceAnnualBRL: 3990,
		currency: 'USD',
		interval: 'month',
		description: 'Teams: dual AI at scale, webhooks, P2P/LAN multiplayer. Dedicated MP [HELD] until Agones fleet. Ultra models via wallet/BYOK only.',
		features: [
			formatAiQuotaLabel(STUDIO_AI),
			'Premium pool exhausted → auto Fast AI',
			'Unlimited cloud + local projects',
			'60 GB cloud storage',
			'500 GB/mo deploy CDN',
			'3 team write seats (+$12/extra)',
			'[HELD] dedicated MP — P2P/LAN co-op until Agones fleet',
			'Custom agents + webhooks',
			'BYOK optional ($5/mo platform addon)',
			'Higher creative API rate limits',
			'Dedicated support',
		],
		limits: {
			cloudProjectsMax: -1,
			storage: 60 * 1024 * 1024 * 1024,
			collaborators: 3,
			...STUDIO_AI,
			tokensPerDay: 900_000,
			requestsPerDay: 7200,
			concurrent: 10,
			contextWindow: 64000,
			historyDays: 180,
			chatHistoryCopyMaxMessages: 50000,
		},
		allowedModels: STUDIO_ALLOWED_MODELS,
		allowedDomains: ['all'],
		allowedAgents: ['all', 'custom'],
		extras: {
			creativeDomain: true,
			creativeGenerative: 'metered',
			llmFusion: true,
			priorityQueue: true,
			apiAccess: true,
			teamSeats: 3,
			extraSeatUsd: 12,
			localProjectsUnlimited: true,
			cloudSyncedProjects: -1,
			activeDeploys: 20,
			byokEnabled: true,
			byokAddonUsd: 5,
			cdnEgressGB: 500,
			realtimeCollabSeats: 3,
			webhooks: true,
			ultraModelsRequireWallet: true,
			standardAgentsUnlocked: true,
			workspaceProfiles: ['code', 'game', 'research'],
			marketplaceInstall: true,
			yjsSpectatorAllowed: true,
			yjsWriteSeats: 3,
			premiumAutoFallback: true,
			storageScope: 'cloud_only',
			platformSkuUsd: 45,
			iaAddonUsd: 34,
		},
	},
	{
		id: 'enterprise',
		name: 'Enterprise',
		price: 199,
		priceAnnual: 1910.4,
		priceBRL: 995,
		priceAnnualBRL: 9552,
		currency: 'USD',
		interval: 'month',
		description: 'Assisted rollout, compliance, SSO, and custom integrations. Contact Sales for checkout.',
		features: [
			formatAiQuotaLabel(ENTERPRISE_AI),
			'Unlimited cloud + local projects',
			'1 TB cloud storage',
			'Custom agents and private models',
			'SSO, SAML, audit logs, SLA 99.9%',
			'Guided rollout + 24/7 support',
		],
		limits: {
			cloudProjectsMax: -1,
			storage: 1000 * 1024 * 1024 * 1024,
			collaborators: -1,
			...ENTERPRISE_AI,
			tokensPerDay: -1,
			requestsPerDay: -1,
			concurrent: -1,
			contextWindow: 128000,
			historyDays: 365,
			chatHistoryCopyMaxMessages: -1,
		},
		allowedModels: ['all', 'custom-fine-tuned'],
		allowedDomains: ['all', 'custom'],
		allowedAgents: ['all', 'custom', 'private'],
		extras: {
			creativeDomain: true,
			creativeGenerative: 'unlimited',
			llmFusion: true,
			sso: true,
			auditLogs: true,
			dedicatedSupport: true,
			sla: '99.9%',
			customIntegrations: true,
			onPremiseOption: true,
			teamSeats: 10,
			standardAgentsUnlocked: true,
			workspaceProfiles: ['code', 'game', 'research'],
			marketplaceInstall: true,
			yjsSpectatorAllowed: true,
			yjsWriteSeats: 10,
			premiumAutoFallback: true,
			storageScope: 'cloud_only',
			checkoutHidden: true,
		},
	},
];

export function isPaidPlanId(value: string): value is PaidPlanId {
	return value === 'starter' || value === 'basic' || value === 'pro' || value === 'studio' || value === 'enterprise';
}

export function isPlanId(value: string): value is PlanId {
	return value === 'free' || isPaidPlanId(value);
}

export function getPlanById(planId: string): PlanDefinition | null {
	if (!isPlanId(planId)) return null;
	return PLANS.find((plan) => plan.id === planId) || null;
}

export { formatAiQuotaLabel, buildAiQuotaPools, computeWeightedTokenBudget } from './plan-ai-quotas';
