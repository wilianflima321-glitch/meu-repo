/**
 * Letter bn — Rust AethelPack cook-worker probe.
 * Scaffold only when cargo/rustc are present; otherwise honest HELD.
 * BC7/ASTC encode never claimed from this probe alone.
 */

export interface AethelPackRustCookProbe {
  rustToolchainPresent: boolean
  cargoTomlPresent: boolean
  /** True only when rustc+cargo detected — never invents encode workers. */
  rustCookWorkerScaffoldAllowed: boolean
  bc7EncoderReady: false
  astcEncoderReady: false
  virtualTexturingCookReady: false
  status: 'held' | 'scaffold-path'
  notes: string[]
}

/**
 * Probe host for Rust cook toolchain. Does not shell out (Zero-MVP / no hang);
 * callers may pass explicit detection results from a prior env check.
 */
export function probeAethelPackRustCookWorker(input?: {
  rustcAvailable?: boolean
  cargoAvailable?: boolean
  /** studio-local Cargo.toml known present in monorepo. */
  cargoTomlPresent?: boolean
}): AethelPackRustCookProbe {
  const cargoTomlPresent = input?.cargoTomlPresent !== false
  const rustc = input?.rustcAvailable === true
  const cargo = input?.cargoAvailable === true
  const rustToolchainPresent = rustc && cargo

  if (!rustToolchainPresent) {
    return {
      rustToolchainPresent: false,
      cargoTomlPresent,
      rustCookWorkerScaffoldAllowed: false,
      bc7EncoderReady: false,
      astcEncoderReady: false,
      virtualTexturingCookReady: false,
      status: 'held',
      notes: [
        'rustc/cargo absent on executor host — Rust AethelPack cook worker HELD',
        'BC7/ASTC native encode HELD — do not fake GPU formats',
        'JS cook path (Zstd WASM prefer / pako deflate + checksums) remains the proven pack writer',
        cargoTomlPresent
          ? 'apps/studio-local/src-tauri/Cargo.toml present but toolchain unavailable'
          : 'Cargo.toml path not confirmed',
      ],
    }
  }

  return {
    rustToolchainPresent: true,
    cargoTomlPresent,
    rustCookWorkerScaffoldAllowed: true,
    bc7EncoderReady: false,
    astcEncoderReady: false,
    virtualTexturingCookReady: false,
    status: 'scaffold-path',
    notes: [
      'Rust toolchain present — cook worker scaffold path allowed',
      'BC7/ASTC encoders still HELD until intel_tex / equivalent wired + proven',
      'Virtual texturing cook HELD',
    ],
  }
}
