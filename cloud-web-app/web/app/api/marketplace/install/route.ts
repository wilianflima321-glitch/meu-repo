import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { requireFeatureForUser } from '@/lib/entitlements';
import { apiErrorToResponse, apiInternalError } from '@/lib/api-errors';
import { prisma } from '@/lib/db';
import { createComponentLogger } from '@/lib/observability/logger';
import { getCatalogExtension, isBuiltinExtension } from '@/lib/marketplace/catalog';
import { evaluatePaidInstallGate } from '@/lib/marketplace/paid-install-gate';
import { enforceRouteRateLimit, MARKETPLACE_WRITE_RATE_LIMIT } from '@/lib/server/route-rate-limit';

const routeLogger = createComponentLogger('api/marketplace/install/route');

interface InstallRequest {
  extensionId: string;
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const rateLimited = await enforceRouteRateLimit({
      req: request,
      capability: 'MARKETPLACE_INSTALL',
      route: '/api/marketplace/install',
      config: MARKETPLACE_WRITE_RATE_LIMIT,
    });
    if (rateLimited) return rateLimited;

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

    // Built-in extensions are always available; nothing to persist.
    if (isBuiltinExtension(extensionId)) {
      return NextResponse.json({
        success: true,
        installed: true,
        extensionId,
        message: 'Built-in extension is always available',
        builtin: true,
      });
    }

    // Wave H honesty — paid MarketplaceItem cannot free-ride install.
    const paidGate = await evaluatePaidInstallGate({
      userId: user.userId,
      extensionId,
    });
    if (!paidGate.allowed) {
      routeLogger.info('marketplace.install.purchase_required', {
        extensionId,
        code: paidGate.code,
        priceCents: paidGate.priceCents,
      });
      return NextResponse.json(
        {
          success: false,
          error: paidGate.code,
          message: paidGate.message,
          priceCents: paidGate.priceCents,
          itemId: paidGate.itemId,
          checkoutHint: 'POST /api/marketplace/checkout with itemId',
        },
        { status: 402 }
      );
    }

    // Resolve the install target against the canonical catalog (curated slugs)
    // first, then fall back to a DB-backed MarketplaceItem (creator listings).
    const catalogExtension = getCatalogExtension(extensionId);
    let resolvedName = catalogExtension?.displayName ?? null;
    let resolvedVersion = catalogExtension?.version ?? '1.0.0';

    if (!catalogExtension) {
      const marketplaceItem = await prisma.marketplaceItem.findFirst({
        where: { id: extensionId },
      });

      if (!marketplaceItem) {
        return NextResponse.json(
          { success: false, error: 'Extension not found' },
          { status: 404 }
        );
      }

      resolvedName = marketplaceItem.title;
      // Only DB-backed listings track a download counter.
      await prisma.marketplaceItem.update({
        where: { id: extensionId },
        data: { downloads: { increment: 1 } },
      });
    }

    // Persist install (idempotent), keyed by the canonical extension id.
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

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: 'extension_install',
        resource: extensionId,
        metadata: { projectId, paidGate: paidGate.reason },
      },
    });

    return NextResponse.json({
      success: true,
      installed: true,
      extensionId,
      extension: {
        id: extensionId,
        name: resolvedName,
        version: resolvedVersion,
      },
    });
  } catch (error) {
    routeLogger.error('Extension installation failed:', error);
    const mapped = apiErrorToResponse(error);
    if (mapped) return mapped;
    return apiInternalError();
  }
}
