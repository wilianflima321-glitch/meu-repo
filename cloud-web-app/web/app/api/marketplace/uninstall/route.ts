import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { enforceRateLimit } from '@/lib/server/rate-limit';

interface UninstallRequest {
  extensionId: string;
  projectId?: string;
}

// Extensões built-in (sempre disponíveis)
const BUILTIN_EXTENSION_IDS = [
  'aethel.blueprint-editor',
  'aethel.niagara-vfx',
  'aethel.ai-assistant',
  'aethel.landscape-editor',
  'aethel.physics-engine',
  'aethel.multiplayer',
];

export async function POST(request: NextRequest) {
  try {
    const user = requireAuth(request);
    const rateLimitResponse = await enforceRateLimit({
      scope: 'marketplace-uninstall-post',
      key: user.userId,
      max: 180,
      windowMs: 60 * 60 * 1000,
      message: 'Too many extension uninstall requests. Please wait before retrying.',
    });
    if (rateLimitResponse) return rateLimitResponse;
    await requireFeatureForUser(user.userId, 'marketplace');

    const body: UninstallRequest = await request.json();
		const { extensionId, projectId } = body;

    if (!extensionId) {
      return NextResponse.json(
        { success: false, error: 'Extension ID is required' },
        { status: 400 }
      );
    }

    // Built-in não desinstala (sempre disponível)
    if (BUILTIN_EXTENSION_IDS.includes(extensionId)) {
      return NextResponse.json({
        success: true,
        uninstalled: false,
        extensionId,
        builtin: true,
        message: 'Built-in extension is always available',
      });
    }

    // Remove registro de instalação (idempotente)
    await prisma.installedExtension.deleteMany({
      where: {
        userId: user.userId,
        extensionId,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'extension_uninstall',
        resource: extensionId,
        metadata: { projectId },
      },
    });

    return NextResponse.json(
      {
			success: true,
			uninstalled: true,
			extensionId,
      },
    );
  } catch (error) {
    console.error('Extension uninstallation failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Uninstallation failed' },
      { status: 500 }
    );
  }
}
