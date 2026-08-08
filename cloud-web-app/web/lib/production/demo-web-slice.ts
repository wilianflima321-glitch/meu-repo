/**
 * XIV.3 / I.3 — Instant Play `demo-web-slice` honesty.
 *
 * Hub Instant Play iframes require a hosted HTML entry (index.html / .html),
 * not a cook/export zip download URL. Cook stamps ready only when packer →
 * registry → html-emitter → html-host all complete with real bootable bytes.
 *
 * Do not reuse build-queue `addWebTemplate` theater HTML as Instant Play readiness.
 */

import type { PublishTarget } from '@/lib/production/publish-pipeline-orchestrator'

/**
 * Full Instant Play stage catalog (XIV.3). Used for receipts + partial-hold reasons.
 */
export const DEMO_WEB_SLICE_STAGE_CATALOG = [
  {
    id: 'browser-packer',
    summary:
      'Bundles packages/engine/runtime-main.ts + transpiled generated/scripts into browser-loadable JS via monorepo esbuild.',
  },
  {
    id: 'game-scripts-registry',
    summary:
      'Emits generated/game-scripts registry + GeneratedGameManifest constructors runtime-main expects at bundle/boot time.',
  },
  {
    id: 'html-emitter',
    summary:
      'Writes Instant Play index.html that mounts #aethel-root and loads packed module calling bootAethelRuntime (not addWebTemplate theater).',
  },
  {
    id: 'html-host',
    summary:
      'Hosts text/html (+ JS) under a stable iframeable URL (/api/hub/instant-play/.../index.html); zip downloads stay rejected.',
  },
] as const

export type DemoWebSliceUnholdBlockerId = (typeof DEMO_WEB_SLICE_STAGE_CATALOG)[number]['id']

/**
 * Stages still missing from the product code path.
 * Empty when all four Instant Play stages are implemented and wired into cook.
 */
export const DEMO_WEB_SLICE_UNHOLD_BLOCKERS: ReadonlyArray<{
  id: DemoWebSliceUnholdBlockerId
  summary: string
}> = []

/** Stages implemented in `lib/production/instant-play/*` and cook wiring. */
export const DEMO_WEB_SLICE_SHIPPED_STAGES: readonly DemoWebSliceUnholdBlockerId[] = [
  'game-scripts-registry',
  'browser-packer',
  'html-emitter',
  'html-host',
]

/** Honest Instant Play HTML host + runtime-main browser bundle gate reason (zip-only). */
export const DEMO_WEB_SLICE_HOST_HELD_REASON =
  'demo_web_slice_held — Instant Play needs hosted HTML slice that boots runtime-main; web-static cook zip alone is not an iframe target. Placeholder index.html / addWebTemplate theater forbidden (Zero-MVP).'

export type DemoWebSliceShipStatus = 'IMPLEMENTED' | 'HELD'

export type DemoWebSliceStatus = 'ready' | 'held' | 'missing'

export interface DemoWebSliceStageResult {
  stageId: 'demo-web-slice'
  allowed: boolean
  shipStatus: DemoWebSliceShipStatus
  status: DemoWebSliceStatus
  /** Instant Play iframe URL only — never a .zip / artifact download. */
  demoPlayUrl: string | null
  reason: string
}

export interface ResolveDemoPlayUrlInput {
  /** Explicit Instant Play HTML URL from cook/export options when host path exists. */
  explicitDemoPlayUrl?: string | null
  /** ExportJob.downloadUrl — often a zip; never auto-promoted to Instant Play. */
  webExportDownloadUrl?: string | null
  /** Cook/export must stamp true only when a real HTML slice was hosted. */
  demoWebSliceReady?: boolean
}

export interface ResolveDemoPlayUrlResult {
  demoPlayUrl: string | null
  status: DemoWebSliceStatus
  reason: string
}

/**
 * Instant Play URL must be an HTML document path usable in an Arcade iframe.
 * Zip downloads, signed artifact blobs, and empty strings are rejected.
 */
export function isInstantPlayHtmlUrl(raw: string | null | undefined): boolean {
  const url = typeof raw === 'string' ? raw.trim() : ''
  if (!url) return false
  if (/[\s]/.test(url)) return false

  let pathname = url
  try {
    if (/^https?:\/\//i.test(url)) {
      pathname = new URL(url).pathname
    }
  } catch {
    return false
  }

  const lowerPath = pathname.toLowerCase()
  if (lowerPath.endsWith('.zip') || lowerPath.includes('.zip?')) return false
  if (lowerPath.includes('/artifact') && !lowerPath.endsWith('.html') && !lowerPath.endsWith('.htm')) {
    return false
  }
  // Signed download helpers that force a filename=*.zip are not Instant Play.
  if (/[?&](?:fileName|filename)=[^&]*\.zip\b/i.test(url)) return false

  return (
    lowerPath.endsWith('.html') ||
    lowerPath.endsWith('.htm') ||
    /\/index\.html?$/i.test(lowerPath) ||
    /\/instant-play(\/|$)/i.test(lowerPath)
  )
}

/**
 * Resolve Instant Play demoPlayUrl with fail-closed honesty.
 * Zip-only exports → null (slice held/missing) — never fake playable.
 */
export function resolveDemoPlayUrlFromExportEvidence(
  input: ResolveDemoPlayUrlInput,
): ResolveDemoPlayUrlResult {
  const explicit = input.explicitDemoPlayUrl?.trim() || null
  if (explicit && isInstantPlayHtmlUrl(explicit) && input.demoWebSliceReady === true) {
    return {
      demoPlayUrl: explicit,
      status: 'ready',
      reason: 'demo_web_slice_ready — hosted Instant Play HTML stamped by cook/export',
    }
  }

  // Explicit HTML without ready stamp stays fail-closed (no theater).
  if (explicit && isInstantPlayHtmlUrl(explicit) && input.demoWebSliceReady !== true) {
    return {
      demoPlayUrl: null,
      status: 'held',
      reason:
        'demo_web_slice_unstamped — HTML URL present but demoWebSliceReady≠true (fail-closed)',
    }
  }

  const download = input.webExportDownloadUrl?.trim() || null
  if (download && isInstantPlayHtmlUrl(download) && input.demoWebSliceReady === true) {
    return {
      demoPlayUrl: download,
      status: 'ready',
      reason: 'demo_web_slice_ready — downloadUrl is hosted Instant Play HTML',
    }
  }

  if (download && !isInstantPlayHtmlUrl(download)) {
    return {
      demoPlayUrl: null,
      status: 'held',
      reason: DEMO_WEB_SLICE_HOST_HELD_REASON,
    }
  }

  if (download && isInstantPlayHtmlUrl(download) && input.demoWebSliceReady !== true) {
    return {
      demoPlayUrl: null,
      status: 'held',
      reason:
        'demo_web_slice_unstamped — HTML downloadUrl without demoWebSliceReady (fail-closed)',
    }
  }

  return {
    demoPlayUrl: null,
    status: 'missing',
    reason: 'demo_web_slice_missing — no Instant Play HTML evidence on web export',
  }
}

/**
 * Publish pipeline stage gate for Instant Play HTML slice (XIV.3).
 * web-static without a hosted HTML boot target → HELD (cook zip alone insufficient).
 */
export function evaluateDemoWebSliceStage(input: {
  target: PublishTarget
  instantPlayHtmlUrl?: string | null
  demoWebSliceReady?: boolean
}): DemoWebSliceStageResult {
  if (input.target === 'native-tauri') {
    return {
      stageId: 'demo-web-slice',
      allowed: true,
      shipStatus: 'HELD',
      status: 'held',
      demoPlayUrl: null,
      reason:
        'native-tauri — Instant Play demo-web-slice is a Hub web path; desktop artifact does not require iframe HTML',
    }
  }

  const resolved = resolveDemoPlayUrlFromExportEvidence({
    explicitDemoPlayUrl: input.instantPlayHtmlUrl,
    demoWebSliceReady: input.demoWebSliceReady,
  })

  if (resolved.status === 'ready' && resolved.demoPlayUrl) {
    return {
      stageId: 'demo-web-slice',
      allowed: true,
      shipStatus: 'IMPLEMENTED',
      status: 'ready',
      demoPlayUrl: resolved.demoPlayUrl,
      reason: resolved.reason,
    }
  }

  return {
    stageId: 'demo-web-slice',
    allowed: false,
    shipStatus: 'HELD',
    status: resolved.status === 'missing' ? 'missing' : 'held',
    demoPlayUrl: null,
    reason: resolved.reason === 'demo_web_slice_missing — no Instant Play HTML evidence on web export'
      ? DEMO_WEB_SLICE_HOST_HELD_REASON
      : resolved.reason,
  }
}

/** Merge Instant Play slice honesty into ExportJob.options (never invents ready). */
export function mergeDemoWebSliceExportOptions(
  existing: Record<string, unknown> | null | undefined,
  slice: Pick<DemoWebSliceStageResult, 'status' | 'demoPlayUrl' | 'reason' | 'shipStatus'>,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {}
  return {
    ...base,
    demoWebSliceReady: slice.status === 'ready',
    demoWebSliceStatus: slice.status,
    demoWebSliceShipStatus: slice.shipStatus,
    demoWebSliceReason: slice.reason,
    // Only persist Instant Play URL when ready — zip download stays on downloadUrl.
    demoPlayUrl: slice.status === 'ready' ? slice.demoPlayUrl : null,
    instantPlayHtmlUrl: slice.status === 'ready' ? slice.demoPlayUrl : null,
  }
}
