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
	priceBRL: number;
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

export const PLANS: PlanDefinition[] = [
	{
		id: 'starter',
		name: 'Starter',
		price: 3,
		priceBRL: 15,
		currency: 'USD',
		interval: 'month',
		description: 'Para iniciantes e projetos pessoais',
		features: [
			'500K tokens IA/mês',
			'3 projetos',
			'500 MB storage',
			'Gemini Flash + DeepSeek',
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
		allowedModels: ['gemini-1.5-flash', 'deepseek-v3'],
		allowedDomains: ['code'],
		allowedAgents: ['coder', 'universal'],
	},
	{
		id: 'basic',
		name: 'Basic',
		price: 9,
		priceBRL: 45,
		currency: 'USD',
		interval: 'month',
		description: 'Para desenvolvedores ativos',
		features: [
			'2M tokens IA/mês',
			'10 projetos',
			'2 GB storage',
			'4 modelos de IA',
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
		allowedModels: ['gemini-1.5-flash', 'deepseek-v3', 'gpt-4o-mini', 'claude-3-haiku'],
		allowedDomains: ['code', 'research'],
		allowedAgents: ['coder', 'universal', 'architect', 'researcher'],
	},
	{
		id: 'pro',
		name: 'Pro',
		price: 29,
		priceBRL: 149,
		currency: 'USD',
		interval: 'month',
		popular: true,
		description: 'Para profissionais e freelancers',
		features: [
			'8M tokens IA/mês',
			'Projetos ilimitados',
			'10 GB storage',
			'Modelos premium (GPT-4o, Claude)',
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
		allowedModels: ['all-ultra', 'all-balanced'],
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
		price: 79,
		priceBRL: 399,
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
		allowedModels: ['all'],
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
		priceBRL: 999,
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
