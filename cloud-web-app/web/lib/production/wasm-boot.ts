/**
 * WASM kernel boot helper — honest fail-closed when `@aethel/kernel-wasm` is absent.
 * P2b HIGH #25: no console theater / supremacy timing claims.
 */

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('wasm-boot')

type WasmKernelModule = {
  init_panic_hook: () => void
  process_binary_intent: (binaryInstruction: Uint8Array) => void
}

let rustKernelInstance: WasmKernelModule | null = null

/** Honest readiness — true only after a successful dynamic import + init. */
export function isAethelKernelWasmBooted(): boolean {
  return rustKernelInstance != null
}

export async function bootAethelKernelWasm(): Promise<void> {
  if (rustKernelInstance) {
    return
  }

  const packageName = '@aethel/kernel-wasm'
  log.info('wasm_boot_attempt', { package: packageName })

  try {
    // Opaque dynamic import so bundlers do not statically require a missing package.
    // Fail-closed when unresolved — never invent a booted kernel.
    const dynamicImport = new Function(
      'specifier',
      'return import(specifier)',
    ) as (specifier: string) => Promise<WasmKernelModule>
    const aethelKernel = await dynamicImport(packageName)

    if (typeof aethelKernel.init_panic_hook !== 'function') {
      throw new Error('kernel_wasm_missing_init_panic_hook')
    }

    aethelKernel.init_panic_hook()
    rustKernelInstance = aethelKernel

    log.info('wasm_boot_ok', { note: 'Kernel WASM module initialized (no timing/marketing claim)' })
  } catch (error) {
    rustKernelInstance = null
    log.warn('wasm_boot_held', {
      reason: 'kernel_wasm_unavailable',
      error: error instanceof Error ? error.message : String(error),
    })
    throw new Error('Aethel Engine Kernel WASM unavailable — boot HELD (package not resolved)')
  }
}

/**
 * Binary intent dispatch — requires a prior successful boot.
 * Never invents a silent no-op success when the kernel is missing.
 */
export function dispatchBinaryIntentToKernel(binaryInstruction: Uint8Array): void {
  if (!rustKernelInstance) {
    throw new Error('Aethel WASM Kernel not booted — call bootAethelKernelWasm first')
  }
  rustKernelInstance.process_binary_intent(binaryInstruction)
}

/** Test-only reset — keeps production boot state honest across vitest cases. */
export function __resetWasmBootForTests(): void {
  rustKernelInstance = null
}
