export type AethelRendererKind = 'webgpu' | 'webgl2'

export type AethelRendererHandle = {
  kind: AethelRendererKind
  renderer: unknown
  initialized: boolean
  fallbackReason?: string
}

export type CreateAethelRendererOptions = {
  canvas: HTMLCanvasElement
  /**
   * CW3 — opt-in only. Default false: canonical Studio present is R3F/WebGL2.
   * Even when true, adapter+device evidence is required before a WebGPU handle.
   */
  preferWebGPU?: boolean
  antialias?: boolean
  powerPreference?: 'default' | 'high-performance' | 'low-power'
  /** CW3 — requestAdapter() acquired (required with deviceReady for WebGPU factory). */
  webgpuAdapterAcquired?: boolean
  /** CW3 — GPUDevice ready (still ≠ Studio viewport present). */
  webgpuDeviceReady?: boolean
}

export type AethelRendererPlanInput = {
  preferWebGPU?: boolean
  navigatorGpuAvailable: boolean
  webgpuModuleAvailable?: boolean
  webgpuInitOk?: boolean
  /**
   * CW3 — requestAdapter() acquired a non-null adapter.
   * Required (with deviceReady) before any preferred=webgpu plan.
   */
  webgpuAdapterAcquired?: boolean
  /** CW3 — GPUDevice ready for a present surface (still experimental / unwired). */
  webgpuDeviceReady?: boolean
}

export type AethelRendererPlan = {
  preferred: AethelRendererKind
  fallback: AethelRendererKind | null
  reason: string | null
  /** CW3 — true only when plan preferred webgpu with adapter+device evidence. */
  webgpuPresentClaimAllowed: false
}

type RendererConstructor = new (options: {
  canvas: HTMLCanvasElement
  antialias?: boolean
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}) => {
  init?: () => Promise<void>
}

function hasBrowserWebGPU(): boolean {
  if (typeof navigator === 'undefined') return false
  return Boolean((navigator as Navigator & { gpu?: unknown }).gpu)
}

/**
 * Plan preferred renderer kind.
 * CW3 fail-closed: never prefer WebGPU present without adapter+device evidence.
 * Even with both, Studio canonical present remains R3F/WebGL2 (plan is experimental factory only).
 */
export function planAethelRenderer(input: AethelRendererPlanInput): AethelRendererPlan {
  const failClosed = { webgpuPresentClaimAllowed: false as const }
  if (input.preferWebGPU === false) {
    return {
      preferred: 'webgl2',
      fallback: null,
      reason: 'webgpu disabled by caller',
      ...failClosed,
    }
  }
  if (!input.navigatorGpuAvailable) {
    return {
      preferred: 'webgl2',
      fallback: null,
      reason: 'navigator.gpu is not available',
      ...failClosed,
    }
  }
  if (input.webgpuModuleAvailable === false) {
    return {
      preferred: 'webgl2',
      fallback: null,
      reason: 'Three WebGPURenderer module is not available',
      ...failClosed,
    }
  }
  if (input.webgpuInitOk === false) {
    return {
      preferred: 'webgl2',
      fallback: null,
      reason: 'WebGPU renderer initialization failed',
      ...failClosed,
    }
  }
  // CW3 — API-exists / module-ok ≠ adapter+device ≠ viewport present.
  if (input.webgpuAdapterAcquired !== true || input.webgpuDeviceReady !== true) {
    return {
      preferred: 'webgl2',
      fallback: null,
      reason:
        'CW3 fail-closed: WebGPU present plan requires adapter+device (API/module alone insufficient)',
      ...failClosed,
    }
  }
  // Experimental factory preference only — never elevates WebGPU to canonical Studio present.
  return {
    preferred: 'webgpu',
    fallback: 'webgl2',
    reason: 'experimental WebGPU factory (adapter+device) — canonical present remains R3F/WebGL2',
    ...failClosed,
  }
}

type CreateRendererCoreOptions = {
  canvas: HTMLCanvasElement
  antialias: boolean
  powerPreference: 'default' | 'high-performance' | 'low-power'
}

async function tryCreateWebGPURenderer(
  options: CreateRendererCoreOptions,
): Promise<AethelRendererHandle | null> {
  if (!hasBrowserWebGPU()) {
    return {
      kind: 'webgl2',
      renderer: null,
      initialized: false,
      fallbackReason: 'navigator.gpu is not available',
    }
  }

  const rendererModule = await import('three/examples/jsm/renderers/webgpu/WebGPURenderer.js').catch(() => null)
  const Renderer = rendererModule && 'default' in rendererModule
    ? (rendererModule.default as RendererConstructor)
    : null

  if (!Renderer) {
    return {
      kind: 'webgl2',
      renderer: null,
      initialized: false,
      fallbackReason: 'Three WebGPURenderer module is not available',
    }
  }

  const renderer = new Renderer({
    canvas: options.canvas,
    antialias: options.antialias,
    powerPreference: options.powerPreference,
  })

  try {
    await renderer.init?.()
    return {
      kind: 'webgpu',
      renderer,
      initialized: true,
    }
  } catch (error) {
    return {
      kind: 'webgl2',
      renderer: null,
      initialized: false,
      fallbackReason: error instanceof Error ? error.message : 'WebGPU renderer initialization failed',
    }
  }
}

export async function createAethelRenderer(input: CreateAethelRendererOptions): Promise<AethelRendererHandle> {
  const core: CreateRendererCoreOptions = {
    canvas: input.canvas,
    antialias: input.antialias !== false,
    powerPreference: input.powerPreference ?? 'high-performance',
  }

  // CW3: WebGPU factory is opt-in — never default to WebGPU present theater.
  const preferWebGPU = input.preferWebGPU === true
  const plan = planAethelRenderer({
    preferWebGPU,
    navigatorGpuAvailable: hasBrowserWebGPU(),
    webgpuModuleAvailable: true,
    webgpuAdapterAcquired: input.webgpuAdapterAcquired,
    webgpuDeviceReady: input.webgpuDeviceReady,
  })

  if (plan.preferred !== 'webgpu') {
    const webgl = await createWebGLFallback(core)
    return {
      ...webgl,
      fallbackReason: plan.reason ?? 'canonical present remains R3F/WebGL2',
    }
  }

  const webgpu = await tryCreateWebGPURenderer(core)
  if (webgpu?.kind === 'webgpu') return webgpu
  const fallbackReason = webgpu?.fallbackReason
  const webgl = await createWebGLFallback(core)
  return { ...webgl, fallbackReason }
}

async function createWebGLFallback(options: CreateRendererCoreOptions): Promise<AethelRendererHandle> {
  const THREE = await import('three')
  const renderer = new THREE.WebGLRenderer({
    canvas: options.canvas,
    antialias: options.antialias,
    powerPreference: options.powerPreference,
  })

  return {
    kind: 'webgl2',
    renderer,
    initialized: true,
  }
}
