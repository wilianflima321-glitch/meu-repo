/**
 * Build Queue Worker
 *
 * Consome a Redis list `build-queue` (LPUSH producer, então BRPOP consumer para FIFO)
 * e atualiza o estado do export em Redis/DB.
 *
 * Observação: este worker gera artefatos reais (ZIP + manifest + assets opcionais),
 * com upload S3/MinIO e URL de download/presign quando disponível.
 */

import { prisma } from '../../lib/db';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import AdmZip from 'adm-zip';
import { generateDownloadUrl, isS3Available, putObject, S3_BUCKET } from '../../lib/storage/s3-client';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const SOURCE_QUEUE = 'build-queue';
const PROCESSING_QUEUE = 'build-queue:processing';
const DELAYED_QUEUE = 'build-queue:delayed';
const PROCESSING_TS_PREFIX = 'build-queue:processing:ts:';
const METRICS_KEY = 'build-queue:metrics';

const MAX_ATTEMPTS = parseInt(process.env.BUILD_QUEUE_MAX_ATTEMPTS || '3', 10);
const PROCESSING_TIMEOUT_MS = parseInt(process.env.BUILD_QUEUE_PROCESSING_TIMEOUT_MS || `${15 * 60 * 1000}`, 10);
const REAPER_INTERVAL_MS = parseInt(process.env.BUILD_QUEUE_REAPER_INTERVAL_MS || `${30 * 1000}`, 10);
const DELAY_BASE_MS = parseInt(process.env.BUILD_QUEUE_RETRY_BASE_DELAY_MS || `${5 * 1000}`, 10);

type BuildQueueMessage = {
  type: string;
  exportId?: string;
  projectId?: string;
  userId?: string;
  platform?: string;
  configuration?: string;
  options?: Record<string, any> | null;
  reservationId?: string;
};

function nowIso() {
  return new Date().toISOString();
}

function safeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}

function appendLog(existing: any, line: string) {
  const logs = Array.isArray(existing?.logs) ? existing.logs.slice(-500) : [];
  logs.push(`[${nowIso()}] ${line}`);
  return logs;
}

function backoffMs(attempt: number) {
  // 1 -> base, 2 -> 2x, 3 -> 4x ... cap 60s
  const ms = DELAY_BASE_MS * Math.pow(2, Math.max(0, attempt - 1));
  return Math.min(ms, 60_000);
}

async function recordWorkerMetric(redis: any, data: { status: 'success' | 'failed'; durationMs?: number; backlog?: number }) {
  try {
    if (data.status === 'success') {
      await redis.hincrby(METRICS_KEY, 'success', 1);
    } else {
      await redis.hincrby(METRICS_KEY, 'failed', 1);
    }
    if (typeof data.durationMs === 'number') {
      await redis.hincrby(METRICS_KEY, 'totalDurationMs', Math.round(data.durationMs));
      await redis.hincrby(METRICS_KEY, 'completed', 1);
    }
    if (typeof data.backlog === 'number') {
      await redis.hset(METRICS_KEY, 'backlog', String(data.backlog));
      await redis.hset(METRICS_KEY, 'updatedAt', new Date().toISOString());
    }
  } catch {
    // ignore metrics errors
  }
}
  
function parseS3Url(value: string): { bucket: string; key: string } | null {
  if (!value?.startsWith('s3://')) return null;
  const withoutScheme = value.replace('s3://', '');
  const firstSlash = withoutScheme.indexOf('/');
  if (firstSlash === -1) return null;
  const bucket = withoutScheme.slice(0, firstSlash);
  const key = withoutScheme.slice(firstSlash + 1);
  if (!bucket || !key) return null;
  return { bucket, key };
}

function getRuntimeTemplatesDir() {
  return process.env.RUNTIME_TEMPLATES_DIR
    ? path.resolve(process.env.RUNTIME_TEMPLATES_DIR)
    : path.resolve(process.cwd(), '..', '..', 'runtime-templates');
}

function addWebTemplate(zip: AdmZip, projectName: string) {
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${projectName}</title>
    <style>body{margin:0;background:#0b0b0b;color:#fff;font-family:Inter,Segoe UI,Arial,sans-serif}#app{padding:24px}</style>
  </head>
  <body>
    <div id="app">
      <h1>${projectName}</h1>
      <p>Runtime Web exportado pelo Aethel Engine.</p>
      <p>Assets estão em <code>/assets</code>.</p>
      <script src="app.js"></script>
    </div>
  </body>
</html>`;
  const js = `console.log('Aethel Web Runtime');`;
  zip.addFile('index.html', Buffer.from(html, 'utf8'));
  zip.addFile('app.js', Buffer.from(js, 'utf8'));
}

function matchesExcludePatterns(filePath: string, patterns: string[]) {
  if (!patterns.length) return false;
  const normalized = filePath.replace(/\\/g, '/');
  return patterns.some((pattern) => {
    const escaped = pattern
      .replace(/[-/\\^$+?.()|[\]{}]/g, '\\$&')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${escaped}$`, 'i');
    return regex.test(normalized);
  });
}

async function runGltfTransformSimplify(input: string, output: string, ratio: number): Promise<void> {
  const cli = process.env.GLTF_TRANSFORM_PATH || 'gltf-transform';
  const safeRatio = Math.min(Math.max(ratio, 0.02), 1);
  await new Promise<void>((resolve, reject) => {
    const args = ['simplify', input, output, '--ratio', safeRatio.toString()];
    const proc = spawn(cli, args);
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`gltf-transform failed with code ${code}`)));
    proc.on('error', reject);
  });
}

type LocalAssetFile = {
  absPath: string;
  relativePath: string;
  size: number;
};

async function listFilesRecursive(rootDir: string, currentDir: string = rootDir): Promise<LocalAssetFile[]> {
  const entries = await readdir(currentDir, { withFileTypes: true });
  const files: LocalAssetFile[] = [];

  for (const entry of entries) {
    const entryPath = path.join(currentDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(rootDir, entryPath));
      continue;
    }
    if (!entry.isFile()) continue;

    const fileStat = await stat(entryPath);
    files.push({
      absPath: entryPath,
      relativePath: path.relative(rootDir, entryPath),
      size: fileStat.size,
    });
  }

  return files;
}

async function getExportAttempts(redis: any, exportId: string): Promise<number> {
  try {
    const raw = await redis.get(`export:${exportId}`);
    if (!raw) return 0;
    const parsed = JSON.parse(raw);
    return typeof parsed?.attempts === 'number' ? parsed.attempts : 0;
  } catch {
    return 0;
  }
}

async function scheduleRetry(redis: any, msg: BuildQueueMessage, rawValue: string, reason: string) {
  if (!msg.exportId) return;

  const attempts = (await getExportAttempts(redis, msg.exportId)) + 1;
  const delayMs = backoffMs(attempts);
  const eta = new Date(Date.now() + delayMs);

  if (attempts >= MAX_ATTEMPTS) {
    await markExportFailed(redis, msg, `Exhausted retries (${attempts}/${MAX_ATTEMPTS}): ${reason}`);
    return;
  }

  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: {
      status: 'queued',
      progress: 0,
      currentStep: `Retry scheduled (attempt ${attempts}/${MAX_ATTEMPTS})`,
      error: reason,
      startedAt: null,
      completedAt: null,
    } as any,
  });

  await updateExportState(redis, msg.exportId, {
    status: 'queued',
    progress: 0,
    currentStep: `Retry scheduled (attempt ${attempts}/${MAX_ATTEMPTS}) in ${Math.round(delayMs / 1000)}s`,
    error: reason,
    attempts,
    retryAt: eta.toISOString(),
  });

  await redis.zadd(DELAYED_QUEUE, Date.now() + delayMs, rawValue);
}

async function markProcessing(redis: any, msg: BuildQueueMessage) {
  if (!msg.exportId) return;
  await redis.set(`${PROCESSING_TS_PREFIX}${msg.exportId}`, `${Date.now()}`, 'PX', PROCESSING_TIMEOUT_MS * 4);
}

async function clearProcessing(redis: any, msg: BuildQueueMessage) {
  if (!msg.exportId) return;
  await redis.del(`${PROCESSING_TS_PREFIX}${msg.exportId}`);
}

async function drainDelayed(redis: any, max = 25) {
  const now = Date.now();
  const due: string[] = await redis.zrangebyscore(DELAYED_QUEUE, 0, now, 'LIMIT', 0, max);
  if (!Array.isArray(due) || due.length === 0) return 0;

  for (const raw of due) {
    try {
      const removed = await redis.zrem(DELAYED_QUEUE, raw);
      if (removed) {
        await redis.lpush(SOURCE_QUEUE, raw);
      }
    } catch {
      // ignore single item
    }
  }

  return due.length;
}

async function reapProcessing(redis: any, maxScan = 50) {
  let items: string[] = [];
  try {
    items = await redis.lrange(PROCESSING_QUEUE, 0, maxScan - 1);
  } catch {
    return;
  }

  if (!Array.isArray(items) || items.length === 0) return;

  const now = Date.now();
  for (const raw of items) {
    let msg: BuildQueueMessage | null = null;
    try {
      msg = JSON.parse(raw);
    } catch {
      continue;
    }

    if (!msg?.exportId) continue;

    let startedAt = 0;
    try {
      const ts = await redis.get(`${PROCESSING_TS_PREFIX}${msg.exportId}`);
      startedAt = ts ? parseInt(ts, 10) : 0;
    } catch {
      startedAt = 0;
    }

    // Se não há timestamp, assume travado.
    if (!startedAt || now - startedAt > PROCESSING_TIMEOUT_MS) {
      console.warn(`[build-queue-worker] Reaper: requeuing stuck job exportId=${msg.exportId}`);
      try {
        await updateExportState(redis, msg.exportId, {
          status: 'queued',
          currentStep: 'Requeued by reaper (processing timeout)',
        });
        await prisma.exportJob.update({
          where: { id: msg.exportId },
          data: {
            status: 'queued',
            currentStep: 'Requeued by reaper (processing timeout)',
            completedAt: null,
          } as any,
        });
      } catch {
        // ignore
      }

      try {
        await redis.lrem(PROCESSING_QUEUE, 1, raw);
        await redis.lpush(SOURCE_QUEUE, raw);
      } catch {
        // ignore
      }

      try {
        await redis.del(`${PROCESSING_TS_PREFIX}${msg.exportId}`);
      } catch {
        // ignore
      }
    }
  }
}

async function updateExportState(
  redis: any,
  exportId: string,
  patch: Partial<Record<string, any>> & { status?: string; progress?: number; currentStep?: string; error?: string }
) {
  const key = `export:${exportId}`;
  let existing: any = null;
  try {
    const raw = await redis.get(key);
    if (raw) existing = JSON.parse(raw);
  } catch {
    // ignore
  }

  const payload = {
    ...(existing || {}),
    ...patch,
    id: exportId,
  };

  if (patch.currentStep) {
    payload.logs = appendLog(existing, patch.currentStep);
  }

  await redis.set(key, JSON.stringify(payload), 'EX', 86400);
  return payload;
}

async function createRedisClient() {
  // ioredis é intencionalmente obrigatório para worker.
  // Mantemos o import dinâmico para mensagens de erro mais claras.
  let IORedis: any;
  try {
    IORedis = await eval('import("ioredis")').then((m: any) => m.default || m);
  } catch {
    throw new Error('Missing dependency: ioredis. Install with `npm i ioredis` (cloud-web-app/web).');
  }

  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return new IORedis(redisUrl, { maxRetriesPerRequest: null });
  }

  const host = process.env.REDIS_HOST || 'localhost';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  const password = process.env.REDIS_PASSWORD || undefined;
  return new IORedis({ host, port, password, maxRetriesPerRequest: null });
}

async function markExportFailed(
  redis: any,
  message: BuildQueueMessage,
  reason: string
): Promise<void> {
  if (!message.exportId) return;

  const key = `export:${message.exportId}`;
  let existing: any = null;
  try {
    const raw = await redis.get(key);
    if (raw) existing = JSON.parse(raw);
  } catch {
    // ignore
  }

  const payload = {
    ...(existing || {}),
    id: message.exportId,
    projectId: message.projectId,
    userId: message.userId,
    platform: message.platform,
    configuration: message.configuration,
    status: 'failed',
    progress: existing?.progress ?? 0,
    currentStep: 'Failed',
    error: reason,
    completedAt: nowIso(),
  };

  payload.logs = appendLog(existing, `Failed: ${reason}`);

  await redis.set(key, JSON.stringify(payload), 'EX', 86400);

  // Persist no DB se existir
  try {
    await prisma.exportJob.update({
      where: { id: message.exportId },
      data: {
        status: 'failed',
        completedAt: new Date(),
      } as any,
    });
  } catch {
    // ignore: pode não existir, ou schema divergir
  }
}

async function processExportJob(redis: any, msg: BuildQueueMessage) {
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

  // Busca metadados do projeto para embutir no ZIP
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
    } as any,
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
    data: { status: 'building', progress: 25, currentStep: 'Building export package (zip)' } as any,
  });

  const zip = new AdmZip();
  const platform = msg.platform || 'source';
  const templatesDir = getRuntimeTemplatesDir();
  const platformWarnings: string[] = [];
  let assetsManifest: any | null = null;

  if (['windows', 'linux', 'macos'].includes(platform)) {
    const templatePath = path.join(templatesDir, platform);
    if (existsSync(templatePath)) {
      zip.addLocalFolder(templatePath, '');
    } else {
      zip.addFile('README_PLATFORM.txt', Buffer.from(`Missing runtime template for ${platform}`, 'utf8'));
      platformWarnings.push(`Missing runtime template for ${platform}. Export contains source + assets only.`);
    }
  } else if (platform === 'web') {
    addWebTemplate(zip, project.name || 'Aethel Project');
    platformWarnings.push('Web runtime is minimal. Use your build pipeline to finalize Web export.');
  } else if (platform === 'ios' || platform === 'android') {
    zip.addFile('README_MOBILE.txt', Buffer.from(`Mobile export (${platform}) - use source + assets to build native project.`, 'utf8'));
    platformWarnings.push(`Mobile export (${platform}) requires native toolchain (Xcode/Android Studio).`);
  } else if (platform === 'source') {
    platformWarnings.push('Source export: includes project files and assets only.');
  }
  zip.addFile(
    'export.json',
    Buffer.from(
      JSON.stringify(
        {
          exportId: msg.exportId,
          projectId: msg.projectId,
          userId: msg.userId,
          platform: msg.platform,
          configuration: msg.configuration,
          options: msg.options || null,
          createdAt: nowIso(),
        },
        null,
        2
      ),
      'utf8'
    )
  );
  zip.addFile(
    'project.json',
    Buffer.from(
      JSON.stringify(
        {
          id: project.id,
          name: project.name,
          ownerId: project.userId,
          settings: project.settings,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt,
        },
        null,
        2
      ),
      'utf8'
    )
  );
  zip.addFile('README.txt', Buffer.from('Aethel Export\n\nArtefato gerado pelo worker interno.\n', 'utf8'));

  // Export de source files (DB) - opcional por limite
  const maxSourceBytes = parseInt(process.env.EXPORT_MAX_SOURCE_BYTES || `${200 * 1024 * 1024}`, 10);
  const maxSourceFiles = parseInt(process.env.EXPORT_MAX_SOURCE_FILES || '5000', 10);
  const excludePatterns = Array.isArray(msg.options?.excludePatterns) ? msg.options?.excludePatterns as string[] : [];
  const sourceManifest: { includedFiles: number; includedBytes: number; skippedFiles: number; skippedBytes: number; warnings: string[] } = {
    includedFiles: 0,
    includedBytes: 0,
    skippedFiles: 0,
    skippedBytes: 0,
    warnings: [],
  };

  try {
    const files = await prisma.file.findMany({
      where: { projectId: msg.projectId },
      select: { path: true, content: true, size: true },
      take: maxSourceFiles + 1,
    });

    if (files.length > maxSourceFiles) {
      sourceManifest.warnings.push(`Source file limit exceeded (${maxSourceFiles}). Extra files skipped.`);
    }

    for (const file of files.slice(0, maxSourceFiles)) {
      if (matchesExcludePatterns(file.path, excludePatterns)) {
        sourceManifest.skippedFiles += 1;
        sourceManifest.skippedBytes += file.size || 0;
        continue;
      }
      const content = file.content || '';
      const buffer = Buffer.from(content, 'utf8');
      const fileSize = file.size || buffer.length;

      if (sourceManifest.includedBytes + fileSize > maxSourceBytes) {
        sourceManifest.skippedFiles += 1;
        sourceManifest.skippedBytes += fileSize;
        sourceManifest.warnings.push(`Skipped source due to size limit: ${file.path}`);
        continue;
      }

      const zipPath = path.posix.join('source', file.path.replace(/^\/+/, ''));
      zip.addFile(zipPath, buffer);
      sourceManifest.includedFiles += 1;
      sourceManifest.includedBytes += fileSize;
    }
  } catch (error: any) {
    sourceManifest.warnings.push(`Failed to export source files: ${error?.message || 'unknown error'}`);
  }

  zip.addFile('source/manifest.json', Buffer.from(JSON.stringify(sourceManifest, null, 2), 'utf8'));

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
      data: { status: 'building', progress: 40, currentStep: 'Collecting assets' } as any,
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
    } catch (error: any) {
      assetsManifest.warnings.push(`Failed to read assets from DB: ${error?.message || 'unknown error'}`);
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
              } catch (error: any) {
                assetsManifest.warnings.push(`Failed to generate LOD for ${relativePosix} (${ratio}): ${error?.message || 'unknown error'}`);
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

  await updateExportState(redis, msg.exportId, { status: 'packaging', progress: 55, currentStep: 'Packaging complete' });
  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: { status: 'packaging', progress: 55, currentStep: 'Packaging complete' } as any,
  });

  // Upload (preferencialmente S3/MinIO). Fallback local: public/exports.
  const s3Ok = await isS3Available();
  let downloadUrl: string | null = null;
  let downloadExpiresAt: Date | null = null;
  let storedUrl: string | null = null;

  await updateExportState(redis, msg.exportId, { status: 'uploading', progress: 75, currentStep: 'Uploading artifact' });
  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: { status: 'uploading', progress: 75, currentStep: 'Uploading artifact' } as any,
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

  await prisma.exportJob.update({
    where: { id: msg.exportId },
    data: {
      status: 'completed',
      progress: 100,
      currentStep: 'Completed',
      completedAt: new Date(),
      downloadUrl: downloadUrl,
      downloadExpiresAt: downloadExpiresAt,
      fileSize: zipBytes.length,
      error: null,
    } as any,
  });

  await updateExportState(redis, msg.exportId, {
    status: 'completed',
    progress: 100,
    currentStep: `Completed (sha256=${hash.slice(0, 12)}...)`,
    downloadUrl,
    downloadExpiresAt: downloadExpiresAt ? downloadExpiresAt.toISOString() : null,
    fileSize: zipBytes.length,
    storedUrl,
  });
}

async function run() {
  const redis = await createRedisClient();

  redis.on('connect', () => console.log('[build-queue-worker] Redis connected'));
  redis.on('error', (err: any) => console.error('[build-queue-worker] Redis error:', err?.message || err));

  console.log('[build-queue-worker] Started. Waiting for jobs on build-queue...');

  let shouldStop = false;
  const requestStop = (signal: string) => {
    if (shouldStop) return;
    shouldStop = true;
    console.log(`[build-queue-worker] Received ${signal}. Draining and shutting down...`);
  };

  process.once('SIGTERM', () => requestStop('SIGTERM'));
  process.once('SIGINT', () => requestStop('SIGINT'));

  // Fila confiável: BRPOPLPUSH move o item para uma fila de processing.
  // Assim, se o worker cair no meio, o job não some do Redis.
  // Implementamos reaper/timeout + delayed retries para evitar cemitério.
  try {
    const stuck = await redis.lrange(PROCESSING_QUEUE, 0, -1);
    if (Array.isArray(stuck) && stuck.length > 0) {
      console.warn(`[build-queue-worker] Startup recovery: requeuing ${stuck.length} job(s) from ${PROCESSING_QUEUE}`);
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

    // 1) Drena jobs atrasados (retry/backoff)
    try {
      await drainDelayed(redis);
    } catch {
      // ignore
    }

    // 2) Reaper periódico do processing
    if (Date.now() - lastReaperAt > REAPER_INTERVAL_MS) {
      lastReaperAt = Date.now();
      try {
        await reapProcessing(redis);
      } catch {
        // ignore
      }
    }

    // timeout curto (segundos) para checar shouldStop
    const value = await redis.brpoplpush(SOURCE_QUEUE, PROCESSING_QUEUE, 5);
    if (!value) continue;

    let msg: BuildQueueMessage;
    try {
      msg = JSON.parse(value);
    } catch {
      console.warn('[build-queue-worker] Invalid JSON payload, skipping');
      // ack: remove da processing para não ficar travado
      try {
        await redis.lrem(PROCESSING_QUEUE, 1, value);
      } catch {
        // ignore
      }
      continue;
    }

    if (msg.type !== 'export') {
      console.log('[build-queue-worker] Unsupported job type:', msg.type);
      // ack
      try {
        await redis.lrem(PROCESSING_QUEUE, 1, value);
      } catch {
        // ignore
      }
      continue;
    }

    console.log('[build-queue-worker] Received export job', msg.exportId);

    try {
      await markProcessing(redis, msg);
    } catch {
      // ignore
    }

    const startedAt = Date.now();
    try {
      await processExportJob(redis, msg);
      await recordWorkerMetric(redis, { status: 'success', durationMs: Date.now() - startedAt, backlog: await redis.llen(SOURCE_QUEUE) });
    } catch (err: any) {
      const reason = err?.message || 'Unknown error while processing export';
      console.error('[build-queue-worker] Export processing failed:', reason);

      // Retry controlado com backoff.
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
  console.log('[build-queue-worker] Stopped');
}

run().catch((err) => {
  console.error('[build-queue-worker] Fatal:', err);
  process.exit(1);
});
