import { prisma } from './db';
import { getPlanById, type PlanDefinition } from './plans';

type EntitlementResult = {
	plan: PlanDefinition;
	source: 'subscription' | 'trial' | 'free';
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

function requirePlan(planId: string): PlanDefinition {
	const plan = getPlanById(planId);
	if (!plan) {
		throw Object.assign(new Error(`PLAN_NOT_FOUND: ${planId}`), { code: 'PLAN_NOT_FOUND', planId });
	}
	return plan;
}

function freeEntitlement(): EntitlementResult {
	return { plan: requirePlan('free'), source: 'free' };
}

export async function requireEntitlementsForUser(userId: string): Promise<EntitlementResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, plan: true, createdAt: true, trialEndsAt: true },
	});
	if (!user) {
		throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
	}

	// Active subscriptions always win over local plan defaults.
	const subscription = await prisma.subscription.findUnique({ where: { userId } });
	if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
		if (subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() < Date.now()) {
			return freeEntitlement();
		}

		const subscribedPlanId = String(user.plan || '').replace('_trial', '');
		const plan = getPlanById(subscribedPlanId);
		if (!plan || plan.id === 'free') {
			throw Object.assign(
				new Error('PLAN_MISMATCH: active subscription has no paid plan on user record.'),
				{ code: 'PLAN_MISMATCH', plan: user.plan },
			);
		}
		return { plan, source: 'subscription' };
	}

	// Starter trial is 14 days. Legacy users without trialEndsAt keep a deterministic 14-day fallback.
	if (isTrialPlan(user.plan)) {
		const trialMs = 14 * 24 * 60 * 60 * 1000;
		const expiresAt = user.trialEndsAt?.getTime() ?? user.createdAt.getTime() + trialMs;
		if (Date.now() > expiresAt) {
			return freeEntitlement();
		}

		return { plan: requirePlan('starter'), source: 'trial' };
	}

	const plan = getPlanById(user.plan);
	if (plan?.id === 'free') {
		return { plan, source: 'free' };
	}

	return freeEntitlement();
}

function featureAllowedForPlan(planId: string, feature: FeatureId): boolean {
	// Advanced operational surfaces stay paid. Free users keep the core Studio loop:
	// project, files, assets, search, tasks and tests.
	switch (feature) {
		case 'dap':
		case 'lsp':
		case 'marketplace':
		case 'extensions':
		case 'build':
			return planId === 'pro' || planId === 'studio' || planId === 'enterprise';
		case 'terminal':
		case 'git':
			return planId === 'basic' || planId === 'pro' || planId === 'studio' || planId === 'enterprise';
		default:
			return true;
	}
}

export async function requireFeatureForUser(userId: string, feature: FeatureId): Promise<EntitlementResult> {
	const entitlements = await requireEntitlementsForUser(userId);
	if (!featureAllowedForPlan(entitlements.plan.id, feature)) {
		throw Object.assign(
			new Error(
				`FEATURE_NOT_AVAILABLE: recurso "${feature}" requer plano superior.`,
			),
			{ code: 'FEATURE_NOT_AVAILABLE', feature, planId: entitlements.plan.id },
		);
	}
	return entitlements;
}
