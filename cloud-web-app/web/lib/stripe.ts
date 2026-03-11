import Stripe from 'stripe';
import { requireEnv } from './env';

export function getStripe(): Stripe {
	const secretKey = requireEnv('STRIPE_SECRET_KEY');
	return new Stripe(secretKey);
}

export type BillingInterval = 'month' | 'year';

export function getStripePriceIdForPlan(planId: string, interval: BillingInterval = 'month'): string {
	const normalizedInterval = interval === 'year' ? 'year' : 'month';
	switch (planId) {
		case 'starter':
			return requireEnv(normalizedInterval === 'year' ? 'STRIPE_PRICE_STARTER_ANNUAL' : 'STRIPE_PRICE_STARTER');
		case 'basic':
			return requireEnv(normalizedInterval === 'year' ? 'STRIPE_PRICE_BASIC_ANNUAL' : 'STRIPE_PRICE_BASIC');
		case 'pro':
			return requireEnv(normalizedInterval === 'year' ? 'STRIPE_PRICE_PRO_ANNUAL' : 'STRIPE_PRICE_PRO');
		case 'studio':
			return requireEnv(normalizedInterval === 'year' ? 'STRIPE_PRICE_STUDIO_ANNUAL' : 'STRIPE_PRICE_STUDIO');
		case 'enterprise':
			return requireEnv(normalizedInterval === 'year' ? 'STRIPE_PRICE_ENTERPRISE_ANNUAL' : 'STRIPE_PRICE_ENTERPRISE');
		default:
			throw Object.assign(new Error(`INVALID_PLAN: ${planId}`), { code: 'INVALID_PLAN' });
	}
}
