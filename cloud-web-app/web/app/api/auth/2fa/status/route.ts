/**
 * 2FA Status Route
 * GET /api/auth/2fa/status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-server';
import { twoFactorService } from '@/lib/security/two-factor-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Authentication
    const decoded = getUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
