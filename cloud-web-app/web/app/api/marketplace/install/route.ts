import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';

interface InstallRequest {
  extensionId: string;
  projectId?: string;
}

// Lista de extensões built-in (sempre disponíveis)
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
    await requireFeatureForUser(user.userId, 'marketplace');

    const body: InstallRequest = await request.json();
    const { extensionId, projectId } = body;

    if (!extensionId) {
      return NextResponse.json(
        { success: false, error: 'Extension ID is required' },
        { status: 400 }
      );
    }

    // Extensões built-in são sempre instaladas automaticamente
    if (BUILTIN_EXTENSION_IDS.includes(extensionId)) {
      return NextResponse.json({
        success: true,
        installed: true,
        extensionId,
        message: 'Built-in extension is always available',
        builtin: true,
      });
    }

    // Verifica se extensão existe no marketplace
    const marketplaceItem = await prisma.marketplaceItem.findFirst({
      where: { id: extensionId },
    });

    if (!marketplaceItem) {
      return NextResponse.json(
        { success: false, error: 'Extension not found' },
        { status: 404 }
      );
    }

    // Incrementa contador de downloads
    await prisma.marketplaceItem.update({
      where: { id: extensionId },
      data: { downloads: { increment: 1 } },
    });

    // Persiste instalação (idempotente)
    await prisma.installedExtension.upsert({
      where: {
        userId_extensionId: {
          userId: user.userId,
          extensionId,
        },
      },
      update: {
        projectId: projectId ?? null,
      },
      create: {
        userId: user.userId,
        extensionId,
        projectId: projectId ?? null,
      },
    });

    // Log de auditoria
    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'extension_install',
        resource: extensionId,
        metadata: { projectId },
      },
    });

    return NextResponse.json({
      success: true,
      installed: true,
      extensionId,
      extension: {
        id: marketplaceItem.id,
        name: marketplaceItem.title,
        version: '1.0.0',
      },
    });
  } catch (error) {
    console.error('Extension installation failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
