/**
 * CW3 — Canonical render-path honesty catalog + operator present-root document.
 * Classify present/compute paths; fail-closed marketing. Does not rewrite renderers.
 *
 * Operator contract (binding until CW3 DONE / UE-parity present):
 * - Canonical present today = R3F → WebGL2 (Studio/IDE viewport)
 * - WebGPU = adapter/device probe + compute only (never viewport present)
 * - Desktop wgpu = experimental_mount until present probe proves submit+present;
 *   then live_present (secondary controlled surface only — WebView exclusive HELD)
 * - Condemned = dual-pipeline / placeholder surfaces that must not reappear as live
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('render-path-honesty')

export type RenderPathClass =
  | 'canonical'
  | 'compatibility'
  | 'experimental'
  | 'condemned'

export type RenderPathSurface = 'web-ide' | 'web-studio' | 'web-tool' | 'desktop' | 'probe'

export interface RenderPathEntry {
  id: string
  label: string
  surface: RenderPathSurface
  classification: RenderPathClass
  /** True only when this entry can present frames to an operator viewport today. */
  presentsFrames: boolean
  entryPoints: string[]
  notes: string
  /** Marketing claim names that must stay gated for this path. */
  gatedClaims: string[]
}

/** Catalog id of the single operator-facing Studio/IDE present authority today. */
export const CANONICAL_PRESENT_ROOT_ID = 'web-r3f-webgl2' as const

export type WebGpuPathRole = 'adapter_probe_only'
/**
 * Desktop wgpu honesty role.
 * - `experimental_mount` — adapter/surface mount and/or unproven present
 * - `live_present` — only when Tauri `renderer_present_probe` returned
 *   `presented: true` **and** `submitted: true` (secondary winit swapchain).
 *   Never means UE RHI / WebView exclusive / Nanite; desktop status stays fallback.
 */
export type DesktopWgpuPathRole = 'experimental_mount' | 'live_present'

/**
 * Single operator-facing present-root document (CW3).
 * Badges + `/api/runtime/renderer-honesty` must expose this — not a second story.
 */
export interface CanonicalPresentRootDocument {
  version: 'cw3-present-root-v1'
  canonicalPresentId: typeof CANONICAL_PRESENT_ROOT_ID
  canonicalPresentLabel: 'R3F/WebGL2'
  operatorSummary: string
  webgpuRole: WebGpuPathRole
  webgpuRoleNote: string
  desktopWgpuRole: DesktopWgpuPathRole
  desktopWgpuRoleNote: string
  /**
   * Structured desktop present probe (from Tauri `renderer_present_probe`).
   * Absent / presented≠true ⇒ role stays experimental_mount.
   */
  desktopPresentProbe?: DesktopPresentProbeEvidence | null
  condemnedPathIds: readonly string[]
  condemned: readonly RenderPathEntry[]
  experimentalNonPresentIds: readonly string[]
  marketingNaniteLumenAllowed: false
  /** Honest gap vs Unreal single RHI/present pipeline — stay PARTIAL until closed. */
  remainingVsUeSinglePipeline: string
}

/** Subset of Rust `RendererPresentProbeReport` for web honesty wiring. */
export interface DesktopPresentProbeEvidence {
  presented: boolean
  submitted?: boolean
  backend?: string
  surfaceKind?: string
  framesPresented?: number
  zeroCopyHotPath?: boolean
  webviewExclusivePresentHeld?: boolean
  unrealRhiParityReady?: boolean
  reasons?: string[]
}

/** Inventory of known R3F / Three / WebGPU / native wgpu paths (CW3). */
export const RENDER_PATH_CATALOG: readonly RenderPathEntry[] = [
  {
    id: 'web-r3f-webgl2',
    label: 'R3F WebGL2 (IDE viewport)',
    surface: 'web-ide',
    classification: 'canonical',
    presentsFrames: true,
    entryPoints: [
      'cloud-web-app/web/lib/viewport/ViewportSceneCanvas.runtime.tsx',
      'cloud-web-app/web/components/viewport/AethelViewport3D.tsx',
    ],
    notes: 'Primary web Studio/IDE present path via React Three Fiber Canvas → WebGL2.',
    gatedClaims: ['Nanite', 'Lumen', 'Ray Tracing', 'Path Tracing'],
  },
  {
    id: 'web-r3f-level-scene',
    label: 'R3F WebGL2 (World/Scene Studio)',
    surface: 'web-studio',
    classification: 'canonical',
    presentsFrames: true,
    entryPoints: [
      'cloud-web-app/packages/engine/LevelEditor.viewport-runtime.tsx',
      'cloud-web-app/web/lib/scene-editor/SceneEditor.canvas-runtime.tsx',
    ],
    notes: 'Domain Studio canvases share R3F/WebGL2; not a second renderer stack.',
    gatedClaims: ['Nanite', 'Lumen'],
  },
  {
    id: 'web-r3f-tool-editors',
    label: 'R3F tool editor canvases',
    surface: 'web-tool',
    classification: 'canonical',
    presentsFrames: true,
    entryPoints: [
      'cloud-web-app/web/lib/environment/FoliagePainterRuntime.tsx',
      'cloud-web-app/web/lib/terrain/TerrainSculptingEditor.runtime.tsx',
    ],
    notes: 'Per-tool authoring canvases; same WebGL2 family as IDE viewport.',
    gatedClaims: ['Nanite'],
  },
  {
    id: 'web-aaa-webgl-offcanvas',
    label: 'AAARenderer WebGL (off-canvas)',
    surface: 'web-ide',
    classification: 'experimental',
    presentsFrames: false,
    entryPoints: [
      'cloud-web-app/web/lib/aaa-renderer-impl.ts',
      'cloud-web-app/web/lib/render-tick.ts',
      'cloud-web-app/web/lib/game-loop.ts',
    ],
    notes: 'Playtest/composer stack present; not the live IDE Canvas present path.',
    gatedClaims: ['Nanite', 'Lumen', 'Ray Tracing', 'final offline render'],
  },
  {
    id: 'web-three-webgpu-renderer',
    label: 'Three WebGPURenderer plan',
    surface: 'web-ide',
    classification: 'experimental',
    presentsFrames: false,
    entryPoints: ['cloud-web-app/web/lib/aaa-renderer-webgpu.ts'],
    notes: 'Lazy WebGPURenderer factory exists; unwired to viewport present.',
    gatedClaims: ['WebGPU AAA viewport', 'Nanite'],
  },
  {
    id: 'web-webgpu-compute',
    label: 'Browser WebGPU compute lanes',
    surface: 'probe',
    classification: 'experimental',
    presentsFrames: false,
    entryPoints: [
      'cloud-web-app/packages/runtime/webgpu-compute-readiness.ts',
      'cloud-web-app/web/lib/ocean/gpu-fft-ocean.ts',
    ],
    notes: 'Adapter/compute probes only — not frame present.',
    gatedClaims: ['WebGPU present', 'DLSS'],
  },
  {
    id: 'web-preview-thumbnails',
    label: 'Offscreen WebGL previews',
    surface: 'web-tool',
    classification: 'compatibility',
    presentsFrames: true,
    entryPoints: [
      'cloud-web-app/web/lib/assets/asset-preview-mesh-runtime.tsx',
      'cloud-web-app/web/lib/marketplace/AssetModelPreviewRuntime.tsx',
    ],
    notes: 'Thumbnail / marketplace previews — not Studio supremacy path.',
    gatedClaims: ['AAA marketplace preview'],
  },
  {
    id: 'web-use-render-pipeline',
    label: 'useRenderPipeline dual WebGL',
    surface: 'web-ide',
    classification: 'condemned',
    presentsFrames: false,
    entryPoints: ['cloud-web-app/web/lib/hooks/useRenderPipeline.ts'],
    notes: 'Explicitly unwired — must not reappear as a second live present path.',
    gatedClaims: ['dual renderer', 'Nanite'],
  },
  {
    id: 'web-canvas-mode-placeholder',
    label: 'Canvas mode placeholder surface',
    surface: 'web-ide',
    classification: 'condemned',
    presentsFrames: false,
    entryPoints: ['cloud-web-app/web/components/preview/CanvasViewportSurface.tsx'],
    notes: 'No R3F — must not be marketed as a second renderer.',
    gatedClaims: ['alternate renderer'],
  },
  {
    id: 'desktop-wgpu-mount',
    label: 'Native wgpu mount + present probe',
    surface: 'desktop',
    classification: 'experimental',
    presentsFrames: false,
    entryPoints: [
      'apps/studio-local/src-tauri/src/wgpu_renderer.rs',
      'apps/studio-local/src-tauri/src/main.rs',
    ],
    notes:
      'Adapter/surface mount + renderer_present_probe (secondary winit submit+present). WebView exclusive + UE RHI parity HELD.',
    gatedClaims: ['desktop AAA present', 'Nanite', 'DLSS', 'Unreal RHI parity'],
  },
] as const

export interface BuildPresentRootOptions {
  /** Tauri present probe evidence — never invent presented:true in TS alone. */
  desktopPresentProbe?: DesktopPresentProbeEvidence | null
}

/**
 * Resolve desktop role from probe evidence only (fail-closed).
 */
export function resolveDesktopWgpuPathRole(
  probe?: DesktopPresentProbeEvidence | null,
): DesktopWgpuPathRole {
  // Fail-closed: Rust probe must prove both submit + present.
  // presented alone (or TS inventing submitted) must not flip the role.
  // UE RHI parity / Nanite must never be inferred here.
  if (probe?.presented === true && probe.submitted === true) {
    return 'live_present'
  }
  return 'experimental_mount'
}

/**
 * Build the single operator-facing present-root document from the catalog.
 * Always R3F/WebGL2 for Studio/IDE viewport; desktop role may be live_present
 * only when Rust probe proved secondary-window present.
 */
export function buildCanonicalPresentRootDocument(
  opts: BuildPresentRootOptions = {},
): CanonicalPresentRootDocument {
  const condemned = RENDER_PATH_CATALOG.filter((e) => e.classification === 'condemned')
  const experimentalNonPresent = RENDER_PATH_CATALOG.filter(
    (e) => e.classification === 'experimental' && !e.presentsFrames,
  )
  const probe = opts.desktopPresentProbe ?? null
  const desktopWgpuRole = resolveDesktopWgpuPathRole(probe)
  const desktopWgpuRoleNote =
    desktopWgpuRole === 'live_present'
      ? `Desktop present probe proved submit+present on ${probe?.surfaceKind ?? 'secondary_winit'} (${probe?.backend ?? 'wgpu'}); WebView exclusive + UE RHI parity still HELD. Nanite/Lumen false.`
      : 'Tauri wgpu adapter/surface mount; present/submit unproven or fail-closed — role experimental_mount until renderer_present_probe.presented=true.'

  return {
    version: 'cw3-present-root-v1',
    canonicalPresentId: CANONICAL_PRESENT_ROOT_ID,
    canonicalPresentLabel: 'R3F/WebGL2',
    operatorSummary:
      desktopWgpuRole === 'live_present'
        ? 'Canonical Studio/IDE present = R3F/WebGL2. WebGPU = adapter probe only. Desktop wgpu = live_present on controlled secondary surface (not WebView/UE RHI). Nanite/Lumen marketing false.'
        : 'Canonical present = R3F/WebGL2 (Studio/IDE). WebGPU = adapter probe only. Desktop wgpu = experimental mount. Nanite/Lumen marketing false.',
    webgpuRole: 'adapter_probe_only',
    webgpuRoleNote:
      'navigator.gpu / requestAdapter / device = compute or experimental factory only — not viewport present.',
    desktopWgpuRole,
    desktopWgpuRoleNote,
    desktopPresentProbe: probe,
    condemnedPathIds: condemned.map((e) => e.id),
    condemned,
    experimentalNonPresentIds: experimentalNonPresent.map((e) => e.id),
    marketingNaniteLumenAllowed: false,
    remainingVsUeSinglePipeline:
      desktopWgpuRole === 'live_present'
        ? 'UE ships one RHI into the game viewport; Aethel proved secondary-winit swapchain present only. WebView exclusive present, unified RHI, WebGPU viewport, Nanite/Lumen remain OPEN/HELD.'
        : 'UE ships one RHI present pipeline; Aethel still has R3F/WebGL2 canonical + AAA WebGL off-canvas + WebGPU compute probes + desktop wgpu mount (present probe unproven). Desktop present loop + WebGPU viewport present remain OPEN/HELD.',
  }
}

export interface LiveRenderPathHonesty {
  generatedAt: string
  /** Catalog id of the live present path (or held). */
  livePathId: string
  livePathLabel: string
  classification: RenderPathClass | 'held'
  presentsFrames: boolean
  /**
   * True when caller probed `navigator.gpu` / API surface only.
   * Name kept for API stability — never means `requestAdapter()` success or WebGPU present.
   */
  webgpuAdapterAvailable: boolean
  /**
   * True only after `navigator.gpu.requestAdapter()` resolved a non-null adapter.
   * Distinct from API-exists. Still never means viewport present.
   */
  webgpuAdapterAcquired: boolean | null
  webgl2Available: boolean
  desktopWgpuMounted: boolean | null
  marketingPresentAllowed: false
  claim: string
  catalog: readonly RenderPathEntry[]
  /** Operator-facing single present-root document (CW3). */
  presentRoot: CanonicalPresentRootDocument
}

/** Tick ids that GameLoop / AAARenderer may record (honesty hook — not a rewrite). */
export type PresentPathTickId =
  | typeof CANONICAL_PRESENT_ROOT_ID
  | 'web-aaa-webgl-offcanvas'
  | 'held'

export interface PresentPathTickRecord {
  pathId: PresentPathTickId
  at: string
  frameId?: number
  note: string
  /** Fail-closed: WebGPU never recorded as present from this hook. */
  webgpuPresentClaimed: false
}

let lastPresentPathTick: PresentPathTickRecord | null = null

/**
 * CW3 honesty hook — record which present path ticked (AAARenderer / GameLoop).
 * Never accepts a WebGPU present claim.
 */
export function recordPresentPathTick(
  pathId: PresentPathTickId,
  opts?: { frameId?: number; note?: string },
): PresentPathTickRecord {
  const record: PresentPathTickRecord = {
    pathId,
    at: new Date().toISOString(),
    frameId: opts?.frameId,
    note: opts?.note ?? `present tick · ${pathId}`,
    webgpuPresentClaimed: false,
  }
  lastPresentPathTick = record
  log.info('present_path_tick', {
    pathId: record.pathId,
    frameId: record.frameId,
  })
  return record
}

export function getLastPresentPathTick(): PresentPathTickRecord | null {
  return lastPresentPathTick
}

/** Test / probe reset — does not invent a live path. */
export function clearPresentPathTickForTests(): void {
  lastPresentPathTick = null
}

export interface WebGpuPresentClaimInput {
  /** Caller attempts to claim WebGPU as the viewport present path. */
  claimsWebGpuPresent: boolean
  /** True after requestAdapter() acquired a non-null adapter. */
  adapterAcquired?: boolean | null
  /** True after GPUDevice is ready for the present surface. */
  deviceReady?: boolean | null
}

export interface WebGpuPresentClaimVerdict {
  /** Viewport WebGPU present is never allowed on the CW3 canonical root. */
  allowed: false
  presentsFrames: false
  failClosed: true
  reason: string
  requiresAdapterAndDevice: true
  adapterAcquired: boolean
  deviceReady: boolean
}

/**
 * Fail-closed gate for any dual path that claims WebGPU present.
 * Even with adapter+device, Studio present remains R3F/WebGL2 until CW3 DONE.
 */
export function evaluateWebGpuPresentClaim(
  input: WebGpuPresentClaimInput,
): WebGpuPresentClaimVerdict {
  const adapterAcquired = input.adapterAcquired === true
  const deviceReady = input.deviceReady === true
  if (!input.claimsWebGpuPresent) {
    return {
      allowed: false,
      presentsFrames: false,
      failClosed: true,
      reason: 'No WebGPU present claim — canonical present remains R3F/WebGL2',
      requiresAdapterAndDevice: true,
      adapterAcquired,
      deviceReady,
    }
  }
  if (!adapterAcquired || !deviceReady) {
    log.warn('webgpu_present_claim_fail_closed', {
      adapterAcquired,
      deviceReady,
      reason: 'missing_adapter_or_device',
    })
    return {
      allowed: false,
      presentsFrames: false,
      failClosed: true,
      reason:
        'WebGPU present claim rejected — adapter+device required; still not canonical present (R3F/WebGL2)',
      requiresAdapterAndDevice: true,
      adapterAcquired,
      deviceReady,
    }
  }
  log.warn('webgpu_present_claim_fail_closed', {
    adapterAcquired,
    deviceReady,
    reason: 'canonical_is_r3f_webgl2',
  })
  return {
    allowed: false,
    presentsFrames: false,
    failClosed: true,
    reason:
      'WebGPU adapter+device probed — viewport present claim still fail-closed; canonical = R3F/WebGL2',
    requiresAdapterAndDevice: true,
    adapterAcquired,
    deviceReady,
  }
}

export interface LiveRenderPathInput {
  /** `navigator.gpu` / API surface only — not adapter acquisition, not present. */
  webgpuAvailable?: boolean
  /**
   * Result of `requestAdapter()` — null/undefined = unprobed; never invents present.
   */
  webgpuAdapterAcquired?: boolean | null
  webgl2Available?: boolean
  /** True when Tauri reported a mounted wgpu adapter (not present loop). */
  desktopWgpuMounted?: boolean
  /** Tauri present probe — flips desktop role only when presented===true. */
  desktopPresentProbe?: DesktopPresentProbeEvidence | null
  forceHeld?: boolean
}

export type WebGpuAdapterProbeResult = {
  apiAvailable: boolean
  adapterAcquired: boolean
  /** Fail-closed: adapter ≠ present path. */
  presentsFrames: false
  error?: string
}

/**
 * CW3 — distinct from `'gpu' in navigator`.
 * Acquires an adapter when possible; never claims present/frames.
 */
export async function probeWebGpuAdapterAcquisition(): Promise<WebGpuAdapterProbeResult> {
  if (typeof navigator === 'undefined' || !('gpu' in navigator) || !navigator.gpu) {
    return { apiAvailable: false, adapterAcquired: false, presentsFrames: false }
  }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return {
      apiAvailable: true,
      adapterAcquired: adapter != null,
      presentsFrames: false,
      error: adapter == null ? 'requestAdapter returned null' : undefined,
    }
  } catch (error) {
    return {
      apiAvailable: true,
      adapterAcquired: false,
      presentsFrames: false,
      error: error instanceof Error ? error.message : 'requestAdapter failed',
    }
  }
}

/**
 * Resolve which path operators are actually looking at.
 * Fail-closed: browser WebGPU adapter ≠ present path.
 */
export function resolveLiveRenderPathHonesty(
  input: LiveRenderPathInput = {},
): LiveRenderPathHonesty {
  const webgl2 = input.webgl2Available !== false
  const webgpuAdapter = input.webgpuAvailable === true
  const adapterAcquired =
    typeof input.webgpuAdapterAcquired === 'boolean' ? input.webgpuAdapterAcquired : null
  const desktopMounted =
    typeof input.desktopWgpuMounted === 'boolean' ? input.desktopWgpuMounted : null
  const desktopProbe = input.desktopPresentProbe ?? null

  const presentRoot = buildCanonicalPresentRootDocument({
    desktopPresentProbe: desktopProbe,
  })

  if (input.forceHeld || !webgl2) {
    const claim = 'No live WebGL2 present path — viewport must show [HELD]'
    log.info('render_path_live_held', { webgl2, webgpuAdapter, adapterAcquired })
    return {
      generatedAt: new Date().toISOString(),
      livePathId: 'held',
      livePathLabel: 'Held — no present path',
      classification: 'held',
      presentsFrames: false,
      webgpuAdapterAvailable: webgpuAdapter,
      webgpuAdapterAcquired: adapterAcquired,
      webgl2Available: webgl2,
      desktopWgpuMounted: desktopMounted,
      marketingPresentAllowed: false,
      claim,
      catalog: RENDER_PATH_CATALOG,
      presentRoot,
    }
  }

  const canonical = RENDER_PATH_CATALOG.find((e) => e.id === CANONICAL_PRESENT_ROOT_ID)!
  const desktopNote =
    presentRoot.desktopWgpuRole === 'live_present'
      ? ` Desktop wgpu live_present on ${desktopProbe?.surfaceKind ?? 'secondary_winit'} (WebView exclusive HELD).`
      : desktopMounted === true
        ? ' Desktop wgpu mount probed (present loop experimental/HELD until probe).'
        : desktopMounted === false
          ? ' Desktop wgpu unmounted.'
          : ''
  const acquireNote =
    adapterAcquired === true
      ? ' WebGPU requestAdapter acquired (compute only) — viewport present not claimed.'
      : adapterAcquired === false
        ? ' WebGPU requestAdapter failed/null — API may exist without adapter.'
        : webgpuAdapter
          ? ' WebGPU API probed (compute only) — adapter acquisition unprobed; viewport present not claimed.'
          : ' WebGPU API unavailable.'

  const claim = `${canonical.label} is the live present path (canonical).${acquireNote}${desktopNote}`

  log.info('render_path_live_resolved', {
    livePathId: canonical.id,
    webgpuAdapter,
    adapterAcquired,
    desktopMounted,
    desktopWgpuRole: presentRoot.desktopWgpuRole,
  })

  return {
    generatedAt: new Date().toISOString(),
    livePathId: canonical.id,
    livePathLabel: canonical.label,
    classification: canonical.classification,
    presentsFrames: true,
    webgpuAdapterAvailable: webgpuAdapter,
    webgpuAdapterAcquired: adapterAcquired,
    webgl2Available: true,
    desktopWgpuMounted: desktopMounted,
    marketingPresentAllowed: false,
    claim,
    catalog: RENDER_PATH_CATALOG,
    presentRoot,
  }
}

export function getRenderPathById(id: string): RenderPathEntry | undefined {
  return RENDER_PATH_CATALOG.find((entry) => entry.id === id)
}

/**
 * CW3 sibling chrome — viewport GPU chip must name the live present path (WebGL2).
 * `navigator.gpu` / adapter acquisition never rewrite the present label to WebGPU.
 */
export function formatViewportPresentGpuLabel(input: {
  webgpuApiAvailable?: boolean
  webgpuAdapterAcquired?: boolean | null
}): string {
  const api = input.webgpuApiAvailable === true
  const acquired = input.webgpuAdapterAcquired
  if (acquired === true) {
    return 'WebGL2 · WebGPU adapter (compute)'
  }
  if (acquired === false && api) {
    return 'WebGL2 · WebGPU API (no adapter)'
  }
  if (api) {
    return 'WebGL2 · WebGPU API (unprobed)'
  }
  return 'WebGL2'
}

/** Fail-closed gate: never allow Nanite/Coins-style claims from path class alone. */
export function isRenderPathMarketingAllowed(
  classification: RenderPathClass | 'held',
): false {
  void classification
  return false
}
