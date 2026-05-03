import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateTokenWithRole } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';

export const dynamic = 'force-dynamic';

const routeLogger = createComponentLogger('api.auth.register');

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();

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
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        plan: 'starter_trial',
        trialEndsAt,
      },
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
      },
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
