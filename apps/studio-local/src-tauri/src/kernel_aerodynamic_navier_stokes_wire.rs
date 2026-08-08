//! Aerodynamic Navier–Stokes desktop wire — letter **gv**.
//!
//! Thin studio-local IPC over `aethel_kernel_rust::aerodynamic_navier_stokes`
//! (2D stable-fluids advect + diffuse + project soak). Honesty probe
//! `aerodynamicNavierStokesReady` is **distinct** from ec
//! `matterThermodynamicsSphReady`, eb `hybridEulerianLagrangianPbdReady`, ea
//! `positionBasedDynamicsReady`, dz `atmosphericPhysicalDampingReady`, dy
//! `autonomousConflictGeneratorReady`, dx `synestheticSensoryRemapReady`, dw
//! `mnemonicMatterEntropyReady`, dv `fourDimensionalTimeSdfReady`, du
//! `shadowTimeReversalReady`, dt `curvedRaymarcherReady`, ds
//! `fractalEnergyPerturbationReady`, dr `autonomousEntropyCorrectorReady`, dq
//! `unifiedFieldNetworkReady`, and dc–dm foundation probes.
//! Full CFD / Chaos fluid / Coins / Agones / Nanite / DLSS HELD.

use aethel_kernel_rust::aerodynamic_navier_stokes::{
    probe_aerodynamic_navier_stokes as kernel_probe, run_aerodynamic_navier_stokes_soak,
    AerodynamicNavierStokesSoakReport,
};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct KernelAerodynamicNavierStokesWireReport {
    pub aerodynamic_navier_stokes_ready: bool,
    pub velocity_field_changed: bool,
    pub divergence_bounded: bool,
    pub mass_proxy_bounded: bool,
    pub project_reduced_div: bool,
    pub outputs_finite: bool,
    pub sample_count: u32,
    pub mean_speed_before: f32,
    pub mean_speed_after: f32,
    pub mean_abs_div_before: f32,
    pub mean_abs_div_after: f32,
    pub max_speed: f32,
    pub mass_proxy_l1: f32,
    pub evidence_kind: String,
    pub evidence_fingerprint: u64,
    pub distinct_from_peers_note: String,
    pub letter: String,
    pub note: String,
    pub full_cfd_parity_ready: bool,
    pub chaos_fluid_aaa_ready: bool,
    pub dualsphysics_parity_ready: bool,
    pub flip_apic_parity_ready: bool,
    pub chaos_hybrid_fluid_ready: bool,
    pub chaos_pbd_parity_ready: bool,
    pub xpbd_cloth_aaa_ready: bool,
    pub unreal_mass_100k_ready: bool,
    pub mmap_sab_production_ready: bool,
    pub avx512_kernel_ready: bool,
    pub gr_raymarch_ready: bool,
    pub dual_timeline_240_ready: bool,
}

fn to_report(
    r: AerodynamicNavierStokesSoakReport,
    note: impl Into<String>,
) -> KernelAerodynamicNavierStokesWireReport {
    KernelAerodynamicNavierStokesWireReport {
        aerodynamic_navier_stokes_ready: r.aerodynamic_navier_stokes_ready,
        velocity_field_changed: r.velocity_field_changed,
        divergence_bounded: r.divergence_bounded,
        mass_proxy_bounded: r.mass_proxy_bounded,
        project_reduced_div: r.project_reduced_div,
        outputs_finite: r.outputs_finite,
        sample_count: r.sample_count,
        mean_speed_before: r.mean_speed_before,
        mean_speed_after: r.mean_speed_after,
        mean_abs_div_before: r.mean_abs_div_before,
        mean_abs_div_after: r.mean_abs_div_after,
        max_speed: r.max_speed,
        mass_proxy_l1: r.mass_proxy_l1,
        evidence_kind: r.evidence_kind.into(),
        evidence_fingerprint: r.evidence_fingerprint,
        distinct_from_peers_note: "distinct".into(),
        letter: "gv".into(),
        note: note.into(),
        full_cfd_parity_ready: r.full_cfd_parity_ready,
        chaos_fluid_aaa_ready: r.chaos_fluid_aaa_ready,
        dualsphysics_parity_ready: r.dualsphysics_parity_ready,
        flip_apic_parity_ready: r.flip_apic_parity_ready,
        chaos_hybrid_fluid_ready: r.chaos_hybrid_fluid_ready,
        chaos_pbd_parity_ready: r.chaos_pbd_parity_ready,
        xpbd_cloth_aaa_ready: r.xpbd_cloth_aaa_ready,
        unreal_mass_100k_ready: r.unreal_mass_100k_ready,
        mmap_sab_production_ready: r.mmap_sab_production_ready,
        avx512_kernel_ready: r.avx512_kernel_ready,
        gr_raymarch_ready: r.gr_raymarch_ready,
        dual_timeline_240_ready: r.dual_timeline_240_ready,
    }
}

/// Run aerodynamic Navier–Stokes soak via kernel.
pub fn run_kernel_aerodynamic_navier_stokes_soak() -> KernelAerodynamicNavierStokesWireReport {
    let r = run_aerodynamic_navier_stokes_soak();
    let note = if !r.aerodynamic_navier_stokes_ready {
        "Aerodynamic Navier–Stokes soak failed — aerodynamicNavierStokesReady stays false"
    } else {
        "Desktop soak: 2D stable-fluids diffuse + advect + project; velocity field changes + divergence/mass bounded — aerodynamicNavierStokesReady true; full_cfd_parity_ready / chaos_fluid_aaa_ready false; distinct from ec matterThermodynamicsSphReady, eb hybridEulerianLagrangianPbdReady, ea positionBasedDynamicsReady, dz atmosphericPhysicalDampingReady, dy autonomousConflictGeneratorReady, dx synestheticSensoryRemapReady, dw mnemonicMatterEntropyReady, dv fourDimensionalTimeSdfReady, du shadowTimeReversalReady, dt curvedRaymarcherReady, ds fractalEnergyPerturbationReady, dr autonomousEntropyCorrectorReady, dq unifiedFieldNetworkReady, and dc–dm foundation probes"
    };
    to_report(r, note)
}

/// Honesty probe — soak-gated `aerodynamicNavierStokesReady` (letter gv).
pub fn probe_aerodynamic_navier_stokes() -> KernelAerodynamicNavierStokesWireReport {
    to_report(
        kernel_probe(),
        "Aerodynamic Navier–Stokes probe (letter gv) — distinct from matterThermodynamicsSphReady, hybridEulerianLagrangianPbdReady, positionBasedDynamicsReady, atmosphericPhysicalDampingReady, autonomousConflictGeneratorReady, synestheticSensoryRemapReady, mnemonicMatterEntropyReady, fourDimensionalTimeSdfReady, shadowTimeReversalReady, curvedRaymarcherReady, fractalEnergyPerturbationReady, autonomousEntropyCorrectorReady, unifiedFieldNetworkReady, slabAllocatorMmapReady, baremetalMemoryManagerReady, mmapEcsPagerReady, simdWorldSoaHotPathReady, simdClayMathReady, worldSoaSabLayoutReady, kernelDesktopWireReady, kernelMutDnaDesktopReady, kernelSpectralSonicDesktopReady, and probe_kernel_foundation; full_cfd_parity_ready / chaos_fluid_aaa_ready HELD",
    )
}

/// Tauri IPC — aerodynamic Navier–Stokes honesty.
#[tauri::command]
pub fn probe_aerodynamic_navier_stokes_cmd() -> KernelAerodynamicNavierStokesWireReport {
    probe_aerodynamic_navier_stokes()
}

/// Tauri IPC — run aerodynamic Navier–Stokes soak.
#[tauri::command]
pub fn run_kernel_aerodynamic_navier_stokes_soak_cmd() -> KernelAerodynamicNavierStokesWireReport {
    run_kernel_aerodynamic_navier_stokes_soak()
}
