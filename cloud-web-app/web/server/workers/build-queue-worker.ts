/** Build queue worker for Redis FIFO exports, artifacts, manifests and optional S3 upload. */

import { prisma } from '../../lib/db';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { generateDownloadUrl, isS3Available, putObject, S3_BUCKET } from '../../lib/storage/s3-client';
import { existsSync } from 'node:fs';
import { createComponentLogger } from '@/lib/observability/logger'
import {
  buildMeasuredExportBundleEvidence,
  mergeExportJobCompressionOptions,
} from '@/lib/hub/export-bundle-measurement'
import { addPackageScaffold } from './build-queue-worker.package'
import { clearProcessing, drainDelayed, markProcessing, reapProcessing, scheduleRetry, shouldRunReaper } from './build-queue-worker-queue'
import { createRedisClient } from './build-queue-worker-redis'
import { markExportFailed, updateExportState } from './build-queue-worker-state'
import { addSourceFilesToExport } from './build-queue-worker.source-export'
import { getErrorMessage, getRuntimeTemplatesDir, listFilesRecursive, nowIso, parseS3Url, recordWorkerMetric, runGltfTransformSimplify, safeFileName } from './build-queue-worker.utils'
import { PROCESSING_QUEUE, SOURCE_QUEUE, type AssetManifest, type BuildQueueMessage, type RedisClient } from './build-queue-worker-contracts'
import type { Prisma } from '@prisma/client'

const log = createComponentLogger('workers/build-queue-worker')

async function processExportJob(redis: RedisClient, msg: BuildQueueMessage) {
  if (!msg.exportId || !msg.projectId || !msg.userId) {
    throw new Error('Invalid export job payload (missing exportId/projectId/userId)');
  }

  // Idempotência básica: se já completou, não refaz.
  const existingDb = await prisma.exportJob.findUnique({
    where: { id: msg.exportId },
    select: { status: true, downloadUrl: true, projectId: true, userId: true },
  });

  if (!existingDb || existingDb.projectId !== msg.projectId || existingDb.userId !== msg.userId) {
    throw new Error('ExportJob not found or mismatched ownership');
  }

  if (existingDb.status === 'completed') {
    await updateExportState(redis, msg.exportId, {
      status: 'completed',
      progress: 100,
      currentStep: 'Already completed (idempotent skip)',
      downloadUrl: existingDb.downloadUrl,
    });
    return;
  }

  if (existingDb.status === 'failed') {
    // evita loop infinito de retry automática sem estratégia
    await updateExportState(redis, msg.exportId, {
      status: 'failed',
      currentStep: 'Skipped: job already failed (manual retry required)',
    });
    return;
  }

  // Fetch project metadata to embed in the ZIP.
  const project = await prisma.project.findUnique({
    where: { id: msg.projectId },
    select: { id: true, name: true, userId: true, settings: true, updatedAt: true, createdAt: true },
  });

  if (!project) {
    throw new Error('Project not found');
  }

  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: {
      status: 'preparing',
      progress: 5,
      currentStep: 'Preparing export',
      startedAt: new Date(),
      error: null,
    },
  });
  await updateExportState(redis, msg.exportId, { status: 'preparing', progress: 5, currentStep: 'Preparing export' });

  // Gera ZIP mínimo
  const exportBaseName = safeFileName(`${project.name || 'project'}_${msg.exportId}`) || msg.exportId;
  const zipFileName = `${exportBaseName}.zip`;
  const tmpDir = process.env.TMPDIR || process.env.TMP || os.tmpdir();
  const tmpOutDir = path.join(tmpDir, 'aethel-exports');
  await mkdir(tmpOutDir, { recursive: true });
  const tmpZipPath = path.join(tmpOutDir, zipFileName);

  await updateExportState(redis, msg.exportId, { status: 'building', progress: 25, currentStep: 'Building export package (zip)' });
  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: { status: 'building', progress: 25, currentStep: 'Building export package (zip)' },
  });

  const zip = new AdmZip();
  const platform = msg.platform || 'source';
  const templatesDir = getRuntimeTemplatesDir();
  const platformWarnings = addPackageScaffold(zip, {
    msg,
    project: {
      id: project.id,
      name: project.name,
      userId: project.userId,
      settings: project.settings,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    platform,
    templatesDir,
  });
  let assetsManifest: AssetManifest | null = null;


  const sourceManifest = await addSourceFilesToExport(zip, msg);


  const includeAssets = msg.options?.includeAssets ?? (process.env.EXPORT_INCLUDE_ASSETS === 'true');
  if (includeAssets) {
    const maxTotalBytes = parseInt(process.env.EXPORT_MAX_ASSET_BYTES || `${1024 * 1024 * 1024}`, 10);
    const maxSingleBytes = parseInt(process.env.EXPORT_MAX_SINGLE_ASSET_BYTES || `${200 * 1024 * 1024}`, 10);
    const maxPresignAssets = parseInt(process.env.EXPORT_MAX_PRESIGN_ASSETS || '250', 10);
    const presignExpiresIn = parseInt(process.env.EXPORT_PRESIGN_EXPIRES_IN || '3600', 10);
    const generateLods = process.env.EXPORT_GENERATE_LODS === 'true';
    const lodRatios = (process.env.EXPORT_LOD_LEVELS || '0.5,0.25,0.1')
      .split(',')
      .map(value => parseFloat(value.trim()))
      .filter(value => Number.isFinite(value) && value > 0 && value < 1);
    const lodMaxSourceBytes = parseInt(process.env.EXPORT_LOD_MAX_SOURCE_BYTES || `${200 * 1024 * 1024}`, 10);
    const lodMaxFiles = parseInt(process.env.EXPORT_LOD_MAX_FILES || '500', 10);

    await updateExportState(redis, msg.exportId, { status: 'building', progress: 40, currentStep: 'Collecting assets' });
    await prisma.exportJob.update({
      where: { id: msg.exportId },
      data: { status: 'building', progress: 40, currentStep: 'Collecting assets' },
    });

    assetsManifest = {
      projectId: msg.projectId,
      generatedAt: nowIso(),
      limits: {
        maxTotalBytes,
        maxSingleBytes,
      },
      totals: {
        includedFiles: 0,
        includedBytes: 0,
        skippedFiles: 0,
        skippedBytes: 0,
      },
      dbAssets: [] as Array<{ id: string; name: string; url: string | null; storagePath?: string | null; type: string; size: number; mimeType?: string | null; downloadUrl?: string | null; downloadExpiresAt?: string | null }>,
      localFiles: [] as Array<{ path: string; size: number; sha256: string; lods?: Array<{ path: string; ratio: number; size: number; sha256: string }> }>,
      warnings: [] as string[],
    };

    try {
      const dbAssets = await prisma.asset.findMany({
        where: { projectId: msg.projectId },
        select: { id: true, name: true, url: true, storagePath: true, type: true, size: true, mimeType: true },
      });
      const s3Available = await isS3Available();
      let presignCount = 0;

      for (const asset of dbAssets) {
        const entry: { id: string; name: string; url: string | null; storagePath?: string | null; type: string; size: number; mimeType?: string | null; downloadUrl?: string | null; downloadExpiresAt?: string | null } = {
          id: asset.id,
          name: asset.name,
          url: asset.url || null,
          storagePath: asset.storagePath || null,
          type: asset.type,
          size: asset.size || 0,
          mimeType: asset.mimeType || undefined,
        };

        const parsed = asset.storagePath
          ? { bucket: S3_BUCKET, key: asset.storagePath }
          : parseS3Url(asset.url || '');
        if (s3Available && parsed && parsed.bucket === S3_BUCKET) {
          if (presignCount < maxPresignAssets) {
            const signed = await generateDownloadUrl(parsed.key, {
              expiresIn: presignExpiresIn,
              fileName: asset.name,
              contentType: asset.mimeType || undefined,
            });
            if (signed) {
              entry.downloadUrl = signed;
              entry.downloadExpiresAt = new Date(Date.now() + presignExpiresIn * 1000).toISOString();
              presignCount += 1;
            }
          } else if (presignCount === maxPresignAssets) {
            assetsManifest.warnings.push(`Presign limit reached (${maxPresignAssets}). Remaining S3 assets skipped.`);
            presignCount += 1;
          }
        }

        assetsManifest.dbAssets.push(entry);
      }
    } catch (error: unknown) {
      assetsManifest.warnings.push(`Failed to read assets from DB: ${getErrorMessage(error)}`);
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', msg.projectId);
    const fallbackUploadsDir = path.join(process.cwd(), 'public', 'uploads');
    let lodFilesGenerated = 0;
    const lodTempBase = path.join(tmpOutDir, `lod-${msg.exportId}`);

    const targetUploadsDir = existsSync(uploadsDir) ? uploadsDir : (existsSync(fallbackUploadsDir) ? fallbackUploadsDir : null);

    if (targetUploadsDir) {
      const files = await listFilesRecursive(targetUploadsDir);
      for (const file of files) {
        if (file.size > maxSingleBytes) {
          assetsManifest.totals.skippedFiles += 1;
          assetsManifest.totals.skippedBytes += file.size;
          assetsManifest.warnings.push(`Skipped large file: ${file.relativePath} (${file.size} bytes)`);
          continue;
        }
        if (assetsManifest.totals.includedBytes + file.size > maxTotalBytes) {
          assetsManifest.totals.skippedFiles += 1;
          assetsManifest.totals.skippedBytes += file.size;
          assetsManifest.warnings.push(`Skipped due to size limit: ${file.relativePath}`);
          continue;
        }

        const buffer = await readFile(file.absPath);
        const sha256 = crypto.createHash('sha256').update(new Uint8Array(buffer)).digest('hex');
        const relativePosix = file.relativePath.split(path.sep).join('/');
        const zipPath = path.posix.join('assets', relativePosix);
        zip.addFile(zipPath, buffer);

        const entry: { path: string; size: number; sha256: string; lods?: Array<{ path: string; ratio: number; size: number; sha256: string }> } = {
          path: relativePosix,
          size: file.size,
          sha256,
        };

        if (generateLods && lodRatios.length > 0 && lodFilesGenerated < lodMaxFiles) {
          const ext = path.extname(file.absPath).toLowerCase();
          if ((ext === '.glb' || ext === '.gltf') && file.size <= lodMaxSourceBytes) {
            const baseName = path.basename(file.absPath, ext);
            await mkdir(lodTempBase, { recursive: true });
            entry.lods = [];

            for (let i = 0; i < lodRatios.length; i += 1) {
              if (lodFilesGenerated >= lodMaxFiles) break;
              const ratio = lodRatios[i];
              const lodFileName = `${baseName}_LOD${i + 1}${ext}`;
              const lodTempPath = path.join(lodTempBase, `${crypto.randomUUID()}_${lodFileName}`);

              try {
                await runGltfTransformSimplify(file.absPath, lodTempPath, ratio);
                const lodBuffer = await readFile(lodTempPath);
                const lodSize = lodBuffer.length;

                if (assetsManifest.totals.includedBytes + lodSize > maxTotalBytes) {
                  assetsManifest.warnings.push(`Skipped LOD due to size limit: ${relativePosix} (${ratio})`);
                  continue;
                }

                const lodSha = crypto.createHash('sha256').update(new Uint8Array(lodBuffer)).digest('hex');
                const lodZipPath = path.posix.join('assets', 'lods', relativePosix.replace(ext, ''), lodFileName);
                zip.addFile(lodZipPath, lodBuffer);

                entry.lods.push({
                  path: lodZipPath,
                  ratio,
                  size: lodSize,
                  sha256: lodSha,
                });
                assetsManifest.totals.includedFiles += 1;
                assetsManifest.totals.includedBytes += lodSize;
                lodFilesGenerated += 1;
              } catch (error: unknown) {
                assetsManifest.warnings.push(`Failed to generate LOD for ${relativePosix} (${ratio}): ${getErrorMessage(error)}`);
              }
            }
          }
        }

        assetsManifest.localFiles.push(entry);
        assetsManifest.totals.includedFiles += 1;
        assetsManifest.totals.includedBytes += file.size;
      }
    } else {
      assetsManifest.warnings.push('No local uploads directory found for project assets.');
    }

    zip.addFile('assets/manifest.json', Buffer.from(JSON.stringify(assetsManifest, null, 2), 'utf8'));
  }

  zip.addFile(
    'export-manifest.json',
    Buffer.from(
      JSON.stringify(
        {
          exportId: msg.exportId,
          projectId: msg.projectId,
          platform,
          configuration: msg.configuration || null,
          generatedAt: nowIso(),
          hashAlgorithm: 'sha256',
          source: sourceManifest,
          assets: assetsManifest ? assetsManifest.totals : null,
          warnings: platformWarnings,
        },
        null,
        2
      ),
      'utf8'
    )
  );

  zip.writeZip(tmpZipPath);
  const zipBytes = await readFile(tmpZipPath);
  const hash = crypto.createHash('sha256').update(zipBytes as unknown as Uint8Array).digest('hex');
  const measured = buildMeasuredExportBundleEvidence({ artifactByteLength: zipBytes.length });
  if (!measured.ok) {
    throw new Error(measured.reason);
  }

  await updateExportState(redis, msg.exportId, { status: 'packaging', progress: 55, currentStep: 'Packaging complete' });
  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: { status: 'packaging', progress: 55, currentStep: 'Packaging complete' },
  });

  // Upload to S3/MinIO when available; otherwise write to public/exports for local dev.
  const s3Ok = await isS3Available();
  let downloadUrl: string | null = null;
  let downloadExpiresAt: Date | null = null;
  let storedUrl: string | null = null;

  await updateExportState(redis, msg.exportId, { status: 'uploading', progress: 75, currentStep: 'Uploading artifact' });
  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: { status: 'uploading', progress: 75, currentStep: 'Uploading artifact' },
  });

  if (s3Ok) {
    const key = `exports/${msg.projectId}/${msg.exportId}/${zipFileName}`;
    const put = await putObject(key, zipBytes, 'application/zip');
    if (!put.ok) {
      throw new Error('Failed to upload to S3/MinIO');
    }

    storedUrl = `s3://${S3_BUCKET}/${key}`;
    downloadUrl = await generateDownloadUrl(key, {
      expiresIn: 3600,
      fileName: zipFileName,
      contentType: 'application/zip',
    });
    downloadExpiresAt = new Date(Date.now() + 3600 * 1000);
  } else {
    // Fallback local: grava em public/exports do app (compatível com dev no Windows/macOS/Linux).
    const localOutDir = process.env.EXPORT_LOCAL_PUBLIC_DIR
      ? path.resolve(process.env.EXPORT_LOCAL_PUBLIC_DIR)
      : path.join(process.cwd(), 'public', 'exports');
    await mkdir(localOutDir, { recursive: true });
    const localPath = path.join(localOutDir, zipFileName);
    await writeFile(localPath, zipBytes as unknown as Uint8Array);
    storedUrl = `/exports/${zipFileName}`;
    downloadUrl = storedUrl;
    downloadExpiresAt = null;
  }

  const existingRow = await prisma.exportJob.findUnique({
    where: { id: msg.exportId },
    select: { options: true },
  });
  const existingOptions =
    existingRow?.options && typeof existingRow.options === 'object' && !Array.isArray(existingRow.options)
      ? (existingRow.options as Record<string, unknown>)
      : msg.options && typeof msg.options === 'object'
        ? (msg.options as Record<string, unknown>)
        : null;
  const options = mergeExportJobCompressionOptions(existingOptions, measured.evidence);

  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: {
      status: 'completed',
      progress: 100,
      currentStep: 'Completed',
      completedAt: new Date(),
      downloadUrl: downloadUrl,
      downloadExpiresAt: downloadExpiresAt,
      fileSize: measured.evidence.fileSize,
      options: options as Prisma.InputJsonValue,
      error: null,
    },
  });

  await updateExportState(redis, msg.exportId, {
    status: 'completed',
    progress: 100,
    currentStep: `Completed (sha256=${hash.slice(0, 12)}...; ${measured.evidence.reason})`,
    downloadUrl,
    downloadExpiresAt: downloadExpiresAt ? downloadExpiresAt.toISOString() : null,
    fileSize: measured.evidence.fileSize,
    demoBundleBytes: measured.evidence.demoBundleBytes,
    compressionMandatePassed: measured.evidence.compressionMandatePassed,
    storedUrl,
  });
}

async function run() {
  const redis = await createRedisClient();

  redis.on('connect', () => log.info('[build-queue-worker] Redis connected'));
  redis.on('error', (err: unknown) => log.error('[build-queue-worker] Redis error:', getErrorMessage(err)));

  log.info('[build-queue-worker] Started. Waiting for jobs on build-queue...');

  let shouldStop = false;
  const requestStop = (signal: string) => {
    if (shouldStop) return;
    shouldStop = true;
    log.info(`[build-queue-worker] Received ${signal}. Draining and shutting down...`);
  };

  process.once('SIGTERM', () => requestStop('SIGTERM'));
  process.once('SIGINT', () => requestStop('SIGINT'));

  // Fila confiável: BRPOPLPUSH move o item para uma fila de processing.
  // Assim, se o worker cair no meio, o job não some do Redis.
  // Implementamos reaper/timeout + delayed retries para evitar cemitério.
  try {
    const stuck = await redis.lrange(PROCESSING_QUEUE, 0, -1);
    if (Array.isArray(stuck) && stuck.length > 0) {
      log.warn(`[build-queue-worker] Startup recovery: requeuing ${stuck.length} job(s) from ${PROCESSING_QUEUE}`);
      for (const item of stuck) {
        try {
          await redis.lrem(PROCESSING_QUEUE, 1, item);
          await redis.lpush(SOURCE_QUEUE, item);
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  let lastReaperAt = 0;

  // Loop infinito com timeout para permitir shutdown gracioso.
  for (;;) {
    if (shouldStop) break;

    // 1) Drain delayed retry/backoff jobs.
    try {
      await drainDelayed(redis);
    } catch {
      // ignore
    }

    // 2) Reaper periódico do processing
    if (shouldRunReaper(lastReaperAt)) {
      lastReaperAt = Date.now();
      try {
        await reapProcessing(redis);
      } catch {
        // ignore
      }
    }

    // Short timeout keeps graceful shutdown responsive.
    const value = await redis.brpoplpush(SOURCE_QUEUE, PROCESSING_QUEUE, 5);
    if (!value) continue;

    let msg: BuildQueueMessage;
    try {
      msg = JSON.parse(value);
    } catch {
      log.warn('[build-queue-worker] Invalid JSON payload, skipping');
      // ack: remove da processing para não ficar travado
      try {
        await redis.lrem(PROCESSING_QUEUE, 1, value);
      } catch {
        // ignore
      }
      continue;
    }

    if (msg.type !== 'export') {
      log.info('[build-queue-worker] Unsupported job type:', msg.type);
      // ack
      try {
        await redis.lrem(PROCESSING_QUEUE, 1, value);
      } catch {
        // ignore
      }
      continue;
    }

    log.info('[build-queue-worker] Received export job', msg.exportId);

    try {
      await markProcessing(redis, msg);
    } catch {
      // ignore
    }

    const startedAt = Date.now();
    try {
      await processExportJob(redis, msg);
      await recordWorkerMetric(redis, { status: 'success', durationMs: Date.now() - startedAt, backlog: await redis.llen(SOURCE_QUEUE) });
    } catch (err: unknown) {
      const reason = getErrorMessage(err) || 'Unknown error while processing export';
      log.error('[build-queue-worker] Export processing failed:', reason);

      // Controlled retry with exponential backoff.
      try {
        await scheduleRetry(redis, msg, value, reason);
      } catch {
        // Se falhar ao agendar retry, marca failed para não perder visibilidade.
        await markExportFailed(redis, msg, reason);
      }
      await recordWorkerMetric(redis, { status: 'failed', durationMs: Date.now() - startedAt, backlog: await redis.llen(SOURCE_QUEUE) });
    }

    // ack
    try {
      await redis.lrem(PROCESSING_QUEUE, 1, value);
      await clearProcessing(redis, msg);
    } catch {
      // ignore
    }
  }

  try {
    await redis.quit();
  } catch {
    // ignore
  }
  log.info('[build-queue-worker] Stopped');
}

run().catch((err: unknown) => {
  log.error('[build-queue-worker] Fatal:', getErrorMessage(err));
  process.exit(1);
});
