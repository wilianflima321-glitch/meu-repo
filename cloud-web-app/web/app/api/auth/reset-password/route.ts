import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { enforceRateLimit, getRequestIp } from '@/lib/server/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/reset-password
 * Resets password using token from forgot-password email
 */
export async function POST(req: NextRequest) {
  try {
    const rateLimitResponse = await enforceRateLimit({
      scope: 'auth-reset-password-post',
      key: getRequestIp(req),
      max: 20,
      windowMs: 60 * 60 * 1000,
      message: 'Too many password reset attempts. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;

    const { token, email, password } = await req.json();

    if (!token || !email || !password) {
      return NextResponse.json(
        { error: 'Token, email, and new password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Hash the provided token to compare with stored hash
    const tokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        email,
        resetToken: tokenHash,
        resetTokenExpiry: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    // JWT-only auth: no server sessions to revoke.
    // Existing tokens remain valid until expiry.

    return NextResponse.json({
      message: 'Password has been reset successfully. Please log in with your new password.',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
