/**
 * Onda K — Console / Platform HAL trait (letter bs deepen).
 * Desktop: WebGPU / Vulkan / DX12 via wgpu portable path documented in code.
 * PS5 GNM = commercial HELD always — never flips ready.
 */

/** Honest backend ids — desktop via wgpu; PS5 never ship-ready. */
export type ConsoleHalBackend =
  | 'webgpu'
  | 'vulkan'
  | 'dx12'
  | 'ps5-gnm-held'
  /** @deprecated Prefer `webgpu` — kept for bi scaffold callers. */
  | 'wgpu-portable'
  /** @deprecated Prefer `ps5-gnm-held`. */
  | 'ps5-gnm'
  | 'metal'
  | 'unknown'

export type ConsoleHalStatus = 'scaffold' | 'partial' | 'live' | 'held'

/**
 * Desktop backends that exist as documented code paths (TS trait + studio-local wgpu).
 * PS5 is intentionally absent — commercial GNM never auto-proves.
 */
export const CONSOLE_HAL_DOCUMENTED_DESKTOP_BACKENDS: ReadonlyArray<ConsoleHalBackend> = [
  'webgpu',
  'wgpu-portable',
  'vulkan',
  'dx12',
]

/** Structural wire flag — HAL negotiate + desktop enum ship (letter bs). */
export const CONSOLE_HAL_DESKTOP_WIRED = true as const

export type ConsoleHalNegotiateRequest = {
  requestedBackend: ConsoleHalBackend
  /** When true, treats studio-local wgpu module as present (default: true — path exists in repo). */
  studioLocalWgpuPresent?: boolean
}

export type ConsoleHalNegotiateResult = {
  ok: boolean
  backend: ConsoleHalBackend
  /** True only for documented desktop backends that exist in code. Never for PS5. */
  consoleHalReady: boolean
  /** Always false — commercial GNM / DevNet not in repo. */
  ps5GnmReady: false
  reason: string
}

/**
 * Portable HAL surface — render/device submit contracts without proprietary SDKs.
 * Implementations live in desktop Rust (wgpu) or future console modules.
 */
export interface ConsoleHalDeviceCaps {
  backend: ConsoleHalBackend
  maxTexture2DSize: number
  supportsBindless: boolean
  supportsMeshShaders: boolean
  /** Always false for PS5 until commercial GNM branch exists. */
  proprietarySdkPresent: boolean
}

export interface ConsoleHalSubmitRequest {
  frameId: number
  commandBufferCasHash: string
  present: boolean
}

export interface ConsoleHalSubmitResult {
  accepted: boolean
  backend: ConsoleHalBackend
  heldReason?: string
}

/**
 * Trait-like TS contract for Platform HAL. PS5 module never claims ready.
 */
export interface ConsoleHalTrait {
  readonly backend: ConsoleHalBackend
  readonly status: ConsoleHalStatus
  probeCaps(): ConsoleHalDeviceCaps
  submit(frame: ConsoleHalSubmitRequest): ConsoleHalSubmitResult
}

export interface ConsoleHalHonestyReport {
  consoleHalReady: boolean
  /** Always false — commercial GNM / DevNet not in repo. */
  ps5GnmReady: false
  wgpuPortableScaffold: true
  dx12VulkanPath: 'held' | 'partial' | 'live'
  documentedDesktopBackends: ReadonlyArray<ConsoleHalBackend>
  claim: string
  notes: string[]
  placeboForbidden: true
}

function normalizeBackend(backend: ConsoleHalBackend): ConsoleHalBackend {
  if (backend === 'wgpu-portable') return 'webgpu'
  if (backend === 'ps5-gnm') return 'ps5-gnm-held'
  return backend
}

function isPs5Backend(backend: ConsoleHalBackend): boolean {
  return backend === 'ps5-gnm' || backend === 'ps5-gnm-held'
}

function isDocumentedDesktopBackend(backend: ConsoleHalBackend): boolean {
  const n = normalizeBackend(backend)
  return (
    n === 'webgpu' ||
    n === 'vulkan' ||
    n === 'dx12' ||
    backend === 'wgpu-portable'
  )
}

/**
 * Negotiate HAL backend. Fail-closed for PS5 GNM.
 * consoleHalReady only when requested backend is a documented desktop path in code.
 */
export function negotiateConsoleHal(
  input: ConsoleHalNegotiateRequest,
): ConsoleHalNegotiateResult {
  const requested = input.requestedBackend
  if (isPs5Backend(requested)) {
    return {
      ok: false,
      backend: 'ps5-gnm-held',
      consoleHalReady: false,
      ps5GnmReady: false,
      reason: 'PS5 GNM proprietary SDK not licensed — console HAL fail-closed (commercial HELD)',
    }
  }

  const studioLocalWgpuPresent = input.studioLocalWgpuPresent !== false
  if (!studioLocalWgpuPresent && (requested === 'vulkan' || requested === 'dx12')) {
    return {
      ok: false,
      backend: normalizeBackend(requested),
      consoleHalReady: false,
      ps5GnmReady: false,
      reason: 'studio-local wgpu entry absent — Vulkan/DX12 desktop path not proven in this probe',
    }
  }

  if (!isDocumentedDesktopBackend(requested)) {
    return {
      ok: false,
      backend: requested,
      consoleHalReady: false,
      ps5GnmReady: false,
      reason: `Backend ${requested} is not a documented desktop HAL path`,
    }
  }

  const backend = normalizeBackend(requested)
  return {
    ok: true,
    backend,
    consoleHalReady: true,
    ps5GnmReady: false,
    reason:
      backend === 'webgpu'
        ? 'WebGPU/wgpu-portable trait documented — desktop HAL negotiate ok (PS5 HELD)'
        : `Desktop ${backend} via wgpu documented in studio-local — HAL negotiate ok (PS5 HELD)`,
  }
}

/** Prove desktop HAL ready via negotiate against documented backends (letter bs). */
export function proveConsoleHalDesktopReady(input?: {
  preferredBackend?: ConsoleHalBackend
  studioLocalWgpuPresent?: boolean
}): boolean {
  const preferred = input?.preferredBackend ?? 'webgpu'
  if (isPs5Backend(preferred)) return false
  return negotiateConsoleHal({
    requestedBackend: preferred,
    studioLocalWgpuPresent: input?.studioLocalWgpuPresent,
  }).consoleHalReady
}

export function createWgpuPortableHalScaffold(): ConsoleHalTrait {
  return {
    backend: 'webgpu',
    status: 'partial',
    probeCaps() {
      return {
        backend: 'webgpu',
        maxTexture2DSize: 8192,
        supportsBindless: false,
        supportsMeshShaders: false,
        proprietarySdkPresent: false,
      }
    },
    submit(frame) {
      return {
        accepted: false,
        backend: 'webgpu',
        heldReason: `wgpu HAL deepen (bs) — no live console present for frame ${frame.frameId}; submit stays held until Founder desktop soak`,
      }
    },
  }
}

/**
 * Desktop Vulkan path stub — documented via studio-local wgpu (Vulkan backend).
 * Submit stays held until Founder unlock; negotiate may flip consoleHalReady.
 */
export function createVulkanDesktopHalPartial(): ConsoleHalTrait {
  return {
    backend: 'vulkan',
    status: 'partial',
    probeCaps() {
      return {
        backend: 'vulkan',
        maxTexture2DSize: 8192,
        supportsBindless: false,
        supportsMeshShaders: false,
        proprietarySdkPresent: false,
      }
    },
    submit(frame) {
      return {
        accepted: false,
        backend: 'vulkan',
        heldReason: `Vulkan via wgpu documented — submit not live for frame ${frame.frameId}`,
      }
    },
  }
}

/**
 * Desktop DX12 path stub — documented via studio-local wgpu (DX12 backend on Windows).
 */
export function createDx12DesktopHalPartial(): ConsoleHalTrait {
  return {
    backend: 'dx12',
    status: 'partial',
    probeCaps() {
      return {
        backend: 'dx12',
        maxTexture2DSize: 8192,
        supportsBindless: false,
        supportsMeshShaders: false,
        proprietarySdkPresent: false,
      }
    },
    submit(frame) {
      return {
        accepted: false,
        backend: 'dx12',
        heldReason: `DX12 via wgpu documented — submit not live for frame ${frame.frameId}`,
      }
    },
  }
}

/**
 * PS5 GNM module stub — commercial HELD. Never flips ready.
 */
export function createPs5GnmHalHeld(): ConsoleHalTrait {
  return {
    backend: 'ps5-gnm-held',
    status: 'held',
    probeCaps() {
      return {
        backend: 'ps5-gnm-held',
        maxTexture2DSize: 0,
        supportsBindless: false,
        supportsMeshShaders: false,
        proprietarySdkPresent: false,
      }
    },
    submit() {
      return {
        accepted: false,
        backend: 'ps5-gnm-held',
        heldReason: 'PS5 GNM proprietary SDK not licensed — console HAL HELD (commercial)',
      }
    },
  }
}

export function evaluateConsoleHalHonesty(input?: {
  dx12VulkanBackendLive?: boolean
  /** Force desktop HAL prove off (default: auto-prove via negotiate). */
  consoleHalProven?: boolean
  preferredBackend?: ConsoleHalBackend
  studioLocalWgpuPresent?: boolean
}): ConsoleHalHonestyReport {
  const preferred = input?.preferredBackend ?? 'webgpu'
  let consoleHalReady = false
  if (input?.consoleHalProven === false) {
    consoleHalReady = false
  } else if (input?.consoleHalProven === true) {
    consoleHalReady = !isPs5Backend(preferred)
  } else {
    consoleHalReady = proveConsoleHalDesktopReady({
      preferredBackend: preferred,
      studioLocalWgpuPresent: input?.studioLocalWgpuPresent,
    })
  }

  // Never allow PS5 to flip ready even if caller forces proven.
  if (isPs5Backend(preferred)) {
    consoleHalReady = false
  }

  const dxLive = input?.dx12VulkanBackendLive === true
  const dx12VulkanPath: ConsoleHalHonestyReport['dx12VulkanPath'] = dxLive
    ? 'live'
    : CONSOLE_HAL_DESKTOP_WIRED
      ? 'partial'
      : 'held'

  return {
    consoleHalReady,
    ps5GnmReady: false,
    wgpuPortableScaffold: true,
    dx12VulkanPath,
    documentedDesktopBackends: CONSOLE_HAL_DOCUMENTED_DESKTOP_BACKENDS,
    claim: consoleHalReady
      ? 'Console HAL = desktop WebGPU/Vulkan/DX12 via wgpu documented + negotiate ok — PS5 GNM [HELD] commercial; live present/submit still soak-gated'
      : 'Console HAL = wgpu portable trait — desktop negotiate not proven; PS5 GNM [HELD] commercial',
    notes: [
      'HAL trait deepen (bs): backend enum WebGPU / Vulkan / DX12 / PS5_HELD',
      'consoleHalReady only for documented desktop backends that exist in code',
      'PS5 GNM module never markets as ready without proprietary SDK + certification',
      'studio-local wgpu_renderer.rs documents Vulkan/DX12/Metal via wgpu::Backends',
      dxLive
        ? 'DX12/Vulkan path marked live by probe — present/certification still separate'
        : 'DX12/Vulkan path partial (documented in code) — native soak HELD',
      'No Coins / Agones / BC7 marketing from HAL deepen',
    ],
    placeboForbidden: true,
  }
}
