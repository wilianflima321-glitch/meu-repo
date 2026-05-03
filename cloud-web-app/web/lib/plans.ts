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
		description: 'Para testar o fluxo real do Studio sem cartao e chegar ao primeiro projeto com guardrails claros.',
		features: [
			'100K tokens IA/mes',
			'10 projetos leves',
			'250 MB storage',
			'1 sessao simultanea',
			'Chat + editor + preview',
			'Modelos gratuitos OpenRouter',
			'Mission intake + Studio Home',
			'Upgrade quando precisar de deploy e colaboracao',
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
		description: 'Para explorar o Studio com baixo custo e chegar ao primeiro valor rapido.',
		features: [
			'500K tokens IA/mes',
			'3 projetos',
			'500 MB storage',
			'1 sessao simultanea',
			'1 agente ativo',
			'Editor + preview + chat',
			'Modelos starter e budget',
			'Suporte da comunidade',
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
		description: 'Para builders ativos que ja usam terminal, debugger e research no fluxo diario.',
		features: [
			'2M tokens IA/mes',
			'10 projetos',
			'2 GB storage',
			'2 sessoes simultaneas',
			'Debugger + terminal',
			'Research habilitado',
			'Modelos budget completos',
			'Historico de 30 dias',
			'Suporte por email',
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
		description: 'Para profissionais que precisam de colaboracao, API e modelos premium com previsibilidade.',
		features: [
			'8M tokens IA/mes',
			'Projetos ilimitados',
			'10 GB storage',
			'5 sessoes simultaneas',
			'3 agentes ativos',
			'Git + collaboration + API',
			'Modelos premium balanceados',
			'Historico de 90 dias',
			'Suporte prioritario',
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
		description: 'Para equipes que precisam de escala operacional, webhooks e governanca consistente.',
		features: [
			'25M tokens IA/mes',
			'Projetos ilimitados',
			'50 GB storage',
			'10 sessoes simultaneas',
			'3 agentes ativos',
			'Todos os modelos do studio',
			'Agents customizados',
			'Webhooks + export',
			'Historico de 180 dias',
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
		description: 'Para rollout assistido, compliance, SSO e integracoes sob medida.',
		features: [
			'100M tokens IA/mes',
			'Projetos ilimitados',
			'1 TB storage',
			'Concurrency enterprise',
			'10 agentes ativos',
			'Modelos custom e privados',
			'SSO & SAML',
			'Audit logs',
			'SLA 99.9%',
			'Rollout guiado',
			'Suporte 24/7',
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
