/**
 * RTv1 / I.1 — Measured export/cook bundle evidence for Compression Mandate.
 * Never invents a passing size. Oversize and missing measurements stay fail-closed.
 */

import { DISCOVERY_MAX_DEMO_BUNDLE_BYTES } from '@/lib/hub/discovery-feed-engine'

export interface MeasuredExportBundleEvidence {
  /** Measured artifact / zip byte length (ExportJob.fileSize). */
  fileSize: number
  /** Same measurement for listing-authority demoBundleBytes. */
  demoBundleBytes: number
  /** Optional cook pack byte length when AethelPack stage produced bytes. */
  cookPackByteLength: number | null
  /**
   * True only when measured artifact bytes are finite, >0, and ≤150MB.
   * Never true when size is missing or invented.
   */
  compressionMandatePassed: boolean
  oversize: boolean
  reason: string
}

export type MeasuredExportBundleResult =
  | { ok: true; evidence: MeasuredExportBundleEvidence }
  | { ok: false; reason: string }

function asPositiveInt(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.floor(n)
}

/**
 * Build Compression Mandate options from real on-disk/blob byte lengths only.
 */
export function buildMeasuredExportBundleEvidence(input: {
  artifactByteLength: unknown
  cookPackByteLength?: unknown
}): MeasuredExportBundleResult {
  const fileSize = asPositiveInt(input.artifactByteLength)
  if (fileSize == null) {
    return {
      ok: false,
      reason:
        'bundle_measurement_missing — empty or non-positive artifact bytes (fail-closed; never invent size)',
    }
  }

  const cookPackByteLength = asPositiveInt(input.cookPackByteLength)
  const oversize = fileSize > DISCOVERY_MAX_DEMO_BUNDLE_BYTES
  const compressionMandatePassed = !oversize

  return {
    ok: true,
    evidence: {
      fileSize,
      demoBundleBytes: fileSize,
      cookPackByteLength,
      compressionMandatePassed,
      oversize,
      reason: oversize
        ? `demo_bundle_oversize (${fileSize}B > ${DISCOVERY_MAX_DEMO_BUNDLE_BYTES}B) — Compression Mandate FAIL`
        : `measured_bundle (${fileSize}B ≤ ${DISCOVERY_MAX_DEMO_BUNDLE_BYTES}B)`,
    },
  }
}

/** Merge measured evidence into ExportJob.options without inventing sizes. */
export function mergeExportJobCompressionOptions(
  existing: Record<string, unknown> | null | undefined,
  evidence: MeasuredExportBundleEvidence,
): Record<string, unknown> {
  const base =
    existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...existing } : {}
  return {
    ...base,
    demoBundleBytes: evidence.demoBundleBytes,
    cookPackByteLength: evidence.cookPackByteLength,
    compressionMandatePassed: evidence.compressionMandatePassed,
    compressionEvidenceReason: evidence.reason,
    bundleMeasuredAt: new Date().toISOString(),
  }
}
