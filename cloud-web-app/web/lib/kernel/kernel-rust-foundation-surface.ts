/**
 * Letter dn — documented dc–dm Kernel Rust foundation surface (web honesty bridge).
 * Letter eg — deepen: document dq–ef extended real-kernel probes honestly.
 *
 * Rust letters dc–dm + dq–ef are CLOSED on packages/aethel-kernel-rust + studio-local
 * Tauri IPC. This module only documents that surface for the web probe — it does not
 * invent green. `kernelRustFoundationReady` still requires dc–dm soak gates + Tauri
 * evidence (dq–ef catalog is documentation-only).
 */

export const KERNEL_RUST_FOUNDATION_SURFACE_LETTER = 'dn' as const

/** Letter do — web ↔ Tauri soak bridge (wire exists; distinct from ready flip). */
export const KERNEL_RUST_FOUNDATION_WEB_WIRE_LETTER = 'do' as const
/** Wire shipped — not soak-gated `kernelRustFoundationReady`. */
export const KERNEL_RUST_FOUNDATION_WEB_WIRE_READY = true as const

/**
 * Letter eg — web catalog deepen for dq–ef real kernels.
 * Documentation probe only — does **not** flip `kernelRustFoundationReady`.
 */
export const KERNEL_RUST_EXTENDED_SURFACE_LETTER = 'eg' as const
/** Catalog documents dq–ef probe names; distinct from ready / Tauri soak. */
export const KERNEL_RUST_EXTENDED_SURFACE_DOCUMENTED = true as const
/** Surface doc version (dn foundation + eg extended deepen). */
export const KERNEL_RUST_FOUNDATION_SURFACE_VERSION = 'dn+eg' as const

/** Prior CLOSED Rust letters this bridge documents (not cv/cw/cy mass/fracture). */
export const KERNEL_RUST_FOUNDATION_SURFACE_LETTERS = [
  'dc',
  'dd',
  'de',
  'df',
  'dg',
  'dh',
  'di',
  'dj',
  'dk',
  'dl',
  'dm',
] as const

export type KernelRustFoundationSurfaceLetter =
  (typeof KERNEL_RUST_FOUNDATION_SURFACE_LETTERS)[number]

/** dq–ef real-kernel letters documented by letter eg (catalog only). */
export const KERNEL_RUST_EXTENDED_SURFACE_LETTERS = [
  'dq',
  'dr',
  'ds',
  'dt',
  'du',
  'dv',
  'dw',
  'dx',
  'dy',
  'dz',
  'ea',
  'eb',
  'ec',
  'ed',
  'ee',
  'ef',
] as const

export type KernelRustExtendedSurfaceLetter =
  (typeof KERNEL_RUST_EXTENDED_SURFACE_LETTERS)[number]

export interface KernelRustFoundationSurfaceEntry {
  letter: KernelRustFoundationSurfaceLetter
  /** Soak / honesty gate name (dd is hygiene-only — no soak flag). */
  gate: string
  summary: string
  rustPath: string
  tauriWire: string | null
}

export interface KernelRustExtendedSurfaceEntry {
  letter: KernelRustExtendedSurfaceLetter
  /** Soak / honesty probe name — matches Rust camelCase ready flag. */
  gate: string
  summary: string
  rustPath: string
  tauriWire: string
}

/**
 * Canonical dc–dm surface for web honesty docs.
 * Distinct from cv `gpuFractureReady` / cw `gpuMassEcsReady` / cy `fractureMassPlaytestReady`.
 */
export const KERNEL_RUST_FOUNDATION_SURFACE: readonly KernelRustFoundationSurfaceEntry[] =
  [
    {
      letter: 'dc',
      gate: 'probe_kernel_foundation',
      summary: 'WorldSoA + FrameArena + LBM + MutDNA + timescale/Beer–Lambert/sonic foundation',
      rustPath: 'packages/aethel-kernel-rust/src/kernel_honesty.rs',
      tauriWire: 'apps/studio-local/src-tauri/src/kernel_foundation_wire.rs',
    },
    {
      letter: 'dd',
      gate: 'studio_local_dep_hygiene',
      summary: 'studio-local Cargo dep hygiene (base64 / Rapier BroadPhase / bytemuck)',
      rustPath: 'apps/studio-local/src-tauri/Cargo.toml',
      tauriWire: null,
    },
    {
      letter: 'de',
      gate: 'kernelDesktopWireReady',
      summary: 'WorldSoA + LBM desktop soak wire',
      rustPath: 'packages/aethel-kernel-rust/src/desktop_soak.rs',
      tauriWire: 'apps/studio-local/src-tauri/src/kernel_desktop_wire.rs',
    },
    {
      letter: 'df',
      gate: 'kernelMutDnaDesktopReady',
      summary: 'MutDNA + FrameArena desktop soak deepen',
      rustPath: 'packages/aethel-kernel-rust/src/desktop_soak.rs',
      tauriWire: 'apps/studio-local/src-tauri/src/kernel_mut_dna_desktop_wire.rs',
    },
    {
      letter: 'dg',
      gate: 'kernelSpectralSonicDesktopReady',
      summary: 'timescale + Beer–Lambert + sonic desktop soak',
      rustPath: 'packages/aethel-kernel-rust/src/desktop_soak.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_spectral_sonic_desktop_wire.rs',
    },
    {
      letter: 'dh',
      gate: 'worldSoaSabLayoutReady',
      summary: 'WorldSoA SAB / shared-memory layout header',
      rustPath: 'packages/aethel-kernel-rust/src/wasm_shared_memory_buffer.rs',
      tauriWire: 'apps/studio-local/src-tauri/src/kernel_world_soa_sab_wire.rs',
    },
    {
      letter: 'di',
      gate: 'mmapEcsPagerReady',
      summary: 'mmap ECS pager deepen (memmap2)',
      rustPath: 'packages/aethel-kernel-rust/src/mmap_ecs_pager.rs',
      tauriWire: 'apps/studio-local/src-tauri/src/kernel_mmap_ecs_pager_wire.rs',
    },
    {
      letter: 'dj',
      gate: 'simdClayMathReady',
      summary: 'SIMD clay math (SSE2/AVX2 + scalar fallback)',
      rustPath: 'packages/aethel-kernel-rust/src/simd_clay_math.rs',
      tauriWire: 'apps/studio-local/src-tauri/src/kernel_simd_clay_math_wire.rs',
    },
    {
      letter: 'dk',
      gate: 'simdWorldSoaHotPathReady',
      summary: 'SIMD → WorldSoA hot-path wire',
      rustPath: 'packages/aethel-kernel-rust/src/desktop_soak.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_simd_world_soa_hot_path_wire.rs',
    },
    {
      letter: 'dl',
      gate: 'baremetalMemoryManagerReady',
      summary: 'BareMetalMemoryManager real (LinearFrameAllocator wrap)',
      rustPath: 'packages/aethel-kernel-rust/src/baremetal_memory_manager.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_baremetal_memory_manager_wire.rs',
    },
    {
      letter: 'dm',
      gate: 'slabAllocatorMmapReady',
      summary: 'slab allocator mmap real (fixed-size slot pool + free-list)',
      rustPath: 'packages/aethel-kernel-rust/src/slab_allocator_mmap.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_slab_allocator_mmap_wire.rs',
    },
  ] as const

/**
 * Letter eg — dq–ef extended real-kernel probes (catalog honesty only).
 * Probe names match Rust soak-gated camelCase flags. Not part of
 * `KERNEL_RUST_FOUNDATION_SOAK_GATES` — documenting ≠ ready flip.
 */
export const KERNEL_RUST_EXTENDED_SURFACE: readonly KernelRustExtendedSurfaceEntry[] =
  [
    {
      letter: 'dq',
      gate: 'unifiedFieldNetworkReady',
      summary: 'Unified Field Network minimal real — SoA pressure+radiation collapse',
      rustPath: 'packages/aethel-kernel-rust/src/unified_field_network.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_unified_field_network_wire.rs',
    },
    {
      letter: 'dr',
      gate: 'autonomousEntropyCorrectorReady',
      summary: 'Autonomous Entropy Corrector — HDR nits reduce + dust inject',
      rustPath: 'packages/aethel-kernel-rust/src/autonomous_entropy_corrector.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_autonomous_entropy_corrector_wire.rs',
    },
    {
      letter: 'ds',
      gate: 'fractalEnergyPerturbationReady',
      summary: 'Fractal Energy Perturbation — SoA force+stress + timescale couple',
      rustPath: 'packages/aethel-kernel-rust/src/fractal_energy_perturbation.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_fractal_energy_perturbation_wire.rs',
    },
    {
      letter: 'dt',
      gate: 'curvedRaymarcherReady',
      summary: 'Non-Euclidean Curved Raymarcher — Schwarzschild-inspired bend',
      rustPath:
        'packages/aethel-kernel-rust/src/non_euclidean_curved_raymarcher.rs',
      tauriWire: 'apps/studio-local/src-tauri/src/kernel_curved_raymarcher_wire.rs',
    },
    {
      letter: 'du',
      gate: 'shadowTimeReversalReady',
      summary: 'Shadow Kernel Time Reversal — WorldSoA volume ring + rewind',
      rustPath: 'packages/aethel-kernel-rust/src/shadow_kernel_time_reversal.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_shadow_time_reversal_wire.rs',
    },
    {
      letter: 'dv',
      gate: 'fourDimensionalTimeSdfReady',
      summary: 'Four-Dimensional Time SDF — W-axis sphere↔box morph',
      rustPath: 'packages/aethel-kernel-rust/src/four_dimensional_time_sdf.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_four_dimensional_time_sdf_wire.rs',
    },
    {
      letter: 'dw',
      gate: 'mnemonicMatterEntropyReady',
      summary: 'Mnemonic Matter Entropy — off-screen coherence exponential decay',
      rustPath: 'packages/aethel-kernel-rust/src/mnemonic_matter_entropy.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_mnemonic_matter_entropy_wire.rs',
    },
    {
      letter: 'dx',
      gate: 'synestheticSensoryRemapReady',
      summary: 'Synesthetic Sensory Remap — density+freq → acoustic/EM/tremor',
      rustPath: 'packages/aethel-kernel-rust/src/synesthetic_sensory_remap.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_synesthetic_sensory_remap_wire.rs',
    },
    {
      letter: 'dy',
      gate: 'autonomousConflictGeneratorReady',
      summary: 'Autonomous Conflict Generator — stress → vortex event buffer',
      rustPath: 'packages/aethel-kernel-rust/src/autonomous_conflict_generator.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_autonomous_conflict_generator_wire.rs',
    },
    {
      letter: 'dz',
      gate: 'atmosphericPhysicalDampingReady',
      summary: 'Atmospheric Physical Damping — viscosity friction + acoustic transmit',
      rustPath: 'packages/aethel-kernel-rust/src/atmospheric_physical_damping.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_atmospheric_physical_damping_wire.rs',
    },
    {
      letter: 'ea',
      gate: 'positionBasedDynamicsReady',
      summary: 'Position-Based Dynamics minimal — SoA distance constraint projection',
      rustPath: 'packages/aethel-kernel-rust/src/position_based_dynamics.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_position_based_dynamics_wire.rs',
    },
    {
      letter: 'eb',
      gate: 'hybridEulerianLagrangianPbdReady',
      summary: 'Hybrid Eulerian–Lagrangian PBD — grid sample + ea particles couple',
      rustPath: 'packages/aethel-kernel-rust/src/hybrid_eulerian_lagrangian_pbd.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_hybrid_eulerian_lagrangian_pbd_wire.rs',
    },
    {
      letter: 'ec',
      gate: 'matterThermodynamicsSphReady',
      summary: 'Matter Thermodynamics SPH — density + pressure + heat diffusion',
      rustPath: 'packages/aethel-kernel-rust/src/matter_thermodynamics_sph.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_matter_thermodynamics_sph_wire.rs',
    },
    {
      letter: 'ed',
      gate: 'aerodynamicNavierStokesReady',
      summary: 'Aerodynamic Navier–Stokes — 2D stable-fluids advect+diffuse+project',
      rustPath: 'packages/aethel-kernel-rust/src/aerodynamic_navier_stokes.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_aerodynamic_navier_stokes_wire.rs',
    },
    {
      letter: 'ee',
      gate: 'latticeBoltzmannFluidSolverReady',
      summary: 'Lattice-Boltzmann fluid solver — D2Q9 bounce-back + dust inject',
      rustPath: 'packages/aethel-kernel-rust/src/lattice_boltzmann_fluid_solver.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_lattice_boltzmann_fluid_solver_wire.rs',
    },
    {
      letter: 'ef',
      gate: 'acousticRaytracingEchoReady',
      summary: 'Acoustic raytracing echo — specular/image-source wall delay+gain',
      rustPath: 'packages/aethel-kernel-rust/src/acoustic_raytracing_echo.rs',
      tauriWire:
        'apps/studio-local/src-tauri/src/kernel_acoustic_raytracing_echo_wire.rs',
    },
  ] as const

/** Expected dq–ef probe gate names (catalog completeness check). */
export const KERNEL_RUST_EXTENDED_SURFACE_GATES = [
  'unifiedFieldNetworkReady',
  'autonomousEntropyCorrectorReady',
  'fractalEnergyPerturbationReady',
  'curvedRaymarcherReady',
  'shadowTimeReversalReady',
  'fourDimensionalTimeSdfReady',
  'mnemonicMatterEntropyReady',
  'synestheticSensoryRemapReady',
  'autonomousConflictGeneratorReady',
  'atmosphericPhysicalDampingReady',
  'positionBasedDynamicsReady',
  'hybridEulerianLagrangianPbdReady',
  'matterThermodynamicsSphReady',
  'aerodynamicNavierStokesReady',
  'latticeBoltzmannFluidSolverReady',
  'acousticRaytracingEchoReady',
] as const

export type KernelRustExtendedSurfaceGate =
  (typeof KERNEL_RUST_EXTENDED_SURFACE_GATES)[number]

/** True when catalog lists every expected dq–ef probe (docs only — not soak). */
export function isKernelRustExtendedSurfaceDocumented(): boolean {
  if (KERNEL_RUST_EXTENDED_SURFACE_DOCUMENTED !== true) return false
  if (
    KERNEL_RUST_EXTENDED_SURFACE.length !==
    KERNEL_RUST_EXTENDED_SURFACE_LETTERS.length
  ) {
    return false
  }
  const gates = new Set(KERNEL_RUST_EXTENDED_SURFACE.map((e) => e.gate))
  return KERNEL_RUST_EXTENDED_SURFACE_GATES.every((g) => gates.has(g))
}

/** Soak-gated gates required for web `kernelRustFoundationReady` (dd hygiene excluded). */
export const KERNEL_RUST_FOUNDATION_SOAK_GATES = [
  'probeKernelFoundation',
  'kernelDesktopWireReady',
  'kernelMutDnaDesktopReady',
  'kernelSpectralSonicDesktopReady',
  'worldSoaSabLayoutReady',
  'mmapEcsPagerReady',
  'simdClayMathReady',
  'simdWorldSoaHotPathReady',
  'baremetalMemoryManagerReady',
  'slabAllocatorMmapReady',
] as const

export type KernelRustFoundationSoakGate =
  (typeof KERNEL_RUST_FOUNDATION_SOAK_GATES)[number]

export type KernelRustFoundationSoakGates = Record<
  KernelRustFoundationSoakGate,
  boolean
>

export function emptyKernelRustFoundationSoakGates(): KernelRustFoundationSoakGates {
  return {
    probeKernelFoundation: false,
    kernelDesktopWireReady: false,
    kernelMutDnaDesktopReady: false,
    kernelSpectralSonicDesktopReady: false,
    worldSoaSabLayoutReady: false,
    mmapEcsPagerReady: false,
    simdClayMathReady: false,
    simdWorldSoaHotPathReady: false,
    baremetalMemoryManagerReady: false,
    slabAllocatorMmapReady: false,
  }
}

export function allKernelRustFoundationSoakGatesTrue(
  gates: KernelRustFoundationSoakGates,
): boolean {
  return KERNEL_RUST_FOUNDATION_SOAK_GATES.every((k) => gates[k] === true)
}
