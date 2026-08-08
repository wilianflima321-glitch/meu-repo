//! Hybrid Eulerian–Lagrangian PBD desktop wire — letter **gy**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::hybrid_eulerian_lagrangian_pbd`
//! (Eulerian density/velocity grid + Lagrangian ea PBD couple soak). Honesty
//! probe `hybridEulerianLagrangianPbdReady` is **distinct** from ea
//! `positionBasedDynamicsReady`, dz `atmosphericPhysicalDampingReady`, dy
//! `autonomousConflictGeneratorReady`, dx `synestheticSensoryRemapReady`, dw
//! `mnemonicMatterEntropyReady`, dv `fourDimensionalTimeSdfReady`, du
//! `shadowTimeReversalReady`, dt `curvedRaymarcherReady`, ds
//! `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`, dq
//! `unifiedFieldNetworkReady`, and dc–dm foundation probes.
//! Full FLIP / APIC / Chaos hybrid / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::hybrid_eulerian_lagrangian_pbd::{
    probe_hybrid_eulerian_lagrangian_pbd as kernel_probe,
    run_hybrid_eulerian_lagrangian_pbd_soak, HybridEulerianLagrangianPbdSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelHybridEulerianLagrangianPbdWireReport {
    pub hybrid_eulerian_lagrangian_pbd_ready: bool,
    pub particle_state_mutated: bool,
    pub grid_state_mutated: bool,
    pub residual_decreased: bool,
    pub density_sampled: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub particle_advect_delta: f32,
    pub grid_velocity_delta: f32,
    pub mean_sampled_density: f32,
    pub residual_before: f32,
    pub residual_after: f32,
    pub iterations: u32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub flip_apic_parity_ready: bool,
    pub chaos_hybrid_fluid_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub xpbd_cloth_aaa_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
    pub unreal_gc_streaming_parity_ready: bool,
    pub metasounds_hrtf_aaa_ready: bool,
    pub adversary_ai_chaos_parity_ready: bool,
    pub ue_atmosphere_parity_ready: bool,
}

fn to_report(
    r: HybridEulerianLagrangianPbdSoakReport,
    note: impl Into<String>,
) -> KernelHybridEulerianLagrangianPbdWireReport {
    KernelHybridEulerianLagrangianPbdWireReport {
        hybrid_eulerian_lagrangian_pbd_ready: r.hybrid_eulerian_lagrangian_pbd_ready,
        particle_state_mutated: r.particle_state_mutated,
        grid_state_mutated: r.grid_state_mutated,
        residual_decreased: r.residual_decreased,
        density_sampled: r.density_sampled,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        particle_advect_delta: r.particle_advect_delta,
        grid_velocity_delta: r.grid_velocity_delta,
        mean_sampled_density: r.mean_sampled_density,
        residual_before: r.residual_before,
        residual_after: r.residual_after,
        iterations: r.iterations,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "gy".into(),
        note: note.into(),
        flip_apic_parity_ready: r.flip_apic_parity_ready,
        chaos_hybrid_fluid_ready: r.chaos_hybrid_fluid_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        xpbd_cloth_aaa_ready: r.xpbd_cloth_aaa_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
        unreal_gc_streaming_parity_ready: r.unreal_gc_streaming_parity_ready,
        metasounds_hrtf_aaa_ready: r.metasounds_hrtf_aaa_ready,
        adversary_ai_chaos_parity_ready: r.adversary_ai_chaos_parity_ready,
        ue_atmosphere_parity_ready: r.ue_atmosphere_parity_ready,
    }
}

/// Run hybrid Eulerian–Lagrangian PBD soak via kernel.
pub fn run_kernel_hybrid_eulerian_lagrangian_pbd_soak() -> KernelHybridEulerianLagrangianPbdWireReport
{
    let r = run_hybrid_eulerian_lagrangian_pbd_soak();
    let note = if !r.hybrid_eulerian_lagrangian_pbd_ready {
        "Hybrid Eulerian–Lagrangian PBD soak failed — hybridEulerianLagrangianPbdReady stays false"
    } else {
        "Desktop soak: Eulerian density/velocity sample → Lagrangian PBD particles (ea) → velocity deposit; particle+grid mutate + residual decreases — hybridEulerianLagrangianPbdReady true; flip_apic_parity_ready / chaos_hybrid_fluid_ready false; distinct from ea positionBasedDynamicsReady, dz atmosphericPhysicalDampingReady, dy autonomousConflictGeneratorReady, dx synestheticSensoryRemapReady, dw mnemonicMatterEntropyReady, dv fourDimensionalTimeSdfReady, du shadowTimeReversalReady, dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `hybridEulerianLagrangianPbdReady` (letter gy).
pub fn probe_hybrid_eulerian_lagrangian_pbd() -> KernelHybridEulerianLagrangianPbdWireReport {
    to_report(
        kernel_probe(),
        "Hybrid Eulerian–Lagrangian PBD probe (letter gy) — distinct from positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; flip_apic_parity_ready / chaos_hybrid_fluid_ready HELD",
    )
}

/// Tauri IPC — hybrid Eulerian–Lagrangian PBD honesty.
#[tauri::command]
pub fn probe_hybrid_eulerian_lagrangian_pbd_cmd() -> KernelHybridEulerianLagrangianPbdWireReport {
    probe_hybrid_eulerian_lagrangian_pbd()
}

/// Tauri IPC — run hybrid Eulerian–Lagrangian PBD soak.
#[tauri::command]
pub fn run_kernel_hybrid_eulerian_lagrangian_pbd_soak_cmd(
) -> KernelHybridEulerianLagrangianPbdWireReport {
    run_kernel_hybrid_eulerian_lagrangian_pbd_soak()
}
