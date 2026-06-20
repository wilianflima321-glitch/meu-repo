/**
 * Account Data Export (LGPD/GDPR data portability)
 * GET /api/account/export
 *
 * IMPROVE-COMPLIANCE-001: Self-serve, machine-readable export of all
 * personal data the platform holds for the authenticated user.
 *
 * Honesty Gate: this is a REAL backend transaction — it reads the user's
 * own rows from Postgres. Secrets (password, tokens, MFA, BYOK key) are
 * explicitly excluded from the payload.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth-server';
import { apiInternalError } from '@/lib/api-errors';
import { createComponentLogger } from '@/lib/observability/logger';

const routeLogger = createComponentLogger('api/account/export/route');

export const dynamic = 'force-dynamic';

// Scalar user fields that are safe to return. Everything else (password,
// verificationToken, resetToken, mfaSecret, mfaBackupCodes, byokKey,
// adminPermissions) is intentionally omitted.
const SAFE_USER_SELECT = {
  id: true,
  email: true,
  name: true,
  avatar: true,
  role: true,
  plan: true,
  stripeCustomerId: true,
  trialEndsAt: true,
  planVerifiedAt: true,
  storageUsed: true,
  oauthProvider: true,
  emailVerified: true,
  mfaEnabled: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function GET(req: NextRequest) {
  try {
    const auth = getUserFromRequest(req);
    if (!auth) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }
    const userId = auth.userId;

    const profile = await prisma.user.findUnique({
      where: { id: userId },
      select: SAFE_USER_SELECT,
    });

    if (!profile) {
      return NextResponse.json({ error: 'USER_NOT_FOUND' }, { status: 404 });
    }

    // Related records: scalar-only fetch (no secrets live on these models).
    const [
      subscription,
      payments,
      usageBuckets,
      creditLedgerEntries,
      projects,
      chatThreads,
      supportTickets,
      mcpServers,
    ] = await prisma.$transaction([
      prisma.subscription.findUnique({ where: { userId } }),
      prisma.payment.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.usageBucket.findMany({ where: { userId }, orderBy: { windowStart: 'desc' }, take: 1000 }),
      prisma.creditLedgerEntry.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5000 }),
      prisma.project.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.chatThread.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 5000 }),
      prisma.supportTicket.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
      prisma.mcpServer.findMany({ where: { userId } }),
    ]);

    routeLogger.info('account.export.generated', {
      userId,
      projects: projects.length,
      payments: payments.length,
    });

    const payload = {
      meta: {
        format: 'aethel.account-export',
        version: 1,
        generatedAt: new Date().toISOString(),
        note: 'Secrets (password, auth tokens, MFA secret, BYOK key) are excluded by design.',
      },
      profile,
      subscription,
      payments,
      usage: usageBuckets,
      credits: creditLedgerEntries,
      projects,
      chatThreads,
      supportTickets,
      mcpServers,
    };

    const filename = `aethel-account-export-${userId}-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    routeLogger.error('account.export.failed', error);
    return apiInternalError();
  }
}
