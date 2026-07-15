import { prisma } from '../../web/lib/db';
import { queueProjectExport } from '../../web/lib/queue-system';

export async function enqueueExportJob(params: {
  format: string;
  projectId: string;
  userId: string;
  quality?: string;
  sceneIds?: string[];
}): Promise<string> {
  const job = await prisma.renderJob.create({
    data: {
      projectId: params.projectId,
      requestedBy: params.userId,
      status: 'queued',
      provider: 'internal',
      receiptRef: params.format,
    },
  });

  const queued = await queueProjectExport({
    jobId: job.id,
    format: params.format,
    projectId: params.projectId,
    userId: params.userId,
    quality: params.quality,
    sceneIds: params.sceneIds,
  });

  if (!queued) {
    await prisma.renderJob.update({
      where: { id: job.id },
      data: {
        status: 'failed',
        errorMessage: 'Export queue unavailable (Redis/BullMQ not configured)',
      },
    });
  }

  return job.id;
}
