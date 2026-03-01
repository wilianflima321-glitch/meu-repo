/**
 * 2FA Verify Route
 * POST /api/auth/2fa/verify
 * 
 * Verifica o código e ativa 2FA após setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserFromRequest } from '@/lib/auth-server';
import { twoFactorService } from '@/lib/security/two-factor-auth';

const VerifySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/, 'Code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const decoded = getUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validação
    const body = await request.json();
    const { code } = VerifySchema.parse(body);

    // Verifica e ativa
    const success = await twoFactorService.verifyAndEnable(decoded.userId, code);

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid code. Please check your authenticator app and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been enabled successfully.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid code format', details: error.issues },
        { status: 400 }
      );
    }

    console.error('2FA verify error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
