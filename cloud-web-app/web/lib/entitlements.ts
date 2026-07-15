import { prisma } from './db'
import { getPlanById, type PlanDefinition } from './plans'
import { createComponentLogger } from '@/lib/observability/logger'
import {
  decideLazyPlanReconcile,
  effectiveEntitlementPlanId,
} from '@/lib/billing/stripe-plan-reconcile'

const log = createComponentLogger('entitlements')

type EntitlementResult = {
	plan: PlanDefinition
	source: 'subscription' | 'trial' | 'free'
}

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
	| 'tests'

function requirePlan(planId: string): PlanDefinition {
	const plan = getPlanById(planId)
	if (!plan) {
		throw Object.assign(new Error(`PLAN_NOT_FOUND: ${planId}`), { code: 'PLAN_NOT_FOUND', planId })
	}
	return plan
}

function freeEntitlement(): EntitlementResult {
	return { plan: requirePlan('free'), source: 'free' }
}

async function applyDowngradeToFree(userId: string, reason: string): Promise<void> {
	log.info('lazy_plan_downgrade', { userId, reason })
	await prisma.user
		.update({
			where: { id: userId },
			data: { plan: 'free', planVerifiedAt: new Date(), stripeSubscriptionId: null },
		})
		.catch(() => {})
}

export async function requireEntitlementsForUser(userId: string): Promise<EntitlementResult> {
	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { id: true, plan: true, createdAt: true, trialEndsAt: true, planVerifiedAt: true },
	})
	if (!user) {
		throw Object.assign(new Error('USER_NOT_FOUND'), { code: 'USER_NOT_FOUND' })
	}

	const subscription = await prisma.subscription.findUnique({ where: { userId } })
	const decision = decideLazyPlanReconcile({
		userPlan: user.plan,
		subscription: subscription
			? { status: subscription.status, currentPeriodEnd: subscription.currentPeriodEnd }
			: null,
		planVerifiedAt: user.planVerifiedAt,
	})

	if (decision.action === 'downgrade_free') {
		await applyDowngradeToFree(userId, decision.reason)
		return freeEntitlement()
	}

	// Active / grace — map basic → pro (6D.5) and reject deprecated trials as free.
	if (subscription && (subscription.status === 'active' || subscription.status === 'trialing')) {
		const effectiveId = effectiveEntitlementPlanId(user.plan)
		const plan = getPlanById(effectiveId)
		if (!plan || plan.id === 'free') {
			log.warn(`PLAN_MISMATCH: user ${userId} has active sub but plan=${user.plan}`)
			return freeEntitlement()
		}
		return { plan, source: 'subscription' }
	}

	// Within webhook grace: honor paid claim (basic → pro entitlements).
	if (decision.reason === 'webhook_grace_window' || decision.reason.startsWith('at_risk_grace')) {
		const effectiveId = effectiveEntitlementPlanId(user.plan)
		const plan = getPlanById(effectiveId)
		if (plan && plan.id !== 'free') {
			return { plan, source: 'subscription' }
		}
	}

	const effectiveId = effectiveEntitlementPlanId(user.plan)
	if (effectiveId === 'free') {
		return freeEntitlement()
	}

	const plan = getPlanById(effectiveId)
	if (plan?.id === 'free') {
		return { plan, source: 'free' }
	}

	return freeEntitlement()
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
			return planId === 'basic' || planId === 'pro' || planId === 'studio' || planId === 'enterprise'
		case 'terminal':
		case 'git':
			return planId === 'basic' || planId === 'pro' || planId === 'studio' || planId === 'enterprise'
		case 'marketplace':
		case 'extensions':
		case 'projects':
		case 'files':
		case 'assets':
		case 'search':
		case 'tasks':
		case 'tests':
		default:
			return true
	}
}

export async function requireFeatureForUser(userId: string, feature: FeatureId): Promise<EntitlementResult> {
	const entitlements = await requireEntitlementsForUser(userId)
	if (!featureAllowedForPlan(entitlements.plan.id, feature)) {
		throw Object.assign(
			new Error(`FEATURE_NOT_AVAILABLE: feature "${feature}" requires a higher plan.`),
			{ code: 'FEATURE_NOT_AVAILABLE', feature, planId: entitlements.plan.id },
		)
	}
	return entitlements
}
