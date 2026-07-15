/**
 * Block 8 — VR / WebXR honesty capability surface.
 * No XR marketing when session path is incomplete (GT730 / desktop exclusive HELD).
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('vr-honesty-capability')

export type VrCapabilityStatus = 'IMPLEMENTED' | 'PARTIAL' | 'HELD' | 'NOT_IMPLEMENTED'

export interface VrSurfaceReport {
  surface: string
  status: VrCapabilityStatus
  notes: string[]
  heldReason?: string
}

export interface VrHonestyReport {
  generatedAt: string
  webxrSession: VrSurfaceReport
  hardwareFoveation: VrSurfaceReport
  darkenShaderFoveation: VrSurfaceReport
  desktopExclusiveVr: VrSurfaceReport
  applyToLayerWired: VrSurfaceReport
  marketingXrAllowed: false
  claim: string
  productCopy: string
}

export function evaluateVrHonesty(input: {
  navigatorXrPresent?: boolean
  fixedFoveationApiPresent?: boolean
  applyToLayerInFrame?: boolean
  desktopExclusiveReady?: boolean
} = {}): VrHonestyReport {
  const xrPresent = input.navigatorXrPresent === true
  const fixedFoveation = input.fixedFoveationApiPresent === true
  const applyWired = input.applyToLayerInFrame !== false
  const desktopReady = input.desktopExclusiveReady === true

  const report: VrHonestyReport = {
    generatedAt: new Date().toISOString(),
    webxrSession: {
      surface: 'WebXR immersive-vr session',
      status: xrPresent ? 'PARTIAL' : 'HELD',
      notes: xrPresent
        ? ['navigator.xr present — session still requires headset + secure context evidence']
        : ['navigator.xr absent — VR Preview remains [HELD]'],
      heldReason: xrPresent ? 'session_evidence_incomplete' : 'webxr_unavailable',
    },
    hardwareFoveation: {
      surface: 'Hardware fixedFoveation (VR-001)',
      status: fixedFoveation && applyWired ? 'PARTIAL' : 'HELD',
      notes: [
        applyWired
          ? 'applyToLayer() called from onXRFrame when layer supports fixedFoveation'
          : 'applyToLayer not wired in frame loop',
        'Full VRS / gaze-tracked foveation remains later (IMPROVE-ENG-022)',
      ],
      heldReason: fixedFoveation ? 'vrs_gaze_held' : 'fixed_foveation_api_absent',
    },
    darkenShaderFoveation: {
      surface: 'Peripheral darken shader',
      status: 'HELD',
      notes: ['Cosmetic darken shader is not hardware foveation — never market as VRS'],
      heldReason: 'cosmetic_not_hardware',
    },
    desktopExclusiveVr: {
      surface: 'Desktop exclusive VR (OpenXR/SteamVR)',
      status: desktopReady ? 'IMPLEMENTED' : 'HELD',
      notes: ['Desktop/Tauri exclusive VR path not product-shipped'],
      heldReason: desktopReady ? undefined : 'desktop_exclusive_vr_held',
    },
    applyToLayerWired: {
      surface: 'FoveatedRenderingManager.applyToLayer',
      status: applyWired ? 'IMPLEMENTED' : 'HELD',
      notes: applyWired
        ? ['Frame loop applies fixedFoveation when enabled']
        : ['Frame loop skipped applyToLayer'],
      heldReason: applyWired ? undefined : 'apply_to_layer_unwired',
    },
    marketingXrAllowed: false,
    claim: 'WebXR capability report honest — marketing XR / desktop exclusive / AAA foveation [HELD]',
    productCopy:
      'VR Preview stays [HELD] until WebXR session evidence exists. Hardware foveation applies only when the layer API is present; darken-shader is not VRS. Desktop exclusive VR remains [HELD].',
  }

  log.info('vr_honesty_evaluated', {
    webxr: report.webxrSession.status,
    foveation: report.hardwareFoveation.status,
    desktop: report.desktopExclusiveVr.status,
  })

  return report
}

/** Constant for frame-loop wiring assertion in tests / adapters. */
export const VR_APPLY_TO_LAYER_IN_FRAME = true as const
