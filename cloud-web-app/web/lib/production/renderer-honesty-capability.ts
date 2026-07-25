/**
 * Focus 2A — Renderer honesty capability surface
 * Never claim AAA / live GPU when the path is held or poster-only.
 * CW3: active present path is R3F/WebGL2; WebGPU adapter ≠ present.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import {
  type CanonicalPresentRootDocument,
  type DesktopPresentProbeEvidence,
  type LiveRenderPathHonesty,
  type RenderPathClass,
  type WebGpuPresentClaimVerdict,
  evaluateWebGpuPresentClaim,
  resolveLiveRenderPathHonesty,
} from '@/lib/production/render-path-honesty'

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
  /** CW3 — catalog classification for this surface's present path */
  pathClass?: RenderPathClass | 'held'
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
  /** CW3 — live present-path honesty (operators / badge) */
  livePath?: LiveRenderPathHonesty
  /** CW3 — single operator-facing present-root document */
  presentRoot?: CanonicalPresentRootDocument
  /**
   * CW3 — verdict when any dual path claims WebGPU present.
   * Always fail-closed (`allowed: false`); adapter+device still ≠ canonical present.
   */
  webgpuPresentClaim?: WebGpuPresentClaimVerdict
}

export interface RendererHonestyInput {
  /** navigator.gpu / WebGPU available in this runtime probe */
  webgpuAvailable?: boolean
  /** True only after requestAdapter() acquired a non-null adapter (≠ present). */
  webgpuAdapterAcquired?: boolean | null
  /** True only after GPUDevice ready — still ≠ viewport present. */
  webgpuDeviceReady?: boolean | null
  /**
   * Dual-path probe: caller attempts to claim WebGPU as viewport present.
   * Always evaluated fail-closed against the canonical R3F/WebGL2 root.
   */
  claimsWebGpuPresent?: boolean
  /** WebGL2 context creatable */
  webgl2Available?: boolean
  /** Desktop Tauri + wgpu backend compiled/linked */
  desktopWgpuAvailable?: boolean
  /**
   * Tauri `renderer_present_probe` evidence.
   * `presented: true` ⇒ desktop role live_present (secondary surface only).
   */
  desktopPresentProbe?: DesktopPresentProbeEvidence | null
  /** Law XV Capability Score 0–100 when known */
  capabilityScore?: number
  /** Explicit hold flags from feature config */
  forceWebHeld?: boolean
  forceDesktopHeld?: boolean
}

/**
 * CW3 chrome label — present-path status drives the primary string.
 * Marketing fail-closed must not rewrite a live path as `[HELD]`.
 */
export function formatRendererHonestyPrimaryLabel(input: {
  webStatus?: string | null
  activePath?: string | null
  capabilityScore?: number
  renderTier?: string
}): string {
  const webStatus = input.webStatus || 'held'
  const pathLabel = input.activePath || webStatus || 'unknown'
  const scoreLabel =
    typeof input.capabilityScore === 'number'
      ? ` · Cap ${input.capabilityScore}${input.renderTier ? `/${input.renderTier}` : ''}`
      : ''
  if (webStatus === 'live') return `Render · ${pathLabel}${scoreLabel}`
  if (webStatus === 'fallback') return `Fallback · ${pathLabel}${scoreLabel}`
  return `[HELD] · ${pathLabel}${scoreLabel}`
}

/**
 * Produce an honest capability report for IDE / Hub / Critic gates.
 */
export function evaluateRendererHonesty(input: RendererHonestyInput = {}): RendererHonestyReport {
  const notes: string[] = []
  const score = input.capabilityScore
  const scoreOk = score === undefined || (score >= 0 && score <= 100)

  const livePath = resolveLiveRenderPathHonesty({
    webgpuAvailable: input.webgpuAvailable,
    webgpuAdapterAcquired: input.webgpuAdapterAcquired,
    webgl2Available: input.webgl2Available,
    desktopWgpuMounted: input.desktopWgpuAvailable,
    desktopPresentProbe: input.desktopPresentProbe,
    forceHeld: input.forceWebHeld,
  })

  const webgpuPresentClaim = evaluateWebGpuPresentClaim({
    claimsWebGpuPresent: input.claimsWebGpuPresent === true,
    adapterAcquired: input.webgpuAdapterAcquired,
    deviceReady: input.webgpuDeviceReady,
  })

  let web: RendererSurfaceReport
  if (input.forceWebHeld) {
    web = {
      surface: 'web',
      preferredPath: 'r3f-webgl2',
      activePath: 'held',
      status: 'held',
      capabilityStatus: 'NOT_IMPLEMENTED',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      pathClass: 'held',
      notes: ['Web renderer explicitly held — do not show poster as live viewport'],
      heldReason: 'forceWebHeld',
    }
  } else if (input.webgl2Available !== false) {
    // CW3 honesty: live present is always R3F→WebGL2.
    // WebGPU API/adapter probe must never flip present status or imply WebGPU present.
    const adapterNote = input.webgpuAvailable
      ? 'WebGPU API probed (compute/experimental) — not the viewport present path'
      : 'WebGL2 official Safari/web present path — not AAA parity claim'
    web = {
      surface: 'web',
      preferredPath: 'r3f-webgl2',
      activePath: 'r3f-webgl2',
      status: 'live',
      capabilityStatus: 'PARTIAL',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      pathClass: 'canonical',
      notes: [adapterNote, livePath.claim],
    }
  } else {
    web = {
      surface: 'web',
      preferredPath: 'r3f-webgl2',
      activePath: 'held',
      status: 'held',
      capabilityStatus: 'NOT_IMPLEMENTED',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      pathClass: 'held',
      notes: ['No WebGL2 — viewport must hide or show [HELD]'],
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
      pathClass: 'held',
      notes: ['Desktop wgpu not ready — hide AAA viewport claims'],
      heldReason: input.forceDesktopHeld ? 'forceDesktopHeld' : 'wgpu_unavailable',
    }
  } else if (
    input.desktopPresentProbe?.presented === true &&
    input.desktopPresentProbe.submitted === true
  ) {
    // Proven secondary-window submit+present — still not Studio viewport / UE RHI.
    // status stays fallback: operator IDE present remains R3F/WebGL2 (never dual-live).
    desktop = {
      surface: 'desktop',
      preferredPath: 'wgpu',
      activePath: 'wgpu-live-present',
      status: 'fallback',
      capabilityStatus: 'PARTIAL',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      pathClass: 'experimental',
      notes: [
        `Native wgpu submit+present proven on ${input.desktopPresentProbe.surfaceKind ?? 'secondary_winit'} (${input.desktopPresentProbe.backend ?? 'wgpu'}) — WebView exclusive + UE RHI parity [HELD]; Studio canonical present remains R3F/WebGL2`,
      ],
    }
  } else if (input.desktopWgpuAvailable === true) {
    // Mount only — present loop unproven (CW3 catalog experimental_mount).
    desktop = {
      surface: 'desktop',
      preferredPath: 'wgpu',
      activePath: 'wgpu-mount',
      status: 'fallback',
      capabilityStatus: 'PARTIAL',
      capabilityScoreRespected: scoreOk,
      placeboForbidden: true,
      pathClass: 'experimental',
      notes: [
        'Native wgpu adapter mounted — present/submit unproven until renderer_present_probe.presented+submitted=true',
      ],
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
      pathClass: 'held',
      notes: ['Desktop wgpu probe not supplied — treat as held until verified'],
      heldReason: 'unprobed',
    }
  }

  // Fail-closed: never market dual AAA present from web R3F + desktop mount probe alone.
  const marketingAllowed = false

  const claim =
    web.status === 'held' && desktop.status === 'held'
      ? 'Renderer held — no live GPU path claimed'
      : desktop.activePath === 'wgpu-live-present'
        ? 'Web R3F/WebGL2 canonical + desktop secondary-winit live_present — WebView exclusive / UE RHI / Nanite HELD'
        : web.activePath === 'r3f-webgl2'
          ? 'Web R3F/WebGL2 present path (canonical) — desktop AAA present separate / HELD'
          : 'Partial live GPU — use capabilityStatus, never poster placebo'

  notes.push(...web.notes, ...desktop.notes)
  if (input.claimsWebGpuPresent === true) {
    notes.push(webgpuPresentClaim.reason)
  }
  log.info('renderer_honesty_evaluated', {
    web: web.activePath,
    desktop: desktop.activePath,
    pathClass: web.pathClass,
    marketingAllowed,
    presentRoot: livePath.presentRoot.canonicalPresentId,
    webgpuPresentAllowed: webgpuPresentClaim.allowed,
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
    livePath,
    presentRoot: livePath.presentRoot,
    webgpuPresentClaim,
  }
}
