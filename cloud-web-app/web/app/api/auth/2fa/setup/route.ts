/**
 * 2FA Setup Route
 * POST /api/auth/2fa/setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth-server';
import { twoFactorService } from '@/lib/security/two-factor-auth';
import { prisma } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Authentication
    const decoded = getUserFromRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verifica se 2FA já está ativo
    const status = await twoFactorService.getStatus(decoded.userId);
    if (status.enabled) {
      return NextResponse.json(
        { error: '2FA is already enabled. Disable it first to re-setup.' },
        { status: 400 }
      );
    }

    // Busca email do usuário
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { email: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Gera setup
    const setup = await twoFactorService.setupTwoFactor(
      decoded.userId,
      user.email
    );

    return NextResponse.json({
      success: true,
      qrCode: setup.qrCodeDataURL,
      secret: setup.secretBase32,
      backupCodes: setup.backupCodes,
      message: 'Scan the QR code with your authenticator app, then verify with a code.',
    });

  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
