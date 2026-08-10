/**
 * Block 8 — WebXR honesty capability (VR-001).
 * Foveation must be applied per-frame when a session layer exists; otherwise HELD.
 * Spatial XR marketing stays fail-closed until Onda K / Founder ship gate (Law XV).
 */

export type WebXrHonestyReport = {
  webxrApiAvailable: boolean
  sessionActive: boolean
  foveationWiredInFrameLoop: boolean
  viewportEntryWired: boolean
  shipStatus: 'HELD' | 'PARTIAL' | 'IMPLEMENTED'
  marketingAllowed: boolean
  evidenceRefs: string[]
}

/**
 * P2b HIGH #17 — never flip XR marketing from technical wire flags alone.
 * Technical shipStatus may advance; marketing requires an explicit Founder lift.
 * Substrate evidence: lib/webxr/spatial-xr-substrate-evidence.ts (PARTIAL; Spatial XR product HELD).
 */
export const WEBXR_MARKETING_SHIP_ALLOWED = false
/** Alias — Spatial XR product marketing (Onda K) stays fail-closed. */
export const SPATIAL_XR_MARKETING_SHIP_ALLOWED = false as const

export function evaluateWebXrHonesty(input: {
  webxrApiAvailable: boolean
  sessionActive: boolean
  /** True only when onXRFrame calls foveatedRendering.applyToLayer */
  foveationWiredInFrameLoop: boolean
  /** True when a Studio component starts WebXRSystem sessions */
  viewportEntryWired: boolean
}): WebXrHonestyReport {
  const evidenceRefs = ['webxr:honesty-v1', 'webxr:spatial-xr-substrate-v1']
  if (!input.webxrApiAvailable) {
    return {
      ...input,
      shipStatus: 'HELD',
      marketingAllowed: false,
      evidenceRefs: [...evidenceRefs, 'webxr:api-missing'],
    }
  }
  if (!input.foveationWiredInFrameLoop || !input.viewportEntryWired) {
    return {
      ...input,
      shipStatus: input.foveationWiredInFrameLoop ? 'PARTIAL' : 'HELD',
      marketingAllowed: false,
      evidenceRefs: [
        ...evidenceRefs,
        input.foveationWiredInFrameLoop ? 'webxr:foveation-live' : 'webxr:foveation-held',
        input.viewportEntryWired ? 'webxr:viewport-entry' : 'webxr:viewport-held',
        'webxr:spatial-xr-marketing-held',
      ],
    }
  }
  return {
    ...input,
    shipStatus: 'IMPLEMENTED',
    // Technical wires proven ≠ Spatial XR marketing certificate (P2b HIGH #17).
    marketingAllowed: WEBXR_MARKETING_SHIP_ALLOWED && SPATIAL_XR_MARKETING_SHIP_ALLOWED,
    evidenceRefs: [
      ...evidenceRefs,
      'webxr:session-live',
      'webxr:foveation-live',
      'webxr:marketing-held',
      'webxr:spatial-xr-marketing-held',
    ],
  }
}

/** Product truth today: foveation now wired in core frame loop; viewport entry still HELD. */
export const WEBXR_VIEWPORT_ENTRY_WIRED = false

export function buildDefaultWebXrHonesty(sessionActive = false): WebXrHonestyReport {
  const webxrApiAvailable =
    typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { xr?: unknown }).xr)
  return evaluateWebXrHonesty({
    webxrApiAvailable,
    sessionActive,
    foveationWiredInFrameLoop: true,
    viewportEntryWired: WEBXR_VIEWPORT_ENTRY_WIRED,
  })
}
