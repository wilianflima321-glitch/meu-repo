import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as crypto from 'crypto';
import { emailService } from '@/lib/email-system';
import { verifyToken } from '@/lib/auth-server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/verify-email
 * Verifies email using token from verification email
 */
export async function POST(req: NextRequest) {
  try {
    const { token, email } = await req.json();

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      );
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid verification token
    const user = await prisma.user.findFirst({
      where: {
        email,
        verificationToken: tokenHash,
        verificationTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired verification token' },
        { status: 400 }
      );
    }

    // Mark email as verified
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationToken: null,
        verificationTokenExpiry: null,
      },
    });

    return NextResponse.json({
      message: 'Email verified successfully!',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/verify-email
 * Resends verification email to authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    // Get user from auth token
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  req.cookies.get('token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const authUser = verifyToken(token);
    if (!authUser) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: authUser.userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if ((user as any).emailVerified) {
      return NextResponse.json({
        message: 'Email is already verified',
      });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenHash = crypto
      .createHash('sha256')
      .update(verificationToken)
      .digest('hex');

    // Store token with 24h expiration
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: verificationTokenHash,
        verificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });

    // Build verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${verificationToken}&email=${encodeURIComponent(user.email)}`;

    // Send email
    await emailService.sendTemplate(
      'verify_email',
      { email: user.email },
      {
        name: user.name || 'User',
        verifyUrl,
        expiryHours: 24,
      }
    );

    return NextResponse.json({
      message: 'Verification email sent!',
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
