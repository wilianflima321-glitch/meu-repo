import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import * as crypto from 'crypto';
import { emailService } from '@/lib/email-system';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

// Rate limit: 3 requests per hour per IP (prevent bruteforce enumeration)
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(3, '1 h'),
  analytics: true,
  prefix: 'aethel:forgot-password',
});

/**
 * POST /api/auth/forgot-password
 * Sends password reset email with token
 * 
 * SECURITY: Rate limited to 3 requests/hour per IP
 */
export async function POST(req: NextRequest) {
  try {
    // SECURITY: Rate limiting por IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] ?? 
               req.headers.get('x-real-ip') ?? 
               'anonymous';
    
    const { success, limit, reset, remaining } = await ratelimit.limit(`forgot:${ip}`);
    
    if (!success) {
      return NextResponse.json(
        { error: 'Too many password reset requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          },
        }
      );
    }

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    // Always return success to prevent email enumeration
    const successResponse = NextResponse.json({
      message: 'If an account exists with this email, you will receive a password reset link.',
    });

    if (!user) {
      return successResponse;
    }

    // Check if user uses OAuth (no password to reset)
    if ((user as any).oauthProvider && !user.password) {
      return successResponse;
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Store token with expiration (1 hour)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: resetTokenHash,
        resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
      },
    });

    // Build reset URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    // Send email
    try {
      await emailService.sendTemplate(
        'password_reset',
        { email },
        {
          name: user.name || 'User',
          resetUrl,
          expiryHours: 1,
        }
      );
    } catch (emailError) {
      console.error('Failed to send reset email:', emailError);
      // Still return success to not reveal email existence
    }

    return successResponse;
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
