/**
 * Block 8 — WebXR honesty capability (VR-001).
 * Foveation must be applied per-frame when a session layer exists; otherwise HELD.
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

export function evaluateWebXrHonesty(input: {
  webxrApiAvailable: boolean
  sessionActive: boolean
  /** True only when onXRFrame calls foveatedRendering.applyToLayer */
  foveationWiredInFrameLoop: boolean
  /** True when a Studio component starts WebXRSystem sessions */
  viewportEntryWired: boolean
}): WebXrHonestyReport {
  const evidenceRefs = ['webxr:honesty-v1']
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
      ],
    }
  }
  return {
    ...input,
    shipStatus: 'IMPLEMENTED',
    marketingAllowed: true,
    evidenceRefs: [...evidenceRefs, 'webxr:session-live', 'webxr:foveation-live'],
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
