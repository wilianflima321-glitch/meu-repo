export type AethelRendererKind = 'webgpu' | 'webgl2'

export type AethelRendererHandle = {
  kind: AethelRendererKind
  renderer: unknown
  initialized: boolean
  fallbackReason?: string
}

export type CreateAethelRendererOptions = {
  canvas: HTMLCanvasElement
  preferWebGPU?: boolean
  antialias?: boolean
  powerPreference?: 'default' | 'high-performance' | 'low-power'
}

export type AethelRendererPlanInput = {
  preferWebGPU?: boolean
  navigatorGpuAvailable: boolean
  webgpuModuleAvailable?: boolean
  webgpuInitOk?: boolean
}

export type AethelRendererPlan = {
  preferred: AethelRendererKind
  fallback: AethelRendererKind | null
  reason: string | null
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

export function planAethelRenderer(input: AethelRendererPlanInput): AethelRendererPlan {
  if (input.preferWebGPU === false) {
    return { preferred: 'webgl2', fallback: null, reason: 'webgpu disabled by caller' }
  }
  if (!input.navigatorGpuAvailable) {
    return { preferred: 'webgl2', fallback: null, reason: 'navigator.gpu is not available' }
  }
  if (input.webgpuModuleAvailable === false) {
    return { preferred: 'webgl2', fallback: null, reason: 'Three WebGPURenderer module is not available' }
  }
  if (input.webgpuInitOk === false) {
    return { preferred: 'webgl2', fallback: null, reason: 'WebGPU renderer initialization failed' }
  }
  return { preferred: 'webgpu', fallback: 'webgl2', reason: null }
}

async function tryCreateWebGPURenderer(options: Required<CreateAethelRendererOptions>): Promise<AethelRendererHandle | null> {
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
  const options: Required<CreateAethelRendererOptions> = {
    canvas: input.canvas,
    preferWebGPU: input.preferWebGPU !== false,
    antialias: input.antialias !== false,
    powerPreference: input.powerPreference ?? 'high-performance',
  }

  if (options.preferWebGPU) {
    const webgpu = await tryCreateWebGPURenderer(options)
    if (webgpu?.kind === 'webgpu') return webgpu
    const fallbackReason = webgpu?.fallbackReason
    const webgl = await createWebGLFallback(options)
    return { ...webgl, fallbackReason }
  }

  return createWebGLFallback(options)
}

async function createWebGLFallback(options: Required<CreateAethelRendererOptions>): Promise<AethelRendererHandle> {
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
