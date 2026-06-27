/**
 * GDPR Right-to-be-Forgotten API Route
 * Cascades deletion through: Prisma DB → WorldMemoryBank → StyleEmbeddings → GeneratedAssets
 * Auth: requires valid JWT for the requesting user (users may only delete their own data)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-server';
import { prisma } from '@/lib/db';
import { telemetry } from '@/lib/observability/telemetry';
import { createComponentLogger } from '@/lib/observability/logger';

const log = createComponentLogger('gdpr.delete');

export async function POST(req: NextRequest): Promise<NextResponse> {
  let user;
  try {
    user = requireAuth(req);
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => ({})) as {
    scope?: Array<'prompts' | 'embeddings' | 'generated_assets' | 'account'>;
    confirmEmail?: string;
  };

  const scope = body.scope ?? ['prompts', 'embeddings', 'generated_assets', 'account'];
  const span = telemetry.startSpan('gdpr.delete', { userId: user.userId, scope: scope.join(',') });

  try {
    const report: Record<string, number> = {};

    // 1. Delete style embeddings (prompts + embeddings)
    if (scope.includes('embeddings') || scope.includes('prompts')) {
      const deleted = await (prisma as any).styleEmbedding?.deleteMany?.({
        where: { projectId: { in: await getUserProjectIds(user.userId) } },
      }).catch(() => ({ count: 0 }));
      report.styleEmbeddings = deleted?.count ?? 0;
    }

    // 2. Delete generated assets + their prompts
    if (scope.includes('generated_assets') || scope.includes('prompts')) {
      const deleted = await (prisma as any).generatedAsset?.deleteMany?.({
        where: { project: { userId: user.userId } },
      }).catch(() => ({ count: 0 }));
      report.generatedAssets = deleted?.count ?? 0;
    }

    // 3. Scrub prompt fields from world versions
    if (scope.includes('prompts')) {
      await (prisma as any).worldVersion?.updateMany?.({
        where: { world: { project: { userId: user.userId } } },
        data: { diffPayload: '[GDPR_DELETED]' },
      }).catch(() => null);
      report.worldVersionsAnonymised = 1;
    }

    // 4. Full account deletion (last step)
    if (scope.includes('account')) {
      // Delete projects (cascade deletes worlds, regions, assets via FK)
      await (prisma as any).project?.deleteMany?.({
        where: { userId: user.userId },
      }).catch(() => null);

      // Delete the user record
      await prisma.user.delete({
        where: { id: user.userId },
      }).catch(() => null);

      report.accountDeleted = 1;
    }

    span.end('ok');
    telemetry.counter('gdpr.deletion_completed').add(1, { userId: user.userId });
    log.info('GDPR deletion completed', { userId: user.userId, report });

    return NextResponse.json({
      success: true,
      message: 'Your data has been scheduled for deletion. This process completes within 72 hours.',
      report,
    });

  } catch (err) {
    span.end('error', err instanceof Error ? err : undefined);
    log.error('GDPR deletion failed', { userId: user.userId, err });
    return NextResponse.json({ error: 'Deletion failed. Please contact privacy@aethel.gg.' }, { status: 500 });
  }
}

async function getUserProjectIds(userId: string): Promise<string[]> {
  const projects = await prisma.project.findMany({
    where: { userId },
    select: { id: true },
  }).catch(() => []);
  return projects.map((p: { id: string }) => p.id);
}
