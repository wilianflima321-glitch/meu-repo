/**
 * Focus 2A — Renderer honesty capability surface
 * Never claim AAA / live GPU when the path is held or poster-only.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('renderer-honesty-capability')

export type RendererPathStatus = 'live' | 'held' | 'fallback'

export interface RendererSurfaceReport {
  surface: 'web' | 'desktop'
  preferredPath: string
  activePath: string
  status: RendererPathStatus
  capabilityStatus: 'IMPLEMENTED' | 'PARTIAL' | 'NOT_IMPLEMENTED'
  capabilityScoreRespected: boolean
  placeboForbidden: true
  notes: string[]
  heldReason?: string
}

export interface RendererHonestyReport {
  generatedAt: string
  web: RendererSurfaceReport
  desktop: RendererSurfaceReport
  marketingAllowed: boolean
  claim: string
  /** Block 3A.3 — browser preview is never final AAA offline render */
  finalRenderSafe: false
  finalRenderNote: string
  /** Marketing names that must stay gated (Nanite/Lumen/RT/VT) */
  gatedMarketingNames: string[]
  /** Block 3B.1 — Law XV score when known */
  capabilityScore?: number
  renderTier?: string
  scalableRenderGraphClaim?: string
}

export interface RendererHonestyInput {
  /** navigator.gpu / WebGPU available in this runtime probe */
  webgpuAvailable?: boolean
  /** WebGL2 context creatable */
  webgl2Available?: boolean
  /** Desktop Tauri + wgpu backend compiled/linked */
  desktopWgpuAvailable?: boolean
  /** Law XV Capability Score 0–100 when known */
  capabilityScore?: number
  /** Explicit hold flags from feature config */
  forceWebHeld?: boolean
  forceDesktopHeld?: boolean
}

/**
 * Produce an honest capability report for IDE / Hub / Critic gates.
 */
export function evaluateRendererHonesty(input: RendererHonestyInput = {}): RendererHonestyReport {
  const notes: string[] = []
  const score = input.capabilityScore
  const scoreOk = score === undefined || (score >= 0 && score <= 100)

  let web: RendererSurfaceReport
  if (input.forceWebHeld) {
    web = {
      surface: 'web',
      preferredPath: 'webgpu',
      activePath: 'held',
      status: 'held',
      capabilityStatus: 'NOT_IMPLEMENTED',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      notes: ['Web renderer explicitly held — do not show poster as live viewport'],
      heldReason: 'forceWebHeld',
    }
  } else if (input.webgpuAvailable) {
    web = {
      surface: 'web',
      preferredPath: 'webgpu',
      activePath: 'webgpu',
      status: 'live',
      capabilityStatus: 'IMPLEMENTED',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      notes: ['WebGPU live path'],
    }
  } else if (input.webgl2Available !== false) {
    web = {
      surface: 'web',
      preferredPath: 'webgpu',
      activePath: 'webgl2',
      status: 'fallback',
      capabilityStatus: 'PARTIAL',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      notes: ['WebGL2 official fallback (Safari / no WebGPU) — not AAA parity claim'],
    }
  } else {
    web = {
      surface: 'web',
      preferredPath: 'webgpu',
      activePath: 'held',
      status: 'held',
      capabilityStatus: 'NOT_IMPLEMENTED',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      notes: ['No WebGPU or WebGL2 — viewport must hide or show [HELD]'],
      heldReason: 'no_gpu_context',
    }
  }

  let desktop: RendererSurfaceReport
  if (input.forceDesktopHeld || input.desktopWgpuAvailable === false) {
    desktop = {
      surface: 'desktop',
      preferredPath: 'wgpu',
      activePath: 'held',
      status: 'held',
      capabilityStatus: input.desktopWgpuAvailable === false ? 'NOT_IMPLEMENTED' : 'PARTIAL',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      notes: ['Desktop wgpu not ready — hide AAA viewport claims'],
      heldReason: input.forceDesktopHeld ? 'forceDesktopHeld' : 'wgpu_unavailable',
    }
  } else if (input.desktopWgpuAvailable === true) {
    desktop = {
      surface: 'desktop',
      preferredPath: 'wgpu',
      activePath: 'wgpu',
      status: 'live',
      capabilityStatus: 'IMPLEMENTED',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      notes: ['Native wgpu live path'],
    }
  } else {
    desktop = {
      surface: 'desktop',
      preferredPath: 'wgpu',
      activePath: 'unknown',
      status: 'held',
      capabilityStatus: 'PARTIAL',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      notes: ['Desktop wgpu probe not supplied — treat as held until verified'],
      heldReason: 'unprobed',
    }
  }

  const marketingAllowed =
    (web.status === 'live' || web.status === 'fallback') && desktop.status !== 'live'
      ? false // don't market desktop AAA from web-only
      : web.status === 'live' && desktop.status === 'live'

  const claim =
    web.status === 'held' && desktop.status === 'held'
      ? 'Renderer held — no live GPU path claimed'
      : web.activePath === 'webgl2'
        ? 'WebGL2 blueprint path (honest) — desktop AAA separate'
        : marketingAllowed
          ? 'Dual live GPU paths (web + desktop)'
          : 'Partial live GPU — use capabilityStatus, never poster placebo'

  notes.push(...web.notes, ...desktop.notes)
  log.info('renderer_honesty_evaluated', {
    web: web.activePath,
    desktop: desktop.activePath,
    marketingAllowed,
  })

  return {
    generatedAt: new Date().toISOString(),
    web,
    desktop,
    marketingAllowed,
    claim,
    finalRenderSafe: false,
    finalRenderNote:
      'Preview only — final offline/native render [HELD]. Do not treat browser viewport as AAA ship path.',
    gatedMarketingNames: ['Nanite', 'Lumen', 'Ray Tracing', 'Path Tracing', 'Virtual Texture'],
    capabilityScore: score,
    renderTier: undefined,
    scalableRenderGraphClaim: undefined,
  }
}
