/**
 * Instant Play — orchestrates packer → registry → emitter → host.
 * Marks ready only when Law XV bake evidence is present AND HTML is hosted
 * with packed JS that boots runtime-main. Never invents bake artifacts.
 */

import {
  evaluateBakedLightingPublishGate,
  type PublishPipelinePlan,
} from '@/lib/production/publish-pipeline-orchestrator'
import type { TranspileStageResult } from '@/lib/production/visual-script-transpile-stage'
import {
  DEMO_WEB_SLICE_STAGE_CATALOG,
  type DemoWebSliceUnholdBlockerId,
  evaluateDemoWebSliceStage,
  type DemoWebSliceStageResult,
} from '@/lib/production/demo-web-slice'
import { emitGameScriptsRegistry } from '@/lib/production/instant-play/game-scripts-registry'
import { packInstantPlayBrowserBundle } from '@/lib/production/instant-play/browser-packer'
import {
  emitInstantPlayHtml,
  INSTANT_PLAY_BUNDLE_FILENAME,
  INSTANT_PLAY_HTML_PATH,
} from '@/lib/production/instant-play/html-emitter'
import { hostInstantPlaySlice } from '@/lib/production/instant-play/html-host'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('instant-play.build-slice')

export interface InstantPlaySliceFile {
  path: string
  content: string
  contentType: string
}

export interface BuildInstantPlaySliceInput {
  jobId: string
  projectId: string
  plan: PublishPipelinePlan
  transpile: TranspileStageResult
  publicBaseUrl?: string
  engineRoot?: string
  /** Law XV — non-empty bake receipt ref (never invented by Instant Play). */
  bakeReceiptRef?: string | null
  /** Law XV — measured lightmap byte length (>0 required). */
  lightmapBytes?: number | null
}

export interface BuildInstantPlaySliceResult {
  demoWebSlice: DemoWebSliceStageResult
  completedStages: DemoWebSliceUnholdBlockerId[]
  remainingBlockers: Array<{ id: DemoWebSliceUnholdBlockerId; summary: string }>
  files: InstantPlaySliceFile[]
  hostedDemoPlayUrl: string | null
}

const STAGE_ORDER: DemoWebSliceUnholdBlockerId[] = [
  'game-scripts-registry',
  'browser-packer',
  'html-emitter',
  'html-host',
]

function remainingFrom(completed: Set<DemoWebSliceUnholdBlockerId>) {
  return DEMO_WEB_SLICE_STAGE_CATALOG.filter((b) => !completed.has(b.id)).map((b) => ({
    id: b.id,
    summary: b.summary,
  }))
}

function heldResult(
  completed: DemoWebSliceUnholdBlockerId[],
  files: InstantPlaySliceFile[],
  reason: string,
): BuildInstantPlaySliceResult {
  const completedSet = new Set(completed)
  const remaining = remainingFrom(completedSet)
  const demoWebSlice = evaluateDemoWebSliceStage({
    target: 'web-static',
    demoWebSliceReady: false,
    instantPlayHtmlUrl: null,
  })
  return {
    demoWebSlice: {
      ...demoWebSlice,
      reason:
        remaining.length > 0
          ? `${reason} Remaining: ${remaining.map((r) => r.id).join(', ')}.`
          : reason,
    },
    completedStages: STAGE_ORDER.filter((id) => completedSet.has(id)),
    remainingBlockers: remaining,
    files,
    hostedDemoPlayUrl: null,
  }
}

/**
 * Run Instant Play stages in order. Never stamps ready on partial success
 * or without Law XV bake receipt + lightmap bytes.
 */
export async function buildInstantPlaySlice(
  input: BuildInstantPlaySliceInput,
): Promise<BuildInstantPlaySliceResult> {
  if (input.plan.target !== 'web-static') {
    const demoWebSlice = evaluateDemoWebSliceStage({
      target: input.plan.target,
      demoWebSliceReady: false,
      instantPlayHtmlUrl: null,
    })
    return {
      demoWebSlice,
      completedStages: [],
      remainingBlockers: DEMO_WEB_SLICE_STAGE_CATALOG.map((b) => ({
        id: b.id,
        summary: b.summary,
      })),
      files: [],
      hostedDemoPlayUrl: null,
    }
  }

  const bakeGate = evaluateBakedLightingPublishGate({
    target: 'web-static',
    bakeReceiptRef: input.bakeReceiptRef,
    lightmapBytes: input.lightmapBytes,
  })
  if (!bakeGate.allowed) {
    log.warn('instant_play_bake_held', {
      jobId: input.jobId,
      projectId: input.projectId,
      reason: bakeGate.reason,
    })
    return heldResult(
      [],
      [],
      `${bakeGate.reason} Instant Play refused without inventing bake artifacts.`,
    )
  }

  const completed = new Set<DemoWebSliceUnholdBlockerId>()
  const files: InstantPlaySliceFile[] = []

  const registry = emitGameScriptsRegistry({
    projectId: input.projectId,
    files: input.transpile.files,
    network: {
      enabled: input.plan.request.multiplayer.enabled,
      relayUrl: input.plan.request.multiplayer.relayUrl,
    },
    monetization: {
      enabled: input.plan.request.monetization.enabled,
      stripePublishableKey: input.plan.request.monetization.stripePublishableKey,
      checkoutEndpoint: input.plan.request.monetization.checkoutEndpoint,
    },
  })
  if (!registry.content.includes('buildGeneratedGameManifest')) {
    return heldResult([], files, 'game-scripts-registry held — factory missing from emit.')
  }
  completed.add('game-scripts-registry')
  files.push({
    path: `instant-play/${registry.path}`,
    content: registry.content,
    contentType: 'text/typescript; charset=utf-8',
  })

  const packed = await packInstantPlayBrowserBundle({
    projectId: input.projectId,
    registry,
    scriptFiles: input.transpile.files,
    engineRoot: input.engineRoot,
  })
  if (!packed.ok) {
    log.warn('instant_play_packer_held', { jobId: input.jobId, reason: packed.reason })
    return heldResult([...completed], files, packed.reason)
  }
  completed.add('browser-packer')
  files.push({
    path: `instant-play/${packed.path}`,
    content: packed.content,
    contentType: packed.contentType,
  })

  const html = emitInstantPlayHtml({
    projectId: input.projectId,
    jobId: input.jobId,
    bundleSrc: `./${INSTANT_PLAY_BUNDLE_FILENAME}`,
  })
  if (!html.bootsRuntime) {
    return heldResult(
      [...completed],
      files,
      'html-emitter held — emitted HTML failed boot-contract checks.',
    )
  }
  completed.add('html-emitter')
  files.push({
    path: `instant-play/${html.path}`,
    content: html.content,
    contentType: html.contentType,
  })

  const hosted = await hostInstantPlaySlice({
    projectId: input.projectId,
    jobId: input.jobId,
    publicBaseUrl: input.publicBaseUrl,
    assets: [
      {
        relativePath: INSTANT_PLAY_HTML_PATH,
        body: html.content,
        contentType: html.contentType,
      },
      {
        relativePath: INSTANT_PLAY_BUNDLE_FILENAME,
        body: packed.content,
        contentType: packed.contentType,
      },
    ],
  })
  if (!hosted.ok) {
    log.warn('instant_play_host_held', { jobId: input.jobId, reason: hosted.reason })
    return heldResult([...completed], files, hosted.reason)
  }
  completed.add('html-host')

  const demoWebSlice = evaluateDemoWebSliceStage({
    target: 'web-static',
    demoWebSliceReady: true,
    instantPlayHtmlUrl: hosted.demoPlayUrl,
  })

  if (demoWebSlice.status !== 'ready' || !demoWebSlice.demoPlayUrl) {
    return heldResult(
      [...completed],
      files,
      `html-host completed but listing gate rejected URL: ${demoWebSlice.reason}`,
    )
  }

  log.info('instant_play_slice_ready', {
    jobId: input.jobId,
    projectId: input.projectId,
    demoPlayUrl: demoWebSlice.demoPlayUrl,
    entityCount: registry.entityCount,
    bundleBytes: packed.byteLength,
  })

  return {
    demoWebSlice,
    completedStages: STAGE_ORDER.filter((id) => completed.has(id)),
    remainingBlockers: [],
    files,
    hostedDemoPlayUrl: demoWebSlice.demoPlayUrl,
  }
}
