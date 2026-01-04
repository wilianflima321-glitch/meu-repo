import { prisma } from './db';
import { getPlanById, type PlanDefinition } from './plans';

type EntitlementResult = {
	plan: PlanDefinition;
	source: 'subscription' | 'trial';
};

export type FeatureId =
	| 'projects'
	| 'files'
	| 'assets'
	| 'terminal'
	| 'git'
	| 'tasks'
	| 'marketplace'
	| 'extensions'
	| 'build'
	| 'search'
	| 'lsp'
	| 'dap'
	| 'tests';

function isTrialPlan(plan: string | null | undefined): boolean {
	return String(plan || '').endsWith('_trial');
}

export async function requireEntitlementsForUser(userId: string): Promise<EntitlementResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, plan: true, createdAt: true },
	});
	if (!user) {
		throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
	}

	// Assinatura ativa tem prioridade.
	const subscription = await prisma.subscription.findUnique({ where: { userId } });
	if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
		// Evita liberar acesso com assinatura expirada.
		if (subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() < Date.now()) {
			throw Object.assign(
				new Error('SUBSCRIPTION_EXPIRED: renove ou faça upgrade para continuar.'),
				{ code: 'SUBSCRIPTION_EXPIRED' }
			);
		}

		const plan = getPlanById(user.plan);
		if (!plan) {
			throw Object.assign(
				new Error('PLAN_MISMATCH: assinatura ativa mas plano inválido no usuário.'),
				{ code: 'PLAN_MISMATCH', plan: user.plan }
			);
		}
		return { plan, source: 'subscription' };
	}

	// Trial (7 dias) — baseado no seu fluxo atual de registro.
	if (isTrialPlan(user.plan)) {
		const trialMs = 7 * 24 * 60 * 60 * 1000;
		const expiresAt = user.createdAt.getTime() + trialMs;
		if (Date.now() > expiresAt) {
			throw Object.assign(
				new Error('TRIAL_EXPIRED: escolha um plano para continuar.'),
				{ code: 'TRIAL_EXPIRED' }
			);
		}

		// Trial atual é do Starter.
		const plan = getPlanById('starter');
		if (!plan) {
			throw Object.assign(new Error('PLAN_NOT_FOUND: starter'), { code: 'PLAN_NOT_FOUND' });
		}
		return { plan, source: 'trial' };
	}

	throw Object.assign(
		new Error('PAYMENT_REQUIRED: assinatura necessária para usar esta funcionalidade.'),
		{ code: 'PAYMENT_REQUIRED' }
	);
}

function featureAllowedForPlan(planId: string, feature: FeatureId): boolean {
	// Regra simples e explícita: features avançadas são Pro+.
	// O restante é liberado para qualquer usuário com entitlements válidos.
	switch (feature) {
		case 'dap':
		case 'lsp':
		case 'marketplace':
		case 'extensions':
		case 'build':
			return planId === 'pro' || planId === 'studio' || planId === 'enterprise';
		default:
			return true;
	}
}

export async function requireFeatureForUser(userId: string, feature: FeatureId): Promise<EntitlementResult> {
	const entitlements = await requireEntitlementsForUser(userId);
	if (!featureAllowedForPlan(entitlements.plan.id, feature)) {
		throw Object.assign(
			new Error(
				`FEATURE_NOT_AVAILABLE: recurso "${feature}" requer plano Pro ou superior.`
			),
			{ code: 'FEATURE_NOT_AVAILABLE', feature, planId: entitlements.plan.id }
		);
	}
	return entitlements;
}
