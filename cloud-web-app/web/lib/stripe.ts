import Stripe from 'stripe';
import { requireEnv } from './env';

export function getStripe(): Stripe {
	const secretKey = requireEnv('STRIPE_SECRET_KEY');
	return new Stripe(secretKey);
}

export function getStripePriceIdForPlan(planId: string): string {
	switch (planId) {
		case 'starter':
			return requireEnv('STRIPE_PRICE_STARTER');
		case 'basic':
			return requireEnv('STRIPE_PRICE_BASIC');
		case 'pro':
			return requireEnv('STRIPE_PRICE_PRO');
		case 'studio':
			return requireEnv('STRIPE_PRICE_STUDIO');
		case 'enterprise':
			return requireEnv('STRIPE_PRICE_ENTERPRISE');
		default:
			throw Object.assign(new Error(`INVALID_PLAN: ${planId}`), { code: 'INVALID_PLAN' });
	}
}
