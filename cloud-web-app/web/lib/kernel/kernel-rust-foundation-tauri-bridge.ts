/**
 * Letter do — web ↔ Tauri IPC bridge for Kernel Rust foundation desktop soak evidence.
 *
 * When `__TAURI__` / invoke is available, requests dc–dm probe cmds and maps ready
 * flags into soak gates. Plain browser fail-closed (no invent green).
 * Distinct from dn honesty docs: this is the live wire path.
 *
 * `kernelRustFoundationWebWireReady` = wire exists (this module shipped).
 * `kernelRustFoundationReady` still requires proven tauri-ipc (or vitest-inject) + all gates.
 */

import {
  acceptKernelRustFoundationDesktopSoakEvidence,
  type KernelRustFoundationDesktopSoakEvidence,
} from '@/lib/kernel/kernel-rust-foundation-honesty'
import {
  KERNEL_RUST_FOUNDATION_SOAK_GATES,
  KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER,
  KERNEL_RUST_FOUNDATION_WEB_WIRE_READY,
  allKernelRustFoundationSoakGatesTrue,
  emptyKernelRustFoundationSoakGates,
  type KernelRustFoundationSoakGate,
  type KernelRustFoundationSoakGates,
} from '@/lib/kernel/kernel-rust-foundation-surface'

export {
  KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER,
  KERNEL_RUST_FOUNDATION_WEB_WIRE_READY,
}

export type TauriInvokeFn = (
  command: string,
  args?: Record<string, unknown>,
) => Promise<unknown>

/** Canonical Tauri probe commands → soak gate + camelCase ready field. */
export const KERNEL_RUST_FOUNDATION_TAURI_PROBE_CMDS: readonly {
  gate: KernelRustFoundationSoakGate
  command: string
  readyKey: string
}[] = [
  {
    gate: 'probeKernelFoundation',
    command: 'probe_kernel_foundation_cmd',
    readyKey: 'probeKernelFoundation',
  },
  {
    gate: 'kernelDesktopWireReady',
    command: 'probe_kernel_desktop_wire_cmd',
    readyKey: 'kernelDesktopWireReady',
  },
  {
    gate: 'kernelMutDnaDesktopReady',
    command: 'probe_kernel_mut_dna_desktop_cmd',
    readyKey: 'kernelMutDnaDesktopReady',
  },
  {
    gate: 'kernelSpectralSonicDesktopReady',
    command: 'probe_kernel_spectral_sonic_desktop_cmd',
    readyKey: 'kernelSpectralSonicDesktopReady',
  },
  {
    gate: 'worldSoaSabLayoutReady',
    command: 'probe_world_soa_sab_layout_cmd',
    readyKey: 'worldSoaSabLayoutReady',
  },
  {
    gate: 'mmapEcsPagerReady',
    command: 'probe_mmap_ecs_pager_cmd',
    readyKey: 'mmapEcsPagerReady',
  },
  {
    gate: 'simdClayMathReady',
    command: 'probe_simd_clay_math_cmd',
    readyKey: 'simdClayMathReady',
  },
  {
    gate: 'simdWorldSoaHotPathReady',
    command: 'probe_simd_world_soa_hot_path_cmd',
    readyKey: 'simdWorldSoaHotPathReady',
  },
  {
    gate: 'baremetalMemoryManagerReady',
    command: 'probe_baremetal_memory_manager_cmd',
    readyKey: 'baremetalMemoryManagerReady',
  },
  {
    gate: 'slabAllocatorMmapReady',
    command: 'probe_slab_allocator_mmap_cmd',
    readyKey: 'slabAllocatorMmapReady',
  },
] as const

function isTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  return '__TAURI_INTERNALS__' in window || '__TAURI__' in window
}

export function detectKernelRustFoundationTauriBridgeAvailable(): boolean {
  return isTauriRuntime()
}

export function getKernelRustFoundationWebWireReady(): boolean {
  return KERNEL_RUST_FOUNDATION_WEB_WIRE_READY
}

/** Dynamic import that Vite/vitest cannot statically resolve (desktop-only deps). */
async function importDesktopCore(): Promise<{
  invoke: TauriInvokeFn
}> {
  const specifier = ['@tauri-apps', 'api', 'core'].join('/')
  // eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
  const dynamicImport = new Function('s', 'return import(s)') as (
    s: string,
  ) => Promise<{ invoke: TauriInvokeFn }>
  return dynamicImport(specifier)
}

async function defaultTauriInvoke(
  command: string,
  args?: Record<string, unknown>,
): Promise<unknown> {
  const core = await importDesktopCore()
  return core.invoke(command, args)
}

function readReadyFlag(
  report: unknown,
  readyKey: string,
): boolean {
  if (!report || typeof report !== 'object') return false
  const v = (report as Record<string, unknown>)[readyKey]
  return v === true
}

/**
 * Request/read Tauri IPC soak probe results for all dc–dm gates.
 * Fail-closed when Tauri/invoke unavailable or any invoke throws.
 */
export async function fetchKernelRustFoundationDesktopSoakEvidenceFromTauri(
  options: {
    /** Injected invoke (Vitest mock). Production omits → real Tauri core.invoke. */
    invoke?: TauriInvokeFn
    /** Skip runtime `__TAURI__` check (tests that inject invoke). */
    forceInvoke?: boolean
  } = {},
): Promise<KernelRustFoundationDesktopSoakEvidence> {
  const notes: string[] = [
    'letter do — web/Tauri kernel foundation soak bridge',
  ]

  const hasInject = typeof options.invoke === 'function'
  const tauriOk =
    options.forceInvoke === true || hasInject || isTauriRuntime()

  if (!tauriOk) {
    return {
      proven: false,
      source: 'none',
      gates: emptyKernelRustFoundationSoakGates(),
      notes: [
        ...notes,
        'letter do — Tauri IPC unavailable (plain browser fail-closed)',
      ],
    }
  }

  const invoke = options.invoke ?? defaultTauriInvoke
  const gates = emptyKernelRustFoundationSoakGates()
  const cmdNotes: string[] = []

  try {
    for (const entry of KERNEL_RUST_FOUNDATION_TAURI_PROBE_CMDS) {
      const report = await invoke(entry.command)
      const ok = readReadyFlag(report, entry.readyKey)
      gates[entry.gate] = ok
      cmdNotes.push(
        `letter do — ${entry.command} → ${entry.gate}=${ok}`,
      )
    }
  } catch (err) {
    return {
      proven: false,
      source: 'tauri-ipc',
      gates: emptyKernelRustFoundationSoakGates(),
      notes: [
        ...notes,
        ...cmdNotes,
        `letter do — Tauri invoke failed: ${err instanceof Error ? err.message : String(err)}`,
      ],
    }
  }

  const complete = allKernelRustFoundationSoakGatesTrue(gates)
  return {
    proven: complete,
    source: 'tauri-ipc',
    gates,
    notes: [
      ...notes,
      ...cmdNotes,
      complete
        ? 'letter do — all soak gates proven via tauri-ipc'
        : 'letter do — soak gates incomplete via tauri-ipc (fail-closed)',
    ],
  }
}

/**
 * Fetch Tauri evidence and accept into honesty cache when proven.
 * Plain browser: no-op accept of unproven evidence (ready stays HELD).
 */
export async function syncKernelRustFoundationDesktopSoakFromTauri(
  options: {
    invoke?: TauriInvokeFn
    forceInvoke?: boolean
  } = {},
): Promise<{
  evidence: KernelRustFoundationDesktopSoakEvidence
  accepted: boolean
  kernelRustFoundationWebWireReady: typeof KERNEL_RUST_FOUNDATION_WEB_WIRE_READY
}> {
  const evidence = await fetchKernelRustFoundationDesktopSoakEvidenceFromTauri(
    options,
  )
  acceptKernelRustFoundationDesktopSoakEvidence(evidence)
  return {
    evidence,
    accepted:
      evidence.proven === true &&
      evidence.source === 'tauri-ipc' &&
      allKernelRustFoundationSoakGatesTrue(evidence.gates),
    kernelRustFoundationWebWireReady: KERNEL_RUST_FOUNDATION_WEB_WIRE_READY,
  }
}

/** Vitest helper — mock invoke that returns all gates ready. */
export function makeKernelRustFoundationMockTauriInvoke(
  overrides?: Partial<Record<KernelRustFoundationSoakGate, boolean>>,
): TauriInvokeFn {
  const ready: KernelRustFoundationSoakGates = emptyKernelRustFoundationSoakGates()
  for (const k of KERNEL_RUST_FOUNDATION_SOAK_GATES) {
    ready[k] = overrides?.[k] ?? true
  }

  return async (command: string) => {
    const entry = KERNEL_RUST_FOUNDATION_TAURI_PROBE_CMDS.find(
      (c) => c.command === command,
    )
    if (!entry) {
      throw new Error(`unexpected tauri command: ${command}`)
    }
    return { [entry.readyKey]: ready[entry.gate] === true }
  }
}
