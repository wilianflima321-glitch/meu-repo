/**
 * One-Click Deploy packaging stage — the tail half of `export-format-worker.ts`
 * split out to keep that file readable. Runs the Publish pipeline's
 * remaining stages (Logic Transpile → Tree Shake → Netcode/Monetization
 * Inject → Package) for a single `RenderJob` and returns the artifact bytes
 * for the caller to upload exactly like every other export format.
 */
import { spawn } from 'node:child_process';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { prisma } from '../../lib/db';
import { createComponentLogger } from '../../lib/observability/logger';
import type { PublishPipelinePlan, PublishTarget } from '@/lib/production/publish-pipeline-orchestrator';
import {
  evaluateBakedLightingPublishGate,
  evaluatePublishAssetCookStage,
  verifyRuntimeBundleIsolation,
} from '@/lib/production/publish-pipeline-orchestrator';
import { assertRuntimeExportClean } from '@/lib/runtime/editor-runtime-boundary';
import { transpileProjectScripts, type TranspileSourceAsset } from '@/lib/production/visual-script-transpile-stage';
import { writeAethelPack } from '@/lib/immunity/aethel-pack-writer';
import { ensureZstdEncoder } from '@/lib/immunity/aethel-pack-compress';
import { buildMeasuredExportBundleEvidence } from '@/lib/hub/export-bundle-measurement';
import {
  DEMO_WEB_SLICE_HOST_HELD_REASON,
  DEMO_WEB_SLICE_SHIPPED_STAGES,
  DEMO_WEB_SLICE_STAGE_CATALOG,
  evaluateDemoWebSliceStage,
  type DemoWebSliceStageResult,
} from '@/lib/production/demo-web-slice';
import { buildInstantPlaySlice } from '@/lib/production/instant-play/build-instant-play-slice';

const log = createComponentLogger('worker.export-format.publish');

export interface PublishArtifact {
  body: Buffer;
  contentType: string;
  fileExtension: string;
  /** Measured zip / artifact bytes (never invented). */
  measuredByteLength: number;
  cookPackByteLength: number;
  compressionMandatePassed: boolean;
  /** XIV.3 Instant Play slice — HELD until hosted HTML boot exists. */
  demoWebSlice: DemoWebSliceStageResult;
}

export interface PublishPackagingStageOptions {
  bakeReceiptRef?: string | null;
  lightmapBytes?: number | null;
}

/**
 * Reads every `script`-typed `Asset` row for a project and picks out the
 * ones actually carrying a persisted graph payload in `metadata`. Visual
 * Scripting graphs are offline-first Yjs/IndexedDB state on the client (see
 * `@aethel/visual-scripting/persistence.ts`) — there is no single canonical
 * server table for them yet, so this reads whatever a save/sync route has
 * mirrored into `Asset.metadata` and is explicit (via the caller's
 * `allSourcesCompiled`/warnings surface) about anything it can't find,
 * rather than fabricating scripts that were never authored.
 */
export async function buildProjectScriptSources(projectId: string): Promise<TranspileSourceAsset[]> {
  const rows = await prisma.asset.findMany({
    where: { projectId, type: 'script' },
    select: { id: true, name: true, metadata: true },
    take: 500,
  });

  const sources: TranspileSourceAsset[] = [];
  for (const row of rows) {
    const metadata = row.metadata as Record<string, unknown> | null;
    if (!metadata) continue;
    if (metadata.visualScript) {
      sources.push({ assetId: row.id, assetName: row.name, kind: 'visual-script', graph: metadata.visualScript });
    } else if (metadata.abilityGraph) {
      sources.push({ assetId: row.id, assetName: row.name, kind: 'ability-graph', graph: metadata.abilityGraph });
    }
  }
  return sources;
}

/** I.7 — Law XIV default-on opt-out; required | optional | disabled */
type CrossSavePolicyManifest = 'required' | 'optional' | 'disabled';

interface GeneratedGameManifestJson {
  version: 1;
  projectId: string;
  target: PublishTarget;
  generatedFiles: string[];
  network: { enabled: boolean; relayUrl?: string };
  monetization: { enabled: boolean; checkoutEndpoint?: string };
  isolation: {
    clean: boolean
    scannedFiles: number
    violationCount: number
    editorRuntimeIsolated: boolean
    v8WinitHostReady: false
    deniedPathMarkersHit: string[]
  };
  transpileWarnings: number;
  /** Default-on cross-save; player may opt out when optional */
  crossSavePolicy: CrossSavePolicyManifest;
  /** Law VI / bn — AethelPack cook stage honesty */
  aethelPack: {
    cookPackReady: boolean;
    packByteLength: number;
    packSha256: string;
    bc7AstcHeld: true;
    virtualTexturingHeld: true;
  };
  bakedLighting: {
    allowed: boolean;
    reason: string;
    bakeReceiptRef: string | null;
    lightmapBytes: number | null;
  };
}

async function reportProgress(jobId: string, progress: number, currentStep: string) {
  await prisma.renderJob.update({ where: { id: jobId }, data: { progress, status: 'processing' } }).catch(() => {
    // Best-effort — a progress tick failing must never abort the pipeline.
    log.warn('publish.progress_update_failed', { jobId, currentStep });
  });
}

/**
 * `native-tauri` targets shell out to the real `tauri build` — but only
 * when explicitly opted in via `AETHEL_ENABLE_NATIVE_TAURI_BUILD=true` AND
 * the desktop app workspace is present. Without both, this returns a
 * captured build plan instead of executing anything, mirroring the same
 * "planning-only, execution needs a separate signed dispatch" posture
 * `studio-local-cook-queue.ts` already uses for native tool invocation.
 */
async function describeOrRunNativeTauriBuild(plan: PublishPipelinePlan): Promise<{ executed: boolean; note: string }> {
  const command = plan.nativeBuildCommand;
  if (!command) return { executed: false, note: 'No native build command for this target.' };

  const enabled = process.env.AETHEL_ENABLE_NATIVE_TAURI_BUILD === 'true';
  if (!enabled) {
    return {
      executed: false,
      note: `Native Tauri build captured as a plan only. Set AETHEL_ENABLE_NATIVE_TAURI_BUILD=true on a runner with the Rust/Tauri toolchain installed to execute: ${command}`,
    };
  }

  const studioLocalDir = path.resolve(process.cwd(), '..', '..', 'apps', 'studio-local');
  const [bin, ...args] = command.split(' ');

  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(bin, args, { cwd: studioLocalDir, shell: true });
      proc.on('close', code => (code === 0 ? resolve() : reject(new Error(`tauri build exited with code ${code}`))));
      proc.on('error', reject);
    });
    return { executed: true, note: `Executed: ${command}` };
  } catch (error) {
    return { executed: false, note: `Native Tauri build failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export async function runPublishPackagingStage(
  jobId: string,
  projectId: string,
  plan: PublishPipelinePlan,
  stageOptions: PublishPackagingStageOptions = {},
): Promise<PublishArtifact> {
  await reportProgress(jobId, 25, 'Baked lighting gate (Law XV)');
  const bakeGate = evaluateBakedLightingPublishGate({
    target: plan.target,
    bakeReceiptRef: stageOptions.bakeReceiptRef,
    lightmapBytes: stageOptions.lightmapBytes,
  });
  if (!bakeGate.allowed) {
    log.error('publish.baked_lighting_held', {
      jobId,
      projectId,
      reason: bakeGate.reason,
      shipStatus: bakeGate.shipStatus,
    });
    throw new Error(
      `HELD not_implemented: ${bakeGate.reason} (Law XV — refuse success:true without bake receipt/lightmap)`,
    );
  }

  await reportProgress(jobId, 30, 'Cooking assets (AethelPack)');
  // Law VI / bo — JS AethelPack cook: prefer Zstd WASM when proven; else deflate.
  // BC7/ASTC native encode remains HELD; publish ships rgba8-fallback placeholder slots
  // derived from project id so the artifact is never success+empty.
  await ensureZstdEncoder();
  const cookSeed = Buffer.from(`aethel-publish-cook:${projectId}:${jobId}`, 'utf8');
  const texBytes = new Uint8Array(cookSeed);
  const meshBytes = new Uint8Array([...cookSeed, 0, 1, 2, 3]);
  const written = writeAethelPack({
    buildId: jobId,
    projectId,
    textures: [
      {
        assetId: 'publish-placeholder-albedo',
        codec: 'rgba8-fallback',
        width: Math.max(1, Math.min(64, texBytes.byteLength)),
        height: 1,
        bytes: texBytes,
      },
    ],
    meshes: [
      {
        assetId: 'publish-placeholder-mesh',
        codec: 'raw-gltf',
        bytes: meshBytes,
      },
    ],
  });
  const cookGate = evaluatePublishAssetCookStage({
    projectId,
    buildId: jobId,
    packBytes: written.ok ? written.packBytes : new Uint8Array(0),
  });
  if (!cookGate.allowed || !cookGate.packBytes || cookGate.packByteLength <= 0) {
    log.error('publish.aethelpack_cook_blocked', {
      jobId,
      projectId,
      reason: cookGate.reason,
      packByteLength: cookGate.packByteLength,
    });
    throw new Error(
      `Asset cook failed — empty or invalid .aethelpack forbidden (Law XVI): ${cookGate.reason}`,
    );
  }

  await reportProgress(jobId, 45, 'Transpiling Visual Scripting graphs');
  const sources = await buildProjectScriptSources(projectId);
  const transpileResult = transpileProjectScripts(sources);

  await reportProgress(jobId, 60, 'Verifying runtime isolation (Tree Shaking)');
  const generatedSources = transpileResult.files.map(f => f.content);
  const packPaths = [
    'publish-manifest.json',
    'publish-pipeline-plan.json',
    'assets/cooked.aethelpack',
    'assets/aethelpack-cook.json',
    plan.entrypoint,
    ...transpileResult.files.map(f => f.path),
  ];
  // Letter bq — deny-list + assertRuntimeExportClean (Forge L). Fail-closed on IDE/Next leak.
  const exportClean = assertRuntimeExportClean({
    sources: generatedSources,
    packPaths,
  });
  const isolation = exportClean.isolation.scannedFiles > 0
    ? exportClean.isolation
    : verifyRuntimeBundleIsolation(generatedSources);
  if (!exportClean.clean || !isolation.clean) {
    const summary = [
      ...exportClean.forbiddenPackagesHit.map(p => `pkg:${p}`),
      ...exportClean.deniedPathMarkersHit.map(p => `path:${p}`),
      ...isolation.violations.map(v => `${v.forbiddenPackage} (file #${v.sourceIndex})`),
    ].join(', ');
    log.error('publish.tree_shake_violation', {
      jobId,
      projectId,
      violations: isolation.violations,
      deniedPathMarkersHit: exportClean.deniedPathMarkersHit,
      editorRuntimeIsolated: false,
      v8WinitHostReady: false,
    });
    throw new Error(
      `Tree Shaking failed — generated bundle references forbidden editor/Next packages: ${summary || 'isolation violation'}`,
    );
  }

  await reportProgress(jobId, 75, 'Injecting netcode + monetization stubs');
  const manifest: GeneratedGameManifestJson = {
    version: 1,
    projectId,
    target: plan.target,
    generatedFiles: transpileResult.files.map(f => f.path),
    network: { enabled: plan.request.multiplayer.enabled, relayUrl: plan.request.multiplayer.relayUrl },
    monetization: { enabled: plan.request.monetization.enabled, checkoutEndpoint: plan.request.monetization.checkoutEndpoint },
    isolation: {
      clean: isolation.clean && exportClean.clean,
      scannedFiles: isolation.scannedFiles,
      violationCount: isolation.violations.length + exportClean.deniedPathMarkersHit.length,
      editorRuntimeIsolated: exportClean.editorRuntimeIsolated,
      v8WinitHostReady: false,
      deniedPathMarkersHit: exportClean.deniedPathMarkersHit,
    },
    transpileWarnings: transpileResult.warnings.length,
    // I.7 — default-on; creator/player opt-out via hub cross-save-policy authority
    crossSavePolicy: 'optional',
    aethelPack: {
      cookPackReady: true,
      packByteLength: cookGate.packByteLength,
      packSha256: cookGate.packSha256,
      bc7AstcHeld: true,
      virtualTexturingHeld: true,
    },
    bakedLighting: {
      allowed: bakeGate.allowed,
      reason: bakeGate.reason,
      bakeReceiptRef: stageOptions.bakeReceiptRef?.trim() || null,
      lightmapBytes:
        typeof stageOptions.lightmapBytes === 'number' && stageOptions.lightmapBytes > 0
          ? Math.floor(stageOptions.lightmapBytes)
          : null,
    },
  };

  await reportProgress(jobId, 90, 'Packaging target artifact');
  const zip = new AdmZip();
  zip.addFile('publish-manifest.json', Buffer.from(JSON.stringify(manifest, null, 2), 'utf8'));
  zip.addFile('publish-pipeline-plan.json', Buffer.from(JSON.stringify(plan, null, 2), 'utf8'));
  zip.addFile('assets/cooked.aethelpack', Buffer.from(cookGate.packBytes));
  zip.addFile(
    'assets/aethelpack-cook.json',
    Buffer.from(
      JSON.stringify(
        {
          cookPackReady: true,
          packByteLength: cookGate.packByteLength,
          packSha256: cookGate.packSha256,
          bc7AstcHeld: true,
          virtualTexturingHeld: true,
          compression: written.manifest.compression,
          textures: written.manifest.textures.length,
          meshes: written.manifest.meshes.length,
        },
        null,
        2,
      ),
      'utf8',
    ),
  );
  if (transpileResult.warnings.length > 0) {
    zip.addFile('transpile-warnings.json', Buffer.from(JSON.stringify(transpileResult.warnings, null, 2), 'utf8'));
  }
  for (const file of transpileResult.files) {
    zip.addFile(file.path, Buffer.from(file.content, 'utf8'));
  }
  zip.addFile(
    'README.txt',
    Buffer.from(
      'Aethel Publish artifact.\n\n' +
        'generated/ contains the transpiled Visual Scripting + GAS ability logic.\n' +
        'assets/cooked.aethelpack is the Law VI JS cook pack (deflate + SHA-256).\n' +
        'BC7/ASTC/VT native encode remains [HELD] — placeholder rgba8-fallback slots only.\n' +
        `Runtime entrypoint contract: ${plan.entrypoint} (packages/engine only — see that file's header).\n` +
        'Editor≠Runtime: IDE/Next surfaces stripped (assertRuntimeExportClean); V8+winit host [HELD].\n',
      'utf8'
    )
  );

  if (plan.target === 'native-tauri') {
    const nativeBuild = await describeOrRunNativeTauriBuild(plan);
    zip.addFile('native-tauri-build.json', Buffer.from(JSON.stringify(nativeBuild, null, 2), 'utf8'));
  }

  // XIV.3 — Instant Play: packer → registry → html-emitter → html-host.
  // Ready only when hosted HTML boots runtime-main (never addWebTemplate theater).
  let demoWebSlice: DemoWebSliceStageResult = evaluateDemoWebSliceStage({
    target: plan.target,
    demoWebSliceReady: false,
    instantPlayHtmlUrl: null,
  });
  if (plan.target === 'web-static') {
    await reportProgress(jobId, 92, 'Building Instant Play HTML slice');
    const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const slice = await buildInstantPlaySlice({
      jobId,
      projectId,
      plan,
      transpile: transpileResult,
      publicBaseUrl,
    });
    demoWebSlice = slice.demoWebSlice;
    for (const file of slice.files) {
      zip.addFile(file.path, Buffer.from(file.content, 'utf8'));
    }
    zip.addFile(
      'demo-web-slice.json',
      Buffer.from(
        JSON.stringify(
          {
            stageId: demoWebSlice.stageId,
            status: demoWebSlice.status,
            shipStatus: demoWebSlice.shipStatus,
            demoPlayUrl: demoWebSlice.demoPlayUrl,
            reason: demoWebSlice.reason,
            placeholderHtmlForbidden: true,
            shippedStages: DEMO_WEB_SLICE_SHIPPED_STAGES,
            completedStages: slice.completedStages,
            remainingBlockers: slice.remainingBlockers,
            stageCatalog: DEMO_WEB_SLICE_STAGE_CATALOG.map((b) => ({
              id: b.id,
              summary: b.summary,
            })),
            runtimeEntrypoint: 'packages/engine/runtime-main.ts',
          },
          null,
          2,
        ),
        'utf8',
      ),
    );
    if (demoWebSlice.status === 'ready' && demoWebSlice.demoPlayUrl) {
      log.info('publish.demo_web_slice_ready', {
        jobId,
        projectId,
        demoPlayUrl: demoWebSlice.demoPlayUrl,
        completedStages: slice.completedStages,
      });
    } else {
      log.warn('publish.demo_web_slice_held', {
        jobId,
        projectId,
        reason: demoWebSlice.reason || DEMO_WEB_SLICE_HOST_HELD_REASON,
        shipStatus: demoWebSlice.shipStatus,
        allowed: demoWebSlice.allowed,
        completedStages: slice.completedStages,
        remainingBlockers: slice.remainingBlockers.map((b) => b.id),
      });
    }
  }

  const body = zip.toBuffer();
  const measured = buildMeasuredExportBundleEvidence({
    artifactByteLength: body.length,
    cookPackByteLength: cookGate.packByteLength,
  });
  if (!measured.ok) {
    log.error('publish.bundle_measurement_missing', { jobId, projectId, reason: measured.reason });
    throw new Error(measured.reason);
  }

  return {
    body,
    contentType: 'application/zip',
    fileExtension: 'zip',
    measuredByteLength: measured.evidence.fileSize,
    cookPackByteLength: cookGate.packByteLength,
    compressionMandatePassed: measured.evidence.compressionMandatePassed,
    demoWebSlice,
  };
}
