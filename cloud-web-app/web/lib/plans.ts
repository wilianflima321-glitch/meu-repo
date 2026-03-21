import { OPENROUTER_BEST_MODELS, OPENROUTER_BUDGET_MODELS } from './ai/openrouter-models';

export type PlanId = 'starter' | 'basic' | 'pro' | 'studio' | 'enterprise';

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

const BUDGET_MODEL_IDS = OPENROUTER_BUDGET_MODELS.map((model) => model.id);
const BEST_MODEL_IDS = OPENROUTER_BEST_MODELS.map((model) => model.id);
const STARTER_ALLOWED_MODELS = [
	'google/gemini-2.5-flash-lite',
	'google/gemini-3.1-flash-lite-preview',
	'openai/gpt-5-nano',
	'openai/gpt-5.4-nano',
	'anthropic/claude-3.5-haiku',
];
const PRO_ALLOWED_MODELS = Array.from(new Set([...BUDGET_MODEL_IDS, ...BEST_MODEL_IDS.filter((model) => model !== 'openai/gpt-5.4-pro')]));
const STUDIO_ALLOWED_MODELS = Array.from(new Set([...BUDGET_MODEL_IDS, ...BEST_MODEL_IDS]));

export const PLANS: PlanDefinition[] = [
	{
		id: 'starter',
		name: 'Starter',
		price: 20,
		priceAnnual: 192,
		priceBRL: 100,
		priceAnnualBRL: 960,
		currency: 'USD',
		interval: 'month',
		description: 'Para iniciantes e projetos pessoais',
		features: [
			'500K tokens IA/mês',
			'3 projetos',
			'500 MB storage',
			'Modelos budget (GPT-5 Nano + Gemini Flash Lite)',
			'17 sistemas AAA inclusos',
			'LivePreview 3D',
			'Suporte comunidade',
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
		description: 'Para desenvolvedores ativos',
		features: [
			'2M tokens IA/mês',
			'10 projetos',
			'2 GB storage',
			'15 modelos budget',
			'Todos os agents básicos',
			'Domínio Research',
			'Histórico 30 dias',
			'Suporte email',
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
		description: 'Para profissionais e freelancers',
		features: [
			'8M tokens IA/mês',
			'Projetos ilimitados',
			'10 GB storage',
			'Modelos premium (GPT-5.4, Claude 4.6)',
			'Todos os agents',
			'Todos os domínios',
			'API access',
			'Priority queue',
			'Suporte prioritário',
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
		description: 'Para times e studios',
		features: [
			'25M tokens IA/mês',
			'Projetos ilimitados',
			'50 GB storage',
			'Todos os modelos incluindo premium',
			'Agents customizados',
			'3 seats inclusos',
			'Webhooks',
			'Histórico 180 dias',
			'Suporte dedicado',
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
		description: 'Para empresas e grandes times',
		features: [
			'100M tokens IA/mês',
			'Tudo ilimitado',
			'200 GB storage',
			'Custom fine-tuned models',
			'Agents privados',
			'10 seats inclusos',
			'SSO & SAML',
			'Audit logs',
			'SLA 99.9%',
			'On-premise option',
			'Suporte 24/7',
		],
		limits: {
			projects: -1,
			storage: 200 * 1024 * 1024 * 1024,
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

export function isPaidPlanId(value: string): value is PlanId {
	return value === 'starter' || value === 'basic' || value === 'pro' || value === 'studio' || value === 'enterprise';
}

export function getPlanById(planId: string): PlanDefinition | null {
	if (!isPaidPlanId(planId)) return null;
	return PLANS.find(p => p.id === planId) || null;
}
