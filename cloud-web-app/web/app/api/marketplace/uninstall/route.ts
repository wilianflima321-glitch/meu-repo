import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { createComponentLogger } from '@/lib/observability/logger';
import { isBuiltinExtension } from '@/lib/marketplace/catalog';

const routeLogger = createComponentLogger('api/marketplace/uninstall/route');

interface UninstallRequest {
  extensionId: string;
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
		const user = requireAuth(request);
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
    if (isBuiltinExtension(extensionId)) {
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
    routeLogger.error('Extension uninstallation failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return NextResponse.json(
      { success: false, error: 'Uninstallation failed' },
      { status: 500 }
    );
  }
}
