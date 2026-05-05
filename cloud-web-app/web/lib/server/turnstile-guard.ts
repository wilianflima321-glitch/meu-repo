import { NextResponse } from 'next/server';

import { createComponentLogger } from '@/lib/observability/logger';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const logger = createComponentLogger('server.turnstile-guard');

export const TURNSTILE_RESPONSE_KEYS = [
  'turnstileToken',
  'cfTurnstileResponse',
  'cf-turnstile-response',
] as const;

export type TurnstileAction = 'login' | 'register' | 'checkout' | 'api';

export interface TurnstileRequestLike {
  headers: {
    get(name: string): string | null;
  };
}

interface TurnstileVerifyResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
  'error-codes'?: string[];
}

export type TurnstileDecision =
  | {
      ok: true;
      status: 'verified' | 'skipped';
      reason?: 'not_configured';
    }
  | {
      ok: false;
      response: NextResponse;
      code:
        | 'TURNSTILE_NOT_CONFIGURED'
        | 'TURNSTILE_REQUIRED'
        | 'TURNSTILE_FAILED'
        | 'TURNSTILE_UNAVAILABLE';
    };

type TurnstileFailureCode = Extract<TurnstileDecision, { ok: false }>['code'];

function getTurnstileSecret(): string | null {
  const value =
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY ||
    process.env.TURNSTILE_SECRET_KEY ||
    process.env.CF_TURNSTILE_SECRET_KEY;

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function requiresConfiguredTurnstile(): boolean {
  return ['1', 'true', 'yes', 'on'].includes(
    (process.env.AETHEL_REQUIRE_TURNSTILE || '').toLowerCase(),
  );
}

export function readTurnstileTokenFromBody(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return null;
  }

  const record = body as Record<string, unknown>;
  for (const key of TURNSTILE_RESPONSE_KEYS) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

export function getTurnstileClientIp(req: TurnstileRequestLike): string | null {
  const cfConnectingIp = req.headers.get('cf-connecting-ip')?.trim();
  if (cfConnectingIp) return cfConnectingIp;

  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (forwardedFor) return forwardedFor;

  const realIp = req.headers.get('x-real-ip')?.trim();
  return realIp || null;
}

function denied(
  status: number,
  code: TurnstileFailureCode,
  message: string,
  action: TurnstileAction,
  detail?: Record<string, unknown>,
): Extract<TurnstileDecision, { ok: false }> {
  return {
    ok: false,
    code,
    response: NextResponse.json(
      {
        error: message,
        code,
        action,
        ...detail,
      },
      { status },
    ),
  };
}

export async function enforceTurnstile(
  req: TurnstileRequestLike,
  body: unknown,
  action: TurnstileAction,
): Promise<TurnstileDecision> {
  const secret = getTurnstileSecret();

  if (!secret) {
    if (requiresConfiguredTurnstile()) {
      logger.error('turnstile.required_but_not_configured', { action });
      return denied(
        503,
        'TURNSTILE_NOT_CONFIGURED',
        'Turnstile is required but not configured',
        action,
      );
    }

    return { ok: true, status: 'skipped', reason: 'not_configured' };
  }

  const token = readTurnstileTokenFromBody(body);
  if (!token) {
    return denied(403, 'TURNSTILE_REQUIRED', 'Human verification is required', action);
  }

  const params = new URLSearchParams({
    secret,
    response: token,
  });

  const remoteIp = getTurnstileClientIp(req);
  if (remoteIp) {
    params.set('remoteip', remoteIp);
  }

  try {
    const verifyResponse = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    if (!verifyResponse.ok) {
      logger.warn('turnstile.verify.unavailable', {
        action,
        status: verifyResponse.status,
      });
      return denied(502, 'TURNSTILE_UNAVAILABLE', 'Human verification is unavailable', action);
    }

    const payload = (await verifyResponse.json()) as TurnstileVerifyResponse;
    if (!payload.success) {
      logger.warn('turnstile.verify.failed', {
        action,
        errors: payload['error-codes'] || [],
      });
      return denied(403, 'TURNSTILE_FAILED', 'Human verification failed', action, {
        errors: payload['error-codes'] || [],
      });
    }

    if (payload.action && payload.action !== action) {
      logger.warn('turnstile.verify.action_mismatch', {
        expected: action,
        received: payload.action,
      });
      return denied(403, 'TURNSTILE_FAILED', 'Human verification failed', action);
    }

    return { ok: true, status: 'verified' };
  } catch (error) {
    logger.error('turnstile.verify.exception', error, { action });
    return denied(502, 'TURNSTILE_UNAVAILABLE', 'Human verification is unavailable', action);
  }
}
