import {
	OPENROUTER_BEST_MODELS,
	OPENROUTER_BUDGET_MODELS,
	OPENROUTER_FREE_MODELS,
} from './ai/openrouter-models';

export type PlanId = 'free' | 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';
export type PaidPlanId = Exclude<PlanId, 'free'>;

export type PlanLimits = {
	cloudProjectsMax: number; // -1 = unlimited
	storage: number; // bytes
	collaborators: number; // -1 = unlimited
	tokensPerMonth: number;
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
	'openai/gpt-5',
	'openai/gpt-5.4',
	'openai/gpt-5-codex',
	'openai/o3',
	'anthropic/claude-sonnet-4.6',
	'anthropic/claude-3.7-sonnet',
	'google/gemini-2.5-pro',
	'openai/gpt-4.1',
];

const PRO_ALLOWED_MODELS = Array.from(new Set([...BUDGET_MODEL_IDS, ...PRO_BEST_MODEL_IDS]));
const STUDIO_ALLOWED_MODELS = Array.from(
	new Set([...BUDGET_MODEL_IDS, ...BEST_MODEL_IDS.filter((model) => model !== 'openai/gpt-5.4-pro')]),
);

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
		description: 'For testing the real Studio flow without a card and reaching the first project with clear guardrails.',
		features: [
			'200K weighted AI tokens/month (free models)',
			'1 cloud project + unlimited local (Tauri)',
			'250 MB cloud storage',
			'1 concurrent session',
			'Chat + editor + preview',
			'Free OpenRouter models only',
			'Local offline playtest',
			'Upgrade for deploy & collaboration',
		],
		limits: {
			cloudProjectsMax: 1,
			storage: 250 * 1024 * 1024,
			collaborators: 0,
			tokensPerMonth: 200_000,
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
			cardRequired: false,
			localProjectsUnlimited: true,
			cloudSyncedProjects: 1,
			activeDeploys: 0,
			byokEnabled: true,
			byokAddonUsd: 0,
			realtimeCollabSeats: 0,
			upgradeRequiredFor: ['deploy', 'collaboration', 'marketplace', 'extensions'],
			standardAgentsUnlocked: true,
			workspaceProfiles: ['code', 'game', 'research'],
			marketplaceInstall: true,
			yjsSpectatorAllowed: true,
			yjsWriteSeats: 0,
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
			'1M weighted AI tokens/month (budget models)',
			'3 cloud projects',
			'2 GB storage',
			'8 GB/mo deploy CDN',
			'P2P multiplayer playtest',
			'1 concurrent session',
			'Starter & budget models',
			'Community support',
		],
		limits: {
			cloudProjectsMax: 3,
			storage: 2 * 1024 * 1024 * 1024,
			collaborators: 0,
			tokensPerMonth: 1_000_000,
			tokensPerDay: 50_000,
			requestsPerDay: 720,
			concurrent: 1,
			contextWindow: 8000,
			historyDays: 14,
			chatHistoryCopyMaxMessages: 2000,
		},
		allowedModels: STARTER_ALLOWED_MODELS,
		allowedDomains: ['code', 'game', 'research'],
		allowedAgents: ['all-standard'],
		extras: {
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
			'4.5M weighted AI tokens/month (Pro+IA grant)',
			'Unlimited projects',
			'14 GB storage',
			'2 collaborator seats',
			'Premium models (40× weight)',
			'BYOK optional',
			'All standard agents',
		],
		limits: {
			cloudProjectsMax: -1,
			storage: 14 * 1024 * 1024 * 1024,
			collaborators: 2,
			tokensPerMonth: 4_500_000,
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
		description: 'Professional indie workflow: collaboration, premium models (weighted), BYOK option.',
		features: [
			'4.5M weighted AI tokens/month',
			'Unlimited projects',
			'14 GB storage',
			'100 GB/mo deploy CDN',
			'2 collaborator seats',
			'3 active agents',
			'Premium models (40× weight)',
			'BYOK optional ($5/mo addon for platform features)',
			'Priority support',
		],
		limits: {
			cloudProjectsMax: -1,
			storage: 14 * 1024 * 1024 * 1024,
			collaborators: 2,
			tokensPerMonth: 4_500_000,
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
		description: 'Teams: scale, webhooks, 18M weighted AI, ultra models via wallet/BYOK only.',
		features: [
			'18M weighted AI tokens/month',
			'Unlimited projects',
			'60 GB storage',
			'500 GB/mo deploy CDN',
			'3 team seats (+$12/extra)',
			'3 dedicated MP test servers',
			'Webhooks + export',
			'BYOK optional ($5/mo addon)',
			'Dedicated support',
		],
		limits: {
			cloudProjectsMax: -1,
			storage: 60 * 1024 * 1024 * 1024,
			collaborators: 3,
			tokensPerMonth: 18_000_000,
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
		description: 'For assisted rollout, compliance, SSO, and custom integrations.',
		features: [
			'100M AI tokens/month',
			'Unlimited projects',
			'1 TB storage',
			'Concurrency enterprise',
			'10 active agents',
			'Custom and private models',
			'SSO & SAML',
			'Audit logs',
			'SLA 99.9%',
			'Guided rollout',
			'24/7 support',
		],
		limits: {
			cloudProjectsMax: -1,
			storage: 1000 * 1024 * 1024 * 1024,
			collaborators: -1,
			tokensPerMonth: 100_000_000,
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
