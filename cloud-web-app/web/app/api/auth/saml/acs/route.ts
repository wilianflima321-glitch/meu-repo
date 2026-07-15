import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { prisma } from '@/lib/db';
import { generateTokenWithRole } from '@/lib/auth-server';
import { getSamlReadiness } from '@/lib/security/saml';
import {
  decodeSamlResponsePayload,
  hashAssertionId,
  parseSamlAssertion,
  validateSamlAssertion,
} from '@/lib/security/saml-acs';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('api/auth/saml/acs');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function redirectWithToken(token: string, relayState?: string | null) {
  const destination = relayState && relayState.startsWith('/') ? relayState : '/dashboard';
  const url = new URL(destination, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
  url.searchParams.set('token', token);
  return NextResponse.redirect(url.toString());
}

export async function POST(request: NextRequest) {
  const readiness = getSamlReadiness();
  const form = await request.formData().catch(() => null);
  const samlResponse = form?.get('SAMLResponse');
  const relayState = form?.get('RelayState');

  if (!samlResponse || typeof samlResponse !== 'string') {
    return NextResponse.json(
      {
        error: 'SAML_RESPONSE_REQUIRED',
        message: 'The SAML ACS endpoint requires a SAMLResponse form field from the identity provider.',
      },
      { status: 400 },
    );
  }

  try {
    const xml = decodeSamlResponsePayload(samlResponse);
    const assertion = parseSamlAssertion(xml);
    const validation = validateSamlAssertion(assertion, xml);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.code }, { status: validation.status });
    }

    const assertionHash = hashAssertionId(assertion.assertionId);
    const existing = await prisma.samlAssertionReplayGuard.findUnique({
      where: { assertionId: assertionHash },
    });
    if (existing) {
      return NextResponse.json({ error: 'SAML_ASSERTION_REPLAYED' }, { status: 409 });
    }

    const expiresAt =
      assertion.notOnOrAfter ?? new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.samlAssertionReplayGuard.create({
      data: {
        assertionId: assertionHash,
        expiresAt,
      },
    });

    const email = assertion.email.toLowerCase();
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      const hashedPassword = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);
      user = await prisma.user.create({
        data: {
          email,
          name: assertion.nameId,
          password: hashedPassword,
          emailVerified: true,
          oauthProvider: 'saml',
          oauthProviderId: assertion.nameId,
          plan: 'enterprise',
        },
      });
    }

    const token = generateTokenWithRole(user.id, user.email, user.role || 'user', user.plan || undefined);
    const relay = typeof relayState === 'string' ? relayState : null;

    log.info('saml.acs_success', { userId: user.id, email: user.email, acsUrl: readiness.acsUrl });

    const response = redirectWithToken(token, relay);
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    log.error('saml.acs_failed', error);
    return NextResponse.json(
      {
        error: 'SAML_ACS_FAILED',
        message: error instanceof Error ? error.message : 'Failed to process SAML assertion.',
        configured: readiness.configured,
        acsUrl: readiness.acsUrl,
      },
      { status: 401 },
    );
  }
}
