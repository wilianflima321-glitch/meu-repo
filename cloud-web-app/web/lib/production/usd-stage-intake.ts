/**
 * J.7 backend — USD stage intake classification (fail-closed honesty).
 *
 * Pure-TS byte/format probes for USDA / USDC / USDZ / generic .usd.
 * Full Pixar OpenUSD / Hydra stage remains HELD — no C++ binding claimed.
 */

import type { UsdBrowserFormatId, UsdFormatShipStatus, UsdImportViewerStatus } from '@/lib/production/usd-integrator'
import {
  USD_BROWSER_FORMAT_SUPPORT,
  USD_BROWSER_VIEWER_SHIP_STATUS,
  evaluateUsdzPreviewEligibility,
  resolveUsdBrowserFormatSupport,
} from '@/lib/production/usd-integrator'

/** Pixar USDC crate magic (binary) — reject for ASCII / loader paths. */
export const USDC_CRATE_MAGIC = [0x50, 0x58, 0x52, 0x2d, 0x55, 0x53, 0x44, 0x43] as const // PXR-USDC

/** ZIP local-file header — USDZ container eligibility (not mesh guarantee). */
export const USDZ_ZIP_MAGIC = [0x50, 0x4b, 0x03, 0x04] as const

export type UsdPayloadKind =
  | 'empty'
  | 'usdc_crate'
  | 'usdz_zip'
  | 'usda_ascii'
  | 'ascii_usd'
  | 'binary_unknown'

export type OpenUsdStageHeldReason =
  | 'openusd_cpp_binding_absent'
  | 'usdc_crate_unsupported'
  | 'usda_mesh_stage_held'
  | 'generic_usd_stage_held'
  | 'usdz_not_openusd_stage'
  | 'empty_payload'

/** Documented HELD reasons — audits / honesty banners / integrator receipts. */
export const OPENUSD_STAGE_HELD_REASONS: Readonly<
  Record<OpenUsdStageHeldReason, { summary: string; remediation: string }>
> = {
  openusd_cpp_binding_absent: {
    summary:
      'Pixar OpenUSD C++ runtime (UsdStage, Hydra, UsdImaging) is not bound in browser or Node ship path.',
    remediation:
      'Use desktop OpenUSD toolchain sidecar (runtime-engine-spine openusd-tools) or export GLTF/USDZ for web preview.',
  },
  usdc_crate_unsupported: {
    summary: 'Binary USDC crate (PXR-USDC magic) cannot be parsed without OpenUSD — USDZLoader rejects crates.',
    remediation: 'Re-export as USDA ASCII for hierarchy wireframe scan, or USDZ (USDA-in-ZIP) for partial mesh preview.',
  },
  usda_mesh_stage_held: {
    summary:
      'Standalone USDA ASCII allows hierarchy wireframe honesty only — not a live Hydra mesh stage.',
    remediation: 'Wireframe bounding boxes from prim/extent scan; cook to GLTF for full mesh in browser.',
  },
  generic_usd_stage_held: {
    summary: 'Generic .usd without USDA header is HELD — ASCII wireframe when text; crate when binary.',
    remediation: 'Rename/detect format; prefer .usda or .usdz for explicit handling.',
  },
  usdz_not_openusd_stage: {
    summary:
      'USDZ browser preview is PARTIAL via Three.js USDZLoader (USDA-in-ZIP subset) — not OpenUSD stage.',
    remediation: 'Treat USDZ as preview-only; full stage editing requires desktop OpenUSD (HELD).',
  },
  empty_payload: {
    summary: 'Empty USD payload — fail-closed (Law XVI).',
    remediation: 'Provide non-empty asset bytes.',
  },
}

export type UsdStageIntakeResult = {
  format: UsdBrowserFormatId
  payloadKind: UsdPayloadKind
  shipStatus: UsdFormatShipStatus
  viewerStatus: UsdImportViewerStatus
  /** Full Pixar OpenUSD stage — always false in browser/backend TS path. */
  openUsdStageClaimable: false
  heldReason: OpenUsdStageHeldReason
  message: string
  /** ASCII hierarchy wireframe deepen allowed (not mesh stage). */
  hierarchyWireframeEligible: boolean
  aggregateViewerShipStatus: typeof USD_BROWSER_VIEWER_SHIP_STATUS
}

export function isUsdcCrateBytes(bytes: Uint8Array): boolean {
  if (bytes.length < USDC_CRATE_MAGIC.length) return false
  return USDC_CRATE_MAGIC.every((b, i) => bytes[i] === b)
}

export function isUsdzZipBytes(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false
  return USDZ_ZIP_MAGIC.every((b, i) => bytes[i] === b)
}

function looksMostlyAscii(text: string): boolean {
  if (!text.trim()) return false
  let bad = 0
  const n = Math.min(text.length, 4096)
  for (let i = 0; i < n; i++) {
    if (text.charCodeAt(i) === 0) bad += 4
  }
  return bad / n < 0.02
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes)
}

/**
 * Classify raw USD-family bytes without loading Three.js or OpenUSD.
 */
export function classifyUsdPayloadBytes(bytes: ArrayBuffer | Uint8Array): UsdPayloadKind {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (view.byteLength === 0) return 'empty'
  if (isUsdcCrateBytes(view)) return 'usdc_crate'
  if (isUsdzZipBytes(view)) return 'usdz_zip'

  const text = decodeUtf8(view)
  const trimmed = text.trimStart()
  if (/^#usda\s/i.test(trimmed)) return 'usda_ascii'
  if (looksMostlyAscii(text) && /\bdef\s+(Xform|Mesh|Scope)\b/.test(text)) return 'usda_ascii'
  if (looksMostlyAscii(text)) return 'ascii_usd'
  return 'binary_unknown'
}

function resolveHeldReason(
  format: UsdBrowserFormatId,
  payloadKind: UsdPayloadKind,
): OpenUsdStageHeldReason {
  if (payloadKind === 'empty') return 'empty_payload'
  if (payloadKind === 'usdc_crate') return 'usdc_crate_unsupported'
  if (format === 'usdz') return 'usdz_not_openusd_stage'
  if (format === 'usda' || payloadKind === 'usda_ascii') return 'usda_mesh_stage_held'
  if (format === 'usdc') return 'usdc_crate_unsupported'
  if (format === 'usd') return 'generic_usd_stage_held'
  return 'openusd_cpp_binding_absent'
}

function hierarchyEligible(payloadKind: UsdPayloadKind): boolean {
  return payloadKind === 'usda_ascii' || payloadKind === 'ascii_usd'
}

/**
 * Fail-closed USD stage intake — never claims OpenUSD/Hydra mesh stage.
 */
export function evaluateUsdStageIntake(input: {
  format: UsdBrowserFormatId
  bytes: ArrayBuffer | Uint8Array
}): UsdStageIntakeResult {
  const view = input.bytes instanceof Uint8Array ? input.bytes : new Uint8Array(input.bytes)
  const payloadKind = classifyUsdPayloadBytes(view)
  const support = USD_BROWSER_FORMAT_SUPPORT[input.format]
  const heldReason = resolveHeldReason(input.format, payloadKind)
  const heldDoc = OPENUSD_STAGE_HELD_REASONS[heldReason]

  if (payloadKind === 'empty') {
    return {
      format: input.format,
      payloadKind,
      shipStatus: support.shipStatus,
      viewerStatus: 'held',
      openUsdStageClaimable: false,
      heldReason,
      message: heldDoc.summary,
      hierarchyWireframeEligible: false,
      aggregateViewerShipStatus: USD_BROWSER_VIEWER_SHIP_STATUS,
    }
  }

  if (input.format === 'usdz') {
    const zipProbe = evaluateUsdzPreviewEligibility(view)
    return {
      format: input.format,
      payloadKind,
      shipStatus: support.shipStatus,
      viewerStatus: zipProbe.eligible ? 'live' : 'held',
      openUsdStageClaimable: false,
      heldReason: 'usdz_not_openusd_stage',
      message: zipProbe.eligible
        ? `${support.claim} — ${OPENUSD_STAGE_HELD_REASONS.usdz_not_openusd_stage.summary}`
        : zipProbe.message,
      hierarchyWireframeEligible: false,
      aggregateViewerShipStatus: USD_BROWSER_VIEWER_SHIP_STATUS,
    }
  }

  if (payloadKind === 'usdc_crate' || input.format === 'usdc') {
    return {
      format: input.format,
      payloadKind: payloadKind === 'usdc_crate' ? 'usdc_crate' : payloadKind,
      shipStatus: 'HELD',
      viewerStatus: 'held',
      openUsdStageClaimable: false,
      heldReason: 'usdc_crate_unsupported',
      message: OPENUSD_STAGE_HELD_REASONS.usdc_crate_unsupported.summary,
      hierarchyWireframeEligible: false,
      aggregateViewerShipStatus: USD_BROWSER_VIEWER_SHIP_STATUS,
    }
  }

  const wireframe = hierarchyEligible(payloadKind)
  return {
    format: input.format,
    payloadKind,
    shipStatus: support.shipStatus,
    viewerStatus: 'held',
    openUsdStageClaimable: false,
    heldReason,
    message: wireframe
      ? `${heldDoc.summary} Hierarchy wireframe scan allowed (not mesh stage).`
      : heldDoc.summary,
    hierarchyWireframeEligible: wireframe,
    aggregateViewerShipStatus: USD_BROWSER_VIEWER_SHIP_STATUS,
  }
}

/** Resolve format id from file extension — includes .usdc. */
export function resolveUsdFormatFromExtension(fileName: string): UsdBrowserFormatId | null {
  const ext = fileName.trim().toLowerCase().split('.').pop()
  if (!ext) return null
  return resolveUsdBrowserFormatSupport(ext) ? (ext as UsdBrowserFormatId) : null
}

export function describeOpenUsdStageHonesty(): {
  aggregateShipStatus: typeof USD_BROWSER_VIEWER_SHIP_STATUS
  openUsdStageClaimable: false
  heldReasons: typeof OPENUSD_STAGE_HELD_REASONS
  formatMatrix: typeof USD_BROWSER_FORMAT_SUPPORT
} {
  return {
    aggregateShipStatus: USD_BROWSER_VIEWER_SHIP_STATUS,
    openUsdStageClaimable: false,
    heldReasons: OPENUSD_STAGE_HELD_REASONS,
    formatMatrix: USD_BROWSER_FORMAT_SUPPORT,
  }
}
