//! Fractal Energy Perturbation desktop wire — letter **ds**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::fractal_energy_perturbation`
//! (SoA force+stress inject + WorldSoA timescale couple soak). Honesty probe
//! `fractalEnergyPerturbationReady` is **distinct** from dr
//! `autonomousEntropyCorrectorReady`, dq `unifiedFieldNetworkReady`, and dc–dm
//! foundation probes (`slabAllocatorMmapReady`, `baremetalMemoryManagerReady`,
//! `mmapEcsPagerReady`, `simdWorldSoaHotPathReady`, `simdClayMathReady`,
//! `worldSoaSabLayoutReady`, `kernelDesktopWireReady`, `kernelMutDnaDesktopReady`,
//! `kernelSpectralSonicDesktopReady`, `probe_kernel_foundation`).
//! Chaos / PBD full parity / 100k / mmap-SAB production / AVX-512 / GR /
//! dual-240 / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::fractal_energy_perturbation::{
    probe_fractal_energy_perturbation as kernel_probe, run_fractal_energy_perturbation_soak,
    FractalEnergyPerturbationSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelFractalEnergyPerturbationWireReport {
    pub fractal_energy_perturbation_ready: bool,
    pub inject_steps: u32,
    pub force_mutated: bool,
    pub stress_mutated: bool,
    pub weak_stress_gt_stiff: bool,
    pub timescale_coupled: bool,
    pub is_fractal_pattern: bool,
    pub final_force_norm: f32,
    pub final_stress: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub chaos_pbd_parity_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: FractalEnergyPerturbationSoakReport,
    note: impl Into<String>,
) -> KernelFractalEnergyPerturbationWireReport {
    KernelFractalEnergyPerturbationWireReport {
        fractal_energy_perturbation_ready: r.fractal_energy_perturbation_ready,
        inject_steps: r.inject_steps,
        force_mutated: r.force_mutated,
        stress_mutated: r.stress_mutated,
        weak_stress_gt_stiff: r.weak_stress_gt_stiff,
        timescale_coupled: r.timescale_coupled,
        is_fractal_pattern: r.is_fractal_pattern,
        final_force_norm: r.final_force_norm,
        final_stress: r.final_stress,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "ds".into(),
        note: note.into(),
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run fractal energy perturbation soak via kernel.
pub fn run_kernel_fractal_energy_perturbation_soak() -> KernelFractalEnergyPerturbationWireReport {
    let r = run_fractal_energy_perturbation_soak();
    let note = if !r.fractal_energy_perturbation_ready {
        "Fractal energy perturbation soak failed — fractalEnergyPerturbationReady stays false"
    } else {
        "Desktop soak: SoA force+stress inject + weak>stiff tear + WorldSoA timescale couple — fractalEnergyPerturbationReady true; distinct from dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `fractalEnergyPerturbationReady` (letter ds).
pub fn probe_fractal_energy_perturbation() -> KernelFractalEnergyPerturbationWireReport {
    to_report(
        kernel_probe(),
        "Fractal energy perturbation probe (letter ds) — distinct from autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation",
    )
}

/// Tauri IPC — fractal energy perturbation honesty.
#[tauri::command]
pub fn probe_fractal_energy_perturbation_cmd() -> KernelFractalEnergyPerturbationWireReport {
    probe_fractal_energy_perturbation()
}

/// Tauri IPC — run fractal energy perturbation soak.
#[tauri::command]
pub fn run_kernel_fractal_energy_perturbation_soak_cmd() -> KernelFractalEnergyPerturbationWireReport {
    run_kernel_fractal_energy_perturbation_soak()
}
