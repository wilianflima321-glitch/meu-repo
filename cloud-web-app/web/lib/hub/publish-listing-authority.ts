/**
 * RTv1 / I.1 — Publish listing evidence (disk-backed).
 * Stamps Compression Mandate + demoPlayUrl honesty for Hub discovery.
 * Fail-closed when measured bundle / cook evidence is absent — never invents PASS.
 * Layout: `.aethel/hub/listing-evidence/<gameId>.json`
 */

import fs from 'node:fs/promises'
import path from 'node:path'

import {
  DISCOVERY_MAX_DEMO_BUNDLE_BYTES,
  evaluateCompressionMandateGate,
} from '@/lib/hub/discovery-feed-engine'
import { resolveDemoPlayUrlFromExportEvidence } from '@/lib/production/demo-web-slice'
import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('publish-listing-authority')

const LISTING_DIR_SEGMENTS = ['.aethel', 'hub', 'listing-evidence'] as const

export interface PublishListingEvidence {
  gameId: string
  /** True only when measured cook/demo evidence proves ≤150MB Compression Mandate. */
  compressionMandatePassed: boolean
  demoBundleBytes: number | null
  /** Honest web demo URL when a real browser artifact exists. */
  demoPlayUrl: string | null
  /** Creator / catalog flag — no browser demo → Hub Desktop Exclusive. */
  noWebDemo: boolean
  evidenceRef: string | null
  stampedAt: string
  reason: string
}

export interface EvaluatePublishListingInput {
  gameId: string
  /** Completed web export download URL (often a zip — not Instant Play by itself). */
  webExportDownloadUrl?: string | null
  /**
   * Explicit Instant Play HTML URL from ExportJob.options when demo-web-slice is ready.
   * Zip download URLs must not be passed here.
   */
  instantPlayHtmlUrl?: string | null
  /** Cook/export stamped demoWebSliceReady — required before Instant Play demoPlayUrl. */
  demoWebSliceReady?: boolean
  /** Measured ExportJob.fileSize (bytes) when cook reported size. */
  webExportFileSizeBytes?: number | null
  /**
   * Explicit cook receipt from ExportJob.options.compressionMandatePassed.
   * Alone is insufficient — still requires a finite ≤150MB byte measurement.
   */
  explicitCompressionMandatePassed?: boolean
  /** Optional cook pack byte length from asset-cook stage. */
  cookPackByteLength?: number | null
  /** Creator declared desktop-only listing (no web demo slice). */
  noWebDemo?: boolean
  evidenceRef?: string | null
  nowIso?: string
}

function getListingRoot(): string {
  const base = process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT
    ? path.resolve(process.env.AETHEL_HUB_LISTING_EVIDENCE_ROOT)
    : path.resolve(process.cwd(), ...LISTING_DIR_SEGMENTS)
  return base
}

function sanitize(segment: string): string {
  return (
    String(segment || '')
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80) || 'unknown'
  )
}

function evidencePath(gameId: string): string {
  return path.join(getListingRoot(), `${sanitize(gameId)}.json`)
}

function resolveMeasuredBytes(input: EvaluatePublishListingInput): number | null {
  const candidates = [input.webExportFileSizeBytes, input.cookPackByteLength]
  for (const raw of candidates) {
    const n = typeof raw === 'number' ? raw : Number(raw)
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }
  return null
}

/**
 * Pure evaluator — Compression Mandate PASS only with real measured bytes ≤150MB
 * (and optional explicit cook flag). Missing size → fail-closed.
 */
export function evaluatePublishListingEvidence(
  input: EvaluatePublishListingInput,
): PublishListingEvidence {
  const gameId = String(input.gameId || '').trim()
  const stampedAt = input.nowIso ?? new Date().toISOString()
  const measured = resolveMeasuredBytes(input)
  const evidenceRef = input.evidenceRef?.trim() || null

  // Creator Desktop Exclusive opt-in — never invent Instant Play.
  if (input.noWebDemo === true) {
    return {
      gameId,
      compressionMandatePassed: false,
      demoBundleBytes: measured,
      demoPlayUrl: null,
      noWebDemo: true,
      evidenceRef,
      stampedAt,
      reason: 'no_web_demo_flag',
    }
  }

  const slice = resolveDemoPlayUrlFromExportEvidence({
    explicitDemoPlayUrl: input.instantPlayHtmlUrl,
    webExportDownloadUrl: input.webExportDownloadUrl,
    demoWebSliceReady: input.demoWebSliceReady,
  })
  const demoUrl = slice.demoPlayUrl

  // Instant Play missing/held → honest build_pending path (not Desktop Exclusive unless opted out).
  if (!demoUrl) {
    return {
      gameId,
      compressionMandatePassed: false,
      demoBundleBytes: measured,
      demoPlayUrl: null,
      noWebDemo: false,
      evidenceRef,
      stampedAt,
      reason: slice.reason,
    }
  }

  // Explicit false / missing cook flag without bytes stays fail-closed.
  const wantsPass =
    input.explicitCompressionMandatePassed === true || measured != null
  if (!wantsPass || measured == null) {
    return {
      gameId,
      compressionMandatePassed: false,
      demoBundleBytes: measured,
      demoPlayUrl: demoUrl,
      noWebDemo: false,
      evidenceRef,
      stampedAt,
      reason:
        'compression_evidence_missing — need measured demo/web bundle bytes ≤150MB (fail-closed)',
    }
  }

  const gate = evaluateCompressionMandateGate({
    compressionMandatePassed: true,
    demoBundleBytes: measured,
  })

  if (!gate.passed) {
    return {
      gameId,
      compressionMandatePassed: false,
      demoBundleBytes: measured,
      demoPlayUrl: demoUrl,
      noWebDemo: false,
      evidenceRef,
      stampedAt,
      reason: gate.reason,
    }
  }

  return {
    gameId,
    compressionMandatePassed: true,
    demoBundleBytes: measured,
    demoPlayUrl: demoUrl,
    noWebDemo: false,
    evidenceRef,
    stampedAt,
    reason: `compression_mandate_passed (${measured}B ≤ ${DISCOVERY_MAX_DEMO_BUNDLE_BYTES}B)`,
  }
}

export async function stampPublishListingEvidence(
  input: EvaluatePublishListingInput,
): Promise<PublishListingEvidence> {
  const evidence = evaluatePublishListingEvidence(input)
  const root = getListingRoot()
  await fs.mkdir(root, { recursive: true })
  const target = evidencePath(evidence.gameId)
  await fs.writeFile(target, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
  log.info('publish_listing_evidence_stamped', {
    gameId: evidence.gameId,
    compressionMandatePassed: evidence.compressionMandatePassed,
    noWebDemo: evidence.noWebDemo,
    demoBundleBytes: evidence.demoBundleBytes,
  })
  return evidence
}

export async function readPublishListingEvidence(
  gameId: string,
): Promise<PublishListingEvidence | null> {
  const id = String(gameId || '').trim()
  if (!id) return null
  try {
    const raw = await fs.readFile(evidencePath(id), 'utf8')
    const parsed = JSON.parse(raw) as Partial<PublishListingEvidence>
    if (!parsed || typeof parsed !== 'object') return null
    return {
      gameId: id,
      compressionMandatePassed: parsed.compressionMandatePassed === true,
      demoBundleBytes:
        typeof parsed.demoBundleBytes === 'number' && Number.isFinite(parsed.demoBundleBytes)
          ? parsed.demoBundleBytes
          : null,
      demoPlayUrl:
        typeof parsed.demoPlayUrl === 'string' && parsed.demoPlayUrl.trim()
          ? parsed.demoPlayUrl.trim()
          : null,
      noWebDemo: parsed.noWebDemo === true || !parsed.demoPlayUrl,
      evidenceRef:
        typeof parsed.evidenceRef === 'string' && parsed.evidenceRef.trim()
          ? parsed.evidenceRef.trim()
          : null,
      stampedAt:
        typeof parsed.stampedAt === 'string' ? parsed.stampedAt : new Date(0).toISOString(),
      reason: typeof parsed.reason === 'string' ? parsed.reason : 'listing_evidence',
    }
  } catch {
    return null
  }
}

export async function readPublishListingEvidenceBatch(
  gameIds: string[],
): Promise<Map<string, PublishListingEvidence>> {
  const out = new Map<string, PublishListingEvidence>()
  await Promise.all(
    gameIds.map(async (id) => {
      const row = await readPublishListingEvidence(id)
      if (row) out.set(id, row)
    }),
  )
  return out
}

export async function probePublishListingAuthorityWritable(): Promise<{
  writable: boolean
  root: string
}> {
  const root = getListingRoot()
  try {
    await fs.mkdir(root, { recursive: true })
    const probe = path.join(root, `.probe_${Date.now()}`)
    await fs.writeFile(probe, 'ok', 'utf8')
    await fs.unlink(probe)
    return { writable: true, root }
  } catch {
    return { writable: false, root }
  }
}

/** Hub UI label helper — Desktop Exclusive when no honest web demo. */
export function resolveHubDemoListingLabel(input: {
  noWebDemo?: boolean
  demoPlayUrl?: string | null
  playUrl?: string | null
  playable?: boolean
}): 'web_demo' | 'desktop_exclusive' | 'build_pending' {
  if (input.noWebDemo === true) return 'desktop_exclusive'
  const url = (input.demoPlayUrl ?? input.playUrl)?.trim()
  if (url && input.playable !== false) return 'web_demo'
  if (url) return 'web_demo'
  return 'build_pending'
}
