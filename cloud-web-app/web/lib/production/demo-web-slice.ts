/**
 * XIV.3 / I.3 — Instant Play `demo-web-slice` honesty.
 *
 * Hub Instant Play iframes require a hosted HTML entry (index.html / .html),
 * not a cook/export zip download URL. The web-static cook today emits a
 * measured zip + AethelPack only — browser host + runtime-main bundle for
 * Instant Play remain HELD. Never invent a playable demoPlayUrl from zip.
 *
 * Unhold requires ALL of `DEMO_WEB_SLICE_UNHOLD_BLOCKERS` (see below). Do not
 * reuse build-queue `addWebTemplate` theater HTML as Instant Play readiness.
 */

import type { PublishTarget } from '@/lib/production/publish-pipeline-orchestrator'

/**
 * Exact missing steps that keep Instant Play HELD (investigation 2026-08-08).
 * Unhold only when cook emits + hosts a real bootable slice — never placeholder.html.
 */
export const DEMO_WEB_SLICE_UNHOLD_BLOCKERS = [
  {
    id: 'browser-packer',
    summary:
      'No cook stage bundles packages/engine/runtime-main.ts + transpiled generated/scripts into browser-loadable JS (esbuild not a web dep; no Instant Play packer module).',
  },
  {
    id: 'game-scripts-registry',
    summary:
      'Transpile emits per-script .ts files only — never the generated/game-scripts registry + GeneratedGameManifest constructors runtime-main expects at bundle/boot time.',
  },
  {
    id: 'html-emitter',
    summary:
      'Cook never writes Instant Play index.html that mounts #aethel-root and calls bootAethelRuntime (build-queue addWebTemplate is a separate theater stub — forbidden for ready).',
  },
  {
    id: 'html-host',
    summary:
      'Cook uploads application/zip only; no text/html (+ JS) object with a stable iframeable URL (signed zip download intentionally rejected by isInstantPlayHtmlUrl).',
  },
] as const

export type DemoWebSliceUnholdBlockerId = (typeof DEMO_WEB_SLICE_UNHOLD_BLOCKERS)[number]['id']

/** Honest Instant Play HTML host + runtime-main browser bundle are not wired yet. */
export const DEMO_WEB_SLICE_HOST_HELD_REASON =
  'demo_web_slice_held — Instant Play needs hosted HTML slice that boots runtime-main; web-static cook emits measured zip only (no iframe target). Missing: browser-packer + game-scripts-registry + html-emitter + html-host. Placeholder index.html theater forbidden (Zero-MVP).'

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
