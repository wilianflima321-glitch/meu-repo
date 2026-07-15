import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/auth-server';
import { generateDownloadUrl } from '@/lib/storage/s3-client';
import { enforceRouteRateLimit, RENDER_JOB_READ_RATE_LIMIT } from '@/lib/server/route-rate-limit';

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } },
) {
  try {
    const user = requireAuth(req);

    const rateLimited = await enforceRouteRateLimit({
      req,
      capability: 'RENDER_JOB_ARTIFACT',
      route: '/api/render/jobs/[jobId]/artifact',
      config: RENDER_JOB_READ_RATE_LIMIT,
      identifier: user.userId,
    });
    if (rateLimited) return rateLimited;

    const job = await prisma.renderJob.findUnique({ where: { id: params.jobId } });
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }
    if (job.requestedBy !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (job.status !== 'completed' || !job.outputUrl) {
      return NextResponse.json(
        { error: 'Artifact not ready', status: job.status, progress: job.progress },
        { status: 409 },
      );
    }

    const format = req.nextUrl.searchParams.get('format') || job.receiptRef?.split('/').pop()?.replace('-manifest.json', '') || 'export';
    let downloadUrl = job.outputUrl;
    if (job.receiptRef?.startsWith('exports/')) {
      const signed = await generateDownloadUrl(job.receiptRef, {
        fileName: `${job.id}.${format}.json`,
      });
      if (signed) downloadUrl = signed;
    }

    return NextResponse.json({
      jobId: job.id,
      format,
      outputUrl: downloadUrl,
      storageKey: job.receiptRef,
      completedAt: job.completedAt,
    });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
