/**
 * Two-Factor Authentication API Routes
 * 
 * POST /api/auth/2fa/setup - Iniciar setup de 2FA
 * POST /api/auth/2fa/verify - Verificar e ativar 2FA
 * POST /api/auth/2fa/validate - Validar código no login
 * POST /api/auth/2fa/disable - Desativar 2FA
 * POST /api/auth/2fa/backup-codes - Regenerar códigos de backup
 * GET /api/auth/2fa/status - Status do 2FA
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { getUserFromRequest } from '@/lib/auth-server';
import { twoFactorService } from '@/lib/security/two-factor-auth';
import { prisma } from '@/lib/db';

// ============================================================================
// SCHEMAS
// ============================================================================

const VerifySchema = z.object({
  code: z.string().length(6).regex(/^\d{6}$/),
});

const ValidateSchema = z.object({
  userId: z.string(),
  code: z.string().min(6).max(9), // 6 dígitos ou código de backup (XXXX-XXXX)
  sessionToken: z.string(),
});

const DisableSchema = z.object({
  code: z.string().min(6).max(9),
  password: z.string().min(1),
});

// ============================================================================
// POST - Setup 2FA
// ============================================================================

export async function POST(request: NextRequest) {
  const { pathname } = new URL(request.url);
  
  // Roteamento baseado no path
  if (pathname.endsWith('/setup')) {
    return handleSetup(request);
  }
  if (pathname.endsWith('/verify')) {
    return handleVerify(request);
  }
  if (pathname.endsWith('/validate')) {
    return handleValidate(request);
  }
  if (pathname.endsWith('/disable')) {
    return handleDisable(request);
  }
  if (pathname.endsWith('/backup-codes')) {
    return handleBackupCodes(request);
  }

  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// ============================================================================
// GET - Status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const decoded = await authenticateRequest(request);
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

// ============================================================================
// HANDLERS
// ============================================================================

async function handleSetup(request: NextRequest) {
  try {
    const decoded = await authenticateRequest(request);
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

async function handleVerify(request: NextRequest) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = VerifySchema.parse(body);

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

async function handleValidate(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, code, sessionToken } = ValidateSchema.parse(body);

    // Verifica sessão temporária (criada após senha correta, antes do 2FA)
    const session = await prisma.pendingTwoFactorSession.findUnique({
      where: { token: sessionToken },
    });

    if (!session || session.userId !== userId || session.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Invalid or expired session' },
        { status: 401 }
      );
    }

    // Valida código 2FA
    const result = await twoFactorService.verify(userId, code);

    if (!result.valid) {
      // Incrementa tentativas falhas
      await prisma.pendingTwoFactorSession.update({
        where: { token: sessionToken },
        data: { attempts: { increment: 1 } },
      });

      // Verifica limite de tentativas
      if (session.attempts >= 4) {
        await prisma.pendingTwoFactorSession.delete({
          where: { token: sessionToken },
        });
        return NextResponse.json(
          { error: 'Too many failed attempts. Please login again.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: 'Invalid code', attemptsRemaining: 5 - session.attempts - 1 },
        { status: 400 }
      );
    }

    // Remove sessão pendente
    await prisma.pendingTwoFactorSession.delete({
      where: { token: sessionToken },
    });

    // Aviso se usou código de backup
    let warning: string | undefined;
    if (result.usedBackupCode) {
      warning = `Backup code used. ${result.remainingBackupCodes} codes remaining.`;
    }

    return NextResponse.json({
      success: true,
      validated: true,
      warning,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('2FA validate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleDisable(request: NextRequest) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code, password } = DisableSchema.parse(body);

    // Verifica senha primeiro
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { password: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 400 }
      );
    }

    // Desativa 2FA
    const success = await twoFactorService.disable(decoded.userId, code);

    if (!success) {
      return NextResponse.json(
        { error: 'Invalid 2FA code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Two-factor authentication has been disabled.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request', details: error.issues },
        { status: 400 }
      );
    }

    console.error('2FA disable error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function handleBackupCodes(request: NextRequest) {
  try {
    const decoded = await authenticateRequest(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { code } = VerifySchema.parse(body);

    const newCodes = await twoFactorService.regenerateBackupCodes(
      decoded.userId,
      code
    );

    if (!newCodes) {
      return NextResponse.json(
        { error: 'Invalid 2FA code. Backup codes cannot be used to regenerate.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      backupCodes: newCodes,
      message: 'New backup codes generated. Store them securely.',
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid code format', details: error.issues },
        { status: 400 }
      );
    }

    console.error('2FA backup codes error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// HELPERS
// ============================================================================

async function authenticateRequest(request: NextRequest) {
  return getUserFromRequest(request)
}
