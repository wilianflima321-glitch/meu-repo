import { prisma } from './db';
import { getPlanById, type PlanDefinition } from './plans';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('entitlements');

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

/** Paid plans that have valid Stripe subscriptions */
const PAID_PLAN_IDS = new Set(['starter', 'basic', 'pro', 'studio', 'enterprise']);

export async function requireEntitlementsForUser(userId: string): Promise<EntitlementResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, plan: true, createdAt: true, trialEndsAt: true, planVerifiedAt: true },
	});
	if (!user) {
		throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' });
	}

	// Active subscriptions always win over local plan defaults.
	const subscription = await prisma.subscription.findUnique({ where: { userId } });
	if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
		if (subscription.currentPeriodEnd && subscription.currentPeriodEnd.getTime() < Date.now()) {
			// ── DEBT-FIN-013: Lazy reconcile — subscription period expired ──
			// Downgrade user plan silently; webhook may have been delayed.
			await prisma.user.update({
				where: { id: userId },
				data: { plan: 'free', planVerifiedAt: new Date() },
			}).catch(() => {}); // Best-effort; don't block the request
			return freeEntitlement();
		}

		const subscribedPlanId = String(user.plan || '').replace('_trial', '');
		const plan = getPlanById(subscribedPlanId);
		if (!plan || plan.id === 'free') {
			// Plan mismatch — active subscription but free plan on user record.
			// This can happen if webhook set plan wrong. Log but don't throw.
			log.warn(`PLAN_MISMATCH: user ${userId} has active sub but plan=${user.plan}`);
			return freeEntitlement();
		}
		return { plan, source: 'subscription' };
	}

	// ── DEBT-FIN-013: Lazy reconcile — paid plan without active subscription ──
	// If the user has a paid plan but no active subscription (e.g., webhook missed),
	// and the plan was verified more than 2 hours ago, downgrade to free.
	if (PAID_PLAN_IDS.has(user.plan) && !subscription) {
		const verifiedAt = user.planVerifiedAt?.getTime() ?? 0;
		const staleThresholdMs = 2 * 60 * 60 * 1000; // 2 hours
		if (Date.now() - verifiedAt > staleThresholdMs) {
			await prisma.user.update({
				where: { id: userId },
				data: { plan: 'free', planVerifiedAt: new Date() },
			}).catch(() => {});
			return freeEntitlement();
		}
		// Within grace period — honor the paid plan (webhook may still arrive)
		const plan = getPlanById(user.plan);
		if (plan) return { plan, source: 'subscription' };
	}

	// Handle canceled/inactive subscription with paid plan still on user record
	if (subscription && subscription.status !== 'active' && subscription.status !== 'trialing') {
		if (PAID_PLAN_IDS.has(user.plan)) {
			await prisma.user.update({
				where: { id: userId },
				data: { plan: 'free', planVerifiedAt: new Date() },
			}).catch(() => {});
		}
		return freeEntitlement();
	}

	// Starter trial is deprecated (contracts_planning §9.2) — map to free.
	if (isTrialPlan(user.plan)) {
		return freeEntitlement();
	}

	const plan = getPlanById(user.plan);
	if (plan?.id === 'free') {
		return { plan, source: 'free' };
	}

	return freeEntitlement();
}

/**
 * Feature access per plan — contracts_planning §6 (IDE generosity).
 * Marketplace, extensions, search, and tasks are FREE for all tiers.
 * Terminal and git require at least Basic/Pro.
 * DAP, LSP, and build require Pro or above.
 */
function featureAllowedForPlan(planId: string, feature: FeatureId): boolean {
	switch (feature) {
		case 'dap':
		case 'lsp':
		case 'build':
			return planId === 'basic' || planId === 'pro' || planId === 'studio' || planId === 'enterprise';
		case 'terminal':
		case 'git':
			return planId === 'basic' || planId === 'pro' || planId === 'studio' || planId === 'enterprise';
		// ── IDE generosity: marketplace, extensions, search, tasks, projects, files, assets, tests ──
		// Available on ALL tiers including Free and Starter.
		case 'marketplace':
		case 'extensions':
		case 'projects':
		case 'files':
		case 'assets':
		case 'search':
		case 'tasks':
		case 'tests':
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

