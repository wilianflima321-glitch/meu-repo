import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { generateTokenWithRole } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';
import { emailService, type EmailResult } from '@/lib/email-system';
import { enforceTurnstile } from '@/lib/server/turnstile-guard';

export const dynamic = 'force-dynamic';

const routeLogger = createComponentLogger('api.auth.register');

function buildAppUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl.replace(/\/$/, '')}${path}`;
}

function createHashedToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('hex');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

function readStringField(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === 'string' ? value.trim() : '';
}

async function sendRegistrationEmails(params: {
  email: string;
  name: string;
  verifyUrl: string;
}): Promise<void> {
  const { email, name, verifyUrl } = params;
  const dashboardUrl = buildAppUrl('/dashboard');
  const docsUrl = buildAppUrl('/docs');

  const deliveries = await Promise.allSettled<EmailResult>([
    emailService.sendTemplate(
      'welcome',
      { email, name },
      {
        name,
        dashboardUrl,
        docsUrl,
      },
      { tags: ['auth', 'welcome'] },
    ),
    emailService.sendTemplate(
      'verify_email',
      { email, name },
      {
        name,
        verifyUrl,
        expiryHours: 24,
      },
      { tags: ['auth', 'verify-email'] },
    ),
  ]);

  deliveries.forEach((delivery, index) => {
    const template = index === 0 ? 'welcome' : 'verify_email';
    if (delivery.status === 'rejected') {
      routeLogger.warn('registration.email.delivery.rejected', {
        template,
        email,
        error: delivery.reason instanceof Error ? delivery.reason.message : String(delivery.reason),
      });
      return;
    }

    if (!delivery.value.success) {
      routeLogger.warn('registration.email.delivery.failed', {
        template,
        email,
        provider: delivery.value.provider,
        error: delivery.value.error,
      });
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const turnstile = await enforceTurnstile(req, body, 'register');
    if (!turnstile.ok) return turnstile.response;

    const email = readStringField(body, 'email').toLowerCase();
    const password = readStringField(body, 'password');
    const name = readStringField(body, 'name');

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists' },
        { status: 409 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // New users start with a factual 14-day Starter trial, then fall back to Free.
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const verification = createHashedToken();
    const verificationTokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        plan: 'starter_trial',
        trialEndsAt,
        verificationToken: verification.hash,
        verificationTokenExpiry,
      },
    });

    const displayName = user.name || user.email.split('@')[0] || 'builder';
    const verifyUrl = buildAppUrl(
      `/verify-email?token=${verification.token}&email=${encodeURIComponent(user.email)}`,
    );

    await sendRegistrationEmails({
      email: user.email,
      name: displayName,
      verifyUrl,
    });

    // Generate JWT token (real-or-fail). JWT-only (no server sessions).
    const token = generateTokenWithRole(user.id, user.email, user.role || 'user', user.plan || undefined);

    // Return user data
    const response = NextResponse.json({
      access_token: token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        trialEndsAt: trialEndsAt.toISOString(),
        emailVerified: user.emailVerified,
      },
      emailVerificationRequired: true,
    }, { status: 201 });

    // Set cookie for middleware (mesmo comportamento do login)
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    routeLogger.error('Register error', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
