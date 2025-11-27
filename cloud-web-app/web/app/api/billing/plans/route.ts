/**
 * Billing Plans API
 * GET /api/billing/plans - List all available plans
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '1 project',
      '100 MB storage',
      'Community support',
      'Basic templates',
    ],
    limits: {
      projects: 1,
      storage: 100 * 1024 * 1024, // 100 MB
      collaborators: 0,
    },
  },
  {
    id: 'starter',
    name: 'Starter',
    price: 9,
    currency: 'USD',
    interval: 'month',
    features: [
      '5 projects',
      '1 GB storage',
      'Email support',
      'All templates',
      'Version control',
    ],
    limits: {
      projects: 5,
      storage: 1024 * 1024 * 1024, // 1 GB
      collaborators: 2,
    },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29,
    currency: 'USD',
    interval: 'month',
    popular: true,
    features: [
      'Unlimited projects',
      '10 GB storage',
      'Priority support',
      'Advanced AI features',
      'Team collaboration',
      'Custom domains',
    ],
    limits: {
      projects: -1, // unlimited
      storage: 10 * 1024 * 1024 * 1024, // 10 GB
      collaborators: 10,
    },
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    currency: 'USD',
    interval: 'month',
    features: [
      'Unlimited everything',
      '100 GB storage',
      'Dedicated support',
      'Custom AI training',
      'SSO & SAML',
      'SLA guarantee',
      'On-premise option',
    ],
    limits: {
      projects: -1,
      storage: 100 * 1024 * 1024 * 1024, // 100 GB
      collaborators: -1,
    },
  },
];

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json({
      plans: PLANS,
      success: true,
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    );
  }
}
