import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { encryptString, decryptString } from '@/lib/server/crypto';
import { requireAuth } from '@/lib/auth-server';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';

export const runtime = 'nodejs';

const log = createComponentLogger('api/settings/byok');

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const userId = auth.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { byokKey: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isConfigured = !!user.byokKey;

    let decryptedKey: string | null = null;
    if (isConfigured) {
      try {
        const rawKey = user.byokKey!;
        if (rawKey.startsWith('{')) {
          // Fallback to legacy PBKDF2/Vault format
          const { decrypt } = await import('@/lib/security/vault');
          decryptedKey = decrypt(JSON.parse(rawKey));
        } else {
          // Canonical aes-256-gcm format from lib/server/crypto
          decryptedKey = decryptString(rawKey);
        }
      } catch (err) {
        log.warn(`Failed to decrypt BYOK for user ${userId}`, err);
      }
    }

    // Return partial key masking for security
    const maskedKey = decryptedKey
      ? `${decryptedKey.slice(0, 4)}...${decryptedKey.slice(-4)}`
      : null;

    return NextResponse.json({ isConfigured, maskedKey });
  } catch (error) {
    log.error('GET /api/settings/byok failed', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError('Failed to fetch BYOK status');
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const userId = auth.userId;
    const { key } = await req.json();

    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Invalid key' }, { status: 400 });
    }

    // Encrypt the key using encryptString from crypto.ts (canonical format used by AI routes)
    const encryptedKey = encryptString(key.trim());

    await prisma.user.update({
      where: { id: userId },
      data: { byokKey: encryptedKey }
    });

    log.info(`BYOK configured for user ${userId}`);

    return NextResponse.json({ success: true, message: 'BYOK configured successfully' });
  } catch (error) {
    log.error('POST /api/settings/byok failed', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError('Failed to save BYOK');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const userId = auth.userId;

    await prisma.user.update({
      where: { id: userId },
      data: { byokKey: null }
    });

    log.info(`BYOK removed for user ${userId}`);

    return NextResponse.json({ success: true, message: 'BYOK removed successfully' });
  } catch (error) {
    log.error('DELETE /api/settings/byok failed', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError('Failed to remove BYOK');
  }
}
