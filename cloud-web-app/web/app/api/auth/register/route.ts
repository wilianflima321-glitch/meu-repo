import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateTokenWithRole } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as Record<string, unknown>));
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name : null;

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-register',
      key: getRequestIp(req),
      max: 5,
      windowMs: 60 * 60 * 1000,
      message: 'Too many registration attempts from this IP. Please try again later.',
    });
    if (rateLimitResponse) return rateLimitResponse;

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

    // Create user - Novo usuário começa em trial do Starter (7 dias)
    // Após trial, deve escolher um plano pago
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        plan: 'starter_trial', // Trial de 7 dias do Starter
      },
    });

    // Generate JWT token (real-or-fail). JWT-only (no server sessions).
    const token = generateTokenWithRole(user.id, user.email, (user as any).role || 'user');

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
    console.error('Register error:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
