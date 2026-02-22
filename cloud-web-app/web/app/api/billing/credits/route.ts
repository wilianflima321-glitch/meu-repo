/**
 * Aethel Engine - Credits API
 *
 * Current mode is in-memory preview. This is a partial capability and does
 * not represent canonical billing ledger persistence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { enforceRateLimit } from '@/lib/server/rate-limit';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';

interface CreditData {
  available: number;
  limit: number;
  used: number;
  lastUpdated: string;
}

const CREDIT_WARNING =
  'BILLING_CREDITS_MEMORY_ONLY: preview balance is in-memory and not a persisted billing ledger.';

const userCredits = new Map<string, CreditData>();

function ensureCreditsForUser(userId: string): CreditData {
  const existing = userCredits.get(userId);
  if (existing) return existing;
  const created: CreditData = {
    available: 5000,
    limit: 5000,
    used: 0,
    lastUpdated: new Date().toISOString(),
  };
  userCredits.set(userId, created);
  return created;
}

function capabilityHeaders() {
  return {
    'x-aethel-capability': 'BILLING_CREDITS',
    'x-aethel-capability-status': 'PARTIAL',
    'x-aethel-runtime-mode': 'in-memory-preview',
    'x-aethel-warning': CREDIT_WARNING,
  };
}

export async function GET(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'billing-credits-get',
      key: user.userId,
      max: 120,
      windowMs: 60 * 60 * 1000,
      message: 'Too many credit balance checks. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const credits = ensureCreditsForUser(user.userId);
    return NextResponse.json(
      {
        available: credits.available,
        limit: credits.limit,
        used: credits.used,
        lastUpdated: credits.lastUpdated,
        capability: 'BILLING_CREDITS',
        capabilityStatus: 'PARTIAL',
        runtimeMode: 'in-memory-preview',
        warning: CREDIT_WARNING,
      },
      { headers: capabilityHeaders() }
    );
  } catch (error) {
    console.error('Credits GET error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'billing-credits-post',
      key: user.userId,
      max: 40,
      windowMs: 60 * 60 * 1000,
      message: 'Too many credit mutation attempts. Please wait before trying again.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json().catch(() => ({}));
    const action = typeof body?.action === 'string' ? body.action.trim() : '';
    const amount = Number(body?.amount);

    if (!['use', 'add', 'refund'].includes(action)) {
      return NextResponse.json(
        { error: 'INVALID_ACTION', message: 'action must be one of: use, add, refund.' },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'INVALID_AMOUNT', message: 'amount must be a positive number.' },
        { status: 400 }
      );
    }

    const credits = ensureCreditsForUser(user.userId);
    if (action === 'use') {
      if (amount > credits.available) {
        return NextResponse.json(
          { error: 'INSUFFICIENT_CREDITS', message: 'Insufficient credits.' },
          { status: 400 }
        );
      }
      credits.available -= amount;
      credits.used += amount;
    } else if (action === 'add') {
      credits.available += amount;
      credits.limit += amount;
    } else if (action === 'refund') {
      credits.available += amount;
      credits.used = Math.max(0, credits.used - amount);
    }
    credits.lastUpdated = new Date().toISOString();
    userCredits.set(user.userId, credits);

    return NextResponse.json(
      {
        success: true,
        credits,
        capability: 'BILLING_CREDITS',
        capabilityStatus: 'PARTIAL',
        runtimeMode: 'in-memory-preview',
        warning: CREDIT_WARNING,
      },
      { status: 202, headers: capabilityHeaders() }
    );
  } catch (error) {
    console.error('Credits POST error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
