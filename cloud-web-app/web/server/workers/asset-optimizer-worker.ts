import { createComponentLogger } from '../../lib/observability/logger';
import { prisma } from '../../lib/db';
import { queueManager, QUEUE_NAMES } from '../../lib/queue-system';
import type { AssetJobData } from '../../lib/queue-system.types';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { downloadObjectToFile, putObject } from '../../lib/storage/s3-client';

const logger = createComponentLogger('server.workers.asset-optimizer-worker');
const execAsync = promisify(exec);

async function optimizeImage(filePath: string): Promise<number> {
  logger.info('asset_optimizer.process_image_executing', { filePath });
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat) return 1024 * 500;
  try {
    const newPath = `${filePath}.webp`;
    await execAsync(`cwebp -q 80 "${filePath}" -o "${newPath}"`);
    const optimized = await fs.stat(newPath);
    return optimized.size;
  } catch {
    return stat.size;
  }
}

async function optimizeAudio(filePath: string): Promise<number> {
  logger.info('asset_optimizer.process_audio_executing', { filePath });
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat) return 1024 * 1024 * 2;
  try {
    const newPath = `${filePath}.ogg`;
    await execAsync(`ffmpeg -y -i "${filePath}" -c:a libvorbis -q:a 4 "${newPath}"`);
    const optimized = await fs.stat(newPath);
    return optimized.size;
  } catch {
    return stat.size;
  }
}

async function optimizeModel(filePath: string): Promise<number> {
  logger.info('asset_optimizer.process_model_executing', { filePath });
  const stat = await fs.stat(filePath).catch(() => null);
  if (!stat) return 1024 * 1024 * 15;
  try {
    const newPath = `${filePath}.opt.glb`;
    await execAsync(`gltfpack -i "${filePath}" -o "${newPath}" -cc -tc`);
    const optimized = await fs.stat(newPath);
    return optimized.size;
  } catch {
    return stat.size;
  }
}

async function processAssetJob(assetId: string, storageKey: string) {
  logger.info('asset_optimizer.job_started', { assetId, storageKey });

  const asset = await prisma.asset.findUnique({ where: { id: assetId } });
  if (!asset) throw new Error(`Asset ${assetId} not found`);

  await prisma.asset.update({
    where: { id: assetId },
    data: { status: 'processing' },
  });

  const tmpDir = path.join(process.cwd(), 'tmp', 'assets');
  await fs.mkdir(tmpDir, { recursive: true });
  const localPath = path.join(tmpDir, `${assetId}_raw`);
  const key = storageKey || asset.storagePath || '';
  if (key) {
    const downloaded = await downloadObjectToFile(key, localPath);
    if (!downloaded) {
      logger.warn('asset_optimizer.s3_download_failed', { assetId, key });
    }
  }

  try {
    let optimizedSize = asset.size;
    let optimizedPath = localPath;

    if (asset.type === 'image' || asset.type === 'texture') {
      optimizedSize = await optimizeImage(localPath);
      optimizedPath = `${localPath}.webp`;
    } else if (asset.type === 'audio') {
      optimizedSize = await optimizeAudio(localPath);
      optimizedPath = `${localPath}.ogg`;
    } else if (asset.type === 'model' || asset.type === 'mesh') {
      optimizedSize = await optimizeModel(localPath);
      optimizedPath = `${localPath}.opt.glb`;
    }

    if (key && optimizedPath !== localPath) {
      const optimizedKey = `${key.replace(/\.[^/.]+$/, '')}_optimized${path.extname(optimizedPath)}`;
      const fileBuffer = await fs.readFile(optimizedPath);
      await putObject(optimizedKey, fileBuffer, asset.mimeType || 'application/octet-stream');
    }

    await prisma.asset.update({
      where: { id: asset.id },
      data: {
        status: 'ready',
        size: optimizedSize,
        metadata: {
          ...(typeof asset.metadata === 'object' && asset.metadata !== null ? asset.metadata : {}),
          optimizedAt: new Date().toISOString(),
          storageKey,
        },
      },
    });

    logger.info('asset_optimizer.job_completed', { assetId, optimizedSize });
  } catch (error) {
    await prisma.asset.update({
      where: { id: asset.id },
      data: { status: 'failed' },
    });
    throw error;
  }
}

async function main() {
  logger.info('asset_optimizer.worker_booting', {
    concurrency: process.env.ASSET_WORKER_CONCURRENCY || '2',
  });

  const concurrency = Number(process.env.ASSET_WORKER_CONCURRENCY || '2');
  const worker = await queueManager.registerWorker(
    QUEUE_NAMES.ASSET,
    async (job) => {
      const data = job.data as AssetJobData;
      await processAssetJob(data.assetId, data.storageKey);
      return { assetId: data.assetId, status: 'ready' };
    },
    concurrency,
  );

  if (!worker) {
    logger.warn('asset_optimizer.redis_unavailable_polling_db');
    let isShuttingDown = false;
    const poll = async () => {
      while (!isShuttingDown) {
        try {
          const assets = await prisma.asset.findMany({
            where: { status: 'processing' },
            take: 5,
          });
          for (const asset of assets) {
            await processAssetJob(asset.id, asset.storagePath || '');
          }
        } catch (error) {
          logger.error('asset_optimizer.poll_error', error);
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    };
    void poll();
    const shutdown = () => {
      isShuttingDown = true;
      process.exit(0);
    };
    process.once('SIGINT', shutdown);
    process.once('SIGTERM', shutdown);
    return;
  }

  logger.info('asset_optimizer.worker_ready', { queue: QUEUE_NAMES.ASSET });

  const shutdown = async (signal: string) => {
    logger.info('asset_optimizer.worker_shutdown', { signal });
    await queueManager.shutdown();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('asset_optimizer.fatal', error);
    process.exit(1);
  });
}
