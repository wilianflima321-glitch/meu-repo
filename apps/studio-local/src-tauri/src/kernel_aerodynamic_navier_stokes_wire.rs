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
    pub distinct_from_matter_thermodynamics_sph_probe: bool,
    pub distinct_from_hybrid_eulerian_lagrangian_pbd_probe: bool,
    pub distinct_from_position_based_dynamics_probe: bool,
    pub distinct_from_atmospheric_physical_damping_probe: bool,
    pub distinct_from_autonomous_conflict_generator_probe: bool,
    pub distinct_from_synesthetic_sensory_remap_probe: bool,
    pub distinct_from_mnemonic_matter_entropy_probe: bool,
    pub distinct_from_four_dimensional_time_sdf_probe: bool,
    pub distinct_from_shadow_time_reversal_probe: bool,
    pub distinct_from_curved_raymarcher_probe: bool,
    pub distinct_from_fractal_energy_perturbation_probe: bool,
    pub distinct_from_autonomous_entropy_corrector_probe: bool,
    pub distinct_from_unified_field_network_probe: bool,
    pub distinct_from_slab_allocator_mmap_probe: bool,
    pub distinct_from_baremetal_memory_manager_probe: bool,
    pub distinct_from_mmap_ecs_pager_probe: bool,
    pub distinct_from_simd_world_soa_hot_path_probe: bool,
    pub distinct_from_simd_clay_math_probe: bool,
    pub distinct_from_world_soa_sab_layout_probe: bool,
    pub distinct_from_desktop_wire_probe: bool,
    pub distinct_from_mut_dna_desktop_probe: bool,
    pub distinct_from_spectral_sonic_desktop_probe: bool,
    pub distinct_from_kernel_foundation_probe: bool,
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
        distinct_from_matter_thermodynamics_sph_probe: r
            .distinct_from_matter_thermodynamics_sph_probe,
        distinct_from_hybrid_eulerian_lagrangian_pbd_probe: r
            .distinct_from_hybrid_eulerian_lagrangian_pbd_probe,
        distinct_from_position_based_dynamics_probe: r.distinct_from_position_based_dynamics_probe,
        distinct_from_atmospheric_physical_damping_probe: r
            .distinct_from_atmospheric_physical_damping_probe,
        distinct_from_autonomous_conflict_generator_probe: r
            .distinct_from_autonomous_conflict_generator_probe,
        distinct_from_synesthetic_sensory_remap_probe: r
            .distinct_from_synesthetic_sensory_remap_probe,
        distinct_from_mnemonic_matter_entropy_probe: r.distinct_from_mnemonic_matter_entropy_probe,
        distinct_from_four_dimensional_time_sdf_probe: r
            .distinct_from_four_dimensional_time_sdf_probe,
        distinct_from_shadow_time_reversal_probe: r.distinct_from_shadow_time_reversal_probe,
        distinct_from_curved_raymarcher_probe: r.distinct_from_curved_raymarcher_probe,
        distinct_from_fractal_energy_perturbation_probe: r
            .distinct_from_fractal_energy_perturbation_probe,
        distinct_from_autonomous_entropy_corrector_probe: r
            .distinct_from_autonomous_entropy_corrector_probe,
        distinct_from_unified_field_network_probe: r.distinct_from_unified_field_network_probe,
        distinct_from_slab_allocator_mmap_probe: r.distinct_from_slab_allocator_mmap_probe,
        distinct_from_baremetal_memory_manager_probe: r
            .distinct_from_baremetal_memory_manager_probe,
        distinct_from_mmap_ecs_pager_probe: r.distinct_from_mmap_ecs_pager_probe,
        distinct_from_simd_world_soa_hot_path_probe: r.distinct_from_simd_world_soa_hot_path_probe,
        distinct_from_simd_clay_math_probe: r.distinct_from_simd_clay_math_probe,
        distinct_from_world_soa_sab_layout_probe: r.distinct_from_world_soa_sab_layout_probe,
        distinct_from_desktop_wire_probe: r.distinct_from_desktop_wire_probe,
        distinct_from_mut_dna_desktop_probe: r.distinct_from_mut_dna_desktop_probe,
        distinct_from_spectral_sonic_desktop_probe: r.distinct_from_spectral_sonic_desktop_probe,
        distinct_from_kernel_foundation_probe: r.distinct_from_kernel_foundation_probe,
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
