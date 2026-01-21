/**
 * 2FA Status Route
 * GET /api/auth/2fa/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-server';
import { twoFactorService } from '@/lib/security/two-factor-auth';

export async function GET(request: NextRequest) {
  try {
    // Autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const status = await twoFactorService.getStatus(decoded.userId);

    return NextResponse.json({
      twoFactorEnabled: status.enabled,
      verifiedAt: status.verifiedAt,
      backupCodesRemaining: status.backupCodesRemaining,
    });

  } catch (error) {
    console.error('2FA status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
