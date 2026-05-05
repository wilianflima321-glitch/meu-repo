import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  enforceTurnstile,
  getTurnstileClientIp,
  readTurnstileTokenFromBody,
  type TurnstileRequestLike,
} from '@/lib/server/turnstile-guard';

function request(headers: Record<string, string> = {}): TurnstileRequestLike {
  const values = new Headers(headers);
  return {
    headers: {
      get: (name: string) => values.get(name),
    },
  };
}

function resetTurnstileEnv(): void {
  delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY;
  delete process.env.TURNSTILE_SECRET_KEY;
  delete process.env.CF_TURNSTILE_SECRET_KEY;
  delete process.env.AETHEL_REQUIRE_TURNSTILE;
}

describe('turnstile guard', () => {
  afterEach(() => {
    resetTurnstileEnv();
    vi.unstubAllGlobals();
  });

  it('reads every supported token alias from auth request bodies', () => {
    expect(readTurnstileTokenFromBody({ turnstileToken: ' token-a ' })).toBe('token-a');
    expect(readTurnstileTokenFromBody({ cfTurnstileResponse: 'token-b' })).toBe('token-b');
    expect(readTurnstileTokenFromBody({ 'cf-turnstile-response': 'token-c' })).toBe('token-c');
    expect(readTurnstileTokenFromBody({ turnstileToken: '   ' })).toBeNull();
    expect(readTurnstileTokenFromBody(null)).toBeNull();
  });

  it('keeps local development open when Turnstile is not configured', async () => {
    const decision = await enforceTurnstile(request(), { email: 'builder@aethel.dev' }, 'login');

    expect(decision).toEqual({ ok: true, status: 'skipped', reason: 'not_configured' });
  });

  it('fails closed when production requires Turnstile but no secret is configured', async () => {
    process.env.AETHEL_REQUIRE_TURNSTILE = 'true';

    const decision = await enforceTurnstile(request(), { turnstileToken: 'token' }, 'register');

    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe('TURNSTILE_NOT_CONFIGURED');
      expect(decision.response.status).toBe(503);
    }
  });

  it('requires a token before login/register when a secret exists', async () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret';

    const decision = await enforceTurnstile(request(), { email: 'bot@example.com' }, 'register');

    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe('TURNSTILE_REQUIRED');
      expect(decision.response.status).toBe(403);
    }
  });

  it('verifies successful challenges with the client IP for anti-abuse telemetry', async () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret';
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ success: true, action: 'login' }), { status: 200 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const decision = await enforceTurnstile(
      request({ 'x-forwarded-for': '203.0.113.10, 198.51.100.20' }),
      { turnstileToken: 'human-token' },
      'login',
    );

    expect(decision).toEqual({ ok: true, status: 'verified' });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const body = init.body as URLSearchParams;
    expect(body.get('secret')).toBe('secret');
    expect(body.get('response')).toBe('human-token');
    expect(body.get('remoteip')).toBe('203.0.113.10');
  });

  it('rejects failed or mismatched Turnstile challenges', async () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'secret';
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            success: false,
            'error-codes': ['timeout-or-duplicate'],
          }),
          { status: 200 },
        ),
      ),
    );

    const decision = await enforceTurnstile(request(), { turnstileToken: 'stale-token' }, 'login');

    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe('TURNSTILE_FAILED');
      expect(decision.response.status).toBe(403);
      await expect(decision.response.json()).resolves.toMatchObject({
        code: 'TURNSTILE_FAILED',
        errors: ['timeout-or-duplicate'],
      });
    }
  });

  it('prefers Cloudflare client IP headers before generic proxy headers', () => {
    expect(
      getTurnstileClientIp(
        request({
          'cf-connecting-ip': '192.0.2.10',
          'x-forwarded-for': '203.0.113.10, 198.51.100.20',
        }),
      ),
    ).toBe('192.0.2.10');
  });
});
