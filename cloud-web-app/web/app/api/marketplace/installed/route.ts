/**
 * Installed extensions for the current user.
 * GET /api/marketplace/installed
 *
 * Returns the extension IDs the authenticated user has installed, read from
 * the same Prisma `InstalledExtension` table that `POST /api/marketplace/install`
 * writes to. Lets the marketplace UI reflect real install state on load
 * (closes the install → persist → reflect loop honestly).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/marketplace/installed/route');

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req);
    if (!auth) {
      // Public marketplace page calls this best-effort; logged-out users simply
      // get an empty set rather than an error banner.
      return NextResponse.json({ installed: [] });
    }

    const rows = await prisma.installedExtension.findMany({
      where: { userId: auth.userId },
      select: { extensionId: true },
    });

    return NextResponse.json({ installed: rows.map((row) => row.extensionId) });
  } catch (error) {
    routeLogger.error('marketplace.installed.failed', error);
    return apiInternalError();
  }
}
