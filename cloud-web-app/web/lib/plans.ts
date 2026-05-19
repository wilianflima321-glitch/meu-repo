import {
	OPENROUTER_BEST_MODELS,
	OPENROUTER_BUDGET_MODELS,
	OPENROUTER_FREE_MODELS,
} from './ai/openrouter-models';

export type PlanId = 'free' | 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';
export type PaidPlanId = Exclude<PlanId, 'free'>;

export type PlanLimits = {
	projects: number; // -1 = unlimited
	storage: number; // bytes
	collaborators: number; // -1 = unlimited
	tokensPerMonth: number;
	tokensPerDay: number;
	requestsPerHour: number;
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
			'100K AI tokens/month',
			'10 lightweight projects',
			'250 MB storage',
			'1 concurrent session',
			'Chat + editor + preview',
			'Free OpenRouter models',
			'Mission intake + Studio Home',
			'Upgrade when deploy and collaboration matter',
		],
		limits: {
			projects: 10,
			storage: 250 * 1024 * 1024,
			collaborators: 0,
			tokensPerMonth: 100_000,
			tokensPerDay: 5_000,
			requestsPerHour: 12,
			concurrent: 1,
			contextWindow: 4000,
			historyDays: 7,
			chatHistoryCopyMaxMessages: 500,
		},
		allowedModels: FREE_MODEL_IDS,
		allowedDomains: ['code'],
		allowedAgents: ['universal'],
		extras: {
			cardRequired: false,
			upgradeRequiredFor: ['deploy', 'collaboration', 'marketplace', 'extensions'],
		},
	},
	{
		id: 'starter',
		name: 'Starter',
		price: 20,
		priceAnnual: 192,
		priceBRL: 100,
		priceAnnualBRL: 960,
		currency: 'USD',
		interval: 'month',
		description: 'For exploring Studio at low cost and reaching first value quickly.',
		features: [
			'500K AI tokens/month',
			'3 projects',
			'500 MB storage',
			'1 concurrent session',
			'1 active agent',
			'Editor + preview + chat',
			'Starter and budget models',
			'Community support',
		],
		limits: {
			projects: 3,
			storage: 500 * 1024 * 1024,
			collaborators: 0,
			tokensPerMonth: 500_000,
			tokensPerDay: 20_000,
			requestsPerHour: 30,
			concurrent: 1,
			contextWindow: 8000,
			historyDays: 7,
			chatHistoryCopyMaxMessages: 2000,
		},
		allowedModels: STARTER_ALLOWED_MODELS,
		allowedDomains: ['code'],
		allowedAgents: ['coder', 'universal'],
	},
	{
		id: 'basic',
		name: 'Basic',
		price: 29,
		priceAnnual: 278.4,
		priceBRL: 145,
		priceAnnualBRL: 1392,
		currency: 'USD',
		interval: 'month',
		description: 'For active builders already using terminal, debugger, and research in the daily flow.',
		features: [
			'2M AI tokens/month',
			'10 projects',
			'2 GB storage',
			'2 concurrent sessions',
			'Debugger + terminal',
			'Research enabled',
			'Complete budget model set',
			'30-day history',
			'Email support',
		],
		limits: {
			projects: 10,
			storage: 2 * 1024 * 1024 * 1024,
			collaborators: 2,
			tokensPerMonth: 2_000_000,
			tokensPerDay: 100_000,
			requestsPerHour: 60,
			concurrent: 2,
			contextWindow: 16000,
			historyDays: 30,
			chatHistoryCopyMaxMessages: 5000,
		},
		allowedModels: BUDGET_MODEL_IDS,
		allowedDomains: ['code', 'research'],
		allowedAgents: ['coder', 'universal', 'architect', 'researcher'],
	},
	{
		id: 'pro',
		name: 'Pro',
		price: 49.99,
		priceAnnual: 479.9,
		priceBRL: 250,
		priceAnnualBRL: 2400,
		currency: 'USD',
		interval: 'month',
		popular: true,
		description: 'For professionals who need collaboration, API access, and premium models with predictable cost.',
		features: [
			'8M AI tokens/month',
			'Unlimited projects',
			'10 GB storage',
			'5 concurrent sessions',
			'3 active agents',
			'Git + collaboration + API',
			'Balanced premium models',
			'90-day history',
			'Priority support',
		],
		limits: {
			projects: -1,
			storage: 10 * 1024 * 1024 * 1024,
			collaborators: 5,
			tokensPerMonth: 8_000_000,
			tokensPerDay: 400_000,
			requestsPerHour: 120,
			concurrent: 5,
			contextWindow: 32000,
			historyDays: 90,
			chatHistoryCopyMaxMessages: 20000,
		},
		allowedModels: PRO_ALLOWED_MODELS,
		allowedDomains: ['code', 'research', 'trading', 'creative'],
		allowedAgents: ['all-standard'],
		extras: {
			priorityQueue: true,
			apiAccess: true,
		},
	},
	{
		id: 'studio',
		name: 'Studio',
		price: 99.99,
		priceAnnual: 959.9,
		priceBRL: 500,
		priceAnnualBRL: 4800,
		currency: 'USD',
		interval: 'month',
		description: 'For teams that need operational scale, webhooks, and consistent governance.',
		features: [
			'25M AI tokens/month',
			'Unlimited projects',
			'50 GB storage',
			'10 concurrent sessions',
			'3 active agents',
			'All Studio models',
			'Custom agents',
			'Webhooks + export',
			'180-day history',
			'Dedicated support',
		],
		limits: {
			projects: -1,
			storage: 50 * 1024 * 1024 * 1024,
			collaborators: 10,
			tokensPerMonth: 25_000_000,
			tokensPerDay: 1_000_000,
			requestsPerHour: 300,
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
			webhooks: true,
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
			projects: -1,
			storage: 1000 * 1024 * 1024 * 1024,
			collaborators: -1,
			tokensPerMonth: 100_000_000,
			tokensPerDay: -1,
			requestsPerHour: -1,
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
