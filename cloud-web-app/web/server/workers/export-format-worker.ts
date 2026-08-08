import { createComponentLogger } from '../../lib/observability/logger';
import { prisma } from '../../lib/db';
import { queueManager, QUEUE_NAMES } from '../../lib/queue-system';
import type { ExportJobData } from '../../lib/queue-system.types';
import { generateDownloadUrl, putObject } from '../../lib/storage/s3-client';
import { exportSceneToGLTF, exportSceneToUSDA, packGLB, type ExportScene, type ExportMesh } from '@aethel/export/gltf-exporter';
import {
  bakeDownVirtualizedMesh,
  bakedDownMaterial,
  isSerializedVirtualizedMesh,
} from '@aethel/export/nanite-bakedown';
import { buildPublishPipelinePlan, type PublishTarget } from '@/lib/production/publish-pipeline-orchestrator';
import { stampWebExportJobFromCookArtifact } from '@/lib/hub/stamp-export-bundle-measurement';
import { runPublishPackagingStage } from './export-format-worker.publish';

const log = createComponentLogger('worker.export-format');

function readOptionalPositiveInt(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

const GEOMETRY_FORMATS = new Set(['glb', 'gltf', 'usdz', 'usda', 'usd']);
const PUBLISH_TARGETS = new Set<PublishTarget>(['web-static', 'native-tauri']);

/**
 * Builds the best `ExportScene` currently obtainable server-side for a
 * project. The live Aethel scene graph (`ViewportSceneObject[]`) is
 * client/collaboration state today (see `components/viewport/viewport-model.ts`)
 * with no server-queryable persistence of baked mesh geometry — there is no
 * general `SceneNode`/mesh-vertex table this worker can read. Fabricating
 * fake geometry here would be worse than being explicit about the gap, so
 * for assets with no baked geometry this emits a structurally real,
 * spec-valid transform-only node (correct glTF/USD documents that any DCC
 * tool can open) with an `aethel_asset_id` extra so a future pass can
 * hydrate real geometry per node without changing the export contract.
 *
 * Nanite bake-down (Missão Executiva 5 — Compatibility Defense): when an
 * `Asset.metadata.naniteVirtualizedMesh` payload IS present (written by a
 * meshlet-cooking pipeline — see `nanite-bakedown.ts` for the exact JSON
 * contract), this worker now round-trips it for real: `bakeDownVirtualizedMesh`
 * flattens the finest LOD's virtual clusters into one traditional high-poly
 * mesh with standard PBR material, which IS a mesh interop tools can render
 * — not just `meshletCount` informational metadata. Assets without that
 * payload keep the honest transform-only placeholder behavior above; this is
 * not claimed to be lossless parity with the live editor scene (skins/blend
 * shapes per-asset still require a scene-graph serialization endpoint that
 * does not exist yet).
 */
async function buildProjectExportScene(projectId: string, sceneIds: string[]): Promise<ExportScene> {
  const [project, meshAssets] = await Promise.all([
    prisma.project.findUnique({ where: { id: projectId }, select: { name: true } }),
    prisma.asset.findMany({
      where: {
        projectId,
        type: { in: ['mesh', 'model', 'prefab'] },
        ...(sceneIds.length > 0 ? { id: { in: sceneIds } } : {}),
      },
      select: { id: true, name: true, path: true, type: true, metadata: true },
      take: 500,
    }),
  ]);

  const meshes: ExportMesh[] = [];
  const materials: ExportScene['materials'] = [];
  let bakedMaterialIndex: number | undefined;

  const nodes = meshAssets.map((asset) => {
    const baseName = asset.name || asset.path || asset.id;
    const naniteSource = (asset.metadata as Record<string, unknown> | null)?.naniteVirtualizedMesh;

    if (isSerializedVirtualizedMesh(naniteSource)) {
      try {
        if (bakedMaterialIndex === undefined) {
          materials.push(bakedDownMaterial());
          bakedMaterialIndex = materials.length - 1;
        }
        const baked = bakeDownVirtualizedMesh(naniteSource, { materialIndex: bakedMaterialIndex });
        const meshIndex = meshes.length;
        meshes.push({ ...baked, name: baseName });
        log.info('export_format.nanite_baked_down', {
          assetId: asset.id,
          meshletCount: baked.meshletCount,
          triangleCount: baked.indices.length / 3,
        });
        return { name: baseName, meshIndex, children: [] };
      } catch (error) {
        log.warn('export_format.nanite_bakedown_failed', { assetId: asset.id, error: error instanceof Error ? error.message : String(error) });
        // Falls through to the transform-only placeholder below — a failed
        // bake must never abort the whole export job.
      }
    }

    // No mesh payload — real, correctly-typed glTF node, transform-only.
    return { name: baseName, children: [] };
  });

  return {
    name: project?.name || 'Aethel Export',
    materials,
    skins: [],
    meshes,
    nodes,
  };
}

async function processExportJob(data: ExportJobData) {
  const jobId = data.jobId;
  log.info('export_format.processing', { jobId, format: data.format });

  await prisma.renderJob.update({
    where: { id: jobId },
    data: { status: 'processing', progress: 25 },
  });

  try {
    return await processExportJobInner(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await prisma.renderJob
      .update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: message.slice(0, 2000),
          completedAt: new Date(),
        },
      })
      .catch(() => undefined);
    throw error;
  }
}

async function processExportJobInner(data: ExportJobData) {
  const jobId = data.jobId;
  const format = (data.format || 'glb').toLowerCase();
  const isGeometryFormat = GEOMETRY_FORMATS.has(format);

  let storageKey: string;
  let contentType: string;
  let fileExtension: string = format;
  let body: Buffer | string;
  let cookPackByteLength: number | null = null;
  let bakeReceiptRef: string | null = null;
  let lightmapBytes: number | null = null;

  if (isGeometryFormat) {
    const scene = await buildProjectExportScene(data.projectId, data.sceneIds ?? []);

    if (format === 'glb' || format === 'gltf') {
      const { gltf, bin } = exportSceneToGLTF(scene);
      const glb = packGLB(gltf, bin);
      body = Buffer.from(glb);
      contentType = 'model/gltf-binary';
      fileExtension = 'glb';
    } else {
      const usda = exportSceneToUSDA(scene);
      body = usda;
      contentType = 'model/vnd.usd';
      fileExtension = format === 'usdz' ? 'usda' : format; // Real USDZ (zip container) packing is a follow-up; .usda text is valid USD today.
    }

    storageKey = `exports/${data.projectId}/${jobId}/export.${fileExtension}`;
  } else if (PUBLISH_TARGETS.has(format as PublishTarget)) {
    // One-Click Deploy — Cook & Build Pipeline stages 2-6. Asset cooking
    // (stage 1) stays behind the same governed Studio Local dispatch every
    // other native-tool invocation uses; see `export-format-worker.publish.ts`.
    const target = format as PublishTarget;
    const plan = buildPublishPipelinePlan({
      projectId: data.projectId,
      target,
      quality: (data.quality as 'ai-draft' | 'curated-marketplace' | 'studio-local-optimized' | 'cloud-render-grade' | undefined) ?? 'studio-local-optimized',
      requestedByUserId: data.userId,
      multiplayer: {
        enabled: Boolean(data.options?.multiplayerEnabled),
        relayUrl: typeof data.options?.multiplayerRelayUrl === 'string' ? data.options.multiplayerRelayUrl : undefined,
      },
      monetization: {
        enabled: Boolean(data.options?.stripePublishableKey),
        stripePublishableKey: typeof data.options?.stripePublishableKey === 'string' ? data.options.stripePublishableKey : undefined,
        checkoutEndpoint: typeof data.options?.billingCheckoutEndpoint === 'string' ? data.options.billingCheckoutEndpoint : undefined,
      },
    });

    bakeReceiptRef =
      typeof data.options?.bakeReceiptRef === 'string' ? data.options.bakeReceiptRef : null;
    lightmapBytes = readOptionalPositiveInt(data.options?.lightmapBytes);
    const artifact = await runPublishPackagingStage(jobId, data.projectId, plan, {
      bakeReceiptRef,
      lightmapBytes,
    });
    body = artifact.body;
    contentType = artifact.contentType;
    fileExtension = artifact.fileExtension;
    cookPackByteLength = artifact.cookPackByteLength;
    storageKey = `exports/${data.projectId}/${jobId}/export.${fileExtension}`;
  } else {
    // Non-geometry formats (wav/mp4/project archive) — real binary encoding
    // requires the native toolchain sidecar (ffmpeg/etc), not yet wired here.
    storageKey = `exports/${data.projectId}/${jobId}/${format}-manifest.json`;
    contentType = 'application/json';
    body = JSON.stringify(
      {
        jobId,
        projectId: data.projectId,
        format,
        quality: data.quality ?? 'default',
        sceneIds: data.sceneIds ?? [],
        exportedAt: new Date().toISOString(),
        status: 'completed',
        note: 'Export manifest. Binary audio/video encoding runs when the native toolchain sidecar is available.',
      },
      null,
      2
    );
  }

  const uploaded = await putObject(storageKey, body, contentType);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const isPublishTarget = PUBLISH_TARGETS.has(format as PublishTarget);
  const downloadFileName = isGeometryFormat || isPublishTarget ? `${jobId}.${fileExtension}` : `${jobId}.${format}.json`;
  const signedUrl = uploaded.ok ? await generateDownloadUrl(storageKey, { fileName: downloadFileName }) : null;
  const outputUrl = signedUrl || `${baseUrl}/api/render/jobs/${jobId}/artifact?format=${encodeURIComponent(format)}`;

  const measuredByteLength = Buffer.isBuffer(body)
    ? body.length
    : Buffer.byteLength(typeof body === 'string' ? body : String(body), 'utf8');

  await prisma.renderJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      progress: 100,
      outputUrl,
      completedAt: new Date(),
      receiptRef: storageKey,
    },
  });

  // Hub listing evidence path reads ExportJob (platform web). Mirror web-static
  // cook artifact measurement so Compression Mandate can pass without inventing sizes.
  if (format === 'web-static') {
    const stamped = await stampWebExportJobFromCookArtifact({
      projectId: data.projectId,
      userId: data.userId,
      renderJobId: jobId,
      downloadUrl: outputUrl,
      artifactByteLength: measuredByteLength,
      cookPackByteLength,
      bakeReceiptRef,
      lightmapBytes,
    });
    if (!stamped.ok) {
      log.error('export_format.web_export_stamp_failed', {
        jobId,
        reason: stamped.reason,
      });
      await prisma.renderJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errorMessage: stamped.reason,
          completedAt: new Date(),
        },
      });
      throw new Error(stamped.reason);
    }
    log.info('export_format.web_export_measured', {
      jobId,
      exportJobId: stamped.exportJobId,
      fileSize: stamped.evidence.fileSize,
      cookPackByteLength,
      compressionMandatePassed: stamped.evidence.compressionMandatePassed,
    });
  }

  return { jobId, outputUrl, storageKey, fileSize: measuredByteLength };
}

export async function startExportWorker() {
  log.info('export_format.worker_booting');

  const worker = await queueManager.registerWorker(
    QUEUE_NAMES.EXPORT,
    async (job) => processExportJob(job.data as ExportJobData),
    Number(process.env.EXPORT_WORKER_CONCURRENCY || '2'),
  );

  if (!worker) {
    log.warn('export_format.redis_unavailable_polling_db');
    let isShuttingDown = false;
    const poll = async () => {
      while (!isShuttingDown) {
        try {
          const jobs = await prisma.renderJob.findMany({
            where: { status: 'queued' },
            take: 5,
          });
          for (const job of jobs) {
            await processExportJob({
              jobId: job.id,
              format: job.receiptRef?.includes('/') ? 'glb' : (job.receiptRef || 'glb'),
              projectId: job.projectId,
              userId: job.requestedBy,
            });
          }
        } catch (error) {
          log.error('export_format.poll_error', error);
        }
        await new Promise((r) => setTimeout(r, 5000));
      }
    };
    void poll();
    process.on('SIGTERM', () => {
      isShuttingDown = true;
    });
    process.on('SIGINT', () => {
      isShuttingDown = true;
    });
    return;
  }

  log.info('export_format.worker_ready', { queue: QUEUE_NAMES.EXPORT });
}

if (require.main === module) {
  startExportWorker().catch((e) => {
    log.error('export_format.fatal', e);
    process.exit(1);
  });
}
